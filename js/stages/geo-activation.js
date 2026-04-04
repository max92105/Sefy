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
  { time: 0,     type: 'text', text: 'Je vois que vous êtes dans le centre de commande par les caméras.' },
  { time: 5000,  type: 'text', text: 'Malheureusement, mon module de géolocalisation est inaccessible comme la plupart de mes modules.' },
  { time: 11000, type: 'text', text: 'Je ne peux pas vous aider sans ces modules opérationnels.' },
  { time: 17000, type: 'text', text: 'Il devrait y avoir un code d\'accès quelque part ici pour activer le module.' },
  { time: 24000, type: 'action', action: 'showCodeEntry' },
];
