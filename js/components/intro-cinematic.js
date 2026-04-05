/**
 * Component: Intro Cinematic — reusable SEFY video + typewriter intro.
 *
 * Used by most stage screens as Phase 1 before the main interaction.
 * Creates the AI avatar video, terminal text area, and runs a timed sequence.
 */

import { runIntroSequence } from '../intro-runner.js';

const SEFY_VIDEO = 'assets/video/sefy_avatar.mp4';

/**
 * Create the intro cinematic DOM block.
 * @param {string} prefix — unique ID prefix (e.g., 'briefing', 'geo-activation')
 * @returns {HTMLElement}
 */
export function createIntroCinematicDOM(prefix) {
  const el = document.createElement('div');
  el.className = 'intro-cinematic';
  el.id = `${prefix}-intro`;
  el.innerHTML = `
    <div class="briefing-center" id="${prefix}-intro-center">
      <video id="${prefix}-avatar-video" class="ai-avatar-video" loop muted playsinline preload="auto">
        <source src="${SEFY_VIDEO}" type="video/mp4">
      </video>
      <div class="briefing-bottom">
        <div class="briefing-terminal" id="${prefix}-terminal">
          <span class="briefing-terminal-line" id="${prefix}-current-line"></span>
        </div>
      </div>
    </div>
  `;
  return el;
}

/**
 * Start the intro cinematic sequence.
 * @param {string} prefix          — matches createIntroCinematicDOM prefix
 * @param {Array}  sequence        — intro events array
 * @param {object} actionHandlers  — custom action handlers
 * @returns {{ abortCtrl, currentLine, cleanup, hide }}
 */
export function startIntroCinematic(prefix, sequence, actionHandlers = {}) {
  const introEl = document.getElementById(`${prefix}-intro`);
  if (introEl) introEl.classList.remove('hidden');

  const video = document.getElementById(`${prefix}-avatar-video`);
  if (video) video.play().catch(() => {});

  const currentLine = document.getElementById(`${prefix}-current-line`);
  if (currentLine) currentLine.textContent = '';

  const abortCtrl = { aborted: false, currentAudio: null };

  runIntroSequence(sequence, currentLine, abortCtrl, actionHandlers);

  return {
    abortCtrl,
    currentLine,
    cleanup() {
      abortCtrl.aborted = true;
      if (video) { video.pause(); video.currentTime = 0; }
      if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
    },
    hide() {
      if (video) { video.pause(); video.currentTime = 0; }
      if (introEl) introEl.classList.add('hidden');
    },
  };
}
