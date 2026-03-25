/**
 * Puzzle Engine — validates answers and manages puzzle interaction
 * Stub for now — will be expanded with real puzzle types.
 */

import { validateAnswer } from './stages.js';
import { solvePuzzle, useHint } from './state.js';
import { showFeedback, hideFeedback, glitch } from './ui.js';

/**
 * Setup a code-entry puzzle in the DOM.
 * Takes a stage definition, wires up input + submit.
 * Returns cleanup function.
 */
export function setupCodeEntry(stage, state, onSolved) {
  const input = document.getElementById('puzzle-input');
  const submitBtn = document.getElementById('btn-submit-answer');
  const prompt = document.getElementById('puzzle-prompt');
  const feedbackId = 'puzzle-feedback';

  if (!stage.puzzle) return () => {};

  // Set prompt text
  if (prompt) prompt.textContent = stage.puzzle.prompt || 'Entrez le code :';

  // Set input constraints
  if (input) {
    input.value = '';
    input.maxLength = stage.puzzle.maxLength || 20;
    input.focus();
  }

  hideFeedback(feedbackId);

  async function handleSubmit() {
    const answer = input?.value?.trim();
    if (!answer) {
      showFeedback(feedbackId, 'SAISIE REQUISE', 'error');
      return;
    }

    const correct = await validateAnswer(answer, stage.puzzle.answerHash);
    if (correct) {
      showFeedback(feedbackId, 'ACCÈS AUTORISÉ', 'success');
      solvePuzzle(state, stage.id);
      if (submitBtn) submitBtn.disabled = true;
      if (input) input.disabled = true;
      // Short delay before advancing
      setTimeout(() => onSolved(stage), 800);
    } else {
      showFeedback(feedbackId, 'ACCÈS REFUSÉ — CODE INCORRECT', 'error');
      if (input) {
        glitch(input);
        input.value = '';
        input.focus();
      }
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  submitBtn?.addEventListener('click', handleSubmit);
  input?.addEventListener('keydown', handleKeydown);

  // Return cleanup
  return () => {
    submitBtn?.removeEventListener('click', handleSubmit);
    input?.removeEventListener('keydown', handleKeydown);
  };
}

/**
 * Get the current hint tier available for a puzzle
 */
export function getAvailableHintTier(stage, state) {
  const used = state.hintsUsed[stage.id] || 0;
  const maxHints = stage.hints?.length || 0;
  if (used >= maxHints) return null; // all hints used
  return used; // index of next hint to reveal
}

/**
 * Reveal the next hint for a stage
 */
export function revealHint(stage, state) {
  const tier = getAvailableHintTier(stage, state);
  if (tier === null) return null;
  useHint(state, stage.id);
  return stage.hints[tier];
}
