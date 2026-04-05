/**
 * Component: QR Scanner — camera-based keycard & lock station scanner.
 *
 * Provides Phase 2 UI and logic for QR scanning stages.
 * Used by qr-lockdown and evidence-collection stage screens.
 *
 * QR payload format:
 *   SEFY:KEY:<COLOR>     → collect a keycard
 *   SEFY:LOCK:<COLOR>    → attempt to unlock a station (needs matching key)
 */

import { playSFX } from '../ui.js';
import { addKeycard, hasKeycard, unlockStation, solvePuzzle, saveState } from '../state.js';
import { KEYCARD_COLORS, LOCK_STATIONS, updateInventoryBadge } from '../screens/evidence.js';

const QR_PREFIX = 'SEFY:';

/* ───────── jsQR lazy-load ───────── */

let jsQRLoaded = false;

function loadJsQR() {
  if (jsQRLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (window.jsQR) { jsQRLoaded = true; resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = () => { jsQRLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/* ───────── Per-instance state ───────── */

const instances = {};

/* ═══════════════  DOM  ═══════════════ */

/**
 * Create QR scanner Phase 2 DOM.
 * @param {string} prefix — unique ID prefix
 * @returns {HTMLElement}
 */
export function createQRScannerDOM(prefix) {
  const el = document.createElement('div');
  el.className = 'qr-scanner hidden';
  el.id = `${prefix}-scanner`;
  el.innerHTML = `
    <div class="qr-camera-wrap">
      <video id="${prefix}-camera" autoplay playsinline muted></video>
      <canvas id="${prefix}-canvas" class="hidden"></canvas>
      <div class="qr-crosshair"></div>
    </div>

    <div class="qr-lock-panel" id="${prefix}-lock-panel"></div>

    <button class="btn btn-primary qr-continue-btn hidden" id="${prefix}-continue-btn">DÉSACTIVER SEFY ▶</button>

    <div class="qr-feedback" id="${prefix}-feedback">
      <span id="${prefix}-feedback-text">Scannez un QR code…</span>
    </div>

    <!-- Keycard reveal overlay -->
    <div class="qr-card-overlay hidden" id="${prefix}-card-overlay">
      <div class="qr-card-reveal" id="${prefix}-card-reveal">
        <div class="qr-card-icon">🔑</div>
        <div class="qr-card-title" id="${prefix}-card-title">CARTE D'ACCÈS</div>
        <div class="qr-card-color" id="${prefix}-card-color"></div>
      </div>
    </div>
  `;
  return el;
}

/* ═══════════════  Start / Stop  ═══════════════ */

/**
 * Start QR scanning Phase 2.
 * @param {string}   prefix   — matches createQRScannerDOM prefix
 * @param {object}   stage    — stage config
 * @param {object}   state    — app state
 * @param {Function} onSolved — callback
 * @param {object}   abort    — { aborted: boolean }
 */
export async function startQRScanning(prefix, stage, state, onSolved, abort) {
  const scannerEl = document.getElementById(`${prefix}-scanner`);
  if (scannerEl) scannerEl.classList.remove('hidden');

  renderLockPanel(prefix, state, stage);

  // Free-collection mode (no locks): show continue button
  const freeMode = !stage.puzzle?.requiredLocks?.length;
  const continueBtn = document.getElementById(`${prefix}-continue-btn`);
  if (freeMode && continueBtn) {
    continueBtn.classList.remove('hidden');
    continueBtn.onclick = () => {
      stopQRCamera(prefix);
      onSolved(stage);
    };
  } else if (continueBtn) {
    continueBtn.classList.add('hidden');
  }

  // Load jsQR
  try {
    await loadJsQR();
  } catch {
    showFeedback(prefix, 'Erreur : impossible de charger le scanner.', 'error');
    return;
  }

  // Start camera
  const cameraVideo = document.getElementById(`${prefix}-camera`);
  const canvas      = document.getElementById(`${prefix}-canvas`);
  const ctx         = canvas?.getContext('2d', { willReadFrequently: true });

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    });
    if (cameraVideo) cameraVideo.srcObject = stream;
  } catch {
    showFeedback(prefix, 'Erreur : accès caméra refusé.', 'error');
    return;
  }

  instances[prefix] = { stream, scanLoop: null };

  let lastScanned = '';
  let cooldown = false;

  instances[prefix].scanLoop = setInterval(() => {
    if (abort.aborted || !cameraVideo || cameraVideo.readyState < 2) return;

    canvas.width  = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    ctx.drawImage(cameraVideo, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });

    if (!qr || !qr.data || cooldown) return;
    if (qr.data === lastScanned) return;

    lastScanned = qr.data;
    cooldown = true;
    setTimeout(() => { cooldown = false; lastScanned = ''; }, 3000);

    handleQRCode(prefix, qr.data, stage, state, onSolved);
  }, 250);
}

/**
 * Stop camera and clean up scanner instance.
 */
export function stopQRCamera(prefix) {
  const inst = instances[prefix];
  if (!inst) return;
  if (inst.scanLoop) { clearInterval(inst.scanLoop); inst.scanLoop = null; }
  if (inst.stream) {
    inst.stream.getTracks().forEach(t => t.stop());
    inst.stream = null;
  }
  const cam = document.getElementById(`${prefix}-camera`);
  if (cam) cam.srcObject = null;
  delete instances[prefix];
}

/* ═══════════════  QR Handling  ═══════════════ */

function handleQRCode(prefix, data, stage, state, onSolved) {
  if (!data.startsWith(QR_PREFIX)) {
    showFeedback(prefix, 'QR non reconnu.', 'error');
    playSFX('assets/audio/button_clicked.mp3');
    return;
  }

  const parts = data.replace(QR_PREFIX, '').split(':');
  const type  = parts[0]; // KEY or LOCK
  const color = parts[1]; // RED, BLUE, YELLOW

  if (type === 'KEY') {
    const isNew = addKeycard(state, color);
    updateInventoryBadge(state);

    if (isNew) {
      showKeycardReveal(prefix, color);
      playSFX('assets/audio/card_found.wav');
      showFeedback(prefix, `Carte ${KEYCARD_COLORS[color]?.label || color} collectée !`, 'success');
    } else {
      showFeedback(prefix, `Carte ${KEYCARD_COLORS[color]?.label || color} déjà en possession.`, 'info');
    }
    renderLockPanel(prefix, state, stage);
    return;
  }

  if (type === 'LOCK') {
    // Free-collection mode: locks not used
    if (!stage.puzzle?.requiredLocks?.length) {
      showFeedback(prefix, 'QR non reconnu dans ce mode.', 'error');
      return;
    }

    if (!hasKeycard(state, color)) {
      const reqLabel = KEYCARD_COLORS[color]?.label || color;
      showFeedback(prefix, `Accréditation insuffisante. Carte ${reqLabel} requise.`, 'error');
      playSFX('assets/audio/button_clicked.mp3');
      return;
    }

    const isNew = unlockStation(state, color);
    renderLockPanel(prefix, state, stage);

    if (isNew) {
      showFeedback(prefix, 'Station déverrouillée !', 'success');
      playSFX('assets/audio/zone_found.mp3');
    } else {
      showFeedback(prefix, 'Station déjà déverrouillée.', 'info');
    }

    // Check if all locks open
    const allOpen = LOCK_STATIONS.every(l => (state.unlockedStations || []).includes(l.id));
    if (allOpen) {
      stopQRCamera(prefix);
      solvePuzzle(state, stage.id);
      showFeedback(prefix, 'Toutes les stations déverrouillées ! Module d\'analyse réactivé.', 'success');
      playSFX('assets/audio/zone_found.mp3');
      setTimeout(() => onSolved(stage), 3000);
    }
    return;
  }

  showFeedback(prefix, 'QR non reconnu.', 'error');
}

/* ═══════════════  Lock Panel  ═══════════════ */

function renderLockPanel(prefix, state, stage) {
  const panel = document.getElementById(`${prefix}-lock-panel`);
  if (!panel) return;

  // Free-collection mode: hide lock panel
  if (!stage?.puzzle?.requiredLocks?.length) {
    panel.innerHTML = '';
    return;
  }

  const unlocked = state.unlockedStations || [];
  const cards    = state.keycards || [];

  panel.innerHTML = LOCK_STATIONS.map(lock => {
    const isOpen = unlocked.includes(lock.id);
    const hasKey = cards.includes(lock.requires);
    const color  = KEYCARD_COLORS[lock.requires]?.css || '#888';
    const cls    = isOpen ? 'qr-lock open' : 'qr-lock closed';
    const icon   = isOpen ? '🔓' : '🔒';
    return `
      <div class="${cls}" style="--lock-color: ${color}">
        <span class="qr-lock-icon">${icon}</span>
        <span class="qr-lock-name">${lock.label}</span>
      </div>`;
  }).join('');
}

/* ═══════════════  Keycard Reveal  ═══════════════ */

function showKeycardReveal(prefix, color) {
  const overlay = document.getElementById(`${prefix}-card-overlay`);
  const titleEl = document.getElementById(`${prefix}-card-title`);
  const colorEl = document.getElementById(`${prefix}-card-color`);
  if (!overlay) return;

  const c = KEYCARD_COLORS[color] || { label: color, css: '#888', name: color };
  if (titleEl) titleEl.textContent = c.name;
  if (colorEl) colorEl.style.background = c.css;

  overlay.classList.remove('hidden');
  overlay.classList.add('revealed');

  setTimeout(() => {
    overlay.classList.remove('revealed');
    overlay.classList.add('dismissing');
    setTimeout(() => {
      overlay.classList.remove('dismissing');
      overlay.classList.add('hidden');
    }, 500);
  }, 2500);
}

/* ═══════════════  Feedback  ═══════════════ */

function showFeedback(prefix, msg, type = 'info') {
  const el   = document.getElementById(`${prefix}-feedback-text`);
  const wrap = document.getElementById(`${prefix}-feedback`);
  if (el) el.textContent = msg;
  if (wrap) {
    wrap.className = `qr-feedback qr-feedback-${type}`;
    wrap.style.animation = 'none';
    wrap.offsetHeight;
    wrap.style.animation = '';
  }
}
