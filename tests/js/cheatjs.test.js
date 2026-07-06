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

function pointerEvent(type, target, clientX, clientY) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
  target.dispatchEvent(event);
  return event;
}

function translatedPixels(element) {
  const match = element.style.transform.match(/translate\((-?\d+(?:\.\d+)?)px, (-?\d+(?:\.\d+)?)px\)/);

  return match ? {
    x: Number(match[1]),
    y: Number(match[2]),
  } : null;
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

function setElementRect(element, rect) {
  element.getBoundingClientRect = () => ({
    x: rect.left,
    y: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    toJSON: () => rect,
  });
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

  it('fall down wraps visible text letters with varied animation values', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
    document.body.innerHTML = `
      <main>
        <p class="visible-copy">Hello JS</p>
        <p class="offscreen-copy">Hidden text</p>
        <button type="button">Button text</button>
      </main>
    `;
    setElementRect(document.querySelector('.visible-copy'), {
      top: 10,
      right: 200,
      bottom: 40,
      left: 10,
    });
    setElementRect(document.querySelector('.offscreen-copy'), {
      top: 900,
      right: 200,
      bottom: 930,
      left: 10,
    });
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'fall_down',
        bodyClass: 'cheatjs-fall-down',
        sequence: ['f'],
        onMessage: 'Fall down mode enabled.',
        offMessage: 'Fall down mode disabled.',
      })],
    }, document);

    press('f');

    const visibleLetters = Array.from(document.querySelectorAll('.visible-copy .cheatjs-fall-down-letter'));
    expect(visibleLetters.map((letter) => letter.textContent).join('')).toBe('HelloJS');
    expect(document.querySelector('.visible-copy').textContent).toBe('Hello JS');
    expect(document.querySelectorAll('.offscreen-copy .cheatjs-fall-down-letter')).toHaveLength(0);
    expect(document.querySelector('.cheatjs-stop-button .cheatjs-fall-down-letter')).toBeNull();
    expect(new Set(visibleLetters.map((letter) => letter.style.getPropertyValue('--cheatjs-fall-drop-duration'))).size).toBeGreaterThan(1);
    controller.destroy();
  });

  it('fall down wraps visible non-space characters instead of leaving punctuation behind', () => {
    document.body.innerHTML = '<p id="copy">A! 7?</p>';
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'fall_down',
        bodyClass: 'cheatjs-fall-down',
        sequence: ['f'],
        onMessage: 'Fall down mode enabled.',
        offMessage: 'Fall down mode disabled.',
      })],
    }, document);

    press('f');

    const fallingCharacters = Array.from(document.querySelectorAll('#copy .cheatjs-fall-down-letter'));
    expect(fallingCharacters.map((character) => character.textContent).join('')).toBe('A!7?');
    expect(Array.from(document.querySelector('#copy').childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.nodeValue).join('')).toBe(' ');
    controller.destroy();
  });

  it('fall down gives one random character an extra hold before falling', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    document.body.innerHTML = '<p id="copy">ABCD</p>';
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'fall_down',
        bodyClass: 'cheatjs-fall-down',
        sequence: ['f'],
        onMessage: 'Fall down mode enabled.',
        offMessage: 'Fall down mode disabled.',
      })],
    }, document);

    press('f');

    const fallingCharacters = Array.from(document.querySelectorAll('#copy .cheatjs-fall-down-letter'));
    const heldCharacters = fallingCharacters.filter((character) => (
      character.classList.contains('cheatjs-fall-down-letter--held')
    ));
    expect(heldCharacters).toHaveLength(1);
    expect(heldCharacters[0].textContent).toBe('C');
    expect(heldCharacters[0].style.getPropertyValue('--cheatjs-fall-hold-delay')).toBe('2s');
    expect(fallingCharacters.filter((character) => (
      character.style.getPropertyValue('--cheatjs-fall-hold-delay') === '0s'
    ))).toHaveLength(3);
    controller.destroy();
  });

  it('fall down restores original text when toggled off by sequence', () => {
    document.body.innerHTML = '<p id="copy">Hello <strong>World</strong></p>';
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'fall_down',
        bodyClass: 'cheatjs-fall-down',
        sequence: ['f'],
        onMessage: 'Fall down mode enabled.',
        offMessage: 'Fall down mode disabled.',
      })],
    }, document);

    press('f');
    expect(document.querySelectorAll('.cheatjs-fall-down-letter').length).toBeGreaterThan(0);

    press('f');

    expect(document.querySelectorAll('.cheatjs-fall-down-letter')).toHaveLength(0);
    expect(document.querySelector('#copy').innerHTML).toBe('Hello <strong>World</strong>');
    controller.destroy();
  });

  it('clicking the stop button restores fall down letters', () => {
    document.body.innerHTML = '<p id="copy">Drop me</p>';
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'fall_down',
        bodyClass: 'cheatjs-fall-down',
        sequence: ['f'],
        onMessage: 'Fall down mode enabled.',
        offMessage: 'Fall down mode disabled.',
      })],
    }, document);

    press('f');
    document.querySelector('.cheatjs-stop-button').click();

    expect(document.body.classList.contains('cheatjs-fall-down')).toBe(false);
    expect(document.querySelectorAll('.cheatjs-fall-down-letter')).toHaveLength(0);
    expect(document.querySelector('#copy').textContent).toBe('Drop me');
    controller.destroy();
  });

  it('runaway moves clickable elements away using pointer movement direction', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    });
    document.body.innerHTML = '<button type="button" id="run">Run</button><p id="plain">Plain</p>';
    const button = document.querySelector('#run');
    setElementRect(button, {
      top: 100,
      right: 180,
      bottom: 140,
      left: 100,
    });
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'runaway',
        bodyClass: 'cheatjs-runaway',
        sequence: ['r'],
        onMessage: 'Runaway mode enabled.',
        offMessage: 'Runaway mode disabled.',
      })],
    }, document);

    press('r');
    pointerEvent('pointermove', document, 60, 120);
    pointerEvent('pointermove', document, 95, 120);

    const transform = translatedPixels(button);
    expect(button.classList.contains('cheatjs-runaway-target')).toBe(true);
    expect(transform.x).toBeGreaterThan(0);
    expect(transform.y).toBe(0);
    expect(document.querySelector('#plain').style.transform).toBe('');
    controller.destroy();
  });

  it('runaway clamps movement to keep clickable elements in the viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 220,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 160,
    });
    document.body.innerHTML = '<a href="#" id="run">Run</a>';
    const link = document.querySelector('#run');
    setElementRect(link, {
      top: 60,
      right: 210,
      bottom: 90,
      left: 150,
    });
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'runaway',
        bodyClass: 'cheatjs-runaway',
        sequence: ['r'],
        onMessage: 'Runaway mode enabled.',
        offMessage: 'Runaway mode disabled.',
      })],
    }, document);

    press('r');
    pointerEvent('pointermove', document, 125, 75);
    pointerEvent('pointermove', document, 165, 75);

    const transform = translatedPixels(link);
    expect(transform.x).toBeGreaterThanOrEqual(0);
    expect(transform.x).toBeLessThanOrEqual(10);
    expect(transform.y).toBe(0);
    controller.destroy();
  });

  it('runaway prevents nearby pointer activation and restores moved targets on stop', () => {
    document.body.innerHTML = '<button type="button" id="run">Run</button>';
    const button = document.querySelector('#run');
    setElementRect(button, {
      top: 100,
      right: 180,
      bottom: 140,
      left: 100,
    });
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'runaway',
        bodyClass: 'cheatjs-runaway',
        sequence: ['r'],
        onMessage: 'Runaway mode enabled.',
        offMessage: 'Runaway mode disabled.',
      })],
    }, document);

    press('r');
    pointerEvent('pointermove', document, 60, 120);
    pointerEvent('pointermove', document, 95, 120);

    const pointerDown = pointerEvent('pointerdown', button, 118, 120);
    const click = pointerEvent('click', button, 118, 120);
    expect(pointerDown.defaultPrevented).toBe(true);
    expect(click.defaultPrevented).toBe(true);

    document.querySelector('.cheatjs-stop-button').click();

    expect(document.body.classList.contains('cheatjs-runaway')).toBe(false);
    expect(button.classList.contains('cheatjs-runaway-target')).toBe(false);
    expect(button.style.transform).toBe('');

    const afterStopClick = pointerEvent('click', button, 118, 120);
    expect(afterStopClick.defaultPrevented).toBe(false);
    controller.destroy();
  });

  it('runaway does not keep blocking non-pointer clicks after a stale pointer attempt', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    document.body.innerHTML = '<button type="button" id="run">Run</button>';
    const button = document.querySelector('#run');
    setElementRect(button, {
      top: 100,
      right: 180,
      bottom: 140,
      left: 100,
    });
    loadCheatJS();
    const controller = window.CheatJS.init({
      maxGapMs: 2000,
      presets: [preset({
        id: 'runaway',
        bodyClass: 'cheatjs-runaway',
        sequence: ['r'],
        onMessage: 'Runaway mode enabled.',
        offMessage: 'Runaway mode disabled.',
      })],
    }, document);

    press('r');
    const pointerDown = pointerEvent('pointerdown', button, 118, 120);
    now.mockReturnValue(2501);
    const staleClick = pointerEvent('click', button, 118, 120);

    expect(pointerDown.defaultPrevented).toBe(true);
    expect(staleClick.defaultPrevented).toBe(false);
    now.mockRestore();
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
    expect(css).not.toMatch(/body\.cheatjs-disco\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\)/);
    expect(css).toMatch(/body\.cheatjs-drunk\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-grayscale\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-soft-blur\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\)\s*\{[\s\S]*filter:/);
    expect(css).toMatch(/body\.cheatjs-confidence\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-upside-down\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\),[\s\S]*body\.cheatjs-drunk\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\)\s*\{[\s\S]*transform:/);
    expect(css).toMatch(/filter:\s*var\(--cheatjs-grayscale\)\s*var\(--cheatjs-contrast\)\s*var\(--cheatjs-brightness\)\s*var\(--cheatjs-saturate\)\s*var\(--cheatjs-soft-blur\)\s*var\(--cheatjs-drunk-blur\)\s*var\(--cheatjs-hue\)/);
    expect(css).toMatch(/transform:\s*rotate\(var\(--cheatjs-rotate-base\)\)\s*rotate\(var\(--cheatjs-rotate-wobble\)\)\s*translateX\(var\(--cheatjs-translate-x\)\)\s*scale\(var\(--cheatjs-scale\)\)/);
    expect(css).not.toMatch(/body\.cheatjs-soft-blur\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-drunk\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-grayscale\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-high-contrast/);
    expect(css).not.toMatch(/body\.cheatjs-upside-down\s*\{[^}]*transform:/);
  });

  it('defines disco as a background-only hue animation and disables animation for reduced motion', () => {
    const css = loadEffects();
    const discoKeyframes = css.slice(
      css.indexOf('@keyframes cheatjs-disco'),
      css.indexOf('@keyframes cheatjs-fall-down-shake'),
    );

    expect(css).toMatch(/body\.cheatjs-disco\s*\{[\s\S]*background-color:\s*hsl\(340\s+100%\s+32%\)/);
    expect(css).toMatch(/body\.cheatjs-disco\s*\{[\s\S]*animation:\s*cheatjs-disco\s+1\.2s\s+steps\(1,\s*end\)\s+infinite/);
    expect(css).not.toMatch(/body\.cheatjs-disco\s*\{[^}]*filter:/);
    expect(css).not.toMatch(/body\.cheatjs-disco\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\)/);
    expect(discoKeyframes).toMatch(/@keyframes cheatjs-disco[\s\S]*background-color:\s*hsl\(100\s+100%\s+32%\)/);
    expect(discoKeyframes).toMatch(/@keyframes cheatjs-disco[\s\S]*background-color:\s*hsl\(220\s+100%\s+32%\)/);
    expect(discoKeyframes).not.toMatch(/--cheatjs-hue|--cheatjs-saturate|filter:/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*body\.cheatjs-disco[\s\S]*animation:\s*none/);
  });

  it('defines required visual details for named CSS effects', () => {
    const css = loadEffects();
    const drunkKeyframes = css.slice(
      css.indexOf('@keyframes cheatjs-drunk'),
      css.indexOf('@keyframes cheatjs-disco'),
    );

    expect(css).toMatch(/body\.cheatjs-geocities\s*\{[\s\S]*font-family:\s*"Comic Sans MS"/);
    expect(css).toMatch(/body\.cheatjs-konami::before\s*\{[\s\S]*repeating-linear-gradient[\s\S]*rgba\(0,\s*255,\s*65/);
    expect(css).toMatch(/body\.cheatjs-konami::after\s*\{[\s\S]*content:\s*"KONAMI MODE"/);
    expect(css).toMatch(/body\.cheatjs-drunk\s*\{[\s\S]*--cheatjs-drunk-blur:\s*blur\(/);
    expect(css).toMatch(/@keyframes cheatjs-updown[\s\S]*transform:\s*scaleY\(-1\)/);
    expect(css).toMatch(/body\.cheatjs-upside-down\s*>\s*:not\(\.cheatjs-notice\):not\(\.cheatjs-stop-button\)\s*\{[\s\S]*animation:\s*cheatjs-updown/);
    expect(css).not.toMatch(/body\.cheatjs-upside-down\s*\{[^}]*--cheatjs-rotate-base:/);
    expect(drunkKeyframes).toMatch(/@keyframes cheatjs-drunk[\s\S]*filter:\s*blur\(4px\)[\s\S]*transform:\s*translateX\(2px\)/);
    expect(drunkKeyframes).toMatch(/@keyframes cheatjs-drunk[\s\S]*transform:\s*translateX\(-2px\)/);
    expect(drunkKeyframes).not.toMatch(/--cheatjs-rotate/);
    expect(css).toMatch(/@keyframes cheatjs-disco[\s\S]*background-color:/);
  });

  it('defines fall down letter animation CSS', () => {
    const css = loadEffects();

    expect(css).toMatch(/body\.cheatjs-fall-down\s*\{[\s\S]*overflow-x:\s*hidden/);
    expect(css).toMatch(/\.cheatjs-fall-down-letter\s*\{[\s\S]*display:\s*inline-block[\s\S]*animation:[\s\S]*cheatjs-fall-down-shake[\s\S]*cheatjs-fall-down-drop/);
    expect(css).toMatch(/\.cheatjs-fall-down-letter\s*\{[\s\S]*calc\(var\(--cheatjs-fall-delay\)\s*\+\s*0\.72s\s*\+\s*var\(--cheatjs-fall-hold-delay\)\)/);
    expect(css).toMatch(/@keyframes cheatjs-fall-down-shake[\s\S]*translateX\(-1px\)[\s\S]*translateX\(1px\)/);
    expect(css).toMatch(/@keyframes cheatjs-fall-down-drop[\s\S]*translateY\(110vh\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.cheatjs-fall-down-letter[\s\S]*animation:\s*none/);
  });

  it('styles the stop cheating button as a fixed side control', () => {
    const css = loadEffects();

    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*position:\s*fixed/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*right:\s*0/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*top:\s*50%/);
    expect(css).toMatch(/\.cheatjs-stop-button\s*\{[\s\S]*z-index:\s*1000000/);
  });
});
