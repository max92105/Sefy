/**
 * Firebase configuration — shared by app, terminal, and admin.
 * Uses Firebase Realtime Database for cross-device state sync.
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBl7-2Ck4vxIQm1vI6AAFkbnnN6hCr1LHc",
  authDomain: "sefy-c1d5f.firebaseapp.com",
  databaseURL: "https://sefy-c1d5f-default-rtdb.firebaseio.com",
  projectId: "sefy-c1d5f",
  storageBucket: "sefy-c1d5f.firebasestorage.app",
  messagingSenderId: "332667273145",
  appId: "1:332667273145:web:0f0db32eaa2584ef964068",
};

// Initialize Firebase (compat SDK loaded via <script> in HTML)
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const db = firebase.database();

const DEVICE_ID_KEY = 'sefy-device-id';

/** Get or create a persistent device identifier */
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Get a reference to an agent's state node */
function agentRef(agent) {
  return db.ref(`agents/${agent}`);
}

/** Default state for a fresh mission */
function createDefaultState() {
  return {
    missionStarted: false,
    playerAgent: null,
    deviceId: null,
    accessTier: 1,
    decryptActivated: false,
    arActivated: false,
    currentStage: null,
    solvedPuzzles: [],
    hintsUsed: {},
    inventory: [],
    keycards: [],
    arFound: [],
    systemLog: [],
    stagePhase: {},
    timestamps: {},
    finalModeUnlocked: false,
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}

/**
 * Read an agent's state from Firebase.
 * @param {string} agent — 'emy' or 'lea'
 * @returns {Promise<object>}
 */
async function fbLoadState(agent) {
  const snap = await agentRef(agent).once('value');
  const data = snap.val();
  return data ? { ...createDefaultState(), ...data } : createDefaultState();
}

/**
 * Write an agent's state to Firebase.
 * Fetches remote first and merges terminal-managed fields so the app
 * never downgrades values set by the terminal (accessTier, decrypt, AR, logs).
 * @param {string} agent
 * @param {object} state
 */
async function fbSaveState(agent, state) {
  const snap = await agentRef(agent).once('value');
  const remote = snap.val();

  if (remote) {
    // Keep the higher accessTier (terminal can only raise it)
    if ((remote.accessTier || 1) > (state.accessTier || 1)) {
      state.accessTier = remote.accessTier;
    }
    // Never revert terminal-activated flags
    if (remote.decryptActivated) state.decryptActivated = true;
    if (remote.arActivated) state.arActivated = true;
    // Keep the longer systemLog (both sides only append)
    if (remote.systemLog && (!state.systemLog || remote.systemLog.length > state.systemLog.length)) {
      state.systemLog = remote.systemLog;
    }
  }

  await agentRef(agent).set(state);
}

/**
 * Reset an agent's state in Firebase.
 * @param {string} agent
 */
async function fbResetAgent(agent) {
  await agentRef(agent).remove();
}

/**
 * Listen for real-time changes on an agent's state.
 * @param {string} agent
 * @param {Function} callback — receives the state object on each change
 * @returns {Function} unsubscribe function
 */
function fbOnStateChange(agent, callback) {
  const ref = agentRef(agent);
  const handler = (snap) => {
    const data = snap.val();
    callback(data ? { ...createDefaultState(), ...data } : null);
  };
  ref.on('value', handler);
  return () => ref.off('value', handler);
}

/**
 * Atomically claim an agent for this device.
 * Uses a Firebase transaction on the deviceId field so only one phone can win.
 * @param {string} agent — 'emy' or 'lea'
 * @returns {Promise<boolean>} true if this device now owns the agent
 */
async function fbClaimAgent(agent) {
  const myId = getDeviceId();
  const ref = agentRef(agent).child('deviceId');
  const result = await ref.transaction((current) => {
    if (!current) return myId;       // unclaimed → claim it
    if (current === myId) return;    // already ours → abort (no change needed)
    return;                          // someone else owns it → abort
  });
  // committed means we wrote our id, or it was already ours
  if (result.committed) return true;
  // Not committed — check if it's already ours (transaction aborts when we return undefined for "already ours")
  const snap = await ref.once('value');
  return snap.val() === myId;
}

// Export for ES module usage
export {
  db,
  createDefaultState,
  getDeviceId,
  fbLoadState,
  fbSaveState,
  fbResetAgent,
  fbOnStateChange,
  fbClaimAgent,
};
