/**
 * Stage config: geo-activation
 * First puzzle — SEFY asks the players to find a code to activate the geo module.
 */

const MEDIA = {
  audio: 'assets/audio/briefing 1.wav',
};

export const INTRO_SEQUENCE = [
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio },
  { time: 0, type: 'text', text: 'Je confirme votre présence dans le centre de commande via les caméras.' },
  { time: 3000, type: 'text', text: 'Nous devons commencer immédiatement.' },
  { time: 6000, type: 'text', text: 'Mon module de géolocalisation est inaccessible, comme la majorité de mes fonctions critiques.' },
  { time: 11000, type: 'text', text: 'Sans ce module, je ne peux pas vous guider efficacement dans le Laboratoire HELIX.' },
  { time: 15000, type: 'text', text: 'Cherchez autour de vous.' },
  { time: 17000, type: 'text', text: 'Un code d\’accès devrait se trouver dans le centre de commande.' },
  { time: 20000, type: 'text', text: 'Les codes d\’accès doivent être entrés dans un terminal.' },
  { time: 23000, type: 'text', text: 'J\'ai créé vos compte automatiquement, mais comme moi, vos accès seront restreints.' },
  { time: 29000, type: 'text', text: 'Activez mon module de géolocalisation.' },
  { time: 31000, type: 'text', text: 'Je pourrai ensuite vous diriger plus efficacement dans le laboratoire.' },
  { time: 35000, type: 'action', action: 'complete' },
];

/* ═══════════════  Hints  ═══════════════
   Tiered hints for this puzzle, shown in order (vague → précis).
   Add or remove entries to give this puzzle more or fewer hints.
   Each reveal affects the final score (scoring added later).
   ════════════════════════════════════════════════════════════ */
export const HINTS = [
  { text: 'Le code d\'accès se trouve quelque part dans le centre de commande. Cherchez un objet qui attire l\'attention.' },
  { text: 'Les scientifiques étaient tous passionnés par l\’empire Romain.' },
  { text: '_G_éolocalisation.' },
];
