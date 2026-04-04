/**
 * Screen: AR Scanner — camera-based environmental analysis puzzle.
 *
 * Phase 1 — SEFY Briefing (video + typed text).
 * Phase 2 — Camera scanning: player walks through the house with camera open.
 *   Each hidden object has its own QR code placed in a specific room.
 *   When the camera detects a QR, the corresponding object appears as an
 *   overlay on the camera feed. Player taps to collect.
 *
 * QR codes:
 *   SEFY:AR:BOMB   → bomb found (place in room where bomb "is")
 *   SEFY:AR:CARD   → tier-3 card found (place on a desk in another room)
 *
 * Both collected → puzzle solved → advance to defusal.
 */

import { delay } from '../ui.js';
import { playSFX } from '../ui.js';
import { solvePuzzle, saveState } from '../state.js';

/* ───────── Intro sequence ───────── */

const AR_INTRO_SEQUENCE = [
  { time: 0,      type: 'action', action: 'playAudio', src: 'assets/audio/geo_intro_sefy.wav' },
  { time: 0,      type: 'text',  text: 'Module d\'analyse environnementale réactivé.' },
  { time: 4000,   type: 'text',  text: 'Nous pouvons maintenant trouver la bombe.' },
  { time: 8000,   type: 'text',  text: 'Mais je vais avoir besoin d\'un accès tier 3 pour pouvoir la désamorcer.' },
  { time: 14000,  type: 'text',  text: 'Avec mon module activé, je crois être capable de reconstruire des objets qui ne sont plus présents.' },
  { time: 21000,  type: 'text',  text: 'Donc des cartes d\'accès avec des autorisations plus hautes.' },
  { time: 27000,  type: 'text',  text: 'On y est presque.' },
  { time: 30000,  type: 'text',  text: 'Autorisez l\'accès à la caméra pour activer le scanner environnemental.' },
  { time: 31000,  type: 'action', action: 'requestCamera' },
  // — pauses until camera granted, then time resets to 0 —
  { time: 0,      type: 'action', action: 'playAudio', src: 'assets/audio/geo_confirmed_sefy.wav' },
  { time: 0,      type: 'text',  text: 'Accès caméra confirmé.' },
  { time: 2000,   type: 'text',  text: 'Activation du scanner environnemental…' },
  { time: 4000,   type: 'text',  text: 'Explorez l\'installation avec votre caméra. Je vous indiquerai quand un objet sera détecté.' },
  { time: 7000,   type: 'action', action: 'startScanner' },
];

/* ───────── AR Objects — each tied to a QR code ───────── */

const AR_OBJECTS = [
  {
    id: 'bomb',
    qrCode: 'SEFY:AR:BOMB',
    label: 'BOMBE DÉTECTÉE',
    icon: '💣',
    description: 'Dispositif explosif localisé. Accès tier 3 requis pour le désamorçage.',
  },
  {
    id: 'tier3-card',
    qrCode: 'SEFY:AR:CARD',
    label: 'CARTE ACCÈS TIER 3',
    icon: '🪪',
    description: 'Carte d\'accès reconstruite. Autorisation tier 3 obtenue.',
  },
];

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

/* ═══════════════  DOM  ═══════════════ */

export function createARScanScreen() {
  const section = document.createElement('section');
  section.id = 'screen-arscan';
  section.className = 'screen';
  section.innerHTML = `
    <div class="arscan-layout">

      <!-- Phase 1: SEFY Briefing -->
      <div class="arscan-intro" id="arscan-intro">
        <div class="briefing-center" id="arscan-intro-center">
          <video id="arscan-avatar-video" class="ai-avatar-video" loop muted playsinline preload="auto">
            <source src="assets/video/sefy_avatar.mp4" type="video/mp4">
          </video>
          <div class="briefing-bottom">
            <div class="briefing-terminal" id="arscan-terminal">
              <span class="briefing-terminal-line" id="arscan-current-line"></span>
              <span class="terminal-cursor" id="arscan-cursor">_</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Phase 2: AR Camera Scanner -->
      <div class="arscan-scanner hidden" id="arscan-scanner">
        <div class="arscan-camera-wrap">
          <video id="arscan-camera" autoplay playsinline muted></video>
          <canvas id="arscan-canvas" class="hidden"></canvas>

          <!-- Scan grid overlay -->
          <div class="arscan-overlay" id="arscan-overlay">
            <div class="arscan-scan-line" id="arscan-scan-line"></div>
          </div>

          <!-- Searching indicator -->
          <div class="arscan-searching" id="arscan-searching">
            <div class="arscan-searching-icon">📡</div>
            <div class="arscan-searching-text">Recherche du signal…</div>
            <div class="arscan-searching-hint">Explorez l'installation avec la caméra</div>
          </div>

          <!-- AR object marker (shown when QR detected) -->
          <div class="arscan-markers hidden" id="arscan-markers"></div>
        </div>

        <!-- Status bar -->
        <div class="arscan-status" id="arscan-status">
          <div class="arscan-progress">
            <span class="arscan-progress-label">OBJETS DÉTECTÉS</span>
            <span class="arscan-progress-count" id="arscan-count">0 / ${AR_OBJECTS.length}</span>
          </div>
          <div class="arscan-objects" id="arscan-objects"></div>
        </div>

        <div class="arscan-feedback" id="arscan-feedback">
          <span id="arscan-feedback-text">Déplacez la caméra pour scanner…</span>
        </div>
      </div>

      <!-- Object reveal overlay -->
      <div class="arscan-reveal-overlay hidden" id="arscan-reveal-overlay">
        <div class="arscan-reveal" id="arscan-reveal">
          <div class="arscan-reveal-icon" id="arscan-reveal-icon"></div>
          <div class="arscan-reveal-label" id="arscan-reveal-label"></div>
          <div class="arscan-reveal-desc" id="arscan-reveal-desc"></div>
        </div>
      </div>

    </div>
  `;
  return section;
}

/* ═══════════════  State  ═══════════════ */

let cameraStream = null;
let scanLoop = null;
let foundObjects = [];

/* ═══════════════  Public entry  ═══════════════ */

export function startARScan(stage, state, onSolved) {
  foundObjects = state.arFound || [];

  // If briefing already watched, skip to scanning phase
  if (state.stagePhase && state.stagePhase[stage.id] === 'scanner') {
    return resumeARScanner(stage, state, onSolved);
  }

  const introEl   = document.getElementById('arscan-intro');
  const scannerEl = document.getElementById('arscan-scanner');
  if (introEl)   introEl.classList.remove('hidden');
  if (scannerEl) scannerEl.classList.add('hidden');

  const video = document.getElementById('arscan-avatar-video');
  if (video) video.play().catch(() => {});

  const currentLine = document.getElementById('arscan-current-line');
  if (currentLine) currentLine.textContent = '';

  const abortCtrl = { aborted: false, currentAudio: null };
  runIntroSequence(AR_INTRO_SEQUENCE, currentLine, abortCtrl, stage, state, onSolved);

  return () => {
    abortCtrl.aborted = true;
    if (video) { video.pause(); video.currentTime = 0; }
    if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
    stopARCamera();
  };
}

function resumeARScanner(stage, state, onSolved) {
  const introEl   = document.getElementById('arscan-intro');
  const scannerEl = document.getElementById('arscan-scanner');
  if (introEl)   introEl.classList.add('hidden');
  if (scannerEl) scannerEl.classList.remove('hidden');

  const abortCtrl = { aborted: false, currentAudio: null };
  transitionToScanner(stage, state, onSolved, abortCtrl);

  return () => {
    abortCtrl.aborted = true;
    stopARCamera();
  };
}

/* ═══════════════  Phase 1 — Intro Runner  ═══════════════ */

async function runIntroSequence(sequence, currentLine, abort, stage, state, onSolved) {
  let segmentStart = Date.now();

  for (const event of sequence) {
    if (abort.aborted) return;

    const elapsed = Date.now() - segmentStart;
    const waitMs = event.time - elapsed;
    if (waitMs > 0) await delay(waitMs);
    if (abort.aborted) return;

    if (event.type === 'text') {
      await typeText(currentLine, event.text);
    }

    if (event.type === 'action') {
      if (event.action === 'playAudio') {
        if (abort.currentAudio) { abort.currentAudio.pause(); }
        const audio = new Audio(event.src);
        audio.volume = 0.8;
        abort.currentAudio = audio;
        await ensureAudioPlays(audio, abort);
        segmentStart = Date.now() - event.time;
      }

      if (event.action === 'requestCamera') {
        const granted = await requestCameraWithRetry(currentLine, abort);
        if (abort.aborted) return;
        if (!granted) return;
        segmentStart = Date.now();
      }

      if (event.action === 'startScanner') {
        transitionToScanner(stage, state, onSolved, abort);
        return;
      }
    }
  }
}

function ensureAudioPlays(audio, abort) {
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

async function typeText(el, text) {
  if (!el) return;
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await delay(20 + Math.random() * 20);
  }
}

/* ═══════════════  Camera Permission  ═══════════════ */

async function requestCameraWithRetry(currentLine, abort) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    await typeText(currentLine, 'Erreur : caméra non disponible sur cet appareil.');
    return false;
  }

  let firstAttempt = true;

  while (!abort.aborted) {
    const permState = await getCameraPermissionState();

    if (permState === 'granted') {
      await typeText(currentLine, 'Accès caméra autorisé. Scanner environnemental activé.');
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

    if (firstAttempt) {
      await typeText(currentLine, 'Autorisation de la caméra requise…');
      firstAttempt = false;
    } else {
      await typeText(currentLine, 'Accès refusé. Veuillez autoriser la caméra pour continuer.');
    }

    const result = await requestCameraPermission();
    if (abort.aborted) return false;

    if (result === 'granted') {
      await typeText(currentLine, 'Accès caméra autorisé. Scanner environnemental activé.');
      return true;
    }

    await delay(2000);
  }
  return false;
}

async function getCameraPermissionState() {
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'camera' });
      return status.state;
    }
  } catch { /* Permissions API not available */ }
  return 'prompt';
}

function requestCameraPermission() {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      stream.getTracks().forEach(t => t.stop());
      return 'granted';
    })
    .catch(() => 'denied');
}

/* ═══════════════  Phase 2 — Camera Scanner  ═══════════════ */

async function transitionToScanner(stage, state, onSolved, abort) {
  const introEl   = document.getElementById('arscan-intro');
  const scannerEl = document.getElementById('arscan-scanner');
  if (introEl)   introEl.classList.add('hidden');
  if (scannerEl) scannerEl.classList.remove('hidden');

  // Save phase
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'scanner';
  saveState(state);

  // Stop briefing video
  const avatarVideo = document.getElementById('arscan-avatar-video');
  if (avatarVideo) { avatarVideo.pause(); avatarVideo.currentTime = 0; }

  renderObjectStatus();
  updateSearchingVisibility();

  // Load jsQR
  try {
    await loadJsQR();
  } catch {
    showFeedback('Erreur : impossible de charger le scanner.', 'error');
    return;
  }

  // Start camera
  const cameraVideo = document.getElementById('arscan-camera');
  const canvas      = document.getElementById('arscan-canvas');
  const ctx         = canvas?.getContext('2d', { willReadFrequently: true });

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    if (cameraVideo) cameraVideo.srcObject = cameraStream;
  } catch {
    showFeedback('Erreur : accès caméra refusé.', 'error');
    return;
  }

  // Check if already all found (resume case)
  const remaining = AR_OBJECTS.filter(o => !foundObjects.includes(o.id));
  if (remaining.length === 0) {
    completeScan(stage, state, onSolved);
    return;
  }

  showFeedback('Explorez l\'installation pour détecter les signaux…', 'info');

  let cooldown = false;

  // QR scan loop
  scanLoop = setInterval(() => {
    if (abort.aborted || !cameraVideo || cameraVideo.readyState < 2 || cooldown) return;

    canvas.width  = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    ctx.drawImage(cameraVideo, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
    if (!qr || !qr.data) return;

    // Match QR to an AR object
    const obj = AR_OBJECTS.find(o => o.qrCode === qr.data);
    if (!obj) return;

    // Already collected?
    if (foundObjects.includes(obj.id)) {
      showFeedback(`${obj.label} — déjà collecté.`, 'info');
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 3000);
      return;
    }

    // Object detected — show it!
    cooldown = true;
    playSFX('assets/audio/zone_found.wav');
    showObjectOnCamera(obj, stage, state, onSolved, abort, () => { cooldown = false; });
  }, 300);
}

/* ───────── Show object on camera feed ───────── */

function showObjectOnCamera(obj, stage, state, onSolved, abort, onDone) {
  const searchingEl = document.getElementById('arscan-searching');
  const markersEl   = document.getElementById('arscan-markers');

  // Hide searching, show marker
  if (searchingEl) searchingEl.classList.add('hidden');
  if (markersEl)   markersEl.classList.remove('hidden');

  if (markersEl) {
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
      collectObject(obj, stage, state, onSolved);
    });

    markersEl.appendChild(marker);
  }

  showFeedback(`${obj.label} — Appuyez pour analyser !`, 'success');

  // If they move the camera away (don't tap within 10s), hide and resume scanning
  setTimeout(() => {
    if (abort.aborted) return;
    if (!foundObjects.includes(obj.id)) {
      if (markersEl) { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }
      updateSearchingVisibility();
      showFeedback('Signal perdu. Continuez à scanner…', 'info');
    }
    onDone();
  }, 10000);
}

/* ───────── Collect object ───────── */

function collectObject(obj, stage, state, onSolved) {
  if (foundObjects.includes(obj.id)) return;

  foundObjects.push(obj.id);
  if (!state.arFound) state.arFound = [];
  state.arFound.push(obj.id);
  saveState(state);

  playSFX('assets/audio/zone_found.wav');
  showObjectReveal(obj);
  renderObjectStatus();

  // Hide marker
  const markersEl = document.getElementById('arscan-markers');
  if (markersEl) { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }

  // Check if all objects found
  const allFound = AR_OBJECTS.every(o => foundObjects.includes(o.id));
  if (allFound) {
    setTimeout(() => completeScan(stage, state, onSolved), 3000);
  } else {
    updateSearchingVisibility();
    setTimeout(() => {
      showFeedback('Objet collecté ! Continuez à explorer…', 'success');
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

/* ───────── Searching indicator visibility ───────── */

function updateSearchingVisibility() {
  const searchingEl = document.getElementById('arscan-searching');
  const remaining = AR_OBJECTS.filter(o => !foundObjects.includes(o.id));
  if (searchingEl) {
    if (remaining.length > 0) {
      searchingEl.classList.remove('hidden');
    } else {
      searchingEl.classList.add('hidden');
    }
  }
}

/* ───────── Object status display ───────── */

function renderObjectStatus() {
  const countEl   = document.getElementById('arscan-count');
  const objectsEl = document.getElementById('arscan-objects');

  const total = AR_OBJECTS.length;
  const found = foundObjects.length;

  if (countEl) countEl.textContent = `${found} / ${total}`;

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

/* ───────── Object reveal overlay ───────── */

function showObjectReveal(obj) {
  const overlay = document.getElementById('arscan-reveal-overlay');
  const iconEl  = document.getElementById('arscan-reveal-icon');
  const labelEl = document.getElementById('arscan-reveal-label');
  const descEl  = document.getElementById('arscan-reveal-desc');
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

/* ───────── Feedback bar ───────── */

function showFeedback(msg, type = 'info') {
  const el   = document.getElementById('arscan-feedback-text');
  const wrap = document.getElementById('arscan-feedback');
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
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const cam = document.getElementById('arscan-camera');
  if (cam) cam.srcObject = null;
}
