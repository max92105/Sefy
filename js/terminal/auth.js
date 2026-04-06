/**
 * Terminal boot sequence + login authentication.
 */

import { AGENT_HASHES, BOOT_LINES } from './config.js';
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
  setPrompt('CODE AGENT >');
  setStatus('EN ATTENTE', false);
  showInputLine();
  printLine('Entrez votre code agent pour vous authentifier:', 'bright');
}

export async function handleLogin(code) {
  const hash = await sha256(code);
  const id = AGENT_HASHES[hash];

  if (!id) {
    printLine(`> ${code}`, 'input-echo');
    printLine('✗ CODE AGENT INVALIDE. Accès refusé.', 'error');
    printBlank();
    showInputLine();
    return;
  }

  const agentName = code.trim().toUpperCase();

  // Pull shared state from Firebase (includes accessTier)
  const agentState = await fetchAgentState(id);

  setSession(agentName, id, agentState);
  resetInactivityTimer();

  // Clear any leftover boot / previous-session lines
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
  setStatus('EN LIGNE', true);
  showInputLine();
}
