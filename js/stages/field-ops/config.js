/**
 * Stage config: field-ops
 * Tabbed screen combining QR scanner and AR scanner.
 * AR tab is locked until tier 3 + ACTIVATEAR terminal command.
 */

const MEDIA = {
  audioIntro:     'assets/audio/qr_intro_sefy.wav',
  audioConfirmed: 'assets/audio/qr_confirmed_sefy.wav',
  audioAR:        'assets/audio/qr_intro_sefy.wav',   // reuse for AR briefing
};

export const INTRO_SEQUENCE = [
  { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioIntro },
  { time: 0,      type: 'text',  text: 'Module de décryptage activé avec succès.' },
  { time: 3000,   type: 'text',  text: 'Analyse de l\'environnement en cours…' },
  { time: 6000,   type: 'text',  text: 'Le scanner optique est prêt.' },
  { time: 9000,   type: 'text',  text: 'Explorez l\'installation pour collecter les indices et objets nécessaires.' },
  { time: 13000,  type: 'text',  text: 'Le module d\'analyse environnementale est encore verrouillé.' },
  { time: 17000,  type: 'text',  text: 'Il faudra un accès Tier 3 pour l\'activer depuis le terminal.' },
  { time: 21000,  type: 'text',  text: 'Autorisez l\'accès à la caméra pour commencer.' },
  { time: 22000,  type: 'action', action: 'requestCamera' },
  // — pauses until camera granted, then time resets to 0 —
  { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioConfirmed },
  { time: 0,      type: 'text',  text: 'Accès caméra confirmé.' },
  { time: 2000,   type: 'text',  text: 'Activation du scanner optique…' },
  { time: 4000,   type: 'action', action: 'startScanner' },
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

/* ═══════════════  AR Briefing  ═══════════════
   Played when arriving on field-ops and AR is NOT yet activated.
   Explains how to unlock the AR module.
   ════════════════════════════════════════════════════ */

export const AR_BRIEFING_SEQUENCE = [
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audioAR },
  { time: 0,     type: 'text',  text: 'Le scanner QR est opérationnel. Mais ce n\'est pas suffisant.' },
  { time: 4000,  type: 'text',  text: 'L\'installation contient des éléments invisibles à l\'œil nu.' },
  { time: 8000,  type: 'text',  text: 'Le module d\'analyse environnementale AR peut les révéler…' },
  { time: 11000, type: 'text',  text: '…mais il nécessite un accès Tier 3.' },
  { time: 14000, type: 'text',  text: 'Trouvez un membre du personnel autorisé.' },
  { time: 17000, type: 'text',  text: 'Il devra se connecter au terminal et utiliser la commande PROMOTE pour élever votre niveau d\'accès.' },
  { time: 22000, type: 'text',  text: 'Ensuite, la commande ACTIVATEAR déverrouillera le scanner.' },
  { time: 26000, type: 'text',  text: 'En attendant, utilisez le scanner QR pour collecter les cartes d\'accès.' },
  { time: 30000, type: 'action', action: 'endBriefing' },
];
