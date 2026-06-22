/**
 * Screen: Results — success and failure screens.
 */

import { formatTime, showScreen } from '../ui.js';
import { hideNav } from '../components/nav.js';
import { hideBanner } from '../components/banner.js';
import { computeScore, scoreRating } from '../state.js';

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
        <div class="score-row score-meta"><span>Temps écoulé</span><span id="score-time">--:--</span></div>
        <div class="score-breakdown" id="score-breakdown"></div>
        <div class="score-row score-total"><span>SCORE</span><span id="score-value">0</span></div>
        <div class="score-row"><span>Évaluation</span><span id="score-rating">—</span></div>
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
  hideBanner();
  showScreen('screen-failure');
}

/** True ending — the agent vaccinated themselves, deactivated SEFY, and walks out cured. */
export function createTrueVictoryScreen() {
  const section = document.createElement('section');
  section.id = 'screen-victory';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="result-badge success-badge">
        <span class="result-icon">🧬</span>
        <h1>VICTOIRE TOTALE</h1>
      </div>
      <p class="failure-text">
        SEFY est désactivée. Le compte à rebours s'arrête.<br><br>
        La dernière création du Dr. Adrian coule dans vos veines : ARK-41 est neutralisé. Vous franchissez la porte de HELIX, vivant·e — et sans danger pour personne.<br><br>
        Une seule dose. Une seule vie sauvée. La vôtre.
      </p>
      <div class="score-card" id="victory-score-card">
        <div class="score-row score-meta"><span>Temps écoulé</span><span id="victory-time">--:--</span></div>
        <div class="score-breakdown" id="victory-breakdown"></div>
        <div class="score-row score-total"><span>SCORE</span><span id="victory-value">0</span></div>
        <div class="score-row"><span>Évaluation</span><span id="victory-rating">—</span></div>
      </div>
      <button id="btn-victory-restart" class="btn btn-outline">NOUVELLE MISSION</button>
    </div>
  `;
  return section;
}

/** The final choice — shown when the deactivation code is entered WITHOUT the vaccine. */
export function createEndChoiceScreen() {
  const section = document.createElement('section');
  section.id = 'screen-end-choice';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="result-badge" style="border-color: var(--accent-amber);">
        <span class="result-icon">☣</span>
        <h1>LE CHOIX FINAL</h1>
      </div>
      <p class="failure-text">
        Le code est entré. SEFY peut être désactivée.<br><br>
        Mais vous êtes infecté·e par ARK-41. Si vous sortez, vous emportez le virus avec vous.
      </p>
      <button id="btn-end-leave" class="btn btn-primary btn-glow" style="margin-bottom: var(--space-md);">DÉSACTIVER SEFY ET PARTIR</button>
      <button id="btn-end-die" class="btn btn-outline">SE LAISSER MOURIR</button>
    </div>
  `;
  return section;
}

/** Populate a results score card with an itemized breakdown + score (prefix = 'score' | 'victory'). */
export function populateSuccess(state, idPrefix = 'score') {
  const r = computeScore(state);
  const set = (suffix, val) => {
    const el = document.getElementById(`${idPrefix}-${suffix}`);
    if (el) el.textContent = val;
  };
  set('time', formatTime(r.elapsedMs));
  set('value', String(r.score));
  set('rating', scoreRating(r.score));

  const container = document.getElementById(`${idPrefix}-breakdown`);
  if (container) {
    container.innerHTML = r.breakdown
      .filter(it => it.value !== 0) // hide zero-value lines (e.g. no hints used)
      .map(it => {
        const sign = it.value < 0 ? '−' : '+';
        const cls = it.value < 0 ? ' class="score-neg"' : '';
        return `<div class="score-row"><span>${it.label}</span><span${cls}>${sign}${Math.abs(it.value)}</span></div>`;
      })
      .join('');
  }
}
