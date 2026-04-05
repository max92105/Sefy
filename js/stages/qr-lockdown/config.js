/**
 * Stage config: qr-lockdown
 * SEFY briefs agents on the confinement + keycard stations.
 */

const MEDIA = {
  audioIntro:     'assets/audio/qr_intro_sefy.wav',
  audioConfirmed: 'assets/audio/qr_confirmed_sefy.wav',
};

export const INTRO_SEQUENCE = [
  // ── Audio 1: intro briefing ──
  { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioIntro },
  { time: 0,      type: 'text',  text: 'Module de décryptage activé avec succès.' },
  { time: 3000,   type: 'text',  text: 'Analyse de l\'environnement en cours…' },
  { time: 6000,   type: 'text',  text: 'Installation est en confinement.' },
  { time: 9000,   type: 'text',  text: 'Trois stations de réactivation ont été verrouillées.' },
  { time: 13000,  type: 'text',  text: 'Trouvé les cartes d\'accès dissimulées dans l\'édifice. Utilisez le scanner pour les enregistrer.' },
  { time: 18000,  type: 'text',  text: 'Chaque station requiert une carte de couleur spécifique.' },
  { time: 22000,  type: 'text',  text: 'Déverrouillez les trois stations pour réactiver mon module d\'analyse environnementale.' },
  { time: 26000,  type: 'text',  text: 'Autorisez l\'accès à la caméra pour que je puisse vous assister.' },
  { time: 27000,  type: 'action', action: 'requestCamera' },
  // ── pauses until camera granted, then timeline resets ──
  { time: 0,    type: 'action', action: 'playAudio', src: MEDIA.audioConfirmed },
  { time: 0,    type: 'text',  text: 'Accès caméra confirmé.' },
  { time: 2000, type: 'text',  text: 'Activation du scanner optique…' },
  { time: 4000, type: 'action', action: 'startScanner' },
];
