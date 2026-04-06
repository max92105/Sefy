/**
 * ══════════════════════════════════════════════════════════════
 *  BRIEFINGS — Central lookup for all intro sequences.
 *
 *  Each stage folder has a config.js exporting INTRO_SEQUENCE.
 *  This module re-exports them as a single STAGE_INTROS map
 *  keyed by stage id, so consumers only need one import.
 * ══════════════════════════════════════════════════════════════
 */

import { INTRO_SEQUENCE as BRIEFING }              from './stages/mission-briefing/config.js';
import { INTRO_SEQUENCE as GEO_ACTIVATION }         from './stages/geo-activation/config.js';
import { INTRO_SEQUENCE as SCANNER_REBOOT }          from './stages/scanner-reboot/config.js';
import { INTRO_SEQUENCE as FIELD_OPS }               from './stages/field-ops/config.js';
import { INTRO_SEQUENCE as SEFY_ROGUE }              from './stages/sefy-rogue/config.js';

export const STAGE_INTROS = {
  'briefing':              BRIEFING,
  'geo-activation':        GEO_ACTIVATION,
  'scanner-reboot':        SCANNER_REBOOT,
  'field-ops':             FIELD_OPS,
  'sefy-rogue':            SEFY_ROGUE,
};
