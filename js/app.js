/**
 * App Controller — thin router that wires components and screens together.
 */

// -- State & Data --
import { loadState, saveState, resetState, fetchState, startMission, setStage, getTotalHints, getElapsedMs, checkDeviceLock, getDeviceId, addLogEntry } from './state.js';
import { loadStageData, getFirstStage, getStageById, getNextStage } from './stages.js';

// -- Shared UI helpers --
import { showScreen, initButtonSounds } from './ui.js';

// -- Components --
import { createBanner, showBanner, resumeBanner, hideBanner, getDeadlineISO, setAgentBadge } from './components/banner.js';
import { createNav, showNav, hideNav, bindNav, setInventoryVisible } from './components/nav.js';
import { createModals, initModals, openModal, closeModal } from './components/modals.js';
import { createBgMusic, startBgMusic, stopBgMusic, setBgMusicMuted } from './components/music.js';

// -- Screens --
import { createTerminalScreen, runBootSequence } from './intro/screens/boot.js';
import { createLandingScreen, runLanding } from './intro/screens/landing.js';
import { createScreen as createBriefingScreen, start as runBriefing } from './stages/mission-briefing/screen.js';
import { createStageScreen, populateStage, openHintModal } from './screens/stage.js';
import { createInventoryScreen, populateInventory, updateInventoryBadge } from './screens/evidence.js';
import { createSuccessScreen, createFailureScreen, populateSuccess } from './screens/results.js';
import { createScreen as createGeoActivationScreen, start as startGeoActivation } from './stages/geo-activation/screen.js';
import { createScreen as createScannerRebootScreen, start as startScannerReboot } from './stages/scanner-reboot/screen.js';
import { createScreen as createFieldOpsScreen, start as startFieldOps } from './stages/field-ops/screen.js';
import { createScreen as createSefyRogueScreen, start as startSefyRogue } from './stages/sefy-rogue/screen.js';
import { createScreen as createDeactivateSefyScreen, start as startDeactivateSefy } from './stages/deactivate-sefy/screen.js';
import { createTerminalWaitScreen, startTerminalWait } from './screens/terminal-wait.js';


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
  app.appendChild(createGeoActivationScreen());
  app.appendChild(createScannerRebootScreen());
  app.appendChild(createFieldOpsScreen());
  app.appendChild(createSefyRogueScreen());
  app.appendChild(createDeactivateSefyScreen());
  app.appendChild(createTerminalWaitScreen());
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

    // Seed the system log with initial boot entries
    addLogEntry(state, 'Système démarré en état d\'urgence.');
    addLogEntry(state, 'SEFY - VALIDATION DES ACCÈS.');
    addLogEntry(state, 'SEFY - Agents terrain détectés.');
    addLogEntry(state, 'PROTOCOLE 4 ACTIVÉ');

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

/** Stage-specific start functions */
const stageStarters = {
  'geo-activation':      (stage, state, onSolved) => startGeoActivation(stage, state, onSolved),
  'scanner-reboot':      (stage, state, onSolved) => startScannerReboot(stage, state, onSolved),
  'field-ops':           (stage, state, onSolved) => startFieldOps(stage, state, onSolved),
  'sefy-rogue':          (stage, state, onSolved) => startSefyRogue(stage, state, onSolved),
};

function enterStage(stage) {
  currentStage = stage;

  if (puzzleCleanup) { puzzleCleanup(); puzzleCleanup = null; }

  // Log stage progression events
  logStageEntry(stage.id);

  // Show inventory button during field-ops or if player has items
  const needsInventory = stage.id === 'field-ops'
    || (state.keycards && state.keycards.length > 0)
    || (state.arFound && state.arFound.length > 0)
    || (state.inventory && state.inventory.length > 0);
  setInventoryVisible(needsInventory);

  const screenId = `screen-${stage.id}`;

  // deactivate-sefy: code entry with back button to field-ops
  if (stage.id === 'deactivate-sefy') {
    puzzleCleanup = startDeactivateSefy(stage, state, onPuzzleSolved, () => {
      const fieldStage = getStageById('field-ops');
      if (fieldStage) {
        state = setStage(state, fieldStage.id);
        enterStage(fieldStage);
      }
    });
    lastActiveScreen = screenId;
    showScreen(screenId);
    showNav();
    setInventoryVisible(true);
    return;
  }

  // scanner-reboot: if solved but DECRYPT not done, go to terminal wait
  if (stage.id === 'scanner-reboot' && state.solvedPuzzles.includes('scanner-reboot') && !state.decryptActivated) {
    goTerminalWait();
    return;
  }

  // Stages with dedicated start functions
  const starter = stageStarters[stage.id];
  if (starter) {
    puzzleCleanup = starter(stage, state, onPuzzleSolved);
    lastActiveScreen = screenId;
    showScreen(screenId);
    showNav();
    return;
  }

  // Fallback: generic stage screen
  puzzleCleanup = populateStage(stage, state, onPuzzleSolved);
  lastActiveScreen = 'screen-stage';
  showScreen('screen-stage');
  showNav();
}

/* ── System log entries tied to stage progression ── */

const stageLogEntries = {
  'geo-activation': [
    'SEFY - Activité terrain détectée.',
    'SEFY - Tentative de localisation GPS en cours.',
    'PROTOCOLE 5 ACTIVÉ',
  ],
  'scanner-reboot': [
    'SEFY - Localisation confirmée.',
    'SEFY - Scanner de l\'installation compromis.',
  ],
  'field-ops': [
    'SEFY - Module de décryptage actif détecté.',
    'SEFY - Accès aux données internes en cours.',
    'PROTOCOLE 6 ACTIVÉ',
    'SEFY - RESTRICTION DES COMMUNICATIONS.',
  ],
  'sefy-rogue': [
    'SEFY - ALERTE CRITIQUE: Agents terrain hors contrôle.',
    'SEFY - INITIALISATION DU PROTOCOLE 11',
    'PROTOCOLE 11 EN ATTENTE',
  ],
  'deactivate-sefy': [
    'SEFY - TENTATIVE DE DÉSACTIVATION DÉTECTÉE.',
    'SEFY - PROTOCOLE 11 — ACTIF.',
  ],
};

function logStageEntry(stageId) {
  const entries = stageLogEntries[stageId];
  if (!entries) return;
  // Don't double-log if we already logged for this stage
  const logKey = `_logged_${stageId}`;
  if (state[logKey]) return;
  state[logKey] = true;
  for (const text of entries) {
    addLogEntry(state, text);
  }
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

  // Check if admin wiped Firebase — if so, wipe local state too
  if (agent) {
    const remote = await fetchState(agent);
    if (!remote || !remote.missionStarted) {
      state = resetState();
      goTerminal();
      return;
    }
  }

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
