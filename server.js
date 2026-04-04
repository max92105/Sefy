/**
 * SEFY Game Server — WebSocket relay + static file serving.
 *
 * Manages team state (access tier, progression) and relays
 * messages between terminals and phone apps on the same team.
 *
 * Usage: node server.js
 *   Env: PORT (default 3000)
 */

const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'data', 'server-state.json');

/* ══════════ Team State ══════════ */

const teams = {
  'team-1': { accessTier: 1, solvedPuzzles: [], currentStage: null },
  'team-2': { accessTier: 1, solvedPuzzles: [], currentStage: null },
};

const clients = {
  'team-1': { terminals: new Set(), apps: new Set() },
  'team-2': { terminals: new Set(), apps: new Set() },
};

/* ── Persistence ── */

function loadServerState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const data = JSON.parse(raw);
    for (const [id, saved] of Object.entries(data)) {
      if (teams[id]) Object.assign(teams[id], saved);
    }
    console.log('État chargé depuis le disque.');
  } catch { /* pas de sauvegarde */ }
}

function saveServerState() {
  const data = {};
  for (const [id, team] of Object.entries(teams)) {
    data[id] = {
      accessTier: team.accessTier,
      solvedPuzzles: team.solvedPuzzles,
      currentStage: team.currentStage,
    };
  }
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Échec sauvegarde:', e.message);
  }
}

function resetTeams() {
  for (const team of Object.values(teams)) {
    team.accessTier = 1;
    team.solvedPuzzles = [];
    team.currentStage = null;
  }
  saveServerState();
}

/* ══════════ HTTP Server ══════════ */

const app = express();
app.use(express.static(__dirname));

// Admin API: état des équipes
app.get('/api/teams', (_req, res) => {
  const data = {};
  for (const [id, team] of Object.entries(teams)) {
    data[id] = {
      ...team,
      connectedTerminals: clients[id].terminals.size,
      connectedApps: clients[id].apps.size,
    };
  }
  res.json(data);
});

// Admin API: reset complet
app.post('/api/reset', (_req, res) => {
  resetTeams();
  broadcast(null, { type: 'reset' });
  console.log('RESET — toutes les équipes réinitialisées.');
  res.json({ ok: true });
});

const server = createServer(app);

/* ══════════ WebSocket Server ══════════ */

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws._teamId = null;
  ws._role = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, msg);
  });

  ws.on('close', () => removeClient(ws));
});

function removeClient(ws) {
  if (ws._teamId && clients[ws._teamId]) {
    clients[ws._teamId].terminals.delete(ws);
    clients[ws._teamId].apps.delete(ws);
    logTeam(ws._teamId);
  }
}

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'register':         return onRegister(ws, msg);
    case 'tier-upgrade':     return onTierUpgrade(ws, msg);
    case 'push-to-apps':     return onPushToApps(ws, msg);
    case 'push-to-terminals':return onPushToTerminals(ws, msg);
    case 'puzzle-solved':    return onPuzzleSolved(ws, msg);
    case 'stage-update':     return onStageUpdate(ws, msg);
    case 'team-state':       return sendTeamState(ws);
  }
}

/* ── Handlers ── */

function onRegister(ws, msg) {
  const { teamId, role } = msg;
  if (!teams[teamId]) {
    ws.send(JSON.stringify({ type: 'error', message: 'Équipe invalide' }));
    return;
  }

  removeClient(ws);
  ws._teamId = teamId;
  ws._role = role;

  if (role === 'terminal') clients[teamId].terminals.add(ws);
  else clients[teamId].apps.add(ws);

  logTeam(teamId);

  ws.send(JSON.stringify({
    type: 'registered',
    teamId,
    teamState: { ...teams[teamId] },
  }));
}

function onTierUpgrade(ws, msg) {
  const teamId = ws._teamId;
  if (!teamId || !teams[teamId]) return;

  const newTier = msg.tier ?? teams[teamId].accessTier + 1;
  teams[teamId].accessTier = newTier;
  saveServerState();

  console.log(`[${teamId}] Tier → ${newTier}`);
  broadcastToTeam(teamId, { type: 'tier-updated', tier: newTier });
}

function onPushToApps(ws, msg) {
  const teamId = ws._teamId;
  if (!teamId || !clients[teamId]) return;

  console.log(`[${teamId}] Terminal → Apps: ${msg.command}`);
  const payload = JSON.stringify({
    type: 'terminal-command',
    command: msg.command,
    data: msg.data || {},
  });

  for (const c of clients[teamId].apps) {
    if (c.readyState === 1) c.send(payload);
  }
}

function onPushToTerminals(ws, msg) {
  const teamId = ws._teamId;
  if (!teamId || !clients[teamId]) return;

  console.log(`[${teamId}] App → Terminals: ${msg.command}`);
  const payload = JSON.stringify({
    type: 'app-command',
    command: msg.command,
    data: msg.data || {},
  });

  for (const c of clients[teamId].terminals) {
    if (c.readyState === 1) c.send(payload);
  }
}

function onPuzzleSolved(ws, msg) {
  const teamId = ws._teamId;
  if (!teamId || !teams[teamId]) return;

  const { puzzleId } = msg;
  if (puzzleId && !teams[teamId].solvedPuzzles.includes(puzzleId)) {
    teams[teamId].solvedPuzzles.push(puzzleId);
    saveServerState();
    console.log(`[${teamId}] Puzzle résolu: ${puzzleId}`);
  }
}

function onStageUpdate(ws, msg) {
  const teamId = ws._teamId;
  if (!teamId || !teams[teamId]) return;

  teams[teamId].currentStage = msg.stageId;
  saveServerState();
  console.log(`[${teamId}] Stage → ${msg.stageId}`);
}

function sendTeamState(ws) {
  if (!ws._teamId || !teams[ws._teamId]) return;
  ws.send(JSON.stringify({
    type: 'team-state',
    teamState: { ...teams[ws._teamId] },
  }));
}

/* ══════════ Helpers ══════════ */

function broadcastToTeam(teamId, msg) {
  const json = JSON.stringify(msg);
  const all = [...(clients[teamId]?.terminals || []), ...(clients[teamId]?.apps || [])];
  for (const c of all) {
    if (c.readyState === 1) c.send(json);
  }
}

function broadcast(_exclude, msg) {
  const json = JSON.stringify(msg);
  for (const ws of wss.clients) {
    if (ws.readyState === 1) ws.send(json);
  }
}

function logTeam(teamId) {
  const c = clients[teamId];
  console.log(`[${teamId}] Terminaux: ${c.terminals.size} | Apps: ${c.apps.size}`);
}

/* ══════════ Start ══════════ */

loadServerState();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║       SEFY SERVER — PORT ${String(PORT).padEnd(5)}       ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);

  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  App:      http://${net.address}:${PORT}`);
        console.log(`  Terminal: http://${net.address}:${PORT}/terminal.html`);
      }
    }
  }
  console.log('');
});
