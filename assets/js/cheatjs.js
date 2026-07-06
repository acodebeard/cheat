(function (window) {
  'use strict';

  const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const DEFAULT_MAX_GAP_MS = 777;
  const NOTICE_TIMEOUT_MS = 2400;
  const STOP_BUTTON_CLASS = 'cheatjs-stop-button';
  const STOP_BUTTON_TEXT = 'Stop cheating';
  const FALL_DOWN_BODY_CLASS = 'cheatjs-fall-down';
  const FALL_DOWN_LETTER_CLASS = 'cheatjs-fall-down-letter';
  const FALL_DOWN_HELD_LETTER_CLASS = 'cheatjs-fall-down-letter--held';
  const FALL_DOWN_HELD_DELAY = '2s';
  const RUNAWAY_BODY_CLASS = 'cheatjs-runaway';
  const RUNAWAY_TARGET_CLASS = 'cheatjs-runaway-target';
  const RUNAWAY_TARGET_SELECTOR = 'a[href],button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],summary';
  const RUNAWAY_DISTANCE = 26;
  const RUNAWAY_STEP = 36;
  const FALL_DOWN_EXCLUDED_SELECTOR = [
    '.cheatjs-notice',
    '.cheatjs-stop-button',
    '.cheatjs-fall-down-letter',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    'button',
    'canvas',
    'input',
    'noscript',
    'option',
    'script',
    'select',
    'style',
    'svg',
    'textarea',
  ].join(',');
  const STOP_MESSAGES = [
    'good. cheating is wrong.',
    "it's stopped, but i'm telling on you.",
    'fine. your secret is safe-ish.',
    'cheating canceled. character restored.',
    'the evidence has been hidden poorly.',
  ];
  const AUTO_CONTROLLER_KEY = 'CHEATJS_AUTO_CONTROLLER';
  const AUTO_PENDING_KEY = 'CHEATJS_AUTO_PENDING';

  function normalizeKey(key) {
    if (typeof key !== 'string') {
      return null;
    }

    if (ARROW_KEYS.indexOf(key) !== -1) {
      return key;
    }

    if (/^[a-z]$/i.test(key)) {
      return key.toLowerCase();
    }

    if (/^[0-9]$/.test(key)) {
      return key;
    }

    return null;
  }

  function isTypingTarget(target) {
    if (!target || target.nodeType !== 1) {
      return false;
    }

    const tagName = target.tagName ? target.tagName.toLowerCase() : '';

    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }

    if (target.isContentEditable) {
      return true;
    }

    return Boolean(target.closest && target.closest('[contenteditable=""], [contenteditable="true"]'));
  }

  function normalizeSequence(sequence) {
    if (!Array.isArray(sequence)) {
      return [];
    }

    return sequence.map(normalizeKey).filter(Boolean);
  }

  function getMaxGap(config) {
    const gap = Number(config && config.maxGapMs);
    return gap > 0 ? gap : DEFAULT_MAX_GAP_MS;
  }

  function showNotice(doc, message) {
    if (!message || !doc || !doc.body) {
      return;
    }

    const notice = doc.createElement('div');
    notice.className = 'cheatjs-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.textContent = message;
    doc.body.appendChild(notice);

    window.setTimeout(function () {
      if (notice.parentNode) {
        notice.parentNode.removeChild(notice);
      }
    }, NOTICE_TIMEOUT_MS);
  }

  function isFallDownBodyClass(bodyClass) {
    return bodyClass === FALL_DOWN_BODY_CLASS;
  }

  function isRunawayBodyClass(bodyClass) {
    return bodyClass === RUNAWAY_BODY_CLASS;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distanceFromPointToRect(x, y, rect) {
    const closestX = clamp(x, rect.left, rect.right);
    const closestY = clamp(y, rect.top, rect.bottom);

    return Math.sqrt(Math.pow(x - closestX, 2) + Math.pow(y - closestY, 2));
  }

  function normalizeVector(x, y) {
    const length = Math.sqrt((x * x) + (y * y));

    if (length === 0) {
      return null;
    }

    return {
      x: x / length,
      y: y / length,
    };
  }

  function formatRunawayTransform(x, y) {
    return 'translate(' + Math.round(x) + 'px, ' + Math.round(y) + 'px)';
  }

  function isFallDownCharacter(character) {
    return /\S/.test(character);
  }

  function isFallDownExcludedElement(element) {
    if (!element || element.nodeType !== 1) {
      return true;
    }

    if (element.closest && element.closest(FALL_DOWN_EXCLUDED_SELECTOR)) {
      return true;
    }

    if (element.closest && element.closest('[hidden]')) {
      return true;
    }

    if (window.getComputedStyle) {
      const style = window.getComputedStyle(element);
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
        return true;
      }
    }

    return false;
  }

  function hasMeasurableRect(rect) {
    return rect && (rect.width > 0 || rect.height > 0);
  }

  function getTextNodeRect(doc, textNode) {
    let rect = null;

    if (doc.createRange) {
      const range = doc.createRange();
      range.selectNodeContents(textNode);

      if (typeof range.getBoundingClientRect === 'function') {
        rect = range.getBoundingClientRect();
      }

      if (range.detach) {
        range.detach();
      }
    }

    if (!hasMeasurableRect(rect) && textNode.parentElement && textNode.parentElement.getBoundingClientRect) {
      rect = textNode.parentElement.getBoundingClientRect();
    }

    return rect;
  }

  function rectIntersectsViewport(doc, rect) {
    if (!hasMeasurableRect(rect)) {
      return true;
    }

    const docElement = doc.documentElement || {};
    const viewportWidth = window.innerWidth || docElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || docElement.clientHeight || 0;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return true;
    }

    return rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewportHeight && rect.left <= viewportWidth;
  }

  function isFallDownVisibleTextNode(doc, textNode) {
    if (!textNode || !/\S/.test(textNode.nodeValue || '')) {
      return false;
    }

    if (isFallDownExcludedElement(textNode.parentElement)) {
      return false;
    }

    return rectIntersectsViewport(doc, getTextNodeRect(doc, textNode));
  }

  function createFallDownLetter(doc, character, index, isHeld) {
    const span = doc.createElement('span');
    const fallDuration = 1.05 + ((index * 7) % 11) * 0.13;
    const shakeDuration = 0.12 + (index % 4) * 0.03;
    const delay = (index % 9) * 0.045;
    const drift = (((index * 5) % 9) - 4) * 0.45;
    const rotate = (((index * 11) % 13) - 6) * 7;

    span.className = isHeld
      ? FALL_DOWN_LETTER_CLASS + ' ' + FALL_DOWN_HELD_LETTER_CLASS
      : FALL_DOWN_LETTER_CLASS;
    span.textContent = character;
    span.style.setProperty('--cheatjs-fall-delay', delay.toFixed(3) + 's');
    span.style.setProperty('--cheatjs-fall-hold-delay', isHeld ? FALL_DOWN_HELD_DELAY : '0s');
    span.style.setProperty('--cheatjs-fall-shake-duration', shakeDuration.toFixed(3) + 's');
    span.style.setProperty('--cheatjs-fall-drop-duration', fallDuration.toFixed(3) + 's');
    span.style.setProperty('--cheatjs-fall-x', drift.toFixed(2) + 'rem');
    span.style.setProperty('--cheatjs-fall-rotate', rotate + 'deg');

    return span;
  }

  function countFallDownCharacters(textNodes) {
    return textNodes.reduce(function (count, textNode) {
      return count + textNode.nodeValue.split('').filter(isFallDownCharacter).length;
    }, 0);
  }

  function wrapFallDownTextNode(doc, textNode, state) {
    const text = textNode.nodeValue;
    const fragment = doc.createDocumentFragment();
    const start = doc.createComment('cheatjs-fall-down-start');
    const end = doc.createComment('cheatjs-fall-down-end');

    fragment.appendChild(start);

    text.split('').forEach(function (character) {
      if (isFallDownCharacter(character)) {
        fragment.appendChild(createFallDownLetter(doc, character, state.index, state.index === state.heldIndex));
        state.index += 1;
      } else {
        fragment.appendChild(doc.createTextNode(character));
      }
    });

    fragment.appendChild(end);
    textNode.parentNode.replaceChild(fragment, textNode);

    return {
      start: start,
      end: end,
      text: text,
    };
  }

  function wrapFallDownText(doc) {
    if (!doc.body || !window.NodeFilter || !doc.createTreeWalker) {
      return [];
    }

    const replacements = [];
    const textNodes = [];
    const walker = doc.createTreeWalker(doc.body, window.NodeFilter.SHOW_TEXT, {
      acceptNode: function (textNode) {
        return isFallDownVisibleTextNode(doc, textNode)
          ? window.NodeFilter.FILTER_ACCEPT
          : window.NodeFilter.FILTER_REJECT;
      },
    });
    let textNode = walker.nextNode();

    while (textNode) {
      textNodes.push(textNode);
      textNode = walker.nextNode();
    }

    const characterCount = countFallDownCharacters(textNodes);
    const state = {
      index: 0,
      heldIndex: characterCount > 0 ? Math.min(characterCount - 1, Math.floor(Math.random() * characterCount)) : -1,
    };

    textNodes.forEach(function (node) {
      replacements.push(wrapFallDownTextNode(doc, node, state));
    });

    return replacements;
  }

  function restoreFallDownReplacement(doc, replacement) {
    if (!replacement.start.parentNode) {
      return;
    }

    const parent = replacement.start.parentNode;
    let current = replacement.start;
    const restoredText = doc.createTextNode(replacement.text);

    parent.insertBefore(restoredText, replacement.start);

    while (current) {
      const next = current.nextSibling;
      parent.removeChild(current);

      if (current === replacement.end) {
        break;
      }

      current = next;
    }
  }

  function createDetector(config, documentOverride) {
    const doc = documentOverride || window.document;
    const maxGapMs = getMaxGap(config);
    const states = (config && Array.isArray(config.presets) ? config.presets : []).map(function (preset) {
      return {
        preset: preset,
        sequence: normalizeSequence(preset.sequence),
        progress: 0,
        lastAt: 0,
      };
    }).filter(function (state) {
      return state.preset && state.preset.bodyClass && state.sequence.length > 0;
    });
    let activeBodyClasses = [];
    let stopButton = null;
    let fallDownReplacements = [];
    let runawayState = null;

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

    function createRunawayState() {
      return {
        lastX: null,
        lastY: null,
        blockedTarget: null,
        blockedUntil: 0,
        records: [],
      };
    }

    function isRunawayExcludedTarget(element) {
      if (!element || element.nodeType !== 1) {
        return true;
      }

      return Boolean(element.closest && element.closest('.cheatjs-notice, .' + STOP_BUTTON_CLASS));
    }

    function getRunawayTarget(target) {
      const element = target && target.nodeType === 1 ? target : target && target.parentElement;

      if (!element || !element.closest) {
        return null;
      }

      const runawayTarget = element.closest(RUNAWAY_TARGET_SELECTOR);

      return runawayTarget && !isRunawayExcludedTarget(runawayTarget) ? runawayTarget : null;
    }

    function getRunawayRecord(element) {
      let record = runawayState.records.filter(function (item) {
        return item.element === element;
      })[0];

      if (!record) {
        record = {
          element: element,
          transform: element.style.transform || '',
          x: 0,
          y: 0,
        };
        runawayState.records.push(record);
      }

      return record;
    }

    function getRunawayViewport() {
      const docElement = doc.documentElement || {};

      return {
        width: window.innerWidth || docElement.clientWidth || 0,
        height: window.innerHeight || docElement.clientHeight || 0,
      };
    }

    function getRunawayMovementVector(dx, dy, pointerX, pointerY, rect) {
      let vector = normalizeVector(dx, dy);

      if (vector) {
        return vector;
      }

      vector = normalizeVector(((rect.left + rect.right) / 2) - pointerX, ((rect.top + rect.bottom) / 2) - pointerY);

      return vector || { x: 1, y: 0 };
    }

    function moveRunawayTarget(element, pointerX, pointerY, dx, dy) {
      if (!element.getBoundingClientRect) {
        return;
      }

      const rect = element.getBoundingClientRect();

      if (!rect || distanceFromPointToRect(pointerX, pointerY, rect) > RUNAWAY_DISTANCE) {
        return;
      }

      const record = getRunawayRecord(element);
      const vector = getRunawayMovementVector(dx, dy, pointerX, pointerY, rect);
      let nextX = record.x + (vector.x * RUNAWAY_STEP);
      let nextY = record.y + (vector.y * RUNAWAY_STEP);
      const viewport = getRunawayViewport();

      if (viewport.width > 0) {
        nextX = clamp(nextX, -rect.left, viewport.width - rect.right);
      }

      if (viewport.height > 0) {
        nextY = clamp(nextY, -rect.top, viewport.height - rect.bottom);
      }

      record.x = nextX;
      record.y = nextY;
      element.classList.add(RUNAWAY_TARGET_CLASS);
      element.style.transform = formatRunawayTransform(nextX, nextY);
    }

    function handleRunawayPointerMove(event) {
      if (!runawayState || !doc.querySelectorAll) {
        return;
      }

      const pointerX = Number(event.clientX);
      const pointerY = Number(event.clientY);

      if (pointerX !== pointerX || pointerY !== pointerY) {
        return;
      }

      const lastX = runawayState.lastX;
      const lastY = runawayState.lastY;
      runawayState.lastX = pointerX;
      runawayState.lastY = pointerY;

      if (lastX === null || lastY === null) {
        return;
      }

      Array.prototype.forEach.call(doc.querySelectorAll(RUNAWAY_TARGET_SELECTOR), function (element) {
        if (!isRunawayExcludedTarget(element)) {
          moveRunawayTarget(element, pointerX, pointerY, pointerX - lastX, pointerY - lastY);
        }
      });
    }

    function handleRunawayPointerActivation(event) {
      if (!runawayState) {
        return;
      }

      const target = getRunawayTarget(event.target);

      if (!target) {
        return;
      }

      if (event.type === 'click') {
        if (runawayState.blockedTarget !== target || Date.now() > runawayState.blockedUntil) {
          runawayState.blockedTarget = null;
          runawayState.blockedUntil = 0;
          return;
        }
      }

      if (event.type === 'pointerdown') {
        runawayState.blockedTarget = target;
        runawayState.blockedUntil = Date.now() + 1000;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }

      if (event.type === 'click') {
        runawayState.blockedTarget = null;
        runawayState.blockedUntil = 0;
      }
    }

    function activateRunaway() {
      if (runawayState) {
        return;
      }

      runawayState = createRunawayState();
      doc.addEventListener('pointermove', handleRunawayPointerMove);
      doc.addEventListener('pointerdown', handleRunawayPointerActivation, true);
      doc.addEventListener('click', handleRunawayPointerActivation, true);
    }

    function deactivateRunaway() {
      if (!runawayState) {
        return;
      }

      doc.removeEventListener('pointermove', handleRunawayPointerMove);
      doc.removeEventListener('pointerdown', handleRunawayPointerActivation, true);
      doc.removeEventListener('click', handleRunawayPointerActivation, true);

      runawayState.records.forEach(function (record) {
        record.element.classList.remove(RUNAWAY_TARGET_CLASS);
        record.element.style.transform = record.transform;
      });
      runawayState = null;
    }

    function activatePresetEffect(preset) {
      if (!preset) {
        return;
      }

      if (isRunawayBodyClass(preset.bodyClass)) {
        activateRunaway();
        return;
      }

      if (!isFallDownBodyClass(preset.bodyClass) || fallDownReplacements.length > 0) {
        return;
      }

      fallDownReplacements = wrapFallDownText(doc);
    }

    function deactivatePresetEffect(bodyClass) {
      if (isRunawayBodyClass(bodyClass)) {
        deactivateRunaway();
        return;
      }

      if (!isFallDownBodyClass(bodyClass) || fallDownReplacements.length === 0) {
        return;
      }

      fallDownReplacements.forEach(function (replacement) {
        restoreFallDownReplacement(doc, replacement);
      });
      fallDownReplacements = [];
    }

    function clearActiveCheats() {
      activeBodyClasses.forEach(function (bodyClass) {
        deactivatePresetEffect(bodyClass);
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

    function resetIfStale(state, now) {
      if (state.progress > 0 && now - state.lastAt > maxGapMs) {
        state.progress = 0;
      }
    }

    function advanceState(state, key, now) {
      resetIfStale(state, now);

      if (key === state.sequence[state.progress]) {
        state.progress += 1;
        state.lastAt = now;
      } else {
        state.progress = key === state.sequence[0] ? 1 : 0;
        state.lastAt = state.progress > 0 ? now : 0;
      }

      if (state.progress === state.sequence.length) {
        state.progress = 0;
        state.lastAt = 0;
        togglePreset(state.preset);
      }
    }

    function togglePreset(preset) {
      const enabled = doc.body.classList.toggle(preset.bodyClass);

      if (enabled) {
        addActiveBodyClass(preset.bodyClass);
        activatePresetEffect(preset);
      } else {
        removeActiveBodyClass(preset.bodyClass);
        deactivatePresetEffect(preset.bodyClass);
      }

      renderStopButton();
      showNotice(doc, enabled ? preset.onMessage : preset.offMessage);
    }

    function handleKeydown(event) {
      if (isTypingTarget(event.target)) {
        return;
      }

      const key = normalizeKey(event.key);
      if (!key) {
        return;
      }

      const now = Date.now();
      states.forEach(function (state) {
        advanceState(state, key, now);
      });
    }

    return {
      handleKeydown: handleKeydown,
      destroy: function () {
        states.forEach(function (state) {
          state.progress = 0;
          state.lastAt = 0;
        });
        clearActiveCheats();
      },
    };
  }

  function init(config, documentOverride) {
    const doc = documentOverride || window.document;
    const detector = createDetector(config || {}, doc);

    doc.addEventListener('keydown', detector.handleKeydown);

    return {
      destroy: function () {
        doc.removeEventListener('keydown', detector.handleKeydown);
        detector.destroy();
      },
    };
  }

  function initWhenReady() {
    window[AUTO_PENDING_KEY] = false;

    if (!window.CHEATJS_CONFIG || window[AUTO_CONTROLLER_KEY]) {
      return;
    }

    window[AUTO_CONTROLLER_KEY] = init(window.CHEATJS_CONFIG, window.document);
  }

  window.CheatJS = {
    init: init,
    createDetector: createDetector,
    normalizeKey: normalizeKey,
    isTypingTarget: isTypingTarget,
  };

  if (window.document) {
    if (window.document.readyState === 'loading') {
      if (!window[AUTO_CONTROLLER_KEY] && !window[AUTO_PENDING_KEY]) {
        window[AUTO_PENDING_KEY] = true;
        window.document.addEventListener('DOMContentLoaded', initWhenReady, { once: true });
      }
    } else {
      initWhenReady();
    }
  }
})(window);
