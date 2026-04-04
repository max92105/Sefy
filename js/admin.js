/**
 * Admin Panel Logic — debug tools for testing and day-of emergencies
 */

import { loadState, saveState, resetState, setStage } from './state.js';
import { loadStageData, getAllStages } from './stages.js';

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
  if (el) {
    state = loadState();
    el.textContent = JSON.stringify(state, null, 2);
  }
}

function renderStageJumps() {
  const grid = document.getElementById('stage-jump-grid');
  if (!grid) return;

  const stages = getAllStages();
  if (!stages.length) {
    grid.textContent = 'No stages loaded.';
    return;
  }

  grid.innerHTML = '';
  for (const stage of stages) {
    // Main jump button (starts at briefing intro)
    const btn = document.createElement('button');
    btn.className = 'stage-jump-btn';
    btn.textContent = `${stage.order}. ${stage.title} [${stage.id}]`;
    btn.addEventListener('click', () => jumpToStage(stages, stage));
    grid.appendChild(btn);

    // "After briefing" button for stages that have a two-phase intro
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


  }
}

function jumpToStage(stages, stage, phase) {
  state.missionStarted = true;
  if (!state.timestamps?.start) {
    state.timestamps = state.timestamps || {};
    state.timestamps.start = new Date().toISOString();
    // Set a deadline 90 min from now
    state.timestamps.deadline = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  }
  // Mark all previous stages as solved
  for (const s of stages) {
    if (s.order < stage.order && !state.solvedPuzzles.includes(s.id)) {
      state.solvedPuzzles.push(s.id);
    }
  }
  // Set phase to skip briefing if requested
  if (phase) {
    if (!state.stagePhase) state.stagePhase = {};
    state.stagePhase[stage.id] = phase;
  } else {
    // Clear any saved phase so briefing plays
    if (state.stagePhase) delete state.stagePhase[stage.id];
  }
  state = setStage(state, stage.id);
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

  document.getElementById('btn-reset-all')?.addEventListener('click', () => {
    if (confirm('This will erase ALL mission progress. Are you sure?')) {
      state = resetState();
      renderState();
    }
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

document.addEventListener('DOMContentLoaded', init);
