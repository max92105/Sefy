/**
 * Screen: SEFY Landing — logo reveal + typewriter subtitles + launch button.
 */

import { typewriter } from '../../typewriter.js';
import { delay } from '../../ui.js';

/** Create the landing screen DOM */
export function createLandingScreen() {
  const section = document.createElement('section');
  section.id = 'screen-boot';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="boot-logo" id="boot-logo">
        <span class="logo-bracket">[</span>
        <span class="logo-text">SEFY</span>
        <span class="logo-bracket">]</span>
      </div>
      <p class="boot-subtitle boot-subtitle-line1" id="boot-line1"></p>
      <p class="boot-subtitle boot-subtitle-line2" id="boot-line2"></p>
      <button id="btn-boot" class="btn btn-primary btn-glow" style="display:none;">
        LANCER SEFY
      </button>
    </div>
  `;
  return section;
}

/** Run the landing animation, then call onLaunch when button is clicked */
export async function runLanding(onLaunch) {
  const line1 = document.getElementById('boot-line1');
  const line2 = document.getElementById('boot-line2');
  const bootBtn = document.getElementById('btn-boot');

  await delay(1200);

  if (line1) {
    await typewriter(line1, 'Sécurité de l\'Établissement compromise', 30);
  }

  await delay(400);

  if (line2) {
    await typewriter(line2, 'Intervention humaine requise.', 30);
  }

  await delay(300);

  if (bootBtn) {
    bootBtn.style.display = '';
    bootBtn.style.opacity = '0';
    bootBtn.style.animation = 'subtitleFadeIn 0.6s ease forwards';
  }

  bootBtn?.addEventListener('click', () => onLaunch(), { once: true });
}
