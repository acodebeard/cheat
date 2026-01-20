  document.addEventListener('DOMContentLoaded', () => {
    // Cheat-code sequence:
    // left, left, right, right, up, up, down, down
    const cheatSequence = [
      'ArrowLeft', 'ArrowLeft',
      'ArrowRight', 'ArrowRight',
      'ArrowUp', 'ArrowUp',
      'ArrowDown', 'ArrowDown'
    ];

    let index = 0;
    let lastKeyTime = 0;

    // Optional: time window (ms) — if they pause too long, reset.
    const MAX_GAP_MS = 2000;

    function reset() {
      index = 0;
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

      // Only care about arrow keys
      if (!e.key || !e.key.startsWith('Arrow')) return;

      const now = Date.now();

      // Reset if they paused too long between keys
      if (lastKeyTime && (now - lastKeyTime) > MAX_GAP_MS) {
        reset();
      }
      lastKeyTime = now;

      // Check current key against expected sequence
      if (e.key === cheatSequence[index]) {
        index += 1;

        // Completed!
        if (index === cheatSequence.length) {
          reset();

          alert('CHEAT UNLOCKED: +10 confidence. / +0 imposter syndrome.');
        }

        return;
      }

      // Mismatch: if this key matches the first item, restart at 1, otherwise reset
      if (e.key === cheatSequence[0]) {
        index = 1;
        return;
      }

      reset();
    });
  });

