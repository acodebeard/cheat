<?php
/**
 * Frontend runtime configuration and assets for CheatJS.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class CheatJS_Frontend {
    private CheatJS_Settings $settings;

    public function __construct( ?CheatJS_Settings $settings = null ) {
        $this->settings = $settings ?: new CheatJS_Settings();
    }

    public function get_runtime_config(): ?array {
        $settings       = $this->settings->get();
        $active_presets = $this->settings->get_active_presets();

        if ( empty( $settings['global_enabled'] ) || empty( $active_presets ) ) {
            return null;
        }

        $presets = [];

        foreach ( $active_presets as $preset ) {
            $presets[] = [
                'id'         => $preset['id'],
                'bodyClass'  => $preset['body_class'],
                'sequence'   => array_values( $preset['sequence'] ),
                'onMessage'  => $preset['on_message'],
                'offMessage' => $preset['off_message'],
            ];
        }

        if ( empty( $presets ) ) {
            return null;
        }

        return [
            'maxGapMs' => $settings['max_gap_ms'],
            'presets'  => array_values( $presets ),
        ];
    }

    public function enqueue_assets(): void {
        $config = $this->get_runtime_config();

        if ( empty( $config ) ) {
            return;
        }

        $base_file = defined( 'CHEATJS_FILE' ) ? CHEATJS_FILE : dirname( __DIR__ ) . '/cheatjs.php';
        $base_url  = defined( 'CHEATJS_URL' ) ? CHEATJS_URL : plugin_dir_url( $base_file );
        $version   = defined( 'CHEATJS_VERSION' ) ? CHEATJS_VERSION : '0.1.0';

        wp_enqueue_style(
            'cheatjs-effects',
            $base_url . 'assets/css/cheatjs-effects.css',
            [],
            $version
        );

        wp_enqueue_script(
            'cheatjs',
            $base_url . 'assets/js/cheatjs.js',
            [],
            $version,
            [ 'in_footer' => true ]
        );

        wp_add_inline_script(
            'cheatjs',
            'window.CHEATJS_CONFIG = ' . wp_json_encode( $config ) . ';',
            'before'
        );
    }
}
