/**
 * Screen: Scanner Reboot — Multi-step per-agent route.
 *
 * Flow per step:
 *   1. Geo tracker (navigate to destination) — skipped if step.geo is null
 *   2. Arrival audio + code validation
 *   3. Transition audio → next step
 *
 * After all steps completed → stage solves → app routes to terminal-wait.
 */

import { solvePuzzle, saveState, addLogEntry, recordValidCode } from '../../state.js';
import { validateAnswer } from '../../stages.js';
import { showFeedback, glitch } from '../../ui.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { requestLocationWithRetry, GEO_OPTS } from '../../utils/geolocation.js';
import { syncHintBadge } from '../../screens/stage.js';
import { INTRO_SEQUENCE, ROUTES, ZONES, ZONE_FOUND_AUDIO } from './config.js';

const PREFIX = 'scanner-reboot';

/* ───────── GPS precision tuning ─────────
   Balance: smooth out stationary jitter, but react FAST when the player runs
   (closer or farther). Old fixes decay quickly, and a good fix that clearly
   disagrees with the average flushes it (movement snap). */
const WATCHDOG_MS      = 3000;   // poll manually if the GPS watch goes silent this long
const ACCURACY_REJECT  = 100;    // discard fixes worse than this (m) — usually IP/wifi junk
const SMOOTH_WINDOW_MS = 5000;   // fixes older than this drop out of the moving average
const SMOOTH_MAX_FIXES = 4;      // cap on fixes kept in the average
const RECENCY_HALF_MS  = 1500;   // a fix's weight halves every 1.5s — newest dominates
const SNAP_MIN_M       = 8;      // min jump (m) that counts as real movement → snap
const SOLVE_CONFIRM    = 2;      // consecutive in-radius readings required to lock on
const ZONE_HYST_M      = 2;      // extra metres required before switching to a FARTHER zone

/* ───────── Module state ───────── */
let watchId = null;
let pollInterval = null;
let currentAudio = null;

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';

  const layout = document.createElement('div');
  layout.className = 'stage-layout geo-layout';

  // Phase: Intro cinematic
  layout.appendChild(createIntroCinematicDOM(PREFIX));

  // Phase: Geo tracker
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
      <div class="geo-accuracy" id="${PREFIX}-accuracy"></div>

      <!-- DEBUG: Remove before production -->
      <button id="${PREFIX}-skip-geo" class="btn btn-outline" style="margin-top:1rem;border-color:var(--accent-red);color:var(--accent-red);font-size:0.7rem;">⚠ SKIP GEO (DEBUG)</button>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;justify-content:center;">
        <button id="${PREFIX}-sim-near" class="btn btn-outline" style="border-color:var(--accent-red);color:var(--accent-red);font-size:0.7rem;">⚠ −2 m (PRÈS)</button>
        <button id="${PREFIX}-sim-far" class="btn btn-outline" style="border-color:var(--accent-red);color:var(--accent-red);font-size:0.7rem;">⚠ +2 m (LOIN)</button>
      </div>
    </div>
  `;
  layout.appendChild(tracker);

  // Phase: Code entry (reuses same structure as code-entry-form component)
  const codePanel = document.createElement('div');
  codePanel.className = 'code-entry-form hidden';
  codePanel.id = `${PREFIX}-code-panel`;
  codePanel.innerHTML = `
    <div class="screen-content centered">
      <div class="screen-header">
        <span class="header-tag" id="${PREFIX}-code-tag">CODE</span>
        <span class="header-title" id="${PREFIX}-code-title">—</span>
      </div>

      <div class="narrative-box" id="${PREFIX}-code-narrative"></div>

      <div class="puzzle-area">
        <p class="puzzle-prompt" id="${PREFIX}-code-prompt"></p>
        <div class="input-group">
          <input
            type="text"
            id="${PREFIX}-code-input"
            class="code-input"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="ENTRER LE CODE"
          >
          <button id="${PREFIX}-code-submit" class="btn btn-primary">VALIDER</button>
        </div>
        <div id="${PREFIX}-code-feedback" class="feedback hidden"></div>
      </div>
    </div>
  `;
  layout.appendChild(codePanel);

  // Phase: Transition (between steps)
  const transition = document.createElement('div');
  transition.className = 'route-transition hidden';
  transition.id = `${PREFIX}-transition`;
  transition.innerHTML = `
    <div class="screen-content centered">
      <div class="screen-header">
        <span class="header-tag">SEFY</span>
        <span class="header-title">EN ROUTE</span>
      </div>
      <p class="route-transition-text" id="${PREFIX}-transition-text"></p>
      <div class="tw-status">
        <div class="tw-spinner"></div>
      </div>
    </div>
  `;
  layout.appendChild(transition);

  section.appendChild(layout);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

export function start(stage, state, onSolved) {
  const agent = state.playerAgent || 'emy';
  const route = ROUTES[agent] || ROUTES.emy;

  // Determine current progress
  const routeStep = (state.routeStep || 0);

  // If intro already done, resume at current step
  if (state.stagePhase && state.stagePhase[stage.id] === 'route') {
    return resumeRoute(stage, state, route, routeStep, onSolved);
  }

  // Otherwise play intro cinematic
  hideAllPanels();
  const lineEl = document.getElementById(`${PREFIX}-current-line`);
  let intro;
  intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, {
    async requestLocation(event, abort) {
      const granted = await requestLocationWithRetry(lineEl, abort);
      if (abort.aborted || !granted) return 'stop';
      return 'reset-clock';
    },
    startRoute() {
      intro.hide();
      // Mark intro done
      if (!state.stagePhase) state.stagePhase = {};
      state.stagePhase[stage.id] = 'route';
      state.routeStep = 0;
      saveState(state);
      startStep(stage, state, route, 0, onSolved);
      return 'stop';
    },
  });

  return () => {
    intro.cleanup();
    cleanup();
  };
}

/* ═══════════════  Route step machine  ═══════════════ */

function resumeRoute(stage, state, route, stepIndex, onSolved) {
  hideAllPanels();

  if (stepIndex >= route.length) {
    // All done — solve
    solvePuzzle(state, stage.id);
    onSolved(stage);
    return () => {};
  }

  startStep(stage, state, route, stepIndex, onSolved);
  return () => { cleanup(); };
}

function startStep(stage, state, route, stepIndex, onSolved) {
  if (stepIndex >= route.length) {
    // Route complete — mark puzzle solved and notify app
    solvePuzzle(state, stage.id);
    onSolved(stage);
    return;
  }

  // Refresh the hint button to this room's hints (state.routeStep === stepIndex here).
  syncHintBadge(stage, state);

  const step = route[stepIndex];

  if (step.geo) {
    showGeoTracker(stage, state, route, stepIndex, onSolved);
  } else {
    // No geo needed — go straight to code (play arrival audio first)
    showCodeEntry(stage, state, route, stepIndex, onSolved);
  }
}

/* ═══════════════  Phase: Geo Tracker  ═══════════════ */

function showGeoTracker(stage, state, route, stepIndex, onSolved) {
  hideAllPanels();
  const step = route[stepIndex];
  const trackerEl = document.getElementById(`${PREFIX}-tracker`);
  if (trackerEl) trackerEl.classList.remove('hidden');

  const tagEl       = document.getElementById(`${PREFIX}-tag`);
  const titleEl     = document.getElementById(`${PREFIX}-title`);
  const narrativeEl = document.getElementById(`${PREFIX}-narrative`);
  if (tagEl)       tagEl.textContent = `${stepIndex + 1} / ${route.length}`;
  if (titleEl)     titleEl.textContent = step.label;
  if (narrativeEl) narrativeEl.textContent = `Dirigez-vous vers : ${step.label}`;

  const zoneLabel  = document.getElementById(`${PREFIX}-zone-label`);
  const zoneMsg    = document.getElementById(`${PREFIX}-zone-msg`);
  const distanceEl = document.getElementById(`${PREFIX}-distance`);
  const radar      = document.getElementById(`${PREFIX}-radar`);
  const dot        = document.getElementById(`${PREFIX}-dot`);

  if (zoneLabel)  zoneLabel.textContent = 'INITIALISATION…';
  if (zoneMsg)    zoneMsg.textContent = 'Activation du scanner de proximité…';
  if (distanceEl) distanceEl.textContent = '-- m';
  if (radar)      { radar.className = 'geo-radar'; }

  const accuracyEl = document.getElementById(`${PREFIX}-accuracy`);
  if (accuracyEl) accuracyEl.textContent = '';

  const targetLat = step.geo.lat;
  const targetLng = step.geo.lng;
  const radius    = step.geo.radius || 4;
  let solved = false;
  let lastZone = null;
  let simulating = false; // once true, debug sim drives the distance (real GPS ignored)
  let fixes = [];         // recent GPS fixes { lat, lng, acc, t } for the moving average
  let insideCount = 0;    // consecutive smoothed readings inside the radius
  let lastFixTime = 0;    // watchdog: last time the GPS produced ANY fix

  // Core proximity logic — applies a (smoothed) distance to the zone UI / radar /
  // solve. Driven by real GPS (onPosition) or the debug sim buttons.
  function applyDistance(dist, acc) {
    if (solved) return;

    if (distanceEl) distanceEl.textContent = `${Math.round(dist)} m`;
    if (accuracyEl) accuracyEl.textContent = simulating ? 'SIMULATION' : (acc ? `précision GPS ± ${Math.round(acc)} m` : '');

    // Pick the zone, with hysteresis: moving CLOSER switches immediately, but a
    // FARTHER zone needs ZONE_HYST_M extra metres — kills boundary flip-flapping
    // (and the re-triggered audio cues that came with it).
    let zone = ZONES.find(z => dist <= z.maxDist) || ZONES[ZONES.length - 1];
    if (lastZone && zone.maxDist > lastZone.maxDist && dist <= lastZone.maxDist + ZONE_HYST_M) {
      zone = lastZone;
    }

    if (distanceEl) distanceEl.style.color = zone.color;
    if (zoneLabel)  zoneLabel.textContent = zone.label;
    if (zoneMsg)    { zoneMsg.textContent = zone.msg; zoneMsg.style.color = zone.color; }

    // Zone changed → update radar pulse and play this zone's proximity cue.
    if (!lastZone || zone.cls !== lastZone.cls) {
      const isFirstZone = !lastZone; // initial landing — no cue
      if (radar) {
        if (lastZone) radar.classList.remove(lastZone.cls);
        radar.classList.add(zone.cls);
      }
      lastZone = zone;
      // Only play on actual movement, not on the first reading (always GLACIAL).
      if (!isFirstZone) playAudio(zone.audio); // no-op if zone.audio is null
    }

    if (dot) dot.style.animationDuration = `${Math.max(0.3, Math.min(2, dist / 10))}s`;

    // Lock-on: require SOLVE_CONFIRM consecutive in-radius readings so a single
    // jittery blip can't false-trigger. The debug sim confirms immediately.
    if (dist <= radius) {
      insideCount++;
      if (!simulating && insideCount < SOLVE_CONFIRM) return;

      solved = true;
      stopWatching();

      if (zoneLabel) zoneLabel.textContent = 'CIBLE LOCALISÉE';
      if (zoneMsg)   { zoneMsg.textContent = 'Position confirmée.'; zoneMsg.style.color = 'var(--accent-green)'; }
      if (distanceEl) distanceEl.style.color = 'var(--accent-green)';
      if (radar) radar.classList.add('geo-locked');

      // "Position trouvée" cue — wait for it to finish (plus a minimum lock-on
      // display) before showing the code entry, so the line isn't cut off.
      playAudio(ZONE_FOUND_AUDIO);
      const minWait  = new Promise(resolve => setTimeout(resolve, 2000));
      const audioEnd = currentAudio
        ? new Promise(resolve => {
            currentAudio.addEventListener('ended', resolve);
            currentAudio.addEventListener('error', resolve);
          })
        : Promise.resolve();
      Promise.all([minWait, audioEnd]).then(() => {
        showCodeEntry(stage, state, route, stepIndex, onSolved);
      });
    } else {
      insideCount = 0;
    }
  }

  // Weighted average of the fix buffer: precise fixes dominate (1/acc²) and
  // recent fixes dominate (weight halves every RECENCY_HALF_MS).
  function smoothedFrom(list, now) {
    let wSum = 0, latSum = 0, lngSum = 0;
    for (const f of list) {
      const w = (1 / (f.acc * f.acc)) * Math.pow(0.5, (now - f.t) / RECENCY_HALF_MS);
      wSum += w; latSum += f.lat * w; lngSum += f.lng * w;
    }
    return { lat: latSum / wSum, lng: lngSum / wSum };
  }

  function onPosition(pos) {
    if (solved || simulating) return;
    lastFixTime = Date.now(); // any fix (even a rejected one) proves the GPS is alive

    const { latitude: lat, longitude: lng } = pos.coords;
    const acc = Math.max(pos.coords.accuracy || 1, 1);

    // Reject junk fixes (IP/wifi-level accuracy) once we have anything better —
    // but if the buffer is empty, accept it so the radar still reacts.
    if (acc > ACCURACY_REJECT && fixes.length) return;

    const now = Date.now();

    // MOVEMENT SNAP — fast feedback for players running (closer OR farther):
    // if this fix lands clearly away from the current average (beyond its own
    // error margin), the player really moved → drop the stale average and track
    // from here. Smoothing then only applies while roughly stationary.
    if (fixes.length) {
      const s = smoothedFrom(fixes, now);
      const jump = haversineDistance(lat, lng, s.lat, s.lng);
      if (jump > Math.max(acc * 1.2, SNAP_MIN_M)) fixes = [];
    }

    fixes.push({ lat, lng, acc, t: now });
    fixes = fixes.filter(f => now - f.t <= SMOOTH_WINDOW_MS).slice(-SMOOTH_MAX_FIXES);

    const p = smoothedFrom(fixes, now);
    const dist = haversineDistance(p.lat, p.lng, targetLat, targetLng);
    const bestAcc = Math.min(...fixes.map(f => f.acc));
    applyDistance(dist, bestAcc);
  }

  function onError(err) {
    if (zoneLabel) zoneLabel.textContent = 'ERREUR';
    if (zoneMsg) {
      const messages = {
        [err.PERMISSION_DENIED]:    'Accès refusé. Activez la géolocalisation.',
        [err.POSITION_UNAVAILABLE]: 'Position indisponible. Déplacez-vous.',
        [err.TIMEOUT]:              'Délai dépassé. Réessai…',
      };
      zoneMsg.textContent = messages[err.code] || 'Erreur de géolocalisation.';
    }
  }

  // watchPosition delivers fixes as fast as the GPS chip produces them; the old
  // 800ms getCurrentPosition spam only added noisy duplicates. Keep a watchdog
  // poll ONLY for when the watch goes silent.
  watchId = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTS);
  navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS); // fast first fix
  pollInterval = setInterval(() => {
    if (!solved && !simulating && Date.now() - lastFixTime > WATCHDOG_MS) {
      lastFixTime = Date.now(); // throttle: at most one manual poll per WATCHDOG_MS
      navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS);
    }
  }, 1000);

  // DEBUG: Skip button
  const skipBtn = document.getElementById(`${PREFIX}-skip-geo`);
  if (skipBtn) {
    skipBtn.onclick = () => {
      if (solved) return;
      solved = true;
      stopWatching();
      showCodeEntry(stage, state, route, stepIndex, onSolved);
    };
  }

  // DEBUG: Simulate movement (closer / farther) so proximity zones + audio can
  // be tested on a PC without real GPS. First click takes over from real GPS.
  let simDist = 25; // start "far" (GLACIAL) so you can walk in through every zone
  function simStep(delta) {
    if (solved) return;
    simulating = true;
    stopWatching(); // stop real GPS from fighting the simulation
    simDist = Math.max(0, simDist + delta);
    applyDistance(simDist);
  }
  const simNearBtn = document.getElementById(`${PREFIX}-sim-near`);
  const simFarBtn  = document.getElementById(`${PREFIX}-sim-far`);
  if (simNearBtn) simNearBtn.onclick = () => simStep(-2);
  if (simFarBtn)  simFarBtn.onclick  = () => simStep(+2);
}

/* ═══════════════  Phase: Code Entry  ═══════════════ */

function showCodeEntry(stage, state, route, stepIndex, onSolved) {
  stopWatching();
  hideAllPanels();

  const step = route[stepIndex];
  const panel = document.getElementById(`${PREFIX}-code-panel`);
  if (panel) panel.classList.remove('hidden');

  const tagEl      = document.getElementById(`${PREFIX}-code-tag`);
  const titleEl    = document.getElementById(`${PREFIX}-code-title`);
  const narrativeEl = document.getElementById(`${PREFIX}-code-narrative`);
  const promptEl   = document.getElementById(`${PREFIX}-code-prompt`);
  const inputEl    = document.getElementById(`${PREFIX}-code-input`);
  const submitEl   = document.getElementById(`${PREFIX}-code-submit`);
  const feedbackEl = document.getElementById(`${PREFIX}-code-feedback`);

  if (tagEl)       tagEl.textContent = `${stepIndex + 1} / ${route.length}`;
  if (titleEl)     titleEl.textContent = step.label;
  if (narrativeEl) narrativeEl.innerHTML = step.narrative || '';
  if (promptEl)    promptEl.textContent = step.codePrompt;
  if (inputEl)     { inputEl.value = ''; inputEl.disabled = false; }
  if (submitEl)    submitEl.disabled = false;
  if (feedbackEl)  feedbackEl.classList.add('hidden');

  // Play arrival audio
  playAudio(step.arrivalAudio);

  // Wire submit
  let submitting = false;

  async function doSubmit() {
    if (submitting) return;
    const answer = (inputEl?.value || '').trim();
    if (!answer) {
      showFeedback(`${PREFIX}-code-feedback`, 'SAISIE REQUISE', 'error');
      return;
    }
    submitting = true;

    const correct = await validateAnswer(answer, step.codeHash);
    if (correct) {
      showFeedback(`${PREFIX}-code-feedback`, 'CODE VALIDÉ', 'success');
      if (submitEl) submitEl.disabled = true;
      if (inputEl) inputEl.disabled = true;

      // Advance to next step
      const nextStep = stepIndex + 1;
      state.routeStep = nextStep;
      recordValidCode(state, answer, `Code — ${step.label}`);
      addLogEntry(state, `SEFY - Code validé : ${step.label}.`);
      saveState(state);

      setTimeout(() => {
        if (step.transitionText && nextStep < route.length) {
          showTransition(stage, state, route, nextStep, step, onSolved);
        } else {
          // Last step — route complete
          startStep(stage, state, route, nextStep, onSolved);
        }
      }, 1000);
    } else {
      showFeedback(`${PREFIX}-code-feedback`, 'CODE INCORRECT', 'error');
      if (inputEl) { glitch(inputEl); inputEl.value = ''; inputEl.focus(); }
      submitting = false;
    }
  }

  const onKey = (e) => { if (e.key === 'Enter') doSubmit(); };
  const onClick = () => doSubmit();

  // Remove old listeners by cloning nodes
  if (submitEl) {
    const newBtn = submitEl.cloneNode(true);
    submitEl.parentNode.replaceChild(newBtn, submitEl);
    newBtn.addEventListener('click', onClick);
  }
  if (inputEl) {
    inputEl.addEventListener('keydown', onKey);
    setTimeout(() => inputEl.focus(), 100);
  }
}

/* ═══════════════  Phase: Transition  ═══════════════ */

function showTransition(stage, state, route, nextStepIndex, prevStep, onSolved) {
  hideAllPanels();
  const transEl = document.getElementById(`${PREFIX}-transition`);
  if (transEl) transEl.classList.remove('hidden');

  const textEl = document.getElementById(`${PREFIX}-transition-text`);
  if (textEl) textEl.textContent = prevStep.transitionText;

  playAudio(prevStep.transitionAudio);

  // Wait for the audio to finish (plus a minimum display time) before advancing.
  const minWait  = new Promise(resolve => setTimeout(resolve, 2000));
  const audioEnd = currentAudio
    ? new Promise(resolve => {
        currentAudio.addEventListener('ended', resolve);
        currentAudio.addEventListener('error', resolve);
      })
    : Promise.resolve();

  Promise.all([minWait, audioEnd]).then(() => {
    startStep(stage, state, route, nextStepIndex, onSolved);
  });
}

/* ═══════════════  Helpers  ═══════════════ */

function hideAllPanels() {
  const ids = [`${PREFIX}-intro`, `${PREFIX}-tracker`, `${PREFIX}-code-panel`, `${PREFIX}-transition`];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
}

function stopWatching() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (pollInterval !== null) { clearInterval(pollInterval); pollInterval = null; }
}

function playAudio(src) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (!src) return;
  currentAudio = new Audio(src);
  currentAudio.play().catch(() => {});
}

function cleanup() {
  stopWatching();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
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
