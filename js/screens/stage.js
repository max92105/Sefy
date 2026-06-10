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

/** Open hint modal for the current stage */
export function openHintModal(currentStage, state) {
  if (!currentStage) return;
  const total = getStageHints(currentStage.id).length;
  const tier = getAvailableHintTier(currentStage, state);
  const hintText = document.getElementById('hint-text');
  const hintWarning = document.getElementById('hint-warning');
  const revealBtn = document.getElementById('btn-reveal-hint');

  if (tier === null) {
    if (hintText) hintText.textContent = total > 0
      ? 'Tous les indices ont été révélés pour cette énigme.'
      : 'Aucun indice disponible pour cette énigme.';
    if (hintWarning) hintWarning.textContent = '';
    if (revealBtn) revealBtn.style.display = 'none';
  } else {
    const remaining = total - tier;
    if (hintText) hintText.textContent = `${remaining} indice(s) disponible(s). Demander des indices affecte votre évaluation finale.`;
    if (hintWarning) hintWarning.textContent = `Niveau d'indice : ${tier + 1} sur ${total}`;
    if (revealBtn) {
      revealBtn.style.display = '';
      revealBtn.onclick = () => {
        const hint = revealHint(currentStage, state);
        if (hint && hintText) hintText.textContent = hint.text;
        refreshHintBadge(currentStage, state);
        // Hide the reveal button once no more hints remain.
        if (getAvailableHintTier(currentStage, state) === null && revealBtn) {
          revealBtn.style.display = 'none';
          if (hintWarning) hintWarning.textContent = '';
        }
      };
    }
  }

  openModal('modal-hint');
}
