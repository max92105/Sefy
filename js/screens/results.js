/**
 * Screen: Results — success and failure screens.
 */

import { formatTime, showScreen } from '../ui.js';
import { hideNav } from '../components/nav.js';

/** Create the success screen DOM */
export function createSuccessScreen() {
  const section = document.createElement('section');
  section.id = 'screen-success';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="result-badge success-badge">
        <span class="result-icon">☣</span>
        <h1>PURGE ÉVITÉE</h1>
      </div>
      <p class="failure-text">
        Le compte à rebours s'arrête. Les sas s'ouvrent. Vous franchissez la porte du laboratoire, vivante.<br><br>
        Mais ARK-41 circule toujours dans vos poumons — et vous voilà dehors, parmi les autres.<br><br>
        Avez-vous vraiment gagné ?
      </p>
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
        <span class="result-icon">☣</span>
        <h1>PROTOCOLE PURGE EXÉCUTÉ</h1>
      </div>
      <p class="failure-text">
        Le laboratoire est scellé, puis incinéré. Vous ne sortirez pas.<br><br>
        ARK-41 ne sortira pas non plus. Personne, dehors, ne tombera malade. La chaîne s'arrête ici, avec vous.<br><br>
        Avez-vous vraiment perdu ?
      </p>
      <button id="btn-retry" class="btn btn-primary btn-glow">RÉESSAYER LA MISSION</button>
    </div>
  `;
  return section;
}

/** Show the end-game (PURGE) screen — used when the PURGE timer reaches zero. */
export function showFailureScreen() {
  hideNav();
  showScreen('screen-failure');
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
