# CheatJS Stop Cheating Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed `Stop cheating` button that appears only while cheats are active and clears every active cheat with a random joke notice.

**Architecture:** Keep the feature in the frontend detector. `assets/js/cheatjs.js` will track active body classes, render one native button while active classes exist, and remove known active classes when the button is clicked or the controller is destroyed. `assets/css/cheatjs-effects.css` will style the button and keep it excluded from visual effects.

**Tech Stack:** Vanilla JavaScript, CSS, Vitest/jsdom, existing CheatJS frontend test helpers.

---

## File Structure

- Modify `tests/js/cheatjs.test.js`: add Vitest coverage for button visibility, click behavior, random stop messages, multi-cheat clearing, sequence-off hiding, destroy cleanup, and CSS selectors.
- Modify `assets/js/cheatjs.js`: add the stop-message pool, active-class tracking, button render/remove helpers, random message selection, stop handler, and cleanup in `destroy()`.
- Modify `assets/css/cheatjs-effects.css`: exclude `.cheatjs-stop-button` from effect transforms/filters and style the fixed side button.

---

### Task 1: Add Failing JavaScript Tests For Stop Control Behavior

**Files:**
- Modify: `tests/js/cheatjs.test.js`

- [ ] **Step 1: Add stop-control behavior tests before the CSS tests**

Insert these tests inside `describe('CheatJS frontend detector', () => { ... })`, after `it('destroy removes the keydown listener', ...)` and before the existing notice tests:

```js
  it('does not render the stop button before a cheat activates', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    expect(document.querySelector('.cheatjs-stop-button')).toBeNull();
    controller.destroy();
  });

  it('renders one stop button labeled stop cheating after a cheat activates', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a');

    const buttons = document.querySelectorAll('.cheatjs-stop-button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].tagName).toBe('BUTTON');
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].textContent).toBe('Stop cheating');
    controller.destroy();
  });

  it('clicking the stop button removes active cheats and removes the button', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a');
    document.querySelector('.cheatjs-stop-button').click();

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    expect(document.querySelector('.cheatjs-stop-button')).toBeNull();
    controller.destroy();
  });

  it('clicking the stop button clears multiple active cheats', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [
        preset({ bodyClass: 'cheatjs-one', sequence: ['a'] }),
        preset({ id: 'two', bodyClass: 'cheatjs-two', sequence: ['b'] }),
      ],
    }, document);

    press('a');
    press('b');
    document.querySelector('.cheatjs-stop-button').click();

    expect(document.body.classList.contains('cheatjs-one')).toBe(false);
    expect(document.body.classList.contains('cheatjs-two')).toBe(false);
    expect(document.querySelector('.cheatjs-stop-button')).toBeNull();
    controller.destroy();
  });

  it('clicking the stop button shows a joke stop notice from the message pool', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a');
    document.querySelector('.cheatjs-stop-button').click();

    expect(window.CheatJS.stopMessages).toContain(document.querySelector('.cheatjs-notice').textContent);
    controller.destroy();
  });

  it('hides the stop button when the last active cheat is toggled off by sequence', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a');
    expect(document.querySelector('.cheatjs-stop-button')).not.toBeNull();

    press('a');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    expect(document.querySelector('.cheatjs-stop-button')).toBeNull();
    controller.destroy();
  });

  it('destroy removes active cheat classes and the stop button', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a');
    controller.destroy();

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    expect(document.querySelector('.cheatjs-stop-button')).toBeNull();
  });
```

- [ ] **Step 2: Run the targeted JS test file and verify it fails**

Run:

```bash
npm run test:js -- tests/js/cheatjs.test.js
```

Expected: the new stop-button tests fail because `.cheatjs-stop-button` and `window.CheatJS.stopMessages` do not exist yet.

- [ ] **Step 3: Leave the failing tests uncommitted**

Do not commit failing tests. Leave them unstaged until the implementation in Task 2 makes them pass.

---

### Task 2: Implement Stop Control In The Frontend Detector

**Files:**
- Modify: `assets/js/cheatjs.js`
- Test: `tests/js/cheatjs.test.js`

- [ ] **Step 1: Add constants near the existing frontend constants**

In `assets/js/cheatjs.js`, add these constants after `NOTICE_TIMEOUT_MS`:

```js
  var STOP_BUTTON_CLASS = 'cheatjs-stop-button';
  var STOP_BUTTON_TEXT = 'Stop cheating';
  var STOP_MESSAGES = [
    'good. cheating is wrong.',
    "it's stopped, but i'm telling on you.",
    'fine. your secret is safe-ish.',
    'cheating canceled. character restored.',
    'the evidence has been hidden poorly.',
  ];
```

- [ ] **Step 2: Add active-state and button helpers inside `createDetector()`**

Inside `createDetector()`, after the `states` variable, add:

```js
    var activeBodyClasses = [];
    var stopButton = null;

    function hasActiveBodyClass(bodyClass) {
      return activeBodyClasses.indexOf(bodyClass) !== -1;
    }

    function addActiveBodyClass(bodyClass) {
      if (!hasActiveBodyClass(bodyClass)) {
        activeBodyClasses.push(bodyClass);
      }
    }

    function removeActiveBodyClass(bodyClass) {
      activeBodyClasses = activeBodyClasses.filter(function (activeBodyClass) {
        return activeBodyClass !== bodyClass;
      });
    }

    function getStopMessage() {
      return STOP_MESSAGES[Math.floor(Math.random() * STOP_MESSAGES.length)];
    }

    function removeStopButton() {
      if (stopButton && stopButton.parentNode) {
        stopButton.parentNode.removeChild(stopButton);
      }

      stopButton = null;
    }

    function clearActiveCheats() {
      activeBodyClasses.forEach(function (bodyClass) {
        doc.body.classList.remove(bodyClass);
      });
      activeBodyClasses = [];
      removeStopButton();
    }

    function stopCheating() {
      clearActiveCheats();
      showNotice(doc, getStopMessage());
    }

    function renderStopButton() {
      if (!doc.body) {
        return;
      }

      if (activeBodyClasses.length === 0) {
        removeStopButton();
        return;
      }

      if (stopButton && stopButton.parentNode) {
        return;
      }

      stopButton = doc.createElement('button');
      stopButton.type = 'button';
      stopButton.className = STOP_BUTTON_CLASS;
      stopButton.textContent = STOP_BUTTON_TEXT;
      stopButton.addEventListener('click', stopCheating);
      doc.body.appendChild(stopButton);
    }
```

- [ ] **Step 3: Update `togglePreset()` to track active classes**

Replace the existing `togglePreset()` body:

```js
      var enabled = doc.body.classList.toggle(preset.bodyClass);
      showNotice(doc, enabled ? preset.onMessage : preset.offMessage);
```

with:

```js
      var enabled = doc.body.classList.toggle(preset.bodyClass);

      if (enabled) {
        addActiveBodyClass(preset.bodyClass);
      } else {
        removeActiveBodyClass(preset.bodyClass);
      }

      renderStopButton();
      showNotice(doc, enabled ? preset.onMessage : preset.offMessage);
```

- [ ] **Step 4: Update `destroy()` to clear active cheats and remove the button**

In the detector object's `destroy()` method, after the loop that resets state progress, add:

```js
        clearActiveCheats();
```

- [ ] **Step 5: Export stop messages for tests**

At the bottom, update `window.CheatJS = { ... }` to include:

```js
    stopMessages: STOP_MESSAGES.slice(),
```

- [ ] **Step 6: Run the targeted JS test file and verify it passes**

Run:

```bash
npm run test:js -- tests/js/cheatjs.test.js
```

Expected: all tests in `tests/js/cheatjs.test.js` pass.

---

### Task 3: Add CSS Exclusions And Stop Button Styling

**Files:**
- Modify: `tests/js/cheatjs.test.js`
- Modify: `assets/css/cheatjs-effects.css`

- [ ] **Step 1: Update CSS tests to require stop-button exclusions and styling**

In `tests/js/cheatjs.test.js`, update the aggregate CSS test expectations from:

```js
    expect(css).not.toMatch(/body\[class\*="cheatjs-"\]\s*>\s*:not\(\.cheatjs-notice\)/);
```

to:

```js
    expect(css).not.toMatch(/body\[class\*="cheatjs-"\]\s*>\s*:not\(\.cheatjs-notice\)/);
    expect(css).not.toMatch(/body\[class\*="cheatjs-"\]\s*>\s*:not\(\.cheatjs-stop-button\)/);
    expect(css).toContain(':not(.cheatjs-notice):not(.cheatjs-stop-button)');
```

At the end of the CSS tests, add:

```js
  it('styles the stop cheating button as a fixed side control', () => {
    const css = loadEffects();

    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*position:\s*fixed/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*right:\s*0/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*top:\s*50%/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*z-index:\s*1000000/);
  });
```

- [ ] **Step 2: Run the targeted JS test file and verify CSS tests fail**

Run:

```bash
npm run test:js -- tests/js/cheatjs.test.js
```

Expected: CSS tests fail because `.cheatjs-stop-button` is not excluded or styled yet.

- [ ] **Step 3: Update effect aggregate selectors**

In `assets/css/cheatjs-effects.css`, replace every aggregate target selector form:

```css
> :not(.cheatjs-notice)
```

with:

```css
> :not(.cheatjs-notice):not(.cheatjs-stop-button)
```

Do this only for the aggregate filter and transform selector blocks near the top of the file.

- [ ] **Step 4: Add stop button styling after `.cheatjs-notice`**

Add this block after the existing `.cheatjs-notice` rule:

```css
.cheatjs-stop-button {
  position: fixed;
  top: 50%;
  right: 0;
  z-index: 1000000;
  transform: translateY(-50%);
  padding: 0.55rem 0.7rem;
  border: 2px solid #111;
  border-right: 0;
  border-radius: 6px 0 0 6px;
  background: #fff;
  color: #111;
  box-shadow: 0 0.35rem 1rem rgba(0, 0, 0, 0.22);
  cursor: pointer;
  font: 700 0.8125rem/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.cheatjs-stop-button:hover,
.cheatjs-stop-button:focus {
  background: #111;
  color: #fff;
}

.cheatjs-stop-button:focus-visible {
  outline: 3px solid #ffcc00;
  outline-offset: 2px;
}
```

- [ ] **Step 5: Run the targeted JS test file and verify it passes**

Run:

```bash
npm run test:js -- tests/js/cheatjs.test.js
```

Expected: all tests in `tests/js/cheatjs.test.js` pass.

- [ ] **Step 6: Commit frontend implementation**

Run:

```bash
git add assets/js/cheatjs.js assets/css/cheatjs-effects.css tests/js/cheatjs.test.js
git commit -m "feat: add stop cheating control"
```

---

### Task 4: Full Verification And Sandbox Smoke Test

**Files:**
- Read: `assets/js/cheatjs.js`
- Read: `assets/css/cheatjs-effects.css`
- Read: `tests/js/cheatjs.test.js`

- [ ] **Step 1: Run PHP tests**

Run:

```bash
composer test:php
```

Expected: PHPUnit exits 0 with all tests passing.

- [ ] **Step 2: Run JavaScript tests**

Run:

```bash
npm run test:js
```

Expected: Vitest exits 0 with all test files passing.

- [ ] **Step 3: Run PHP syntax checks**

Run:

```bash
git ls-files '*.php' | xargs -r -n1 php -l
```

Expected: every tracked PHP file reports no syntax errors.

- [ ] **Step 4: Run whitespace check**

Run:

```bash
git diff --check HEAD~1..HEAD
```

Expected: no output and exit 0.

- [ ] **Step 5: Smoke test the sandbox frontend asset load**

Run:

```bash
curl -s http://localhost/sandbox/ | rg -n "CHEATJS_CONFIG|cheatjs\\.js|cheatjs-effects\\.css"
```

Expected: output includes `CHEATJS_CONFIG`, `cheatjs.js`, and `cheatjs-effects.css`.

- [ ] **Step 6: Confirm working tree state**

Run:

```bash
git status --short --branch
```

Expected: branch is clean after committed implementation.
