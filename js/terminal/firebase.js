/**
 * Terminal Firebase helpers — init, fetch/push agent state.
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

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const fbDb = firebase.database();

export async function fetchAgentState(id) {
  try {
    const snap = await fbDb.ref(`agents/${id}`).once('value');
    return snap.val() || null;
  } catch { return null; }
}

export function pushAgentState(id, state) {
  fbDb.ref(`agents/${id}`).set(state).catch(() => {});
}
