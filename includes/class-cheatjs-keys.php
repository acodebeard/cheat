<?php
/**
 * Key normalization helpers for CheatJS.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class CheatJS_Keys {
    public static function normalize_key( $key ): string {
        $key = trim( (string) $key );

        if ( $key === '' ) {
            return '';
        }

        $lower = strtolower( $key );
        $aliases = [
            'up'         => 'ArrowUp',
            'arrowup'    => 'ArrowUp',
            '↑'          => 'ArrowUp',
            'down'       => 'ArrowDown',
            'arrowdown'  => 'ArrowDown',
            '↓'          => 'ArrowDown',
            'left'       => 'ArrowLeft',
            'arrowleft'  => 'ArrowLeft',
            '←'          => 'ArrowLeft',
            'right'      => 'ArrowRight',
            'arrowright' => 'ArrowRight',
            '→'          => 'ArrowRight',
        ];

        if ( isset( $aliases[ $lower ] ) ) {
            return $aliases[ $lower ];
        }

        if ( preg_match( '/^[a-z]$/', $lower ) ) {
            return $lower;
        }

        if ( preg_match( '/^[0-9]$/', $lower ) ) {
            return $lower;
        }

        return '';
    }

    public static function parse_sequence( $value ): array {
        $tokens = is_array( $value )
            ? $value
            : preg_split( '/[\s,]+/', trim( (string) $value ), -1, PREG_SPLIT_NO_EMPTY );

        $sequence = [];

        foreach ( $tokens as $token ) {
            if ( ! is_scalar( $token ) ) {
                continue;
            }

            $key = self::normalize_key( $token );
            if ( $key !== '' ) {
                $sequence[] = $key;
            }
        }

        return $sequence;
    }
}
