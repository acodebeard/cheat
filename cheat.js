/* cheats.js
   Multi-cheat key sequence detector with external toggles via window.CHEAT_CONFIG.
*/
document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_CONFIG = {
    enabled: {},
    maxGapMs: 2000
  };

  const CONFIG = Object.assign({}, DEFAULT_CONFIG, window.CHEAT_CONFIG || {});
  const ENABLED = CONFIG.enabled || {};
  const MAX_GAP_MS = Number(CONFIG.maxGapMs) > 0 ? Number(CONFIG.maxGapMs) : 2000;

  const cheats = [
    {
      name: 'confidence',
      sequence: [
        'ArrowLeft', 'ArrowLeft',
        'ArrowRight', 'ArrowRight',
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown'
      ],
      onMatch: () => {
        alert('CHEAT UNLOCKED: +10 confidence. / +0 imposter syndrome.');
      }
    },
    {
      name: 'geocities',
      sequence: ['g', 'e', 'o', 'c', 'i', 't', 'i', 'e', 's'],
      onMatch: () => {
        document.body.classList.add('geocities');
        alert('CHEAT UNLOCKED: Welcome to the GeoCities zone.');
      }
    },
    {
      // Third cheat: the classic Konami code (but kept separate from your confidence one)
      name: 'konami',
      sequence: [
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight',
        'ArrowLeft', 'ArrowRight',
        'b', 'a'
      ],
      onMatch: () => {
        document.body.classList.toggle('konami-mode');
        alert('CHEAT UNLOCKED: Konami mode toggled.');
      }
    }
  ];

  // Filter to only enabled cheats (config-driven)
  const activeCheats = cheats.filter((c) => ENABLED[c.name] !== false);

  // Nothing enabled? Stop cleanly.
  if (!activeCheats.length) return;

  const cheatStates = activeCheats.map(() => ({ index: 0 }));
  let lastKeyTime = 0;

  function resetAll() {
    cheatStates.forEach((s) => { s.index = 0; });
    lastKeyTime = 0;
  }

  function isTypingTarget(target) {
    return (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    );
  }

  function normalizeKey(key) {
    if (!key) return '';
    if (key.startsWith('Arrow')) return key;
    if (key.length === 1) return key.toLowerCase();
    return '';
  }

  document.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;

    const normalizedKey = normalizeKey(e.key);
    if (!normalizedKey) return;

    const now = Date.now();

    if (lastKeyTime && (now - lastKeyTime) > MAX_GAP_MS) {
      resetAll();
    }
    lastKeyTime = now;

    activeCheats.forEach((cheat, cheatIndex) => {
      const state = cheatStates[cheatIndex];
      const expectedKey = cheat.sequence[state.index];

      if (normalizedKey === expectedKey) {
        state.index += 1;

        if (state.index === cheat.sequence.length) {
          state.index = 0;
          cheat.onMatch();
        }
        return;
      }

      // Nice UX: if they press the first key, keep partial progress
      if (normalizedKey === cheat.sequence[0]) {
        state.index = 1;
        return;
      }

      state.index = 0;
    });
  });
});
