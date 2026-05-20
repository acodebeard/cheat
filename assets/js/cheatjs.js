(function (window) {
  'use strict';

  var ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  var DEFAULT_MAX_GAP_MS = 2000;
  var NOTICE_TIMEOUT_MS = 2400;
  var STOP_BUTTON_CLASS = 'cheatjs-stop-button';
  var STOP_BUTTON_TEXT = 'Stop cheating';
  var STOP_MESSAGES = [
    'good. cheating is wrong.',
    "it's stopped, but i'm telling on you.",
    'fine. your secret is safe-ish.',
    'cheating canceled. character restored.',
    'the evidence has been hidden poorly.',
  ];
  var AUTO_CONTROLLER_KEY = 'CHEATJS_AUTO_CONTROLLER';
  var AUTO_PENDING_KEY = 'CHEATJS_AUTO_PENDING';

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

    var tagName = target.tagName ? target.tagName.toLowerCase() : '';

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
    var gap = Number(config && config.maxGapMs);
    return gap > 0 ? gap : DEFAULT_MAX_GAP_MS;
  }

  function showNotice(doc, message) {
    if (!message || !doc || !doc.body) {
      return;
    }

    var notice = doc.createElement('div');
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

  function createDetector(config, documentOverride) {
    var doc = documentOverride || window.document;
    var maxGapMs = getMaxGap(config);
    var states = (config && Array.isArray(config.presets) ? config.presets : []).map(function (preset) {
      return {
        preset: preset,
        sequence: normalizeSequence(preset.sequence),
        progress: 0,
        lastAt: 0,
      };
    }).filter(function (state) {
      return state.preset && state.preset.bodyClass && state.sequence.length > 0;
    });
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
      var enabled = doc.body.classList.toggle(preset.bodyClass);

      if (enabled) {
        addActiveBodyClass(preset.bodyClass);
      } else {
        removeActiveBodyClass(preset.bodyClass);
      }

      renderStopButton();
      showNotice(doc, enabled ? preset.onMessage : preset.offMessage);
    }

    function handleKeydown(event) {
      if (isTypingTarget(event.target)) {
        return;
      }

      var key = normalizeKey(event.key);
      if (!key) {
        return;
      }

      var now = Date.now();
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
    var doc = documentOverride || window.document;
    var detector = createDetector(config || {}, doc);

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
