/**
 * Terminal boot sequence + login authentication.
 */

import { AGENT_HASHES, STAFF_HASHES, BOOT_LINES } from './config.js';
import { fetchAgentState } from './firebase.js';
import { sha256, delay, printLine, printLines, printBlank, typeLine, setPrompt, setStatus, showInputLine, hideInputLine, clearScreen } from './io.js';
import { setSession, resetInactivityTimer } from './state.js';

/* ═══════════════  Boot  ═══════════════ */

export async function boot() {
  hideInputLine();

  for (const line of BOOT_LINES) {
    await typeLine(line.text, line.cls);
    await delay(line.delay);
  }

  printBlank();
  loginPrompt();
}

/* ═══════════════  Login  ═══════════════ */

export function loginPrompt() {
  setPrompt('CODE ACCÈS >');
  setStatus('EN ATTENTE', false);
  showInputLine();
  printLine('Entrez votre code d\'accès pour vous authentifier:', 'bright');
}

export async function handleLogin(code) {
  const hash = await sha256(code);
  const agentId = AGENT_HASHES[hash];
  const staffEntry = STAFF_HASHES[hash];

  if (!agentId && !staffEntry) {
    printLine(`> ${code}`, 'input-echo');
    printLine('✗ CODE INVALIDE. Accès refusé.', 'error');
    printBlank();
    showInputLine();
    return;
  }

  if (staffEntry) {
    return handleStaffLogin(staffEntry);
  }

  // Agent login
  const agentName = code.trim().toUpperCase();
  const agentState = await fetchAgentState(agentId);

  setSession(agentName, agentId, agentState, false);
  resetInactivityTimer();
  clearScreen();

  await typeLine('✓ AUTHENTIFICATION RÉUSSIE', 'success');
  await delay(400);

  const tier = agentState?.accessTier || 1;
  await typeLine(`Bienvenue, Agent ${agentName}.  [Tier ${tier}]`, 'bright');
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
  setStatus(`Agent ${agentName} — Tier ${tier}`, true);
  showInputLine();
}

/* ═══════════════  Staff Login  ═══════════════ */

async function handleStaffLogin(staff) {
  setSession(staff.name, null, null, true);
  resetInactivityTimer();
  clearScreen();

  await typeLine('✓ AUTHENTIFICATION SÉCURITÉ', 'success');
  await delay(400);
  await typeLine(`${staff.role}`, 'bright');
  resetInactivityTimer();
  await delay(300);

  printBlank();
  printLines([
    '╔═══════════════════════════════════════╗',
    '║       ADMINISTRATION SÉCURITÉ         ║',
    '╠═══════════════════════════════════════╣',
    '║  Accès limité — promotion agents      ║',
    '║                                       ║',
    '║  PROMOTE <agent> <code_tier>           ║',
    '║  Promouvoit un agent au tier associé  ║',
    '║  au code fourni.                      ║',
    '╠═══════════════════════════════════════╣',
    '║  Tapez HELP pour les commandes        ║',
    '╚═══════════════════════════════════════╝',
  ], 'dim');
  printBlank();

  setPrompt(`${staff.name} >>`);
  setStatus(`Admin Sécurité`, true);
  showInputLine();
}
