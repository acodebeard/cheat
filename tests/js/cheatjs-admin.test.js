import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const scriptPath = path.resolve(process.cwd(), 'assets/js/cheatjs-admin.js');
const cssPath = path.resolve(process.cwd(), 'assets/css/cheatjs-admin.css');

function loadCheatJSAdmin() {
  if (fs.existsSync(scriptPath)) {
    window.eval(fs.readFileSync(scriptPath, 'utf8'));
  }
}

function setReadyState(readyState) {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value: readyState,
  });
}

function adminMarkup() {
  return `
    <article class="cheatjs-preset" data-cheatjs-preset="one" data-default-sequence="ArrowUp,b,7">
      <input type="hidden" class="cheatjs-sequence-input" value="a">
      <div class="cheatjs-key-chips"><span class="cheatjs-key-chip">A</span></div>
      <button type="button" class="cheatjs-record">Record</button>
      <button type="button" class="cheatjs-clear">Clear</button>
      <button type="button" class="cheatjs-reset">Reset default</button>
      <button type="button" class="cheatjs-done">Done</button>
    </article>
    <article class="cheatjs-preset" data-cheatjs-preset="two" data-default-sequence="ArrowDown,c">
      <input type="hidden" class="cheatjs-sequence-input" value="x">
      <div class="cheatjs-key-chips"><span class="cheatjs-key-chip">X</span></div>
      <button type="button" class="cheatjs-record">Record</button>
      <button type="button" class="cheatjs-clear">Clear</button>
      <button type="button" class="cheatjs-reset">Reset default</button>
      <button type="button" class="cheatjs-done">Done</button>
    </article>
  `;
}

function cards() {
  return Array.from(document.querySelectorAll('.cheatjs-preset'));
}

function input(card) {
  return card.querySelector('.cheatjs-sequence-input');
}

function chips(card) {
  return Array.from(card.querySelectorAll('.cheatjs-key-chip')).map((chip) => chip.textContent);
}

function click(card, selector) {
  card.querySelector(selector).click();
}

function press(key) {
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  }));
}

describe('CheatJS admin recorder', () => {
  let controller;

  beforeEach(() => {
    document.body.innerHTML = adminMarkup();
    delete window.CheatJSAdmin;
    delete window.CHEATJS_ADMIN_AUTO_CONTROLLER;
    delete window.CHEATJS_ADMIN_AUTO_PENDING;
    setReadyState('loading');
    controller = null;
  });

  afterEach(() => {
    if (controller) {
      controller.destroy();
    }
  });

  it('clicking Record starts recording for one preset and appends canonical keys', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-record');
    press('A');
    press('ArrowLeft');
    press('3');

    expect(input(first).value).toBe('a,a,ArrowLeft,3');
    expect(chips(first)).toEqual(['A', 'A', '←', '3']);
    expect(first.classList.contains('is-recording')).toBe(true);
  });

  it('Backspace removes the last key while recording', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-record');
    press('A');
    press('b');
    press('Backspace');

    expect(input(first).value).toBe('a,a');
    expect(chips(first)).toEqual(['A', 'A']);
  });

  it('Clear empties the hidden input and chips for that card', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first, second] = cards();

    click(first, '.cheatjs-clear');

    expect(input(first).value).toBe('');
    expect(chips(first)).toEqual([]);
    expect(input(second).value).toBe('x');
    expect(chips(second)).toEqual(['X']);
  });

  it('Reset default restores the default sequence', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-clear');
    click(first, '.cheatjs-reset');

    expect(input(first).value).toBe('ArrowUp,b,7');
    expect(chips(first)).toEqual(['↑', 'B', '7']);
  });

  it('Escape cancels recording and restores the previous sequence', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-record');
    press('A');
    press('b');
    press('Escape');

    expect(input(first).value).toBe('a');
    expect(chips(first)).toEqual(['A']);
    expect(first.classList.contains('is-recording')).toBe(false);
  });

  it('clicking Record again while recording preserves the original Escape checkpoint', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-record');
    press('b');
    click(first, '.cheatjs-record');
    press('c');
    press('Escape');

    expect(input(first).value).toBe('a');
    expect(chips(first)).toEqual(['A']);
    expect(first.classList.contains('is-recording')).toBe(false);
  });

  it('Done stops recording and preserves the current sequence', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-record');
    press('b');
    click(first, '.cheatjs-done');
    press('c');

    expect(input(first).value).toBe('a,b');
    expect(chips(first)).toEqual(['A', 'B']);
    expect(first.classList.contains('is-recording')).toBe(false);
  });

  it('recording one preset does not mutate another preset', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first, second] = cards();

    click(first, '.cheatjs-record');
    press('b');

    expect(input(first).value).toBe('a,b');
    expect(input(second).value).toBe('x');
    expect(chips(second)).toEqual(['X']);
  });

  it('unsupported keys are ignored', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-record');
    press('Enter');
    press('Shift');
    press('ab');

    expect(input(first).value).toBe('a');
    expect(chips(first)).toEqual(['A']);
  });

  it('keyLabel maps arrow keys and letters to readable labels', () => {
    loadCheatJSAdmin();

    expect(window.CheatJSAdmin.keyLabel('ArrowUp')).toBe('↑');
    expect(window.CheatJSAdmin.keyLabel('ArrowDown')).toBe('↓');
    expect(window.CheatJSAdmin.keyLabel('ArrowLeft')).toBe('←');
    expect(window.CheatJSAdmin.keyLabel('ArrowRight')).toBe('→');
    expect(window.CheatJSAdmin.keyLabel('a')).toBe('A');
    expect(window.CheatJSAdmin.keyLabel('Z')).toBe('Z');
    expect(window.CheatJSAdmin.keyLabel('7')).toBe('7');
  });

  it('init returns a controller with destroy that removes listeners', () => {
    loadCheatJSAdmin();
    controller = window.CheatJSAdmin.init(document);
    const [first] = cards();

    click(first, '.cheatjs-record');
    controller.destroy();
    controller = null;
    press('b');

    expect(input(first).value).toBe('a');
    expect(first.classList.contains('is-recording')).toBe(false);
  });

  it('auto-initializes when DOMContentLoaded fires', () => {
    loadCheatJSAdmin();
    const [first] = cards();

    click(first, '.cheatjs-record');
    press('b');
    expect(input(first).value).toBe('a');

    document.dispatchEvent(new Event('DOMContentLoaded'));
    click(first, '.cheatjs-record');
    press('b');

    expect(input(first).value).toBe('a,b');
    window.CHEATJS_ADMIN_AUTO_CONTROLLER.destroy();
    window.CHEATJS_ADMIN_AUTO_CONTROLLER = null;
  });

  it('shows the Done button only while a preset is recording', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toMatch(/\.cheatjs-done\s*{[^}]*display:\s*none;/s);
    expect(css).toMatch(/\.cheatjs-preset\.is-recording\s+\.cheatjs-done\s*{[^}]*display:\s*inline-block;/s);
  });
});
