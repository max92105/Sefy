/**
 * App Controller — thin router that wires components and screens together.
 */

// -- State & Data --
import { loadState, saveState, resetState, resetAgent, fetchState, startMission, setStage, checkDeviceLock, getDeviceId, addLogEntry } from './state.js';
import { loadStageData, getFirstStage, getStageById, getNextStage } from './stages.js';

// -- Shared UI helpers --
import { showScreen, initButtonSounds } from './ui.js';

// -- Components --
import { createBanner, showBanner, resetBanner, resumeBanner, hideBanner, getDeadlineISO, setAgentBadge } from './components/banner.js';
import { createNav, showNav, hideNav, bindNav, setInventoryVisible, setReplayVisible, setHintButton } from './components/nav.js';
import { replayIntroCinematic, clearIntroPlaying } from './components/intro-cinematic.js';
import { createStageBriefingScreen, BRIEFING_PREFIX, BRIEFING_SCREEN_ID } from './screens/stage-briefing.js';
import { INTRO_SEQUENCE as geoIntroSequence } from './stages/geo-activation/config.js';
import { INTRO_SEQUENCE as sefyRogueIntroSequence } from './stages/sefy-rogue/config.js';
import { INTRO_SEQUENCE as scannerRebootIntroSequence, ALL_CODES_AUDIO } from './stages/scanner-reboot/config.js';
import { INTRO_SEQUENCE as fieldOpsIntroSequence, AR_BRIEFING_SEQUENCE as fieldOpsARBriefingSequence } from './stages/field-ops/config.js';
import { createModals, initModals, openModal, closeModal } from './components/modals.js';
import { createBgMusic, startBgMusic, stopBgMusic, setBgMusicMuted } from './components/music.js';
import { createVideoPlayer } from './components/video-player.js';

// -- Screens --
import { createTerminalScreen, runBootSequence } from './intro/screens/boot.js';
import { createLandingScreen, runLanding } from './intro/screens/landing.js';
import { createScreen as createBriefingScreen, start as runBriefing } from './stages/mission-briefing/screen.js';
import { createStageScreen, populateStage, openHintModal, syncHintBadge } from './screens/stage.js';
import { createInventoryScreen, populateInventory, updateInventoryBadge, bindDebugQR } from './screens/evidence.js';
import { createSuccessScreen, createFailureScreen, createTrueVictoryScreen, createEndChoiceScreen, populateSuccess } from './screens/results.js';
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
  createVideoPlayer();

  // Screens (injected into #app container)
  app.appendChild(createTerminalScreen());
  app.appendChild(createLandingScreen());
  app.appendChild(createBriefingScreen());
  app.appendChild(createStageBriefingScreen());
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
  app.appendChild(createTrueVictoryScreen());
  app.appendChild(createEndChoiceScreen());

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
  clearIntroPlaying();
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

/**
 * Stages whose briefing intro can be replayed via the nav button.
 * A value can be a sequence, or a function(state) → sequence for stages whose
 * briefing depends on progress (field-ops: AR briefing once AR is activated).
 */
const introReplays = {
  'geo-activation': geoIntroSequence,
  'sefy-rogue':     sefyRogueIntroSequence,
  'scanner-reboot': scannerRebootIntroSequence,
  'field-ops':      (st) => (st.arActivated ? fieldOpsARBriefingSequence : fieldOpsIntroSequence),
};

/**
 * Sync the nav hint + replay buttons to the current stage.
 * @param {object}  stage
 * @param {boolean} [replayable] — whether the stage's own intro screen is showing
 */
function updateStageTools(stage, { replayable = false } = {}) {
  if (!stage) return;
  syncHintBadge(stage, state);
  setReplayVisible(replayable && !!introReplays[stage.id]);
}

/** Replay the current stage's briefing on the shared briefing screen (no flow side-effects). */
function replayCurrentIntro() {
  if (!currentStage) return;
  let sequence = introReplays[currentStage.id];
  if (typeof sequence === 'function') sequence = sequence(state);
  if (!sequence) return;

  // Navigate to the briefing screen, replay, then return to whatever screen was
  // actually showing (e.g. the field-ops scanner during the PURGE colour hunt).
  const active = document.querySelector('.screen.active');
  const returnScreenId = active ? active.id : lastActiveScreen;
  showScreen(BRIEFING_SCREEN_ID);
  replayIntroCinematic(BRIEFING_PREFIX, sequence, () => {
    if (returnScreenId) showScreen(returnScreenId);
  });
}

/** Play a one-off SEFY voice line, independent of any stage's audio lifecycle. */
let voiceAudio = null;
function playVoice(src) {
  if (!src) return;
  try {
    if (voiceAudio) voiceAudio.pause();
    voiceAudio = new Audio(src);
    voiceAudio.volume = 0.9;
    voiceAudio.play().catch(() => {});
  } catch {
    // Audio unavailable — ignore.
  }
}

function enterStage(stage) {
  currentStage = stage;

  if (puzzleCleanup) { puzzleCleanup(); puzzleCleanup = null; }

  // Log stage progression events
  logStageEntry(stage.id);

  // Show inventory during field-ops, or whenever the player holds any item
  // (so the inventory stays available in later puzzles).
  const hasItems = !!state.hasSyringe || ['cards', 'arFound', 'audioLogs', 'videoLogs', 'papers', 'inventory']
    .some(k => Array.isArray(state[k]) && state[k].length > 0);
  // The scanner/PURGE/final stages always keep the inventory available.
  const inventoryStages = ['field-ops', 'sefy-rogue', 'deactivate-sefy'];
  setInventoryVisible(inventoryStages.includes(stage.id) || hasItems);

  const screenId = `screen-${stage.id}`;

  // deactivate-sefy: final, LOCKED code entry. No nav, no back button — the
  // player is held here while the deactivation code loops on audio. Only the
  // PURGE timer banner stays visible.
  if (stage.id === 'deactivate-sefy') {
    puzzleCleanup = startDeactivateSefy(stage, state, onPuzzleSolved);
    lastActiveScreen = screenId;
    showScreen(screenId);
    // Locked screen, but keep the inventory reachable so the player can still
    // decide whether to use the syringe until the very last second.
    showNav();
    setInventoryVisible(true);
    setHintButton(0, 0);     // no hints here
    setReplayVisible(false); // no briefing to replay
    return;
  }

  // geo-activation: play SEFY intro briefing, then wait for terminal GEO command, then advance
  if (stage.id === 'geo-activation') {
    // GEO command already entered → advance to the next stage
    if (state.geoActivated) {
      advancePastGeo(stage);
      return;
    }

    const goWaitForGeo = () => {
      goTerminalWait('geo', () => {
        state.geoActivated = true;
        saveState(state);
        advancePastGeo(stage);
      });
    };

    // Resuming after the intro was already watched → straight to the terminal wait
    if (state.stagePhase && state.stagePhase[stage.id]) {
      goWaitForGeo();
      return;
    }

    // First time: play the SEFY intro briefing, then send players to the terminal wait.
    // showScreen/showNav run first; startGeoActivation then navigates to the
    // shared briefing screen (last showScreen wins).
    lastActiveScreen = screenId;
    showScreen(screenId);
    showNav();
    // No replay button while the intro is actively playing — it appears on the
    // terminal-wait search screen (see goTerminalWait).
    updateStageTools(stage, { replayable: false });
    puzzleCleanup = startGeoActivation(stage, state, () => {
      if (!state.stagePhase) state.stagePhase = {};
      state.stagePhase[stage.id] = 'intro-done';
      saveState(state);
      goWaitForGeo();
    });
    return;
  }

  // scanner-reboot: if solved but DECRYPT not done, go to terminal wait
  if (stage.id === 'scanner-reboot' && state.solvedPuzzles.includes('scanner-reboot') && !state.decryptActivated) {
    goTerminalWait('decrypt', () => {
      state.decryptActivated = true;
      saveState(state);
      const solvedStage = getStageById('scanner-reboot');
      const next = solvedStage ? getNextStage(solvedStage.id) : null;
      if (next) {
        state = setStage(state, next.id);
        enterStage(next);
      }
    });
    return;
  }

  // Stages with dedicated start functions
  const starter = stageStarters[stage.id];
  if (starter) {
    // showScreen first; a stage that plays a briefing then navigates to the
    // shared briefing screen (last showScreen wins).
    lastActiveScreen = screenId;
    showScreen(screenId);
    showNav();
    updateStageTools(stage, { replayable: true });
    puzzleCleanup = starter(stage, state, onPuzzleSolved);
    return;
  }

  // Fallback: generic stage screen
  puzzleCleanup = populateStage(stage, state, onPuzzleSolved);
  lastActiveScreen = 'screen-stage';
  showScreen('screen-stage');
  showNav();
  updateStageTools(stage, { replayable: true });
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
    'SEFY - Accès Tier 4 confirmé. Intervention humaine complète.',
    'SEFY - INITIALISATION DU PROTOCOLE 11',
    'PROTOCOLE 11 ACTIVÉ',
  ],
  'deactivate-sefy': [
    'SEFY - TENTATIVE DE DÉSACTIVATION DÉTECTÉE.',
    'SEFY - Signal d\'urgence détecté sur le réseau interne.',
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
  // scanner-reboot: all three codes validated → play the "all codes" voice line,
  // then wait for the terminal DECRYPT before advancing.
  if (stage.id === 'scanner-reboot') {
    goTerminalWait('decrypt', () => {
      state.decryptActivated = true;
      saveState(state);
      const solvedStage = getStageById('scanner-reboot');
      const next = solvedStage ? getNextStage(solvedStage.id) : null;
      if (next) {
        state = setStage(state, next.id);
        enterStage(next);
      }
    });
    // Played after goTerminalWait (which runs the scanner cleanup) so the line
    // isn't immediately stopped.
    playVoice(ALL_CODES_AUDIO);
    return;
  }

  const next = getNextStage(stage.id);
  if (next) {
    state = setStage(state, next.id);
    enterStage(next);
  } else {
    // Final code entered → resolve the ending (vaccine → true victory; otherwise a choice).
    endGame();
  }
}

/**
 * The deactivation code has been entered. The countdown stops; the outcome now
 * depends on the vaccine:
 *   - vaccinated  → cured + deactivated → TRUE VICTORY (no choice).
 *   - otherwise   → infected → the player must choose to leave (survive, carry
 *                   the virus) or let themselves die (contain it).
 */
function endGame() {
  if (state.vaccinated) {
    addLogEntry(state, 'PROTOCOLE 11 INTERROMPU.');
    addLogEntry(state, 'SEFY - Contrôle rétabli. Agent immunisé — ARK-41 neutralisé.');
    setEnding('victory');
  } else {
    setEnding('choice');
  }
}

/** Persist the reached ending (so a refresh resumes here) and show its screen. */
function setEnding(ending) {
  state.ending = ending;
  // Freeze the completion time at the first ending (so deliberating on the
  // choice screen doesn't inflate elapsed time / change the score).
  if (!state.timestamps.end) state.timestamps.end = new Date().toISOString();
  saveState(state);
  showEnding(ending);
}

/** Render an end screen for a given ending value. */
function showEnding(ending) {
  hideBanner();
  hideNav();
  if (ending === 'victory') {
    populateSuccess(state, 'victory');
    showScreen('screen-victory');
  } else if (ending === 'survive') {
    populateSuccess(state, 'score');
    showScreen('screen-success');
  } else if (ending === 'choice') {
    showScreen('screen-end-choice');
  } else {
    showScreen('screen-failure'); // 'death'
  }
}

function goTerminalWait(waitType, onDone) {
  if (puzzleCleanup) { puzzleCleanup(); puzzleCleanup = null; }
  lastActiveScreen = 'screen-terminal-wait';
  showScreen('screen-terminal-wait');
  showNav();
  // Keep the hint available; the replay button (if the stage has a registered
  // briefing) re-shows that briefing over this search screen.
  updateStageTools(currentStage, { replayable: true });

  const agent = state.playerAgent;
  puzzleCleanup = startTerminalWait(agent, waitType, onDone);
}

function advancePastGeo(stage) {
  if (!state.solvedPuzzles.includes(stage.id)) {
    state.solvedPuzzles.push(stage.id);
  }
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'done';
  saveState(state);
  const next = getNextStage(stage.id);
  if (next) {
    state = setStage(state, next.id);
    enterStage(next);
  }
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

  // An ending was already reached → re-show it (final save point).
  if (state.ending) {
    if (state.playerAgent) setAgentBadge(state.playerAgent);
    showEnding(state.ending);
    return;
  }

  const stage = getStageById(state.currentStage);
  if (stage) {
    const finalSolved = (state.solvedPuzzles || []).includes('deactivate-sefy');
    const deadlineMs = state.timestamps.deadline ? new Date(state.timestamps.deadline).getTime() : 0;

    // PURGE countdown already ran out while the page was away (and the game
    // isn't finished) → go straight to the end-game, not the stale stage screen.
    if (state.purgeActive && !finalSolved && deadlineMs && deadlineMs <= Date.now()) {
      setEnding('death');
      return;
    }

    if (deadlineMs && !finalSolved) {
      // PURGE in progress → 20-min timer that ends the game at zero.
      if (state.purgeActive) resumeBanner(state.timestamps.deadline, { onZero: () => setEnding('death'), totalMs: 20 * 60 * 1000 });
      else resumeBanner(state.timestamps.deadline);
    }
    if (state.playerAgent) setAgentBadge(state.playerAgent);
    enterStage(stage);
  } else {
    goTerminal();
  }
}

// ---- Inventory ----

let preInventoryScreen = null;

function showInventory() {
  // Remember the screen we came from (e.g. the field-ops scanner during the
  // PURGE colour hunt) so we return there, not to the stage's host screen.
  const active = document.querySelector('.screen.active');
  preInventoryScreen = active ? active.id : lastActiveScreen;
  populateInventory(state);
  bindDebugQR(state);
  showScreen('screen-inventory');
}

function returnFromInventory() {
  if (preInventoryScreen) {
    showScreen(preInventoryScreen);
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
  // Hint modal opens from the nav hint button (see bindNav below).
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('#btn-close-hint')) closeModal('modal-hint');
  });

  // Inventory
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('#btn-inventory-back')) returnFromInventory();
  });

  // Nav
  bindNav({
    onInventory: () => showInventory(),
    onSoundToggle: () => toggleSound(),
    onHint: () => openHintModal(currentStage, state),
    onReplayIntro: () => replayCurrentIntro(),
  });

  // Final-choice flow (deactivation code entered without the vaccine)
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('#btn-end-leave')) {
      // Deactivate SEFY and walk out — alive, but carrying the virus.
      addLogEntry(state, 'PROTOCOLE 11 INTERROMPU.');
      addLogEntry(state, 'SEFY - Contrôle rétabli.');
      setEnding('survive');
    } else if (e.target.closest('#btn-end-die')) {
      // Stay behind — the virus dies with you. Same outcome as the timer hitting zero.
      addLogEntry(state, 'AGENT - Refus d\'évacuation. Confinement accepté.');
      setEnding('death');
    }
  });

  // Reset flow
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('#btn-restart') || e.target.closest('#btn-retry') || e.target.closest('#btn-victory-restart')) {
      openModal('modal-reset');
    }
  });

  document.addEventListener('click', async (e) => {
    if (e.target instanceof Element && e.target.closest('#btn-confirm-reset')) {
      // Wipe the agent's Firebase node too — otherwise the stale missionStarted
      // state resurfaces when the agent is re-selected and causes weird resumes.
      const agent = state.playerAgent;
      closeModal('modal-reset');
      hideBanner();
      if (agent) { try { await resetAgent(agent); } catch { /* offline — local reset still applies */ } }
      state = resetState();
      goTerminal();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('#btn-cancel-reset')) closeModal('modal-reset');
  });
}

// ---- Start ----

document.addEventListener('DOMContentLoaded', init);
