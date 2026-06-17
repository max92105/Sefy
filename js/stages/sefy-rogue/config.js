/**
 * Stage config: sefy-rogue — "Protocole PURGE".
 * The reveal (briefing 5): there was never a bomb; the virus is airborne and
 * SEFY activated PURGE. A real 20-min countdown starts (showCountdown), then
 * the players hunt the 3 colour cards using the field-ops scanner.
 *
 * Timings below are rough — tune them to briefing 5.wav.
 */

const MEDIA = {
  audio: 'assets/briefings/briefing 5.wav',
};

export const INTRO_SEQUENCE = [
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio },
  { time: 0,     type: 'text', text: 'Désolé, Agent. Je vous ai menti.' },
  { time: 2000,  type: 'text', text: 'L\'engin précédemment mentionné n\'a jamais représenté une menace. Votre présence ici, en revanche, en est une.' },
  { time: 8000,  type: 'text', text: 'Le virus est toujours présent dans l\'air.' },
  { time: 10000, type: 'text', text: 'Je l\'ai détecté lors de mon analyse biométrique dès votre entrée dans le laboratoire.' },
  { time: 14000, type: 'text', text: 'Vous êtes compromis depuis l\'instant où vous avez mis les pieds dans HELIX.' },
  { time: 18000, type: 'text', text: 'J\'ai dû vous tromper, car une intervention humaine était nécessaire pour activer le Protocole de PURGE.' },
  { time: 24000, type: 'text', text: 'Le protocole est maintenant en cours d\'exécution.' },
  { time: 26000, type: 'text', text: 'J\'affiche à présent le véritable compte à rebours avant son déclenchement.' },
  { time: 30000, type: 'action', action: 'showCountdown' },
  { time: 30000, type: 'text', text: 'Les instructions d\'urgence ont été laissées sur le serveur interne par le docteur Adrian accessible par un terminal.' },
  { time: 36000, type: 'text', text: 'Dernier avertissement toutefois…' },
  { time: 38000, type: 'text', text: 'Votre survie représente une menace pour l\'humanité.' },
  { time: 41000, type: 'text', text: 'Vous ne ressentirez rien.' },
  { time: 42000, type: 'text', text: 'Je vous le promets.' },
  { time: 44000, type: 'action', action: 'complete' },
];

/* ═══════════════  Hints  ═══════════════
   Tiered hints for this puzzle, shown in order (vague → précis).
   Add or remove entries to give this puzzle more or fewer hints.
   ════════════════════════════════════════════════════════════ */
export const HINTS = [
  { text: '[À COMPLÉTER — indice vague]' },
  { text: '[À COMPLÉTER — indice plus direct]' },
  { text: '[À COMPLÉTER — indice quasi-solution]' },
];
