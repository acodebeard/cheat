(function (window) {
  'use strict';

  var ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  var ARROW_LABELS = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  };
  var AUTO_CONTROLLER_KEY = 'CHEATJS_ADMIN_AUTO_CONTROLLER';
  var AUTO_PENDING_KEY = 'CHEATJS_ADMIN_AUTO_PENDING';

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

  function keyLabel(key) {
    var normalized = normalizeKey(key);

    if (!normalized) {
      return '';
    }

    if (ARROW_LABELS[normalized]) {
      return ARROW_LABELS[normalized];
    }

    if (/^[a-z]$/.test(normalized)) {
      return normalized.toUpperCase();
    }

    return normalized;
  }

  function parseSequence(value) {
    if (!value) {
      return [];
    }

    return String(value).split(',').map(function (key) {
      return normalizeKey(key.trim());
    }).filter(Boolean);
  }

  function sequenceValue(sequence) {
    return sequence.join(',');
  }

  function findParts(card) {
    return {
      input: card.querySelector('.cheatjs-sequence-input'),
      chips: card.querySelector('.cheatjs-key-chips'),
    };
  }

  function renderSequence(card, sequence) {
    var parts = findParts(card);

    if (parts.input) {
      parts.input.value = sequenceValue(sequence);
    }

    if (!parts.chips) {
      return;
    }

    parts.chips.textContent = '';
    sequence.forEach(function (key) {
      var chip = card.ownerDocument.createElement('span');
      chip.className = 'cheatjs-key-chip';
      chip.textContent = keyLabel(key);
      parts.chips.appendChild(chip);
    });
  }

  function getSequence(card) {
    var input = card.querySelector('.cheatjs-sequence-input');
    return parseSequence(input ? input.value : '');
  }

  function createController(doc) {
    var activeCard = null;
    var previousSequence = [];

    function stopRecording(options) {
      if (!activeCard) {
        return;
      }

      if (options && options.restore) {
        renderSequence(activeCard, previousSequence);
      }

      activeCard.classList.remove('is-recording');
      activeCard = null;
      previousSequence = [];
    }

    function startRecording(card) {
      if (activeCard && activeCard !== card) {
        stopRecording();
      }

      activeCard = card;
      previousSequence = getSequence(card);
      card.classList.add('is-recording');
    }

    function appendKey(key) {
      var sequence = getSequence(activeCard);
      sequence.push(key);
      renderSequence(activeCard, sequence);
    }

    function removeLastKey() {
      var sequence = getSequence(activeCard);
      sequence.pop();
      renderSequence(activeCard, sequence);
    }

    function cardFromEvent(event) {
      if (!event.target || !event.target.closest) {
        return null;
      }

      return event.target.closest('[data-cheatjs-preset]');
    }

    function handleClick(event) {
      var target = event.target;
      var card = cardFromEvent(event);

      if (!card || !target || !target.closest) {
        return;
      }

      if (target.closest('.cheatjs-record')) {
        startRecording(card);
        return;
      }

      if (target.closest('.cheatjs-done')) {
        if (activeCard === card) {
          stopRecording();
        }
        return;
      }

      if (target.closest('.cheatjs-clear')) {
        renderSequence(card, []);
        return;
      }

      if (target.closest('.cheatjs-reset')) {
        renderSequence(card, parseSequence(card.getAttribute('data-default-sequence')));
      }
    }

    function handleKeydown(event) {
      if (!activeCard) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        stopRecording({ restore: true });
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        removeLastKey();
        return;
      }

      var key = normalizeKey(event.key);
      if (!key) {
        return;
      }

      event.preventDefault();
      appendKey(key);
    }

    doc.addEventListener('click', handleClick);
    doc.addEventListener('keydown', handleKeydown);

    return {
      destroy: function () {
        doc.removeEventListener('click', handleClick);
        doc.removeEventListener('keydown', handleKeydown);
        stopRecording();
      },
    };
  }

  function init(documentOverride) {
    return createController(documentOverride || window.document);
  }

  function initWhenReady() {
    window[AUTO_PENDING_KEY] = false;

    if (window[AUTO_CONTROLLER_KEY]) {
      return;
    }

    window[AUTO_CONTROLLER_KEY] = init(window.document);
  }

  window.CheatJSAdmin = {
    init: init,
    normalizeKey: normalizeKey,
    keyLabel: keyLabel,
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
