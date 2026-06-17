/**
 * Screen: Deactivate SEFY — final code-entry to stop the PURGE.
 *
 * The player is locked on this screen (no nav, no back button). The deactivation
 * code is broadcast on a loop with a short gap between plays; the code is clearly
 * spoken. Entering it wins the game.
 */

import { createCodeEntryFormDOM, setupCodeEntryForm } from '../../components/code-entry-form.js';
import { MEDIA } from './config.js';

const PREFIX = 'deactivate-sefy';

/* ═══════════════  Looping code broadcast  ═══════════════ */

let loopAudio = null;
let loopTimer = null;

function startCodeLoop() {
  stopCodeLoop();
  loopAudio = new Audio(MEDIA.codeLoop);
  loopAudio.addEventListener('ended', () => {
    // Self-stop if we're no longer on this screen (e.g. PURGE timer fired).
    const active = document.querySelector('.screen.active');
    if (!active || active.id !== `screen-${PREFIX}`) { stopCodeLoop(); return; }
    loopTimer = setTimeout(() => { loopAudio?.play().catch(() => {}); }, MEDIA.loopGapMs);
  });
  const tryPlay = () => loopAudio?.play().catch(() => {
    // Autoplay blocked — start on the next tap anywhere.
    const once = () => { document.removeEventListener('pointerdown', once); loopAudio?.play().catch(() => {}); };
    document.addEventListener('pointerdown', once, { once: true });
  });
  tryPlay();
}

function stopCodeLoop() {
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  if (loopAudio) { loopAudio.pause(); loopAudio = null; }
}

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';

  // Locked screen — no back button.
  const form = createCodeEntryFormDOM(PREFIX, { backButton: false });
  form.classList.remove('hidden'); // show immediately (no intro phase)

  section.appendChild(form);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

/**
 * @param {object}   stage    — stage config
 * @param {object}   state    — app state
 * @param {Function} onSolved — callback when the code is accepted (wins the game)
 * @returns {Function} cleanup
 */
export function start(stage, state, onSolved) {
  const cleanup = setupCodeEntryForm(stage, state, (...args) => {
    stopCodeLoop();      // stop the broadcast before the end screen
    onSolved(...args);
  }, PREFIX);

  startCodeLoop();

  return () => {
    stopCodeLoop();
    cleanup();
  };
}
