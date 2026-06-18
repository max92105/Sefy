/**
 * Terminal event logging.
 *
 * Appends a line to the agent's live system log and pushes it to Firebase.
 * Fetches the freshest state first so entries added on the phone aren't
 * clobbered by a stale terminal copy. An optional dedupKey logs an event only
 * once (shared with the app via state.loggedScans).
 */

import { getAgentId, setAgentState } from './state.js';
import { fetchAgentState, updateAgentFields } from './firebase.js';

function stamp() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}`;
}

/**
 * @param {string} text      — log line (without timestamp)
 * @param {string} [dedupKey] — if provided, the event is logged at most once
 */
export async function logEvent(text, dedupKey = null) {
  const id = getAgentId();
  if (!id) return;
  const state = (await fetchAgentState(id)) || {};
  if (dedupKey) {
    if (!Array.isArray(state.loggedScans)) state.loggedScans = [];
    if (state.loggedScans.includes(dedupKey)) return;
    state.loggedScans.push(dedupKey);
  }
  if (!Array.isArray(state.systemLog)) state.systemLog = [];
  state.systemLog.push(`[${stamp()}] ${text}`);
  setAgentState(state);
  updateAgentFields(id, { systemLog: state.systemLog, loggedScans: state.loggedScans || [] });
}
