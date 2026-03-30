/**
 * State Management — localStorage wrapper for mission progress
 */

const STORAGE_KEY = 'operation-raven-state';

/** Default state for a fresh mission */
function createDefaultState() {
  return {
    missionStarted: false,
    currentStage: null,
    solvedPuzzles: [],
    hintsUsed: {},
    inventory: [],
    keycards: [],
    unlockedStations: [],
    stagePhase: {},
    timestamps: {},
    finalModeUnlocked: false,
    settings: {
      soundEnabled: true,
      musicEnabled: true
    }
  };
}

/** Load state from localStorage, or return default */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults so new fields are always present
      return { ...createDefaultState(), ...parsed };
    }
  } catch {
    // Corrupted data — start fresh
  }
  return createDefaultState();
}

/** Save state to localStorage */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — fail silently for now
  }
}

/** Reset all progress */
export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
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
