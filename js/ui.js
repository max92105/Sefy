/**
 * UI Helpers — screen transitions, modals, typewriter, audio
 */

// ---- Screen Management ----

/** Show a screen by id, hide all others */
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    // Re-trigger the fade-in animation
    target.style.animation = 'none';
    target.offsetHeight; // force reflow
    target.style.animation = '';
  }
}

/** Show the global nav bar */
export function showNav() {
  document.getElementById('global-nav')?.classList.remove('hidden');
}

/** Hide the global nav bar */
export function hideNav() {
  document.getElementById('global-nav')?.classList.add('hidden');
}

// ---- Modal Management ----

/** Open a modal by id */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    // Trap focus inside modal
    const firstBtn = modal.querySelector('button');
    firstBtn?.focus();
  }
}

/** Close a modal by id */
export function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

/** Setup close-on-backdrop-click for all modals */
export function initModals() {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      backdrop.closest('.modal')?.classList.add('hidden');
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal')?.classList.add('hidden');
    });
  });
}

// ---- Typewriter Effect ----

/**
 * Animate text character by character into an element.
 * Returns a promise that resolves when done.
 */
export function typewriter(element, text, speed = 35) {
  return new Promise(resolve => {
    element.textContent = '';
    element.classList.add('typewriter');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
      } else {
        clearInterval(interval);
        element.classList.remove('typewriter');
        resolve();
      }
    }, speed);
  });
}

// ---- Feedback ----

/** Show feedback (success or error) in a feedback element */
export function showFeedback(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `feedback ${type}`;
  el.classList.remove('hidden');
}

/** Hide feedback */
export function hideFeedback(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('hidden');
}

// ---- Glitch Effect ----

/** Add glitch animation to an element, auto-removes after animation */
export function glitch(element) {
  element.classList.add('glitch');
  element.addEventListener('animationend', () => {
    element.classList.remove('glitch');
  }, { once: true });
}

// ---- Timer Display ----

/** Format milliseconds as MM:SS */
export function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ---- Audio Manager ----

const audioCache = {};
let musicElement = null;

/** Play a one-shot sound effect */
export function playSFX(src) {
  try {
    if (!audioCache[src]) {
      audioCache[src] = new Audio(src);
    }
    const sfx = audioCache[src].cloneNode();
    sfx.volume = 0.6;
    sfx.play().catch(() => {});
  } catch {
    // Audio not available
  }
}

/** Start background music (looped) */
export function startMusic(src) {
  stopMusic();
  try {
    musicElement = new Audio(src);
    musicElement.loop = true;
    musicElement.volume = 0.3;
    musicElement.play().catch(() => {});
  } catch {
    // Audio not available
  }
}

/** Stop background music */
export function stopMusic() {
  if (musicElement) {
    musicElement.pause();
    musicElement.currentTime = 0;
    musicElement = null;
  }
}

/** Attach hover + click sounds to all buttons (event delegation) */
export function initButtonSounds() {
  document.addEventListener('pointerenter', (e) => {
    if (e.target.closest('button')) {
      playSFX('assets/audio/button_hovered.mp3');
    }
  }, true);

  document.addEventListener('click', (e) => {
    if (e.target.closest('button')) {
      playSFX('assets/audio/button_clicked.mp3');
    }
  }, true);
}

/** Set music volume (0 to 1) */
export function setMusicVolume(vol) {
  if (musicElement) {
    musicElement.volume = vol;
  }
}

// ---- Utility ----

/** Wait for a number of milliseconds */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
