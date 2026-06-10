/**
 * Screen: Stage — reusable puzzle stage template.
 */

import { setupCodeEntry, getAvailableHintTier, revealHint } from '../puzzles.js';
import { hideFeedback } from '../ui.js';
import { openModal } from '../components/modals.js';
import { setHintButton } from '../components/nav.js';
import { getStageHints } from '../stages/hints.js';

/** Create the stage screen DOM */
export function createStageScreen() {
  const section = document.createElement('section');
  section.id = 'screen-stage';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content">
      <div class="screen-header">
        <span class="header-tag" id="stage-tag">ÉTAPE</span>
        <span class="header-title" id="stage-title">—</span>
      </div>

      <div class="narrative-box" id="stage-narrative"></div>
      <div class="media-container" id="stage-media"></div>

      <div class="puzzle-area" id="puzzle-area">
        <p class="puzzle-prompt" id="puzzle-prompt"></p>
        <div class="input-group" id="puzzle-input-group">
          <input
            type="text"
            id="puzzle-input"
            class="code-input"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="ENTRER LE CODE"
          >
          <button id="btn-submit-answer" class="btn btn-primary">VALIDER</button>
        </div>
        <div id="puzzle-feedback" class="feedback hidden"></div>
      </div>
    </div>
  `;
  return section;
}

/**
 * Populate the stage screen with a stage's data.
 * @returns cleanup function for puzzle event listeners
 */
export function populateStage(stage, state, onPuzzleSolved) {
  const tagEl = document.getElementById('stage-tag');
  const titleEl = document.getElementById('stage-title');
  const narrativeEl = document.getElementById('stage-narrative');
  const puzzleArea = document.getElementById('puzzle-area');

  if (tagEl) tagEl.textContent = `ÉTAPE ${stage.order}`;
  if (titleEl) titleEl.textContent = stage.title;
  if (narrativeEl) narrativeEl.innerHTML = stage.narrative?.text || '';

  let cleanup = () => {};
  if (stage.puzzle) {
    puzzleArea?.classList.remove('hidden');
    cleanup = setupCodeEntry(stage, state, onPuzzleSolved);
  } else {
    puzzleArea?.classList.add('hidden');
  }

  hideFeedback('puzzle-feedback');
  return cleanup;
}

/** Refresh the nav hint badge for a stage. */
function refreshHintBadge(stage, state) {
  const total = getStageHints(stage.id).length;
  const used = (state.hintsUsed && state.hintsUsed[stage.id]) || 0;
  setHintButton(total - used, total);
}

/** Index of the revealed hint currently shown in the modal. */
let _hintView = 0;

/**
 * Open hint modal for the current stage.
 * Lets the player page back through hints they already revealed and reveal
 * the next one when available.
 */
export function openHintModal(currentStage, state) {
  if (!currentStage) return;

  const hints = getStageHints(currentStage.id);
  const total = hints.length;
  let used = (state.hintsUsed && state.hintsUsed[currentStage.id]) || 0;

  const counterEl = document.getElementById('hint-counter');
  const textEl    = document.getElementById('hint-text');
  const warnEl    = document.getElementById('hint-warning');
  const navEl     = document.getElementById('hint-nav');
  const prevBtn   = document.getElementById('btn-hint-prev');
  const nextBtn   = document.getElementById('btn-hint-next');
  const revealBtn = document.getElementById('btn-reveal-hint');

  // Open on the most recently revealed hint.
  _hintView = used > 0 ? used - 1 : 0;

  function render() {
    if (used === 0) {
      if (counterEl) counterEl.textContent = total > 0 ? `Indices : 0 / ${total}` : '';
      if (textEl) textEl.textContent = total > 0
        ? `${total} indice(s) disponible(s) pour cette énigme. Demander un indice affecte votre évaluation finale.`
        : 'Aucun indice disponible pour cette énigme.';
      if (warnEl) warnEl.textContent = '';
      if (navEl) navEl.classList.add('hidden');
    } else {
      const remainingTxt = used < total ? ` · ${total - used} restant(s)` : '';
      if (counterEl) counterEl.textContent = `Indice ${_hintView + 1} / ${used} révélé(s)${remainingTxt}`;
      if (textEl) textEl.textContent = hints[_hintView].text;
      if (warnEl) warnEl.textContent = '';
      // Only show prev/next when there is more than one revealed hint to page through.
      if (navEl) navEl.classList.toggle('hidden', used <= 1);
      if (prevBtn) prevBtn.disabled = _hintView <= 0;
      if (nextBtn) nextBtn.disabled = _hintView >= used - 1;
    }

    if (revealBtn) {
      if (used < total) {
        revealBtn.style.display = '';
        revealBtn.textContent = used === 0 ? 'RÉVÉLER UN INDICE' : 'INDICE SUIVANT';
      } else {
        revealBtn.style.display = 'none';
      }
    }
  }

  if (revealBtn) {
    revealBtn.onclick = () => {
      const hint = revealHint(currentStage, state);
      if (!hint) return;
      used = (state.hintsUsed && state.hintsUsed[currentStage.id]) || used + 1;
      _hintView = used - 1; // jump to the freshly revealed hint
      refreshHintBadge(currentStage, state);
      render();
    };
  }
  if (prevBtn) prevBtn.onclick = () => { if (_hintView > 0) { _hintView--; render(); } };
  if (nextBtn) nextBtn.onclick = () => { if (_hintView < used - 1) { _hintView++; render(); } };

  render();
  openModal('modal-hint');
}
