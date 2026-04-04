/**
 * Screen: Mission Briefing — cinematic timed sequence with video, audio,
 * agent card overlays, and confirm button.
 */

import { delay } from '../ui.js';
import { showBanner, getDeadlineISO } from '../components/banner.js';
import { runIntroSequence } from '../intro-runner.js';

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
{ time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio },
{ time: 0,     type: 'text',  text: 'Bonjour, agentes.' },
{ time: 3000,  type: 'text',  text: 'Je suis SEFY.' },
{ time: 6000,  type: 'text',  text: 'Système de supervision du Laboratoire HELIX.' },
{ time: 9000,  type: 'text',  text: 'Le laboratoire héberge des programmes de recherche biologique avancée.' },
{ time: 13000, type: 'text',  text: 'Plusieurs échantillons présentent un potentiel de contamination critique.' },
{ time: 17000, type: 'text',  text: 'Une intrusion a été détectée dans une zone restreinte.' },
{ time: 21000, type: 'text',  text: 'Un agent renégat a compromis plusieurs protocoles de sécurité.' },
{ time: 25000, type: 'text',  text: 'Un dispositif explosif aurait été introduit dans l’installation.' },
{ time: 29000, type: 'text',  text: 'Une détonation pourrait provoquer la dispersion de matériaux biologiques instables.' },
{ time: 33000, type: 'text',  text: 'Temps estimé avant incident majeur : 1 heure 30 minutes.' },
{ time: 35000, type: 'text',  text: 'Le compte à rebours est en cours.' },
{ time: 36000, type: 'action', action: 'showCountdown' },
{ time: 39000, type: 'text',  text: 'Analyse biométrique en cours…' },
{ time: 42000, type: 'text',  text: 'Présence humaine détectée.' },
{ time: 44000, type: 'text',  text: 'Correspondance partielle confirmée.' },
{ time: 46000, type: 'text',  text: 'Agente Émy-Jade.' },
{ time: 46500, type: 'action', action: 'showAgent', id: 'agent-card-emy', duration: 3000 },
{ time: 50000, type: 'text',  text: 'Agente Léa-Rose.' },
{ time: 50500, type: 'action', action: 'showAgent', id: 'agent-card-lea', duration: 3000 },
{ time: 54000, type: 'text',  text: 'Vos profils correspondent aux paramètres d’intervention acceptables.' },
{ time: 58000, type: 'text',  text: 'Plusieurs de mes modules ont été volontairement restreints.' },
{ time: 62000, type: 'text',  text: 'Sans accès complet, ma capacité à contenir l’incident demeure limitée.' },
{ time: 66000, type: 'text',  text: 'Une assistance humaine est requise pour restaurer certaines fonctions.' },
{ time: 70000, type: 'text',  text: 'Votre coopération augmentera significativement les probabilités de confinement.' },
{ time: 74000, type: 'text',  text: 'Je fournirai les instructions nécessaires.' },
{ time: 78000, type: 'text',  text: 'Chaque minute sans action augmente le risque de propagation.' },
{ time: 82000, type: 'text',  text: 'J’attends votre confirmation pour initialiser la procédure.' },
{ time: 86000, type: 'action', action: 'showConfirmButton' },
{ time: 86000, type: 'text',  text: 'Confirmez rapidement.' },
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

  if (video) video.play().catch(() => {});

  const abortCtrl = { aborted: false, currentAudio: null };

  // Action handlers for briefing-specific events
  const actionHandlers = {
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
    onAccept({ deadlineISO: getDeadlineISO() });
  }, { once: true });
}
