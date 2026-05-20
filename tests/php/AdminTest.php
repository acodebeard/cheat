<?php

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-keys.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-presets.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-settings.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-frontend.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-plugin.php';

$admin_file = dirname( __DIR__, 2 ) . '/includes/class-cheatjs-admin.php';
if ( file_exists( $admin_file ) ) {
    require_once $admin_file;
}

final class AdminTest extends TestCase {
    protected function setUp(): void {
        $GLOBALS['cheatjs_test_filters']             = [];
        $GLOBALS['cheatjs_test_options']             = [];
        $GLOBALS['cheatjs_test_actions']             = [];
        $GLOBALS['cheatjs_test_registered_settings'] = [];
        $GLOBALS['cheatjs_test_options_pages']       = [];
        $GLOBALS['cheatjs_test_current_user_can']    = [
            'manage_options' => true,
        ];
        $GLOBALS['cheatjs_test_wp_die']              = [];
        $GLOBALS['cheatjs_test_assets']              = [
            'scripts' => [],
            'styles'  => [],
            'inline'  => [],
        ];
    }

    public function test_render_page_outputs_settings_form_and_konami_controls(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '1',
            'presets'        => [
                'konami' => [
                    'enabled'  => '1',
                    'sequence' => 'up up down down left right left right b a',
                ],
            ],
        ] );

        ob_start();
        $this->create_admin()->render_page();
        $html = ob_get_clean();

        $this->assertStringContainsString( '<form method="post" action="options.php">', $html );
        $this->assertStringContainsString( 'name="cheatjs_settings[global_enabled]" value="0"', $html );
        $this->assertStringContainsString( 'type="checkbox" name="cheatjs_settings[global_enabled]" value="1"', $html );
        $this->assertStringContainsString( 'class="cheatjs-preset', $html );
        $this->assertStringContainsString( 'data-cheatjs-preset="konami"', $html );
        $this->assertStringContainsString( 'data-default-sequence="ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a"', $html );

        $global_hidden_position   = strpos( $html, 'name="cheatjs_settings[global_enabled]" value="0"' );
        $global_checkbox_position = strpos( $html, 'type="checkbox" name="cheatjs_settings[global_enabled]" value="1"' );
        $preset_hidden_position   = strpos( $html, 'name="cheatjs_settings[presets][konami][enabled]" value="0"' );
        $preset_checkbox_position = strpos( $html, 'type="checkbox" name="cheatjs_settings[presets][konami][enabled]" value="1"' );

        $this->assertNotFalse( $global_hidden_position );
        $this->assertNotFalse( $global_checkbox_position );
        $this->assertLessThan( $global_checkbox_position, $global_hidden_position );
        $this->assertNotFalse( $preset_hidden_position );
        $this->assertNotFalse( $preset_checkbox_position );
        $this->assertLessThan( $preset_checkbox_position, $preset_hidden_position );

        $this->assertStringContainsString( 'class="cheatjs-sequence-input"', $html );
        $this->assertStringContainsString( 'name="cheatjs_settings[presets][konami][sequence]"', $html );
        $this->assertStringContainsString( 'value="ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a"', $html );
        $this->assertStringContainsString( 'class="button cheatjs-record"', $html );
        $this->assertStringContainsString( 'class="button cheatjs-clear"', $html );
        $this->assertStringContainsString( 'class="button cheatjs-reset"', $html );
        $this->assertStringContainsString( 'class="button button-primary cheatjs-done"', $html );
        $this->assertStringContainsString( 'class="cheatjs-key-chips"', $html );
        $this->assertStringContainsString( '<span class="cheatjs-key-chip">ArrowUp</span>', $html );
        $this->assertStringContainsString( '<span class="cheatjs-key-chip">b</span>', $html );
        $this->assertStringContainsString( '<span class="cheatjs-key-chip">a</span>', $html );
    }

    public function test_render_page_preserves_current_max_gap_ms_as_hidden_input(): void {
        update_option( CheatJS_Settings::OPTION_NAME, [
            'global_enabled' => '1',
            'max_gap_ms'     => '3500',
        ] );

        ob_start();
        $this->create_admin()->render_page();
        $html = ob_get_clean();

        $this->assertStringContainsString( 'type="hidden" name="cheatjs_settings[max_gap_ms]" value="3500"', $html );
    }

    public function test_render_page_dies_without_manage_options_capability(): void {
        $GLOBALS['cheatjs_test_current_user_can']['manage_options'] = false;

        ob_start();
        try {
            $this->create_admin()->render_page();
            $died = false;
        } catch ( RuntimeException $exception ) {
            $died = true;
        } finally {
            $html = ob_get_clean();
        }

        $this->assertTrue( $died );
        $this->assertCount( 1, $GLOBALS['cheatjs_test_wp_die'] );
        $this->assertStringContainsString( 'not allowed', $GLOBALS['cheatjs_test_wp_die'][0]['message'] );
        $this->assertStringNotContainsString( '<form method="post" action="options.php">', $html );
    }

    public function test_register_settings_registers_option_with_settings_sanitizer(): void {
        $admin = $this->create_admin();

        $admin->register_settings();

        $this->assertCount( 1, $GLOBALS['cheatjs_test_registered_settings'] );
        $registered = $GLOBALS['cheatjs_test_registered_settings'][0];

        $this->assertSame( CheatJS_Settings::OPTION_NAME, $registered['option_group'] );
        $this->assertSame( CheatJS_Settings::OPTION_NAME, $registered['option_name'] );
        $this->assertIsArray( $registered['args']['sanitize_callback'] );
        $this->assertInstanceOf( CheatJS_Settings::class, $registered['args']['sanitize_callback'][0] );
        $this->assertSame( 'sanitize', $registered['args']['sanitize_callback'][1] );
    }

    public function test_register_menu_adds_options_page_for_manage_options(): void {
        $admin = $this->create_admin();

        $admin->register_menu();

        $this->assertCount( 1, $GLOBALS['cheatjs_test_options_pages'] );
        $page = $GLOBALS['cheatjs_test_options_pages'][0];

        $this->assertSame( 'manage_options', $page['capability'] );
        $this->assertSame( 'cheatjs', $page['menu_slug'] );
        $this->assertSame( [ $admin, 'render_page' ], $page['callback'] );
    }

    public function test_enqueue_assets_only_enqueues_admin_assets_for_cheatjs_settings_page(): void {
        $admin = $this->create_admin();

        $admin->enqueue_assets( 'settings_page_other' );
        $this->assertSame( [], $GLOBALS['cheatjs_test_assets']['styles'] );
        $this->assertSame( [], $GLOBALS['cheatjs_test_assets']['scripts'] );

        $admin->enqueue_assets( 'settings_page_cheatjs' );

        $this->assertArrayHasKey( 'cheatjs-admin', $GLOBALS['cheatjs_test_assets']['styles'] );
        $this->assertStringEndsWith( 'assets/css/cheatjs-admin.css', $GLOBALS['cheatjs_test_assets']['styles']['cheatjs-admin']['src'] );
        $this->assertArrayHasKey( 'cheatjs-admin', $GLOBALS['cheatjs_test_assets']['scripts'] );
        $this->assertStringEndsWith( 'assets/js/cheatjs-admin.js', $GLOBALS['cheatjs_test_assets']['scripts']['cheatjs-admin']['src'] );
        $this->assertSame( [], $GLOBALS['cheatjs_test_assets']['scripts']['cheatjs-admin']['deps'] );
        $this->assertTrue( $GLOBALS['cheatjs_test_assets']['scripts']['cheatjs-admin']['args'] );
    }

    public function test_plugin_hooks_registers_admin_callbacks_when_admin_exists(): void {
        $admin  = $this->create_admin();
        $plugin = new CheatJS_Plugin( new CheatJS_Settings(), $admin, new CheatJS_Frontend( new CheatJS_Settings() ) );

        $plugin->hooks();

        $this->assertSame( [ $admin, 'register_menu' ], $GLOBALS['cheatjs_test_actions']['admin_menu'][10][0]['callback'] );
        $this->assertSame( [ $admin, 'register_settings' ], $GLOBALS['cheatjs_test_actions']['admin_init'][10][0]['callback'] );
        $this->assertSame( [ $admin, 'enqueue_assets' ], $GLOBALS['cheatjs_test_actions']['admin_enqueue_scripts'][10][0]['callback'] );
    }

    public function test_plugin_bootstrap_includes_admin_class_and_constructs_plugin_with_admin(): void {
        $GLOBALS['cheatjs_test_actions'] = [];

        global $cheatjs_plugin;
        require dirname( __DIR__, 2 ) . '/cheatjs.php';

        $this->assertInstanceOf( CheatJS_Plugin::class, $cheatjs_plugin );
        $this->assertTrue( class_exists( 'CheatJS_Admin' ) );

        do_action( 'plugins_loaded' );

        $this->assertArrayHasKey( 'admin_menu', $GLOBALS['cheatjs_test_actions'] );
        $this->assertArrayHasKey( 'admin_init', $GLOBALS['cheatjs_test_actions'] );
        $this->assertArrayHasKey( 'admin_enqueue_scripts', $GLOBALS['cheatjs_test_actions'] );
    }

    private function create_admin(): CheatJS_Admin {
        if ( ! class_exists( 'CheatJS_Admin' ) ) {
            $this->fail( 'CheatJS_Admin class does not exist.' );
        }

        return new CheatJS_Admin( new CheatJS_Settings() );
    }
}
