<?php
/**
 * Main plugin coordinator for CheatJS.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class CheatJS_Plugin {
    private CheatJS_Settings $settings;
    private $admin;
    private ?CheatJS_Frontend $frontend;

    public function __construct( ?CheatJS_Settings $settings = null, $admin = null, ?CheatJS_Frontend $frontend = null ) {
        $this->settings = $settings ?: new CheatJS_Settings();
        $this->admin    = $admin;
        $this->frontend = $frontend ?: new CheatJS_Frontend( $this->settings );
    }

    public function hooks(): void {
        if ( $this->admin ) {
            $this->register_admin_hooks();
        }

        if ( $this->frontend && method_exists( $this->frontend, 'enqueue_assets' ) ) {
            add_action( 'wp_enqueue_scripts', [ $this->frontend, 'enqueue_assets' ] );
        }
    }

    public function activate(): void {
        $this->settings->activate_defaults();
    }

    private function register_admin_hooks(): void {
        $hooks = [
            'admin_menu'            => 'register_menu',
            'admin_init'            => 'register_settings',
            'admin_enqueue_scripts' => 'enqueue_assets',
        ];

        foreach ( $hooks as $hook => $method ) {
            if ( method_exists( $this->admin, $method ) ) {
                add_action( $hook, [ $this->admin, $method ] );
            }
        }
    }
}
