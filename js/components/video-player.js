/**
 * Component: Video Player — a fullscreen overlay that plays a video log with
 * native controls. Reused when a video log is scanned (field-ops) and when it
 * is replayed from the inventory.
 */

let overlay = null;

/** Create the overlay once and inject it at body level. */
export function createVideoPlayer() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'video-player-overlay';
  overlay.className = 'video-player-overlay hidden';
  overlay.innerHTML = `
    <button class="video-player-close" id="video-player-close" aria-label="Fermer">✕</button>
    <video class="video-player-video" id="video-player-video" playsinline controls></video>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#video-player-close').addEventListener('click', hideVideo);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hideVideo(); });
}

/** Show the overlay and play the given video source. */
export function playVideo(src) {
  if (!src) return;
  createVideoPlayer();
  const video = overlay.querySelector('#video-player-video');
  video.src = src;
  overlay.classList.remove('hidden');
  video.currentTime = 0;
  video.play().catch(() => {});
}

/** Hide the overlay and stop playback. */
export function hideVideo() {
  if (!overlay) return;
  const video = overlay.querySelector('#video-player-video');
  if (video) { video.pause(); }
  overlay.classList.add('hidden');
}
