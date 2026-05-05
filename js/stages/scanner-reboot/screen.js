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

import { solvePuzzle, saveState } from '../../state.js';
import { validateAnswer } from '../../stages.js';
import { showFeedback, glitch } from '../../ui.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { requestLocationWithRetry, GEO_OPTS } from '../../utils/geolocation.js';
import { INTRO_SEQUENCE, ROUTES } from './config.js';

const PREFIX = 'scanner-reboot';

/* ───────── Distance zones ───────── */
const ZONES = [
  { maxDist: 5,        label: 'BRÛLANT', cls: 'geo-burning',  color: 'var(--accent-red)',   msg: 'Vous y êtes presque !' },
  { maxDist: 10,       label: 'CHAUD',   cls: 'geo-hot',      color: '#ff6633',             msg: 'Très proche… cherchez bien.' },
  { maxDist: 15,       label: 'TIÈDE',   cls: 'geo-warm',     color: 'var(--accent-amber)', msg: 'Vous approchez de la zone.' },
  { maxDist: 20,       label: 'FROID',   cls: 'geo-cold',     color: '#66bbff',             msg: 'Encore loin… continuez à explorer.' },
  { maxDist: Infinity, label: 'GLACIAL', cls: 'geo-freezing', color: '#4488ff',             msg: 'Aucun signal détecté dans ce secteur.' },
];

const POLL_INTERVAL_MS = 800;

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

      <!-- DEBUG: Remove before production -->
      <button id="${PREFIX}-skip-geo" class="btn btn-outline" style="margin-top:1rem;border-color:var(--accent-red);color:var(--accent-red);font-size:0.7rem;">⚠ SKIP GEO (DEBUG)</button>
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

  const targetLat = step.geo.lat;
  const targetLng = step.geo.lng;
  const radius    = step.geo.radius || 4;
  let solved = false;
  let lastZoneCls = '';

  function onPosition(pos) {
    if (solved) return;
    const dist = haversineDistance(pos.coords.latitude, pos.coords.longitude, targetLat, targetLng);
    const zone = ZONES.find(z => dist <= z.maxDist) || ZONES[ZONES.length - 1];

    if (distanceEl) { distanceEl.textContent = `${Math.round(dist)} m`; distanceEl.style.color = zone.color; }
    if (zoneLabel)  zoneLabel.textContent = zone.label;
    if (zoneMsg)    { zoneMsg.textContent = zone.msg; zoneMsg.style.color = zone.color; }

    if (radar && zone.cls !== lastZoneCls) {
      if (lastZoneCls) radar.classList.remove(lastZoneCls);
      radar.classList.add(zone.cls);
      lastZoneCls = zone.cls;
    }

    if (dot) dot.style.animationDuration = `${Math.max(0.3, Math.min(2, dist / 10))}s`;

    if (dist <= radius) {
      solved = true;
      stopWatching();

      if (zoneLabel) zoneLabel.textContent = 'CIBLE LOCALISÉE';
      if (zoneMsg)   { zoneMsg.textContent = 'Position confirmée.'; zoneMsg.style.color = 'var(--accent-green)'; }
      if (distanceEl) distanceEl.style.color = 'var(--accent-green)';
      if (radar) radar.classList.add('geo-locked');

      // Short delay then show code entry
      setTimeout(() => {
        showCodeEntry(stage, state, route, stepIndex, onSolved);
      }, 2000);
    }
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

  watchId = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTS);
  navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS);
  pollInterval = setInterval(() => {
    if (!solved) navigator.geolocation.getCurrentPosition(onPosition, onError, GEO_OPTS);
  }, POLL_INTERVAL_MS);

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

  // Play transition audio
  playAudio(prevStep.transitionAudio);

  // After a delay, start the next step
  setTimeout(() => {
    startStep(stage, state, route, nextStepIndex, onSolved);
  }, 4000);
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
