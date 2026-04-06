/**
 * Screen: Field Ops — tabbed screen with QR Scanner + AR Scanner.
 *
 * After the intro cinematic, shows a tabbed interface:
 *   - Tab 1: QR Scanner (active immediately)
 *   - Tab 2: AR Scanner (locked until arActivated === true in state)
 *
 * QR scanner collects items (keycards, evidence).
 * AR scanner finds hidden objects using device orientation.
 *
 * The stage solves when ALL AR objects are found.
 */

import { playSFX } from '../../ui.js';
import { solvePuzzle, addKeycard, saveState, fetchState } from '../../state.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { requestCameraWithRetry } from '../../utils/camera.js';
import { updateInventoryBadge } from '../../screens/evidence.js';
import { fbOnStateChange } from '../../state.js';
import { INTRO_SEQUENCE, AR_OBJECTS, AR_BRIEFING_SEQUENCE } from './config.js';

const PREFIX = 'field-ops';

/* ───────── ITEM_CATALOG for QR:ITEM codes ───────── */
const ITEM_CATALOG = {
  RED:    { label: 'Carte Rouge',  icon: '🔑', css: '#ff3040' },
  BLUE:   { label: 'Carte Bleue',  icon: '🔑', css: '#4488ff' },
  YELLOW: { label: 'Carte Jaune',  icon: '🔑', css: '#f5c542' },
};

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
let qrScanLoop = null;
let arScanLoop = null;
let seekLoop = null;
let orientationHandler = null;
let foundObjects = [];
let currentOrientation = { alpha: null, beta: null, gamma: null };
let activeTab = 'qr';
let stateUnsubscribe = null;

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';

  const layout = document.createElement('div');
  layout.className = 'stage-layout qr-layout';

  // Phase 1: Intro cinematic
  layout.appendChild(createIntroCinematicDOM(PREFIX));

  // Phase 2: Tabbed scanner
  const tabbed = document.createElement('div');
  tabbed.className = 'field-ops-panel hidden';
  tabbed.id = `${PREFIX}-panel`;
  tabbed.innerHTML = `
    <div class="fo-tabs">
      <button class="fo-tab active" data-tab="qr" id="${PREFIX}-tab-qr">
        <span class="fo-tab-icon">📷</span> SCANNER QR
      </button>
      <button class="fo-tab" data-tab="ar" id="${PREFIX}-tab-ar">
        <span class="fo-tab-icon">🔒</span> SCANNER AR
        <span class="fo-tab-lock" id="${PREFIX}-ar-lock">TIER 3</span>
      </button>
    </div>

    <!-- QR tab -->
    <div class="fo-content" id="${PREFIX}-qr-content">
      <div class="qr-camera-wrap">
        <video id="${PREFIX}-camera" autoplay playsinline muted></video>
        <canvas id="${PREFIX}-canvas" class="hidden"></canvas>
        <div class="qr-crosshair"></div>
      </div>
    </div>

    <!-- AR tab -->
    <div class="fo-content hidden" id="${PREFIX}-ar-content">
      <div class="fo-ar-locked" id="${PREFIX}-ar-locked">
        <div class="fo-ar-locked-icon">🔒</div>
        <div class="fo-ar-locked-title">MODULE AR VERROUILLÉ</div>
        <div class="fo-ar-locked-msg">Accès Tier 3 requis.<br>Activez le module AR depuis le terminal.</div>
      </div>
      <div class="fo-ar-active hidden" id="${PREFIX}-ar-active">
        <div class="arscan-camera-wrap">
          <video id="${PREFIX}-ar-camera" autoplay playsinline muted></video>
          <canvas id="${PREFIX}-ar-canvas" class="hidden"></canvas>
          <div class="arscan-overlay" id="${PREFIX}-ar-overlay">
            <div class="arscan-scan-line" id="${PREFIX}-ar-scan-line"></div>
          </div>
          <div class="arscan-searching" id="${PREFIX}-ar-searching">
            <div class="arscan-searching-icon">📡</div>
            <div class="arscan-searching-text">Recherche du signal…</div>
            <div class="arscan-searching-hint">Explorez avec la caméra</div>
          </div>
          <div class="arscan-seeking hidden" id="${PREFIX}-ar-seeking">
            <div class="arscan-seeking-arrow" id="${PREFIX}-ar-seeking-arrow">➤</div>
            <div class="arscan-seeking-text" id="${PREFIX}-ar-seeking-text">Signal détecté !</div>
          </div>
          <div class="arscan-markers hidden" id="${PREFIX}-ar-markers"></div>
        </div>
        <div class="arscan-status" id="${PREFIX}-ar-status">
          <div class="arscan-progress">
            <span class="arscan-progress-label">OBJETS DÉTECTÉS</span>
            <span class="arscan-progress-count" id="${PREFIX}-ar-count">0 / ${AR_OBJECTS.length}</span>
          </div>
          <div class="arscan-objects" id="${PREFIX}-ar-objects"></div>
        </div>
        <div class="arscan-feedback" id="${PREFIX}-ar-feedback">
          <span id="${PREFIX}-ar-feedback-text">Déplacez la caméra pour scanner…</span>
        </div>
      </div>
    </div>

    <!-- QR card reveal overlay -->
    <div class="qr-card-overlay hidden" id="${PREFIX}-card-overlay">
      <div class="qr-card-reveal" id="${PREFIX}-card-reveal">
        <div class="qr-card-icon">🔑</div>
        <div class="qr-card-title" id="${PREFIX}-card-title">OBJET COLLECTÉ</div>
        <div class="qr-card-color" id="${PREFIX}-card-color"></div>
      </div>
    </div>

    <!-- AR object reveal overlay -->
    <div class="arscan-reveal-overlay hidden" id="${PREFIX}-reveal-overlay">
      <div class="arscan-reveal" id="${PREFIX}-reveal">
        <div class="arscan-reveal-icon" id="${PREFIX}-reveal-icon"></div>
        <div class="arscan-reveal-label" id="${PREFIX}-reveal-label"></div>
        <div class="arscan-reveal-desc" id="${PREFIX}-reveal-desc"></div>
      </div>
    </div>
  `;
  layout.appendChild(tabbed);

  section.appendChild(layout);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

export function start(stage, state, onSolved) {
  foundObjects = state.arFound || [];
  activeTab = 'qr';

  // Skip intro if already watched
  if (state.stagePhase && state.stagePhase[stage.id] === 'scanner') {
    return resumeScanner(stage, state, onSolved);
  }

  const panelEl = document.getElementById(`${PREFIX}-panel`);
  if (panelEl) panelEl.classList.add('hidden');

  const intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, {
    async requestCamera(event, abort) {
      const granted = await requestCameraWithRetry(intro.currentLine, abort);
      if (abort.aborted || !granted) return 'stop';
      return 'reset-clock';
    },
    startScanner() {
      intro.hide();
      transitionToPanel(stage, state, onSolved);
      return 'stop';
    },
  });

  return () => {
    intro.cleanup();
    cleanup();
  };
}

/* ═══════════════  Phase transitions  ═══════════════ */

function resumeScanner(stage, state, onSolved) {
  const introEl = document.getElementById(`${PREFIX}-intro`);
  if (introEl) introEl.classList.add('hidden');
  transitionToPanel(stage, state, onSolved);
  return () => cleanup();
}

async function transitionToPanel(stage, state, onSolved) {
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'scanner';
  saveState(state);

  // Sync AR state from Firebase before showing anything
  if (state.playerAgent) {
    const remote = await fetchState(state.playerAgent);
    if (remote && remote.arActivated && !state.arActivated) {
      state.arActivated = true;
      state.accessTier = remote.accessTier || state.accessTier;
      saveState(state);
    }
  }

  const introEl = document.getElementById(`${PREFIX}-intro`);
  const panelEl = document.getElementById(`${PREFIX}-panel`);

  // If AR not activated and briefing not yet shown, play AR briefing
  if (!state.arActivated && !state.arBriefingDone) {
    if (panelEl) panelEl.classList.add('hidden');
    if (introEl) introEl.classList.remove('hidden');

    await new Promise((resolve) => {
      const briefing = startIntroCinematic(PREFIX, AR_BRIEFING_SEQUENCE, {
        endBriefing() {
          briefing.hide();
          resolve();
          return 'stop';
        },
      });
    });

    state.arBriefingDone = true;
    saveState(state);
  }

  if (introEl) introEl.classList.add('hidden');
  if (panelEl) panelEl.classList.remove('hidden');

  updateARLockState(state);
  bindTabs(stage, state, onSolved);
  startQRScanner(stage, state, onSolved);

  // Listen for Firebase state changes (e.g. AR activation from terminal)
  if (state.playerAgent) {
    stateUnsubscribe = fbOnStateChange(state.playerAgent, (remote) => {
      if (!remote) return;
      // Sync AR activation
      if (remote.arActivated && !state.arActivated) {
        state.arActivated = true;
        state.accessTier = remote.accessTier || state.accessTier;
        saveState(state);
        updateARLockState(state);
      }
    });
  }
}

/* ═══════════════  Tabs  ═══════════════ */

function bindTabs(stage, state, onSolved) {
  const tabQR = document.getElementById(`${PREFIX}-tab-qr`);
  const tabAR = document.getElementById(`${PREFIX}-tab-ar`);

  tabQR?.addEventListener('click', () => switchTab('qr', stage, state, onSolved));
  tabAR?.addEventListener('click', () => switchTab('ar', stage, state, onSolved));
}

function switchTab(tab, stage, state, onSolved) {
  const qrContent = document.getElementById(`${PREFIX}-qr-content`);
  const arContent = document.getElementById(`${PREFIX}-ar-content`);
  const tabQR = document.getElementById(`${PREFIX}-tab-qr`);
  const tabAR = document.getElementById(`${PREFIX}-tab-ar`);

  // If trying to switch to AR but it's locked, still show the locked page

  // Stop current scanner
  if (activeTab === 'qr') stopQRScanner();
  if (activeTab === 'ar') stopARScanner();

  activeTab = tab;

  if (tab === 'qr') {
    qrContent?.classList.remove('hidden');
    arContent?.classList.add('hidden');
    tabQR?.classList.add('active');
    tabAR?.classList.remove('active');
    startQRScanner(stage, state, onSolved);
  } else {
    qrContent?.classList.add('hidden');
    arContent?.classList.remove('hidden');
    tabQR?.classList.remove('active');
    tabAR?.classList.add('active');
    // Only start AR camera if module is activated
    if (state.arActivated) startARScanner(stage, state, onSolved);
  }
}

function updateARLockState(state) {
  const lockEl   = document.getElementById(`${PREFIX}-ar-locked`);
  const activeEl = document.getElementById(`${PREFIX}-ar-active`);
  const tabAR    = document.getElementById(`${PREFIX}-tab-ar`);
  const lockBadge = document.getElementById(`${PREFIX}-ar-lock`);

  if (state.arActivated) {
    tabAR?.classList.remove('locked');
    if (lockBadge) lockBadge.textContent = '';
    const tabIcon = tabAR?.querySelector('.fo-tab-icon');
    if (tabIcon) tabIcon.textContent = '📡';
    lockEl?.classList.add('hidden');
    activeEl?.classList.remove('hidden');
  } else {
    tabAR?.classList.add('locked');
    lockEl?.classList.remove('hidden');
    activeEl?.classList.add('hidden');
  }
}

/* ═══════════════  QR Scanner  ═══════════════ */

async function startQRScanner(stage, state, onSolved) {
  try { await loadJsQR(); } catch {
    showQRFeedback('Erreur : scanner indisponible.', 'error');
    return;
  }

  const video  = document.getElementById(`${PREFIX}-camera`);
  const canvas = document.getElementById(`${PREFIX}-canvas`);
  const ctx    = canvas?.getContext('2d', { willReadFrequently: true });

  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
    }
    if (video) video.srcObject = cameraStream;
  } catch {
    showQRFeedback('Erreur : accès caméra refusé.', 'error');
    return;
  }

  let lastScanned = '';
  let cooldown = false;

  qrScanLoop = setInterval(() => {
    if (!video || video.readyState < 2) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });

    if (!qr || !qr.data || cooldown) return;
    if (qr.data === lastScanned) return;

    lastScanned = qr.data;
    cooldown = true;
    setTimeout(() => { cooldown = false; lastScanned = ''; }, 3000);

    handleQRCode(qr.data, stage, state);
  }, 250);
}

function stopQRScanner() {
  if (qrScanLoop) { clearInterval(qrScanLoop); qrScanLoop = null; }
}

function handleQRCode(data, stage, state) {
  if (!data.startsWith('SEFY:')) {
    showQRFeedback('QR non reconnu.', 'error');
    return;
  }

  const parts = data.replace('SEFY:', '').split(':');
  const type  = parts[0];
  const value = parts[1];

  if (type === 'KEY') {
    const isNew = addKeycard(state, value);
    updateInventoryBadge(state);
    const item = ITEM_CATALOG[value];

    if (isNew) {
      showQRCardReveal(value);
      playSFX('assets/audio/card_found.wav');
      showQRFeedback(`${item?.label || value} collectée !`, 'success');
    } else {
      showQRFeedback(`${item?.label || value} — déjà en possession.`, 'info');
    }
    return;
  }

  if (type === 'ITEM') {
    // Generic inventory item
    if (!state.inventory) state.inventory = [];
    if (!state.inventory.includes(value)) {
      state.inventory.push(value);
      saveState(state);
      updateInventoryBadge(state);
      showQRFeedback(`Objet collecté : ${value}`, 'success');
      playSFX('assets/audio/card_found.wav');
    } else {
      showQRFeedback(`${value} — déjà collecté.`, 'info');
    }
    return;
  }

  showQRFeedback('QR non reconnu.', 'error');
}

function showQRFeedback(msg, type = 'info') {
  const el   = document.getElementById(`${PREFIX}-qr-feedback-text`);
  const wrap = document.getElementById(`${PREFIX}-qr-feedback`);
  if (el) el.textContent = msg;
  if (wrap) {
    wrap.className = `qr-feedback qr-feedback-${type}`;
    wrap.style.animation = 'none';
    wrap.offsetHeight;
    wrap.style.animation = '';
  }
}

function showQRCardReveal(color) {
  const overlay = document.getElementById(`${PREFIX}-card-overlay`);
  const titleEl = document.getElementById(`${PREFIX}-card-title`);
  const colorEl = document.getElementById(`${PREFIX}-card-color`);
  if (!overlay) return;

  const item = ITEM_CATALOG[color] || { label: color, css: '#888' };
  if (titleEl) titleEl.textContent = item.label;
  if (colorEl) colorEl.style.background = item.css;

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

/* ═══════════════  AR Scanner  ═══════════════ */

async function startARScanner(stage, state, onSolved) {
  try { await loadJsQR(); } catch {
    showARFeedback('Erreur : scanner indisponible.', 'error');
    return;
  }

  const video  = document.getElementById(`${PREFIX}-ar-camera`);
  const canvas = document.getElementById(`${PREFIX}-ar-canvas`);
  const ctx    = canvas?.getContext('2d', { willReadFrequently: true });

  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
    }
    if (video) video.srcObject = cameraStream;
  } catch {
    showARFeedback('Erreur : accès caméra refusé.', 'error');
    return;
  }

  renderARObjectStatus();
  updateARSearchingVisibility();

  // Check if all found already
  const remaining = AR_OBJECTS.filter(o => !foundObjects.includes(o.id));
  if (remaining.length === 0) {
    completeARScan(stage, state, onSolved);
    return;
  }

  showARFeedback('Explorez pour détecter les signaux…', 'info');
  let cooldown = false;

  arScanLoop = setInterval(() => {
    if (!video || video.readyState < 2 || cooldown) return;
    if (!video.videoWidth || !video.videoHeight) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
    if (!qr || !qr.data) return;

    const obj = AR_OBJECTS.find(o => o.qrCode === qr.data.trim());
    if (!obj) return;
    if (foundObjects.includes(obj.id)) {
      showARFeedback(`${obj.label} — déjà collecté.`, 'info');
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 3000);
      return;
    }

    cooldown = true;
    if (arScanLoop) { clearInterval(arScanLoop); arScanLoop = null; }
    playSFX('assets/audio/zone_found.wav');
    startSeeking(obj, stage, state, onSolved);
  }, 250);
}

function stopARScanner() {
  if (arScanLoop) { clearInterval(arScanLoop); arScanLoop = null; }
  if (seekLoop) { clearInterval(seekLoop); seekLoop = null; }
  stopOrientationTracking();
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
    yawDiff, pitchDiff, deltaYaw: delta.yaw, deltaPitch: delta.pitch,
  };
}

/* ═══════════════  AR Seeking  ═══════════════ */

function startSeeking(obj, stage, state, onSolved) {
  const searchingEl = document.getElementById(`${PREFIX}-ar-searching`);
  const seekingEl   = document.getElementById(`${PREFIX}-ar-seeking`);
  const seekTextEl  = document.getElementById(`${PREFIX}-ar-seeking-text`);
  const seekArrowEl = document.getElementById(`${PREFIX}-ar-seeking-arrow`);
  const markersEl   = document.getElementById(`${PREFIX}-ar-markers`);

  if (searchingEl) searchingEl.classList.add('hidden');
  if (seekingEl)   seekingEl.classList.remove('hidden');
  if (markersEl)   { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }
  if (seekTextEl)  seekTextEl.textContent = obj.seekHint || 'Signal détecté ! Cherchez autour…';

  showARFeedback('Signal détecté ! Cherchez l\'objet…', 'success');
  startOrientationTracking();

  let objectRevealed = false;
  const abort = { aborted: false };

  setTimeout(() => {
    if (abort.aborted || objectRevealed) return;

    if (currentOrientation.alpha == null) {
      // No orientation sensor — reveal immediately
      if (seekingEl) seekingEl.classList.add('hidden');
      objectRevealed = true;
      playSFX('assets/audio/zone_found.wav');
      showObjectOnCamera(obj, stage, state, onSolved, abort);
      return;
    }

    const origin = { ...currentOrientation };

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

  // 60s timeout
  setTimeout(() => {
    if (abort.aborted || objectRevealed) return;
    abort.aborted = true;
    if (seekLoop) { clearInterval(seekLoop); seekLoop = null; }
    if (seekingEl) seekingEl.classList.add('hidden');
    updateARSearchingVisibility();
    showARFeedback('Signal perdu. Scannez à nouveau le QR code…', 'info');
    resumeARQRScanning(stage, state, onSolved);
  }, 60000);
}

function showObjectOnCamera(obj, stage, state, onSolved, abort) {
  const markersEl = document.getElementById(`${PREFIX}-ar-markers`);
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
    marker.addEventListener('click', () => collectARObject(obj, stage, state, onSolved, abort));
    markersEl.appendChild(marker);
  }
  showARFeedback(`${obj.label} — Appuyez pour analyser !`, 'success');

  setTimeout(() => {
    if (abort.aborted || foundObjects.includes(obj.id)) return;
    if (markersEl) { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }
    updateARSearchingVisibility();
    showARFeedback('Signal perdu. Scannez à nouveau le QR code…', 'info');
    resumeARQRScanning(stage, state, onSolved);
  }, 15000);
}

function collectARObject(obj, stage, state, onSolved, abort) {
  if (foundObjects.includes(obj.id)) return;
  foundObjects.push(obj.id);
  if (!state.arFound) state.arFound = [];
  state.arFound.push(obj.id);
  saveState(state);

  playSFX('assets/audio/zone_found.wav');
  showARReveal(obj);
  renderARObjectStatus();
  updateInventoryBadge(state);

  const markersEl = document.getElementById(`${PREFIX}-ar-markers`);
  if (markersEl) { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }

  const allFound = AR_OBJECTS.every(o => foundObjects.includes(o.id));
  if (allFound) {
    setTimeout(() => completeARScan(stage, state, onSolved), 3000);
  } else {
    updateARSearchingVisibility();
    setTimeout(() => {
      showARFeedback('Objet collecté ! Continuez à explorer…', 'success');
      resumeARQRScanning(stage, state, onSolved);
    }, 2600);
  }
}

function completeARScan(stage, state, onSolved) {
  stopARScanner();
  solvePuzzle(state, stage.id);
  showARFeedback('Tous les objets localisés !', 'success');
  playSFX('assets/audio/zone_found.wav');
  setTimeout(() => onSolved(stage), 3000);
}

function resumeARQRScanning(stage, state, onSolved) {
  const video  = document.getElementById(`${PREFIX}-ar-camera`);
  const canvas = document.getElementById(`${PREFIX}-ar-canvas`);
  const ctx    = canvas?.getContext('2d', { willReadFrequently: true });
  if (!video || !canvas || !ctx) return;

  let cooldown = false;
  arScanLoop = setInterval(() => {
    if (!video || video.readyState < 2 || cooldown) return;
    if (!video.videoWidth || !video.videoHeight) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
    if (!qr || !qr.data) return;
    const obj = AR_OBJECTS.find(o => o.qrCode === qr.data.trim());
    if (!obj || foundObjects.includes(obj.id)) return;
    cooldown = true;
    if (arScanLoop) { clearInterval(arScanLoop); arScanLoop = null; }
    playSFX('assets/audio/zone_found.wav');
    startSeeking(obj, stage, state, onSolved);
  }, 250);
}

/* ═══════════════  AR UI Helpers  ═══════════════ */

function updateARSearchingVisibility() {
  const searchingEl = document.getElementById(`${PREFIX}-ar-searching`);
  const remaining = AR_OBJECTS.filter(o => !foundObjects.includes(o.id));
  if (searchingEl) {
    searchingEl.classList.toggle('hidden', remaining.length === 0);
  }
}

function renderARObjectStatus() {
  const countEl   = document.getElementById(`${PREFIX}-ar-count`);
  const objectsEl = document.getElementById(`${PREFIX}-ar-objects`);
  if (countEl) countEl.textContent = `${foundObjects.length} / ${AR_OBJECTS.length}`;
  if (objectsEl) {
    objectsEl.innerHTML = AR_OBJECTS.map(obj => {
      const isFound = foundObjects.includes(obj.id);
      return `
        <div class="arscan-obj ${isFound ? 'found' : 'missing'}">
          <span class="arscan-obj-icon">${obj.icon}</span>
          <span class="arscan-obj-label">${obj.label}</span>
          <span class="arscan-obj-status">${isFound ? '✓' : '?'}</span>
        </div>`;
    }).join('');
  }
}

function showARReveal(obj) {
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

function showARFeedback(msg, type = 'info') {
  const el   = document.getElementById(`${PREFIX}-ar-feedback-text`);
  const wrap = document.getElementById(`${PREFIX}-ar-feedback`);
  if (el) el.textContent = msg;
  if (wrap) {
    wrap.className = `arscan-feedback arscan-feedback-${type}`;
    wrap.style.animation = 'none';
    wrap.offsetHeight;
    wrap.style.animation = '';
  }
}

/* ═══════════════  Cleanup  ═══════════════ */

function cleanup() {
  stopQRScanner();
  stopARScanner();
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  if (stateUnsubscribe) { stateUnsubscribe(); stateUnsubscribe = null; }
  const cam1 = document.getElementById(`${PREFIX}-camera`);
  const cam2 = document.getElementById(`${PREFIX}-ar-camera`);
  if (cam1) cam1.srcObject = null;
  if (cam2) cam2.srcObject = null;
}
