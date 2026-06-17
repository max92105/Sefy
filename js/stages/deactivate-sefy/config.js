/**
 * Stage config: deactivate-sefy
 * Final code-entry to stop the PURGE. The player is locked on this screen while
 * the deactivation code is broadcast on a loop; entering it ends the game.
 */

/** Audio broadcast on a loop while the player is locked on the final screen. */
export const MEDIA = {
  codeLoop: 'assets/deactivate-sefy/deactivation_code.wav',
  loopGapMs: 1500, // pause between loops
};

/* ═══════════════  Hints  ═══════════════
   Tiered hints for this puzzle, shown in order (vague → précis).
   Add or remove entries to give this puzzle more or fewer hints.
   ════════════════════════════════════════════════════════════ */
export const HINTS = [
  { text: '[À COMPLÉTER — indice vague]' },
  { text: '[À COMPLÉTER — indice plus direct]' },
  { text: '[À COMPLÉTER — indice quasi-solution]' },
];
