/**
 * Hint Registry — single lookup for per-stage hints authored in each
 * stage's config.js (`export const HINTS`).
 *
 * To change a puzzle's hints, edit the HINTS array in that stage's config.js.
 * The number of entries = the number of hints available for that puzzle.
 *
 * scanner-reboot is special: it's a route, so its hints are defined PER ROOM
 * (ROOM_HINTS, keyed by route step id). getHintContext() resolves the active
 * room from state so the player sees the right room's hints.
 */

import { HINTS as geoActivation }  from './geo-activation/config.js';
import { HINTS as sefyRogue }      from './sefy-rogue/config.js';
import { HINTS as deactivateSefy } from './deactivate-sefy/config.js';
import { ROUTES as scannerRoutes, ROOM_HINTS as scannerRoomHints } from './scanner-reboot/config.js';
import { PHASE_HINTS as fieldOpsPhaseHints } from './field-ops/config.js';

const HINT_REGISTRY = {
  'geo-activation':  geoActivation,
  'sefy-rogue':      sefyRogue,
  'deactivate-sefy': deactivateSefy,
};

/** Get the flat hints array for a stage id (empty array if none / per-room). */
export function getStageHints(stageId) {
  return HINT_REGISTRY[stageId] || [];
}

/**
 * Resolve the active hint set + tracking key for a stage given current state.
 * - Most stages: one hint set, keyed by stage id.
 * - scanner-reboot: the current room's hints, keyed by `scanner-reboot:<roomId>`.
 * - field-ops: the current phase's hints (scanner / ar), keyed by `field-ops:<phase>`.
 *   Each context's reveals are tracked independently by its key.
 * @returns {{ key: string, hints: Array }}
 */
export function getHintContext(stage, state) {
  if (stage.id === 'scanner-reboot') {
    const agent = (state && state.playerAgent) || 'emy';
    const route = scannerRoutes[agent] || scannerRoutes.emy;
    const step = route[(state && state.routeStep) || 0];
    const roomId = step ? step.id : null;
    return {
      key: roomId ? `scanner-reboot:${roomId}` : 'scanner-reboot',
      hints: (roomId && scannerRoomHints[roomId]) || [],
    };
  }
  if (stage.id === 'field-ops') {
    const phase = (state && state.arActivated) ? 'ar' : 'scanner';
    return { key: `field-ops:${phase}`, hints: fieldOpsPhaseHints[phase] || [] };
  }
  return { key: stage.id, hints: HINT_REGISTRY[stage.id] || [] };
}
