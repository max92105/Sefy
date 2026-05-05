/**
 * Stage config: field-ops
 * Tabbed screen combining QR scanner and AR scanner.
 * AR tab is locked until tier 3 + AR terminal command.
 */

const MEDIA = {
  audioIntro:     'assets/audio/qr_intro_sefy.wav',
  audioConfirmed: 'assets/audio/qr_confirmed_sefy.wav',
  audioAR:        'assets/audio/qr_intro_sefy.wav',   // reuse for AR briefing
};

/* ═══════════════  QR Item Catalogs  ═══════════════ */

/**
 * Audio logs found via SEFY:AUDIO:<id> QR codes.
 * Each entry maps id → { label, room, src }
 */
export const AUDIO_CATALOG = {
  'cmd-center':       { label: 'Centre de Commandement',          room: 'Centre de Commandement',       src: 'assets/audio/rooms/cmd_center.mp3' },
  'cmd-clear':        { label: 'Rien à signaler',                 room: 'Centre de Commandement (AR)',  src: 'assets/audio/rooms/cmd_clear.mp3' },
  'lab-door':         { label: 'Laboratoire Chimique',            room: 'Laboratoire Chimique',         src: 'assets/audio/rooms/lab_door.mp3' },
  'lab-battle':       { label: 'Bataille Infecté',                room: 'Laboratoire Chimique',         src: 'assets/audio/rooms/lab_battle.mp3' },
  'lab-virus':        { label: 'Présence Virus ARK-41',           room: 'Laboratoire Chimique (AR)',    src: 'assets/audio/rooms/lab_virus.mp3' },
  'infirmary-door':   { label: 'Infirmerie',                      room: 'Infirmerie',                   src: 'assets/audio/rooms/infirmary_door.mp3' },
  'infirmary-julien': { label: 'Julien Park — Dissection',        room: 'Infirmerie',                   src: 'assets/audio/rooms/infirmary_julien.mp3' },
  'infirmary-virus':  { label: 'Présence Virus ARK-41',           room: 'Infirmerie (AR)',              src: 'assets/audio/rooms/infirmary_virus.mp3' },
  'quarters-door':    { label: 'Quartier du Personnel',           room: 'Quartier du Personnel',        src: 'assets/audio/rooms/quarters_door.mp3' },
  'quarters-thomas':  { label: 'Thomas — Journal',                room: 'Quartier du Personnel',        src: 'assets/audio/rooms/quarters_thomas.mp3' },
  'quarters-clear':   { label: 'Rien à signaler',                 room: 'Quartier du Personnel (AR)',   src: 'assets/audio/rooms/quarters_clear.mp3' },
  'science-door':     { label: 'Bureau Scientifique',             room: 'Bureau Scientifique',          src: 'assets/audio/rooms/science_door.mp3' },
  'science-sofia':    { label: 'Sofia Ionescu — Dernier Message', room: 'Bureau Scientifique',          src: 'assets/audio/rooms/science_sofia.mp3' },
  'science-hint':     { label: 'Trouvez la fausse bombe',         room: 'Bureau Scientifique (AR)',     src: 'assets/audio/rooms/science_hint.mp3' },
  'decon-door':       { label: 'Module de Décontamination',       room: 'Module de Décontamination',   src: 'assets/audio/rooms/decon_door.mp3' },
  'decon-personnel':  { label: 'Décontamination du Personnel',    room: 'Module de Décontamination',   src: 'assets/audio/rooms/decon_personnel.mp3' },
  'decon-virus':      { label: 'Présence Virus ARK-41',           room: 'Module de Décontamination (AR)', src: 'assets/audio/rooms/decon_virus.mp3' },
  'chief-door':       { label: 'Quartier du Chef Scientifique',   room: 'Quartier du Chef',            src: 'assets/audio/rooms/chief_door.mp3' },
  'chief-adrian':     { label: 'Adrian — Message Final',          room: 'Quartier du Chef (AR)',        src: 'assets/audio/rooms/chief_adrian.mp3' },
  'security-door':    { label: 'Sécurité',                        room: 'Sécurité',                     src: 'assets/audio/rooms/security_door.mp3' },
  'security-victor':  { label: 'Victor — Protocole 5',            room: 'Sécurité',                     src: 'assets/audio/rooms/security_victor.mp3' },
  'security-clear':   { label: 'Rien à signaler',                 room: 'Sécurité (AR)',                src: 'assets/audio/rooms/security_clear.mp3' },
  'servers-door':     { label: 'Salle des Serveurs',              room: 'Salle des Serveurs',           src: 'assets/audio/rooms/servers_door.mp3' },
  'servers-elodie':   { label: 'Élodie — Désespoir',              room: 'Salle des Serveurs',           src: 'assets/audio/rooms/servers_elodie.mp3' },
  'servers-t4':       { label: 'Carte Dr. Adrian — Code T4',      room: 'Salle des Serveurs (AR)',      src: 'assets/audio/rooms/servers_t4.mp3' },
};

/**
 * Paper fragments — collected via SEFY:PAPER:<n>
 * Images in assets/images/Message_N.png
 */
export const PAPER_CATALOG = {
  '1': { label: 'Papier #1', image: 'assets/images/Message_1.png', room: 'Centre de Commandement' },
  '2': { label: 'Papier #2', image: 'assets/images/Message_2.png', room: 'Quartier du Chef' },
  '3': { label: 'Papier #3', image: 'assets/images/Message_3.png', room: 'Salle des Serveurs' },
  '4': { label: 'Papier #4', image: 'assets/images/Message_4.png', room: 'Module de Décontamination' },
};

/**
 * AR card with code (found in Puzzle 4 AR scan).
 * When clicked in inventory, zooms to reveal the code.
 */
export const CARD_CODES = {
  'tier3-card': { label: 'CARTE TIER 3', code: '110819805', description: 'Code PROMOTE Tier 3' },
  'tier4-card': { label: 'CARTE DR. ADRIAN', code: '999999999', description: 'Code PROMOTE Tier 4' },
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
  { time: 22000, type: 'text',  text: 'Ensuite, la commande AR déverrouillera le scanner.' },
  { time: 26000, type: 'text',  text: 'En attendant, utilisez le scanner QR pour collecter les cartes d\'accès.' },
  { time: 30000, type: 'action', action: 'endBriefing' },
];
