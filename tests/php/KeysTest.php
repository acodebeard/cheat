<?php

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-cheatjs-keys.php';

final class KeysTest extends TestCase {
    public function test_arrow_aliases_normalize_to_browser_key_values(): void {
        $this->assertSame( 'ArrowUp', CheatJS_Keys::normalize_key( 'up' ) );
        $this->assertSame( 'ArrowDown', CheatJS_Keys::normalize_key( '↓' ) );
        $this->assertSame( 'ArrowLeft', CheatJS_Keys::normalize_key( 'arrowleft' ) );
        $this->assertSame( 'ArrowRight', CheatJS_Keys::normalize_key( '→' ) );
    }

    public function test_letters_and_numbers_are_supported(): void {
        $this->assertSame( 'a', CheatJS_Keys::normalize_key( 'A' ) );
        $this->assertSame( 'z', CheatJS_Keys::normalize_key( 'z' ) );
        $this->assertSame( '7', CheatJS_Keys::normalize_key( '7' ) );
    }

    public function test_unsupported_keys_are_rejected(): void {
        $this->assertSame( '', CheatJS_Keys::normalize_key( 'Enter' ) );
        $this->assertSame( '', CheatJS_Keys::normalize_key( 'Shift' ) );
        $this->assertSame( '', CheatJS_Keys::normalize_key( '<script>' ) );
    }

    public function test_sequence_strings_accept_commas_and_spaces(): void {
        $this->assertSame(
            [ 'ArrowUp', 'ArrowUp', 'ArrowDown', 'b', 'a' ],
            CheatJS_Keys::parse_sequence( 'up, arrowup down B A' )
        );
    }
}
