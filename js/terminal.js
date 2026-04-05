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
 */

/* ═══════════════  Config  ═══════════════ */

const AGENT_HASHES = {
  '1c1ba6c2628afd47c9e1c57cf6ac548daedfc75a71874f0f2a10c84dbb1640fe': 'emy',
  '130111a9374da4888cf316006ce27b082c6dc1c90bcdd4aa2b5cae31a347808f': 'lea',
};

/* ── Firebase init ── */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBl7-2Ck4vxIQm1vI6AAFkbnnN6hCr1LHc",
  authDomain: "sefy-c1d5f.firebaseapp.com",
  databaseURL: "https://sefy-c1d5f-default-rtdb.firebaseio.com",
  projectId: "sefy-c1d5f",
  storageBucket: "sefy-c1d5f.firebasestorage.app",
  messagingSenderId: "332667273145",
  appId: "1:332667273145:web:0f0db32eaa2584ef964068",
};
if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const fbDb = firebase.database();

const BOOT_LINES = [
  { text: 'SEFY FACILITY TERMINAL v2.4.1', delay: 600, cls: 'dim' },
  { text: 'Initialisation du système…', delay: 800, cls: '' },
  { text: 'Connexion au réseau interne… ██████████ OK', delay: 1200, cls: '' },
  { text: 'ATTENTION: Protocole de sécurité actif', delay: 800, cls: 'warning' },
  { text: 'Authentification requise.', delay: 600, cls: 'bright' },
];

/**
 * Action codes — when an agent enters one of these, something happens.
 * Each action has:
 *   code: what the agent types
 *   response: array of lines to display
 *   giveCode: (optional) a code the terminal gives back to the agent
 *   once: (optional) can only be used once per session
 */
const ACTION_CODES = [
  {
    code: 'STATUS',
    response: [
      '╔══════════════════════════════════════╗',
      '║   ÉTAT DES SYSTÈMES DE L\'INSTALLATION  ║',
      '╠══════════════════════════════════════╣',
      '║ Réseau interne .......... EN LIGNE   ║',
      '║ Module SEFY ............. COMPROMIS   ║',
      '║ Protocole PURGE ......... ACTIF       ║',
      '║ Contrôle d\'accès ........ VERROUILLÉ  ║',
      '╚══════════════════════════════════════╝',
    ],
  },
  {
    code: 'AIDE',
    response: [
      'Alias pour HELP.',
    ],
    alias: 'HELP',
  },
];

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
let agentId = null;          // 'emy' or 'lea' — maps to server state file
let agentState = null;       // shared state pulled from server
let currentDir = '/';
let usedCodes = new Set();
let commandHistory = [];
let historyIndex = -1;
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 15000; // 15 seconds

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (!loggedIn) return;
  inactivityTimer = setTimeout(() => doLogout(true), INACTIVITY_TIMEOUT);
}

async function doLogout(auto = false) {
  if (!loggedIn) return;
  if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
  loggedIn = false;
  agentName = null;
  agentId = null;
  currentDir = '/';
  printBlank();
  if (auto) {
    await typeLine('Session expirée — inactivité détectée.', 'warning');
  } else {
    await typeLine('Déconnexion…', 'warning');
  }
  await delay(500);
  printLine('Session terminée.', 'dim');
  printBlank();
  loginPrompt();
}

/* ═══════════════  Firebase State Helpers  ═══════════════ */

async function fetchAgentState(id) {
  try {
    const snap = await fbDb.ref(`agents/${id}`).once('value');
    return snap.val() || null;
  } catch { return null; }
}

function pushAgentState(id, state) {
  fbDb.ref(`agents/${id}`).set(state).catch(() => {});
}

/* ═══════════════  DOM  ═══════════════ */

const output = document.getElementById('term-output');
const input = document.getElementById('term-input');
const inputLine = document.getElementById('term-input-line');
const promptEl = document.getElementById('term-prompt');

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
  const id = AGENT_HASHES[hash];

  if (id) {
    agentName = code.trim().toUpperCase();
    agentId = id;
    loggedIn = true;

    // Pull shared state from server
    agentState = await fetchAgentState(agentId);

    printLine(`> ${code}`, 'input-echo');
    printBlank();
    await typeLine('✓ AUTHENTIFICATION RÉUSSIE', 'success');
    await delay(400);
    await typeLine(`Bienvenue, Agent ${agentName}.`, 'bright');
    resetInactivityTimer();
    await delay(300);
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

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toUpperCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'HELP':
      showHelp();
      break;
    case 'AIDE':
      showHelp();
      break;
    case 'CLEAR':
    case 'CLS':
      output.innerHTML = '';
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
      printLine(`Agent ${agentName}`, 'bright');
      break;
    case 'DECRYPT':
      await handleDecrypt();
      break;
    case '546967232':
      await handleTierUpgrade();
      break;
    case 'LOGOUT':
    case 'EXIT':
      await doLogout();
      return;
    default:
      // Try as action code
      if (!handleActionCode(cmd)) {
        printLine(`Commande inconnue: ${cmd}`, 'error');
        printLine('Tapez HELP pour la liste des commandes.', 'dim');
      }
      break;
  }

  printBlank();
  showInputLine();
}

function showHelp() {
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
    '║  CLEAR / CLS ... Effacer l\'\u00e9cran      ║',
    '║  WHOAMI ........ Identité de l\'agent  ║',
    '║  LOGOUT ........ Se déconnecter       ║',
  ];
  if (agentState && agentState.accessTier >= 2) {
    lines.push('╠═══════════════════════════════════════╣');
    lines.push('║  DECRYPT ....... Activer décryptage   ║');
  }
  lines.push('╠═══════════════════════════════════════╣');
  lines.push('║  Entrez un CODE D\'ACTION pour agir.   ║');
  lines.push('╚═══════════════════════════════════════╝');
  printLines(lines);
}

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

/* ═══════════════  Tier Upgrade & Decrypt  ═══════════════ */

async function handleTierUpgrade() {
  if (!agentState) {
    printLine('Erreur: état de l\'agent non disponible.', 'error');
    return;
  }
  if (agentState.accessTier >= 2) {
    printLine('Niveau d\'accès déjà au maximum autorisé.', 'warning');
    return;
  }
  agentState.accessTier = 2;
  pushAgentState(agentId, agentState);
  printBlank();
  await typeLine('╔═══════════════════════════════════╗', 'success');
  await typeLine('║   NIVEAU D\'ACCÈS AUGMENTÉ → T2    ║', 'success');
  await typeLine('╚═══════════════════════════════════╝', 'success');
  printBlank();
  printLine('Nouvelles commandes débloquées. Tapez HELP.', 'bright');
}

async function handleDecrypt() {
  if (!agentState) {
    printLine('Erreur: état de l\'agent non disponible.', 'error');
    return;
  }
  if (!agentState.accessTier || agentState.accessTier < 2) {
    printLine('✗ ACCÈS REFUSÉ — Niveau d\'accès insuffisant.', 'error');
    printLine('Tier 2 requis. Entrez le code d\'accès pour augmenter votre niveau.', 'dim');
    return;
  }
  if (agentState.decryptActivated) {
    printLine('Module de décryptage déjà activé.', 'warning');
    return;
  }
  agentState.decryptActivated = true;
  pushAgentState(agentId, agentState);
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

  // Future: hook into actual audio/video playback
  printLine(`Lecture de ${name}…`, 'bright');
  printLine('(Fonctionnalité en développement)', 'warning');
}

/* ═══════════════  Input Handler  ═══════════════ */

function onSubmit() {
  const val = input.value;
  clearInput();
  resetInactivityTimer();

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
