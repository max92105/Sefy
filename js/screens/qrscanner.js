/**
 * Screen: QR Scanner — camera-based keycard & lock station puzzle.
 *
 * Phase 1 — SEFY Briefing (video + typed text, same pattern as geo intro).
 * Phase 2 — Live camera feed scanning QR codes.
 *
 * QR payload format:
 *   SEFY:KEY:<COLOR>     → collect a keycard
 *   SEFY:LOCK:<COLOR>    → attempt to unlock a station (needs matching key)
 *
 * All 3 lock stations opened → puzzle solved → advance.
 */

import { delay } from '../ui.js';
import { playSFX } from '../ui.js';
import { addKeycard, hasKeycard, unlockStation, solvePuzzle, saveState } from '../state.js';
import { KEYCARD_COLORS, LOCK_STATIONS, updateInventoryBadge } from './evidence.js';
import { typewriter } from '../typewriter.js';
import { runIntroSequence } from '../intro-runner.js';

/* ───────── QR prefix ───────── */
const QR_PREFIX = 'SEFY:';

/* ───────── Media paths (easy to change) ───────── */
const MEDIA = {
  video: 'assets/video/sefy_avatar.mp4',
  audioIntro: 'assets/audio/qr_intro_sefy.wav',
  audioConfirmed: 'assets/audio/qr_confirmed_sefy.wav',
};

/* ───────── Intro sequences per stage ───────── */
const QR_INTRO_SEQUENCES = {
  'qr-lockdown': [
    // ── Audio 1: module activation ──
    { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioIntro },
    { time: 0,      type: 'text',  text: 'Module de décryptage activé avec succès.' },
    { time: 3000,   type: 'text',  text: 'Analyse de l\'environnement en cours…' },
    { time: 6000,   type: 'text',  text: 'Installation est en confinement.' },
    { time: 9000,   type: 'text',  text: 'Trois stations de réactivation ont été verrouillées.' },
    { time: 13000,  type: 'text',  text: 'Trouvé les cartes d\'accès dissimulées dans l\'édifice. Utilisez le scanner pour les enregistrer.' },
    { time: 18000,  type: 'text',  text: 'Chaque station requiert une carte de couleur spécifique.' },
    { time: 22000,  type: 'text',  text: 'Déverrouillez les trois stations pour réactiver mon module d\'analyse environnementale.' },
    { time: 26000,  type: 'text',  text: 'Autorisez l\'accès à la caméra pour que je puisse vous assister.' },
    { time: 27000,  type: 'action', action: 'requestCamera' },
    { time: 0,      type: 'action', action: 'playAudio', src: MEDIA.audioConfirmed },
    { time: 0,      type: 'text',  text: 'Accès caméra confirmé.' },
    { time: 2000,   type: 'text',  text: 'Activation du scanner optique…' },
    { time: 4000,   type: 'action', action: 'startScanner' },
  ],
  'evidence-collection': [
    { time: 0,      type: 'text',  text: 'Accès aux systèmes partiellement rétabli.' },
    { time: 3000,   type: 'text',  text: 'Scanner optique en ligne. Collectez les éléments nécessaires.' },
    { time: 6000,   type: 'text',  text: 'Autorisez l\'accès à la caméra.' },
    { time: 7000,   type: 'action', action: 'requestCamera' },
    { time: 0,      type: 'text',  text: 'Caméra en ligne. Scannez les QR codes pour collecter les preuves.' },
    { time: 3000,   type: 'action', action: 'startScanner' },
  ],
};

/* ───────── jsQR lazy-load ───────── */
let jsQRLoaded = false;

function loadJsQR() {
  if (jsQRLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = () => { jsQRLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/* ═══════════════  DOM  ═══════════════ */

export function createQRScannerScreen() {
  const section = document.createElement('section');
  section.id = 'screen-qrscanner';
  section.className = 'screen';
  section.innerHTML = `
    <div class="qr-layout">

      <!-- Phase 1: SEFY Briefing -->
      <div class="qr-intro" id="qr-intro">
        <div class="briefing-center" id="qr-intro-center">
          <video id="qr-avatar-video" class="ai-avatar-video" loop muted playsinline preload="auto">
            <source src="${MEDIA.video}" type="video/mp4">
          </video>
          <div class="briefing-bottom">
            <div class="briefing-terminal" id="qr-terminal">
              <span class="briefing-terminal-line" id="qr-current-line"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Phase 2: Camera Scanner -->
      <div class="qr-scanner hidden" id="qr-scanner">
        <div class="qr-camera-wrap">
          <video id="qr-camera" autoplay playsinline muted></video>
          <canvas id="qr-canvas" class="hidden"></canvas>
          <div class="qr-crosshair"></div>
        </div>

        <div class="qr-lock-panel" id="qr-lock-panel"></div>

        <button class="btn btn-primary qr-continue-btn hidden" id="qr-continue-btn">DÉSACTIVER SEFY ▶</button>

        <div class="qr-feedback" id="qr-feedback">
          <span id="qr-feedback-text">Scannez un QR code…</span>
        </div>
      </div>

      <!-- Keycard reveal overlay -->
      <div class="qr-card-overlay hidden" id="qr-card-overlay">
        <div class="qr-card-reveal" id="qr-card-reveal">
          <div class="qr-card-icon">🔑</div>
          <div class="qr-card-title" id="qr-card-title">CARTE D'ACCÈS</div>
          <div class="qr-card-color" id="qr-card-color"></div>
        </div>
      </div>

    </div>
  `;
  return section;
}

/* ═══════════════  Public entry  ═══════════════ */

export function startQRScanner(stage, state, onSolved) {
  // If briefing already watched, skip straight to scanner
  if (state.stagePhase && state.stagePhase[stage.id] === 'scanner') {
    return resumeQRScanner(stage, state, onSolved);
  }

  const introEl   = document.getElementById('qr-intro');
  const scannerEl = document.getElementById('qr-scanner');
  if (introEl)   introEl.classList.remove('hidden');
  if (scannerEl) scannerEl.classList.add('hidden');

  const video = document.getElementById('qr-avatar-video');
  if (video) video.play().catch(() => {});

  const currentLine = document.getElementById('qr-current-line');
  if (currentLine) currentLine.textContent = '';

  const abortCtrl = { aborted: false, currentAudio: null };

  const actionHandlers = {
    async requestCamera(event, abort) {
      const granted = await requestCameraWithRetry(currentLine, abort);
      if (abort.aborted || !granted) return 'stop';
      return 'reset-clock';
    },
    startScanner() {
      transitionToScanner(stage, state, onSolved, abortCtrl);
      return 'stop';
    },
  };

  const introSeq = QR_INTRO_SEQUENCES[stage.id] || QR_INTRO_SEQUENCES['qr-lockdown'];
  runIntroSequence(introSeq, currentLine, abortCtrl, actionHandlers);

  return () => {
    abortCtrl.aborted = true;
    if (video) { video.pause(); video.currentTime = 0; }
    if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
    stopCamera();
  };
}

/** Resume directly into the scanner phase (skips briefing) */
function resumeQRScanner(stage, state, onSolved) {
  const introEl   = document.getElementById('qr-intro');
  const scannerEl = document.getElementById('qr-scanner');
  if (introEl)   introEl.classList.add('hidden');
  if (scannerEl) scannerEl.classList.remove('hidden');

  const abortCtrl = { aborted: false, currentAudio: null };
  transitionToScanner(stage, state, onSolved, abortCtrl);

  return () => {
    abortCtrl.aborted = true;
    stopCamera();
  };
}

/* ═══════════════  Phase 1 helpers  ═══════════════ */

async function typeText(el, text) {
  if (!el) return;
  await typewriter(el, text, 25);
}

/* ═══════════════  Camera Permission  ═══════════════ */

/**
 * Request camera permission with retry (mirrors geo requestLocationWithRetry).
 * Loops until granted or aborted.
 */
async function requestCameraWithRetry(currentLine, abort) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    await typeText(currentLine, 'Erreur : caméra non disponible sur cet appareil.');
    return false;
  }

  let firstAttempt = true;

  while (!abort.aborted) {
    const permState = await getCameraPermissionState();

    if (permState === 'granted') {
      await typeText(currentLine, 'Accès caméra autorisé. Scanner optique activé.');
      return true;
    }

    if (permState === 'denied') {
      await typeText(currentLine, '⚠ Caméra bloquée. Appuyez sur l\'icône 🔒 dans la barre d\'adresse, puis autorisez la caméra.');
      while (!abort.aborted) {
        await delay(2000);
        const newState = await getCameraPermissionState();
        if (newState !== 'denied') break;
      }
      if (abort.aborted) return false;
      continue;
    }

    // State is 'prompt'
    if (firstAttempt) {
      await typeText(currentLine, 'Autorisation de la caméra requise…');
      firstAttempt = false;
    } else {
      await typeText(currentLine, 'Accès refusé. Veuillez autoriser la caméra pour continuer.');
    }

    const result = await requestCameraPermission();
    if (abort.aborted) return false;

    if (result === 'granted') {
      await typeText(currentLine, 'Accès caméra autorisé. Scanner optique activé.');
      return true;
    }

    await delay(2000);
  }
  return false;
}

/**
 * Check the current camera permission state.
 * Returns 'granted' | 'denied' | 'prompt'.
 */
async function getCameraPermissionState() {
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'camera' });
      return status.state;
    }
  } catch { /* Permissions API not available */ }
  return 'prompt';
}

/**
 * Request camera permission (one-shot via getUserMedia).
 * Immediately stops the stream — we just need the permission grant.
 * Returns 'granted' | 'denied'.
 */
function requestCameraPermission() {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      // Stop tracks immediately — we only needed the permission prompt
      stream.getTracks().forEach(t => t.stop());
      return 'granted';
    })
    .catch(() => 'denied');
}

/* ═══════════════  Phase 2 — Camera Scanner  ═══════════════ */

let cameraStream = null;
let scanLoop = null;

async function transitionToScanner(stage, state, onSolved, abort) {
  const introEl   = document.getElementById('qr-intro');
  const scannerEl = document.getElementById('qr-scanner');
  if (introEl)   introEl.classList.add('hidden');
  if (scannerEl) scannerEl.classList.remove('hidden');

  // Save phase so we skip briefing on re-entry
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'scanner';
  saveState(state);

  // Stop the briefing video
  const avatarVideo = document.getElementById('qr-avatar-video');
  if (avatarVideo) { avatarVideo.pause(); avatarVideo.currentTime = 0; }

  renderLockPanel(state, stage);

  // Free-collection mode: no required locks — show button to go to deactivation
  const freeMode = !stage.puzzle?.requiredLocks?.length;
  const continueBtn = document.getElementById('qr-continue-btn');
  if (freeMode && continueBtn) {
    continueBtn.classList.remove('hidden');
    continueBtn.onclick = () => {
      stopCamera();
      onSolved(stage);
    };
  } else if (continueBtn) {
    continueBtn.classList.add('hidden');
  }

  // Load jsQR
  try {
    await loadJsQR();
  } catch {
    showQRFeedback('Erreur : impossible de charger le scanner.', 'error');
    return;
  }

  // Start camera
  const cameraVideo = document.getElementById('qr-camera');
  const canvas      = document.getElementById('qr-canvas');
  const ctx         = canvas?.getContext('2d', { willReadFrequently: true });

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    if (cameraVideo) cameraVideo.srcObject = cameraStream;
  } catch {
    showQRFeedback('Erreur : accès caméra refusé.', 'error');
    return;
  }

  let lastScanned = '';
  let cooldown = false;

  // Scan loop
  scanLoop = setInterval(() => {
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

    handleQRCode(qr.data, stage, state, onSolved);
  }, 250);
}

function handleQRCode(data, stage, state, onSolved) {
  if (!data.startsWith(QR_PREFIX)) {
    showQRFeedback('QR non reconnu.', 'error');
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
      showKeycardReveal(color);
      playSFX('assets/audio/card_found.wav');
      showQRFeedback(`Carte ${KEYCARD_COLORS[color]?.label || color} collectée !`, 'success');
    } else {
      showQRFeedback(`Carte ${KEYCARD_COLORS[color]?.label || color} déjà en possession.`, 'info');
    }
    renderLockPanel(state, stage);
    return;
  }

  if (type === 'LOCK') {
    // Free-collection mode: locks not used
    if (!stage.puzzle?.requiredLocks?.length) {
      showQRFeedback('QR non reconnu dans ce mode.', 'error');
      return;
    }

    if (!hasKeycard(state, color)) {
      const reqLabel = KEYCARD_COLORS[color]?.label || color;
      showQRFeedback(`Accréditation insuffisante. Carte ${reqLabel} requise.`, 'error');
      playSFX('assets/audio/button_clicked.mp3');
      return;
    }

    const isNew = unlockStation(state, color);
    renderLockPanel(state, stage);

    if (isNew) {
      showQRFeedback('Station déverrouillée !', 'success');
      playSFX('assets/audio/zone_found.mp3');
    } else {
      showQRFeedback('Station déjà déverrouillée.', 'info');
    }

    // Check if all 3 locks are open
    const allOpen = LOCK_STATIONS.every(l => (state.unlockedStations || []).includes(l.id));
    if (allOpen) {
      stopCamera();
      solvePuzzle(state, stage.id);
      showQRFeedback('Toutes les stations déverrouillées ! Module d\'analyse réactivé.', 'success');
      playSFX('assets/audio/zone_found.mp3');
      setTimeout(() => onSolved(stage), 3000);
    }
    return;
  }

  showQRFeedback('QR non reconnu.', 'error');
}

/* ───────── Lock panel (3 locks on screen) ───────── */

function renderLockPanel(state, stage) {
  const panel = document.getElementById('qr-lock-panel');
  if (!panel) return;

  // Free-collection mode: hide lock panel
  if (!stage?.puzzle?.requiredLocks?.length) {
    panel.innerHTML = '';
    return;
  }

  const unlocked = state.unlockedStations || [];
  const cards    = state.keycards || [];

  panel.innerHTML = LOCK_STATIONS.map(lock => {
    const isOpen   = unlocked.includes(lock.id);
    const hasKey   = cards.includes(lock.requires);
    const color    = KEYCARD_COLORS[lock.requires]?.css || '#888';
    const cls      = isOpen ? 'qr-lock open' : 'qr-lock closed';
    const icon     = isOpen ? '🔓' : '🔒';
    return `
      <div class="${cls}" style="--lock-color: ${color}">
        <span class="qr-lock-icon">${icon}</span>
        <span class="qr-lock-name">${lock.label}</span>
      </div>`;
  }).join('');
}

/* ───────── Keycard reveal overlay ───────── */

function showKeycardReveal(color) {
  const overlay = document.getElementById('qr-card-overlay');
  const titleEl = document.getElementById('qr-card-title');
  const colorEl = document.getElementById('qr-card-color');
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

/* ───────── Feedback bar ───────── */

function showQRFeedback(msg, type = 'info') {
  const el = document.getElementById('qr-feedback-text');
  const wrap = document.getElementById('qr-feedback');
  if (el) el.textContent = msg;
  if (wrap) {
    wrap.className = `qr-feedback qr-feedback-${type}`;
    // Reset animation
    wrap.style.animation = 'none';
    wrap.offsetHeight;
    wrap.style.animation = '';
  }
}

/* ───────── Cleanup ───────── */

function stopCamera() {
  if (scanLoop) { clearInterval(scanLoop); scanLoop = null; }
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const cam = document.getElementById('qr-camera');
  if (cam) cam.srcObject = null;
}
