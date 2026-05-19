document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_CONFIG = {
    enabled: {},
    maxGapMs: 2000
  };

  const CONFIG = Object.assign({}, DEFAULT_CONFIG, window.CHEAT_CONFIG || {});
  const ENABLED = CONFIG.enabled || {};
  const MAX_GAP_MS = Number(CONFIG.maxGapMs) > 0 ? Number(CONFIG.maxGapMs) : 2000;

  const allCheats = Array.isArray(window.CHEAT_DEFS) ? window.CHEAT_DEFS : [];
  const cheats = allCheats.filter((c) => c && c.name && ENABLED[c.name] !== false);

  if (!cheats.length) return;

  const cheatStates = cheats.map(() => ({ index: 0 }));
  let lastKeyTime = 0;

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
