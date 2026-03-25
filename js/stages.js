/**
 * Stage Navigation — loads stage data and manages stage transitions
 */

let stageData = null;

/** Fetch and cache the stage definitions */
export async function loadStageData() {
  if (stageData) return stageData;
  const resp = await fetch('data/stages.json');
  stageData = await resp.json();
  return stageData;
}

/** Get the meta info (title, timer, etc.) */
export function getMeta() {
  return stageData?.meta ?? null;
}

/** Get all stages as an array */
export function getAllStages() {
  return stageData?.stages ?? [];
}

/** Find a stage by its id */
export function getStageById(id) {
  return getAllStages().find(s => s.id === id) ?? null;
}

/** Get the first stage */
export function getFirstStage() {
  const stages = getAllStages();
  return stages.length ? stages[0] : null;
}

/** Get the next stage after a given stage id */
export function getNextStage(currentId) {
  const stage = getStageById(currentId);
  if (!stage || !stage.nextStage) return null;
  return getStageById(stage.nextStage);
}

/** Check if a stage is the finale */
export function isFinale(stageId) {
  const stage = getStageById(stageId);
  return stage?.type === 'finale';
}

/** Check if a stage should be accessible given solved puzzles */
export function isStageUnlocked(stageId, solvedPuzzles) {
  const stages = getAllStages();
  const target = stages.find(s => s.id === stageId);
  if (!target) return false;

  // First stage is always accessible
  if (target.order === 1) return true;

  // All previous stages must be solved
  for (const stage of stages) {
    if (stage.order < target.order && !solvedPuzzles.includes(stage.id)) {
      return false;
    }
  }
  return true;
}

/**
 * Hash an answer string using SHA-256.
 * Used for answer validation without exposing answers in source.
 * Returns hex string.
 */
export async function hashAnswer(answer) {
  const normalized = answer.trim().toUpperCase();
  const encoded = new TextEncoder().encode(normalized);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate a player's answer against the stored hash.
 * Returns true if correct.
 */
export async function validateAnswer(playerAnswer, expectedHash) {
  if (!expectedHash) return false;
  const playerHash = await hashAnswer(playerAnswer);
  return playerHash === expectedHash;
}
