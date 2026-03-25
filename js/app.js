/**
 * App Controller — thin router that wires components and screens together.
 */

// -- State & Data --
import { loadState, saveState, resetState, startMission, setStage, getTotalHints, getElapsedMs } from './state.js';
import { loadStageData, getFirstStage, getStageById, getNextStage } from './stages.js';

// -- Shared UI helpers --
import { showScreen, initButtonSounds } from './ui.js';

// -- Components --
import { createBanner, showBanner, resumeBanner, hideBanner, getDeadlineISO } from './components/banner.js';
import { createNav, showNav, hideNav, bindNav } from './components/nav.js';
import { createModals, initModals, openModal, closeModal } from './components/modals.js';
import { createBgMusic, startBgMusic, stopBgMusic, setBgMusicMuted } from './components/music.js';

// -- Screens --
import { createTerminalScreen, runBootSequence } from './screens/terminal.js';
import { createLandingScreen, runLanding } from './screens/landing.js';
import { createBriefingScreen, runBriefing } from './screens/briefing.js';
import { createStageScreen, populateStage, openHintModal } from './screens/stage.js';
import { createEvidenceScreen, populateEvidence } from './screens/evidence.js';
import { createDefusalScreen } from './screens/defusal.js';
import { createSuccessScreen, createFailureScreen, populateSuccess } from './screens/results.js';
import { createGeoScreen, startGeoTracker } from './screens/geo.js';

let state = null;
let currentStage = null;
let puzzleCleanup = null;

// ---- Build the DOM ----

function buildDOM() {
  const app = document.getElementById('app');

  // Components (injected at body level)
  createBanner();
  createBgMusic();

  // Screens (injected into #app container)
  app.appendChild(createTerminalScreen());
  app.appendChild(createLandingScreen());
  app.appendChild(createBriefingScreen());
  app.appendChild(createStageScreen());
  app.appendChild(createEvidenceScreen());
  app.appendChild(createGeoScreen());
  app.appendChild(createDefusalScreen());
  app.appendChild(createSuccessScreen());
  app.appendChild(createFailureScreen());

  // Components that go after screens
  createModals();
  createNav();
}

// ---- Initialization ----

async function init() {
  buildDOM();

  state = loadState();
  await loadStageData();
  initModals();
  bindGlobalEvents();
  initButtonSounds();
  startBgMusic();

  if (state.missionStarted && state.currentStage) {
    resumeMission();
  } else {
    goTerminal();
  }
}

// ---- Screen Flows ----

function goTerminal() {
  hideNav();
  showScreen('screen-terminal');
  runBootSequence(() => goLanding());
}

function goLanding() {
  showScreen('screen-boot');
  hideNav();
  runLanding(() => goBriefing());
}

function goBriefing() {
  showScreen('screen-briefing');
  hideNav();
  hideBanner();

  runBriefing(({ deadlineISO }) => {
    const firstStage = getFirstStage();
    if (!firstStage) return;

    startMission(state);
    state.timestamps.deadline = deadlineISO;
    state = setStage(state, firstStage.id);

    // If briefing stage has no puzzle, auto-advance
    if (!firstStage.puzzle) {
      const next = getNextStage(firstStage.id);
      if (next) {
        if (!state.solvedPuzzles.includes(firstStage.id)) {
          state.solvedPuzzles.push(firstStage.id);
          saveState(state);
        }
        state = setStage(state, next.id);
        enterStage(next);
      }
    } else {
      enterStage(firstStage);
    }
  });
}

// ---- Stage Entry ----

function enterStage(stage) {
  currentStage = stage;

  if (puzzleCleanup) { puzzleCleanup(); puzzleCleanup = null; }

  if (stage.type === 'finale') {
    showScreen('screen-defusal');
    showNav();
    return;
  }

  // Geo tracker puzzle type
  if (stage.puzzle?.type === 'geo') {
    puzzleCleanup = startGeoTracker(stage, state, onPuzzleSolved);
    showScreen('screen-geo');
    showNav();
    return;
  }

  puzzleCleanup = populateStage(stage, state, onPuzzleSolved);
  showScreen('screen-stage');
  showNav();
}

function onPuzzleSolved(stage) {
  const next = getNextStage(stage.id);
  if (next) {
    state = setStage(state, next.id);
    enterStage(next);
  } else {
    missionSuccess();
  }
}

// ---- Resume ----

function resumeMission() {
  const stage = getStageById(state.currentStage);
  if (stage) {
    if (state.timestamps.deadline) resumeBanner(state.timestamps.deadline);
    enterStage(stage);
  } else {
    goTerminal();
  }
}

// ---- Mission End ----

function missionSuccess() {
  hideNav();
  populateSuccess(getElapsedMs(state), getTotalHints(state));
  showScreen('screen-success');
}

// ---- Evidence Board ----

function showEvidenceBoard() {
  populateEvidence(state);
  showScreen('screen-evidence');
}

// ---- Sound Toggle ----

function toggleSound() {
  state.settings.soundEnabled = !state.settings.soundEnabled;
  saveState(state);
  const icon = document.getElementById('sound-icon');
  if (icon) icon.textContent = state.settings.soundEnabled ? '🔊' : '🔇';
  setBgMusicMuted(!state.settings.soundEnabled);
}

// ---- Global Event Bindings ----

function bindGlobalEvents() {
  // Hint
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-hint');
    if (btn) openHintModal(currentStage, state);
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-close-hint')) closeModal('modal-hint');
  });

  // Evidence
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-evidence')) showEvidenceBoard();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-evidence-back') && currentStage) enterStage(currentStage);
  });

  // Nav
  bindNav({
    onEvidence: () => showEvidenceBoard(),
    onSoundToggle: () => toggleSound(),
  });

  // Reset flow
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-restart') || e.target.closest('#btn-retry')) {
      openModal('modal-reset');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-confirm-reset')) {
      state = resetState();
      closeModal('modal-reset');
      hideBanner();
      stopBgMusic();
      goTerminal();
      startBgMusic();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-cancel-reset')) closeModal('modal-reset');
  });
}

// ---- Start ----

document.addEventListener('DOMContentLoaded', init);
