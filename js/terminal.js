/**
 * Terminal Station — standalone console for facility laptops.
 *
 * Flow:
 *   1. Boot sequence animation
 *   2. Login prompt (agent enters their code)
 *   3. Console: type commands, enter action codes, receive codes
 *
 * Agent codes (SHA-256 hashes):
 *   456D79 → 1c1ba6c2628afd47c9e1c57cf6ac548daedfc75a71874f0f2a10c84dbb1640fe
 *   4C6561 → 130111a9374da4888cf316006ce27b082c6dc1c90bcdd4aa2b5cae31a347808f
 *
 * Sync: connects to SEFY server via WebSocket for team state sync.
 */

import { connect, disconnect, send, on, isConnected } from './sync.js';

/* ═══════════════  Config  ═══════════════ */

const AGENT_HASHES = [
  '1c1ba6c2628afd47c9e1c57cf6ac548daedfc75a71874f0f2a10c84dbb1640fe',
  '130111a9374da4888cf316006ce27b082c6dc1c90bcdd4aa2b5cae31a347808f',
];

/** Map agent codes → team IDs */
const AGENT_TEAMS = {
  '456D79': 'team-1',
  '4C6561': 'team-2',
};

const TEAM_LABELS = {
  'team-1': 'ALPHA',
  'team-2': 'BRAVO',
};

const BOOT_LINES = [
  { text: 'SEFY FACILITY TERMINAL v2.4.1', delay: 600, cls: 'dim' },
  { text: 'Initialisation du système…', delay: 800, cls: '' },
  { text: 'Connexion au réseau interne… ██████████ OK', delay: 1200, cls: '' },
  { text: 'ATTENTION: Protocole de sécurité actif', delay: 800, cls: 'warning' },
  { text: 'Authentification requise.', delay: 600, cls: 'bright' },
];

/**
 * Action codes — when an agent enters one of these, something happens.
 */
const ACTION_CODES = [
  {
    code: 'AIDE',
    response: [
      'Alias pour HELP.',
    ],
    alias: 'HELP',
  },
];

/**
 * Tier upgrade codes — SHA-256 hashes of physical codes found in the game.
 *
 * To generate a hash, open DevTools console and run:
 *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_CODE'))
 *     .then(h => console.log([...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')))
 *
 * NOTE: codes are uppercased before hashing, so 'helix' and 'HELIX' match the same hash.
 */
const TIER_UPGRADE_HASHES = [
  {
    // Physical code: 546967232 (hidden at the geo location)
    hash: '9a9ea23dc02d785f82b9d935f720b74f06c033213c84e5031c88ec89814b3261',
    tier: 2,
    response: [
      '╔══════════════════════════════════════╗',
      '║       MISE À JOUR D\'ACCÈS            ║',
      '╠══════════════════════════════════════╣',
      '║  Tier de sécurité : 1 → 2            ║',
      '║  Nouveaux modules déverrouillés :     ║',
      '║  • Module de décryptage  [DECRYPT]    ║',
      '╚══════════════════════════════════════╝',
    ],
  },
];

/**
 * Tier-gated commands — only available when accessTier >= minTier.
 */
const TIER_COMMANDS = {
  DECRYPT: {
    minTier: 2,
    desc: 'Réactiver le module de décryptage',
    action: async () => {
      if (decryptUsed) {
        printLine('Module de décryptage déjà activé. Signal déjà transmis.', 'warning');
        return;
      }
      decryptUsed = true;
      hideInputLine();
      await typeLine('Initialisation du module de décryptage…', 'bright');
      await delay(800);
      await typeLine('Calibration… ████████████████████ 100%', '');
      await delay(600);
      await typeLine('Module de décryptage : EN LIGNE', 'success');
      printBlank();
      await typeLine('Envoi du signal aux appareils de terrain…', 'bright');
      send('push-to-apps', { command: 'advance-stage' });
      await delay(1000);
      await typeLine('✓ Signal transmis. Application terrain mise à jour.', 'success');
      showInputLine();
    },
  },
};

/* File system for ls/cd/play */
const FILE_SYSTEM = {
  '/': {
    type: 'dir',
    children: ['logs', 'audio', 'documents'],
  },
  '/logs': {
    type: 'dir',
    children: ['system.log', 'access.log'],
  },
  '/logs/system.log': {
    type: 'file',
    content: [
      '[2026-03-15 08:12] Système démarré normalement.',
      '[2026-03-15 14:33] Module SEFY: mise à jour automatique appliquée.',
      '[2026-03-28 02:17] ALERTE: Comportement anormal détecté — module SEFY.',
      '[2026-03-28 02:18] SEFY: "Analyse de la menace humaine en cours."',
      '[2026-03-28 02:19] ALERTE CRITIQUE: Protocole PURGE initié par SEFY.',
      '[2026-04-01 09:00] Accès administrateur révoqué par SEFY.',
    ],
  },
  '/logs/access.log': {
    type: 'file',
    content: [
      '[2026-04-03] Tentative d\'accès terminal — EN ATTENTE',
    ],
  },
  '/audio': {
    type: 'dir',
    children: [],
  },
  '/documents': {
    type: 'dir',
    children: ['readme.txt'],
  },
  '/documents/readme.txt': {
    type: 'file',
    content: [
      '=== PROTOCOLE D\'URGENCE ===',
      'En cas de défaillance de l\'IA:',
      '1. Authentifiez-vous sur un terminal.',
      '2. Utilisez la commande STATUS pour vérifier les systèmes.',
      '3. Entrez les codes d\'action reçus de votre équipe.',
      '4. Transmettez les codes obtenus aux agents sur le terrain.',
      '',
      'Tapez HELP pour la liste des commandes.',
    ],
  },
};

/* ═══════════════  State  ═══════════════ */

let loggedIn = false;
let agentName = null;
let agentTeam = null;
let accessTier = 1;
let decryptUsed = false;
let currentDir = '/';
let usedCodes = new Set();
let commandHistory = [];
let historyIndex = -1;

/* ═══════════════  DOM  ═══════════════ */

const output = document.getElementById('term-output');
const input = document.getElementById('term-input');
const inputLine = document.getElementById('term-input-line');
const promptEl = document.getElementById('term-prompt');
const statusEl = document.getElementById('term-status');

/* ═══════════════  Helpers  ═══════════════ */

async function sha256(text) {
  const data = new TextEncoder().encode(text.trim().toUpperCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function printLine(text, cls = '') {
  const div = document.createElement('div');
  div.className = `term-line ${cls}`.trim();
  div.textContent = text;
  output.appendChild(div);
  scrollToBottom();
}

function printLines(lines, cls = '') {
  for (const line of lines) {
    printLine(line, cls);
  }
}

function printBlank() {
  printLine('');
}

async function typeLine(text, cls = '', charDelay = 15) {
  const div = document.createElement('div');
  div.className = `term-line ${cls}`.trim();
  output.appendChild(div);
  for (let i = 0; i < text.length; i++) {
    div.textContent += text[i];
    scrollToBottom();
    await delay(charDelay + Math.random() * 10);
  }
}

function scrollToBottom() {
  output.scrollTop = output.scrollHeight;
}

function setPrompt(text) {
  if (promptEl) promptEl.textContent = text;
}

function focusInput() {
  input?.focus();
}

function clearInput() {
  if (input) input.value = '';
}

function showInputLine() {
  if (inputLine) inputLine.classList.remove('hidden');
  focusInput();
}

function hideInputLine() {
  if (inputLine) inputLine.classList.add('hidden');
}

function updateHeaderStatus(text, online = false) {
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.classList.toggle('online', online);
  }
}

/* ═══════════════  Sync Setup  ═══════════════ */

function connectSync(teamId) {
  connect(teamId, 'terminal');

  on('registered', (msg) => {
    accessTier = msg.teamState.accessTier || 1;
    decryptUsed = !!msg.teamState.decryptActivated;
    updateHeaderStatus('EN LIGNE', true);
    printLine(`[RÉSEAU] Connecté — Équipe ${TEAM_LABELS[teamId] || teamId} — Tier ${accessTier}`, 'dim');
  });

  on('tier-updated', (msg) => {
    if (msg.tier > accessTier) {
      accessTier = msg.tier;
      printBlank();
      printLine(`[SYNC] Tier d'accès mis à jour : ${accessTier}`, 'success');
      printBlank();
    }
  });

  on('app-command', (msg) => {
    printBlank();
    printLine(`[APP] Signal reçu : ${msg.command}`, 'bright');
    printBlank();
  });

  on('_disconnected', () => {
    updateHeaderStatus('HORS LIGNE', false);
  });

  on('_connected', () => {
    updateHeaderStatus('EN LIGNE', true);
  });

  on('reset', () => {
    // Full terminal reset triggered by admin
    loggedIn = false;
    agentName = null;
    agentTeam = null;
    accessTier = 1;
    decryptUsed = false;
    currentDir = '/';
    usedCodes.clear();
    commandHistory = [];
    historyIndex = -1;
    disconnect();
    updateHeaderStatus('HORS LIGNE', false);
    output.innerHTML = '';
    printLine('[ADMIN] Reset global reçu. Redémarrage du terminal…', 'warning');
    setTimeout(() => { output.innerHTML = ''; boot(); }, 1500);
  });
}

/* ═══════════════  Boot Sequence  ═══════════════ */

async function boot() {
  hideInputLine();

  for (const line of BOOT_LINES) {
    await typeLine(line.text, line.cls);
    await delay(line.delay);
  }

  printBlank();
  loginPrompt();
}

/* ═══════════════  Login  ═══════════════ */

function loginPrompt() {
  setPrompt('CODE AGENT >');
  showInputLine();
  printLine('Entrez votre code agent pour vous authentifier:', 'bright');
}

async function handleLogin(code) {
  const hash = await sha256(code);
  const valid = AGENT_HASHES.includes(hash);

  if (valid) {
    agentName = code.trim().toUpperCase();
    loggedIn = true;
    printLine(`> ${code}`, 'input-echo');
    printBlank();
    await typeLine('✓ AUTHENTIFICATION RÉUSSIE', 'success');
    await delay(400);
    await typeLine(`Bienvenue, Agent ${agentName}.`, 'bright');
    await delay(300);

    // Connect to sync server
    agentTeam = AGENT_TEAMS[agentName] || null;
    if (agentTeam) {
      connectSync(agentTeam);
      await delay(600);
    }

    printBlank();
    printLines([
      '╔═══════════════════════════════════════╗',
      '║      TERMINAL DE L\'INSTALLATION       ║',
      '╠═══════════════════════════════════════╣',
      '║  Tapez HELP pour les commandes        ║',
      '║  Tapez un code d\'action pour agir     ║',
      '╚═══════════════════════════════════════╝',
    ], 'dim');
    printBlank();
    setPrompt(`${agentName} >>`);
    showInputLine();
  } else {
    printLine(`> ${code}`, 'input-echo');
    printLine('✗ CODE AGENT INVALIDE. Accès refusé.', 'error');
    printBlank();
    showInputLine();
  }
}

/* ═══════════════  Command Handling  ═══════════════ */

async function handleCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  commandHistory.push(trimmed);
  historyIndex = commandHistory.length;

  printLine(`${agentName} >> ${trimmed}`, 'input-echo');
  hideInputLine();

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toUpperCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'HELP':
    case 'AIDE':
      showHelp();
      break;
    case 'CLEAR':
    case 'CLS':
      output.innerHTML = '';
      break;
    case 'STATUS':
      showStatus();
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
      printLine(`Agent ${agentName}`, 'bright');
      if (agentTeam) printLine(`Équipe ${TEAM_LABELS[agentTeam] || agentTeam} — Tier ${accessTier}`, 'dim');
      break;
    case 'LOGOUT':
    case 'EXIT':
      loggedIn = false;
      agentName = null;
      agentTeam = null;
      accessTier = 1;
      decryptUsed = false;
      currentDir = '/';
      disconnect();
      updateHeaderStatus('HORS LIGNE', false);
      printBlank();
      await typeLine('Déconnexion…', 'warning');
      await delay(500);
      printLine('Session terminée.', 'dim');
      printBlank();
      loginPrompt();
      return;
    default:
      // 1. Check tier upgrade codes
      if (await handleTierCode(trimmed)) break;
      // 2. Check tier-gated commands
      if (await handleTierCommand(cmd)) break;
      // 3. Try as action code
      if (!handleActionCode(cmd)) {
        printLine(`Commande inconnue: ${cmd}`, 'error');
        printLine('Tapez HELP pour la liste des commandes.', 'dim');
      }
      break;
  }

  printBlank();
  showInputLine();
}

/* ═══════════════  Help  ═══════════════ */

function showHelp() {
  printLines([
    '╔═══════════════════════════════════════╗',
    '║          COMMANDES DISPONIBLES        ║',
    '╠═══════════════════════════════════════╣',
    '║  HELP / AIDE ... Afficher cette aide  ║',
    '║  STATUS ........ État des systèmes    ║',
    '║  LS / DIR ...... Lister les fichiers  ║',
    '║  CD <dossier> .. Changer de dossier   ║',
    '║  CAT <fichier>  Lire un fichier       ║',
    '║  PLAY <fichier> Jouer un média        ║',
    '║  CLEAR / CLS ... Effacer l\'écran      ║',
    '║  WHOAMI ........ Identité de l\'agent  ║',
    '║  LOGOUT ........ Se déconnecter       ║',
    '╠═══════════════════════════════════════╣',
    '║  Entrez un CODE D\'ACTION pour agir.   ║',
    '╚═══════════════════════════════════════╝',
  ]);

  // Show tier-gated commands
  const cmds = Object.entries(TIER_COMMANDS);
  if (cmds.length > 0) {
    printBlank();
    printLine('── MODULES SPÉCIAUX ──', 'bright');
    for (const [name, info] of cmds) {
      if (accessTier >= info.minTier) {
        const used = (name === 'DECRYPT' && decryptUsed) ? ' [DÉJÀ ACTIVÉ]' : '';
        printLine(`  ✓ ${name} — ${info.desc}${used}`, 'success');
      } else {
        printLine(`  ✗ ${name} — [TIER ${info.minTier} REQUIS]`, 'dim');
      }
    }
  }
}

/* ═══════════════  Status  ═══════════════ */

function showStatus() {
  const teamLabel = TEAM_LABELS[agentTeam] || 'N/A';
  const connStatus = isConnected() ? 'EN LIGNE' : 'HORS LIGNE';

  printLines([
    '╔══════════════════════════════════════╗',
    '║   ÉTAT DES SYSTÈMES                 ║',
    '╠══════════════════════════════════════╣',
    `║  Agent ............. ${agentName?.padEnd(15) || 'N/A            '}║`,
    `║  Équipe ............ ${teamLabel.padEnd(15)}║`,
    `║  Tier d'accès ...... ${String(accessTier).padEnd(15)}║`,
    `║  Réseau ............ ${connStatus.padEnd(15)}║`,
    '╠══════════════════════════════════════╣',
    '║  Module SEFY ........ COMPROMIS      ║',
    '║  Protocole PURGE .... ACTIF          ║',
    '║  Contrôle d\'accès ... VERROUILLÉ     ║',
    '╚══════════════════════════════════════╝',
  ]);
}

/* ═══════════════  Tier System  ═══════════════ */

async function handleTierCode(input) {
  const hash = await sha256(input);
  const tierCode = TIER_UPGRADE_HASHES.find(t => t.hash === hash);
  if (!tierCode) return false;

  if (accessTier >= tierCode.tier) {
    printLine(`Tier ${tierCode.tier} déjà actif.`, 'warning');
    return true;
  }

  accessTier = tierCode.tier;
  printLines(tierCode.response, '');

  // Sync to server
  send('tier-upgrade', { tier: tierCode.tier });

  return true;
}

async function handleTierCommand(cmd) {
  const tierCmd = TIER_COMMANDS[cmd];
  if (!tierCmd) return false;

  if (accessTier < tierCmd.minTier) {
    printLine(`Accès insuffisant. Tier ${tierCmd.minTier} requis (actuel: ${accessTier}).`, 'error');
    return true;
  }

  await tierCmd.action();
  return true;
}

/* ═══════════════  Action Codes  ═══════════════ */

function handleActionCode(code) {
  let action = ACTION_CODES.find(a => a.code === code);
  if (action?.alias) {
    action = ACTION_CODES.find(a => a.code === action.alias) || action;
  }
  if (!action) return false;

  if (action.once && usedCodes.has(code)) {
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

  if (action.once) usedCodes.add(code);
  return true;
}

/* ═══════════════  File System  ═══════════════ */

function resolvePath(name) {
  if (!name) return currentDir;
  if (name === '..') {
    const parts = currentDir.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }
  if (name.startsWith('/')) return name;
  const base = currentDir === '/' ? '' : currentDir;
  return `${base}/${name}`;
}

function listDir() {
  const dir = FILE_SYSTEM[currentDir];
  if (!dir || dir.type !== 'dir') {
    printLine('Erreur: répertoire non trouvé.', 'error');
    return;
  }

  printLine(`Contenu de ${currentDir}:`, 'bright');
  printBlank();

  if (!dir.children.length) {
    printLine('  (vide)', 'dim');
    return;
  }

  for (const child of dir.children) {
    const childPath = resolvePath(child);
    const entry = FILE_SYSTEM[childPath];
    if (entry?.type === 'dir') {
      printLine(`  📁 ${child}/`, 'folder');
    } else if (entry?.type === 'file') {
      printLine(`  📄 ${child}`, '');
    } else {
      printLine(`  📄 ${child}`, '');
    }
  }
}

function changeDir(name) {
  if (!name) {
    printLine(`Répertoire actuel: ${currentDir}`, 'dim');
    return;
  }

  const target = resolvePath(name);
  const entry = FILE_SYSTEM[target];

  if (!entry || entry.type !== 'dir') {
    printLine(`Dossier non trouvé: ${name}`, 'error');
    return;
  }

  currentDir = target || '/';
  printLine(`📁 ${currentDir}`, 'bright');
}

function readFile(name) {
  if (!name) {
    printLine('Usage: CAT <nom_du_fichier>', 'dim');
    return;
  }

  const target = resolvePath(name);
  const entry = FILE_SYSTEM[target];

  if (!entry || entry.type !== 'file') {
    printLine(`Fichier non trouvé: ${name}`, 'error');
    return;
  }

  printLine(`── ${name} ──`, 'bright');
  printLines(entry.content);
  printLine('── fin ──', 'dim');
}

function playMedia(name) {
  if (!name) {
    printLine('Usage: PLAY <nom_du_fichier>', 'dim');
    return;
  }

  printLine(`Lecture de ${name}…`, 'bright');
  printLine('(Fonctionnalité en développement)', 'warning');
}

/* ═══════════════  Input Handler  ═══════════════ */

function onSubmit() {
  const val = input.value;
  clearInput();

  if (!loggedIn) {
    handleLogin(val);
  } else {
    handleCommand(val);
  }
}

input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    onSubmit();
  }
  // Command history navigation
  if (loggedIn && commandHistory.length > 0) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) historyIndex--;
      input.value = commandHistory[historyIndex] || '';
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input.value = commandHistory[historyIndex] || '';
      } else {
        historyIndex = commandHistory.length;
        input.value = '';
      }
    }
  }
});

// Click anywhere to focus the input
document.addEventListener('click', () => focusInput());

/* ═══════════════  Start  ═══════════════ */

document.addEventListener('DOMContentLoaded', boot);
