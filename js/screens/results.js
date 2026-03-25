/**
 * Screen: Results — success and failure screens.
 */

import { formatTime } from '../ui.js';

/** Create the success screen DOM */
export function createSuccessScreen() {
  const section = document.createElement('section');
  section.id = 'screen-success';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="result-badge success-badge">
        <span class="result-icon">✓</span>
        <h1>MISSION ACCOMPLIE</h1>
      </div>
      <div class="score-card" id="score-card">
        <div class="score-row">
          <span>Temps écoulé</span>
          <span id="score-time">--:--</span>
        </div>
        <div class="score-row">
          <span>Indices utilisés</span>
          <span id="score-hints">0</span>
        </div>
        <div class="score-row">
          <span>Évaluation</span>
          <span id="score-rating">—</span>
        </div>
      </div>
      <button id="btn-restart" class="btn btn-outline">NOUVELLE MISSION</button>
    </div>
  `;
  return section;
}

/** Create the failure screen DOM */
export function createFailureScreen() {
  const section = document.createElement('section');
  section.id = 'screen-failure';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="result-badge failure-badge">
        <span class="result-icon">✗</span>
        <h1>MISSION ÉCHOUÉE</h1>
      </div>
      <p class="failure-text">Le dispositif n'a pas pu être neutralisé à temps.</p>
      <button id="btn-retry" class="btn btn-primary btn-glow">RÉESSAYER LA MISSION</button>
    </div>
  `;
  return section;
}

/** Populate the success screen with final stats */
export function populateSuccess(elapsedMs, totalHints) {
  const timeEl = document.getElementById('score-time');
  const hintsEl = document.getElementById('score-hints');
  const ratingEl = document.getElementById('score-rating');

  if (timeEl) timeEl.textContent = formatTime(elapsedMs);
  if (hintsEl) hintsEl.textContent = String(totalHints);
  if (ratingEl) {
    if (totalHints === 0) ratingEl.textContent = '★★★ ÉLITE';
    else if (totalHints <= 3) ratingEl.textContent = '★★ AGENT SENIOR';
    else if (totalHints <= 6) ratingEl.textContent = '★ AGENT DE TERRAIN';
    else ratingEl.textContent = 'RECRUE';
  }
}
