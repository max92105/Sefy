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

import { playSFX, showScreen } from '../../ui.js';
import { solvePuzzle, addInventoryItem, saveState, fetchState, addLogEntry } from '../../state.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { requestCameraWithRetry } from '../../utils/camera.js';
import { updateInventoryBadge } from '../../screens/evidence.js';
import { fbOnStateChange } from '../../state.js';
import { INTRO_SEQUENCE, AR_OBJECTS, AR_BRIEFING_SEQUENCE, PAPER_CATALOG, SFX, classifyAudioQR, VIDEO_LOG_CATALOG, CARD_CODES, SERINGE } from './config.js';
import { playVideo } from '../../components/video-player.js';
import { showCollectedModal } from '../../components/modals.js';
import { syncHintBadge } from '../../screens/stage.js';

const PREFIX = 'field-ops';

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
        <span class="fo-tab-lock" id="${PREFIX}-ar-lock">OFF</span>
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
        <div class="fo-ar-locked-title">MODULE AR DÉSACTIVÉ</div>
        <div class="fo-ar-locked-msg">Activez le module AR depuis un terminal pour le débloquer.<br><span class="fo-ar-locked-note">(La commande AR nécessite l'accès Tier 3.)</span></div>
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
            <div class="arscan-seeking-guide">
              <span class="arscan-seek-axis"><span class="arscan-seek-arrow" id="${PREFIX}-ar-seek-v">▲</span><span class="arscan-seek-cap">haut / bas</span></span>
              <span class="arscan-seek-axis"><span class="arscan-seek-arrow" id="${PREFIX}-ar-seek-h">◀</span><span class="arscan-seek-cap">gauche / droite</span></span>
            </div>
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

  // Sync AR + access tier from Firebase before showing anything
  if (state.playerAgent) {
    const remote = await fetchState(state.playerAgent);
    if (remote) {
      if (remote.arActivated && !state.arActivated) state.arActivated = true;
      if ((remote.accessTier || 1) > (state.accessTier || 1)) state.accessTier = remote.accessTier;
      saveState(state);
    }
  }

  // Tier 4 already granted (e.g. resuming after promotion) → field-ops is done.
  if ((state.accessTier || 1) >= 4 && !state.solvedPuzzles.includes(stage.id)) {
    advanceFromFieldOps(stage, state, onSolved);
    return;
  }

  bindTabs(stage, state, onSolved);

  // Watch the terminal: AR activation → AR briefing + unlock; Tier 4 → advance.
  if (state.playerAgent) {
    stateUnsubscribe = fbOnStateChange(state.playerAgent, (remote) => {
      if (!remote) return;
      if ((remote.accessTier || 1) > (state.accessTier || 1)) {
        state.accessTier = remote.accessTier;
        saveState(state);
      }
      if (remote.arActivated && !state.arActivated) {
        state.arActivated = true;
        saveState(state);
        playARBriefing(stage, state, onSolved);
        return;
      }
      // Tier 4 granted (player promoted with the card code) → next puzzle.
      if ((state.accessTier || 1) >= 4 && !state.solvedPuzzles.includes(stage.id)) {
        advanceFromFieldOps(stage, state, onSolved);
      }
    });
  }

  // AR already active but its briefing not yet seen (e.g. resuming after
  // activation) → play it now; otherwise just show the scanner panel.
  if (state.arActivated && !state.arBriefingDone) {
    playARBriefing(stage, state, onSolved);
  } else {
    showScannerPanel(stage, state, onSolved);
  }
}

/** Field-ops completes once Tier 4 is granted (not merely when AR objects are found). */
function advanceFromFieldOps(stage, state, onSolved) {
  if (state.solvedPuzzles.includes(stage.id)) return;
  if (stateUnsubscribe) { stateUnsubscribe(); stateUnsubscribe = null; }
  stopQRScanner();
  stopARScanner();
  solvePuzzle(state, stage.id);
  onSolved(stage);
}

/** Reveal the QR/AR tabbed panel and start the active tab's scanner. */
function showScannerPanel(stage, state, onSolved) {
  const introEl = document.getElementById(`${PREFIX}-intro`);
  const panelEl = document.getElementById(`${PREFIX}-panel`);
  if (introEl) introEl.classList.add('hidden');
  if (panelEl) panelEl.classList.remove('hidden');
  document.getElementById(`${PREFIX}-tab-ar`)?.classList.remove('hidden'); // AR tab belongs to field-ops
  updateARLockState(state);
  syncHintBadge(stage, state); // reflect the current phase's hints (scanner / ar)
  if (activeTab === 'ar' && state.arActivated) startARScanner(stage, state, onSolved);
  else startQRScanner(stage, state, onSolved);
}

/* ═══════════════  PURGE colour-card hunt (reused by sefy-rogue)  ═══════════════ */

let colorHuntUnsub = null;

/**
 * Reuse the field-ops QR scanner for the PURGE colour-card hunt.
 * Only the QR scanner is shown (the AR tab — and thus the bomb — is hidden, since
 * the bomb is revealed as a decoy). Completes once the 3 terminal OVERRIDEs are done.
 * @param {Function} onComplete — called when state.overrides reaches 3/3
 * @returns {Function} cleanup
 */
export function startColorHunt(stage, state, onComplete) {
  foundObjects = state.arFound || [];
  activeTab = 'qr';

  showScreen(`screen-${PREFIX}`);
  document.getElementById(`${PREFIX}-intro`)?.classList.add('hidden');
  document.getElementById(`${PREFIX}-panel`)?.classList.remove('hidden');

  // QR scanner only — hide the AR tab/content (no bomb objective in PURGE).
  document.getElementById(`${PREFIX}-tab-ar`)?.classList.add('hidden');
  document.getElementById(`${PREFIX}-tab-qr`)?.classList.add('active');
  document.getElementById(`${PREFIX}-qr-content`)?.classList.remove('hidden');
  document.getElementById(`${PREFIX}-ar-content`)?.classList.add('hidden');

  startQRScanner(stage, state, () => {});

  const done = (st) => Object.keys((st && st.overrides) || {}).length >= 3;

  const finish = () => {
    if (colorHuntUnsub) { colorHuntUnsub(); colorHuntUnsub = null; }
    cleanup();
    onComplete();
  };

  if (done(state)) { finish(); return () => {}; }

  if (state.playerAgent) {
    colorHuntUnsub = fbOnStateChange(state.playerAgent, (remote) => {
      if (!remote) return;
      if (remote.overrides) { state.overrides = remote.overrides; saveState(state); }
      if (done(state)) finish();
    });
  }

  return () => {
    if (colorHuntUnsub) { colorHuntUnsub(); colorHuntUnsub = null; }
    cleanup();
  };
}

/** Play SEFY's AR-module briefing once (when AR is activated), then reveal the panel. */
function playARBriefing(stage, state, onSolved) {
  if (state.arBriefingDone) { showScannerPanel(stage, state, onSolved); return; }

  stopQRScanner();
  stopARScanner();

  const introEl = document.getElementById(`${PREFIX}-intro`);
  const panelEl = document.getElementById(`${PREFIX}-panel`);
  if (panelEl) panelEl.classList.add('hidden');
  if (introEl) introEl.classList.remove('hidden');

  const briefing = startIntroCinematic(PREFIX, AR_BRIEFING_SEQUENCE, {
    endBriefing() {
      briefing.hide();
      state.arBriefingDone = true;
      saveState(state);
      showScannerPanel(stage, state, onSolved);
      return 'stop';
    },
  });
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

/** Append a SEFY system-log line for a scan, once per unique key. */
function logScan(state, key, text) {
  if (!state.loggedScans) state.loggedScans = [];
  if (state.loggedScans.includes(key)) return;
  state.loggedScans.push(key);
  addLogEntry(state, text); // persists via saveState
}

function handleQRCode(data, stage, state) {
  if (!data.startsWith('SEFY:')) {
    showQRFeedback('QR non reconnu.', 'error');
    return;
  }

  const parts = data.replace('SEFY:', '').split(':');
  const type  = parts[0];
  const value = parts[1];

  if (type === 'SERINGE') {
    const isNew = !state.hasSyringe;
    state.hasSyringe = true;
    saveState(state);
    updateInventoryBadge(state);
    logScan(state, 'syringe', 'SEFY - Objet non répertorié récupéré par agent.');
    if (isNew) showCollectedModal({ icon: '💉', label: SERINGE.label });
    else showQRFeedback(`${SERINGE.label} — déjà en possession.`, 'info');
    return;
  }

  if (type === 'CARD') {
    const card = CARD_CODES[value];
    if (!card) { showQRFeedback('Carte non reconnue.', 'error'); return; }

    // The Adrian (Tier-4) card is reconstructed via the AR module, not QR-scanned.
    if (AR_OBJECTS.some(o => o.id === value)) {
      showQRFeedback('Utilisez le module AR pour reconstruire cette carte.', 'info');
      return;
    }

    if (!state.cards) state.cards = [];
    const isNew = !state.cards.includes(value);
    if (isNew) {
      state.cards.push(value);
      saveState(state);
      updateInventoryBadge(state);
      logScan(state, `card:${value}`, `SEFY - Carte récupérée : ${card.label}.`);
      showCollectedModal({ icon: '🪪', label: card.label });
    } else {
      showQRFeedback(`${card.label} — déjà en possession.`, 'info');
    }
    return;
  }

  if (type === 'AUDIO') {
    const found = classifyAudioQR(value);
    if (!found || !found.entry.src) { showQRFeedback('Audio non reconnu.', 'error'); return; }
    const { kind, cat, entry } = found;

    // AR environmental cues are NOT readable with the plain QR scanner — they
    // require the AR module (handled in the AR scanner loop).
    if (kind === 'play' && cat === 'cue') {
      showQRFeedback('Signal AR détecté — activez le module AR pour l\'analyser.', 'info');
      return;
    }

    // Room titles — announce the room; never collected.
    if (kind === 'play') {
      playSFX(entry.src);
      showQRFeedback(`🔊 ${entry.label}`, 'info');
      logScan(state, `room:${value}`, `SEFY - Agent localisé : ${entry.room}.`);
      return;
    }

    // Audio log — collect; the player listens from the pop-up or the inventory.
    if (!state.audioLogs) state.audioLogs = [];
    const isNew = !state.audioLogs.includes(value);
    if (isNew) {
      state.audioLogs.push(value);
      saveState(state);
      updateInventoryBadge(state);
      logScan(state, `audio:${value}`, `SEFY - Enregistrement récupéré : ${entry.label}.`);
      showCollectedModal({ icon: '🔊', label: entry.label, actionLabel: '▶ ÉCOUTER', onAction: () => playSFX(entry.src) });
    } else {
      showQRFeedback(`${entry.label} — déjà collecté (voir inventaire).`, 'info');
    }
    return;
  }

  if (type === 'VIDEO') {
    const entry = VIDEO_LOG_CATALOG[value];
    if (!entry || !entry.src) { showQRFeedback('Vidéo non reconnue.', 'error'); return; }
    if (!state.videoLogs) state.videoLogs = [];
    const isNew = !state.videoLogs.includes(value);
    if (isNew) {
      state.videoLogs.push(value);
      saveState(state);
      updateInventoryBadge(state);
      logScan(state, `video:${value}`, `SEFY - Journal vidéo récupéré : ${entry.label}.`);
      showCollectedModal({ icon: '🎬', label: entry.label, actionLabel: '▶ VISIONNER', onAction: () => playVideo(entry.src) });
    } else {
      showQRFeedback(`${entry.label} — déjà collecté (voir inventaire).`, 'info');
    }
    return;
  }

  if (type === 'PAPER') {
    const paper = PAPER_CATALOG[value];
    if (!paper) { showQRFeedback('Papier non reconnu.', 'error'); return; }
    if (!state.papers) state.papers = [];
    const isNew = !state.papers.includes(value);
    if (isNew) {
      state.papers.push(value);
      saveState(state);
      updateInventoryBadge(state);
      logScan(state, `paper:${value}`, `SEFY - Document physique numérisé : ${paper.label}.`);
      showCollectedModal({ icon: '📜', label: paper.label });
    } else {
      showQRFeedback(`${paper.label} — déjà collecté (voir inventaire).`, 'info');
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
      playSFX(SFX.cardFound);
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

/* ═══════════════  AR Scanner  ═══════════════ */

// Currently-playing AR cue audio — kept so a new scan can stop it (no layering).
let arCueAudio = null;

function stopArCue() {
  if (arCueAudio) { try { arCueAudio.pause(); } catch { /* ignore */ } arCueAudio = null; }
}

function playArCue(src) {
  stopArCue();
  arCueAudio = new Audio(src);
  arCueAudio.play().catch(() => {});
}

/**
 * Handle an AR environmental cue: play its audio (replacing any cue still
 * playing — no layering), log it, and — for cues placed on an AR object —
 * also start that object's seek minigame.
 * @returns {boolean} true if the scanned data was an AR cue
 */
function tryHandleARCue(data, stage, state, onSolved) {
  if (!data.startsWith('SEFY:AUDIO:')) return false;
  const id = data.split(':')[2];
  const found = classifyAudioQR(id);
  if (!found || found.cat !== 'cue' || !found.entry.src) return false;

  playArCue(found.entry.src);
  showARFeedback(`🔊 ${found.entry.label}`, 'info');
  logScan(state, `cue:${id}`, `SEFY - Analyse environnementale — ${found.entry.room} : ${found.entry.label}.`);

  // Cues placed on an AR object also kick off its seek minigame.
  const seekId = found.entry.seek;
  if (seekId) {
    const obj = AR_OBJECTS.find(o => o.id === seekId);
    if (obj && !foundObjects.includes(obj.id)) {
      if (arScanLoop) { clearInterval(arScanLoop); arScanLoop = null; }
      startSeeking(obj, stage, state, onSolved);
    }
  }
  return true;
}

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
    const data = qr.data.trim();

    // AR object QR → start the orientation-seek minigame.
    const obj = AR_OBJECTS.find(o => o.qrCode === data);
    if (obj) {
      if (foundObjects.includes(obj.id)) {
        showARFeedback(`${obj.label} — déjà collecté.`, 'info');
        cooldown = true;
        setTimeout(() => { cooldown = false; }, 3000);
        return;
      }
      cooldown = true;
      if (arScanLoop) { clearInterval(arScanLoop); arScanLoop = null; }
      stopArCue();
      startSeeking(obj, stage, state, onSolved);
      return;
    }

    // AR environmental cue → play audio (+ maybe trigger a seek).
    if (tryHandleARCue(data, stage, state, onSolved)) {
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 3000);
    }
  }, 250);
}

function stopARScanner() {
  stopArCue();
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

let smoothAlpha = null;
let smoothBeta  = null;

/** Low-pass filter for a circular angle (degrees), handling wraparound. */
function smoothAngle(prev, next, f) {
  if (prev == null) return next;
  const d = ((next - prev + 540) % 360) - 180; // shortest signed diff
  return (prev + d * f + 360) % 360;
}

function bindOrientationListener() {
  orientationHandler = (e) => {
    if (e.alpha == null) return;
    const F = 0.2; // smoothing factor — lower is steadier but laggier
    smoothAlpha = smoothAngle(smoothAlpha, e.alpha, F);
    smoothBeta  = (smoothBeta == null) ? e.beta : smoothBeta * (1 - F) + e.beta * F;
    currentOrientation.alpha = smoothAlpha;
    currentOrientation.beta  = smoothBeta;
    currentOrientation.gamma = e.gamma;
  };
  window.addEventListener('deviceorientation', orientationHandler, true);
}

function stopOrientationTracking() {
  if (orientationHandler) {
    window.removeEventListener('deviceorientation', orientationHandler, true);
    orientationHandler = null;
  }
  smoothAlpha = null;
  smoothBeta  = null;
}

/**
 * Build the seek hint text from the target direction so it ALWAYS matches the
 * arrows (same convention): +yaw → left, +pitch → up.
 */
function seekHintFor(dir) {
  const parts = [];
  if (Math.abs(dir.yaw) > 135)     parts.push('retournez-vous');
  else if (Math.abs(dir.yaw) > 20) parts.push(dir.yaw > 0 ? 'tournez à gauche' : 'tournez à droite');
  if (Math.abs(dir.pitch) > 15)    parts.push(dir.pitch > 0 ? 'regardez vers le haut' : 'regardez vers le bas');
  return parts.length ? `Signal détecté ! ${parts.join(', ')}.` : 'Signal détecté ! Cherchez autour de vous…';
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
  const seekVEl     = document.getElementById(`${PREFIX}-ar-seek-v`); // up / down
  const seekHEl     = document.getElementById(`${PREFIX}-ar-seek-h`); // left / right
  const markersEl   = document.getElementById(`${PREFIX}-ar-markers`);

  if (searchingEl) searchingEl.classList.add('hidden');
  if (seekingEl)   seekingEl.classList.remove('hidden');
  if (markersEl)   { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }
  if (seekTextEl)  seekTextEl.textContent = seekHintFor(obj.seekDirection);

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
      stopOrientationTracking();
      showObjectOnCamera(obj, stage, state, onSolved, abort);
      return;
    }

    const origin = { ...currentOrientation };
    let aimedTicks = 0;

    seekLoop = setInterval(() => {
      if (abort.aborted || objectRevealed) return;
      const result = isAimedAtTarget(origin, obj.seekDirection, obj.seekTolerance);

      // Two separate guides: one for left/right (yaw), one for up/down (pitch).
      if (result.deltaYaw != null) {
        const tol = obj.seekTolerance;
        const yawError   = ((obj.seekDirection.yaw - result.deltaYaw + 540) % 360) - 180; // signed
        const pitchError = obj.seekDirection.pitch - result.deltaPitch;                   // signed

        if (seekHEl) {
          const ok = Math.abs(yawError) <= tol;
          // +yaw means we must increase alpha → turn LEFT (W3C convention).
          seekHEl.textContent = ok ? '✓' : (yawError > 0 ? '◀' : '▶');
          seekHEl.classList.toggle('aligned', ok);
        }
        if (seekVEl) {
          const ok = Math.abs(pitchError) <= tol;
          // +pitch means we must increase beta → look UP.
          seekVEl.textContent = ok ? '✓' : (pitchError > 0 ? '▲' : '▼');
          seekVEl.classList.toggle('aligned', ok);
        }
      }

      // Require the aim to be HELD briefly (~400ms) so a fly-by doesn't count.
      if (result.aimed) {
        aimedTicks++;
        if (seekTextEl) seekTextEl.textContent = 'Cible verrouillée…';
        if (aimedTicks >= 4) {
          objectRevealed = true;
          if (seekLoop) { clearInterval(seekLoop); seekLoop = null; }
          if (seekingEl) seekingEl.classList.add('hidden');
          stopOrientationTracking();
          showObjectOnCamera(obj, stage, state, onSolved, abort);
        }
      } else {
        if (aimedTicks > 0 && seekTextEl) seekTextEl.textContent = seekHintFor(obj.seekDirection);
        aimedTicks = 0;
      }
    }, 100);
  }, 500);

  // 60s timeout
  setTimeout(() => {
    if (abort.aborted || objectRevealed) return;
    abort.aborted = true;
    if (seekLoop) { clearInterval(seekLoop); seekLoop = null; }
    stopOrientationTracking();
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
    abort.aborted = true;
    if (markersEl) { markersEl.classList.add('hidden'); markersEl.innerHTML = ''; }
    updateARSearchingVisibility();
    showARFeedback('Signal perdu. Scannez à nouveau le QR code…', 'info');
    resumeARQRScanning(stage, state, onSolved);
  }, 15000);
}

function collectARObject(obj, stage, state, onSolved, abort) {
  if (foundObjects.includes(obj.id)) return;
  abort.aborted = true; // cancel lingering seek/marker timeouts
  foundObjects.push(obj.id);
  // A card AR object (the Adrian Tier-4 card) goes to the unified cards list;
  // everything else (the bomb) goes to arFound.
  if (CARD_CODES[obj.id]) {
    if (!state.cards) state.cards = [];
    if (!state.cards.includes(obj.id)) state.cards.push(obj.id);
    logScan(state, `ar:${obj.id}`, `SEFY - Carte reconstruite par module AR : ${CARD_CODES[obj.id].label}.`);
  } else {
    if (!state.arFound) state.arFound = [];
    state.arFound.push(obj.id);
    logScan(state, `ar:${obj.id}`, 'SEFY - Dispositif explosif localisé par agent terrain.');
  }
  saveState(state);

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
  // All AR objects found — but the stage only advances once Tier 4 is granted
  // (the player promotes with the card code via a terminal). See transitionToPanel.
  stopARScanner();
  showARFeedback('Tous les objets localisés ! Utilisez le code de la carte pour passer au Tier 4 depuis un terminal.', 'success');
}

function resumeARQRScanning(stage, state, onSolved) {
  // Stop any leftover loops before starting fresh
  if (arScanLoop) { clearInterval(arScanLoop); arScanLoop = null; }

  const video  = document.getElementById(`${PREFIX}-ar-camera`);
  const canvas = document.getElementById(`${PREFIX}-ar-canvas`);
  const ctx    = canvas?.getContext('2d', { willReadFrequently: true });
  if (!video || !canvas || !ctx) return;

  // Ensure camera stream is attached
  if (cameraStream && !video.srcObject) {
    video.srcObject = cameraStream;
  }

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
    const data = qr.data.trim();

    // AR object QR → start the orientation-seek.
    const obj = AR_OBJECTS.find(o => o.qrCode === data);
    if (obj) {
      if (foundObjects.includes(obj.id)) return;
      cooldown = true;
      if (arScanLoop) { clearInterval(arScanLoop); arScanLoop = null; }
      stopArCue();
      startSeeking(obj, stage, state, onSolved);
      return;
    }

    // AR environmental cue → play audio (+ maybe trigger a seek).
    if (tryHandleARCue(data, stage, state, onSolved)) {
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 3000); // avoid retriggering every frame
    }
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
