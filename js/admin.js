/**
 * Admin Panel Logic — debug tools for testing and day-of emergencies
 */

import { loadState, saveState, resetState, resetAgent, setStage, fetchState, getDeviceId } from './state.js';
import { loadStageData, getAllStages } from './stages.js';
import { fbSaveState } from './firebase-config.js';

let state = null;

async function init() {
  state = loadState();
  await loadStageData();
  renderState();
  renderStageJumps();
  bindEvents();
}

function renderState() {
  const el = document.getElementById('state-display');
  if (!el) return;
  state = loadState();

  // Fetch both agent states from Firebase for display
  Promise.all([
    fetchState('emy'),
    fetchState('lea'),
  ]).then(([emy, lea]) => {
    const display = {
      localStorage: state,
      firebase_emy: emy || '(no state)',
      firebase_lea: lea || '(no state)',
    };
    el.textContent = JSON.stringify(display, null, 2);
  });
}

function renderStageJumps() {
  const grid = document.getElementById('stage-jump-grid');
  if (!grid) return;

  const stages = getAllStages();
  if (!stages.length) {
    grid.textContent = 'No stages loaded.';
    return;
  }

  // Agent selector at top
  grid.innerHTML = `
    <div class="admin-agent-pick" style="display:flex;gap:8px;margin-bottom:8px;">
      <label style="font-family:var(--font-mono);font-size:var(--font-size-sm);color:var(--text-secondary);display:flex;align-items:center;gap:4px;">
        <input type="radio" name="jump-agent" value="emy" checked> ÉMY
      </label>
      <label style="font-family:var(--font-mono);font-size:var(--font-size-sm);color:var(--text-secondary);display:flex;align-items:center;gap:4px;">
        <input type="radio" name="jump-agent" value="lea"> LÉA
      </label>
    </div>
  `;

  for (const stage of stages) {
    // Main jump button
    const btn = document.createElement('button');
    btn.className = 'stage-jump-btn';
    btn.textContent = `${stage.order}. ${stage.title} [${stage.id}]`;
    btn.addEventListener('click', () => jumpToStage(stages, stage));
    grid.appendChild(btn);

    // Skip-briefing button for stages with two-phase intros
    const phaseMap = { geo: 'tracker', 'qr-scanner': 'scanner', 'ar-scan': 'scanner' };
    let phase = phaseMap[stage.puzzle?.type];
    if (!phase && stage.briefingIntro) phase = 'code-entry';
    if (phase) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'stage-jump-btn';
      skipBtn.style.borderLeftColor = 'var(--accent-green)';
      skipBtn.style.borderLeftWidth = '3px';
      skipBtn.textContent = `  ↳ Skip briefing → ${phase}`;
      skipBtn.addEventListener('click', () => jumpToStage(stages, stage, phase));
      grid.appendChild(skipBtn);
    }

    // Terminal-wait button for scanner-reboot
    if (stage.id === 'scanner-reboot') {
      const twBtn = document.createElement('button');
      twBtn.className = 'stage-jump-btn';
      twBtn.style.borderLeftColor = 'var(--accent-amber)';
      twBtn.style.borderLeftWidth = '3px';
      twBtn.textContent = '  ↳ Terminal Wait (waiting for DECRYPT)';
      twBtn.addEventListener('click', () => jumpToStage(stages, stage, 'terminal-wait'));
      grid.appendChild(twBtn);
    }
  }
}

function getSelectedAgent() {
  const radio = document.querySelector('input[name="jump-agent"]:checked');
  return radio ? radio.value : 'emy';
}

async function jumpToStage(stages, stage, phase) {
  const agent = getSelectedAgent();

  state.missionStarted = true;
  state.playerAgent = agent;
  state.deviceId = getDeviceId();

  if (!state.timestamps?.start) {
    state.timestamps = state.timestamps || {};
    state.timestamps.start = new Date().toISOString();
    state.timestamps.deadline = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  }

  // Mark all previous stages as solved
  for (const s of stages) {
    if (s.order < stage.order && !state.solvedPuzzles.includes(s.id)) {
      state.solvedPuzzles.push(s.id);
    }
  }

  // Handle terminal-wait: mark scanner-reboot solved but decryptActivated false
  if (phase === 'terminal-wait') {
    if (!state.solvedPuzzles.includes(stage.id)) {
      state.solvedPuzzles.push(stage.id);
    }
    state.decryptActivated = false;
    // Keep currentStage as scanner-reboot so app detects the wait state
  }

  // Set phase to skip briefing if requested
  if (phase && phase !== 'terminal-wait') {
    if (!state.stagePhase) state.stagePhase = {};
    state.stagePhase[stage.id] = phase;
  } else if (phase !== 'terminal-wait') {
    if (state.stagePhase) delete state.stagePhase[stage.id];
  }

  state = setStage(state, stage.id);

  // Also push to Firebase so the agent state is consistent
  try { await fbSaveState(agent, state); } catch { /* best effort */ }

  window.location.href = 'index.html';
}

function bindEvents() {
  document.getElementById('btn-refresh-state')?.addEventListener('click', renderState);

  document.getElementById('btn-export-state')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'operation-raven-state.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-reset-all')?.addEventListener('click', async () => {
    if (confirm('This will erase ALL mission progress for BOTH agents. Are you sure?')) {
      await resetAgent('emy');
      await resetAgent('lea');
      state = resetState();
      renderState();
    }
  });

  document.getElementById('btn-reset-emy')?.addEventListener('click', async () => {
    if (confirm('Reset all progress for Émy?')) {
      await resetAgent('emy');
      state = loadState();
      renderState();
    }
  });

  document.getElementById('btn-reset-lea')?.addEventListener('click', async () => {
    if (confirm('Reset all progress for Léa?')) {
      await resetAgent('lea');
      state = loadState();
      renderState();
    }
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

document.addEventListener('DOMContentLoaded', init);
