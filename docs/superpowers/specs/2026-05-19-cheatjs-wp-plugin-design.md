# CheatJS WordPress Plugin Design

## Goal

Turn CheatJS from a static JavaScript demo into a fully functional, free WordPress plugin for adding playful keyboard easter eggs to a site.

The v1 plugin will ship with built-in cheat presets, let administrators enable or disable each preset, and provide an easy key-recorder UI for changing each preset's keyboard sequence. Effects remain built into the plugin so users can configure the fun parts without needing to write JavaScript or CSS.

## Scope

Included in v1:

- A normal WordPress plugin structure rooted in this repository.
- A simple settings page under WordPress Settings.
- Global plugin enable/disable.
- Per-preset enable/disable.
- Per-preset key sequence editing through a key recorder.
- Built-in visual effect presets.
- Frontend-only cheat detection and effects.
- A PHP filter for developers to register or modify presets.
- Sanitized PHP-to-JavaScript runtime configuration.

Not included in v1:

- Admin-only easter egg behavior.
- Custom JavaScript or CSS editing in WordPress Admin.
- Per-page or per-post targeting.
- Shortcodes, blocks, or widgets.
- Effects inside WordPress Admin.
- A custom post type for cheat definitions.

## Architecture

The plugin will use PHP for WordPress integration and vanilla JavaScript for browser behavior. PHP owns preset registration, settings storage, validation, admin rendering, asset enqueueing, and frontend config generation. JavaScript receives a sanitized list of active presets and only handles keyboard detection plus body-class toggling.

Primary files:

- `cheatjs.php`: plugin header, constants, bootstrap, activation defaults.
- `includes/class-cheatjs-plugin.php`: central hook wiring.
- `includes/class-cheatjs-presets.php`: built-in preset registry and developer filter.
- `includes/class-cheatjs-settings.php`: option defaults, reads, writes, and sanitization.
- `includes/class-cheatjs-admin.php`: settings page rendering and admin asset enqueueing.
- `includes/class-cheatjs-frontend.php`: frontend asset enqueueing and localized runtime config.
- `assets/js/cheatjs.js`: adapted key sequence detector.
- `assets/js/cheatjs-admin.js`: key recorder UI for the settings page.
- `assets/css/cheatjs-effects.css`: built-in frontend effects.
- `assets/css/cheatjs-admin.css`: small admin page styling.

## Settings Model

Settings will live in one WordPress option named `cheatjs_settings`.

Example shape:

```php
[
    'global_enabled' => true,
    'presets' => [
        'konami' => [
            'enabled' => true,
            'sequence' => [
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
        ],
    ],
]
```

Preset IDs are stable slugs. Each preset has a plugin-defined name, description, default sequence, body class, effect label, and optional on/off message. Administrators can change enabled state and sequence only.

Invalid or empty submitted sequences fall back to that preset's default sequence. Unknown preset IDs are ignored unless registered by the developer preset filter.

## Preset Registry

Built-in presets will include the current CheatJS ideas plus additional low-risk CSS effects:

- `confidence`: zooms the page slightly.
- `geocities`: switches visible text to a retro playful font stack.
- `konami`: adds green scanlines and a small mode badge.
- `drunk`: applies a slow wobble and blur effect.
- `disco`: cycles hue and saturation.
- `upside_down`: rotates the page 180 degrees.
- `grayscale`: removes color.
- `high_contrast`: increases contrast and brightness.
- `soft_blur`: applies a mild blur.

Developers can extend or modify presets with a filter:

```php
$presets = apply_filters( 'cheatjs_presets', $presets );
```

Filtered presets must still pass validation before they can be stored or sent to the browser.

## Admin Experience

The settings page will be intentionally compact.

It will include:

- A global enable checkbox.
- A list of preset rows or compact cards.
- Each preset row includes:
  - Enabled checkbox.
  - Preset name.
  - Description.
  - Effect label.
  - Current key sequence displayed as key chips.
  - Record button.
  - Done button shown during recording.
  - Clear button.
  - Reset default button.

The key recorder will work per preset:

- Clicking Record starts capture for that preset.
- Pressing supported keys appends them to the sequence.
- Backspace removes the last captured key while recording.
- Escape cancels recording and restores the previous sequence.
- Done accepts the current sequence.
- Clear empties the UI, but the server falls back to the default sequence if the saved value is empty.
- Reset default immediately restores the preset's default sequence in the UI.

A hidden input stores each canonical sequence as a comma-separated string such as:

```text
ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a
```

The PHP sanitizer remains authoritative. The admin JavaScript improves editing but is not trusted for security.

## Frontend Runtime

Frontend assets load only when the global setting is enabled and at least one preset is enabled.

PHP localizes a sanitized object containing active presets:

```js
window.CHEATJS_CONFIG = {
  maxGapMs: 2000,
  presets: [
    {
      id: 'konami',
      bodyClass: 'cheatjs-konami',
      sequence: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
      onMessage: 'Konami mode enabled.',
      offMessage: 'Konami mode disabled.'
    }
  ]
};
```

The detector will:

- Ignore events from inputs, textareas, selects, and contenteditable elements.
- Normalize letters to lowercase.
- Support browser arrow key values.
- Reset progress when the configured timing window is exceeded.
- Toggle each preset's body class when its sequence is completed.
- Show built-in on/off messages through a small plugin-owned notification, not arbitrary admin-authored JavaScript.

## Validation And Security

The plugin must:

- Register the settings option with a sanitize callback.
- Verify WordPress capabilities before rendering or saving settings.
- Use WordPress Settings API nonces.
- Escape all admin output.
- Sanitize all preset IDs, labels, descriptions, messages, classes, and sequences.
- Reject unsupported keys.
- Ignore unknown presets.
- Avoid executing administrator-authored JavaScript or CSS.
- Avoid loading frontend assets when there are no active presets.

Supported keys for v1:

- Arrow keys.
- Single letter keys `a` through `z`.
- Single number keys `0` through `9`.

Aliases accepted during sanitization:

- `up`, `arrowup`, and `↑` become `ArrowUp`.
- `down`, `arrowdown`, and `↓` become `ArrowDown`.
- `left`, `arrowleft`, and `←` become `ArrowLeft`.
- `right`, `arrowright`, and `→` become `ArrowRight`.

## Testing

Automated tests should focus on behavior with meaningful risk.

PHP tests:

- Built-in presets are registered with valid defaults.
- Developer filter can add a valid preset.
- Invalid preset definitions are rejected or excluded.
- Global enabled setting is sanitized to boolean.
- Preset enabled flags are sanitized to boolean.
- Key aliases normalize to canonical key values.
- Invalid keys are removed.
- Empty or invalid saved sequences fall back to preset defaults.
- Unknown preset IDs are ignored.

JavaScript tests:

- Matching a full sequence toggles the configured body class.
- Completing the same sequence again turns the class off.
- Typing inside form fields is ignored.
- Sequence progress resets after `maxGapMs`.
- A wrong key resets progress.
- A key that matches the first key restarts progress.
- Multiple presets can be tracked at once.

Manual checks:

- Settings page loads under Settings.
- Key recorder records, deletes, clears, cancels, and resets sequences.
- Saved sequences persist after reload.
- Frontend effects apply and toggle off.
- Frontend assets are absent when globally disabled.

## Open Decisions

No open product decisions remain for v1. The admin-only easter egg is intentionally deferred.
