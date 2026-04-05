/**
 * Screen: Scanner Reboot — SEFY intro + geo proximity tracker.
 *
 * Uses the intro-cinematic component for Phase 1,
 * then transitions to a warm/cold radar tracker for Phase 2.
 */

import { playSFX } from '../../ui.js';
import { solvePuzzle, saveState } from '../../state.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { requestLocationWithRetry, GEO_OPTS } from '../../utils/geolocation.js';
import { INTRO_SEQUENCE } from './config.js';

const PREFIX = 'scanner-reboot';

/* ───────── Media ───────── */
const MEDIA = {
  sfxBurning: 'assets/audio/zone_burning.wav',
  sfxHot:     'assets/audio/zone_hot.wav',
  sfxWarm:    'assets/audio/zone_warm.wav',
  sfxCold:    'assets/audio/zone_cold.wav',
  sfxFound:   'assets/audio/zone_found.wav',
};

/* ───────── Distance zones ───────── */
const ZONES = [
  { maxDist: 5,        label: 'BRÛLANT', cls: 'geo-burning',  color: 'var(--accent-red)',   msg: 'Vous y êtes presque !',                 sfx: MEDIA.sfxBurning },
  { maxDist: 10,       label: 'CHAUD',   cls: 'geo-hot',      color: '#ff6633',             msg: 'Très proche… cherchez bien.',            sfx: MEDIA.sfxHot },
  { maxDist: 15,       label: 'TIÈDE',   cls: 'geo-warm',     color: 'var(--accent-amber)', msg: 'Vous approchez de la zone.',             sfx: MEDIA.sfxWarm },
  { maxDist: 20,       label: 'FROID',   cls: 'geo-cold',     color: '#66bbff',             msg: 'Encore loin… continuez à explorer.',     sfx: MEDIA.sfxCold },
  { maxDist: Infinity, label: 'GLACIAL', cls: 'geo-freezing',  color: '#4488ff',             msg: 'Aucun signal détecté dans ce secteur.',  sfx: MEDIA.sfxCold },
];

const POLL_INTERVAL_MS = 800;

/* ───────── Module state ───────── */
let watchId = null;
let pollInterval = null;

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen';

  const layout = document.createElement('div');
  layout.className = 'geo-layout';

  // Phase 1: Intro cinematic
  layout.appendChild(createIntroCinematicDOM(PREFIX));

  // Phase 2: Radar tracking
  const tracker = document.createElement('div');
  tracker.className = 'geo-tracker hidden';
  tracker.id = `${PREFIX}-tracker`;
  tracker.innerHTML = `
    <div class="screen-content centered">
      <div class="screen-header">
        <span class="header-tag" id="${PREFIX}-tag">ÉTAPE</span>
        <span class="header-title" id="${PREFIX}-title">—</span>
      </div>

      <div class="geo-narrative" id="${PREFIX}-narrative"></div>

      <div class="geo-radar" id="${PREFIX}-radar">
        <div class="geo-ring geo-ring-outer"></div>
        <div class="geo-ring geo-ring-mid"></div>
        <div class="geo-ring geo-ring-inner"></div>
        <div class="geo-dot" id="${PREFIX}-dot"></div>
      </div>

      <div class="geo-status" id="${PREFIX}-status">
        <span class="geo-zone-label" id="${PREFIX}-zone-label">INITIALISATION…</span>
        <span class="geo-zone-msg" id="${PREFIX}-zone-msg">Activation du scanner de proximité…</span>
      </div>

      <div class="geo-distance" id="${PREFIX}-distance">-- m</div>

      <div class="geo-found hidden" id="${PREFIX}-found">
        <p class="geo-found-text">SIGNAL LOCALISÉ — ZONE SÉCURISÉE</p>
        <p class="geo-found-instruction" id="${PREFIX}-found-instruction"></p>
      </div>

      <div class="stage-actions">
        <button id="btn-hint" class="btn btn-secondary">DEMANDER UN INDICE</button>
      </div>
    </div>
  `;
  layout.appendChild(tracker);

  section.appendChild(layout);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

export function start(stage, state, onSolved) {
  // Skip intro if already watched
  if (!INTRO_SEQUENCE || (state.stagePhase && state.stagePhase[stage.id] === 'tracker')) {
    return resumeGeoTracker(stage, state, onSolved);
  }

  const trackerEl = document.getElementById(`${PREFIX}-tracker`);
  if (trackerEl) trackerEl.classList.add('hidden');

  const intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, {
    async requestLocation(event, abort) {
      const granted = await requestLocationWithRetry(intro.currentLine, abort);
      if (abort.aborted || !granted) return 'stop';
      return 'reset-clock';
    },
    startTracking() {
      intro.hide();
      transitionToTracker(stage, state, onSolved);
      return 'stop';
    },
  });

  return () => {
    intro.cleanup();
    stopWatching();
  };
}

/* ═══════════════  Phase transitions  ═══════════════ */

function resumeGeoTracker(stage, state, onSolved) {
  const introEl   = document.getElementById(`${PREFIX}-intro`);
  const trackerEl = document.getElementById(`${PREFIX}-tracker`);
  if (introEl)   introEl.classList.add('hidden');
  if (trackerEl) trackerEl.classList.remove('hidden');

  setupTracker(stage, state, onSolved);
  return () => { stopWatching(); };
}

function transitionToTracker(stage, state, onSolved) {
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'tracker';
  saveState(state);

  const introEl   = document.getElementById(`${PREFIX}-intro`);
  const trackerEl = document.getElementById(`${PREFIX}-tracker`);
  if (introEl)   introEl.classList.add('hidden');
  if (trackerEl) trackerEl.classList.remove('hidden');

  setupTracker(stage, state, onSolved);
}

/* ═══════════════  Phase 2 — Radar Tracking  ═══════════════ */

function setupTracker(stage, state, onSolved) {
  const puzzle    = stage.puzzle;
  const targetLat = puzzle.lat;
  const targetLng = puzzle.lng;
  const radius    = puzzle.radiusMeters || 2;

  // Populate header
  const tagEl       = document.getElementById(`${PREFIX}-tag`);
  const titleEl     = document.getElementById(`${PREFIX}-title`);
  const narrativeEl = document.getElementById(`${PREFIX}-narrative`);
  if (tagEl)       tagEl.textContent = `ÉTAPE ${stage.order}`;
  if (titleEl)     titleEl.textContent = stage.title;
  if (narrativeEl) narrativeEl.innerHTML = stage.narrative?.text || '';

  // DOM refs
  const zoneLabel        = document.getElementById(`${PREFIX}-zone-label`);
  const zoneMsg          = document.getElementById(`${PREFIX}-zone-msg`);
  const distanceEl       = document.getElementById(`${PREFIX}-distance`);
  const radar            = document.getElementById(`${PREFIX}-radar`);
  const dot              = document.getElementById(`${PREFIX}-dot`);
  const foundEl          = document.getElementById(`${PREFIX}-found`);
  const foundInstruction = document.getElementById(`${PREFIX}-found-instruction`);

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
      targetLat, targetLng,
    );
    const zone = ZONES.find(z => dist <= z.maxDist) || ZONES[ZONES.length - 1];

    if (distanceEl) { distanceEl.textContent = `${Math.round(dist)} m`; distanceEl.style.color = zone.color; }
    if (zoneLabel)  zoneLabel.textContent = zone.label;
    if (zoneMsg)    { zoneMsg.textContent = zone.msg; zoneMsg.style.color = zone.color; }

    if (radar && zone.cls !== lastZoneCls) {
      if (lastZoneCls) radar.classList.remove(lastZoneCls);
      radar.classList.add(zone.cls);
      if (lastZoneCls && zone.sfx) playSFX(zone.sfx);
      lastZoneCls = zone.cls;
    }

    if (dot) dot.style.animationDuration = `${Math.max(0.3, Math.min(2, dist / 10))}s`;

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

  watchId = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTS);
  navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS);
  pollInterval = setInterval(() => {
    if (!solved) navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS);
  }, POLL_INTERVAL_MS);
}

/* ═══════════════  Helpers  ═══════════════ */

function stopWatching() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (pollInterval !== null) { clearInterval(pollInterval); pollInterval = null; }
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
