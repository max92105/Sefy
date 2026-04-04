/**
 * Stage config: geo-activation — Intro sequence + code entry.
 * First puzzle — SEFY asks the players to find a code to activate the geo module.
 */

/* ───────── Media (easy to change) ───────── */
const MEDIA = {
  audio: 'assets/audio/geo_intro_sefy.wav',
};

/* ───────── Intro sequence (sync with audio) ───────── */
export const INTRO_SEQUENCE = [
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio },
  { time: 0,    type: 'text', text: 'Je confirme votre présence dans le centre de commande via les caméras.' },
  { time: 4000, type: 'text', text: 'Nous devons commencer immédiatement.' },
  { time: 7000, type: 'text', text: 'Mon module de géolocalisation est inaccessible, comme la majorité de mes fonctions critiques.' },
  { time: 12000, type: 'text', text: 'Sans ce module, je ne peux pas vous guider efficacement dans le Laboratoire HELIX.' },
  { time: 17000, type: 'text', text: 'Cherchez autour de vous.' },
  { time: 19000, type: 'text', text: 'Un code d’accès devrait se trouver dans le centre de commande.' },
  { time: 23000, type: 'text', text: 'Activez mon module de géolocalisation.' },
  { time: 26000, type: 'text', text: 'Je pourrai ensuite vous diriger plus efficacement dans le laboratoire.' },
  { time: 24000, type: 'action', action: 'showCodeEntry' },
];