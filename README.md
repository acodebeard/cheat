# CheatJS

CheatJS is a WordPress plugin for adding playful keyboard easter eggs to a site. It lets administrators enable built-in visual effects, choose which presets are active, and customize each preset's keyboard sequence from the WordPress admin.

Frontend assets are loaded only when CheatJS is globally enabled and at least one preset is enabled.

## Installation

Place this repository in your WordPress plugins directory:

```bash
wp-content/plugins/cheatjs
```

Then activate **CheatJS** from **Plugins** in the WordPress admin.

## Usage

Open **Settings -> CheatJS** in the WordPress admin.

From the settings page you can:

- Enable or disable CheatJS globally.
- Enable or disable individual presets.
- Record a custom key sequence for each preset.
- Clear a sequence or reset it to the preset default.

The key recorder supports recording keys directly in the browser. Use **Backspace** to remove the last recorded key, **Clear** to empty the current sequence, **Reset default** to restore the built-in sequence, **Escape** to cancel recording, and **Done** to finish.

## Built-in Presets

The initial WordPress plugin ships with these presets:

- `confidence`: adds an encouraging boost.
- `geocities`: applies a retro web effect.
- `konami`: unlocks the classic cheat code effect.
- `drunk`: adds a woozy page effect.
- `disco`: adds a colorful party effect.
- `upside_down`: turns the page upside down.
- `grayscale`: removes color from the page.
- `high_contrast`: increases contrast across the page.
- `soft_blur`: applies a soft blur effect.

## Developer Presets

Developers can register or modify presets with the `cheatjs_presets` filter:

```php
add_filter( 'cheatjs_presets', function ( array $presets ): array {
    $presets['matrix'] = [
        'name'             => 'Matrix',
        'description'      => 'Toggles a custom Matrix body class.',
        'effect_label'     => 'Matrix mode',
        'body_class'       => 'cheatjs-matrix',
        'default_enabled'  => false,
        'default_sequence' => [ 'm', 'a', 't', 'r', 'i', 'x' ],
        'on_message'       => 'Matrix mode enabled.',
        'off_message'      => 'Matrix mode disabled.',
    ];

    return $presets;
} );
```

Filtered presets must include all required fields and pass CheatJS validation before they are saved or sent to the browser.

Custom developer presets should provide their own CSS for the configured `body_class` when they need a visual effect.

## Safety Note

CheatJS does not allow custom JavaScript or CSS in the admin. Effects are built into the plugin so administrators can configure easter eggs without adding executable code or arbitrary styles.

## Development

Run PHP tests:

```bash
composer test:php
```

Run JavaScript tests:

```bash
npm run test:js
```

Run the complete automated suite:

```bash
composer test:php && npm run test:js
```
