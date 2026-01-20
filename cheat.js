  document.addEventListener('DOMContentLoaded', () => {
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
        sequence: [
          'g', 'e', 'o', 'c', 'i', 't', 'i', 'e', 's'
        ],
        onMatch: () => {
          document.body.classList.add('geocities');
          alert('CHEAT UNLOCKED: Welcome to the GeoCities zone.');
        }
      }
    ];

    const cheatStates = cheats.map(() => ({ index: 0 }));
    let lastKeyTime = 0;

    // Optional: time window (ms) — if they pause too long, reset.
    const MAX_GAP_MS = 2000;

    function reset() {
      cheatStates.forEach((state) => {
        state.index = 0;
      });
      lastKeyTime = 0;
    }

    document.addEventListener('keydown', (e) => {
      // Ignore if they’re typing in inputs/textareas/contenteditable
      const target = e.target;
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'TEXTAREA' ||
         target.tagName === 'SELECT' ||
         target.isContentEditable);

      if (isTypingTarget) return;

      if (!e.key) return;

      const normalizedKey = e.key.startsWith('Arrow')
        ? e.key
        : (e.key.length === 1 ? e.key.toLowerCase() : '');

      if (!normalizedKey) return;

      const now = Date.now();

      // Reset if they paused too long between keys
      if (lastKeyTime && (now - lastKeyTime) > MAX_GAP_MS) {
        reset();
      }
      lastKeyTime = now;

      cheats.forEach((cheat, cheatIndex) => {
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

        if (normalizedKey === cheat.sequence[0]) {
          state.index = 1;
          return;
        }

        state.index = 0;
      });
    });
  });
