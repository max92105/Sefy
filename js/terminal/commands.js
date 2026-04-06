/**
 * Terminal command dispatch — HELP, action codes, tier upgrade, decrypt.
 */

import { ACTION_CODES, AGENT_HASHES } from './config.js';
import { fetchAgentState, pushAgentState, updateAgentFields } from './firebase.js';
import { printLine, printLines, printBlank, typeLine, delay, clearScreen, sha256 } from './io.js';
import {
  getAgentName, getAgentId, getAgentState, setAgentState,
  isCodeUsed, markCodeUsed, resetInactivityTimer, doLogout, pushHistoryEntry,
  isStaff,
} from './state.js';
import { listDir, changeDir, readFile, playMedia } from './filesystem.js';

/* ═══════════════  Log helper  ═══════════════ */

function appendLog(state, text) {
  if (!state) return;
  if (!state.systemLog) state.systemLog = [];
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} `
    + `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  state.systemLog.push(`[${ts}] ${text}`);
}

/* ═══════════════  Main dispatcher  ═══════════════ */

export async function handleCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  resetInactivityTimer();
  pushHistoryEntry(trimmed);

  const agentName = getAgentName();
  printLine(`${agentName} >> ${trimmed}`, 'input-echo');

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toUpperCase();
  const args = parts.slice(1);

  /* ── Staff-restricted commands ── */
  const AGENT_ONLY = ['DECRYPT', 'ACTIVATEAR', 'STATUS'];
  if (isStaff()) {
    // Staff can only use: HELP, CLEAR, LS, CD, CAT, PLAY, WHOAMI, PROMOTE, LOGOUT
    if (AGENT_ONLY.includes(cmd) || cmd === '546967232' || cmd === '843937233') {
      printLine('✗ ACCÈS REFUSÉ — Commande réservée aux agents terrain.', 'error');
      printLine('Ce terminal de supervision n\'est pas lié au protocole agent SEFY.', 'dim');
      printBlank();
      return;
    }
    if (cmd === 'PROMOTE') {
      await handlePromote(args);
      printBlank();
      return;
    }
    // Check action codes — staff can't use them
    if (ACTION_CODES.find(a => a.code === cmd)) {
      printLine('✗ ACCÈS REFUSÉ — Codes d\'action réservés aux agents terrain.', 'error');
      printBlank();
      return;
    }
  }

  switch (cmd) {
    case 'HELP':
    case 'AIDE':
      showHelp();
      break;
    case 'CLEAR':
    case 'CLS':
      clearScreen();
      break;
    case 'STATUS':
      handleActionCode('STATUS');
      break;
    case 'LS':
    case 'DIR':
      listDir();
      break;
    case 'CD':
      changeDir(args[0]);
      break;
    case 'CAT':
    case 'READ':
    case 'LIRE':
      readFile(args[0]);
      break;
    case 'PLAY':
    case 'JOUER':
      playMedia(args[0]);
      break;
    case 'WHOAMI':
      if (isStaff()) {
        printLine(`Employé ${agentName}`, 'bright');
      } 
      else {
        printLine(`Agent ${agentName}`, 'bright');
      }
      break;
    case 'DECRYPT':
      await handleDecrypt();
      break;
    case 'ACTIVATEAR':
      await handleActivateAR();
      break;
    case 'PROMOTE':
      printLine('✗ ACCÈS REFUSÉ — Seul le personnel autorisé peut promouvoir un agent.', 'error');
      printLine('Demandez à un responsable de se connecter au terminal.', 'dim');
      break;
    case '546967232':
      await handleTierUpgrade(2);
      break;
    case '843937233':
      await handleTierUpgrade(3);
      break;
    case 'LOGOUT':
    case 'EXIT':
      await doLogout();
      return; // don't print blank / show input — doLogout does loginPrompt
    default:
      if (!handleActionCode(cmd)) {
        printLine(`Commande inconnue: ${cmd}`, 'error');
        printLine('Tapez HELP pour la liste des commandes.', 'dim');
      }
      break;
  }

  printBlank();
}

/* ═══════════════  Help  ═══════════════ */

function showHelp() {
  if (isStaff()) {
    printLines([
      '╔═══════════════════════════════════════╗',
      '║     COMMANDES — SUPERVISION FACILITY  ║',
      '╠═══════════════════════════════════════╣',
      '║  HELP / AIDE ... Afficher cette aide  ║',
      '║  LS / DIR ...... Lister les fichiers  ║',
      '║  CD <dossier> .. Changer de dossier   ║',
      '║  CAT <fichier>  Lire un fichier       ║',
      '║  PLAY <fichier> Jouer un média        ║',
      '║  CLEAR / CLS ... Effacer l\'écran     ║',
      '║  WHOAMI ........ Identité courante    ║',
      '╠═══════════════════════════════════════╣',
      '║  PROMOTE <code>  Promouvoir un agent ║',
      '║                  (code agent requis)  ║',
      '╠═══════════════════════════════════════╣',
      '║  LOGOUT ........ Se déconnecter       ║',
      '╚═══════════════════════════════════════╝',
    ]);
    return;
  }

  const state = getAgentState();
  const lines = [
    '╔═══════════════════════════════════════╗',
    '║          COMMANDES DISPONIBLES        ║',
    '╠═══════════════════════════════════════╣',
    '║  HELP / AIDE ... Afficher cette aide  ║',
    '║  STATUS ........ État des systèmes    ║',
    '║  LS / DIR ...... Lister les fichiers  ║',
    '║  CD <dossier> .. Changer de dossier   ║',
    '║  CAT <fichier>  Lire un fichier       ║',
    '║  PLAY <fichier> Jouer un média        ║',
    '║  CLEAR / CLS ... Effacer l\'écran     ║',
    '║  WHOAMI ........ Identité de l\'agent ║',
    '║  LOGOUT ........ Se déconnecter       ║',
  ];
  if (state && state.accessTier >= 2) {
    lines.push('╠═══════════════════════════════════════╣');
    lines.push('║  DECRYPT ....... Activer décryptage   ║');
  }
  if (state && state.accessTier >= 3) {
    lines.push('║  ACTIVATEAR .... Activer scanner AR   ║');
  }
  lines.push('╠═══════════════════════════════════════╣');
  lines.push('║  Entrez un CODE D\'ACTION pour agir.  ║');
  lines.push('╚═══════════════════════════════════════╝');
  printLines(lines);
}

/* ═══════════════  Action Codes  ═══════════════ */

function handleActionCode(code) {
  let action = ACTION_CODES.find(a => a.code === code);
  if (action?.alias) {
    action = ACTION_CODES.find(a => a.code === action.alias) || action;
  }
  if (!action) return false;

  if (action.once && isCodeUsed(code)) {
    printLine('Ce code a déjà été utilisé.', 'warning');
    return true;
  }

  printLines(action.response);

  if (action.giveCode) {
    printBlank();
    printLine('╔═══════════════════════════════════╗', 'success');
    printLine(`║  CODE OBTENU: ${action.giveCode.padEnd(19)}║`, 'success');
    printLine('╚═══════════════════════════════════╝', 'success');
    printLine('Transmettez ce code à votre équipe.', 'bright');
  }

  if (action.once) markCodeUsed(code);
  return true;
}

/* ═══════════════  Tier Upgrade  ═══════════════ */

async function handleTierUpgrade(targetTier) {
  const state = getAgentState();
  const id = getAgentId();
  if (!state) {
    printLine('Erreur: état de l\'agent non disponible.', 'error');
    return;
  }
  if (state.accessTier >= targetTier) {
    printLine(`Niveau d'accès déjà ≥ Tier ${targetTier}.`, 'warning');
    return;
  }
  state.accessTier = targetTier;
  appendLog(state, `ACCÈS TIER ${targetTier} AUTORISÉ — Agent ${getAgentName()}.`);
  if (targetTier === 2) appendLog(state, 'SEFY - Tentative de décryptage anticipée.');
  setAgentState(state);
  updateAgentFields(id, { accessTier: state.accessTier, systemLog: state.systemLog });
  printBlank();
  await typeLine('╔═══════════════════════════════════╗', 'success');
  await typeLine(`║   NIVEAU D'ACCÈS AUGMENTÉ → T${targetTier}    ║`, 'success');
  await typeLine('╚═══════════════════════════════════╝', 'success');
  printBlank();
  printLine('Nouvelles commandes débloquées. Tapez HELP.', 'bright');
}

/* ═══════════════  Decrypt  ═══════════════ */

async function handleDecrypt() {
  const state = getAgentState();
  const id = getAgentId();
  if (!state) {
    printLine('Erreur: état de l\'agent non disponible.', 'error');
    return;
  }
  if (!state.accessTier || state.accessTier < 2) {
    printLine('✗ ACCÈS REFUSÉ — Niveau d\'accès insuffisant.', 'error');
    printLine('Tier 2 requis. Entrez le code d\'accès pour augmenter votre niveau.', 'dim');
    return;
  }
  if (state.decryptActivated) {
    printLine('Module de décryptage déjà activé.', 'warning');
    return;
  }
  state.decryptActivated = true;
  appendLog(state, 'MODULE DE DÉCRYPTAGE ACTIVÉ.');
  appendLog(state, 'SEFY - Accès aux données internes détecté.');
  setAgentState(state);
  updateAgentFields(id, { decryptActivated: true, systemLog: state.systemLog });
  printBlank();
  await typeLine('Initialisation du module de décryptage…', 'bright');
  await delay(800);
  await typeLine('Connexion aux serveurs SEFY…', '');
  await delay(600);
  await typeLine('╔═══════════════════════════════════╗', 'success');
  await typeLine('║  MODULE DE DÉCRYPTAGE — EN LIGNE  ║', 'success');
  await typeLine('╚═══════════════════════════════════╝', 'success');
  printBlank();
  printLine('Le module de décryptage est maintenant opérationnel.', 'bright');
  printLine('Confirmez avec votre équipe sur le terrain.', 'dim');
}

/* ═══════════════  Activate AR  ═══════════════ */

async function handleActivateAR() {
  const state = getAgentState();
  const id = getAgentId();
  if (!state) {
    printLine('Erreur: état de l\'agent non disponible.', 'error');
    return;
  }
  if (!state.accessTier || state.accessTier < 3) {
    printLine('✗ ACCÈS REFUSÉ — Niveau d\'accès insuffisant.', 'error');
    printLine('Tier 3 requis pour activer le module AR.', 'dim');
    return;
  }
  if (state.arActivated) {
    printLine('Module AR déjà activé.', 'warning');
    return;
  }
  state.arActivated = true;
  appendLog(state, 'MODULE AR ACTIVÉ.');
  appendLog(state, 'SEFY - Scanner environnemental en ligne.');
  appendLog(state, 'PROTOCOLE 5 ACTIVÉ');
  appendLog(state, 'SEFY - VERROUILLAGE DES ACCÈS.');
  setAgentState(state);
  updateAgentFields(id, { arActivated: true, systemLog: state.systemLog });
  printBlank();
  await typeLine('Initialisation du scanner environnemental…', 'bright');
  await delay(800);
  await typeLine('Calibration des capteurs AR…', '');
  await delay(600);
  await typeLine('╔═══════════════════════════════════╗', 'success');
  await typeLine('║   MODULE AR — EN LIGNE            ║', 'success');
  await typeLine('╚═══════════════════════════════════╝', 'success');
  printBlank();
  printLine('Le scanner AR est maintenant disponible sur le terrain.', 'bright');
  printLine('Vos agents peuvent accéder à l\'onglet AR.', 'dim');
}

/* ═══════════════  Promote (Staff only)  ═══════════════ */

async function handlePromote(args) {
  const code = (args[0] || '').trim().toUpperCase();
  if (!code) {
    printLine('Usage: PROMOTE <code_agent>', 'warning');
    printLine('Entrez le code d\'identification de l\'agent à promouvoir.', 'dim');
    return;
  }

  // Resolve agent code → agent id via hash
  const hash = await sha256(code);
  const agentId = AGENT_HASHES[hash];

  if (!agentId) {
    printLine(`✗ Code agent "${code}" non reconnu.`, 'error');
    printLine('Vérifiez le code d\'identification de l\'agent.', 'dim');
    return;
  }

  const state = await fetchAgentState(agentId);
  if (!state) {
    printLine(`✗ Impossible de récupérer l'état de l'agent.`, 'error');
    return;
  }

  const agentLabel = agentId.toUpperCase();

  // Step 1: promote to tier 3
  if (state.accessTier < 3) {
    state.accessTier = 3;
    appendLog(state, `PROMOTE — Agent ${agentLabel} promu Tier 3 par ${getAgentName()}.`);
    appendLog(state, 'SEFY - Escalade de privilèges détectée.');
    appendLog(state, 'PROTOCOLE 3 ACTIVÉ');
    updateAgentFields(agentId, { accessTier: 3, systemLog: state.systemLog });

    printBlank();
    await typeLine('Autorisation de promotion en cours…', 'bright');
    await delay(600);
    await typeLine(`Mise à jour des accréditations de ${agentLabel}…`, '');
    await delay(500);
    await typeLine('╔═══════════════════════════════════╗', 'success');
    await typeLine(`║  AGENT ${agentLabel.padEnd(4)} PROMU → TIER 3       ║`, 'success');
    await typeLine('╚═══════════════════════════════════╝', 'success');
    printBlank();
    printLine(`L'agent ${agentLabel} dispose maintenant d'un accès Tier 3.`, 'bright');
    printLine('Utilisez à nouveau PROMOTE pour accorder le Tier 4.', 'dim');
    return;
  }

  // Step 2: promote to tier 4
  if (state.accessTier < 4) {
    state.accessTier = 4;
    appendLog(state, `PROMOTE — Agent ${agentLabel} promu Tier 4 par ${getAgentName()}.`);
    appendLog(state, 'SEFY - Escalade de privilèges critique.');
    appendLog(state, 'PROTOCOLE 7 ACTIVÉ');
    updateAgentFields(agentId, { accessTier: 4, systemLog: state.systemLog });

    printBlank();
    await typeLine('Autorisation de promotion avancée…', 'bright');
    await delay(600);
    await typeLine(`Élévation maximale de ${agentLabel}…`, '');
    await delay(500);
    await typeLine('╔═══════════════════════════════════╗', 'success');
    await typeLine(`║  AGENT ${agentLabel.padEnd(4)} PROMU → TIER 4       ║`, 'success');
    await typeLine('╚═══════════════════════════════════╝', 'success');
    printBlank();
    printLine(`L'agent ${agentLabel} dispose maintenant d'un accès Tier 4.`, 'bright');
    return;
  }

  // Already tier 4+
  printLine(`Agent ${agentLabel} est déjà Tier ${state.accessTier}.`, 'warning');
}
