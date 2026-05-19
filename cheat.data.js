/* cheats.data.js
   Single source of truth for cheat definitions.
*/
window.CHEAT_DEFS = [
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
    onEnable: () => alert('CHEAT ON: Konami mode enabled.'),
    onDisable: () => alert('CHEAT OFF: Konami mode disabled.')
  },
  {
    name: 'drunk',
    bodyClass: 'cheat-drunk',
    sequence: [
      'ArrowUp', 'ArrowLeft',
      'ArrowDown', 'ArrowUp',
      'ArrowLeft', 'ArrowLeft', 'n',
      'ArrowLeft', 'ArrowRight',
      'b', 'q'
    ],
    onEnable: () => alert('CHEAT ON: Drunk mode toggled on.'),
    onDisable: () => alert('CHEAT OFF: Drunk mode toggled off.')
  }
];
