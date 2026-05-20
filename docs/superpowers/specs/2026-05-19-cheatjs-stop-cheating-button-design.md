# CheatJS Stop Cheating Button Design

## Context

CheatJS toggles built-in easter egg effects by adding and removing preset-specific classes on `document.body`. Users can currently turn a cheat off only by entering the same keyboard sequence again. Some effects can make a page harder to use, so the frontend needs an obvious escape hatch.

## Goal

Add a small fixed viewport control labeled `Stop cheating` that appears only while at least one cheat is active. Clicking it turns off all active cheat effects and removes the control.

## User Experience

- No button is rendered on normal page load.
- When any configured cheat sequence activates a preset, CheatJS shows a fixed side button labeled `Stop cheating`.
- If additional cheats are activated while the button is visible, the same button stays visible.
- Clicking the button removes every active preset body class, resets CheatJS active state, shows one random joke notice, and removes the button.
- If the user toggles the last active cheat off by re-entering its sequence, the button disappears.

The stop notice should match the plugin's joke tone. The initial message pool will be:

- `good. cheating is wrong.`
- `it's stopped, but i'm telling on you.`
- `fine. your secret is safe-ish.`
- `cheating canceled. character restored.`
- `the evidence has been hidden poorly.`

## Frontend Architecture

The change stays in `assets/js/cheatjs.js` and `assets/css/cheatjs-effects.css`.

`createDetector()` will maintain a set of active preset body classes. `togglePreset()` will update that set whenever a sequence turns a preset on or off. A small control helper will create, update, and remove the button based on whether the active set is empty.

The button click handler will:

1. Remove every active preset body class from `document.body`.
2. Clear the active set.
3. Remove the button.
4. Pick one stop message at random and show it as a safe text notice.

The stop message pool will be a small hardcoded frontend array. It will not be configurable in the admin for this version.

`destroy()` will remove the keydown listener, clear sequence progress, remove the button, and remove active body classes known to this detector. This keeps tests and repeated initialization clean.

## Styling

The button will be fixed to the side of the viewport with a high z-index, compact padding, readable contrast, and a stable font. It will use the class `cheatjs-stop-button`.

Existing transform and filter effect selectors will exclude both `.cheatjs-notice` and `.cheatjs-stop-button` so the control remains usable even when effects are active.

## Accessibility

The control will be a native `<button type="button">`, so it is keyboard-focusable and announces as a button. Its visible text is the requested label, `Stop cheating`; no icon-only affordance is needed.

## Testing

JavaScript tests will cover:

- The button is absent before any cheat activates.
- Activating a cheat creates one button labeled `Stop cheating`.
- Clicking the button removes active body classes and removes the button.
- Clicking the button shows one message from the joke stop-message pool.
- Multiple active cheats are all cleared by one click.
- Re-entering the last active cheat sequence removes the button.
- `destroy()` removes the button and active classes.

CSS tests will cover:

- `.cheatjs-stop-button` is excluded from aggregate transform and filter selectors.
- The button has fixed positioning and a high z-index.
