<?php

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-keys.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-presets.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-settings.php';

$frontend_file = dirname( __DIR__, 2 ) . '/includes/class-cheatjs-frontend.php';
if ( file_exists( $frontend_file ) ) {
    require_once $frontend_file;
}

$plugin_file = dirname( __DIR__, 2 ) . '/includes/class-cheatjs-plugin.php';
if ( file_exists( $plugin_file ) ) {
    require_once $plugin_file;
}

final class FrontendTest extends TestCase {
    protected function setUp(): void {
        $GLOBALS['cheatjs_test_filters'] = [];
        $GLOBALS['cheatjs_test_options'] = [];
        $GLOBALS['cheatjs_test_actions'] = [];
        $GLOBALS['cheatjs_test_assets']  = [
            'scripts' => [],
            'styles'  => [],
            'inline'  => [],
        ];
    }

    public function test_get_runtime_config_returns_null_when_global_settings_are_disabled(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '0',
            'presets'        => [
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => 'up up down down left right left right b a',
                ],
            ],
        ] );

        $this->assertNull( $this->create_frontend()->get_runtime_config() );
    }

    public function test_get_runtime_config_returns_sanitized_javascript_config_for_enabled_presets(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '1',
            'max_gap_ms'     => '2000',
            'presets'        => [
                'confidence' => [
                    'enabled'  => '0',
                    'sequence' => 'conf',
                ],
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => 'up up down down left right left right b a',
                ],
            ],
        ] );

        $config = $this->create_frontend()->get_runtime_config();

        $this->assertSame( [
            'maxGapMs' => 2000,
            'presets'  => [
                [
                    'id'         => 'konami',
                    'bodyClass'  => 'cheatjs-konami',
                    'sequence'   => [ 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a' ],
                    'onMessage'  => 'Konami mode enabled.',
                    'offMessage' => 'Konami mode disabled.',
                ],
            ],
        ], $config );
    }

    public function test_runtime_presets_are_a_zero_based_list(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '1',
            'presets'        => [
                'confidence'    => [
                    'enabled'  => '0',
                    'sequence' => 'conf',
                ],
                'konami'        => [
                    'enabled'  => '1',
                    'sequence' => 'up a',
                ],
                'runaway' => [
                    'enabled'  => '1',
                    'sequence' => 'run',
                ],
            ],
        ] );

        $presets = $this->create_frontend()->get_runtime_config()['presets'];

        $this->assertSame( [ 0, 1 ], array_keys( $presets ) );
        $this->assertSame( [ 'konami', 'runaway' ], array_column( $presets, 'id' ) );
    }

    public function test_enqueue_assets_does_not_enqueue_anything_without_runtime_config(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '0',
        ] );

        $this->create_frontend()->enqueue_assets();

        $this->assertSame( [], $GLOBALS['cheatjs_test_assets']['styles'] );
        $this->assertSame( [], $GLOBALS['cheatjs_test_assets']['scripts'] );
        $this->assertSame( [], $GLOBALS['cheatjs_test_assets']['inline'] );
    }

    public function test_enqueue_assets_enqueues_frontend_assets_and_inline_config_before_script(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '1',
            'presets'        => [
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => 'up up down down left right left right b a',
                ],
            ],
        ] );

        $this->create_frontend()->enqueue_assets();

        $this->assertArrayHasKey( 'cheatjs-effects', $GLOBALS['cheatjs_test_assets']['styles'] );
        $this->assertArrayHasKey( 'cheatjs', $GLOBALS['cheatjs_test_assets']['scripts'] );
        $this->assertStringEndsWith( 'assets/css/cheatjs-effects.css', $GLOBALS['cheatjs_test_assets']['styles']['cheatjs-effects']['src'] );
        $this->assertStringEndsWith( 'assets/js/cheatjs.js', $GLOBALS['cheatjs_test_assets']['scripts']['cheatjs']['src'] );
        $this->assertTrue( $GLOBALS['cheatjs_test_assets']['scripts']['cheatjs']['args']['in_footer'] );

        $inline = $GLOBALS['cheatjs_test_assets']['inline']['cheatjs'][0];
        $this->assertSame( 'before', $inline['position'] );
        $this->assertStringStartsWith( 'window.CHEATJS_CONFIG = ', $inline['data'] );
        $this->assertStringEndsWith( ';', $inline['data'] );
        $this->assertStringContainsString( '"bodyClass":"cheatjs-konami"', $inline['data'] );
        $this->assertStringContainsString( '"onMessage":"Konami mode enabled."', $inline['data'] );
        $this->assertStringContainsString( '"offMessage":"Konami mode disabled."', $inline['data'] );
    }

    public function test_plugin_hooks_registers_frontend_enqueue_callback(): void {
        $frontend = $this->create_frontend();
        $plugin   = $this->create_plugin( null, null, $frontend );

        $plugin->hooks();

        $callbacks = $GLOBALS['cheatjs_test_actions']['wp_enqueue_scripts'][10] ?? [];
        $this->assertCount( 1, $callbacks );
        $this->assertSame( [ $frontend, 'enqueue_assets' ], $callbacks[0]['callback'] );
    }

    public function test_plugin_activate_calls_settings_activation_defaults_without_admin_class(): void {
        $settings = new CheatJS_Settings();
        $plugin   = $this->create_plugin( $settings );

        $plugin->activate();

        $stored = get_option( CheatJS_Settings::OPTION_NAME );
        $this->assertIsArray( $stored );
        $this->assertSame( $settings->get_defaults(), $stored );
    }

    private function create_frontend(): CheatJS_Frontend {
        if ( ! class_exists( 'CheatJS_Frontend' ) ) {
            $this->fail( 'CheatJS_Frontend class does not exist.' );
        }

        return new CheatJS_Frontend( new CheatJS_Settings() );
    }

    private function create_plugin( ?CheatJS_Settings $settings = null, $admin = null, ?CheatJS_Frontend $frontend = null ): CheatJS_Plugin {
        if ( ! class_exists( 'CheatJS_Plugin' ) ) {
            $this->fail( 'CheatJS_Plugin class does not exist.' );
        }

        return new CheatJS_Plugin( $settings ?: new CheatJS_Settings(), $admin, $frontend );
    }
}
