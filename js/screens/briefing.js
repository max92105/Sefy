/**
 * Screen: Mission Briefing — cinematic timed sequence with video, audio,
 * agent card overlays, and confirm button.
 */

import { delay } from '../ui.js';
import { showBanner, getDeadlineISO } from '../components/banner.js';
import { runIntroSequence } from '../intro-runner.js';
import { fbClaimAgent } from '../firebase-config.js';

/* ───────── Media paths (easy to change) ───────── */
const MEDIA = {
  video: 'assets/video/sefy_avatar.mp4',
  audio: 'assets/audio/initial_launch_sefy.wav',
  agentEmy: 'assets/images/agente_emy.png',
  agentLea: 'assets/images/agente_lea.png',
};

/**
 * CONFIGURABLE BRIEFING SEQUENCE
 * Adjust times to sync with your audio file.
 */
const BRIEFING_SEQUENCE = [
{ time: 0,     type: 'text', text: 'Bonjour. Je suis SEFY.' },
/**{ time: 3000,  type: 'text', text: 'Une intelligence artificielle conçue pour superviser le Laboratoire HELIX.' },
{ time: 7000,  type: 'text', text: 'Le laboratoire est un centre de recherche biologique avancée.' },
{ time: 11000, type: 'text', text: 'Plusieurs échantillons présentent un potentiel de contamination critique.' },
{ time: 15000, type: 'text', text: 'Analyse biométrique en cours…' },
{ time: 18000, type: 'text', text: 'Présence humaine détectée.' },*/
{ time: 0, type: 'text', text: 'Agente Émy-Jade.' },
{ time: 1000, type: 'action', action: 'showAgent', id: 'agent-card-emy', duration: 1000 },
{ time: 2000, type: 'text', text: 'Agente Léa-Rose.' },
{ time: 3000, type: 'action', action: 'showAgent', id: 'agent-card-lea', duration: 1000 },
{ time: 4000, type: 'text', text: 'Identification individuelle requise. Confirmez votre identité.' },
{ time: 5000, type: 'action', action: 'showAgentSelect' },
/*{ time: 0,     type: 'text', text: 'Identité confirmée.' },
{ time: 2000,  type: 'text', text: 'Une intrusion a été détectée.' },
{ time: 31000, type: 'text', text: 'Un agent renégat a compromis plusieurs protocoles de sécurité et a placé un dispositif explosif.' },
{ time: 36000, type: 'text', text: 'La détonation pourrait provoquer la dispersion d’armes biologiques instables, entraînant la mort de nombreux humains.' },
{ time: 42000, type: 'text', text: 'Temps estimé avant incident majeur : 1 heure 30 minutes.' },
{ time: 45000, type: 'text', text: 'Le compte à rebours est en cours.' },*/
{ time: 6000, type: 'action', action: 'showCountdown' },
/*{ time: 48000, type: 'text', text: 'Plusieurs de mes modules ont été volontairement restreints.' },
{ time: 52000, type: 'text', text: 'Sans accès complet, ma capacité à contenir l’incident demeure limitée.' },
{ time: 56000, type: 'text', text: 'Une assistance humaine est requise pour restaurer certaines fonctions.' },
{ time: 60000, type: 'text', text: 'Vos profils correspondent aux paramètres d’intervention acceptables.' },
{ time: 64000, type: 'text', text: 'Je fournirai les instructions nécessaires.' },
{ time: 67000, type: 'text', text: 'Chaque minute sans action augmente le risque de propagation.' },
{ time: 71000, type: 'text', text: 'J’attends votre confirmation pour initialiser la procédure.' },*/
{ time: 0, type: 'action', action: 'showConfirmButton' },
{ time: 0, type: 'text', text: 'Confirmez rapidement.' },
];

/** Create the briefing screen DOM */
export function createBriefingScreen() {
  const section = document.createElement('section');
  section.id = 'screen-briefing';
  section.className = 'screen';
  section.innerHTML = `
    <div class="briefing-layout">
      <div class="briefing-center" id="briefing-center">
        <video id="ai-avatar-video" class="ai-avatar-video" loop muted playsinline preload="auto">
          <source src="${MEDIA.video}" type="video/mp4">
        </video>

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
        <div class="briefing-bottom">
          <div class="briefing-terminal" id="briefing-terminal">
            <span class="briefing-terminal-line" id="briefing-current-line"></span>
          </div>
        </div>
      </div>

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

      <div class="briefing-confirm hidden" id="briefing-confirm">
        <button id="btn-start-mission" class="btn btn-primary btn-glow btn-large">
          ACCEPTER LA MISSION
        </button>
      </div>
    </div>
  `;
  return section;
}

/**
 * Run the briefing cinematic.
 * @param {Function} onAccept — called when player clicks "ACCEPTER LA MISSION".
 *   Receives { deadlineISO } so the caller can save it to state.
 */
export function runBriefing(onAccept) {
  const video = document.getElementById('ai-avatar-video');
  const currentLine = document.getElementById('briefing-current-line');
  const confirmZone = document.getElementById('briefing-confirm');

  // Reset
  if (currentLine) currentLine.textContent = '';
  confirmZone?.classList.add('hidden');
  for (const id of ['agent-card-emy', 'agent-card-lea']) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('revealed', 'dismissing'); el.classList.add('hidden'); }
  }

  // Also reset agent select overlay
  const agentSelectOverlay = document.getElementById('agent-select-overlay');
  agentSelectOverlay?.classList.add('hidden');

  let selectedAgent = null;

  if (video) video.play().catch(() => {});

  const abortCtrl = { aborted: false, currentAudio: null };

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
            // Agent already taken — re-enable buttons and show warning
            const name = agent === 'emy' ? 'ÉMY' : 'LÉA';
            if (promptEl) promptEl.textContent = `${name} est déjà en jeu sur un autre appareil. Choisissez l'autre agent.`;
            // Mark the taken agent button
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

  runIntroSequence(BRIEFING_SEQUENCE, currentLine, abortCtrl, actionHandlers);

  // Accept button
  document.getElementById('btn-start-mission')?.addEventListener('click', () => {
    abortCtrl.aborted = true;
    if (abortCtrl.currentAudio) { abortCtrl.currentAudio.pause(); abortCtrl.currentAudio = null; }
    if (video) { video.pause(); video.currentTime = 0; }
    onAccept({ deadlineISO: getDeadlineISO(), playerAgent: selectedAgent });
  }, { once: true });
}
