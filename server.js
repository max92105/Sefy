/**
 * Lightweight Express server — serves static files and exposes
 * a JSON-file-backed state API for each agent (emy, lea).
 *
 * State files: data/state-emy.json, data/state-lea.json
 *
 * API:
 *   GET    /api/state/:agent   → read agent state (returns default if missing)
 *   PUT    /api/state/:agent   → overwrite agent state (body = JSON)
 *   DELETE /api/state/:agent   → reset agent state to defaults
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

const VALID_AGENTS = ['emy', 'lea'];

function defaultState() {
  return {
    missionStarted: false,
    playerAgent: null,
    accessTier: 1,
    decryptActivated: false,
    arActivated: false,
    currentStage: null,
    solvedPuzzles: [],
    hintsUsed: {},
    inventory: [],
    keycards: [],
    arFound: [],
    stagePhase: {},
    timestamps: {},
    finalModeUnlocked: false,
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}

function statePath(agent) {
  return path.join(DATA_DIR, `state-${agent}.json`);
}

function readAgentState(agent) {
  const fp = statePath(agent);
  try {
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, 'utf-8');
      return { ...defaultState(), ...JSON.parse(raw) };
    }
  } catch { /* corrupted — return default */ }
  return defaultState();
}

function writeAgentState(agent, state) {
  fs.writeFileSync(statePath(agent), JSON.stringify(state, null, 2), 'utf-8');
}

// ── Middleware ──
app.use(express.json());

// ── API routes ──

app.get('/api/state/:agent', (req, res) => {
  const agent = req.params.agent.toLowerCase();
  if (!VALID_AGENTS.includes(agent)) return res.status(400).json({ error: 'Invalid agent. Use emy or lea.' });
  res.json(readAgentState(agent));
});

app.put('/api/state/:agent', (req, res) => {
  const agent = req.params.agent.toLowerCase();
  if (!VALID_AGENTS.includes(agent)) return res.status(400).json({ error: 'Invalid agent. Use emy or lea.' });
  const state = { ...defaultState(), ...req.body };
  writeAgentState(agent, state);
  res.json(state);
});

app.delete('/api/state/:agent', (req, res) => {
  const agent = req.params.agent.toLowerCase();
  if (!VALID_AGENTS.includes(agent)) return res.status(400).json({ error: 'Invalid agent. Use emy or lea.' });
  const fp = statePath(agent);
  try { fs.unlinkSync(fp); } catch { /* already gone */ }
  res.json(defaultState());
});

// ── Static files (after API so routes take priority) ──
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`SEFY server running → http://localhost:${PORT}`);
});
