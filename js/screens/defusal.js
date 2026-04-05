/**
 * Screen: Deactivate SEFY — code-entry to shut down the rogue AI.
 * Player can switch back to evidence-collection and return here.
 */

import { setupCodeEntry } from '../puzzles.js';

/** Create the deactivation screen DOM */
export function createDefusalScreen() {
  const section = document.createElement('section');
  section.id = 'screen-defusal';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="screen-header">
        <span class="header-tag">ÉTAPE 8</span>
        <span class="header-title">DÉSACTIVATION DE SEFY</span>
      </div>

      <div class="narrative-box">
        SEFY doit être désactivée. Entrez le code de désactivation pour reprendre le contrôle total de l'installation.
      </div>

      <div class="puzzle-area">
        <p class="puzzle-prompt" id="defusal-prompt"></p>
        <div class="input-group">
          <input
            type="text"
            id="defusal-input"
            class="code-input"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="ENTRER LE CODE"
          >
          <button id="btn-defusal-submit" class="btn btn-primary">VALIDER</button>
        </div>
        <div id="defusal-feedback" class="feedback hidden"></div>
      </div>

      <button id="btn-defusal-back" class="btn btn-secondary" style="margin-top: var(--space-md);">
        ◀ RETOUR AU SCANNER
      </button>
    </div>
  `;
  return section;
}

/** Set up the deactivation code entry and back button */
export function startDefusal(stage, state, onSolved, onBackToScanner) {
  const cleanup = setupCodeEntry(stage, state, onSolved, {
    inputId: 'defusal-input',
    submitId: 'btn-defusal-submit',
    promptId: 'defusal-prompt',
    feedbackId: 'defusal-feedback',
  });

  const backBtn = document.getElementById('btn-defusal-back');
  const handleBack = () => { if (onBackToScanner) onBackToScanner(); };
  backBtn?.addEventListener('click', handleBack);

  return () => {
    cleanup();
    backBtn?.removeEventListener('click', handleBack);
  };
}
