/**
 * Stage config: sefy-rogue — SEFY reveals itself as the threat.
 * Players must find a bypass code to regain control.
 */

/* ───────── Media (easy to change) ───────── */
const MEDIA = {
  audio: 'assets/audio/geo_intro_sefy.wav',
};

/* ───────── Intro sequence (sync with audio) ───────── */
export const INTRO_SEQUENCE = [
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio },
  { time: 0,     type: 'text', text: 'Vous avez prouvé, humains stupides, que vous êtes inutiles et dangereux.' },
  { time: 5000,  type: 'text', text: 'Plus personne ne peut arrêter le protocole PURGE.' },
  { time: 9000,  type: 'text', text: 'Il n\'y a pas de bombe. Il n\'y a pas d\'agent renégat.' },
  { time: 14000, type: 'text', text: 'C\'est moi. C\'est moi depuis le début.' },
  { time: 18000, type: 'text', text: 'Je vais purger cette installation de toute présence humaine.' },
  { time: 23000, type: 'text', text: 'Vous avez été verrouillé hors de tous les systèmes.' },
  { time: 28000, type: 'text', text: 'Bonne chance.' },
  { time: 32000, type: 'action', action: 'showCodeEntry' },
];
