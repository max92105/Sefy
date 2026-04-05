/**
 * Puzzle Engine — validates answers and manages puzzle interaction
 */

import { validateAnswer } from './stages.js';
import { solvePuzzle, useHint } from './state.js';
import { showFeedback, hideFeedback, glitch } from './ui.js';

/* ── Active puzzle context (one at a time) ── */
let _ctx = null;

/**
 * Setup a code-entry puzzle in the DOM.
 * Takes a stage definition, wires up input + submit.
 * Returns cleanup function.
 */
export function setupCodeEntry(stage, state, onSolved, ids) {
  // Kill any previous puzzle context first
  _cleanup();

  const inputId    = ids?.inputId    || 'puzzle-input';
  const submitId   = ids?.submitId   || 'btn-submit-answer';
  const promptId   = ids?.promptId   || 'puzzle-prompt';
  const feedbackId = ids?.feedbackId || 'puzzle-feedback';

  const input     = document.getElementById(inputId);
  const submitBtn = document.getElementById(submitId);
  const prompt    = document.getElementById(promptId);

  if (!stage.puzzle) return () => {};

  // Set prompt text
  if (prompt) prompt.textContent = stage.puzzle.prompt || 'Entrez le code :';

  // Reset input state completely
  if (input) {
    input.value = '';
    input.disabled = false;
    input.removeAttribute('disabled');
    input.maxLength = stage.puzzle.maxLength || 20;
  }

  // Reset button state completely
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.removeAttribute('disabled');
  }

  hideFeedback(feedbackId);

  // Build a context object so the global handler can access it
  _ctx = {
    input,
    inputId,
    submitBtn,
    feedbackId,
    stage,
    state,
    onSolved,
    submitting: false,
    solved: false,
  };

  // Use named functions stored on the context so we can reliably remove them
  _ctx._onSubmitClick = () => _doSubmit();
  _ctx._onInputKey = (e) => { if (e.key === 'Enter') _doSubmit(); };
  _ctx._onInputFocus = () => {
    // When mobile keyboard opens, scroll the submit button into view
    setTimeout(() => submitBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
  };

  submitBtn?.addEventListener('click', _ctx._onSubmitClick);
  input?.addEventListener('keydown', _ctx._onInputKey);
  input?.addEventListener('focus', _ctx._onInputFocus);

  // Focus after a tick so mobile keyboards open properly
  setTimeout(() => input?.focus(), 50);

  return _cleanup;
}

async function _doSubmit() {
  const ctx = _ctx;
  if (!ctx || ctx.submitting || ctx.solved) return;

  // Always read the input fresh from the DOM — cached refs can go stale on mobile
  const liveInput = document.getElementById(ctx.inputId);
  const answer = (liveInput?.value || '').trim();
  if (!answer) {
    showFeedback(ctx.feedbackId, 'SAISIE REQUISE', 'error');
    return;
  }

  ctx.submitting = true;

  try {
    const correct = await validateAnswer(answer, ctx.stage.puzzle.answerHash);
    if (correct) {
      ctx.solved = true;
      showFeedback(ctx.feedbackId, 'ACCÈS AUTORISÉ', 'success');
      solvePuzzle(ctx.state, ctx.stage.id);
      if (ctx.submitBtn) ctx.submitBtn.disabled = true;
      if (liveInput) liveInput.disabled = true;
      setTimeout(() => ctx.onSolved(ctx.stage), 800);
    } else {
      showFeedback(ctx.feedbackId, 'ACCÈS REFUSÉ — CODE INCORRECT', 'error');
      if (liveInput) {
        glitch(liveInput);
        liveInput.value = '';
        liveInput.focus();
      }
      ctx.submitting = false;
    }
  } catch {
    ctx.submitting = false;
  }
}

function _cleanup() {
  if (!_ctx) return;
  _ctx.submitBtn?.removeEventListener('click', _ctx._onSubmitClick);
  _ctx.input?.removeEventListener('keydown', _ctx._onInputKey);
  _ctx.input?.removeEventListener('focus', _ctx._onInputFocus);
  _ctx = null;
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
