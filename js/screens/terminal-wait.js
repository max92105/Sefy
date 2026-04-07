/**
 * Screen: Terminal Wait — waits for a terminal action before advancing.
 *
 * Shows instructions and listens in real-time via Firebase for
 * a specific field to become true on the agent's state.
 */

import { fbOnStateChange } from '../state.js';

let unsubscribe = null;

/* ═══════════════  Wait configs  ═══════════════ */

const WAIT_CONFIGS = {
  geo: {
    instructions: `
      <p>Cherchez le code d'activation de la géolocalisation dans cette zone.</p>
      <p>Connectez-vous à un terminal de l'installation et utilisez la commande <strong>GEO</strong>.</p>
      <p>Le terminal vous demandera le code de confirmation.</p>
    `,
    statusText: 'En attente de l\'activation GEO via le terminal…',
    field: 'geoActivated',
    successText: '✓ Module de géolocalisation activé !',
  },
  decrypt: {
    instructions: `
      <p>Zone localisée avec succès.</p>
      <p>Trouvez le code d'accès caché dans cette zone.</p>
      <p>Connectez-vous à un terminal de l'installation et entrez le code pour augmenter votre niveau d'accès.</p>
      <p>Utilisez ensuite la commande <strong>DECRYPT</strong> dans le terminal pour activer mon module de décryptage.</p>
    `,
    statusText: 'En attente de l\'activation via le terminal…',
    field: 'decryptActivated',
    successText: '✓ Module de décryptage activé !',
  },
};

/* ═══════════════  DOM  ═══════════════ */

export function createTerminalWaitScreen() {
  const section = document.createElement('section');
  section.id = 'screen-terminal-wait';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="screen-header">
        <span class="header-tag">SEFY</span>
        <span class="header-title">EN ATTENTE DU TERMINAL</span>
      </div>

      <div class="tw-instructions" id="tw-instructions"></div>

      <div class="tw-status" id="tw-status">
        <div class="tw-spinner"></div>
        <span></span>
      </div>
    </div>
  `;
  return section;
}

/* ═══════════════  Public  ═══════════════ */

/**
 * Listen in real-time for a field on the agent's Firebase state.
 * @param {string}   agent   — 'emy' or 'lea'
 * @param {string}   waitType — 'geo' or 'decrypt'
 * @param {Function} onReady — called when the field becomes true
 * @returns cleanup function
 */
export function startTerminalWait(agent, waitType, onReady) {
  cleanup();
  if (!agent) return () => {};

  const config = WAIT_CONFIGS[waitType] || WAIT_CONFIGS.decrypt;

  // Populate UI with the right instructions
  const instrEl = document.getElementById('tw-instructions');
  if (instrEl) instrEl.innerHTML = config.instructions;
  const statusEl = document.getElementById('tw-status');
  if (statusEl) {
    statusEl.innerHTML = `<div class="tw-spinner"></div><span>${config.statusText}</span>`;
  }

  let fired = false;

  unsubscribe = fbOnStateChange(agent, (state) => {
    if (fired) return;
    if (state && state[config.field]) {
      fired = true;
      cleanup();
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--accent-green)">${config.successText}</span>`;
      setTimeout(() => onReady(), 1500);
    }
  });

  return cleanup;
}

function cleanup() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}
