<?php
/**
 * Preset registry for CheatJS effects.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class CheatJS_Presets {
    public static function get_presets(): array {
        $presets = self::get_builtin_presets();
        $presets = apply_filters( 'cheatjs_presets', $presets );

        return self::validate_presets( $presets );
    }

    public static function get_builtin_presets(): array {
        return [
            'confidence'    => [
                'name'             => 'Confidence',
                'description'      => 'Adds an encouraging boost when activated.',
                'effect_label'     => 'Confidence mode',
                'body_class'       => 'cheatjs-confidence',
                'default_enabled'  => true,
                'default_sequence' => [ 'c', 'o', 'n', 'f' ],
                'on_message'       => 'Confidence mode enabled.',
                'off_message'      => 'Confidence mode disabled.',
            ],
            'geocities'     => [
                'name'             => 'GeoCities',
                'description'      => 'Applies a retro web effect.',
                'effect_label'     => 'GeoCities mode',
                'body_class'       => 'cheatjs-geocities',
                'default_enabled'  => false,
                'default_sequence' => [ 'g', 'e', 'o' ],
                'on_message'       => 'GeoCities mode enabled.',
                'off_message'      => 'GeoCities mode disabled.',
            ],
            'konami'        => [
                'name'             => 'Konami',
                'description'      => 'Unlocks the classic cheat code effect.',
                'effect_label'     => 'Konami mode',
                'body_class'       => 'cheatjs-konami',
                'default_enabled'  => true,
                'default_sequence' => [
                    'ArrowUp',
                    'ArrowUp',
                    'ArrowDown',
                    'ArrowDown',
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowLeft',
                    'ArrowRight',
                    'b',
                    'a',
                ],
                'on_message'       => 'Konami mode enabled.',
                'off_message'      => 'Konami mode disabled.',
            ],
            'drunk'         => [
                'name'             => 'Drunk',
                'description'      => 'Adds a woozy page effect.',
                'effect_label'     => 'Drunk mode',
                'body_class'       => 'cheatjs-drunk',
                'default_enabled'  => false,
                'default_sequence' => [ 'd', 'r', 'u', 'n', 'k' ],
                'on_message'       => 'Drunk mode enabled.',
                'off_message'      => 'Drunk mode disabled.',
            ],
            'disco'         => [
                'name'             => 'Disco',
                'description'      => 'Adds a colorful party effect.',
                'effect_label'     => 'Disco mode',
                'body_class'       => 'cheatjs-disco',
                'default_enabled'  => false,
                'default_sequence' => [ 'd', 'i', 's', 'c', 'o' ],
                'on_message'       => 'Disco mode enabled.',
                'off_message'      => 'Disco mode disabled.',
            ],
            'upside_down'   => [
                'name'             => 'Upside Down',
                'description'      => 'Turns the page upside down.',
                'effect_label'     => 'Upside down mode',
                'body_class'       => 'cheatjs-upside-down',
                'default_enabled'  => false,
                'default_sequence' => [ 'u', 'p', 'd', 'o', 'w', 'n' ],
                'on_message'       => 'Upside down mode enabled.',
                'off_message'      => 'Upside down mode disabled.',
            ],
            'grayscale'     => [
                'name'             => 'Grayscale',
                'description'      => 'Removes color from the page.',
                'effect_label'     => 'Grayscale mode',
                'body_class'       => 'cheatjs-grayscale',
                'default_enabled'  => false,
                'default_sequence' => [ 'g', 'r', 'a', 'y' ],
                'on_message'       => 'Grayscale mode enabled.',
                'off_message'      => 'Grayscale mode disabled.',
            ],
            'high_contrast' => [
                'name'             => 'High Contrast',
                'description'      => 'Increases contrast across the page.',
                'effect_label'     => 'High contrast mode',
                'body_class'       => 'cheatjs-high-contrast',
                'default_enabled'  => false,
                'default_sequence' => [ 'h', 'i', 'g', 'h' ],
                'on_message'       => 'High contrast mode enabled.',
                'off_message'      => 'High contrast mode disabled.',
            ],
            'soft_blur'     => [
                'name'             => 'Soft Blur',
                'description'      => 'Applies a soft blur effect.',
                'effect_label'     => 'Soft blur mode',
                'body_class'       => 'cheatjs-soft-blur',
                'default_enabled'  => false,
                'default_sequence' => [ 'b', 'l', 'u', 'r' ],
                'on_message'       => 'Soft blur mode enabled.',
                'off_message'      => 'Soft blur mode disabled.',
            ],
        ];
    }

    public static function validate_presets( $presets ): array {
        if ( ! is_array( $presets ) ) {
            return [];
        }

        $valid = [];
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

        foreach ( $presets as $id => $preset ) {
            if ( ! is_array( $preset ) ) {
                continue;
            }

            foreach ( $required_fields as $field ) {
                if ( ! array_key_exists( $field, $preset ) ) {
                    continue 2;
                }
            }

            $id = self::sanitize_id( $id );
            if ( $id === '' ) {
                continue;
            }

            $name = trim( (string) $preset['name'] );
            if ( $name === '' ) {
                continue;
            }

            $body_class = self::sanitize_body_class( $preset['body_class'] );
            if ( $body_class === '' ) {
                continue;
            }

            $default_sequence = CheatJS_Keys::parse_sequence( $preset['default_sequence'] );
            if ( empty( $default_sequence ) ) {
                continue;
            }

            $valid[ $id ] = [
                'name'             => $name,
                'description'      => (string) $preset['description'],
                'effect_label'     => (string) $preset['effect_label'],
                'body_class'       => $body_class,
                'default_enabled'  => (bool) $preset['default_enabled'],
                'default_sequence' => $default_sequence,
                'on_message'       => (string) $preset['on_message'],
                'off_message'      => (string) $preset['off_message'],
            ];
        }

        return $valid;
    }

    private static function sanitize_id( $id ): string {
        if ( function_exists( 'sanitize_key' ) ) {
            return sanitize_key( $id );
        }

        return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $id ) );
    }

    private static function sanitize_body_class( $body_class ): string {
        if ( function_exists( 'sanitize_html_class' ) ) {
            return sanitize_html_class( $body_class );
        }

        return preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $body_class );
    }
}
