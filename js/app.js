/**
 * App Controller — thin router that wires components and screens together.
 */

// -- State & Data --
import { loadState, saveState, resetState, startMission, setStage, getTotalHints, getElapsedMs, checkDeviceLock, getDeviceId } from './state.js';
import { loadStageData, getFirstStage, getStageById, getNextStage } from './stages.js';

// -- Shared UI helpers --
import { showScreen, initButtonSounds } from './ui.js';

// -- Components --
import { createBanner, showBanner, resumeBanner, hideBanner, getDeadlineISO, setAgentBadge } from './components/banner.js';
import { createNav, showNav, hideNav, bindNav, setInventoryVisible } from './components/nav.js';
import { createModals, initModals, openModal, closeModal } from './components/modals.js';
import { createBgMusic, startBgMusic, stopBgMusic, setBgMusicMuted } from './components/music.js';

// -- Screens --
import { createTerminalScreen, runBootSequence } from './screens/boot.js';
import { createLandingScreen, runLanding } from './screens/landing.js';
import { createBriefingScreen, runBriefing } from './screens/briefing.js';
import { createStageScreen, populateStage, openHintModal } from './screens/stage.js';
import { createInventoryScreen, populateInventory, updateInventoryBadge } from './screens/evidence.js';
import { createDefusalScreen, startDefusal } from './screens/defusal.js';
import { createSuccessScreen, createFailureScreen, populateSuccess } from './screens/results.js';
import { createGeoScreen, startGeoTracker } from './screens/geo.js';
import { createQRScannerScreen, startQRScanner } from './screens/qrscanner.js';
import { createCodeEntryScreen, startCodeEntry } from './screens/codeentry.js';
import { createARScanScreen, startARScan } from './screens/arscan.js';
import { createTerminalWaitScreen, startTerminalWait } from './screens/terminal-wait.js';

// Stage intro sequences (only for stages that have one)
import { INTRO_SEQUENCE as geoActivationIntro } from './stages/geo-activation.js';
import { INTRO_SEQUENCE as sefyRogueIntro } from './stages/sefy-rogue.js';
import { INTRO_SEQUENCE as scannerRebootIntro } from './stages/scanner-reboot.js';

const STAGE_INTROS = {
  'geo-activation': geoActivationIntro,
  'sefy-rogue': sefyRogueIntro,
  'scanner-reboot': scannerRebootIntro,
};

let state = null;
let currentStage = null;
let puzzleCleanup = null;
let lastActiveScreen = null;

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
  app.appendChild(createInventoryScreen());
  app.appendChild(createGeoScreen());
  app.appendChild(createQRScannerScreen());
  app.appendChild(createCodeEntryScreen());
  app.appendChild(createARScanScreen());
  app.appendChild(createTerminalWaitScreen());
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

  runBriefing(async ({ deadlineISO, playerAgent }) => {
    const firstStage = getFirstStage();
    if (!firstStage) return;

    startMission(state);
    state.playerAgent = playerAgent;
    state.deviceId = getDeviceId();
    state.timestamps.deadline = deadlineISO;
    setAgentBadge(playerAgent);
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

  // Show inventory button during/after QR scanner stages or if player has items
  const needsInventory = stage.puzzle?.type === 'qr-scanner'
    || (state.keycards && state.keycards.length > 0)
    || (state.arFound && state.arFound.length > 0);
  setInventoryVisible(needsInventory);

  if (stage.type === 'finale' || stage.id === 'deactivate-sefy') {
    puzzleCleanup = startDefusal(stage, state, onPuzzleSolved, () => {
      // Switch back to evidence-collection
      const evStage = getStageById('evidence-collection');
      if (evStage) {
        state = setStage(state, evStage.id);
        enterStage(evStage);
      }
    });
    lastActiveScreen = 'screen-defusal';
    showScreen('screen-defusal');
    showNav();
    setInventoryVisible(true);
    return;
  }

  // Geo tracker puzzle type
  if (stage.puzzle?.type === 'geo') {
    // If scanner-reboot is already solved but DECRYPT not done, go to wait screen
    if (stage.id === 'scanner-reboot' && state.solvedPuzzles.includes('scanner-reboot') && !state.decryptActivated) {
      goTerminalWait();
      return;
    }
    puzzleCleanup = startGeoTracker(stage, state, onPuzzleSolved, STAGE_INTROS[stage.id] || null);
    lastActiveScreen = 'screen-geo';
    showScreen('screen-geo');
    showNav();
    return;
  }

  // QR scanner puzzle type
  if (stage.puzzle?.type === 'qr-scanner') {
    // Evidence-collection: "continue" just navigates to deactivate-sefy without solving
    const qrOnSolved = (stage.id === 'evidence-collection')
      ? () => {
          const deactivateStage = getStageById('deactivate-sefy');
          if (deactivateStage) {
            state = setStage(state, deactivateStage.id);
            enterStage(deactivateStage);
          }
        }
      : onPuzzleSolved;
    puzzleCleanup = startQRScanner(stage, state, qrOnSolved);
    lastActiveScreen = 'screen-qrscanner';
    showScreen('screen-qrscanner');
    showNav();
    return;
  }

  // AR scan puzzle type
  if (stage.puzzle?.type === 'ar-scan') {
    puzzleCleanup = startARScan(stage, state, onPuzzleSolved);
    lastActiveScreen = 'screen-arscan';
    showScreen('screen-arscan');
    showNav();
    return;
  }

  // Code-entry puzzle (with optional intro sequence)
  if (stage.puzzle?.type === 'code-entry') {
    puzzleCleanup = startCodeEntry(stage, state, onPuzzleSolved, STAGE_INTROS[stage.id] || null);
    lastActiveScreen = 'screen-codeentry';
    showScreen('screen-codeentry');
    showNav();
    return;
  }

  puzzleCleanup = populateStage(stage, state, onPuzzleSolved);
  lastActiveScreen = 'screen-stage';
  showScreen('screen-stage');
  showNav();
}

function onPuzzleSolved(stage) {
  // scanner-reboot: after geo found, wait for terminal DECRYPT before advancing
  if (stage.id === 'scanner-reboot') {
    goTerminalWait();
    return;
  }

  const next = getNextStage(stage.id);
  if (next) {
    state = setStage(state, next.id);
    enterStage(next);
  } else {
    missionSuccess();
  }
}

function goTerminalWait() {
  if (puzzleCleanup) { puzzleCleanup(); puzzleCleanup = null; }
  lastActiveScreen = 'screen-terminal-wait';
  showScreen('screen-terminal-wait');
  showNav();

  const agent = state.playerAgent;
  puzzleCleanup = startTerminalWait(agent, () => {
    // DECRYPT was activated — advance to next stage
    state.decryptActivated = true;
    saveState(state);
    const solvedStage = getStageById('scanner-reboot');
    const next = solvedStage ? getNextStage(solvedStage.id) : null;
    if (next) {
      state = setStage(state, next.id);
      enterStage(next);
    }
  });
}

// ---- Resume ----

async function resumeMission() {
  const agent = state.playerAgent;

  // Verify this device owns the agent — prevent state swap
  if (agent) {
    const allowed = await checkDeviceLock(agent);
    if (!allowed) {
      alert(`L'agent ${agent.toUpperCase()} est associé à un autre appareil. Sélectionnez votre agent.`);
      state = resetState();
      goTerminal();
      return;
    }
  }

  const stage = getStageById(state.currentStage);
  if (stage) {
    if (state.timestamps.deadline) resumeBanner(state.timestamps.deadline);
    if (state.playerAgent) setAgentBadge(state.playerAgent);
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

// ---- Inventory ----

function showInventory() {
  populateInventory(state);
  showScreen('screen-inventory');
}

function returnFromInventory() {
  if (lastActiveScreen) {
    showScreen(lastActiveScreen);
  } else if (currentStage) {
    enterStage(currentStage);
  }
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

  // Inventory
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-inventory-back')) returnFromInventory();
  });

  // Nav
  bindNav({
    onInventory: () => showInventory(),
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
      goTerminal();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-cancel-reset')) closeModal('modal-reset');
  });
}

// ---- Start ----

document.addEventListener('DOMContentLoaded', init);
