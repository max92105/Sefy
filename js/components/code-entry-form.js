/**
 * Component: Code Entry Form — reusable code input puzzle UI.
 *
 * Used by geo-activation, sefy-rogue, and deactivate-sefy stages.
 * Provides the header, narrative, input field, submit button, feedback, and hint.
 */

import { setupCodeEntry } from '../puzzles.js';
import { hideFeedback } from '../ui.js';

/**
 * Create the code entry form DOM block.
 * @param {string} prefix  — unique ID prefix
 * @param {object} [options] — { backButton: boolean, backLabel: string }
 * @returns {HTMLElement}
 */
export function createCodeEntryFormDOM(prefix, options = {}) {
  const el = document.createElement('div');
  el.className = 'code-entry-form hidden';
  el.id = `${prefix}-puzzle`;
  el.innerHTML = `
    <div class="screen-content centered">
      <div class="screen-header">
        <span class="header-tag" id="${prefix}-tag">ÉTAPE</span>
        <span class="header-title" id="${prefix}-title">—</span>
      </div>

      <div class="narrative-box" id="${prefix}-narrative"></div>

      <div class="puzzle-area" id="${prefix}-puzzle-area">
        <p class="puzzle-prompt" id="${prefix}-prompt"></p>
        <div class="input-group" id="${prefix}-input-group">
          <input
            type="text"
            id="${prefix}-input"
            class="code-input"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="ENTRER LE CODE"
          >
          <button id="btn-${prefix}-submit" class="btn btn-primary">VALIDER</button>
        </div>
        <div id="${prefix}-feedback" class="feedback hidden"></div>
      </div>

      <div class="stage-actions">
        <button id="btn-hint" class="btn btn-secondary">DEMANDER UN INDICE</button>
      </div>

      ${options.backButton ? `
        <button id="btn-${prefix}-back" class="btn btn-secondary" style="margin-top: var(--space-md);">
          ${options.backLabel || '◀ RETOUR'}
        </button>
      ` : ''}
    </div>
  `;
  return el;
}

/**
 * Wire up the code entry form for a stage.
 * @param {object}   stage    — stage config from stages.json
 * @param {object}   state    — app state
 * @param {Function} onSolved — callback when puzzle is solved
 * @param {string}   prefix   — matches createCodeEntryFormDOM prefix
 * @returns {Function} cleanup
 */
export function setupCodeEntryForm(stage, state, onSolved, prefix) {
  const tagEl       = document.getElementById(`${prefix}-tag`);
  const titleEl     = document.getElementById(`${prefix}-title`);
  const narrativeEl = document.getElementById(`${prefix}-narrative`);

  if (tagEl)       tagEl.textContent = `ÉTAPE ${stage.order}`;
  if (titleEl)     titleEl.textContent = stage.title;
  if (narrativeEl) narrativeEl.innerHTML = stage.narrative?.text || '';

  hideFeedback(`${prefix}-feedback`);

  return setupCodeEntry(stage, state, onSolved, {
    inputId:    `${prefix}-input`,
    submitId:   `btn-${prefix}-submit`,
    promptId:   `${prefix}-prompt`,
    feedbackId: `${prefix}-feedback`,
  });
}
