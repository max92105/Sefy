/**
 * Screen: Geo Activation — SEFY intro cinematic briefing.
 *
 * After GEO is activated via the terminal, this screen plays the
 * briefing cinematic then calls onSolved to advance.
 * Code-entry form is kept for potential future use (lockdown).
 */

import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { createCodeEntryFormDOM, setupCodeEntryForm } from '../../components/code-entry-form.js';
import { saveState } from '../../state.js';
import { INTRO_SEQUENCE } from './config.js';

const PREFIX = 'geo-activation';

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';

  const layout = document.createElement('div');
  layout.className = 'stage-layout codeentry-layout';

  layout.appendChild(createIntroCinematicDOM(PREFIX));
  layout.appendChild(createCodeEntryFormDOM(PREFIX));

  section.appendChild(layout);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

export function start(stage, state, onSolved) {
  // If intro already watched, just call onSolved immediately
  if (state.stagePhase && state.stagePhase[stage.id] === 'done') {
    onSolved(stage);
    return () => {};
  }

  const puzzleEl = document.getElementById(`${PREFIX}-puzzle`);
  if (puzzleEl) puzzleEl.classList.add('hidden');

  const intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, {
    complete() {
      intro.hide();
      onSolved(stage);
      return 'stop';
    },
    // Keep showCodeEntry for backward compat / future lockdown use
    showCodeEntry() {
      intro.hide();
      transitionToCodeEntry(stage, state, onSolved);
      return 'stop';
    },
  });

  return () => { intro.cleanup(); };
}

/* ═══════════════  Phase transitions (kept for code-entry reuse)  ═══════════════ */

function transitionToCodeEntry(stage, state, onSolved) {
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'code-entry';
  saveState(state);

  const introEl  = document.getElementById(`${PREFIX}-intro`);
  const puzzleEl = document.getElementById(`${PREFIX}-puzzle`);
  if (introEl)  introEl.classList.add('hidden');
  if (puzzleEl) puzzleEl.classList.remove('hidden');

  setupCodeEntryForm(stage, state, onSolved, PREFIX);
}
