/**
 * Screen: Code Entry with Briefing Intro — two-phase puzzle.
 *
 * Phase 1 — AI Intro Cinematic:
 *   SEFY video + floating text + timed audio.
 *
 * Phase 2 — Code Entry:
 *   Standard code-input form (reuses puzzle engine).
 *
 * Configure via stage data:
 *   { briefingIntro: true, puzzle: { type: "code-entry", ... } }
 */

import { delay } from '../ui.js';
import { setupCodeEntry } from '../puzzles.js';
import { hideFeedback } from '../ui.js';
import { saveState } from '../state.js';

/* ───────── Configurable intro sequences per stage ───────── */

const INTRO_SEQUENCES = {
  'geo-activation': [
    { time: 0,     type: 'action', action: 'playAudio', src: 'assets/audio/geo_intro_sefy.wav' },
    { time: 0,     type: 'text', text: 'Je vois que vous êtes dans le centre de commande par les caméras.' },
    { time: 5000,  type: 'text', text: 'Malheureusement, mon module de géolocalisation est inaccessible comme la plupart de mes modules.' },
    { time: 11000, type: 'text', text: 'Je ne peux pas vous aider sans ces modules opérationnels.' },
    { time: 17000, type: 'text', text: 'Il devrait y avoir un code d\'accès quelque part ici pour activer le module.' },
    { time: 24000, type: 'action', action: 'showCodeEntry' },
  ],
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
            <source src="assets/video/sefy_avatar.mp4" type="video/mp4">
          </video>

          <div class="briefing-bottom">
            <div class="briefing-terminal" id="codeentry-terminal">
              <span class="briefing-terminal-line" id="codeentry-current-line"></span>
              <span class="terminal-cursor" id="codeentry-cursor">_</span>
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
 * Start a code-entry stage with briefing intro.
 * @returns cleanup function
 */
export function startCodeEntry(stage, state, onSolved) {
  // If briefing already watched, skip straight to code entry
  if (state.stagePhase && state.stagePhase[stage.id] === 'code-entry') {
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
  runIntroSequence(INTRO_SEQUENCES[stage.id] || [], currentLine, abortCtrl, stage, state, onSolved);

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

/* ═══════════════  Phase 1 — Sequential Intro Runner  ═══════════════ */

async function runIntroSequence(sequence, currentLine, abort, stage, state, onSolved) {
  let segmentStart = Date.now();

  for (const event of sequence) {
    if (abort.aborted) return;

    const elapsed = Date.now() - segmentStart;
    const waitMs = event.time - elapsed;
    if (waitMs > 0) await delay(waitMs);
    if (abort.aborted) return;

    if (event.type === 'text') {
      await typeText(currentLine, event.text);
    }

    if (event.type === 'action') {
      if (event.action === 'playAudio') {
        if (abort.currentAudio) { abort.currentAudio.pause(); }
        const audio = new Audio(event.src);
        audio.volume = 0.8;
        abort.currentAudio = audio;
        await ensureAudioPlays(audio, abort);
        segmentStart = Date.now() - event.time;
      }

      if (event.action === 'showCodeEntry') {
        transitionToCodeEntry(stage, state, onSolved);
        return;
      }
    }
  }
}

function ensureAudioPlays(audio, abort) {
  return new Promise(resolve => {
    audio.play().then(resolve).catch(() => {
      const EVENTS = ['click', 'touchstart', 'touchend', 'pointerdown', 'pointerup', 'keydown', 'mousedown'];
      const resume = () => {
        for (const e of EVENTS) document.removeEventListener(e, resume, true);
        if (abort.aborted || abort.currentAudio !== audio) { resolve(); return; }
        audio.play().then(resolve).catch(resolve);
      };
      for (const e of EVENTS) document.addEventListener(e, resume, { capture: true, passive: true });
    });
  });
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

/* ───────── Helpers ───────── */

async function typeText(el, text) {
  if (!el) return;
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await delay(20 + Math.random() * 20);
  }
}
