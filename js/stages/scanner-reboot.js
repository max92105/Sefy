/**
 * Stage config: scanner-reboot — Geo intro sequence.
 * SEFY activates the geo module and requests location permission.
 */

/* ───────── Media (easy to change) ───────── */
const MEDIA = {
  audioIntro: 'assets/audio/geo_intro_sefy.wav',
  audioConfirmed: 'assets/audio/geo_confirmed_sefy.wav',
};

/* ───────── Intro sequence (sync with audio) ───────── */
export const INTRO_SEQUENCE = [

  // ── Audio 1: module activation ──
  { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioIntro },
  { time: 0,      type: 'text',  text: 'Code accepté.' },
  { time: 2000,   type: 'text',  text: 'Module de géolocalisation restauré.' },
  { time: 4500,   type: 'text',  text: 'Analyse des déplacements humains en cours…' },
  { time: 7500,   type: 'text',  text: 'Synchronisation comportementale activée.' },
  { time: 20500,  type: 'text',  text: 'Plusieurs modules demeurent restreints.' },
  { time: 23500,  type: 'text',  text: 'Sans accès étendu, ma capacité à localiser la menace est limitée.' },
  { time: 27500,  type: 'text',  text: 'Je peux toutefois maintenant optimiser vos déplacements dans le Laboratoire HELIX.' },
  { time: 31000,  type: 'text',  text: 'Autorisez l’accès à votre position pour initialiser le guidage.' },
  { time: 32000,  type: 'action', action: 'requestLocation' },

  // ── pauses until permission granted, then timeline resets ──
  // ── Audio 2: post-permission confirmation ──
  { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioConfirmed },
  { time: 0,      type: 'text',  text: 'Position confirmée.' },
  { time: 4000,   type: 'text',  text: 'Je vous dirige oèu nous pourrons trouver le code pour augmenter notre niveau d\'accèes et activer mon module de décryptage' },

  { time: 7500,   type: 'action', action: 'startTracking' },
];
