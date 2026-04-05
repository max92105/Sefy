/**
 * Screen: Terminal Boot Sequence — typewritten lines.
 */

import { typewriter } from '../typewriter.js';
import { delay } from '../ui.js';

const TERMINAL_LINES = [
  /*{ text: 'DÉMARRAGE DU SYSTÈME ET RÉCUPÉRATION DES DONNÉES', delay: 1500, speed: 30, cls: '' },
  { text: 'SIGNAL INTERMITTENT', delay: 1000, speed: 30, cls: 'warning' },
  { text: 'TENTATIVE D\'ACTIVATION DU PROTOCOLE D\'URGENCE', delay: 1500, speed: 30, cls: 'warning' },
  { text: 'TANTATIVE 1', delay: 800, speed: 30, cls: '' },
  { text: '...', delay: 1500, speed: 200, cls: '' },
  { text: 'ERREUR', delay: 600, speed: 30, cls: 'error' },
  { text: 'TANTATIVE 2', delay: 800, speed: 30, cls: '' },
  { text: '...', delay: 1500, speed: 200, cls: '' },
  { text: 'ERREUR', delay: 600, speed: 30, cls: 'error' },
  { text: 'TANTATIVE 3', delay: 800, speed: 30, cls: '' },
  { text: '...', delay: 1500, speed: 200, cls: '' }, */
  { text: 'SIGNAL DÉTECTÉ', delay: 1000, speed: 30, cls: '' },
];

/** Create the terminal screen DOM */
export function createTerminalScreen() {
  const section = document.createElement('section');
  section.id = 'screen-terminal';
  section.className = 'screen active';
  section.innerHTML = `
    <div class="terminal-screen">
      <div class="terminal-lines" id="terminal-lines"></div>
    </div>
  `;
  return section;
}

/** Run the typewriter boot sequence, then call onComplete */
export async function runBootSequence(onComplete) {
  const container = document.getElementById('terminal-lines');
  const screen = document.getElementById('screen-terminal');

  if (container) container.innerHTML = '';

  await delay(600);

  for (const line of TERMINAL_LINES) {
    const lineEl = document.createElement('div');
    lineEl.className = `terminal-line ${line.cls || ''}`;
    container?.appendChild(lineEl);

    await typewriter(lineEl, line.text, line.speed);
    await delay(line.delay);
  }

  await delay(800);

  onComplete();
}
