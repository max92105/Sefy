/**
 * Screen: Evidence Collection — SEFY intro + free-mode QR scanner.
 *
 * Composes intro-cinematic and qr-scanner components.
 * Same structure as qr-lockdown but in free-collection mode (no required locks).
 */

import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { createQRScannerDOM, startQRScanning, stopQRCamera } from '../../components/qr-scanner.js';
import { requestCameraWithRetry } from '../../utils/camera.js';
import { saveState } from '../../state.js';
import { INTRO_SEQUENCE } from './config.js';

const PREFIX = 'evidence-collection';

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen';

  const layout = document.createElement('div');
  layout.className = 'qr-layout';

  layout.appendChild(createIntroCinematicDOM(PREFIX));
  layout.appendChild(createQRScannerDOM(PREFIX));

  section.appendChild(layout);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

export function start(stage, state, onSolved) {
  if (state.stagePhase && state.stagePhase[stage.id] === 'scanner') {
    return resumeScanner(stage, state, onSolved);
  }

  const scannerEl = document.getElementById(`${PREFIX}-scanner`);
  if (scannerEl) scannerEl.classList.add('hidden');

  const intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, {
    async requestCamera(event, abort) {
      const granted = await requestCameraWithRetry(intro.currentLine, abort);
      if (abort.aborted || !granted) return 'stop';
      return 'reset-clock';
    },
    startScanner() {
      intro.hide();
      transitionToScanner(stage, state, onSolved);
      return 'stop';
    },
  });

  return () => {
    intro.cleanup();
    stopQRCamera(PREFIX);
  };
}

/* ═══════════════  Phase transitions  ═══════════════ */

function resumeScanner(stage, state, onSolved) {
  const introEl   = document.getElementById(`${PREFIX}-intro`);
  const scannerEl = document.getElementById(`${PREFIX}-scanner`);
  if (introEl)   introEl.classList.add('hidden');
  if (scannerEl) scannerEl.classList.remove('hidden');

  const abortCtrl = { aborted: false };
  startQRScanning(PREFIX, stage, state, onSolved, abortCtrl);

  return () => {
    abortCtrl.aborted = true;
    stopQRCamera(PREFIX);
  };
}

function transitionToScanner(stage, state, onSolved) {
  if (!state.stagePhase) state.stagePhase = {};
  state.stagePhase[stage.id] = 'scanner';
  saveState(state);

  const introEl   = document.getElementById(`${PREFIX}-intro`);
  const scannerEl = document.getElementById(`${PREFIX}-scanner`);
  if (introEl)   introEl.classList.add('hidden');
  if (scannerEl) scannerEl.classList.remove('hidden');

  const abortCtrl = { aborted: false };
  startQRScanning(PREFIX, stage, state, onSolved, abortCtrl);
}
