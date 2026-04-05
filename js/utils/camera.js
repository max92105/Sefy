/**
 * Camera utilities — permission handling for getUserMedia.
 */

import { delay } from '../ui.js';
import { typewriter } from '../typewriter.js';

/**
 * Request camera permission with retry loop.
 * Shows status via typewriter on the given DOM element.
 * Loops until granted or abort.aborted becomes true.
 * @param {HTMLElement} lineEl  — element to type status into
 * @param {object}      abort   — { aborted: boolean }
 * @returns {Promise<boolean>}  — true if permission granted
 */
export async function requestCameraWithRetry(lineEl, abort) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    await type(lineEl, 'Erreur : caméra non disponible sur cet appareil.');
    return false;
  }

  let firstAttempt = true;

  while (!abort.aborted) {
    const permState = await getCameraPermissionState();

    if (permState === 'granted') {
      await type(lineEl, 'Accès caméra autorisé. Scanner optique activé.');
      return true;
    }

    if (permState === 'denied') {
      await type(lineEl, '⚠ Caméra bloquée. Appuyez sur l\'icône 🔒 dans la barre d\'adresse, puis autorisez la caméra.');
      while (!abort.aborted) {
        await delay(2000);
        if ((await getCameraPermissionState()) !== 'denied') break;
      }
      if (abort.aborted) return false;
      continue;
    }

    if (firstAttempt) {
      await type(lineEl, 'Autorisation de la caméra requise…');
      firstAttempt = false;
    } else {
      await type(lineEl, 'Accès refusé. Veuillez autoriser la caméra pour continuer.');
    }

    const result = await requestCameraPermission();
    if (abort.aborted) return false;

    if (result === 'granted') {
      await type(lineEl, 'Accès caméra autorisé. Scanner optique activé.');
      return true;
    }

    await delay(2000);
  }
  return false;
}

/* ── Internals ── */

async function getCameraPermissionState() {
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'camera' });
      return status.state;
    }
  } catch { /* Permissions API not available */ }
  return 'prompt';
}

function requestCameraPermission() {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      stream.getTracks().forEach(t => t.stop());
      return 'granted';
    })
    .catch(() => 'denied');
}

async function type(el, text) {
  if (!el) return;
  await typewriter(el, text, 25);
}
