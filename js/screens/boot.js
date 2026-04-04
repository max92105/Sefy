/**
 * Screen: Terminal Boot Sequence — typewritten lines with glitch effects.
 */

import { delay } from '../ui.js';

const TERMINAL_LINES = [
  { text: 'DÉMARRAGE DU SYSTÈME…', delay: 800, cls: '' },
  { text: 'RÉCUPÉRATION DES DONNÉES', delay: 1200, cls: '' },
  { text: 'SIGNAL INTERMITTENT…', delay: 1000, cls: 'warning' },
  { text: 'ERREUR… ERREUR…', delay: 600, cls: 'error', shake: true, glitch: true },
  { text: 'PROTOCOLE D\'URGENCE ACTIVÉ…', delay: 1200, cls: 'warning' },
  { text: 'SIGNAL DÉTECTÉ…', delay: 1000, cls: 'bright' },
];

/** Create the terminal screen DOM */
export function createTerminalScreen() {
  const section = document.createElement('section');
  section.id = 'screen-terminal';
  section.className = 'screen active';
  section.innerHTML = `
    <div class="terminal-screen">
      <div class="terminal-lines" id="terminal-lines"></div>
      <div class="terminal-cursor" id="terminal-cursor">_</div>
    </div>
  `;
  return section;
}

/** Run the typewriter boot sequence, then call onComplete */
export async function runBootSequence(onComplete) {
  const container = document.getElementById('terminal-lines');
  const cursor = document.getElementById('terminal-cursor');
  const noise = document.getElementById('static-noise');
  const screen = document.getElementById('screen-terminal');

  if (container) container.innerHTML = '';

  await delay(600);

  for (const line of TERMINAL_LINES) {
    const lineEl = document.createElement('div');
    lineEl.className = `terminal-line ${line.cls || ''}`;
    container?.appendChild(lineEl);

    for (let i = 0; i < line.text.length; i++) {
      lineEl.textContent += line.text[i];
      await delay(25 + Math.random() * 35);
    }

    if (line.glitch && screen) {
      screen.classList.add('heavy-glitch');
      if (noise) noise.classList.add('flash');
      setTimeout(() => {
        screen.classList.remove('heavy-glitch');
        if (noise) noise.classList.remove('flash');
      }, 600);
    }
    if (line.shake && screen) {
      screen.classList.add('screen-shake');
      setTimeout(() => screen.classList.remove('screen-shake'), 400);
    }

    await delay(line.delay);
  }

  if (cursor) cursor.style.display = 'none';
  await delay(800);

  onComplete();
}
