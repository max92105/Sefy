/**
 * Screen: Mission Briefing — cinematic timed sequence with video, audio,
 * agent card overlays, and confirm button.
 *
 * Uses the intro-cinematic component for the SEFY video + typewriter,
 * and adds custom overlays (agent cards, agent select, countdown, confirm).
 */

import { delay } from '../../ui.js';
import { showBanner, getDeadlineISO } from '../../components/banner.js';
import { createIntroCinematicDOM, startIntroCinematic } from '../../components/intro-cinematic.js';
import { fbClaimAgent } from '../../firebase-config.js';
import { INTRO_SEQUENCE } from './config.js';

/* ───────── Media paths ───────── */
const MEDIA = {
  agentEmy: 'assets/images/agente_emy.png',
  agentLea: 'assets/images/agente_lea.png',
};

const PREFIX = 'briefing';

/* ═══════════════  DOM  ═══════════════ */

export function createScreen() {
  const section = document.createElement('section');
  section.id = `screen-${PREFIX}`;
  section.className = 'screen stage-screen';

  const layout = document.createElement('div');
  layout.className = 'stage-layout briefing-layout';

  // Intro cinematic (video + typewriter)
  const introEl = createIntroCinematicDOM(PREFIX);
  layout.appendChild(introEl);

  // Inject agent card overlays into the briefing-center (before briefing-bottom)
  const center = introEl.querySelector(`#${PREFIX}-intro-center`);
  const bottom = center?.querySelector('.briefing-bottom');

  const agentOverlaysHTML = `
    <div class="agent-overlay hidden" id="agent-card-emy">
      <div class="agent-card">
        <div class="agent-photo">
          <img src="${MEDIA.agentEmy}" alt="Agente Émy">
        </div>
        <div class="agent-info">
          <span class="agent-rank">AGENTE</span>
          <span class="agent-name">ÉMY</span>
        </div>
        <span class="agent-status">IDENTIFIÉE</span>
      </div>
    </div>
    <div class="agent-overlay hidden" id="agent-card-lea">
      <div class="agent-card">
        <div class="agent-photo">
          <img src="${MEDIA.agentLea}" alt="Agente Léa">
        </div>
        <div class="agent-info">
          <span class="agent-rank">AGENTE</span>
          <span class="agent-name">LÉA</span>
        </div>
        <span class="agent-status">IDENTIFIÉE</span>
      </div>
    </div>
  `;

  const temp = document.createElement('div');
  temp.innerHTML = agentOverlaysHTML;
  while (temp.firstElementChild) {
    center.insertBefore(temp.firstElementChild, bottom);
  }

  // Agent select overlay
  const agentSelectHTML = `
    <div class="agent-select-overlay hidden" id="agent-select-overlay">
      <p class="agent-select-prompt">QUI ÊTES-VOUS ?</p>
      <div class="agent-select-cards">
        <button class="agent-select-btn" data-agent="emy">
          <img src="${MEDIA.agentEmy}" alt="Émy">
          <span>ÉMY</span>
        </button>
        <button class="agent-select-btn" data-agent="lea">
          <img src="${MEDIA.agentLea}" alt="Léa">
          <span>LÉA</span>
        </button>
      </div>
    </div>
  `;
  layout.insertAdjacentHTML('beforeend', agentSelectHTML);

  // Confirm button zone
  const confirmHTML = `
    <div class="briefing-confirm hidden" id="briefing-confirm">
      <button id="btn-start-mission" class="btn btn-primary btn-glow btn-large">
        ACCEPTER LA MISSION
      </button>
    </div>
  `;
  layout.insertAdjacentHTML('beforeend', confirmHTML);

  section.appendChild(layout);
  return section;
}

/* ═══════════════  Run  ═══════════════ */

/**
 * Run the briefing cinematic.
 * @param {Function} onAccept — called when player clicks "ACCEPTER LA MISSION".
 *   Receives { deadlineISO, playerAgent } so the caller can save to state.
 */
export function start(onAccept) {
  const confirmZone = document.getElementById('briefing-confirm');
  const agentSelectOverlay = document.getElementById('agent-select-overlay');

  // Reset overlays
  confirmZone?.classList.add('hidden');
  agentSelectOverlay?.classList.add('hidden');
  for (const id of ['agent-card-emy', 'agent-card-lea']) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('revealed', 'dismissing'); el.classList.add('hidden'); }
  }

  let selectedAgent = null;

  // Action handlers for briefing-specific events
  const actionHandlers = {
    showAgentSelect() {
      return new Promise(resolve => {
        const promptEl = agentSelectOverlay?.querySelector('.agent-select-prompt');
        const buttons = agentSelectOverlay?.querySelectorAll('.agent-select-btn');

        // Reset prompt text and button states
        if (promptEl) promptEl.textContent = 'QUI ÊTES-VOUS ?';
        buttons?.forEach(b => { b.disabled = false; b.classList.remove('taken'); });
        agentSelectOverlay?.classList.remove('hidden');

        async function pick(e) {
          const agent = e.currentTarget.dataset.agent;

          // Disable buttons while checking
          buttons?.forEach(b => { b.disabled = true; });

          const claimed = await fbClaimAgent(agent);
          if (!claimed) {
            const name = agent === 'emy' ? 'ÉMY' : 'LÉA';
            if (promptEl) promptEl.textContent = `${name} est déjà en jeu sur un autre appareil. Choisissez l'autre agent.`;
            const takenBtn = agentSelectOverlay?.querySelector(`.agent-select-btn[data-agent="${agent}"]`);
            if (takenBtn) takenBtn.classList.add('taken');
            buttons?.forEach(b => { if (!b.classList.contains('taken')) b.disabled = false; });
            return;
          }

          selectedAgent = agent;
          buttons?.forEach(b => b.removeEventListener('click', pick));
          agentSelectOverlay?.classList.add('hidden');
          resolve('reset-clock');
        }

        buttons?.forEach(b => b.addEventListener('click', pick));
      });
    },
    showCountdown() {
      showBanner();
    },
    async showAgent(event) {
      const overlay = document.getElementById(event.id);
      if (overlay) {
        overlay.classList.remove('hidden', 'dismissing');
        await delay(50);
        overlay.classList.add('revealed');
        await delay(event.duration || 3000);
        overlay.classList.add('dismissing');
        await delay(400);
        overlay.classList.remove('revealed', 'dismissing');
        overlay.classList.add('hidden');
      }
    },
    showConfirmButton() {
      confirmZone?.classList.remove('hidden');
    },
  };

  const intro = startIntroCinematic(PREFIX, INTRO_SEQUENCE, actionHandlers);

  // Accept button
  document.getElementById('btn-start-mission')?.addEventListener('click', () => {
    intro.cleanup();
    onAccept({ deadlineISO: getDeadlineISO(), playerAgent: selectedAgent });
  }, { once: true });
}
