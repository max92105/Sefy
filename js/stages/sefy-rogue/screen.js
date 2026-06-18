/**
 * Screen: SEFY Rogue — "Protocole PURGE".
 *
 * Plays the reveal (briefing 5), starts the real 20-min countdown, then reuses
 * the field-ops scanner for the 3-colour-card hunt. The player reads each card's
 * code (zoom in inventory) and runs OVERRIDE on the matching-colour terminal;
 * once all 3 overrides are done the stage advances to deactivate-sefy.
 */

import { playBriefing } from '../../screens/stage-briefing.js';
import { saveState, solvePuzzle } from '../../state.js';
import { resetBanner, getDeadlineISO } from '../../components/banner.js';
import { showFailureScreen } from '../../screens/results.js';
import { startColorHunt } from '../field-ops/screen.js';
import { INTRO_SEQUENCE } from './config.js';

const PREFIX = 'sefy-rogue';
const PURGE_MINUTES = 20;

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  // Host screen only — the puzzle reuses the field-ops scanner and the shared
  // briefing screen, so it needs no markup of its own.
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';
  section.innerHTML = '<div class="stage-layout"></div>';
  return section;
}

/* ═══════════════  Start  ═══════════════ */

export function start(stage, state, onSolved) {
  const onHuntComplete = () => {
    solvePuzzle(state, stage.id);
    onSolved(stage);
  };

  // Resume: the reveal already played → straight to the colour hunt.
  // (app.js resumes the 20-min PURGE timer from the saved deadline.)
  if (state.purgeActive) {
    return startColorHunt(stage, state, onHuntComplete);
  }

  // First time: play briefing 5 (the reveal). The real countdown starts
  // mid-briefing (showCountdown); the colour hunt starts when it ends (complete).
  let huntCleanup = null;
  let intro;
  intro = playBriefing(INTRO_SEQUENCE, {
    showCountdown() {
      state.purgeActive = true; // reveal done → fake bomb + PURGE countdown
      resetBanner(PURGE_MINUTES, () => {
        // Timer reached zero → death ending (persisted as a final save point).
        state.ending = 'death';
        saveState(state);
        showFailureScreen();
      });
      state.timestamps = state.timestamps || {};
      state.timestamps.deadline = getDeadlineISO(); // persist the 20-min deadline
      saveState(state);
    },
    complete() {
      intro.hide();
      huntCleanup = startColorHunt(stage, state, onHuntComplete);
      return 'stop';
    },
  });

  return () => {
    if (intro) intro.cleanup();
    if (huntCleanup) huntCleanup();
  };
}
