/**
 * Component: Background Music — looping ambient track at low volume.
 *
 * Browsers require at least ONE user gesture (click, tap, keypress)
 * before any audio can play — this is a hard security policy and
 * cannot be bypassed.  We register global listeners on every gesture
 * type so the music starts the instant the user touches the screen.
 */

let bgAudioEl = null;
let started = false;
let listenersAttached = false;

/** Create the audio element and inject into body */
export function createBgMusic() {
  bgAudioEl = document.createElement('audio');
  bgAudioEl.id = 'bg-music';
  bgAudioEl.loop = true;
  bgAudioEl.preload = 'auto';
  bgAudioEl.innerHTML = `<source src="assets/audio/background_music.mp3" type="audio/mpeg">`;
  document.body.appendChild(bgAudioEl);
}

/** Try to play; if blocked, attach global gesture listeners */
export function startBgMusic() {
  if (!bgAudioEl) bgAudioEl = document.getElementById('bg-music');
  if (!bgAudioEl) return;
  bgAudioEl.volume = 0.15;

  bgAudioEl.play()
    .then(() => { started = true; removeGestureListeners(); })
    .catch(() => attachGestureListeners());
}

/** Resume music on the first user gesture of any kind */
function resumeOnGesture() {
  if (!bgAudioEl || started) { removeGestureListeners(); return; }
  bgAudioEl.play()
    .then(() => { started = true; removeGestureListeners(); })
    .catch(() => {});
}

const GESTURE_EVENTS = ['click', 'touchstart', 'pointerdown', 'keydown'];

function attachGestureListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  for (const evt of GESTURE_EVENTS) {
    document.addEventListener(evt, resumeOnGesture, { capture: true });
  }
}

function removeGestureListeners() {
  if (!listenersAttached) return;
  listenersAttached = false;
  for (const evt of GESTURE_EVENTS) {
    document.removeEventListener(evt, resumeOnGesture, { capture: true });
  }
}

/** Stop and rewind the background music */
export function stopBgMusic() {
  if (!bgAudioEl) return;
  bgAudioEl.pause();
  bgAudioEl.currentTime = 0;
  started = false;
}

/** Mute / unmute the background music */
export function setBgMusicMuted(muted) {
  if (!bgAudioEl) bgAudioEl = document.getElementById('bg-music');
  if (bgAudioEl) bgAudioEl.muted = muted;
}
