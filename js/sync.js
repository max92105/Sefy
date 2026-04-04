/**
 * Sync Module — WebSocket client for team synchronization.
 *
 * Connects to the SEFY server and enables real-time communication
 * between terminals and phone apps of the same team.
 *
 * Usage (app):
 *   import { connect, on, send } from './sync.js';
 *   connect('team-1', 'app');
 *   on('terminal-command', msg => { ... });
 *
 * Usage (terminal):
 *   import { connect, on, send } from './sync.js';
 *   connect('team-1', 'terminal');
 *   send('push-to-apps', { command: 'advance-stage' });
 */

let ws = null;
let _teamId = null;
let _role = null;
let _connected = false;
let _reconnectTimer = null;
const _listeners = new Map();

const RECONNECT_DELAY = 2000;

/**
 * Connect to the sync server.
 * @param {string} teamId — 'team-1' or 'team-2'
 * @param {string} role   — 'app' or 'terminal'
 */
export function connect(teamId, role) {
  _teamId = teamId;
  _role = role;
  _openSocket();
}

/** Disconnect and stop auto-reconnect. */
export function disconnect() {
  _teamId = null;
  _role = null;
  _connected = false;
  clearTimeout(_reconnectTimer);
  if (ws) { ws.close(); ws = null; }
}

/**
 * Send a typed message to the server.
 * @param {string} type — message type
 * @param {object} data — additional payload (merged into message)
 */
export function send(type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

/**
 * Register a listener for a message type.
 * @param {string}   type     — e.g. 'terminal-command', 'tier-updated', 'registered'
 * @param {Function} callback — receives the full parsed message object
 */
export function on(type, callback) {
  if (!_listeners.has(type)) _listeners.set(type, []);
  _listeners.get(type).push(callback);
}

/**
 * Remove a listener.
 */
export function off(type, callback) {
  const cbs = _listeners.get(type);
  if (cbs) {
    const idx = cbs.indexOf(callback);
    if (idx >= 0) cbs.splice(idx, 1);
  }
}

/** @returns {boolean} Whether the WebSocket is currently connected */
export function isConnected() { return _connected; }

/** @returns {string|null} Current team ID */
export function getTeamId() { return _teamId; }

/* ═══════════════  Internal  ═══════════════ */

function _openSocket() {
  if (!_teamId || !_role) return;

  clearTimeout(_reconnectTimer);

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => {
    _connected = true;
    ws.send(JSON.stringify({ type: 'register', teamId: _teamId, role: _role }));
    _emit('_connected', {});
  };

  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    _emit(msg.type, msg);
  };

  ws.onclose = () => {
    _connected = false;
    _emit('_disconnected', {});
    if (_teamId) {
      _reconnectTimer = setTimeout(() => _openSocket(), RECONNECT_DELAY);
    }
  };

  ws.onerror = () => { /* onclose fires after this */ };
}

function _emit(type, msg) {
  const cbs = _listeners.get(type) || [];
  for (const cb of cbs) {
    try { cb(msg); } catch (err) { console.error('[sync]', err); }
  }
}
