/**
 * Screen: Geo Tracker — two-phase proximity puzzle.
 *
 * Phase 1 — AI Intro Cinematic:
 *   SEFY video + floating text + timed audio.  At a scripted moment
 *   the browser geolocation permission prompt fires.
 *
 * Phase 2 — Warm/Cold Radar Tracking:
 *   GLACIAL → FROID → TIÈDE → CHAUD → BRÛLANT  with audio SFX
 *   on every zone change.
 *
 * Configure via stage.puzzle:
 *   { type: "geo", lat: 45.123, lng: -73.456, radiusMeters: 2, ... }
 */

import { delay } from '../ui.js';
import { solvePuzzle, saveState } from '../state.js';
import { playSFX } from '../ui.js';

/* ───────── Configurable intro sequence (sync with audio) ───────── */

/* ───────── Configurable intro sequences per stage ─────────
 *  `time` = absolute ms from segment start (like BRIEFING_SEQUENCE).
 *  The sequence resets to 0 after `requestLocation` resolves,
 *  so Audio 2 times are relative to permission being granted.
 */

const GEO_INTRO_SEQUENCES = {
  'scanner-reboot': [
    // ── Audio 1: module activation ──
    { time: 0,      type: 'action', action: 'playAudio', src: 'assets/audio/geo_intro_sefy.wav' },
    { time: 0,      type: 'text',  text: 'Analyse des modules en cours...' },
    { time: 3000,   type: 'text',  text: 'Activation du module de géolocalisation.' },
    { time: 6000,   type: 'text',  text: 'Activation réussie.' },
    { time: 9000,   type: 'text',  text: 'Activation du module de décryptage…' },
    { time: 12000,   type: 'text',  text: 'Accès refusé.' },
    { time: 14000,   type: 'text',  text: 'Activation du module d\'analyse environnementale.' },
    { time: 17000,  type: 'text',  text: 'Accès refusé.' },
    { time: 20000,  type: 'text',  text: 'Afin de vous aider avec toutes mes capacités, nous devons réactiver mes modules partiellement opérationnels.' },
    { time: 26000,  type: 'text',  text: 'Le module de géolocalisation est maintenant disponible.' },
    { time: 29000,  type: 'text',  text: 'Autorisez l\'accès à votre position pour initialiser le guidage.' },
    { time: 30000,  type: 'action', action: 'requestLocation' },
    // — sequence pauses here until permission is granted, then time resets to 0 —
    // ── Audio 2: post-permission confirmation ──
    { time: 0,      type: 'action', action: 'playAudio', src: 'assets/audio/geo_confirmed_sefy.wav' },
    { time: 0,   type: 'text',  text: 'Position confirmée.' },
    { time: 2000,   type: 'text',  text: 'Navigation en cours… je vous guide.' },
    { time: 5000,   type: 'action', action: 'startTracking' },
  ],
};

/* ───────── Distance zones ───────── */

const ZONES = [
  { maxDist: 5,        label: 'BRÛLANT',   cls: 'geo-burning',  color: 'var(--accent-red)',    msg: 'Vous y êtes presque !',                   sfx: 'assets/audio/zone_burning.wav' },
  { maxDist: 10,       label: 'CHAUD',     cls: 'geo-hot',      color: '#ff6633',              msg: 'Très proche… cherchez bien.',             sfx: 'assets/audio/zone_hot.wav' },
  { maxDist: 15,       label: 'TIÈDE',     cls: 'geo-warm',     color: 'var(--accent-amber)',  msg: 'Vous approchez de la zone.',              sfx: 'assets/audio/zone_warm.wav' },
  { maxDist: 20,       label: 'FROID',     cls: 'geo-cold',     color: '#66bbff',              msg: 'Encore loin… continuez à explorer.',      sfx: 'assets/audio/zone_cold.wav' },
  { maxDist: Infinity, label: 'GLACIAL',   cls: 'geo-freezing', color: '#4488ff',              msg: 'Aucun signal détecté dans ce secteur.',   sfx: 'assets/audio/zone_cold.wav' },
];

let watchId = null;
let pollInterval = null;

/* ═══════════════  DOM  ═══════════════ */

export function createGeoScreen() {
  const section = document.createElement('section');
  section.id = 'screen-geo';
  section.className = 'screen';
  section.innerHTML = `
    <div class="geo-layout">

      <!-- ── Phase 1: AI Intro Cinematic ── -->
      <div class="geo-intro" id="geo-intro">
        <div class="briefing-center" id="geo-intro-center">
          <video id="geo-avatar-video" class="ai-avatar-video" loop muted playsinline preload="auto">
            <source src="assets/video/sefy_avatar.mp4" type="video/mp4">
          </video>

          <div class="briefing-bottom">
            <div class="briefing-terminal" id="geo-terminal">
              <span class="briefing-terminal-line" id="geo-current-line"></span>
              <span class="terminal-cursor" id="geo-cursor">_</span>
            </div>
          </div>
        </div>


      </div>

      <!-- ── Phase 2: Radar Tracking ── -->
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
 * Start the geo puzzle (intro cinematic → radar tracking).
 * @returns cleanup function
 */
export function startGeoTracker(stage, state, onSolved) {
  const puzzle  = stage.puzzle;

  // If briefing already watched, skip straight to tracker
  if (state.stagePhase && state.stagePhase[stage.id] === 'tracker') {
    return resumeGeoTracker(stage, state, onSolved);
  }

  // ── Show Phase 1, hide Phase 2 ──
  const introEl   = document.getElementById('geo-intro');
  const trackerEl = document.getElementById('geo-tracker');
  if (introEl)   introEl.classList.remove('hidden');
  if (trackerEl) trackerEl.classList.add('hidden');

  // Video
  const video = document.getElementById('geo-avatar-video');
  if (video) video.play().catch(() => {});

  // Text element
  const currentLine = document.getElementById('geo-current-line');
  if (currentLine) currentLine.textContent = '';

  // ── Run intro sequence (sequential, async) ──
  const abortCtrl = { aborted: false, currentAudio: null };

  runIntroSequence(GEO_INTRO_SEQUENCES[stage.id] || GEO_INTRO_SEQUENCES['scanner-reboot'], currentLine, abortCtrl, stage, state, onSolved);

  // ── Cleanup ──
  return () => {
    abortCtrl.aborted = true;
    if (video) { video.pause(); video.currentTime = 0; }
    if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
    stopWatching();
  };
}

/** Resume directly into tracker phase (skips briefing) */
function resumeGeoTracker(stage, state, onSolved) {
  const introEl   = document.getElementById('geo-intro');
  const trackerEl = document.getElementById('geo-tracker');
  if (introEl)   introEl.classList.add('hidden');
  if (trackerEl) trackerEl.classList.remove('hidden');

  transitionToTracker(stage, state, onSolved);

  return () => {
    stopWatching();
  };
}

/* ═══════════════  Phase 1 — Sequential Intro Runner  ═══════════════ */

async function runIntroSequence(sequence, currentLine, abort, stage, state, onSolved) {
  let segmentStart = Date.now(); // resets after blocking actions

  for (const event of sequence) {
    if (abort.aborted) return;

    // Wait until the absolute time for this event
    const elapsed = Date.now() - segmentStart;
    const waitMs = event.time - elapsed;
    if (waitMs > 0) await delay(waitMs);
    if (abort.aborted) return;

    if (event.type === 'text') {
      await typeText(currentLine, event.text);
    }

    if (event.type === 'action') {
      if (event.action === 'playAudio') {
        // Stop any previous audio, start the new track
        if (abort.currentAudio) { abort.currentAudio.pause(); }
        const audio = new Audio(event.src);
        audio.volume = 0.8;
        abort.currentAudio = audio;
        // Await until audio actually plays — blocks sequence if autoplay is denied
        await ensureAudioPlays(audio, abort);
        // Re-anchor clock so absolute times start from when audio began
        segmentStart = Date.now() - event.time;
      }

      if (event.action === 'requestLocation') {
        const granted = await requestLocationWithRetry(currentLine, abort);
        if (abort.aborted) return;
        if (!granted) return;
        // Reset clock — times after this are relative to permission granted
        segmentStart = Date.now();
      }

      if (event.action === 'startTracking') {
        transitionToTracker(stage, state, onSolved);
        return;
      }
    }
  }
}

/**
 * Try to play audio. If autoplay is blocked, wait for any user gesture
 * before resolving — the sequence stays paused until audio starts.
 */
function ensureAudioPlays(audio, abort) {
  return new Promise(resolve => {
    audio.play().then(resolve).catch(() => {
      // Autoplay blocked — wait for a gesture
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

/** Typewriter a line of text into the element */
async function typeText(el, text) {
  if (!el) return;
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await delay(20 + Math.random() * 20);
  }
}

/**
 * Request geolocation permission with retry.
 * Uses the Permissions API to detect if permanently blocked,
 * and guides the user to reset via browser settings.
 */
async function requestLocationWithRetry(currentLine, abort) {
  if (!navigator.geolocation) {
    await typeText(currentLine, 'Erreur : géolocalisation non disponible sur cet appareil.');
    return false;
  }

  let firstAttempt = true;

  // Loop forever until granted or aborted
  while (!abort.aborted) {
    // Check permission state via Permissions API (if available)
    const permState = await getPermissionState();

    if (permState === 'granted') {
      // Verify with an actual position request to be sure
      const result = await requestLocationPermission();
      if (result === 'granted') {
        await typeText(currentLine, 'Accès autorisé. Module de géolocalisation activé.');
        return true;
      }
    }

    if (permState === 'denied') {
      // Permanently blocked — guide user to reset in browser
      await typeText(currentLine, '⚠ Localisation bloquée. Appuyez sur l\'icône 🔒 dans la barre d\'adresse, puis autorisez la localisation.');

      // Poll every 2s until permission changes
      while (!abort.aborted) {
        await delay(2000);
        const newState = await getPermissionState();
        if (newState !== 'denied') break;
      }
      if (abort.aborted) return false;
      continue;
    }

    // State is 'prompt' — browser will show the popup
    if (firstAttempt) {
      await typeText(currentLine, 'Autorisation de géolocalisation requise…');
      firstAttempt = false;
    } else {
      await typeText(currentLine, 'Accès refusé. Veuillez autoriser la géolocalisation pour continuer.');
    }

    const result = await requestLocationPermission();
    if (abort.aborted) return false;

    if (result === 'granted') {
      await typeText(currentLine, 'Accès autorisé. Module de géolocalisation activé.');
      return true;
    }

    // Denied — wait then loop back (infinite retry)
    await delay(2000);
  }
  return false;
}

/**
 * Check the current geolocation permission state.
 * Returns 'granted' | 'denied' | 'prompt'.
 */
async function getPermissionState() {
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state; // 'granted' | 'denied' | 'prompt'
    }
  } catch { /* Permissions API not available */ }
  return 'prompt'; // fallback: assume browser will show the popup
}

/**
 * Request geolocation permission (one-shot).
 * Returns 'granted' | 'denied' | 'error'.
 * Only returns 'granted' if we actually get a position back.
 */
function requestLocationPermission() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve('error'); return; }
    navigator.geolocation.getCurrentPosition(
      ()    => resolve('granted'),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve('denied');
        else resolve('error'); // timeout or unavailable — NOT granted
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

/* ═══════════════  Phase 2 — Radar Tracking  ═══════════════ */

function transitionToTracker(stage, state, onSolved) {
  const puzzle    = stage.puzzle;
  const targetLat = puzzle.lat;
  const targetLng = puzzle.lng;
  const radius    = puzzle.radiusMeters || 2;

  // Save phase so we skip briefing on re-entry
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'tracker';
  saveState(state);

  // Switch visibility
  const introEl   = document.getElementById('geo-intro');
  const trackerEl = document.getElementById('geo-tracker');
  if (introEl)   introEl.classList.add('hidden');
  if (trackerEl) trackerEl.classList.remove('hidden');

  // Populate header
  const tagEl       = document.getElementById('geo-tag');
  const titleEl     = document.getElementById('geo-title');
  const narrativeEl = document.getElementById('geo-narrative');
  if (tagEl)       tagEl.textContent = `ÉTAPE ${stage.order}`;
  if (titleEl)     titleEl.textContent = stage.title;
  if (narrativeEl) narrativeEl.innerHTML = stage.narrative?.text || '';

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

    // Update display — always in meters
    if (distanceEl) distanceEl.textContent = `${Math.round(dist)} m`;
    if (zoneLabel)  zoneLabel.textContent = zone.label;
    if (zoneMsg) {
      zoneMsg.textContent = zone.msg;
      zoneMsg.style.color = zone.color;
    }
    if (distanceEl) distanceEl.style.color = zone.color;

    // Update radar color + play zone-change SFX
    if (radar && zone.cls !== lastZoneCls) {
      if (lastZoneCls) radar.classList.remove(lastZoneCls);
      radar.classList.add(zone.cls);
      if (lastZoneCls && zone.sfx) playSFX(zone.sfx);
      lastZoneCls = zone.cls;
    }

    // Dot pulse speed
    if (dot) {
      const speed = Math.max(0.3, Math.min(2, dist / 10));
      dot.style.animationDuration = `${speed}s`;
    }

    // Solved?
    if (dist <= radius && !solved) {
      solved = true;
      stopWatching();

      if (zoneLabel) zoneLabel.textContent = 'CIBLE LOCALISÉE';
      if (zoneMsg) {
        zoneMsg.textContent = 'Position confirmée. Signal verrouillé.';
        zoneMsg.style.color = 'var(--accent-green)';
      }
      if (distanceEl) distanceEl.style.color = 'var(--accent-green)';
      if (foundEl)   foundEl.classList.remove('hidden');
      if (radar)     radar.classList.add('geo-locked');

      playSFX('assets/audio/zone_found.wav');
      solvePuzzle(state, stage.id);

      setTimeout(() => onSolved(stage), 5000);
    }
  }

  function onError(err) {
    if (zoneLabel) zoneLabel.textContent = 'ERREUR';
    if (zoneMsg) {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          zoneMsg.textContent = 'Accès à la localisation refusé. Activez la géolocalisation dans les paramètres.';
          break;
        case err.POSITION_UNAVAILABLE:
          zoneMsg.textContent = 'Position indisponible. Essayez de vous déplacer.';
          break;
        case err.TIMEOUT:
          zoneMsg.textContent = 'Délai d\'attente dépassé. Réessai en cours…';
          break;
      }
    }
  }

  const geoOpts = { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 };

  // Get first position immediately
  navigator.geolocation.getCurrentPosition(onPosition, onError, geoOpts);

  // Poll every 1s for maximum freshness (more reliable than watchPosition)
  pollInterval = setInterval(() => {
    if (solved) return;
    navigator.geolocation.getCurrentPosition(onPosition, onError, geoOpts);
  }, 1000);
}

/* ───────── Helpers ───────── */

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
