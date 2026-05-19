<?php

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-keys.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-presets.php';

$settings_file = dirname( __DIR__, 2 ) . '/includes/class-cheatjs-settings.php';
if ( file_exists( $settings_file ) ) {
    require_once $settings_file;
}

final class SettingsTest extends TestCase {
    protected function setUp(): void {
        $GLOBALS['cheatjs_test_filters'] = [];
        $GLOBALS['cheatjs_test_options'] = [];
    }

    public function test_get_defaults_returns_every_registered_preset_with_default_values(): void {
        $settings = new CheatJS_Settings();
        $defaults = $settings->get_defaults();
        $presets  = CheatJS_Presets::get_presets();

        $this->assertTrue( $defaults['global_enabled'] );
        $this->assertSame( CheatJS_Settings::DEFAULT_MAX_GAP_MS, $defaults['max_gap_ms'] );
        $this->assertSame( array_keys( $presets ), array_keys( $defaults['presets'] ) );

        foreach ( $presets as $id => $preset ) {
            $this->assertSame( $preset['default_enabled'], $defaults['presets'][ $id ]['enabled'] );
            $this->assertSame( $preset['default_sequence'], $defaults['presets'][ $id ]['sequence'] );
        }
    }

    public function test_sanitize_normalizes_booleans_aliases_and_rejects_unknown_presets(): void {
        $settings = new CheatJS_Settings();

        $sanitized = $settings->sanitize( [
            'global_enabled' => '1',
            'presets'        => [
                'konami'  => [
                    'enabled'  => '0',
                    'sequence' => 'up up down down left right left right b a',
                ],
                'unknown' => [
                    'enabled'  => '1',
                    'sequence' => 'x',
                ],
            ],
        ] );

        $this->assertTrue( $sanitized['global_enabled'] );
        $this->assertFalse( $sanitized['presets']['konami']['enabled'] );
        $this->assertSame(
            [ 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a' ],
            $sanitized['presets']['konami']['sequence']
        );
        $this->assertArrayNotHasKey( 'unknown', $sanitized['presets'] );
    }

    public function test_sanitize_returns_every_preset_and_uses_defaults_for_missing_preset_input(): void {
        $settings  = new CheatJS_Settings();
        $sanitized = $settings->sanitize( [
            'global_enabled' => '0',
            'presets'        => [
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => 'a b',
                ],
            ],
        ] );
        $presets   = CheatJS_Presets::get_presets();

        $this->assertFalse( $sanitized['global_enabled'] );
        $this->assertSame( array_keys( $presets ), array_keys( $sanitized['presets'] ) );
        $this->assertTrue( $sanitized['presets']['konami']['enabled'] );
        $this->assertSame( [ 'a', 'b' ], $sanitized['presets']['konami']['sequence'] );
        $this->assertSame( $presets['confidence']['default_enabled'], $sanitized['presets']['confidence']['enabled'] );
        $this->assertSame( $presets['confidence']['default_sequence'], $sanitized['presets']['confidence']['sequence'] );
    }

    public function test_sanitize_treats_absent_submitted_checkboxes_as_false(): void {
        $settings  = new CheatJS_Settings();
        $sanitized = $settings->sanitize( [
            'presets' => [
                'konami' => [
                    'sequence' => 'a',
                ],
            ],
        ] );

        $this->assertFalse( $sanitized['global_enabled'] );
        $this->assertFalse( $sanitized['presets']['konami']['enabled'] );
        $this->assertSame( [ 'a' ], $sanitized['presets']['konami']['sequence'] );
    }

    public function test_invalid_keys_are_removed_when_at_least_one_valid_key_remains(): void {
        $settings  = new CheatJS_Settings();
        $sanitized = $settings->sanitize( [
            'global_enabled' => '1',
            'presets'        => [
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => [ 'up', 'Enter', 'A', '<script>' ],
                ],
            ],
        ] );

        $this->assertSame( [ 'ArrowUp', 'a' ], $sanitized['presets']['konami']['sequence'] );
    }

    public function test_empty_or_fully_invalid_sequences_fall_back_to_preset_defaults(): void {
        $settings  = new CheatJS_Settings();
        $sanitized = $settings->sanitize( [
            'global_enabled' => '1',
            'presets'        => [
                'konami'    => [
                    'enabled'  => '1',
                    'sequence' => 'Enter Shift',
                ],
                'geocities' => [
                    'enabled'  => '1',
                    'sequence' => '',
                ],
            ],
        ] );
        $presets   = CheatJS_Presets::get_presets();

        $this->assertSame( $presets['konami']['default_sequence'], $sanitized['presets']['konami']['sequence'] );
        $this->assertSame( $presets['geocities']['default_sequence'], $sanitized['presets']['geocities']['sequence'] );
    }

    public function test_malformed_nested_sequence_arrays_do_not_warn_and_safely_drop_invalid_parts(): void {
        $settings = new CheatJS_Settings();

        set_error_handler(
            static function ( int $severity, string $message, string $file, int $line ): bool {
                throw new ErrorException( $message, 0, $severity, $file, $line );
            }
        );

        try {
            $sanitized = $settings->sanitize( [
                'global_enabled' => '1',
                'presets'        => [
                    'konami'    => [
                        'enabled'  => '1',
                        'sequence' => [ 'up', [ 'nested' => 'bad' ], 'A' ],
                    ],
                    'geocities' => [
                        'enabled'  => '1',
                        'sequence' => [ [ 'nested' => 'bad' ] ],
                    ],
                ],
            ] );
        } finally {
            restore_error_handler();
        }

        $presets = CheatJS_Presets::get_presets();

        $this->assertSame( [ 'ArrowUp', 'a' ], $sanitized['presets']['konami']['sequence'] );
        $this->assertSame( $presets['geocities']['default_sequence'], $sanitized['presets']['geocities']['sequence'] );
    }

    public function test_get_merges_stored_option_values_through_sanitizer(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '1',
            'presets'        => [
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => 'up a bad-key',
                ],
            ],
        ] );

        $settings = new CheatJS_Settings();
        $stored   = $settings->get();

        $this->assertTrue( $stored['global_enabled'] );
        $this->assertSame( [ 'ArrowUp', 'a' ], $stored['presets']['konami']['sequence'] );
        $this->assertArrayHasKey( 'confidence', $stored['presets'] );
    }

    public function test_get_active_presets_returns_enabled_presets_with_frontend_metadata(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '1',
            'presets'        => [
                'konami'    => [
                    'enabled'  => '1',
                    'sequence' => 'up a',
                ],
                'geocities' => [
                    'enabled'  => '0',
                    'sequence' => 'g',
                ],
            ],
        ] );

        $settings = new CheatJS_Settings();
        $active   = $settings->get_active_presets();

        $this->assertArrayHasKey( 'konami', $active );
        $this->assertArrayNotHasKey( 'geocities', $active );
        $this->assertSame( 'konami', $active['konami']['id'] );
        $this->assertSame( 'cheatjs-konami', $active['konami']['body_class'] );
        $this->assertSame( [ 'ArrowUp', 'a' ], $active['konami']['sequence'] );

        foreach ( [ 'name', 'description', 'effect_label', 'on_message', 'off_message' ] as $field ) {
            $this->assertArrayHasKey( $field, $active['konami'] );
            $this->assertIsString( $active['konami'][ $field ] );
        }
    }

    public function test_get_active_presets_returns_empty_array_when_globally_disabled(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '0',
            'presets'        => [
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => 'up a',
                ],
            ],
        ] );

        $settings = new CheatJS_Settings();

        $this->assertSame( [], $settings->get_active_presets() );
    }

    public function test_activate_defaults_stores_defaults_in_option(): void {
        $settings = new CheatJS_Settings();

        $settings->activate_defaults();

        $this->assertSame( $settings->get_defaults(), get_option( CheatJS_Settings::OPTION_NAME ) );
    }
}
