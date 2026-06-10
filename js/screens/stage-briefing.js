/**
 * Shared Stage Briefing — ONE briefing screen (page) reused by every stage.
 *
 * A stage plays its briefing by passing its own config (its `INTRO_SEQUENCE`)
 * to playBriefing(). We navigate to this shared screen, play the cinematic,
 * and when it finishes the stage navigates on to its interactive screen. This
 * keeps the briefing "its own thing" with no per-stage copies of the DOM.
 */

import { showScreen } from '../ui.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../components/intro-cinematic.js';

export const BRIEFING_PREFIX = 'briefing-stage';
export const BRIEFING_SCREEN_ID = 'screen-stage-briefing';

/** Create the shared briefing screen (added with the other screens). */
export function createStageBriefingScreen() {
  const section = document.createElement('section');
  section.id = BRIEFING_SCREEN_ID;
  section.className = 'screen stage-screen';

  const layout = document.createElement('div');
  layout.className = 'stage-layout';
  layout.appendChild(createIntroCinematicDOM(BRIEFING_PREFIX));

  section.appendChild(layout);
  return section;
}

/**
 * Navigate to the briefing screen and play a stage's briefing.
 * @param {Array}  sequence — the stage's INTRO_SEQUENCE (its "config")
 * @param {object} handlers — action handlers; a terminal handler navigates on.
 * @returns the intro controller from startIntroCinematic ({ hide, cleanup }).
 */
export function playBriefing(sequence, handlers = {}) {
  showScreen(BRIEFING_SCREEN_ID);
  return startIntroCinematic(BRIEFING_PREFIX, sequence, handlers);
}
