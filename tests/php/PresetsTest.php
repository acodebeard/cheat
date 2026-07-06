<?php

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-keys.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-presets.php';

final class PresetsTest extends TestCase {
    protected function setUp(): void {
        $GLOBALS['cheatjs_test_filters'] = [];
    }

    public function test_builtin_presets_have_valid_required_fields(): void {
        $presets = CheatJS_Presets::get_presets();
        $required_fields = [
            'name',
            'description',
            'effect_label',
            'body_class',
            'default_enabled',
            'default_sequence',
            'on_message',
            'off_message',
        ];
        $expected_ids = [
            'confidence',
            'geocities',
            'konami',
            'drunk',
            'disco',
            'upside_down',
            'fall_down',
            'grayscale',
            'runaway',
            'soft_blur',
        ];

        $this->assertSame( $expected_ids, array_keys( $presets ) );

        foreach ( $expected_ids as $id ) {
            $this->assertArrayHasKey( $id, $presets );

            foreach ( $required_fields as $field ) {
                $this->assertArrayHasKey( $field, $presets[ $id ] );
            }

            $this->assertNotSame( '', $presets[ $id ]['name'] );
            $this->assertNotSame( '', $presets[ $id ]['body_class'] );
            $this->assertNotEmpty( $presets[ $id ]['default_sequence'] );
            $this->assertSame(
                $presets[ $id ]['default_sequence'],
                CheatJS_Keys::parse_sequence( $presets[ $id ]['default_sequence'] )
            );
        }
    }

    public function test_fall_down_preset_uses_approved_defaults(): void {
        $presets = CheatJS_Presets::get_presets();

        $this->assertArrayHasKey( 'fall_down', $presets );
        $this->assertSame( 'Fall Down', $presets['fall_down']['name'] );
        $this->assertSame( 'cheatjs-fall-down', $presets['fall_down']['body_class'] );
        $this->assertSame( [ 'f', 'a', 'l', 'l' ], $presets['fall_down']['default_sequence'] );
        $this->assertFalse( $presets['fall_down']['default_enabled'] );
        $this->assertSame( 'Fall down mode enabled.', $presets['fall_down']['on_message'] );
        $this->assertSame( 'Fall down mode disabled.', $presets['fall_down']['off_message'] );
    }

    public function test_runaway_preset_replaces_high_contrast_with_approved_defaults(): void {
        $presets = CheatJS_Presets::get_presets();

        $this->assertArrayNotHasKey( 'high_contrast', $presets );
        $this->assertArrayHasKey( 'runaway', $presets );
        $this->assertSame( 'Runaway', $presets['runaway']['name'] );
        $this->assertSame( 'cheatjs-runaway', $presets['runaway']['body_class'] );
        $this->assertSame( [ 'r', 'u', 'n' ], $presets['runaway']['default_sequence'] );
        $this->assertFalse( $presets['runaway']['default_enabled'] );
        $this->assertSame( 'Runaway mode enabled.', $presets['runaway']['on_message'] );
        $this->assertSame( 'Runaway mode disabled.', $presets['runaway']['off_message'] );
    }

    public function test_developer_filter_can_add_valid_preset(): void {
        add_filter( 'cheatjs_presets', static function ( array $presets ): array {
            $presets['matrix'] = [
                'name'             => 'Matrix',
                'description'      => 'Adds a green terminal-inspired effect.',
                'effect_label'     => 'Matrix tint',
                'body_class'       => 'cheatjs-matrix',
                'default_enabled'  => false,
                'default_sequence' => [ 'm', 'a', 't', 'r', 'i', 'x' ],
                'on_message'       => 'Matrix mode enabled.',
                'off_message'      => 'Matrix mode disabled.',
            ];
            return $presets;
        } );

        $this->assertArrayHasKey( 'matrix', CheatJS_Presets::get_presets() );
    }

    public function test_invalid_filtered_presets_are_excluded(): void {
        add_filter( 'cheatjs_presets', static function ( array $presets ): array {
            $presets['bad'] = [
                'name'             => '',
                'description'      => 'Missing usable fields.',
                'effect_label'     => 'Broken',
                'body_class'       => '',
                'default_enabled'  => true,
                'default_sequence' => [ 'Enter' ],
            ];
            return $presets;
        } );

        $this->assertArrayNotHasKey( 'bad', CheatJS_Presets::get_presets() );
    }
}
