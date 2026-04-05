/**
 * Geolocation utilities — permission handling and one-shot position requests.
 */

import { delay } from '../ui.js';
import { typewriter } from '../typewriter.js';

/** Geolocation options for maximum precision */
export const GEO_OPTS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};

/**
 * Request geolocation permission with retry loop.
 * Shows status via typewriter on the given DOM element.
 * Loops until granted or abort.aborted becomes true.
 * @param {HTMLElement} lineEl  — element to type status into
 * @param {object}      abort   — { aborted: boolean }
 * @returns {Promise<boolean>}  — true if permission granted
 */
export async function requestLocationWithRetry(lineEl, abort) {
  if (!navigator.geolocation) {
    await type(lineEl, 'Erreur : géolocalisation non disponible sur cet appareil.');
    return false;
  }

  let firstAttempt = true;

  while (!abort.aborted) {
    const permState = await getPermissionState();

    if (permState === 'granted') {
      const result = await requestLocationOnce();
      if (result === 'granted') {
        await type(lineEl, 'Accès autorisé. Module de géolocalisation activé.');
        return true;
      }
    }

    if (permState === 'denied') {
      await type(lineEl, '⚠ Localisation bloquée. Appuyez sur l\'icône 🔒 dans la barre d\'adresse, puis autorisez la localisation.');
      while (!abort.aborted) {
        await delay(2000);
        if ((await getPermissionState()) !== 'denied') break;
      }
      if (abort.aborted) return false;
      continue;
    }

    if (firstAttempt) {
      await type(lineEl, 'Autorisation de géolocalisation requise…');
      firstAttempt = false;
    } else {
      await type(lineEl, 'Accès refusé. Veuillez autoriser la géolocalisation pour continuer.');
    }

    const result = await requestLocationOnce();
    if (abort.aborted) return false;
    if (result === 'granted') {
      await type(lineEl, 'Accès autorisé. Module de géolocalisation activé.');
      return true;
    }

    await delay(2000);
  }
  return false;
}

/* ── Internals ── */

async function getPermissionState() {
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state;
    }
  } catch { /* not available */ }
  return 'prompt';
}

function requestLocationOnce() {
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      GEO_OPTS
    );
  });
}

async function type(el, text) {
  if (!el) return;
  await typewriter(el, text, 25);
}
