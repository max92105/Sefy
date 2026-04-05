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
    currentStage: null,
    solvedPuzzles: [],
    hintsUsed: {},
    inventory: [],
    keycards: [],
    unlockedStations: [],
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
 * Write an agent's full state to Firebase.
 * @param {string} agent
 * @param {object} state
 */
async function fbSaveState(agent, state) {
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

// Export for ES module usage
export {
  db,
  createDefaultState,
  getDeviceId,
  fbLoadState,
  fbSaveState,
  fbResetAgent,
  fbOnStateChange,
};
