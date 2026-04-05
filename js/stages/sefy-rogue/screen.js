/**
 * Screen: SEFY Rogue — dramatic reveal intro + bypass code entry.
 *
 * Composes intro-cinematic and code-entry-form components.
 * Same structure as geo-activation but with different config/narrative.
 */

import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { createCodeEntryFormDOM, setupCodeEntryForm } from '../../components/code-entry-form.js';
import { saveState } from '../../state.js';
import { INTRO_SEQUENCE } from './config.js';

const PREFIX = 'sefy-rogue';

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
  if (!INTRO_SEQUENCE || (state.stagePhase && state.stagePhase[stage.id] === 'code-entry')) {
    return resumeCodeEntry(stage, state, onSolved);
  }

  const puzzleEl = document.getElementById(`${PREFIX}-puzzle`);
  if (puzzleEl) puzzleEl.classList.add('hidden');

  const intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, {
    showCodeEntry() {
      intro.hide();
      transitionToCodeEntry(stage, state, onSolved);
      return 'stop';
    },
  });

  return () => { intro.cleanup(); };
}

/* ═══════════════  Phase transitions  ═══════════════ */

function resumeCodeEntry(stage, state, onSolved) {
  const introEl  = document.getElementById(`${PREFIX}-intro`);
  const puzzleEl = document.getElementById(`${PREFIX}-puzzle`);
  if (introEl)  introEl.classList.add('hidden');
  if (puzzleEl) puzzleEl.classList.remove('hidden');

  return setupCodeEntryForm(stage, state, onSolved, PREFIX);
}

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
