/**
 * Hint Registry — single lookup for per-stage hints authored in each
 * stage's config.js (`export const HINTS`).
 *
 * To change a puzzle's hints, edit the HINTS array in that stage's config.js.
 * The number of entries = the number of hints available for that puzzle.
 */

import { HINTS as geoActivation }  from './geo-activation/config.js';
import { HINTS as scannerReboot }  from './scanner-reboot/config.js';
import { HINTS as fieldOps }       from './field-ops/config.js';
import { HINTS as sefyRogue }      from './sefy-rogue/config.js';
import { HINTS as deactivateSefy } from './deactivate-sefy/config.js';

const HINT_REGISTRY = {
  'geo-activation':  geoActivation,
  'scanner-reboot':  scannerReboot,
  'field-ops':       fieldOps,
  'sefy-rogue':      sefyRogue,
  'deactivate-sefy': deactivateSefy,
};

/** Get the hints array for a stage id (empty array if none defined). */
export function getStageHints(stageId) {
  return HINT_REGISTRY[stageId] || [];
}
