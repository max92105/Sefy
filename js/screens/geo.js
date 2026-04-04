/**
 * Screen: Geo Tracker — two-phase proximity puzzle.
 *
 * Phase 1 — AI Intro Cinematic (optional):
 *   SEFY video + typewriter text + geolocation permission request.
 *
 * Phase 2 — Warm/Cold Radar Tracking:
 *   GLACIAL → FROID → TIÈDE → CHAUD → BRÛLANT with audio SFX on zone change.
 *
 * Usage:
 *   startGeoTracker(stage, state, onSolved, introSequence)
 *   - introSequence: array of events, or null to skip intro.
 *
 * Configure via stage.puzzle:
 *   { type: "geo", lat: 45.123, lng: -73.456, radiusMeters: 2, ... }
 */

import { delay } from '../ui.js';
import { playSFX } from '../ui.js';
import { solvePuzzle, saveState } from '../state.js';
import { typewriter } from '../typewriter.js';
import { runIntroSequence } from '../intro-runner.js';

/* ───────── Media (easy to change) ───────── */
const MEDIA = {
  video:        'assets/video/sefy_avatar.mp4',
  sfxBurning:   'assets/audio/zone_burning.wav',
  sfxHot:       'assets/audio/zone_hot.wav',
  sfxWarm:      'assets/audio/zone_warm.wav',
  sfxCold:      'assets/audio/zone_cold.wav',
  sfxFound:     'assets/audio/zone_found.wav',
};

/* ───────── Distance zones ───────── */
const ZONES = [
  { maxDist: 5,        label: 'BRÛLANT', cls: 'geo-burning',  color: 'var(--accent-red)',   msg: 'Vous y êtes presque !',                 sfx: MEDIA.sfxBurning },
  { maxDist: 10,       label: 'CHAUD',   cls: 'geo-hot',      color: '#ff6633',             msg: 'Très proche… cherchez bien.',            sfx: MEDIA.sfxHot },
  { maxDist: 15,       label: 'TIÈDE',   cls: 'geo-warm',     color: 'var(--accent-amber)', msg: 'Vous approchez de la zone.',             sfx: MEDIA.sfxWarm },
  { maxDist: 20,       label: 'FROID',   cls: 'geo-cold',     color: '#66bbff',             msg: 'Encore loin… continuez à explorer.',     sfx: MEDIA.sfxCold },
  { maxDist: Infinity, label: 'GLACIAL', cls: 'geo-freezing',  color: '#4488ff',             msg: 'Aucun signal détecté dans ce secteur.',  sfx: MEDIA.sfxCold },
];

/* ───────── Geolocation options (max precision + refresh) ───────── */
const GEO_OPTS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};
const POLL_INTERVAL_MS = 800;

/* ───────── Module state ───────── */
let watchId = null;
let pollInterval = null;

/* ═══════════════  DOM  ═══════════════ */

export function createGeoScreen() {
  const section = document.createElement('section');
  section.id = 'screen-geo';
  section.className = 'screen';
  section.innerHTML = `
    <div class="geo-layout">

      <!-- Phase 1: AI Intro -->
      <div class="geo-intro" id="geo-intro">
        <div class="briefing-center" id="geo-intro-center">
          <video id="geo-avatar-video" class="ai-avatar-video" loop muted playsinline preload="auto">
            <source src="${MEDIA.video}" type="video/mp4">
          </video>
          <div class="briefing-bottom">
            <div class="briefing-terminal" id="geo-terminal">
              <span class="briefing-terminal-line" id="geo-current-line"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Phase 2: Radar Tracking -->
      <div class="geo-tracker hidden" id="geo-tracker">
        <div class="screen-content centered">
          <div class="screen-header">
            <span class="header-tag" id="geo-tag">ÉTAPE</span>
            <span class="header-title" id="geo-title">—</span>
          </div>

          <div class="geo-narrative" id="geo-narrative"></div>

          <div class="geo-radar" id="geo-radar">
            <div class="geo-ring geo-ring-outer"></div>
            <div class="geo-ring geo-ring-mid"></div>
            <div class="geo-ring geo-ring-inner"></div>
            <div class="geo-dot" id="geo-dot"></div>
          </div>

          <div class="geo-status" id="geo-status">
            <span class="geo-zone-label" id="geo-zone-label">INITIALISATION…</span>
            <span class="geo-zone-msg" id="geo-zone-msg">Activation du scanner de proximité…</span>
          </div>

          <div class="geo-distance" id="geo-distance">-- m</div>

          <div class="geo-found hidden" id="geo-found">
            <p class="geo-found-text">SIGNAL LOCALISÉ — ZONE SÉCURISÉE</p>
            <p class="geo-found-instruction" id="geo-found-instruction"></p>
          </div>

          <div class="stage-actions">
            <button id="btn-hint" class="btn btn-secondary">DEMANDER UN INDICE</button>
          </div>
        </div>
      </div>

    </div>
  `;
  return section;
}

/* ═══════════════  Public entry  ═══════════════ */

/**
 * Start the geo puzzle.
 * @param {object}   stage          — stage config
 * @param {object}   state          — app state
 * @param {Function} onSolved       — callback
 * @param {Array|null} introSequence — intro events, or null to skip
 * @returns cleanup function
 */
export function startGeoTracker(stage, state, onSolved, introSequence) {
  // If no intro or already watched, skip to tracker
  if (!introSequence || (state.stagePhase && state.stagePhase[stage.id] === 'tracker')) {
    return resumeGeoTracker(stage, state, onSolved);
  }

  // Show Phase 1, hide Phase 2
  const introEl   = document.getElementById('geo-intro');
  const trackerEl = document.getElementById('geo-tracker');
  if (introEl)   introEl.classList.remove('hidden');
  if (trackerEl) trackerEl.classList.add('hidden');

  const video = document.getElementById('geo-avatar-video');
  if (video) video.play().catch(() => {});

  const currentLine = document.getElementById('geo-current-line');
  if (currentLine) currentLine.textContent = '';

  const abortCtrl = { aborted: false, currentAudio: null };

  const actionHandlers = {
    async requestLocation(event, abort) {
      const granted = await requestLocationWithRetry(currentLine, abort);
      if (abort.aborted || !granted) return 'stop';
      return 'reset-clock';
    },
    startTracking() {
      transitionToTracker(stage, state, onSolved);
      return 'stop';
    },
  };

  runIntroSequence(introSequence, currentLine, abortCtrl, actionHandlers);

  return () => {
    abortCtrl.aborted = true;
    if (video) { video.pause(); video.currentTime = 0; }
    if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
    stopWatching();
  };
}

/** Resume directly into tracker (skips intro) */
function resumeGeoTracker(stage, state, onSolved) {
  const introEl   = document.getElementById('geo-intro');
  const trackerEl = document.getElementById('geo-tracker');
  if (introEl)   introEl.classList.add('hidden');
  if (trackerEl) trackerEl.classList.remove('hidden');

  transitionToTracker(stage, state, onSolved);

  return () => { stopWatching(); };
}

/* ═══════════════  Phase 1 — Permission helpers  ═══════════════ */

async function typeText(el, text) {
  if (!el) return;
  await typewriter(el, text, 25);
}

async function requestLocationWithRetry(currentLine, abort) {
  if (!navigator.geolocation) {
    await typeText(currentLine, 'Erreur : géolocalisation non disponible sur cet appareil.');
    return false;
  }

  let firstAttempt = true;

  while (!abort.aborted) {
    const permState = await getPermissionState();

    if (permState === 'granted') {
      const result = await requestLocationOnce();
      if (result === 'granted') {
        await typeText(currentLine, 'Accès autorisé. Module de géolocalisation activé.');
        return true;
      }
    }

    if (permState === 'denied') {
      await typeText(currentLine, '⚠ Localisation bloquée. Appuyez sur l\'icône 🔒 dans la barre d\'adresse, puis autorisez la localisation.');
      while (!abort.aborted) {
        await delay(2000);
        if ((await getPermissionState()) !== 'denied') break;
      }
      if (abort.aborted) return false;
      continue;
    }

    // 'prompt' — browser will show the popup
    if (firstAttempt) {
      await typeText(currentLine, 'Autorisation de géolocalisation requise…');
      firstAttempt = false;
    } else {
      await typeText(currentLine, 'Accès refusé. Veuillez autoriser la géolocalisation pour continuer.');
    }

    const result = await requestLocationOnce();
    if (abort.aborted) return false;
    if (result === 'granted') {
      await typeText(currentLine, 'Accès autorisé. Module de géolocalisation activé.');
      return true;
    }

    await delay(2000);
  }
  return false;
}

async function getPermissionState() {
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state;
    }
  } catch { /* not available */ }
  return 'prompt';
}

function requestLocationOnce() {
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      GEO_OPTS
    );
  });
}

/* ═══════════════  Phase 2 — Radar Tracking  ═══════════════ */

function transitionToTracker(stage, state, onSolved) {
  const puzzle    = stage.puzzle;
  const targetLat = puzzle.lat;
  const targetLng = puzzle.lng;
  const radius    = puzzle.radiusMeters || 2;

  // Save phase so intro is skipped on re-entry
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'tracker';
  saveState(state);

  // Switch visibility
  const introEl   = document.getElementById('geo-intro');
  const trackerEl = document.getElementById('geo-tracker');
  if (introEl)   introEl.classList.add('hidden');
  if (trackerEl) trackerEl.classList.remove('hidden');

  // Stop briefing video
  const video = document.getElementById('geo-avatar-video');
  if (video) { video.pause(); video.currentTime = 0; }

  // Populate header
  const tagEl       = document.getElementById('geo-tag');
  const titleEl     = document.getElementById('geo-title');
  const narrativeEl = document.getElementById('geo-narrative');
  if (tagEl)       tagEl.textContent = `ÉTAPE ${stage.order}`;
  if (titleEl)     titleEl.textContent = stage.title;
  if (narrativeEl) narrativeEl.innerHTML = stage.narrative?.text || '';

  // DOM refs
  const zoneLabel        = document.getElementById('geo-zone-label');
  const zoneMsg          = document.getElementById('geo-zone-msg');
  const distanceEl       = document.getElementById('geo-distance');
  const radar            = document.getElementById('geo-radar');
  const dot              = document.getElementById('geo-dot');
  const foundEl          = document.getElementById('geo-found');
  const foundInstruction = document.getElementById('geo-found-instruction');

  if (foundEl) foundEl.classList.add('hidden');
  if (foundInstruction) foundInstruction.textContent = puzzle.foundText || 'Cherchez l\'objet caché dans cette zone.';

  let solved      = false;
  let lastZoneCls = '';

  if (!navigator.geolocation) {
    if (zoneLabel) zoneLabel.textContent = 'ERREUR';
    if (zoneMsg)   zoneMsg.textContent = 'Géolocalisation non disponible sur cet appareil.';
    return;
  }

  function onPosition(pos) {
    if (solved) return;

    const dist = haversineDistance(
      pos.coords.latitude, pos.coords.longitude,
      targetLat, targetLng
    );
    const zone = ZONES.find(z => dist <= z.maxDist) || ZONES[ZONES.length - 1];

    // Update display
    if (distanceEl) { distanceEl.textContent = `${Math.round(dist)} m`; distanceEl.style.color = zone.color; }
    if (zoneLabel)  zoneLabel.textContent = zone.label;
    if (zoneMsg)    { zoneMsg.textContent = zone.msg; zoneMsg.style.color = zone.color; }

    // Radar color + zone-change SFX
    if (radar && zone.cls !== lastZoneCls) {
      if (lastZoneCls) radar.classList.remove(lastZoneCls);
      radar.classList.add(zone.cls);
      if (lastZoneCls && zone.sfx) playSFX(zone.sfx);
      lastZoneCls = zone.cls;
    }

    // Dot pulse speed (faster when closer)
    if (dot) dot.style.animationDuration = `${Math.max(0.3, Math.min(2, dist / 10))}s`;

    // Solved?
    if (dist <= radius) {
      solved = true;
      stopWatching();

      if (zoneLabel) zoneLabel.textContent = 'CIBLE LOCALISÉE';
      if (zoneMsg)   { zoneMsg.textContent = 'Position confirmée. Signal verrouillé.'; zoneMsg.style.color = 'var(--accent-green)'; }
      if (distanceEl) distanceEl.style.color = 'var(--accent-green)';
      if (foundEl)   foundEl.classList.remove('hidden');
      if (radar)     radar.classList.add('geo-locked');

      playSFX(MEDIA.sfxFound);
      solvePuzzle(state, stage.id);
      setTimeout(() => onSolved(stage), 5000);
    }
  }

  function onError(err) {
    if (zoneLabel) zoneLabel.textContent = 'ERREUR';
    if (zoneMsg) {
      const messages = {
        [err.PERMISSION_DENIED]:    'Accès à la localisation refusé. Activez la géolocalisation dans les paramètres.',
        [err.POSITION_UNAVAILABLE]: 'Position indisponible. Essayez de vous déplacer.',
        [err.TIMEOUT]:              'Délai d\'attente dépassé. Réessai en cours…',
      };
      zoneMsg.textContent = messages[err.code] || 'Erreur de géolocalisation.';
    }
  }

  // ── Start tracking: watchPosition + polling for maximum freshness ──
  // watchPosition gives us updates when the OS has new data.
  // Polling getCurrentPosition ensures we get updates even on devices
  // where watchPosition fires slowly.
  watchId = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTS);

  navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS);
  pollInterval = setInterval(() => {
    if (!solved) navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS);
  }, POLL_INTERVAL_MS);
}

/* ═══════════════  Helpers  ═══════════════ */

function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
