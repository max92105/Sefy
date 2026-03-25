/**
 * Screen: Mission Briefing — cinematic timed sequence with video, audio,
 * agent card overlays, and confirm button.
 */

import { delay } from '../ui.js';
import { showBanner, getDeadlineISO } from '../components/banner.js';

/**
 * CONFIGURABLE BRIEFING SEQUENCE
 * Adjust times to sync with your audio file.
 */
const BRIEFING_SEQUENCE = [
  { time: 0,     type: 'text',  text: 'Bonjour. Je suis SEFY.' },
  { time: 3000,  type: 'text',  text: 'Je suis le système de sécurité de cette installation.' },
  { time: 6000,  type: 'text',  text: 'Un agent renégat a été détecté lors d\'une tentative d\'infiltration.' },
  { time: 12000, type: 'text',  text: 'Il a placé un dispositif explosif programmé pour exploser dans 1 heure 30 minutes.' },

  { time: 20000, type: 'text',  text: 'Le compte à rebours est lancé.' },
  { time: 21000, type: 'action', action: 'showCountdown' },

  { time: 22000, type: 'text',  text: 'Mon scanner biométrique indique la présence de deux agentes à proximité.' },

  { time: 28000, type: 'text',  text: 'Agente Émy-Jade.' },
  { time: 28500, type: 'agent', id: 'agent-card-emy', duration: 3000 },

  { time: 32000, type: 'text',  text: 'Agente Léa-Rose.' },
  { time: 32500, type: 'agent', id: 'agent-card-lea', duration: 3000 },

  { time: 34000, type: 'text',  text: 'Je peux gérer la plupart des menaces de sécurité, mais celle-ci nécessite une intervention humaine.' },
  { time: 40000, type: 'text',  text: 'Je serai votre guide, mais j\'ai besoin de votre aide pour empêcher cette catastrophe.' },

  { time: 44000, type: 'text',  text: 'J\'attends votre confirmation pour lancer la mission.' },
  { time: 44000, type: 'action', action: 'showConfirmButton' },
  { time: 48000, type: 'text',  text: 'Quelle que soit votre décision… faites vite. Le temps presse.' },
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
          <source src="assets/video/sefy_avatar.mp4" type="video/mp4">
        </video>

        <div class="agent-overlay hidden" id="agent-card-emy">
          <div class="agent-card">
            <div class="agent-photo">
              <img src="assets/images/agente_emy.png" alt="Agente Émy">
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
              <img src="assets/images/agente_lea.png" alt="Agente Léa">
            </div>
            <div class="agent-info">
              <span class="agent-rank">AGENTE</span>
              <span class="agent-name">LÉA</span>
            </div>
            <span class="agent-status">IDENTIFIÉE</span>
          </div>
        </div>
      </div>

      <div class="briefing-bottom">
        <div class="briefing-terminal" id="briefing-terminal">
          <span class="briefing-terminal-line" id="briefing-current-line"></span>
          <span class="terminal-cursor" id="briefing-cursor">_</span>
        </div>
        <div class="briefing-confirm hidden" id="briefing-confirm">
          <button id="btn-start-mission" class="btn btn-primary btn-glow btn-large">
            ACCEPTER LA MISSION
          </button>
        </div>
      </div>

      <audio id="ai-voice-audio" preload="auto">
        <source src="assets/audio/initial_launch_sefy.wav" type="audio/wav">
      </audio>
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
  const audio = document.getElementById('ai-voice-audio');
  const currentLine = document.getElementById('briefing-current-line');
  const cursor = document.getElementById('briefing-cursor');
  const confirmZone = document.getElementById('briefing-confirm');

  // Reset
  if (currentLine) currentLine.textContent = '';
  confirmZone?.classList.add('hidden');
  for (const id of ['agent-card-emy', 'agent-card-lea']) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('revealed', 'dismissing'); el.classList.add('hidden'); }
  }

  if (video) video.play().catch(() => {});
  if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }

  // Schedule events
  const timers = [];
  for (const event of BRIEFING_SEQUENCE) {
    const t = setTimeout(() => executeEvent(event, currentLine, confirmZone), event.time);
    timers.push(t);
  }

  // Accept button
  document.getElementById('btn-start-mission')?.addEventListener('click', () => {
    timers.forEach(t => clearTimeout(t));
    if (video) { video.pause(); video.currentTime = 0; }
    if (audio) { audio.pause(); audio.currentTime = 0; }
    onAccept({ deadlineISO: getDeadlineISO() });
  }, { once: true });
}

/** Execute a single briefing event */
async function executeEvent(event, currentLine, confirmZone) {
  switch (event.type) {
    case 'text': {
      if (currentLine) currentLine.textContent = '';
      for (let i = 0; i < event.text.length; i++) {
        if (currentLine) currentLine.textContent += event.text[i];
        await delay(20 + Math.random() * 20);
      }
      break;
    }
    case 'agent': {
      const overlay = document.getElementById(event.id);
      if (overlay) {
        overlay.classList.remove('hidden', 'dismissing');
        await delay(50);
        overlay.classList.add('revealed');
        const dur = event.duration || 3000;
        await delay(dur);
        overlay.classList.add('dismissing');
        await delay(400);
        overlay.classList.remove('revealed', 'dismissing');
        overlay.classList.add('hidden');
      }
      break;
    }
    case 'action': {
      if (event.action === 'showConfirmButton') {
        confirmZone?.classList.remove('hidden');
      }
      if (event.action === 'showCountdown') {
        showBanner();
      }
      break;
    }
  }
}
