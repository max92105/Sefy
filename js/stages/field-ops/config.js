/**
 * Stage config: field-ops
 * Tabbed screen combining QR scanner and AR scanner.
 * AR tab is locked until tier 3 + AR terminal command.
 */

const MEDIA = {
  audioIntro:     'assets/briefings/briefing 3.1.wav',
  audioConfirmed: 'assets/briefings/briefing 3.2.wav',
  audioAR:        'assets/briefings/briefing 4.wav',
};

/** Sound effects played during field-ops (QR item collected, AR object located). */
export const SFX = {
  positionFound: 'assets/scanner-reboot/loc_position_trouve.wav', // reused from scanner-reboot
};

/* ═══════════════  QR Item Catalogs  ═══════════════
   The catalog an id lives in defines what happens when its QR is scanned:
     ROOM_TITLE_CATALOG → SEFY:AUDIO — plays to announce the room, NOT collected.
     AR_CUE_CATALOG     → SEFY:AUDIO — plays an AR scan cue,      NOT collected.
     AUDIO_CATALOG      → SEFY:AUDIO — plays the audio, collected + replayable.
     VIDEO_LOG_CATALOG  → SEFY:VIDEO — plays the video, collected + replayable.
   ════════════════════════════════════════════════════════════════ */

/** Room-title cues — played so the player knows which room they entered. */
export const ROOM_TITLE_CATALOG = {
  'cmd-center':     { label: 'Centre de Commandement',        room: 'Centre de Commandement',        src: 'assets/field-ops/scanner/commandement/qr_title_centre_de_commande.wav' },
  'lab-door':       { label: 'Laboratoire Chimique',          room: 'Laboratoire Chimique',          src: 'assets/field-ops/scanner/laboratoire/qr_title_laboratoire_chimique.wav' },
  'infirmary-door': { label: 'Infirmerie',                    room: 'Infirmerie',                    src: 'assets/field-ops/scanner/infirmerie/qr_title_infirmerie.wav' },
  'quarters-door':  { label: 'Quartier du Personnel',         room: 'Quartier du Personnel',         src: 'assets/field-ops/scanner/quartier_personnel/qr_title_quartier_du_personnel.wav' },
  'science-door':   { label: 'Bureau Scientifique',           room: 'Bureau Scientifique',           src: 'assets/field-ops/scanner/science/qr_title_bureau_scientifique.wav' },
  'decon-door':     { label: 'Module de Décontamination',     room: 'Module de Décontamination',     src: 'assets/field-ops/scanner/decontamination/qr_title_decontamination.wav' },
  'chief-door':     { label: 'Quartier du Chef Scientifique', room: 'Quartier du Chef',              src: 'assets/field-ops/scanner/quartier_chef_scientifique/qr_title_quartier_chef_scientifique.wav' },
  'security-door':  { label: 'Sécurité',                      room: 'Sécurité',                      src: 'assets/field-ops/scanner/securite/qr_title_securite.wav' },
  'servers-door':   { label: 'Salle des Serveurs',            room: 'Salle des Serveurs',            src: 'assets/field-ops/scanner/serveurs/qr_title_serveurs.wav' },
};

/** Video logs — play a video, collected and replayable from the inventory. */
export const VIDEO_LOG_CATALOG = {
  'chief-adrian': { label: 'Adrian — Message Final', room: 'Quartier du Chef (AR)', src: 'assets/field-ops/ar/quartier_chef_scientifique/adrian_video_log.mp4' },
};

/** AR scan cues (qr_ar_*) — played during AR scanning. NOT collected. */
export const AR_CUE_CATALOG = {
  'cmd-clear':       { label: 'Rien à signaler',         room: 'Centre de Commandement (AR)',    src: 'assets/field-ops/ar/commandement/qr_ar_rien_a_signale.wav' },
  'lab-virus':       { label: 'Présence Virus ARK-41',   room: 'Laboratoire Chimique (AR)',      src: 'assets/field-ops/ar/laboratoire/qr_ar_ark41.wav' },
  'infirmary-virus': { label: 'Présence Virus ARK-41',   room: 'Infirmerie (AR)',                src: 'assets/field-ops/ar/infirmerie/qr_ar_ark41.wav' },
  'quarters-clear':  { label: 'Rien à signaler',         room: 'Quartier du Personnel (AR)',     src: 'assets/field-ops/ar/quartier_personnel/qr_ar_rien_a_signale.wav' },
  'science-hint':    { label: 'Engin explosif localisé', room: 'Bureau Scientifique (AR)',       src: 'assets/field-ops/ar/science/qr_ar_engin_explosif_trouve.wav' },
  'decon-virus':     { label: 'Présence Virus ARK-41',   room: 'Module de Décontamination (AR)', src: 'assets/field-ops/ar/decontamination/qr_ar_ark41.wav' },
  'security-clear':  { label: 'Rien à signaler',         room: 'Sécurité (AR)',                  src: 'assets/field-ops/ar/securite/qr_ar_rien_a_signale.wav' },
  'servers-card4':   { label: 'Carte d\'accès 4',        room: 'Salle des Serveurs (AR)',        src: 'assets/field-ops/ar/serveurs/card_found.wav' },
};

/** Audio logs — play an audio clip, collected and replayable from the inventory. */
export const AUDIO_CATALOG = {
  'lab-battle':       { label: 'Bataille Infecté',                room: 'Laboratoire Chimique',      src: 'assets/field-ops/scanner/laboratoire/qr_audio_log_laboratoire_chimique.wav' },
  'infirmary-julien': { label: 'Julien Park — Dissection',        room: 'Infirmerie',                src: 'assets/field-ops/scanner/infirmerie/qr_audio_log_infimerie.wav' },
  'quarters-hana':    { label: 'Hana — Journal',                  room: 'Quartier du Personnel',     src: 'assets/field-ops/scanner/quartier_personnel/qr_audio_log_quartier_du_personnel.wav' },
  'science-sofia':    { label: 'Sofia Ionescu — Dernier Message', room: 'Bureau Scientifique',       src: 'assets/field-ops/scanner/science/qr_audio_log_bureau_scientifique.wav' },
  'decon-personnel':  { label: 'Décontamination du Personnel',    room: 'Module de Décontamination', src: 'assets/field-ops/scanner/decontamination/qr_audio_log_module_de_décontamination.wav' },
  'security-victor':  { label: 'Victor — Protocole 5',            room: 'Sécurité',                  src: 'assets/field-ops/scanner/securite/qr_audio_log_securite.wav' },
  'servers-elodie':   { label: 'Élodie — Désespoir',              room: 'Salle des Serveurs',        src: 'assets/field-ops/scanner/serveurs/qr_audio_log_salle_des_serveurs.wav' },
};

/**
 * Classify a SEFY:AUDIO:<id> code.
 *   kind 'play'  → room titles & AR cues: played only, never collected.
 *   kind 'audio' → collectable audio log.
 * (Video logs use SEFY:VIDEO:<id> + VIDEO_LOG_CATALOG, handled separately.)
 * @returns {{ kind: 'play'|'audio', entry: object } | null}
 */
export function classifyAudioQR(id) {
  if (ROOM_TITLE_CATALOG[id]) return { kind: 'play',  cat: 'room', entry: ROOM_TITLE_CATALOG[id] };
  if (AR_CUE_CATALOG[id])     return { kind: 'play',  cat: 'cue',  entry: AR_CUE_CATALOG[id] };
  if (AUDIO_CATALOG[id])      return { kind: 'audio', cat: 'log',  entry: AUDIO_CATALOG[id] };
  return null;
}

/**
 * Paper fragments — collected via SEFY:PAPER:<n>
 * Images live in each room's scanner folder (assets/field-ops/scanner/<room>/message_N.png)
 */
export const PAPER_CATALOG = {
  '1': { label: 'Papier #1', image: 'assets/field-ops/scanner/commandement/message_1.png', room: 'Centre de Commandement' },
  '2': { label: 'Papier #2', image: 'assets/field-ops/scanner/quartier_chef_scientifique/message_2.png', room: 'Quartier du Chef' },
  '3': { label: 'Papier #3', image: 'assets/field-ops/scanner/serveurs/message_3.png', room: 'Salle des Serveurs' },
  '4': { label: 'Papier #4', image: 'assets/field-ops/scanner/decontamination/message_4.png', room: 'Module de Décontamination' },
};

/**
 * Cards with codes — all scanned via SEFY:CARD:<id>. Tapping one in the
 * inventory zooms it to reveal the code.
 *   ADRIAN → Tier-4 card, found via the AR module (SEFY:CARD:ADRIAN).
 *   RED / BLUE / YELLOW → colour cards for the PURGE terminal OVERRIDEs,
 *     found by QR scan (SEFY:CARD:RED, etc.).
 * (There is no Tier 3 card: the paper clues give the info to escalate to Tier 3.)
 */
export const CARD_CODES = {
  'ADRIAN': { label: 'CARTE DR. ADRIAN', code: '999999999',   description: 'Code PROMOTE Tier 4',            css: '#7CFC00' },
  'RED':    { label: 'CARTE ROUGE',      code: '524544',       description: 'Code OVERRIDE — terminal rouge', css: '#ff3040' },
  'BLUE':   { label: 'CARTE BLEUE',      code: '424C5545',     description: 'Code OVERRIDE — terminal bleu',  css: '#4488ff' },
  'YELLOW': { label: 'CARTE JAUNE',      code: '59454C4C4F57', description: 'Code OVERRIDE — terminal jaune', css: '#f5c542' },
};

/**
 * Adrian's single vaccine dose — found by QR scan (SEFY:SERINGE), added to the
 * inventory as "SERINGE ÉTRANGE". Using it from the inventory cures the agent of
 * ARK-41 and unlocks the true ending. Its meaning is explained by the Tier-4
 * audio confession in the terminal (PLAY ADRIAN_CONFESSION.wav).
 */
export const SERINGE = {
  qr: 'SEFY:SERINGE',
  label: 'SERINGE ÉTRANGE',
  description: 'Une seringue contenant une dose d\'un liquide inconnu.',
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
    description: 'Dispositif explosif localisé. Accès tier 4 requis pour le désamorçage.',
    seekDirection: { yaw: 180, pitch: 30 },
    seekTolerance: 25,
    seekHint: 'Retournez-vous et regardez vers le bas…',
  },
  {
    id: 'ADRIAN',
    qrCode: 'SEFY:CARD:ADRIAN',
    label: 'CARTE ACCÈS TIER 4',
    icon: '🪪',
    description: 'Carte d\'accès reconstruite. Autorisation tier 4 obtenue.',
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
  { time: 0, type: 'action', action: 'playAudio', src: MEDIA.audioAR },
  { time: 0, type: 'text',  text: 'Module Environnementale réactiver.' },
  { time: 3000, type: 'text',  text: 'Nous pouvons maintenant trouver la bombe, mais je vais avoir besoin d\'accès tier 4 pour pouvoir la désamorcer.' },
  { time: 8000, type: 'text',  text: 'Avec mon module opérationnel je suis aussi capable de reconstruire des objets qui ne sont plus présents.' },
  { time: 13000, type: 'text',  text: 'Trouvé la carte d\'accès d\'Adrian et augmenter votre accès au Tier 4.' },
  { time: 20000, type: 'action', action: 'endBriefing' },
];

/* ═══════════════  Hints (per phase)  ═══════════════
   field-ops has two phases, each with its own hint list (vague → précis):
     'scanner' → before AR is activated (QR scanning / reach Tier 3).
     'ar'      → after AR is activated (AR scanning).
   Reveals are tracked separately per phase.
   ════════════════════════════════════════════════════════════ */
export const PHASE_HINTS = {
  scanner: [
    { text: '[À COMPLÉTER — phase scanner QR, indice vague]' },
    { text: '[À COMPLÉTER — phase scanner QR, indice plus direct]' },
  ],
  ar: [
    { text: '[À COMPLÉTER — phase scanner AR, indice vague]' },
    { text: '[À COMPLÉTER — phase scanner AR, indice plus direct]' },
  ],
};
