import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const scriptPath = path.resolve(process.cwd(), 'assets/js/cheatjs.js');

function loadCheatJS() {
  if (fs.existsSync(scriptPath)) {
    window.eval(fs.readFileSync(scriptPath, 'utf8'));
  }
}

function press(key, target = document.body) {
  target.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
  }));
}

function preset(overrides = {}) {
  return {
    id: 'konami',
    bodyClass: 'cheatjs-konami',
    sequence: ['ArrowUp', 'ArrowDown', 'b', 'a'],
    onMessage: 'Konami <strong>enabled</strong>.',
    offMessage: 'Konami disabled.',
    ...overrides,
  };
}

describe('CheatJS frontend detector', () => {
  beforeEach(() => {
    vi.useRealTimers();
    document.body.className = '';
    document.body.innerHTML = '';
    delete window.CheatJS;
    delete window.CHEATJS_CONFIG;
    loadCheatJS();
  });

  it('toggles a body class on after a full sequence', () => {
    const controller = window.CheatJS.init({ maxGapMs: 2000, presets: [preset()] }, document);

    press('ArrowUp');
    press('ArrowDown');
    press('b');
    press('a');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(true);
    controller.destroy();
  });

  it('toggles a body class off after repeating a full sequence', () => {
    const controller = window.CheatJS.init({ maxGapMs: 2000, presets: [preset()] }, document);

    ['ArrowUp', 'ArrowDown', 'b', 'a', 'ArrowUp', 'ArrowDown', 'b', 'a'].forEach((key) => press(key));

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    controller.destroy();
  });

  it('ignores keydown events inside typing targets', () => {
    document.body.innerHTML = '<input type="text">';
    const input = document.querySelector('input');
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a', input);

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    controller.destroy();
  });

  it('resets sequence progress after a wrong key', () => {
    const controller = window.CheatJS.init({ maxGapMs: 2000, presets: [preset()] }, document);

    press('ArrowUp');
    press('x');
    press('ArrowDown');
    press('b');
    press('a');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    controller.destroy();
  });

  it('restarts progress when a wrong key matches the first key', () => {
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a', 'b', 'c'] })],
    }, document);

    press('a');
    press('a');
    press('b');
    press('c');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(true);
    controller.destroy();
  });

  it('resets progress after maxGapMs elapses', () => {
    vi.useFakeTimers();
    const controller = window.CheatJS.init({ maxGapMs: 1000, presets: [preset()] }, document);

    press('ArrowUp');
    vi.advanceTimersByTime(1001);
    press('ArrowDown');
    press('b');
    press('a');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    controller.destroy();
  });

  it('tracks two presets independently at the same time', () => {
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [
        preset({ bodyClass: 'cheatjs-one', sequence: ['a', 'b'] }),
        preset({ id: 'two', bodyClass: 'cheatjs-two', sequence: ['a', 'c'] }),
      ],
    }, document);

    press('a');
    press('c');
    expect(document.body.classList.contains('cheatjs-two')).toBe(true);
    expect(document.body.classList.contains('cheatjs-one')).toBe(false);

    press('a');
    press('b');
    expect(document.body.classList.contains('cheatjs-one')).toBe(true);
    controller.destroy();
  });

  it('normalizes supported keys and rejects unsupported keys', () => {
    expect(window.CheatJS.normalizeKey('A')).toBe('a');
    expect(window.CheatJS.normalizeKey('z')).toBe('z');
    expect(window.CheatJS.normalizeKey('ArrowLeft')).toBe('ArrowLeft');
    expect(window.CheatJS.normalizeKey('7')).toBe('7');
    expect(window.CheatJS.normalizeKey('Enter')).toBe(null);
    expect(window.CheatJS.normalizeKey('ab')).toBe(null);
  });

  it('destroy removes the keydown listener', () => {
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    controller.destroy();
    press('a');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
  });

  it('renders notices with textContent instead of HTML', () => {
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a');

    const notice = document.querySelector('.cheatjs-notice');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toBe('Konami <strong>enabled</strong>.');
    expect(notice.innerHTML).toBe('Konami &lt;strong&gt;enabled&lt;/strong&gt;.');
    controller.destroy();
  });
});
