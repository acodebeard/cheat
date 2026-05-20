(function (window) {
  'use strict';

  var ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  var DEFAULT_MAX_GAP_MS = 2000;
  var NOTICE_TIMEOUT_MS = 2400;
  var autoController = null;

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
    if (!window.CHEATJS_CONFIG || autoController) {
      return;
    }

    autoController = init(window.CHEATJS_CONFIG, window.document);
  }

  window.CheatJS = {
    init: init,
    createDetector: createDetector,
    normalizeKey: normalizeKey,
    isTypingTarget: isTypingTarget,
  };

  if (window.document) {
    if (window.document.readyState === 'loading') {
      initWhenReady();
      window.document.addEventListener('DOMContentLoaded', initWhenReady, { once: true });
    } else {
      initWhenReady();
    }
  }
})(window);
