/**
 * Screen: Geo Activation — SEFY intro cinematic briefing.
 *
 * After GEO is activated via the terminal, this screen plays the
 * briefing cinematic then calls onSolved to advance.
 * Code-entry form is kept for potential future use (lockdown).
 */

import { playBriefing } from '../../screens/stage-briefing.js';
import { createCodeEntryFormDOM, setupCodeEntryForm } from '../../components/code-entry-form.js';
import { saveState } from '../../state.js';
import { showScreen } from '../../ui.js';
import { INTRO_SEQUENCE } from './config.js';

const PREFIX = 'geo-activation';

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';

  const layout = document.createElement('div');
  layout.className = 'stage-layout codeentry-layout';

  // Briefing plays on the shared overlay; this screen only holds the (optional)
  // code-entry form, kept hidden for potential future lockdown use.
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

  let intro;
  intro = playBriefing(INTRO_SEQUENCE, {
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

  // Briefing played on the shared briefing screen — navigate back to this stage.
  showScreen(`screen-${PREFIX}`);

  const puzzleEl = document.getElementById(`${PREFIX}-puzzle`);
  if (puzzleEl) puzzleEl.classList.remove('hidden');

  setupCodeEntryForm(stage, state, onSolved, PREFIX);
}
