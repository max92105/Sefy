/**
 * Terminal session state — tracks the logged-in agent, inactivity,
 * and handles logout (with screen wipe so next user starts clean).
 */

import { INACTIVITY_TIMEOUT } from './config.js';
import { clearScreen, printLine, typeLine, delay, setPrompt, setStatus, hideInputLine } from './io.js';

/* ═══════════════  Session State  ═══════════════ */

let loggedIn    = false;
let agentName   = null;   // display code the agent typed (e.g. '456D79')
let agentId     = null;   // 'emy' | 'lea'
let agentState  = null;   // object pulled from Firebase
let staffMode   = false;  // true when logged in as staff (Victor / Élodie)
let terminalId  = null;   // '1' | '2' | '3' — set from URL ?t= param
let currentDir  = '/';
let usedCodes   = new Set();
let commandHistory = [];
let historyIndex   = -1;
let inactivityTimer = null;
let onLogoutCallback = null;
let pendingConfirm  = null; // { handler: async fn(input), label: string }

/** Register a callback invoked after logout completes (to show login prompt). */
export function onLogout(fn) { onLogoutCallback = fn; }

/* ── Getters / setters (used by other modules) ── */

export function isLoggedIn()  { return loggedIn; }
export function isStaff()     { return staffMode; }
export function getAgentName() { return agentName; }
export function getAgentId()   { return agentId; }
export function getAgentState() { return agentState; }
export function getCurrentDir() { return currentDir; }
export function setCurrentDir(d) { currentDir = d || '/'; }
export function getTerminalId()   { return terminalId; }
export function setTerminalId(id) { terminalId = id; }

export function getCommandHistory() { return commandHistory; }
export function getHistoryIndex()   { return historyIndex; }
export function setHistoryIndex(i)  { historyIndex = i; }

export function markCodeUsed(code) { usedCodes.add(code); }
export function isCodeUsed(code)   { return usedCodes.has(code); }

export function setPendingConfirm(handler) { pendingConfirm = handler; }
export function getPendingConfirm()  { return pendingConfirm; }
export function clearPendingConfirm() { pendingConfirm = null; }

/* Called after successful login */
export function setSession(name, id, state, staff = false) {
  loggedIn  = true;
  staffMode = staff;
  agentName = name;
  agentId   = id;
  agentState = state;
  currentDir = '/';
  usedCodes.clear();
  commandHistory = [];
  historyIndex   = -1;
}

export function setAgentState(state) { agentState = state; }

/* ═══════════════  Inactivity Timer  ═══════════════ */

export function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (!loggedIn) return;
  inactivityTimer = setTimeout(() => doLogout(true), INACTIVITY_TIMEOUT);
}

/* ═══════════════  Logout  ═══════════════ */

export async function doLogout(auto = false) {
  if (!loggedIn) return;
  if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }

  loggedIn   = false;
  staffMode  = false;
  agentName  = null;
  agentId    = null;
  agentState = null;
  currentDir = '/';
  pendingConfirm = null;

  // Wipe screen so next user can't see previous session
  hideInputLine();
  clearScreen();

  if (auto) {
    await typeLine('Session expirée — inactivité détectée.', 'warning');
  } else {
    await typeLine('Déconnexion…', 'warning');
  }
  await delay(500);
  printLine('Session terminée.', 'dim');
  printLine('');
  setStatus('HORS LIGNE', false);
  if (onLogoutCallback) onLogoutCallback();
}

export function pushHistoryEntry(cmd) {
  commandHistory.push(cmd);
  historyIndex = commandHistory.length;
}
