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
  // Mark this intro as on-screen so replay stays a no-op until it finishes.
  _activeIntros[prefix] = abortCtrl;
  // Full-screen cinematic: hide the bottom nav and let the video fill the screen.
  document.body.classList.add('intro-playing');

  runIntroSequence(sequence, currentLine, abortCtrl, actionHandlers);

  const release = () => {
    if (_activeIntros[prefix] === abortCtrl) delete _activeIntros[prefix];
    setIntroPlaying();
  };

  return {
    abortCtrl,
    currentLine,
    cleanup() {
      abortCtrl.aborted = true;
      if (video) { video.pause(); video.currentTime = 0; }
      if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
      release();
    },
    hide() {
      if (video) { video.pause(); video.currentTime = 0; }
      if (introEl) introEl.classList.add('hidden');
      release();
    },
  };
}

/* ═══════════════  Replay  ═══════════════ */

let _replayCtrl = null;
const _activeIntros = {};

/**
 * Toggle the body.intro-playing class based on whether any intro (initial or
 * replay) is currently on screen. Drives the full-screen cinematic CSS
 * (hides the bottom nav, lets the video fill top-to-bottom).
 */
function setIntroPlaying() {
  const active = Object.keys(_activeIntros).length > 0
    || (_replayCtrl && !_replayCtrl.abortCtrl.aborted);
  document.body.classList.toggle('intro-playing', !!active);
}

/** Force-clear the cinematic state (used when resetting the whole flow). */
export function clearIntroPlaying() {
  for (const k of Object.keys(_activeIntros)) delete _activeIntros[k];
  if (_replayCtrl) { _replayCtrl.end(); _replayCtrl = null; }
  document.body.classList.remove('intro-playing');
}

/**
 * Replay an intro cinematic without advancing the flow.
 *
 * Re-plays the video + voice + typewriter narration. Every flow action
 * (complete / showCodeEntry / startRoute / requestLocation / …) is
 * neutralized so replaying never mutates state or advances the stage.
 *
 * The currently-visible sibling panels are hidden for the duration and
 * restored when the replay ends (the intro block is a flex child, not an
 * overlay, so it must take the layout space on its own).
 *
 * Tapping the cinematic while it replays skips it. When it ends (naturally
 * or skipped) the optional `onEnd` callback runs — used to return to the
 * screen the player came from (e.g. the terminal-wait search screen).
 *
 * @param {string}   prefix   — matches createIntroCinematicDOM prefix
 * @param {Array}    sequence — intro events array
 * @param {Function} [onEnd]  — called once when the replay finishes
 */
export function replayIntroCinematic(prefix, sequence, onEnd) {
  const introEl = document.getElementById(`${prefix}-intro`);
  if (!introEl || !sequence) return;

  // If the original intro is still playing on screen, replaying is redundant.
  if (_activeIntros[prefix] && !_activeIntros[prefix].aborted) return;

  // Cancel any in-flight replay first.
  if (_replayCtrl) { _replayCtrl.end(); _replayCtrl = null; }

  // Hide any visible sibling panels so the intro takes the layout space.
  const layout = introEl.parentElement;
  const hiddenForReplay = layout
    ? Array.from(layout.children).filter(el => el !== introEl && !el.classList.contains('hidden'))
    : [];
  hiddenForReplay.forEach(el => el.classList.add('hidden'));
  introEl.classList.remove('hidden');

  const video = document.getElementById(`${prefix}-avatar-video`);
  if (video) { video.currentTime = 0; video.play().catch(() => {}); }

  const currentLine = document.getElementById(`${prefix}-current-line`);
  if (currentLine) currentLine.textContent = '';

  const abortCtrl = { aborted: false, currentAudio: null };

  const end = () => {
    if (abortCtrl.aborted) return;
    abortCtrl.aborted = true;
    introEl.removeEventListener('click', end);
    if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
    if (video) { video.pause(); video.currentTime = 0; }
    introEl.classList.add('hidden');
    hiddenForReplay.forEach(el => el.classList.remove('hidden'));
    if (_replayCtrl && _replayCtrl.abortCtrl === abortCtrl) _replayCtrl = null;
    setIntroPlaying();
    if (typeof onEnd === 'function') onEnd();
  };

  // Tap the cinematic to skip the replay.
  introEl.addEventListener('click', end);

  // Neutralize every custom flow action: skip it and keep the narration flowing.
  // (playAudio is handled internally by the runner, so voice still plays.)
  // Returning 'reset-clock' mirrors the pause-then-resume actions (permission
  // requests, agent select) so multi-part sequences keep their part-2 timing.
  const safeHandlers = new Proxy({}, { get: () => async () => 'reset-clock' });

  _replayCtrl = { abortCtrl, end };
  // Full-screen cinematic during replay too.
  setIntroPlaying();

  runIntroSequence(sequence, currentLine, abortCtrl, safeHandlers).then(() => end());
}
