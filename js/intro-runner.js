/**
 * Shared intro-sequence runner — plays timed typewriter text + audio + custom actions.
 *
 * Used by: briefing, codeentry, geo, qrscanner, arscan.
 *
 * Sequence format:
 *   { time: <ms>, type: 'text',   text: '…' }
 *   { time: <ms>, type: 'action', action: '<name>', ...extra }
 *
 * Built-in actions:
 *   playAudio  — { action: 'playAudio', src: 'assets/audio/…' }
 *
 * Custom actions are dispatched to the `actionHandlers` map.
 * If a handler returns a promise, the sequence waits for it.
 * If a handler returns 'reset-clock', the segment clock resets to 0.
 * If a handler returns 'stop', the sequence ends.
 */

import { typewriter } from './typewriter.js';
import { delay } from './ui.js';

/**
 * Run an intro sequence.
 * @param {Array}       sequence       — events sorted by time
 * @param {HTMLElement}  textEl        — element to type text into
 * @param {object}       abort         — { aborted: boolean, currentAudio: Audio|null }
 * @param {object}       actionHandlers — { actionName: async (event, abort) => result }
 */
export async function runIntroSequence(sequence, textEl, abort, actionHandlers = {}) {
  let segmentStart = Date.now();

  for (const event of sequence) {
    if (abort.aborted) return;

    const elapsed = Date.now() - segmentStart;
    const waitMs = event.time - elapsed;
    if (waitMs > 0) await delay(waitMs);
    if (abort.aborted) return;

    if (event.type === 'text') {
      await typewriter(textEl, event.text, event.speed || 25);
    }

    if (event.type === 'action') {
      if (event.action === 'playAudio') {
        if (abort.currentAudio) { abort.currentAudio.pause(); }
        const audio = new Audio(event.src);
        audio.volume = 0.8;
        abort.currentAudio = audio;
        // Try to play — if autoplay is blocked, set up gesture listener in background
        // but don't block the sequence so text keeps flowing.
        const played = await tryPlayAudio(audio, abort);
        if (played) {
          // Re-anchor clock so absolute times sync with when audio started
          segmentStart = Date.now() - event.time;
        }
      } else {
        const handler = actionHandlers[event.action];
        if (handler) {
          const result = await handler(event, abort);
          if (abort.aborted) return;
          if (result === 'reset-clock') segmentStart = Date.now();
          if (result === 'stop') return;
        }
      }
    }
  }
}

/**
 * Try to play audio immediately. Returns true if playback started.
 * If autoplay is blocked, sets up a background gesture listener
 * so audio starts on the next user tap — but does NOT block.
 */
function tryPlayAudio(audio, abort) {
  return audio.play().then(() => true).catch(() => {
    // Autoplay blocked — listen for any gesture in the background
    const EVENTS = ['click', 'touchstart', 'touchend', 'pointerdown', 'pointerup', 'keydown', 'mousedown'];
    const resume = () => {
      for (const e of EVENTS) document.removeEventListener(e, resume, true);
      if (abort.aborted || abort.currentAudio !== audio) return;
      audio.play().catch(() => {});
    };
    for (const e of EVENTS) document.addEventListener(e, resume, { capture: true, passive: true });
    return false;
  });
}

/**
 * Try to play audio, blocking until it actually plays.
 * Falls back to waiting for a user gesture if autoplay is blocked.
 */
export function ensureAudioPlays(audio, abort) {
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
