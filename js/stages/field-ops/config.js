/**
 * Stage config: field-ops
 * Tabbed screen combining QR scanner and AR scanner.
 * AR tab is locked until tier 3 + AR terminal command.
 */

const MEDIA = {
  audioIntro:     'assets/audio/briefing 3.1.wav',
  audioConfirmed: 'assets/audio/briefing 3.2.wav',
  audioAR:        'assets/audio/briefing 3.1.wav',
};

/* ═══════════════  QR Item Catalogs  ═══════════════ */

/**
 * Audio logs found via SEFY:AUDIO:<id> QR codes.
 * Each entry maps id → { label, room, src }
 */
export const AUDIO_CATALOG = {
  'cmd-center':       { label: 'Centre de Commandement',          room: 'Centre de Commandement',          src: 'assets/audio/qr_title_centre_de_commande.wav' },
  'cmd-clear':        { label: 'Rien à signaler',                 room: 'Centre de Commandement (AR)',     src: 'assets/audio/qr_ar_rien_a_signale.wav' },
  'lab-door':         { label: 'Laboratoire Chimique',            room: 'Laboratoire Chimique',            src: 'assets/audio/qr_title_laboratoire_chimique.wav' },
  'lab-battle':       { label: 'Bataille Infecté',                room: 'Laboratoire Chimique',            src: 'assets/audio/qr_audio_log_laboratoire_chimique.wav' },
  'lab-virus':        { label: 'Présence Virus ARK-41',           room: 'Laboratoire Chimique (AR)',       src: 'assets/audio/qr_ar_ark41.wav' },
  'infirmary-door':   { label: 'Infirmerie',                      room: 'Infirmerie',                      src: 'assets/audio/qr_title_infirmerie.wav' },
  'infirmary-julien': { label: 'Julien Park — Dissection',        room: 'Infirmerie',                      src: 'assets/audio/qr_audio_log_infimerie.wav' },
  'infirmary-virus':  { label: 'Présence Virus ARK-41',           room: 'Infirmerie (AR)',                 src: 'assets/audio/qr_ar_ark41.wav' },
  'quarters-door':    { label: 'Quartier du Personnel',           room: 'Quartier du Personnel',           src: 'assets/audio/qr_title_quartier_du_personnel.wav' },
  'quarters-thomas':  { label: 'Thomas — Journal',                room: 'Quartier du Personnel',           src: 'assets/audio/qr_audio_log_quartier_du_personnel.wav' },
  'quarters-clear':   { label: 'Rien à signaler',                 room: 'Quartier du Personnel (AR)',      src: 'assets/audio/qr_ar_rien_a_signale.wav' },
  'science-door':     { label: 'Bureau Scientifique',             room: 'Bureau Scientifique',             src: 'assets/audio/qr_title_bureau_scientifique.wav' },
  'science-sofia':    { label: 'Sofia Ionescu — Dernier Message', room: 'Bureau Scientifique',             src: 'assets/audio/qr_audio_log_bureau_scientifique.wav' },
  'science-hint':     { label: 'Trouvez la fausse bombe',         room: 'Bureau Scientifique (AR)',        src: 'assets/audio/qr_ar_engin_explosif_trouve.wav' },
  'decon-door':       { label: 'Module de Décontamination',       room: 'Module de Décontamination',      src: null },
  'decon-personnel':  { label: 'Décontamination du Personnel',    room: 'Module de Décontamination',      src: 'assets/audio/qr_audio_log_module_de_décontamination.wav' },
  'decon-virus':      { label: 'Présence Virus ARK-41',           room: 'Module de Décontamination (AR)', src: 'assets/audio/qr_ar_ark41.wav' },
  'chief-door':       { label: 'Quartier du Chef Scientifique',   room: 'Quartier du Chef',               src: null },
  'chief-adrian':     { label: 'Adrian — Message Final',          room: 'Quartier du Chef (AR)',           src: null },
  'security-door':    { label: 'Sécurité',                        room: 'Sécurité',                        src: null },
  'security-victor':  { label: 'Victor — Protocole 5',            room: 'Sécurité',                        src: 'assets/audio/qr_audio_log_securite.wav' },
  'security-clear':   { label: 'Rien à signaler',                 room: 'Sécurité (AR)',                   src: 'assets/audio/qr_ar_rien_a_signale.wav' },
  'servers-door':     { label: 'Salle des Serveurs',              room: 'Salle des Serveurs',              src: null },
  'servers-elodie':   { label: 'Élodie — Désespoir',              room: 'Salle des Serveurs',              src: 'assets/audio/qr_audio_log_salle_des_serveurs.wav' },
  'servers-t4':       { label: 'Carte Dr. Adrian — Code T4',      room: 'Salle des Serveurs (AR)',         src: null },
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
  { time: 0,      type: 'text',  text: 'Module de Décryption réactiver.' },
  { time: 2000,   type: 'text',  text: 'Je peux maintenant facilement décrypter les notes des scientifiques.' },
  { time: 5000,  type: 'text',  text: 'Donnez-moi votre approbation pour réactiver le module sur votre appareil.' },
  { time: 9000,  type: 'action', action: 'requestCamera' },
{   time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioConfirmed },
  { time: 0,      type: 'text',  text: 'Accès confirmé.' },
  { time: 1000,   type: 'text',  text: 'Activation du scanner' },
  { time: 3000,   type: 'text',  text: 'Nous devons continuer d\’augmenter votre tier de sécurité pour pouvoir réactiver mon module environnementale.' },
  { time: 8000,   type: 'text',  text: 'Vous allez devoir fouiller le laboratoire avec l\’aide de mon module Décryption pour trouver le code Tier 3 manquant' },
  { time: 13000,   type: 'text',  text: 'A vous de jouer, agente.' },
  { time: 15500,   type: 'action', action: 'startScanner' },
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

/* ═══════════════  Hints  ═══════════════
   Tiered hints for this puzzle, shown in order (vague → précis).
   Add or remove entries to give this puzzle more or fewer hints.
   ════════════════════════════════════════════════════════════ */
export const HINTS = [
  { text: '[À COMPLÉTER — indice vague]' },
  { text: '[À COMPLÉTER — indice plus direct]' },
  { text: '[À COMPLÉTER — indice quasi-solution]' },
];
