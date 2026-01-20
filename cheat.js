document.addEventListener('DOMContentLoaded', () => {
  const cheats = [
    {
      name: 'confidence',
      bodyClass: 'cheat-confidence',
      sequence: [
        'ArrowLeft', 'ArrowLeft',
        'ArrowRight', 'ArrowRight',
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown'
      ],
      onEnable: () => alert('CHEAT ON: +10 confidence. / +0 imposter syndrome.'),
      onDisable: () => alert('CHEAT OFF: Confidence mode disabled.')
    },
    {
      name: 'geocities',
      bodyClass: 'cheat-geocities',
      sequence: ['g', 'e', 'o', 'c', 'i', 't', 'i', 'e', 's'],
      onEnable: () => alert('CHEAT ON: Welcome to the GeoCities zone.'),
      onDisable: () => alert('CHEAT OFF: GeoCities zone disabled.')
    },
    {
      name: 'konami',
      bodyClass: 'cheat-konami',
      sequence: [
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight',
        'ArrowLeft', 'ArrowRight',
        'b', 'a'
      ],
      onEnable: () => alert('CHEAT ON: Konami mode toggled on.'),
      onDisable: () => alert('CHEAT OFF: Konami mode toggled off.')
    }
  ];

  const cheatStates = cheats.map(() => ({ index: 0 }));
  let lastKeyTime = 0;
  const MAX_GAP_MS = 2000;

  function reset() {
    cheatStates.forEach((state) => { state.index = 0; });
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

  function toggleCheat(cheat) {
    const cls = cheat.bodyClass;
    if (!cls) return;

    const isOn = document.body.classList.contains(cls);

    if (isOn) {
      document.body.classList.remove(cls);
      if (typeof cheat.onDisable === 'function') cheat.onDisable();
      else alert('CHEAT OFF');
      return;
    }

    document.body.classList.add(cls);
    if (typeof cheat.onEnable === 'function') cheat.onEnable();
    else alert('CHEAT ON');
  }

  document.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;

    const normalizedKey = normalizeKey(e.key);
    if (!normalizedKey) return;

    const now = Date.now();
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
          toggleCheat(cheat);
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
