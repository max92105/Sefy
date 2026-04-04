/**
 * Screen: Code Entry — reusable two-phase puzzle screen.
 *
 * Phase 1 (optional) — AI Intro Cinematic:
 *   SEFY video + typewriter text + timed audio.
 *
 * Phase 2 — Code Entry:
 *   Standard code-input form (reuses puzzle engine).
 *
 * Usage:
 *   startCodeEntry(stage, state, onSolved, introSequence)
 *   - introSequence: array of events (from a stage config file), or null to skip intro.
 */

import { delay } from '../ui.js';
import { setupCodeEntry } from '../puzzles.js';
import { hideFeedback } from '../ui.js';
import { saveState } from '../state.js';
import { runIntroSequence } from '../intro-runner.js';

/* ───────── Media (easy to change) ───────── */
const MEDIA = {
  video: 'assets/video/sefy_avatar.mp4',
};

/* ═══════════════  DOM  ═══════════════ */

export function createCodeEntryScreen() {
  const section = document.createElement('section');
  section.id = 'screen-codeentry';
  section.className = 'screen';
  section.innerHTML = `
    <div class="codeentry-layout">

      <!-- ── Phase 1: AI Intro Cinematic ── -->
      <div class="codeentry-intro" id="codeentry-intro">
        <div class="briefing-center" id="codeentry-intro-center">
          <video id="codeentry-avatar-video" class="ai-avatar-video" loop muted playsinline preload="auto">
            <source src="${MEDIA.video}" type="video/mp4">
          </video>

          <div class="briefing-bottom">
            <div class="briefing-terminal" id="codeentry-terminal">
              <span class="briefing-terminal-line" id="codeentry-current-line"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Phase 2: Code Entry ── -->
      <div class="codeentry-puzzle hidden" id="codeentry-puzzle">
        <div class="screen-content centered">
          <div class="screen-header">
            <span class="header-tag" id="codeentry-tag">ÉTAPE</span>
            <span class="header-title" id="codeentry-title">—</span>
          </div>

          <div class="narrative-box" id="codeentry-narrative"></div>

          <div class="puzzle-area" id="codeentry-puzzle-area">
            <p class="puzzle-prompt" id="codeentry-prompt"></p>
            <div class="input-group" id="codeentry-input-group">
              <input
                type="text"
                id="codeentry-input"
                class="code-input"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="ENTRER LE CODE"
              >
              <button id="btn-codeentry-submit" class="btn btn-primary">VALIDER</button>
            </div>
            <div id="codeentry-feedback" class="feedback hidden"></div>
          </div>

          <div class="stage-actions">
            <button id="btn-hint" class="btn btn-secondary">DEMANDER UN INDICE</button>
          </div>
        </div>
      </div>

    </div>
  `;
  return section;
}

/* ═══════════════  Public entry  ═══════════════ */

/**
 * Start a code-entry stage.
 * @param {object}   stage         — stage config from stages.json
 * @param {object}   state         — app state
 * @param {Function} onSolved      — callback when puzzle is solved
 * @param {Array}    introSequence — intro events array, or null/undefined to skip intro
 * @returns cleanup function
 */
export function startCodeEntry(stage, state, onSolved, introSequence) {
  // If no intro sequence or briefing already watched, skip straight to code entry
  if (!introSequence || (state.stagePhase && state.stagePhase[stage.id] === 'code-entry')) {
    return resumeCodeEntry(stage, state, onSolved);
  }

  // Show Phase 1, hide Phase 2
  const introEl  = document.getElementById('codeentry-intro');
  const puzzleEl = document.getElementById('codeentry-puzzle');
  if (introEl)  introEl.classList.remove('hidden');
  if (puzzleEl) puzzleEl.classList.add('hidden');

  // Video
  const video = document.getElementById('codeentry-avatar-video');
  if (video) video.play().catch(() => {});

  // Text element
  const currentLine = document.getElementById('codeentry-current-line');
  if (currentLine) currentLine.textContent = '';

  // Run intro sequence
  const abortCtrl = { aborted: false, currentAudio: null };

  const actionHandlers = {
    showCodeEntry() {
      transitionToCodeEntry(stage, state, onSolved);
      return 'stop';
    },
  };

  runIntroSequence(introSequence, currentLine, abortCtrl, actionHandlers);

  return () => {
    abortCtrl.aborted = true;
    if (video) { video.pause(); video.currentTime = 0; }
    if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
  };
}

/** Resume directly into code entry phase (skips briefing) */
function resumeCodeEntry(stage, state, onSolved) {
  const introEl  = document.getElementById('codeentry-intro');
  const puzzleEl = document.getElementById('codeentry-puzzle');
  if (introEl)  introEl.classList.add('hidden');
  if (puzzleEl) puzzleEl.classList.remove('hidden');

  return setupCodeEntryPhase(stage, state, onSolved);
}

/* ═══════════════  Transition to Phase 2  ═══════════════ */

function transitionToCodeEntry(stage, state, onSolved) {
  // Save phase so briefing is skipped on resume
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'code-entry';
  saveState(state);

  // Stop video
  const video = document.getElementById('codeentry-avatar-video');
  if (video) { video.pause(); video.currentTime = 0; }

  // Switch visibility
  const introEl  = document.getElementById('codeentry-intro');
  const puzzleEl = document.getElementById('codeentry-puzzle');
  if (introEl)  introEl.classList.add('hidden');
  if (puzzleEl) puzzleEl.classList.remove('hidden');

  setupCodeEntryPhase(stage, state, onSolved);
}

/* ═══════════════  Phase 2 — Code Entry  ═══════════════ */

function setupCodeEntryPhase(stage, state, onSolved) {
  const tagEl       = document.getElementById('codeentry-tag');
  const titleEl     = document.getElementById('codeentry-title');
  const narrativeEl = document.getElementById('codeentry-narrative');

  if (tagEl)       tagEl.textContent = `ÉTAPE ${stage.order}`;
  if (titleEl)     titleEl.textContent = stage.title;
  if (narrativeEl) narrativeEl.innerHTML = stage.narrative?.text || '';

  hideFeedback('codeentry-feedback');

  return setupCodeEntry(stage, state, onSolved, {
    inputId: 'codeentry-input',
    submitId: 'btn-codeentry-submit',
    promptId: 'codeentry-prompt',
    feedbackId: 'codeentry-feedback',
  });
}
