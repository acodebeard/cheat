# CheatJS WordPress Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert CheatJS into a free WordPress plugin with bundled keyboard easter egg presets, a simple admin settings page, editable key sequences, and frontend-only effects.

**Architecture:** PHP provides WordPress integration, preset registration, settings validation, admin rendering, and frontend config. Vanilla JavaScript handles key recording in admin and key sequence detection on the public frontend. CSS owns every built-in effect; administrators can enable effects and edit sequences but cannot inject custom code.

**Tech Stack:** WordPress PHP plugin APIs, PHP 8.4-compatible classes, PHPUnit for PHP unit tests with WordPress function shims, Vitest with jsdom for browser JavaScript tests, vanilla JS and CSS.

---

## File Structure

- Create: `cheatjs.php` as the plugin bootstrap.
- Create: `includes/class-cheatjs-keys.php` for key normalization and sequence parsing.
- Create: `includes/class-cheatjs-presets.php` for built-in presets and filter validation.
- Create: `includes/class-cheatjs-settings.php` for option defaults, sanitization, and active preset config.
- Create: `includes/class-cheatjs-plugin.php` for hook wiring and activation.
- Create: `includes/class-cheatjs-admin.php` for the Settings page.
- Create: `includes/class-cheatjs-frontend.php` for frontend asset enqueueing and runtime config.
- Create: `assets/js/cheatjs.js` for frontend sequence detection.
- Create: `assets/js/cheatjs-admin.js` for the admin key recorder.
- Create: `assets/css/cheatjs-effects.css` for frontend effects and plugin notices.
- Create: `assets/css/cheatjs-admin.css` for settings page styling.
- Create: `tests/bootstrap.php` with WordPress test shims.
- Create: `tests/php/KeysTest.php`, `tests/php/PresetsTest.php`, `tests/php/SettingsTest.php`, `tests/php/FrontendTest.php`, and `tests/php/AdminTest.php`.
- Create: `tests/js/cheatjs.test.js` and `tests/js/cheatjs-admin.test.js`.
- Create: `composer.json`, `phpunit.xml.dist`, `package.json`, and `vitest.config.js`.
- Modify: `README.md` to document plugin usage and development commands.
- Delete after replacement is complete: root demo files `index.html`, `cheat.js`, `cheat.config.js`, `cheat.data.js`, and `style.css`.

## Task 1: Test Tooling

**Files:**
- Create: `composer.json`
- Create: `phpunit.xml.dist`
- Create: `tests/bootstrap.php`
- Create: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Add PHP and JS test configuration**

Create `composer.json`:

```json
{
  "name": "acodebeard/cheatjs",
  "description": "A WordPress plugin for playful keyboard easter eggs.",
  "type": "wordpress-plugin",
  "license": "GPL-3.0-or-later",
  "require": {
    "php": ">=7.4"
  },
  "require-dev": {
    "phpunit/phpunit": "^9.6 || ^10.5 || ^11.5 || ^12.0"
  },
  "scripts": {
    "test:php": "phpunit"
  }
}
```

Create `phpunit.xml.dist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="tests/bootstrap.php" colors="true">
  <testsuites>
    <testsuite name="CheatJS PHP">
      <directory>tests/php</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

Create `package.json`:

```json
{
  "name": "cheatjs",
  "version": "1.0.0",
  "private": true,
  "description": "A WordPress plugin for playful keyboard easter eggs.",
  "scripts": {
    "test:js": "vitest run",
    "test": "npm run test:js"
  },
  "devDependencies": {
    "jsdom": "^24.1.3",
    "vitest": "^2.1.9"
  }
}
```

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
  },
});
```

- [ ] **Step 2: Add WordPress shims for isolated PHP tests**

Create `tests/bootstrap.php` with shims for filters, options, escaping, settings, and asset functions used by the plugin classes:

```php
<?php
define( 'ABSPATH', dirname( __DIR__ ) . '/' );

$GLOBALS['cheatjs_test_filters'] = [];
$GLOBALS['cheatjs_test_options'] = [];
$GLOBALS['cheatjs_test_actions'] = [];
$GLOBALS['cheatjs_test_assets'] = [
    'scripts' => [],
    'styles'  => [],
    'inline'  => [],
];

function add_filter( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
    $GLOBALS['cheatjs_test_filters'][ $hook ][ $priority ][] = $callback;
    return true;
}

function apply_filters( $hook, $value ) {
    if ( empty( $GLOBALS['cheatjs_test_filters'][ $hook ] ) ) {
        return $value;
    }
    ksort( $GLOBALS['cheatjs_test_filters'][ $hook ] );
    foreach ( $GLOBALS['cheatjs_test_filters'][ $hook ] as $callbacks ) {
        foreach ( $callbacks as $callback ) {
            $value = call_user_func( $callback, $value );
        }
    }
    return $value;
}

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
    $GLOBALS['cheatjs_test_actions'][ $hook ][] = $callback;
    return true;
}

function get_option( $name, $default = false ) {
    return array_key_exists( $name, $GLOBALS['cheatjs_test_options'] ) ? $GLOBALS['cheatjs_test_options'][ $name ] : $default;
}

function update_option( $name, $value ) {
    $GLOBALS['cheatjs_test_options'][ $name ] = $value;
    return true;
}

function sanitize_key( $key ) {
    return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
}

function sanitize_html_class( $class, $fallback = '' ) {
    $class = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $class );
    return $class === '' ? $fallback : $class;
}

function sanitize_text_field( $value ) {
    return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $value ) ) );
}

function esc_html( $value ) {
    return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}

function esc_attr( $value ) {
    return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}

function esc_url( $value ) {
    return esc_attr( $value );
}

function wp_json_encode( $value ) {
    return json_encode( $value, JSON_UNESCAPED_SLASHES );
}

function checked( $checked, $current = true, $display = true ) {
    $result = (string) $checked === (string) $current ? ' checked="checked"' : '';
    if ( $display ) {
        echo $result;
    }
    return $result;
}

function settings_fields( $group ) {
    echo '<input type="hidden" name="option_page" value="' . esc_attr( $group ) . '">';
}

function submit_button( $text = 'Save Changes' ) {
    echo '<p class="submit"><button type="submit">' . esc_html( $text ) . '</button></p>';
}

function admin_url( $path = '' ) {
    return 'http://example.test/wp-admin/' . ltrim( $path, '/' );
}

function current_user_can( $capability ) {
    return $capability === 'manage_options';
}

function add_options_page() {
    return 'settings_page_cheatjs';
}

function register_setting() {
    return true;
}

function wp_enqueue_script( $handle, $src = '', $deps = [], $ver = false, $args = [] ) {
    $GLOBALS['cheatjs_test_assets']['scripts'][ $handle ] = compact( 'src', 'deps', 'ver', 'args' );
}

function wp_enqueue_style( $handle, $src = '', $deps = [], $ver = false ) {
    $GLOBALS['cheatjs_test_assets']['styles'][ $handle ] = compact( 'src', 'deps', 'ver' );
}

function wp_add_inline_script( $handle, $data, $position = 'after' ) {
    $GLOBALS['cheatjs_test_assets']['inline'][ $handle ][] = compact( 'data', 'position' );
}

function plugin_dir_url( $file ) {
    return 'http://example.test/wp-content/plugins/cheatjs/';
}

function plugin_dir_path( $file ) {
    return dirname( __DIR__ ) . '/';
}

function register_activation_hook() {
    return true;
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
composer install
npm install
```

Expected: `vendor/bin/phpunit` and `node_modules/.bin/vitest` are installed without errors.

- [ ] **Step 4: Run empty test suites**

Run:

```bash
composer test:php
npm run test:js
```

Expected: PHP may report no tests yet; JS may report no tests yet. Both commands must execute the configured runners.

- [ ] **Step 5: Commit tooling**

```bash
git add composer.json composer.lock phpunit.xml.dist package.json package-lock.json vitest.config.js tests/bootstrap.php
git commit -m "test: add PHP and JS test tooling"
```

## Task 2: Key Normalization

**Files:**
- Create: `tests/php/KeysTest.php`
- Create: `includes/class-cheatjs-keys.php`

- [ ] **Step 1: Write failing key normalization tests**

Create `tests/php/KeysTest.php`:

```php
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
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
vendor/bin/phpunit tests/php/KeysTest.php
```

Expected: FAIL because `includes/class-cheatjs-keys.php` does not exist.

- [ ] **Step 3: Implement key normalization**

Create `includes/class-cheatjs-keys.php`:

```php
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
            $key = self::normalize_key( $token );
            if ( $key !== '' ) {
                $sequence[] = $key;
            }
        }

        return $sequence;
    }
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
vendor/bin/phpunit tests/php/KeysTest.php
```

Expected: PASS.

- [ ] **Step 5: Commit key normalization**

```bash
git add includes/class-cheatjs-keys.php tests/php/KeysTest.php
git commit -m "feat: add cheat key normalization"
```

## Task 3: Preset Registry

**Files:**
- Create: `tests/php/PresetsTest.php`
- Create: `includes/class-cheatjs-presets.php`

- [ ] **Step 1: Write failing preset registry tests**

Create tests that assert the built-in preset IDs, required fields, valid sequences, and filter extension behavior:

```php
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

        foreach ( [ 'confidence', 'geocities', 'konami', 'drunk', 'disco', 'upside_down', 'grayscale', 'high_contrast', 'soft_blur' ] as $id ) {
            $this->assertArrayHasKey( $id, $presets );
            $this->assertNotSame( '', $presets[ $id ]['name'] );
            $this->assertNotSame( '', $presets[ $id ]['body_class'] );
            $this->assertNotEmpty( $presets[ $id ]['default_sequence'] );
        }
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
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
vendor/bin/phpunit tests/php/PresetsTest.php
```

Expected: FAIL because `CheatJS_Presets` is missing.

- [ ] **Step 3: Implement the preset registry**

Create `includes/class-cheatjs-presets.php` with:

- `CheatJS_Presets::get_presets()`
- `CheatJS_Presets::get_builtin_presets()`
- `CheatJS_Presets::validate_presets()`
- Validation that rejects empty names, empty body classes, and empty normalized default sequences.
- The filter `apply_filters( 'cheatjs_presets', $presets )`.
- Built-ins matching the nine preset IDs in the test.

Each preset array must include `name`, `description`, `effect_label`, `body_class`, `default_enabled`, `default_sequence`, `on_message`, and `off_message`.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
vendor/bin/phpunit tests/php/PresetsTest.php
```

Expected: PASS.

- [ ] **Step 5: Commit presets**

```bash
git add includes/class-cheatjs-presets.php tests/php/PresetsTest.php
git commit -m "feat: register built-in cheat presets"
```

## Task 4: Settings Sanitization

**Files:**
- Create: `tests/php/SettingsTest.php`
- Create: `includes/class-cheatjs-settings.php`

- [ ] **Step 1: Write failing settings tests**

Create tests for defaults, booleans, unknown preset rejection, alias normalization, invalid key removal, and fallback to preset defaults.

Use assertions like:

```php
$settings = new CheatJS_Settings();
$sanitized = $settings->sanitize( [
    'global_enabled' => '1',
    'presets' => [
        'konami' => [
            'enabled' => '0',
            'sequence' => 'up up down down left right left right b a',
        ],
        'unknown' => [
            'enabled' => '1',
            'sequence' => 'x',
        ],
    ],
] );

$this->assertTrue( $sanitized['global_enabled'] );
$this->assertFalse( $sanitized['presets']['konami']['enabled'] );
$this->assertSame( [ 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a' ], $sanitized['presets']['konami']['sequence'] );
$this->assertArrayNotHasKey( 'unknown', $sanitized['presets'] );
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
vendor/bin/phpunit tests/php/SettingsTest.php
```

Expected: FAIL because `CheatJS_Settings` is missing.

- [ ] **Step 3: Implement settings**

Create `includes/class-cheatjs-settings.php` with:

- `const OPTION_NAME = 'cheatjs_settings';`
- `const DEFAULT_MAX_GAP_MS = 2000;`
- `get_defaults(): array`
- `get(): array`
- `sanitize( $input ): array`
- `get_active_presets(): array`
- `activate_defaults(): void`

The sanitizer must always return every currently registered preset using saved values where valid and default values where input is missing or invalid. It must ignore unknown submitted IDs.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
vendor/bin/phpunit tests/php/SettingsTest.php
```

Expected: PASS.

- [ ] **Step 5: Commit settings**

```bash
git add includes/class-cheatjs-settings.php tests/php/SettingsTest.php
git commit -m "feat: add plugin settings sanitization"
```

## Task 5: Plugin Bootstrap And Frontend Config

**Files:**
- Create: `tests/php/FrontendTest.php`
- Create: `cheatjs.php`
- Create: `includes/class-cheatjs-plugin.php`
- Create: `includes/class-cheatjs-frontend.php`

- [ ] **Step 1: Write failing frontend tests**

Test that disabled global settings produce no runtime config, enabled presets produce sanitized JavaScript config, and asset enqueueing records both frontend files plus inline config in the WordPress shims.

Expected runtime config shape:

```php
[
    'maxGapMs' => 2000,
    'presets' => [
        [
            'id'         => 'konami',
            'bodyClass'  => 'cheatjs-konami',
            'sequence'   => [ 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a' ],
            'onMessage'  => 'Konami mode enabled.',
            'offMessage' => 'Konami mode disabled.',
        ],
    ],
]
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
vendor/bin/phpunit tests/php/FrontendTest.php
```

Expected: FAIL because frontend classes are missing.

- [ ] **Step 3: Implement bootstrap and frontend class**

Implement:

- `cheatjs.php` plugin header, constants, required includes, activation hook, and plugin boot.
- `CheatJS_Plugin` constructor accepting settings/admin/frontend instances for testability.
- `CheatJS_Plugin::hooks()` registering `admin_menu`, `admin_init`, `admin_enqueue_scripts`, and `wp_enqueue_scripts`.
- `CheatJS_Frontend::get_runtime_config()` returning the JS-facing array.
- `CheatJS_Frontend::enqueue_assets()` loading `assets/css/cheatjs-effects.css`, `assets/js/cheatjs.js`, and inline JavaScript in the form `window.CHEATJS_CONFIG = {"maxGapMs":2000,"presets":[]};` only when active presets exist.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
vendor/bin/phpunit tests/php/FrontendTest.php
```

Expected: PASS.

- [ ] **Step 5: Commit bootstrap/frontend**

```bash
git add cheatjs.php includes/class-cheatjs-plugin.php includes/class-cheatjs-frontend.php tests/php/FrontendTest.php
git commit -m "feat: add plugin bootstrap and frontend config"
```

## Task 6: Admin Settings Page

**Files:**
- Create: `tests/php/AdminTest.php`
- Create: `includes/class-cheatjs-admin.php`
- Create: `assets/css/cheatjs-admin.css`

- [ ] **Step 1: Write failing admin render tests**

Test that `CheatJS_Admin::render_page()` outputs:

- A form posting to `options.php`.
- A hidden `cheatjs_settings[global_enabled]` value of `0`.
- A global enabled checkbox.
- One preset block for `konami`.
- A sequence hidden input for `konami`.
- Record, Clear, Reset default, and Done buttons.
- Key chips for the current sequence.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
vendor/bin/phpunit tests/php/AdminTest.php
```

Expected: FAIL because `CheatJS_Admin` is missing.

- [ ] **Step 3: Implement admin rendering**

Implement:

- `CheatJS_Admin::register_page()`
- `CheatJS_Admin::register_settings()`
- `CheatJS_Admin::enqueue_assets( $hook )`
- `CheatJS_Admin::render_page()`
- Private helpers for rendering preset cards and key chips.

Use Settings API `register_setting()` with `CheatJS_Settings::sanitize()` as the sanitize callback. Escape all output. Include data attributes for the key recorder:

```html
data-cheatjs-preset="konami"
data-default-sequence="ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a"
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
vendor/bin/phpunit tests/php/AdminTest.php
```

Expected: PASS.

- [ ] **Step 5: Commit admin PHP and CSS shell**

```bash
git add includes/class-cheatjs-admin.php assets/css/cheatjs-admin.css tests/php/AdminTest.php
git commit -m "feat: add CheatJS settings page"
```

## Task 7: Frontend Detector And Effects

**Files:**
- Create: `tests/js/cheatjs.test.js`
- Create: `assets/js/cheatjs.js`
- Create: `assets/css/cheatjs-effects.css`

- [ ] **Step 1: Write failing frontend JS tests**

Test these behaviors in `tests/js/cheatjs.test.js`:

- Full sequence toggles body class on.
- Repeating the full sequence toggles body class off.
- Keydown inside an input is ignored.
- Wrong key resets sequence progress.
- Matching first key after a wrong key restarts progress.
- Progress resets after `maxGapMs`.
- Two presets can be tracked at the same time.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm run test:js -- tests/js/cheatjs.test.js
```

Expected: FAIL because `window.CheatJS` is missing.

- [ ] **Step 3: Implement frontend JS**

Implement `assets/js/cheatjs.js` as an IIFE exposing:

- `window.CheatJS.init(config, documentOverride)`
- `window.CheatJS.createDetector(config, documentOverride)`
- `window.CheatJS.normalizeKey(key)`
- `window.CheatJS.isTypingTarget(target)`

`init()` attaches a `keydown` listener and returns an object with `destroy()`. The detector toggles body classes and shows plugin-owned notices using `onMessage` and `offMessage`.

- [ ] **Step 4: Add frontend effects CSS**

Implement CSS classes for:

- `.cheatjs-confidence`
- `.cheatjs-geocities`
- `.cheatjs-konami`
- `.cheatjs-drunk`
- `.cheatjs-disco`
- `.cheatjs-upside-down`
- `.cheatjs-grayscale`
- `.cheatjs-high-contrast`
- `.cheatjs-soft-blur`
- `.cheatjs-notice`

Respect `prefers-reduced-motion: reduce` for animated effects.

- [ ] **Step 5: Run the test and verify GREEN**

Run:

```bash
npm run test:js -- tests/js/cheatjs.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit frontend detector**

```bash
git add assets/js/cheatjs.js assets/css/cheatjs-effects.css tests/js/cheatjs.test.js
git commit -m "feat: add frontend cheat detector"
```

## Task 8: Admin Key Recorder

**Files:**
- Create: `tests/js/cheatjs-admin.test.js`
- Create: `assets/js/cheatjs-admin.js`
- Modify: `assets/css/cheatjs-admin.css`

- [ ] **Step 1: Write failing admin recorder tests**

Test these behaviors in `tests/js/cheatjs-admin.test.js`:

- Clicking Record starts recording for one preset.
- Letter and arrow key presses append canonical keys to the hidden input.
- Backspace removes the last key while recording.
- Clear empties the hidden input and chips.
- Reset default restores the default sequence.
- Escape cancels recording and restores the previous sequence.
- Done stops recording and preserves the current sequence.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm run test:js -- tests/js/cheatjs-admin.test.js
```

Expected: FAIL because `window.CheatJSAdmin` is missing.

- [ ] **Step 3: Implement admin recorder JS**

Implement `assets/js/cheatjs-admin.js` as an IIFE exposing:

- `window.CheatJSAdmin.init(documentOverride)`
- `window.CheatJSAdmin.normalizeKey(key)`
- `window.CheatJSAdmin.keyLabel(key)`

The script should bind to `[data-cheatjs-preset]` cards and update `.cheatjs-sequence-input` plus `.cheatjs-key-chips`.

- [ ] **Step 4: Polish admin CSS**

Style the settings page as a compact WordPress admin tool:

- Preset cards use restrained borders and spacing.
- Key chips look like keyboard keys.
- Recording state is obvious with a left border or background tint.
- Buttons use standard WordPress button classes in markup and light custom spacing in CSS.

- [ ] **Step 5: Run the test and verify GREEN**

Run:

```bash
npm run test:js -- tests/js/cheatjs-admin.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit admin recorder**

```bash
git add assets/js/cheatjs-admin.js assets/css/cheatjs-admin.css tests/js/cheatjs-admin.test.js
git commit -m "feat: add admin key recorder"
```

## Task 9: Documentation And Cleanup

**Files:**
- Modify: `README.md`
- Delete: `index.html`
- Delete: `cheat.js`
- Delete: `cheat.config.js`
- Delete: `cheat.data.js`
- Delete: `style.css`

- [ ] **Step 1: Update README**

Rewrite `README.md` to cover:

- What CheatJS does as a WordPress plugin.
- How to install it by placing the repo in `wp-content/plugins/cheatjs`.
- How to use Settings → CheatJS.
- What presets ship in v1.
- How developers can extend presets with the `cheatjs_presets` filter.
- Development commands: `composer test:php`, `npm run test:js`, and full `composer test:php && npm run test:js`.

- [ ] **Step 2: Remove static demo files**

Delete the root static demo files after their behavior has been replaced by plugin assets:

```bash
git rm index.html cheat.js cheat.config.js cheat.data.js style.css
```

- [ ] **Step 3: Run the complete automated suite**

Run:

```bash
composer test:php
npm run test:js
```

Expected: all PHP and JS tests pass.

- [ ] **Step 4: Manual WordPress verification**

Install or symlink the repository as a WordPress plugin, activate CheatJS, then verify:

- Settings → CheatJS loads.
- Global enable/disable saves.
- Preset enable/disable saves.
- Record, Backspace, Clear, Reset default, Escape, and Done work in the key recorder.
- Public frontend loads no CheatJS assets when globally disabled.
- Public frontend loads CheatJS assets when enabled.
- At least `konami`, `geocities`, and `drunk` effects toggle on and off.

- [ ] **Step 5: Commit docs and cleanup**

```bash
git add README.md
git rm index.html cheat.js cheat.config.js cheat.data.js style.css
git commit -m "docs: document WordPress plugin usage"
```

## Final Verification

Run:

```bash
composer test:php
npm run test:js
git status --short
```

Expected:

- PHP tests pass.
- JS tests pass.
- `git status --short` shows no unexpected uncommitted changes.

Then provide a concise summary of implemented plugin behavior, test results, and any manual WordPress checks that could not be performed in the current environment.
