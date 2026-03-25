/**
 * Component: Background Music — looping ambient track at low volume.
 */

let bgAudioEl = null;

/** Create the audio element and inject into body */
export function createBgMusic() {
  bgAudioEl = document.createElement('audio');
  bgAudioEl.id = 'bg-music';
  bgAudioEl.loop = true;
  bgAudioEl.preload = 'auto';
  bgAudioEl.innerHTML = `<source src="assets/audio/background_music.mp3" type="audio/mpeg">`;
  document.body.appendChild(bgAudioEl);
}

/** Start (or resume) the background music */
export function startBgMusic() {
  if (!bgAudioEl) bgAudioEl = document.getElementById('bg-music');
  if (!bgAudioEl) return;
  bgAudioEl.volume = 0.15;
  bgAudioEl.play().catch(() => {});
}

/** Stop and rewind the background music */
export function stopBgMusic() {
  if (!bgAudioEl) return;
  bgAudioEl.pause();
  bgAudioEl.currentTime = 0;
}

/** Mute / unmute the background music */
export function setBgMusicMuted(muted) {
  if (!bgAudioEl) bgAudioEl = document.getElementById('bg-music');
  if (bgAudioEl) bgAudioEl.muted = muted;
}
