# cheat

A tiny, dependency-free JavaScript cheat-code detector.

It listens for key sequences (like old video game cheat codes) and triggers a callback when a sequence is matched. Built as a fun side project + a place to practice clean GitHub habits.

## Features

- Multiple cheat codes at once
- Easy enable/disable per cheat (no edits inside the main script)
- Ignores typing in inputs/textareas/selects/contenteditable
- Optional timing window between key presses
- Pure vanilla JS (no build step)

## Files

- `cheat.js` — main cheat-code engine
- `cheat.config.js` — enable/disable cheats + global settings
- `cheat.data.js` — Cheat rules
- `index.html` — optional demo page
