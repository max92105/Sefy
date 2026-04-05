/**
 * Screen: Terminal Wait — waits for a terminal action before advancing.
 *
 * Shows instructions and listens in real-time via Firebase for
 * decryptActivated === true on the agent's state.
 */

import { fbOnStateChange } from '../state.js';

let unsubscribe = null;

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

      <div class="tw-instructions" id="tw-instructions">
        <p>Zone localisée avec succès.</p>
        <p>Trouvez le code d'accès caché dans cette zone.</p>
        <p>Connectez-vous à un terminal de l'installation et entrez le code pour augmenter votre niveau d'accès.</p>
        <p>Utilisez ensuite la commande <strong>DECRYPT</strong> dans le terminal pour activer mon module de décryptage.</p>
      </div>

      <div class="tw-status" id="tw-status">
        <div class="tw-spinner"></div>
        <span>En attente de l'activation via le terminal…</span>
      </div>
    </div>
  `;
  return section;
}

/* ═══════════════  Public  ═══════════════ */

/**
 * Listen in real-time for decryptActivated on the agent's Firebase state.
 * @param {string}   agent   — 'emy' or 'lea'
 * @param {Function} onReady — called when decryptActivated is true
 * @returns cleanup function
 */
export function startTerminalWait(agent, onReady) {
  cleanup();
  if (!agent) return () => {};

  let fired = false;

  unsubscribe = fbOnStateChange(agent, (state) => {
    if (fired) return;
    if (state && state.decryptActivated) {
      fired = true;
      cleanup();
      const statusEl = document.getElementById('tw-status');
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--accent-green)">✓ Module de décryptage activé !</span>';
      setTimeout(() => onReady(), 1500);
    }
  });

  return cleanup;
}

function cleanup() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}
