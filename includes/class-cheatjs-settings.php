<?php
/**
 * Settings model and sanitizer for CheatJS.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class CheatJS_Settings {
    public const OPTION_NAME = 'cheatjs_settings';
    public const DEFAULT_MAX_GAP_MS = 2000;

    public function get_defaults(): array {
        $defaults = [
            'global_enabled' => true,
            'max_gap_ms'     => self::DEFAULT_MAX_GAP_MS,
            'presets'        => [],
        ];

        foreach ( CheatJS_Presets::get_presets() as $id => $preset ) {
            $defaults['presets'][ $id ] = [
                'enabled'  => $preset['default_enabled'],
                'sequence' => $preset['default_sequence'],
            ];
        }

        return $defaults;
    }

    public function get(): array {
        $stored = get_option( self::OPTION_NAME, null );

        if ( ! is_array( $stored ) ) {
            return $this->get_defaults();
        }

        return $this->normalize( $stored );
    }

    public function sanitize( $input ): array {
        return $this->normalize( $input );
    }

    public function get_active_presets(): array {
        $settings = $this->get();

        if ( ! $settings['global_enabled'] ) {
            return [];
        }

        $active  = [];
        $presets = CheatJS_Presets::get_presets();

        foreach ( $settings['presets'] as $id => $preset_settings ) {
            if ( empty( $preset_settings['enabled'] ) || ! isset( $presets[ $id ] ) ) {
                continue;
            }

            $preset = $presets[ $id ];

            $active[ $id ] = [
                'id'           => $id,
                'name'         => $preset['name'],
                'description'  => $preset['description'],
                'effect_label' => $preset['effect_label'],
                'body_class'   => $preset['body_class'],
                'sequence'     => $preset_settings['sequence'],
                'on_message'   => $preset['on_message'],
                'off_message'  => $preset['off_message'],
            ];
        }

        return $active;
    }

    public function activate_defaults(): void {
        if ( get_option( self::OPTION_NAME, null ) !== null ) {
            return;
        }

        update_option( self::OPTION_NAME, $this->get_defaults() );
    }

    private function normalize( $input ): array {
        $input    = is_array( $input ) ? $input : [];
        $defaults = $this->get_defaults();
        $settings = $defaults;

        $settings['global_enabled'] = array_key_exists( 'global_enabled', $input )
            ? $this->to_boolean( $input['global_enabled'] )
            : $defaults['global_enabled'];

        if ( array_key_exists( 'max_gap_ms', $input ) ) {
            $max_gap_ms = $this->sanitize_positive_integer( $input['max_gap_ms'] );
            if ( $max_gap_ms > 0 ) {
                $settings['max_gap_ms'] = $max_gap_ms;
            }
        }

        $submitted_presets = isset( $input['presets'] ) && is_array( $input['presets'] )
            ? $input['presets']
            : [];

        foreach ( CheatJS_Presets::get_presets() as $id => $preset ) {
            if ( ! array_key_exists( $id, $submitted_presets ) || ! is_array( $submitted_presets[ $id ] ) ) {
                $settings['presets'][ $id ] = [
                    'enabled'  => $preset['default_enabled'],
                    'sequence' => $preset['default_sequence'],
                ];
                continue;
            }

            $preset_input = $submitted_presets[ $id ];
            $sequence     = array_key_exists( 'sequence', $preset_input )
                ? CheatJS_Keys::parse_sequence( $preset_input['sequence'] )
                : $preset['default_sequence'];

            if ( empty( $sequence ) ) {
                $sequence = $preset['default_sequence'];
            }

            $settings['presets'][ $id ] = [
                'enabled'  => array_key_exists( 'enabled', $preset_input )
                    ? $this->to_boolean( $preset_input['enabled'] )
                    : $preset['default_enabled'],
                'sequence' => $sequence,
            ];
        }

        return $settings;
    }

    private function to_boolean( $value ): bool {
        if ( is_bool( $value ) ) {
            return $value;
        }

        if ( is_int( $value ) || is_float( $value ) ) {
            return $value !== 0 && $value !== 0.0;
        }

        if ( is_string( $value ) ) {
            return in_array( strtolower( trim( $value ) ), [ '1', 'true', 'on', 'yes' ], true );
        }

        return false;
    }

    private function sanitize_positive_integer( $value ): int {
        if ( is_int( $value ) ) {
            return $value > 0 ? $value : 0;
        }

        if ( is_string( $value ) && preg_match( '/^[1-9][0-9]*$/', $value ) ) {
            return (int) $value;
        }

        return 0;
    }
}
