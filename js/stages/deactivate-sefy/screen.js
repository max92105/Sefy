/**
 * Screen: Deactivate SEFY — code-entry to shut down the rogue AI.
 *
 * Uses the code-entry-form component. No intro cinematic.
 * Player can switch back to evidence-collection and return here.
 */

import { createCodeEntryFormDOM, setupCodeEntryForm } from '../../components/code-entry-form.js';

const PREFIX = 'deactivate-sefy';

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';

  const form = createCodeEntryFormDOM(PREFIX, {
    backButton: true,
    backLabel: '◀ RETOUR AU SCANNER',
  });

  // Show the form immediately (no intro phase)
  form.classList.remove('hidden');

  section.appendChild(form);
  return section;
}

/* ═══════════════  Start  ═══════════════ */

/**
 * @param {object}   stage           — stage config
 * @param {object}   state           — app state
 * @param {Function} onSolved        — callback when puzzle is solved
 * @param {Function} onBackToScanner — callback to go back to evidence-collection
 * @returns {Function} cleanup
 */
export function start(stage, state, onSolved, onBackToScanner) {
  const cleanup = setupCodeEntryForm(stage, state, onSolved, PREFIX);

  const backBtn = document.getElementById(`btn-${PREFIX}-back`);
  const handleBack = () => { if (onBackToScanner) onBackToScanner(); };
  backBtn?.addEventListener('click', handleBack);

  return () => {
    cleanup();
    backBtn?.removeEventListener('click', handleBack);
  };
}
