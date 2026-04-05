/**
 * Stage config: bomb-search
 * AR scanner intro — camera-based environmental analysis.
 */

const MEDIA = {
  audioIntro:     'assets/audio/geo_intro_sefy.wav',
  audioConfirmed: 'assets/audio/geo_confirmed_sefy.wav',
};

export const INTRO_SEQUENCE = [
  { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioIntro },
  { time: 0,      type: 'text',  text: 'Module d\'analyse environnementale réactivé.' },
  { time: 4000,   type: 'text',  text: 'Nous pouvons maintenant trouver la bombe.' },
  { time: 8000,   type: 'text',  text: 'Mais je vais avoir besoin d\'un accès tier 3 pour pouvoir la désamorcer.' },
  { time: 14000,  type: 'text',  text: 'Avec mon module activé, je crois être capable de reconstruire des objets qui ne sont plus présents.' },
  { time: 21000,  type: 'text',  text: 'Donc des cartes d\'accès avec des autorisations plus hautes.' },
  { time: 27000,  type: 'text',  text: 'On y est presque.' },
  { time: 30000,  type: 'text',  text: 'Autorisez l\'accès à la caméra pour activer le scanner environnemental.' },
  { time: 31000,  type: 'action', action: 'requestCamera' },
  // — pauses until camera granted, then time resets to 0 —
  { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioConfirmed },
  { time: 0,      type: 'text',  text: 'Accès caméra confirmé.' },
  { time: 2000,   type: 'text',  text: 'Activation du scanner environnemental…' },
  { time: 4000,   type: 'text',  text: 'Explorez l\'installation avec votre caméra. Je vous indiquerai quand un objet sera détecté.' },
  { time: 7000,   type: 'action', action: 'startScanner' },
];

export const AR_OBJECTS = [
  {
    id: 'bomb',
    qrCode: 'SEFY:AR:BOMB',
    label: 'BOMBE DÉTECTÉE',
    icon: '💣',
    description: 'Dispositif explosif localisé. Accès tier 3 requis pour le désamorçage.',
    seekDirection: { yaw: 180, pitch: 30 },
    seekTolerance: 25,
    seekHint: 'Retournez-vous et regardez vers le bas…',
  },
  {
    id: 'tier3-card',
    qrCode: 'SEFY:AR:CARD',
    label: 'CARTE ACCÈS TIER 3',
    icon: '🪪',
    description: 'Carte d\'accès reconstruite. Autorisation tier 3 obtenue.',
    seekDirection: { yaw: -90, pitch: 25 },
    seekTolerance: 25,
    seekHint: 'Tournez à gauche et regardez vers le bas…',
  },
];
