/**
 * Screen: Geo Tracker — warm/cold proximity puzzle using Geolocation API.
 *
 * Displays a SEFY-styled radar with distance feedback:
 *   GLACIAL (>15m) → FROID (10–15m) → TIÈDE (5–10m) → CHAUD (2–5m) → BRÛLANT (<2m)
 *
 * Configure via stage.puzzle:
 *   { type: "geo", lat: 45.123, lng: -73.456, radiusMeters: 2, prompt: "..." }
 */

import { delay } from '../ui.js';
import { solvePuzzle } from '../state.js';
import { playSFX } from '../ui.js';

// Distance thresholds (meters) and their labels / CSS classes
const ZONES = [
  { maxDist: 2,   label: 'BRÛLANT',  cls: 'geo-burning',  msg: 'Vous y êtes presque !' },
  { maxDist: 5,   label: 'CHAUD',     cls: 'geo-hot',      msg: 'Très proche… cherchez bien.' },
  { maxDist: 10,  label: 'TIÈDE',     cls: 'geo-warm',     msg: 'Vous approchez de la zone.' },
  { maxDist: 15,  label: 'FROID',     cls: 'geo-cold',     msg: 'Encore loin… continuez à explorer.' },
  { maxDist: Infinity, label: 'GLACIAL', cls: 'geo-freezing', msg: 'Aucun signal détecté dans ce secteur.' },
];

let watchId = null;

/** Create the geo tracker screen DOM */
export function createGeoScreen() {
  const section = document.createElement('section');
  section.id = 'screen-geo';
  section.className = 'screen';
  section.innerHTML = `
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
  `;
  return section;
}

/**
 * Start the geo tracking puzzle.
 * @param {Object} stage — stage definition with stage.puzzle.lat, .lng, .radiusMeters
 * @param {Object} state — game state
 * @param {Function} onSolved — called when player reaches the target
 * @returns cleanup function
 */
export function startGeoTracker(stage, state, onSolved) {
  const puzzle = stage.puzzle;
  const targetLat = puzzle.lat;
  const targetLng = puzzle.lng;
  const radius = puzzle.radiusMeters || 2;

  // Populate header
  const tagEl = document.getElementById('geo-tag');
  const titleEl = document.getElementById('geo-title');
  const narrativeEl = document.getElementById('geo-narrative');
  if (tagEl) tagEl.textContent = `ÉTAPE ${stage.order}`;
  if (titleEl) titleEl.textContent = stage.title;
  if (narrativeEl) narrativeEl.innerHTML = stage.narrative?.text || '';

  const zoneLabel = document.getElementById('geo-zone-label');
  const zoneMsg = document.getElementById('geo-zone-msg');
  const distanceEl = document.getElementById('geo-distance');
  const radar = document.getElementById('geo-radar');
  const dot = document.getElementById('geo-dot');
  const foundEl = document.getElementById('geo-found');
  const foundInstruction = document.getElementById('geo-found-instruction');

  if (foundEl) foundEl.classList.add('hidden');
  if (foundInstruction) foundInstruction.textContent = puzzle.foundText || 'Cherchez l\'objet caché dans cette zone.';

  let solved = false;
  let lastZoneCls = '';

  // Check if geolocation is available
  if (!navigator.geolocation) {
    if (zoneLabel) zoneLabel.textContent = 'ERREUR';
    if (zoneMsg) zoneMsg.textContent = 'Géolocalisation non disponible sur cet appareil.';
    return () => {};
  }

  // Request permission and start watching
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (solved) return;

      const dist = haversineDistance(
        pos.coords.latitude, pos.coords.longitude,
        targetLat, targetLng
      );

      // Find the matching zone
      const zone = ZONES.find(z => dist <= z.maxDist) || ZONES[ZONES.length - 1];

      // Update display
      if (distanceEl) distanceEl.textContent = dist < 100 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`;
      if (zoneLabel) zoneLabel.textContent = zone.label;
      if (zoneMsg) zoneMsg.textContent = zone.msg;

      // Update radar color
      if (radar && zone.cls !== lastZoneCls) {
        if (lastZoneCls) radar.classList.remove(lastZoneCls);
        radar.classList.add(zone.cls);
        lastZoneCls = zone.cls;
      }

      // Animate dot pulse speed based on closeness
      if (dot) {
        const speed = Math.max(0.3, Math.min(2, dist / 10));
        dot.style.animationDuration = `${speed}s`;
      }

      // Check if solved
      if (dist <= radius && !solved) {
        solved = true;
        stopWatching();

        if (zoneLabel) zoneLabel.textContent = 'CIBLE LOCALISÉE';
        if (zoneMsg) zoneMsg.textContent = 'Position confirmée. Signal verrouillé.';
        if (foundEl) foundEl.classList.remove('hidden');
        if (radar) radar.classList.add('geo-locked');

        solvePuzzle(state, stage.id);

        // Auto-advance after a pause so they can read the instruction
        setTimeout(() => onSolved(stage), 5000);
      }
    },
    (err) => {
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
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    }
  );

  return () => stopWatching();
}

/** Stop watching geolocation */
function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/**
 * Haversine formula — distance between two lat/lng points in meters.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
