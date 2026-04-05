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
} from './firebase-config.js';

export { fbOnStateChange } from './firebase-config.js';

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

/** Unlock a lock station */
export function unlockStation(state, stationId) {
  if (!state.unlockedStations) state.unlockedStations = [];
  if (!state.unlockedStations.includes(stationId)) {
    state.unlockedStations.push(stationId);
    saveState(state);
    return true;
  }
  return false;
}

/** Check if player has a specific keycard */
export function hasKeycard(state, cardId) {
  return (state.keycards || []).includes(cardId);
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
  return Date.now() - new Date(state.timestamps.start).getTime();
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
