/**
 * State Management — Firebase-backed with localStorage cache.
 *
 * Each agent (emy / lea) has their own node in Firebase Realtime Database.
 * The playerAgent field determines which node to use.
 * Before agent selection, state lives only in localStorage.
 * Once playerAgent is set, every save also pushes to Firebase.
 */

import {
  fbLoadState,
  fbSaveState,
  fbResetAgent,
  fbOnStateChange,
  createDefaultState,
  getDeviceId,
} from './firebase-config.js';

export { fbOnStateChange } from './firebase-config.js';
export { getDeviceId } from './firebase-config.js';

const STORAGE_KEY = 'operation-raven-state';

/** Load state from localStorage (fast, sync), or return default */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...createDefaultState(), ...parsed };
    }
  } catch { /* corrupted — start fresh */ }
  return createDefaultState();
}

/**
 * Pull the latest state from Firebase for a specific agent.
 * Falls back to localStorage if the fetch fails.
 */
export async function fetchState(agent) {
  if (!agent) return loadState();
  try {
    const state = await fbLoadState(agent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch { /* offline — fall back */ }
  return loadState();
}

/** Save state to localStorage AND push to Firebase if agent is known */
export function saveState(state) {
  // Stamp this device's ID on every save
  state.deviceId = getDeviceId();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage issue */ }

  // Fire-and-forget push to Firebase
  const agent = state.playerAgent;
  if (agent) {
    fbSaveState(agent, state).catch(() => { /* offline — localStorage still has it */ });
  }
}

/** Reset all progress (local only — use resetAgent for Firebase) */
export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return createDefaultState();
}

/**
 * Overwrite local state directly, WITHOUT the Firebase merge-push.
 * Used by the admin checkpoint tool (which force-pushes Firebase separately)
 * so a backward reset isn't undone by fbSaveState's "keep higher" merge.
 */
export function setLocalState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage issue */ }
  return state;
}

/**
 * Reset a specific agent's state in Firebase AND locally.
 * @param {string} agent — 'emy' or 'lea'
 */
export async function resetAgent(agent) {
  try {
    await fbResetAgent(agent);
  } catch { /* best-effort */ }
  const current = loadState();
  if (current.playerAgent === agent) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createDefaultState();
}

/** Mark a puzzle as solved */
export function solvePuzzle(state, puzzleId) {
  if (!state.solvedPuzzles.includes(puzzleId)) {
    state.solvedPuzzles.push(puzzleId);
  }
  state.timestamps[puzzleId] = new Date().toISOString();
  saveState(state);
  return state;
}

/** Append an entry to the agent's live system log */
export function addLogEntry(state, text) {
  if (!state.systemLog) state.systemLog = [];
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} `
    + `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  state.systemLog.push(`[${ts}] ${text}`);
  saveState(state);
  return state;
}

/** Record a hint used for a puzzle */
export function useHint(state, puzzleId) {
  if (!state.hintsUsed[puzzleId]) {
    state.hintsUsed[puzzleId] = 0;
  }
  state.hintsUsed[puzzleId]++;
  saveState(state);
  return state;
}

/** Add an item to inventory */
export function addInventoryItem(state, itemId) {
  if (!state.inventory.includes(itemId)) {
    state.inventory.push(itemId);
  }
  saveState(state);
  return state;
}

/** Add a keycard (RED, BLUE, YELLOW) */
export function addKeycard(state, cardId) {
  if (!state.keycards) state.keycards = [];
  if (!state.keycards.includes(cardId)) {
    state.keycards.push(cardId);
    saveState(state);
    return true; // new card
  }
  return false; // already had it
}

/** Advance to a specific stage */
export function setStage(state, stageId) {
  state.currentStage = stageId;
  state.timestamps[stageId] = new Date().toISOString();
  saveState(state);
  return state;
}

/** Start the mission */
export function startMission(state) {
  state.missionStarted = true;
  state.timestamps.start = new Date().toISOString();
  saveState(state);
  return state;
}

/** Get total hints used across all puzzles */
export function getTotalHints(state) {
  return Object.values(state.hintsUsed).reduce((sum, n) => sum + n, 0);
}

/** Get elapsed time since mission start in ms, or 0 */
export function getElapsedMs(state) {
  if (!state.timestamps.start) return 0;
  // Freeze at the completion time once an ending is reached (so the score is
  // stable across refreshes); otherwise count up live.
  const end = state.timestamps.end ? new Date(state.timestamps.end).getTime() : Date.now();
  return end - new Date(state.timestamps.start).getTime();
}

/** Number of unique things the player discovered (curiosity metric). */
export function getDiscoveryCount(state) {
  return (state.loggedScans || []).length;
}

/**
 * Compute the end-of-mission score as an itemized breakdown (so the end screen
 * can show a satisfying, varied calculation). Rewards speed + curiosity,
 * penalizes hints. Not meant to be perfect — just a fun comparison metric.
 */
export function computeScore(state) {
  const elapsedMs  = getElapsedMs(state);
  const elapsedMin = elapsedMs / 60000;

  const scans      = state.loggedScans || [];
  const intelReads = scans.filter(k => String(k).startsWith('read:')).length; // terminal files read
  const fieldFinds = scans.length - intelReads;                               // scans / pickups
  const hints      = getTotalHints(state);

  // Minutes left on the PURGE countdown when the mission ended.
  let purgeLeftMin = 0;
  if (state.timestamps?.deadline && state.timestamps?.end) {
    purgeLeftMin = Math.max(0,
      (new Date(state.timestamps.deadline).getTime() - new Date(state.timestamps.end).getTime()) / 60000);
  }

  const breakdown = [
    { label: 'Mission accomplie',    value: 1000 },
    { label: 'Rapidité',             value: Math.max(0, Math.round((90 - elapsedMin) * 20)) },
    { label: 'Temps restant',        value: Math.round(purgeLeftMin * 40) },
    { label: 'Découvertes terrain',  value: fieldFinds * 50 },
    { label: 'Renseignement',        value: intelReads * 30 },
    { label: 'Indices utilisés',     value: -(hints * 150) },
  ];
  if (state.ending === 'victory')      breakdown.push({ label: 'Immunisation', value: 1000 });
  else if (state.ending === 'survive') breakdown.push({ label: 'Évacuation',   value: 300 });

  const score = Math.max(0, breakdown.reduce((sum, it) => sum + it.value, 0));
  return { score, breakdown, elapsedMs, discoveries: scans.length, hints };
}

/** Star rating label for a score. */
export function scoreRating(score) {
  if (score >= 5000) return '★★★ LÉGENDE';
  if (score >= 3500) return '★★ AGENT D\'ÉLITE';
  if (score >= 2000) return '★ AGENT CONFIRMÉ';
  return 'RECRUE';
}

/** Update a settings value */
export function updateSetting(state, key, value) {
  state.settings[key] = value;
  saveState(state);
  return state;
}

/**
 * Generate a simple resume code — base64 encoded compact state.
 * Not cryptographically secure, just a convenience backup.
 */
export function generateResumeCode(state) {
  const compact = {
    s: state.currentStage,
    p: state.solvedPuzzles,
    t: state.timestamps.start
  };
  return btoa(JSON.stringify(compact));
}

/** Restore from a resume code */
export function restoreFromResumeCode(code) {
  try {
    const compact = JSON.parse(atob(code));
    const state = createDefaultState();
    state.missionStarted = true;
    state.currentStage = compact.s;
    state.solvedPuzzles = compact.p || [];
    state.timestamps.start = compact.t;
    saveState(state);
    return state;
  } catch {
    return null;
  }
}

/**
 * Check whether this device is allowed to use the given agent.
 * Returns true if OK, false if another device owns that agent.
 * @param {string} agent — 'emy' or 'lea'
 */
export async function checkDeviceLock(agent) {
  if (!agent) return true;
  try {
    const remote = await fbLoadState(agent);
    if (!remote || !remote.deviceId) return true;          // no owner yet
    return remote.deviceId === getDeviceId();               // same device?
  } catch {
    return true; // offline — allow
  }
}
