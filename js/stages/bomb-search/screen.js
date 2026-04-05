/**
 * Screen: Bomb Search — SEFY intro + AR camera scanner.
 *
 * Uses intro-cinematic component for Phase 1.
 * Phase 2: camera feed scans QR codes, then player rotates to "find" objects.
 */

import { playSFX } from '../../ui.js';
import { solvePuzzle, saveState } from '../../state.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { requestCameraWithRetry } from '../../utils/camera.js';
import { INTRO_SEQUENCE, AR_OBJECTS } from './config.js';

const PREFIX = 'bomb-search';

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

/* ───────── Module state ───────── */

let cameraStream = null;
let scanLoop = null;
let seekLoop = null;
let orientationHandler = null;
let foundObjects = [];
let currentOrientation = { alpha: null, beta: null, gamma: null };

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen';

  const layout = document.createElement('div');
  layout.className = 'arscan-layout';

  // Phase 1: Intro cinematic
  layout.appendChild(createIntroCinematicDOM(PREFIX));

  // Phase 2: AR Camera Scanner
  const scanner = document.createElement('div');
  scanner.className = 'arscan-scanner hidden';
  scanner.id = `${PREFIX}-scanner`;
  scanner.innerHTML = `
    <div class="arscan-camera-wrap">
      <video id="${PREFIX}-camera" autoplay playsinline muted></video>
      <canvas id="${PREFIX}-canvas" class="hidden"></canvas>

      <div class="arscan-overlay" id="${PREFIX}-overlay">
        <div class="arscan-scan-line" id="${PREFIX}-scan-line"></div>
      </div>

      <div class="arscan-searching" id="${PREFIX}-searching">
        <div class="arscan-searching-icon">📡</div>
        <div class="arscan-searching-text">Recherche du signal…</div>
        <div class="arscan-searching-hint">Explorez l'installation avec la caméra</div>
      </div>

      <div class="arscan-seeking hidden" id="${PREFIX}-seeking">
        <div class="arscan-seeking-arrow" id="${PREFIX}-seeking-arrow">➤</div>
        <div class="arscan-seeking-text" id="${PREFIX}-seeking-text">Signal détecté ! Cherchez autour…</div>
      </div>

      <div class="arscan-markers hidden" id="${PREFIX}-markers"></div>
    </div>

    <div class="arscan-status" id="${PREFIX}-status">
      <div class="arscan-progress">
        <span class="arscan-progress-label">OBJETS DÉTECTÉS</span>
        <span class="arscan-progress-count" id="${PREFIX}-count">0 / ${AR_OBJECTS.length}</span>
      </div>
      <div class="arscan-objects" id="${PREFIX}-objects"></div>
    </div>

    <div class="arscan-feedback" id="${PREFIX}-feedback">
      <span id="${PREFIX}-feedback-text">Déplacez la caméra pour scanner…</span>
    </div>
  `;
  layout.appendChild(scanner);

  // Object reveal overlay
  const revealOverlay = document.createElement('div');
  revealOverlay.className = 'arscan-reveal-overlay hidden';
  revealOverlay.id = `${PREFIX}-reveal-overlay`;
  revealOverlay.innerHTML = `
    <div class="arscan-reveal" id="${PREFIX}-reveal">
      <div class="arscan-reveal-icon" id="${PREFIX}-reveal-icon"></div>
      <div class="arscan-reveal-label" id="${PREFIX}-reveal-label"></div>
      <div class="arscan-reveal-desc" id="${PREFIX}-reveal-desc"></div>
    </div>
  `;
  layout.appendChild(revealOverlay);

  section.appendChild(layout);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

export function start(stage, state, onSolved) {
  foundObjects = state.arFound || [];

  if (state.stagePhase && state.stagePhase[stage.id] === 'scanner') {
    return resumeARScanner(stage, state, onSolved);
  }

  const scannerEl = document.getElementById(`${PREFIX}-scanner`);
  if (scannerEl) scannerEl.classList.add('hidden');

  const intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, {
    async requestCamera(event, abort) {
      const granted = await requestCameraWithRetry(intro.currentLine, abort);
      if (abort.aborted || !granted) return 'stop';
      return 'reset-clock';
    },
    startScanner() {
      intro.hide();
      transitionToScanner(stage, state, onSolved, { aborted: false });
      return 'stop';
    },
  });

  return () => {
    intro.cleanup();
    stopARCamera();
  };
}

function resumeARScanner(stage, state, onSolved) {
  const introEl   = document.getElementById(`${PREFIX}-intro`);
  const scannerEl = document.getElementById(`${PREFIX}-scanner`);
  if (introEl)   introEl.classList.add('hidden');
  if (scannerEl) scannerEl.classList.remove('hidden');

  const abort = { aborted: false };
  transitionToScanner(stage, state, onSolved, abort);

  return () => {
    abort.aborted = true;
    stopARCamera();
  };
}

/* ═══════════════  Phase 2 — Camera Scanner  ═══════════════ */

async function transitionToScanner(stage, state, onSolved, abort) {
  const scannerEl = document.getElementById(`${PREFIX}-scanner`);
  if (scannerEl) scannerEl.classList.remove('hidden');

  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'scanner';
  saveState(state);

  renderObjectStatus();
  updateSearchingVisibility();

  try { await loadJsQR(); } catch {
    showFeedback('Erreur : impossible de charger le scanner.', 'error');
    return;
  }

  const cameraVideo = document.getElementById(`${PREFIX}-camera`);
  const canvas      = document.getElementById(`${PREFIX}-canvas`);
  const ctx         = canvas?.getContext('2d', { willReadFrequently: true });

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    });
    if (cameraVideo) {
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play().catch(() => {});
    }
  } catch {
    showFeedback('Erreur : accès caméra refusé.', 'error');
    return;
  }

  await waitForVideoReady(cameraVideo);
  if (abort.aborted) return;

  // Check if already complete (resume case)
  const remaining = AR_OBJECTS.filter(o => !foundObjects.includes(o.id));
  if (remaining.length === 0) {
    completeScan(stage, state, onSolved);
    return;
  }

  showFeedback('Explorez l\'installation pour détecter les signaux…', 'info');

  let cooldown = false;

  scanLoop = setInterval(() => {
    if (abort.aborted || !cameraVideo || cameraVideo.readyState < 2 || cooldown) return;
    if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) return;

    canvas.width  = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    ctx.drawImage(cameraVideo, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
    if (!qr || !qr.data) return;

    const obj = AR_OBJECTS.find(o => o.qrCode === qr.data.trim());
    if (!obj) return;
    if (foundObjects.includes(obj.id)) {
      showFeedback(`${obj.label} — déjà collecté.`, 'info');
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 3000);
      return;
    }

    cooldown = true;
    if (scanLoop) { clearInterval(scanLoop); scanLoop = null; }
    playSFX('assets/audio/zone_found.wav');
    startSeeking(obj, stage, state, onSolved, abort);
  }, 250);
}

function waitForVideoReady(video) {
  return new Promise(resolve => {
    if (video.readyState >= 2 && video.videoWidth > 0) { resolve(); return; }
    const onReady = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('playing', onReady);
      resolve();
    };
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('playing', onReady);
    setTimeout(resolve, 5000);
  });
}

/* ═══════════════  Device Orientation  ═══════════════ */

function startOrientationTracking() {
  if (orientationHandler) return;
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(r => { if (r === 'granted') bindOrientationListener(); })
      .catch(() => {});
  } else {
    bindOrientationListener();
  }
}

function bindOrientationListener() {
  orientationHandler = (e) => {
    currentOrientation.alpha = e.alpha;
    currentOrientation.beta  = e.beta;
    currentOrientation.gamma = e.gamma;
  };
  window.addEventListener('deviceorientation', orientationHandler, true);
}

function stopOrientationTracking() {
  if (orientationHandler) {
    window.removeEventListener('deviceorientation', orientationHandler, true);
    orientationHandler = null;
  }
}

function getOrientationDelta(origin) {
  if (origin.alpha == null || currentOrientation.alpha == null) return null;
  let yaw = currentOrientation.alpha - origin.alpha;
  yaw = ((yaw + 540) % 360) - 180;
  let pitch = currentOrientation.beta - origin.beta;
  return { yaw, pitch };
}

function isAimedAtTarget(origin, target, tolerance) {
  const delta = getOrientationDelta(origin);
  if (!delta) return { aimed: false, yawDiff: 999, pitchDiff: 999 };
  const yawDiff   = Math.abs(((delta.yaw - target.yaw) + 540) % 360 - 180);
  const pitchDiff = Math.abs(delta.pitch - target.pitch);
  return {
    aimed: yawDiff <= tolerance && pitchDiff <= tolerance,
    yawDiff, pitchDiff,
    deltaYaw: delta.yaw,
    deltaPitch: delta.pitch,
  };
}

/* ═══════════════  Seeking  ═══════════════ */

function startSeeking(obj, stage, state, onSolved, abort) {
  const searchingEl = document.getElementById(`${PREFIX}-searching`);
  const seekingEl   = document.getElementById(`${PREFIX}-seeking`);
  const seekTextEl  = document.getElementById(`${PREFIX}-seeking-text`);
  const seekArrowEl = document.getElementById(`${PREFIX}-seeking-arrow`);
  const markersEl   = document.getElementById(`${PREFIX}-markers`);

  if (searchingEl) searchingEl.classList.add('hidden');
  if (seekingEl)   seekingEl.classList.remove('hidden');
  if (markersEl)   { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }
  if (seekTextEl)  seekTextEl.textContent = obj.seekHint || 'Signal détecté ! Cherchez autour…';

  showFeedback('Signal détecté dans cette zone ! Cherchez l\'objet…', 'success');

  startOrientationTracking();

  let objectRevealed = false;

  setTimeout(() => {
    if (abort.aborted || objectRevealed) return;

    if (currentOrientation.alpha == null) {
      if (seekingEl) seekingEl.classList.add('hidden');
      objectRevealed = true;
      playSFX('assets/audio/zone_found.wav');
      showObjectOnCamera(obj, stage, state, onSolved, abort);
      return;
    }

    const origin = {
      alpha: currentOrientation.alpha,
      beta:  currentOrientation.beta,
      gamma: currentOrientation.gamma,
    };

    seekLoop = setInterval(() => {
      if (abort.aborted || objectRevealed) return;

      const result = isAimedAtTarget(origin, obj.seekDirection, obj.seekTolerance);

      if (seekArrowEl && result.deltaYaw != null) {
        const arrowAngle = obj.seekDirection.yaw - result.deltaYaw;
        seekArrowEl.style.transform = `translate(-50%, -50%) rotate(${arrowAngle}deg)`;
      }

      if (result.aimed) {
        objectRevealed = true;
        if (seekLoop) { clearInterval(seekLoop); seekLoop = null; }
        if (seekingEl) seekingEl.classList.add('hidden');
        playSFX('assets/audio/zone_found.wav');
        showObjectOnCamera(obj, stage, state, onSolved, abort);
      }
    }, 100);
  }, 500);

  // Timeout: 60s
  setTimeout(() => {
    if (abort.aborted || objectRevealed) return;
    if (seekLoop) { clearInterval(seekLoop); seekLoop = null; }
    if (seekingEl) seekingEl.classList.add('hidden');
    updateSearchingVisibility();
    showFeedback('Signal perdu. Scannez à nouveau le QR code…', 'info');
    resumeQRScanning(stage, state, onSolved, abort);
  }, 60000);
}

function resumeQRScanning(stage, state, onSolved, abort) {
  const cameraVideo = document.getElementById(`${PREFIX}-camera`);
  const canvas      = document.getElementById(`${PREFIX}-canvas`);
  const ctx         = canvas?.getContext('2d', { willReadFrequently: true });
  if (!cameraVideo || !canvas || !ctx) return;

  let cooldown = false;

  scanLoop = setInterval(() => {
    if (abort.aborted || !cameraVideo || cameraVideo.readyState < 2 || cooldown) return;
    if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) return;

    canvas.width  = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    ctx.drawImage(cameraVideo, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
    if (!qr || !qr.data) return;

    const obj = AR_OBJECTS.find(o => o.qrCode === qr.data.trim());
    if (!obj || foundObjects.includes(obj.id)) return;

    cooldown = true;
    if (scanLoop) { clearInterval(scanLoop); scanLoop = null; }
    playSFX('assets/audio/zone_found.wav');
    startSeeking(obj, stage, state, onSolved, abort);
  }, 250);
}

/* ═══════════════  Show Object  ═══════════════ */

function showObjectOnCamera(obj, stage, state, onSolved, abort) {
  const markersEl = document.getElementById(`${PREFIX}-markers`);

  if (markersEl) {
    markersEl.classList.remove('hidden');
    markersEl.innerHTML = '';

    const marker = document.createElement('div');
    marker.className = 'arscan-marker arscan-marker-pulse';
    marker.style.left = '50%';
    marker.style.top = '45%';
    marker.innerHTML = `
      <div class="arscan-marker-ring"></div>
      <div class="arscan-marker-icon">${obj.icon}</div>
      <div class="arscan-marker-label">${obj.label}</div>
      <div class="arscan-marker-tap">APPUYEZ POUR ANALYSER</div>
    `;

    marker.addEventListener('click', () => {
      collectObject(obj, stage, state, onSolved, abort);
    });

    markersEl.appendChild(marker);
  }

  showFeedback(`${obj.label} — Appuyez pour analyser !`, 'success');

  setTimeout(() => {
    if (abort.aborted) return;
    if (!foundObjects.includes(obj.id)) {
      if (markersEl) { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }
      updateSearchingVisibility();
      showFeedback('Signal perdu. Scannez à nouveau le QR code…', 'info');
      resumeQRScanning(stage, state, onSolved, abort);
    }
  }, 15000);
}

/* ═══════════════  Collect  ═══════════════ */

function collectObject(obj, stage, state, onSolved, abort) {
  if (foundObjects.includes(obj.id)) return;

  foundObjects.push(obj.id);
  if (!state.arFound) state.arFound = [];
  state.arFound.push(obj.id);
  saveState(state);

  playSFX('assets/audio/zone_found.wav');
  showObjectReveal(obj);
  renderObjectStatus();

  const markersEl = document.getElementById(`${PREFIX}-markers`);
  if (markersEl) { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }

  const allFound = AR_OBJECTS.every(o => foundObjects.includes(o.id));
  if (allFound) {
    setTimeout(() => completeScan(stage, state, onSolved), 3000);
  } else {
    updateSearchingVisibility();
    setTimeout(() => {
      showFeedback('Objet collecté ! Continuez à explorer…', 'success');
      resumeQRScanning(stage, state, onSolved, abort);
    }, 2600);
  }
}

function completeScan(stage, state, onSolved) {
  stopARCamera();
  solvePuzzle(state, stage.id);
  showFeedback('Tous les objets localisés ! Préparation du désamorçage…', 'success');
  playSFX('assets/audio/zone_found.wav');
  setTimeout(() => onSolved(stage), 3000);
}

/* ═══════════════  UI Helpers  ═══════════════ */

function updateSearchingVisibility() {
  const searchingEl = document.getElementById(`${PREFIX}-searching`);
  const remaining = AR_OBJECTS.filter(o => !foundObjects.includes(o.id));
  if (searchingEl) {
    if (remaining.length > 0) searchingEl.classList.remove('hidden');
    else searchingEl.classList.add('hidden');
  }
}

function renderObjectStatus() {
  const countEl   = document.getElementById(`${PREFIX}-count`);
  const objectsEl = document.getElementById(`${PREFIX}-objects`);

  if (countEl) countEl.textContent = `${foundObjects.length} / ${AR_OBJECTS.length}`;

  if (objectsEl) {
    objectsEl.innerHTML = AR_OBJECTS.map(obj => {
      const isFound = foundObjects.includes(obj.id);
      return `
        <div class="arscan-obj ${isFound ? 'found' : 'missing'}">
          <span class="arscan-obj-icon">${obj.icon}</span>
          <span class="arscan-obj-label">${obj.label}</span>
          <span class="arscan-obj-status">${isFound ? '✓' : '?'}</span>
        </div>
      `;
    }).join('');
  }
}

function showObjectReveal(obj) {
  const overlay = document.getElementById(`${PREFIX}-reveal-overlay`);
  const iconEl  = document.getElementById(`${PREFIX}-reveal-icon`);
  const labelEl = document.getElementById(`${PREFIX}-reveal-label`);
  const descEl  = document.getElementById(`${PREFIX}-reveal-desc`);
  if (!overlay) return;

  if (iconEl)  iconEl.textContent = obj.icon;
  if (labelEl) labelEl.textContent = obj.label;
  if (descEl)  descEl.textContent = obj.description;

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

function showFeedback(msg, type = 'info') {
  const el   = document.getElementById(`${PREFIX}-feedback-text`);
  const wrap = document.getElementById(`${PREFIX}-feedback`);
  if (el) el.textContent = msg;
  if (wrap) {
    wrap.className = `arscan-feedback arscan-feedback-${type}`;
    wrap.style.animation = 'none';
    wrap.offsetHeight;
    wrap.style.animation = '';
  }
}

/* ═══════════════  Cleanup  ═══════════════ */

function stopARCamera() {
  if (scanLoop) { clearInterval(scanLoop); scanLoop = null; }
  if (seekLoop) { clearInterval(seekLoop); seekLoop = null; }
  stopOrientationTracking();
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const cam = document.getElementById(`${PREFIX}-camera`);
  if (cam) cam.srcObject = null;
}
