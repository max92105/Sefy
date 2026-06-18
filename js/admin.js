/**
 * Admin Panel Logic — debug tools for testing and day-of emergencies
 */

import { loadState, resetState, resetAgent, getDeviceId, setLocalState } from './state.js';
import { loadStageData, getAllStages } from './stages.js';
import { fbLoadState, fbForceState, fbResetAgent, createDefaultState } from './firebase-config.js';

let state = null;

async function init() {
  state = loadState();
  await loadStageData();
  renderState();
  renderCheckpoints();
  bindEvents();
}

function renderState() {
  const el = document.getElementById('state-display');
  if (!el) return;
  state = loadState();

  // Fetch both agent states from Firebase for display (read-only, no localStorage side-effect)
  Promise.all([
    fbLoadState('emy'),
    fbLoadState('lea'),
  ]).then(([emy, lea]) => {
    const display = {
      localStorage: state,
      firebase_emy: emy || '(no state)',
      firebase_lea: lea || '(no state)',
    };
    el.textContent = JSON.stringify(display, null, 2);
  });
}

/* ═══════════════════════════════════════════════════════════════
   CHECKPOINTS
   Each entry FULLY rebuilds the agent's state from a clean default and
   applies only the mandatory config to land exactly at that save point —
   so a player can be reset there "ready to go". The state is force-pushed
   to Firebase (overwrite, not merge) and written locally, then index.html
   resumes there.

   IMPORTANT: run this page ON THE PLAYER'S DEVICE (it stamps that device as
   the agent's owner and that device resumes the game).
   ═══════════════════════════════════════════════════════════════ */

/**
 * Build a clean checkpoint state.
 * opts: tier, geo, decrypt, ar, arBriefingDone, routeStep, purge,
 *       stagePhase{}, solveCurrent, fieldFinds, allOverrides
 */
function buildState(agent, stages, stageId, opts = {}) {
  const s = createDefaultState();
  s.missionStarted = true;
  s.playerAgent = agent;
  s.deviceId = getDeviceId();

  const now = Date.now();
  const minutes = opts.purge ? 20 : 90;
  s.timestamps = {
    start: new Date(now).toISOString(),
    deadline: new Date(now + minutes * 60 * 1000).toISOString(),
  };

  s.currentStage = stageId;

  // Every stage with a lower order is considered solved.
  const order = stages.find((x) => x.id === stageId)?.order ?? 0;
  s.solvedPuzzles = stages.filter((x) => x.order < order).map((x) => x.id);
  if (opts.solveCurrent && !s.solvedPuzzles.includes(stageId)) s.solvedPuzzles.push(stageId);

  s.accessTier = opts.tier || 1;
  if (opts.geo) s.geoActivated = true;
  if (opts.decrypt) s.decryptActivated = true;
  if (opts.ar) s.arActivated = true;
  if (opts.arBriefingDone !== undefined) s.arBriefingDone = opts.arBriefingDone;
  if (opts.routeStep !== undefined) s.routeStep = opts.routeStep;
  if (opts.purge) s.purgeActive = true;
  if (opts.stagePhase) s.stagePhase = { ...opts.stagePhase };

  // Field-ops finds (bomb + Adrian Tier-4 card) for stages after field-ops.
  if (opts.fieldFinds) {
    s.arFound = ['bomb'];
    s.cards = ['ADRIAN'];
  }
  // All three colour-terminal overrides already done.
  if (opts.allOverrides) {
    s.overrides = { RED: true, BLUE: true, YELLOW: true };
  }
  return s;
}

const CHECKPOINTS = [
  { label: '⟲ Départ — intro complète (RESET total)', color: 'var(--accent-red)', wipe: true },

  { label: '1 · Géo — briefing',
    color: 'var(--accent-cyan)',
    build: (a, st) => buildState(a, st, 'geo-activation', { tier: 1 }) },
  { label: '1 · Géo — attente terminal (commande GEO)',
    color: 'var(--accent-amber)',
    build: (a, st) => buildState(a, st, 'geo-activation', { tier: 1, stagePhase: { 'geo-activation': 'intro-done' } }) },

  { label: '2 · Scanner — briefing + route (étape 1/3)',
    color: 'var(--accent-cyan)',
    build: (a, st) => buildState(a, st, 'scanner-reboot', { tier: 1, geo: true, routeStep: 0 }) },
  { label: '2 · Scanner — étape 2/3',
    color: 'var(--accent-cyan)',
    build: (a, st) => buildState(a, st, 'scanner-reboot', { tier: 1, geo: true, routeStep: 1, stagePhase: { 'scanner-reboot': 'route' } }) },
  { label: '2 · Scanner — étape 3/3',
    color: 'var(--accent-cyan)',
    build: (a, st) => buildState(a, st, 'scanner-reboot', { tier: 1, geo: true, routeStep: 2, stagePhase: { 'scanner-reboot': 'route' } }) },
  { label: '2 · Scanner — attente terminal (PROMOTE T2 + DECRYPT)',
    color: 'var(--accent-amber)',
    build: (a, st) => buildState(a, st, 'scanner-reboot', { tier: 1, geo: true, routeStep: 3, solveCurrent: true, stagePhase: { 'scanner-reboot': 'route' } }) },

  { label: '3 · Field-ops — briefing intro',
    color: 'var(--accent-cyan)',
    build: (a, st) => buildState(a, st, 'field-ops', { tier: 2, geo: true, decrypt: true }) },
  { label: '3 · Field-ops — scan QR (après briefing intro, viser T3)',
    color: 'var(--accent-green)',
    build: (a, st) => buildState(a, st, 'field-ops', { tier: 2, geo: true, decrypt: true, stagePhase: { 'field-ops': 'scanner' } }) },
  { label: '3 · Field-ops — briefing AR (T3, AR activé)',
    color: 'var(--accent-cyan)',
    build: (a, st) => buildState(a, st, 'field-ops', { tier: 3, geo: true, decrypt: true, ar: true, arBriefingDone: false, stagePhase: { 'field-ops': 'scanner' } }) },
  { label: '3 · Field-ops — scan AR (après briefing AR, viser T4)',
    color: 'var(--accent-green)',
    build: (a, st) => buildState(a, st, 'field-ops', { tier: 3, geo: true, decrypt: true, ar: true, arBriefingDone: true, stagePhase: { 'field-ops': 'scanner' } }) },

  { label: '4 · PURGE — briefing 5 (révélation)',
    color: '#ff40ff',
    build: (a, st) => buildState(a, st, 'sefy-rogue', { tier: 4, geo: true, decrypt: true, ar: true, arBriefingDone: true, fieldFinds: true }) },
  { label: '4 · PURGE — chasse aux cartes couleur (timer 20 min)',
    color: '#ff40ff',
    build: (a, st) => buildState(a, st, 'sefy-rogue', { tier: 4, geo: true, decrypt: true, ar: true, arBriefingDone: true, fieldFinds: true, purge: true }) },

  { label: '5 · Désactivation finale (code en boucle, timer 20 min)',
    color: 'var(--accent-red)',
    build: (a, st) => buildState(a, st, 'deactivate-sefy', { tier: 4, geo: true, decrypt: true, ar: true, arBriefingDone: true, fieldFinds: true, purge: true, allOverrides: true }) },
];

function renderCheckpoints() {
  const grid = document.getElementById('stage-jump-grid');
  if (!grid) return;

  const stages = getAllStages();
  if (!stages.length) {
    grid.textContent = 'No stages loaded.';
    return;
  }

  grid.innerHTML = `
    <div class="admin-agent-pick" style="display:flex;gap:8px;margin-bottom:8px;">
      <label style="font-family:var(--font-mono);font-size:var(--font-size-sm);color:var(--text-secondary);display:flex;align-items:center;gap:4px;">
        <input type="radio" name="jump-agent" value="emy" checked> ÉMY
      </label>
      <label style="font-family:var(--font-mono);font-size:var(--font-size-sm);color:var(--text-secondary);display:flex;align-items:center;gap:4px;">
        <input type="radio" name="jump-agent" value="lea"> LÉA
      </label>
    </div>
    <p style="font-family:var(--font-mono);font-size:var(--font-size-xs);color:var(--text-dim);margin:0 0 8px;">
      ⚠ À utiliser sur l'appareil du joueur. Chaque bouton réinitialise complètement
      l'agent choisi à ce point de sauvegarde, puis lance le jeu.
    </p>
  `;

  for (const cp of CHECKPOINTS) {
    const btn = document.createElement('button');
    btn.className = 'stage-jump-btn';
    if (cp.color) {
      btn.style.borderLeftColor = cp.color;
      btn.style.borderLeftWidth = '3px';
    }
    btn.textContent = cp.label;
    btn.addEventListener('click', () => resetToCheckpoint(cp));
    grid.appendChild(btn);
  }
}

function getSelectedAgent() {
  const radio = document.querySelector('input[name="jump-agent"]:checked');
  return radio ? radio.value : 'emy';
}

async function resetToCheckpoint(cp) {
  const agent = getSelectedAgent();
  if (!confirm(`Réinitialiser ${agent.toUpperCase()} →\n"${cp.label}" ?\n\nL'état actuel de cet agent sera écrasé.`)) return;

  // Full reset → fresh intro (terminal login + briefing).
  if (cp.wipe) {
    try { await fbResetAgent(agent); } catch { /* best effort */ }
    resetState(); // clear this device's local state
    window.location.href = 'index.html';
    return;
  }

  const newState = cp.build(agent, getAllStages());
  setLocalState(newState);                          // drive resume on this device
  try { await fbForceState(agent, newState); }      // overwrite remote (no merge)
  catch { /* offline — local still set */ }
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
