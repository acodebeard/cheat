import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const scriptPath = path.resolve(process.cwd(), 'assets/js/cheatjs.js');
const effectsPath = path.resolve(process.cwd(), 'assets/css/cheatjs-effects.css');
const stopMessages = [
  'good. cheating is wrong.',
  "it's stopped, but i'm telling on you.",
  'fine. your secret is safe-ish.',
  'cheating canceled. character restored.',
  'the evidence has been hidden poorly.',
];

function loadCheatJS() {
  if (fs.existsSync(scriptPath)) {
    window.eval(fs.readFileSync(scriptPath, 'utf8'));
  }
}

function loadEffects() {
  const style = document.createElement('style');
  style.textContent = fs.readFileSync(effectsPath, 'utf8');
  document.head.appendChild(style);
  return style.textContent;
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
    document.head.innerHTML = '';
    delete window.CheatJS;
    delete window.CHEATJS_CONFIG;
    delete window.CHEATJS_AUTO_CONTROLLER;
    delete window.CHEATJS_AUTO_PENDING;
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });
  });

  it('toggles a body class on after a full sequence', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({ maxGapMs: 2000, presets: [preset()] }, document);

    press('ArrowUp');
    press('ArrowDown');
    press('b');
    press('a');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(true);
    controller.destroy();
  });

  it('toggles a body class off after repeating a full sequence', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({ maxGapMs: 2000, presets: [preset()] }, document);

    ['ArrowUp', 'ArrowDown', 'b', 'a', 'ArrowUp', 'ArrowDown', 'b', 'a'].forEach((key) => press(key));

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
    controller.destroy();
  });

  it('ignores keydown events inside typing targets', () => {
    loadCheatJS();
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
    loadCheatJS();
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
    loadCheatJS();
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
    loadCheatJS();
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
    loadCheatJS();
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
    loadCheatJS();
    expect(window.CheatJS.normalizeKey('A')).toBe('a');
    expect(window.CheatJS.normalizeKey('z')).toBe('z');
    expect(window.CheatJS.normalizeKey('ArrowLeft')).toBe('ArrowLeft');
    expect(window.CheatJS.normalizeKey('7')).toBe('7');
    expect(window.CheatJS.normalizeKey('Enter')).toBe(null);
    expect(window.CheatJS.normalizeKey('ab')).toBe(null);
  });

  it('destroy removes the keydown listener', () => {
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    controller.destroy();
    press('a');

    expect(document.body.classList.contains('cheatjs-konami')).toBe(false);
  });

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

    const notices = document.querySelectorAll('.cheatjs-notice');
    expect(stopMessages).toContain(notices[notices.length - 1].textContent);
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

  it('renders notices with textContent instead of HTML', () => {
    loadCheatJS();
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

  it('self-removes notices after the display timeout', () => {
    vi.useFakeTimers();
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({ sequence: ['a'] })],
    }, document);

    press('a');
    expect(document.querySelector('.cheatjs-notice')).not.toBeNull();

    vi.advanceTimersByTime(2400);

    expect(document.querySelector('.cheatjs-notice')).toBeNull();
    controller.destroy();
  });

  it('auto-initializes from CHEATJS_CONFIG when DOMContentLoaded fires', () => {
    delete window.CheatJS;
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
    });
    window.CHEATJS_CONFIG = {
      maxGapMs: 2000,
      presets: [preset({ bodyClass: 'cheatjs-dom-ready', sequence: ['a'] })],
    };

    loadCheatJS();
    press('a');
    expect(document.body.classList.contains('cheatjs-dom-ready')).toBe(false);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    press('a');

    expect(document.body.classList.contains('cheatjs-dom-ready')).toBe(true);
  });

  it('auto-initializes from CHEATJS_CONFIG when the document is already ready', () => {
    delete window.CheatJS;
    window.CHEATJS_CONFIG = {
      maxGapMs: 2000,
      presets: [preset({ bodyClass: 'cheatjs-already-ready', sequence: ['a'] })],
    };
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });

    loadCheatJS();
    press('a');

    expect(document.body.classList.contains('cheatjs-already-ready')).toBe(true);
  });

  it('auto-initializes only once when the script is evaluated repeatedly', () => {
    window.CHEATJS_CONFIG = {
      maxGapMs: 2000,
      presets: [preset({ bodyClass: 'cheatjs-single-auto-bind', sequence: ['a'] })],
    };

    loadCheatJS();
    loadCheatJS();
    press('a');

    expect(document.body.classList.contains('cheatjs-single-auto-bind')).toBe(true);
  });

  it('registers one pending DOMContentLoaded listener when evaluated repeatedly while loading', () => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
    });
    window.CHEATJS_CONFIG = {
      maxGapMs: 2000,
      presets: [preset({ bodyClass: 'cheatjs-single-pending-bind', sequence: ['a'] })],
    };
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    loadCheatJS();
    loadCheatJS();

    const domReadyListeners = addEventListenerSpy.mock.calls.filter((call) => call[0] === 'DOMContentLoaded');
    expect(domReadyListeners).toHaveLength(1);

    press('a');
    expect(document.body.classList.contains('cheatjs-single-pending-bind')).toBe(false);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    press('a');

    expect(document.body.classList.contains('cheatjs-single-pending-bind')).toBe(true);
  });

  it('defines composable aggregate CSS for filter and transform effects', () => {
    const css = loadEffects();

    expect(css).not.toMatch(/body\[class\*="cheatjs-"\]\s*>\s*:not\(\.cheatjs-notice\)/);
    expect(css).not.toMatch(/body\[class\*="cheatjs-"\]\s*>\s*:not\(\.cheatjs-stop-button\)/);
    expect(css).toContain(':not(.cheatjs-notice):not(.cheatjs-stop-button)');
    expect(css).toMatch(/body\.cheatjs-disco\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-drunk\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-grayscale\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-high-contrast\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-soft-blur\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\)\s*\{[\s\S]*filter:/);
    expect(css).toMatch(/body\.cheatjs-confidence\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-upside-down\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-drunk\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\)\s*\{[\s\S]*transform:/);
    expect(css).toMatch(/filter:\s*var\(--cheatjs-grayscale\)\s*var\(--cheatjs-contrast\)\s*var\(--cheatjs-brightness\)\s*var\(--cheatjs-saturate\)\s*var\(--cheatjs-soft-blur\)\s*var\(--cheatjs-drunk-blur\)\s*var\(--cheatjs-hue\)/);
    expect(css).toMatch(/transform:\s*rotate\(var\(--cheatjs-rotate-base\)\)\s*rotate\(var\(--cheatjs-rotate-wobble\)\)\s*translateX\(var\(--cheatjs-translate-x\)\)\s*scale\(var\(--cheatjs-scale\)\)/);
    expect(css).not.toMatch(/body\.cheatjs-soft-blur\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-drunk\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-grayscale\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-high-contrast\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-upside-down\s*\{[^}]*transform:/);
  });

  it('defines visibly distinct disco hue keyframes and disables animation for reduced motion', () => {
    const css = loadEffects();

    expect(css).toMatch(/@keyframes cheatjs-disco[\s\S]*--cheatjs-hue:\s*hue-rotate\(120deg\)/);
    expect(css).toMatch(/@keyframes cheatjs-disco[\s\S]*--cheatjs-hue:\s*hue-rotate\(240deg\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*body\.cheatjs-disco[\s\S]*animation:\s*none/);
  });

  it('defines required visual details for named CSS effects', () => {
    const css = loadEffects();

    expect(css).toMatch(/body\.cheatjs-geocities\s*\{[\s\S]*font-family:\s*"Comic Sans MS"/);
    expect(css).toMatch(/body\.cheatjs-konami::before\s*\{[\s\S]*repeating-linear-gradient[\s\S]*rgba\(0,\s*255,\s*65/);
    expect(css).toMatch(/body\.cheatjs-konami::after\s*\{[\s\S]*content:\s*"KONAMI MODE"/);
    expect(css).toMatch(/body\.cheatjs-drunk\s*\{[\s\S]*--cheatjs-drunk-blur:\s*blur\(/);
    expect(css).toMatch(/body\.cheatjs-upside-down\s*\{[\s\S]*--cheatjs-rotate-base:\s*180deg/);
    expect(css).toMatch(/@keyframes cheatjs-drunk[\s\S]*--cheatjs-rotate-wobble:\s*-1deg[\s\S]*--cheatjs-rotate-wobble:\s*1deg/);
    expect(css).not.toMatch(/@keyframes cheatjs-drunk[\s\S]*--cheatjs-rotate:/);
    expect(css).toMatch(/@keyframes cheatjs-disco[\s\S]*--cheatjs-saturate:\s*saturate\(1\.[0-9]+\)/);
    expect(css).toMatch(/body\.cheatjs-high-contrast\s*\{[\s\S]*--cheatjs-contrast:\s*contrast\(1\.5\)[\s\S]*--cheatjs-brightness:\s*brightness\(1\.[0-9]+\)/);
  });

  it('styles the stop cheating button as a fixed side control', () => {
    const css = loadEffects();

    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*position:\s*fixed/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*right:\s*0/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*top:\s*50%/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*z-index:\s*1000000/);
  });
});
