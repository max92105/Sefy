/**
 * Component: Global Nav — bottom navigation bar.
 */

/** Create the nav bar DOM and inject into body */
export function createNav() {
  const nav = document.createElement('nav');
  nav.id = 'global-nav';
  nav.className = 'global-nav hidden';
  nav.innerHTML = `
    <button class="nav-btn hidden" data-action="hint" id="nav-hint" title="Demander un indice">
      <span class="nav-icon">💡</span>
      <span class="nav-badge hidden" id="hint-badge">0</span>
    </button>
    <button class="nav-btn hidden" data-action="replay-intro" id="nav-replay-intro" title="Revoir l'intro">
      <span class="nav-icon">🔄</span>
    </button>
    <button class="nav-btn" data-action="inventory" title="Inventaire">
      <span class="nav-icon">🎒</span>
      <span class="nav-badge hidden" id="inv-badge">0</span>
    </button>
    <button class="nav-btn" data-action="sound-toggle" title="Son">
      <span class="nav-icon" id="sound-icon">🔊</span>
    </button>
    <button class="nav-btn" data-action="settings" title="Paramètres">
      <span class="nav-icon">⚙</span>
    </button>
  `;
  document.body.appendChild(nav);
}

/** Show the nav */
export function showNav() {
  document.getElementById('global-nav')?.classList.remove('hidden');
}

/** Hide the nav */
export function hideNav() {
  document.getElementById('global-nav')?.classList.add('hidden');
}

/** Show/hide the inventory button */
export function setInventoryVisible(visible) {
  const btn = document.querySelector('.nav-btn[data-action="inventory"]');
  if (btn) btn.classList.toggle('hidden', !visible);
}

/**
 * Configure the hint button for the current puzzle.
 * @param {number} remaining — hints not yet revealed
 * @param {number} total     — total hints available for this puzzle
 *
 * No hints defined → button hidden entirely.
 * All hints revealed → button dimmed (still tappable to re-read the last message).
 */
export function setHintButton(remaining, total) {
  const btn = document.getElementById('nav-hint');
  const badge = document.getElementById('hint-badge');
  if (!btn) return;

  if (!total || total <= 0) {
    btn.classList.add('hidden');
    return;
  }

  btn.classList.remove('hidden');
  btn.classList.toggle('depleted', remaining <= 0);

  if (badge) {
    badge.textContent = String(Math.max(0, remaining));
    badge.classList.toggle('hidden', remaining <= 0);
  }
}

/** Show/hide the replay-intro button */
export function setReplayVisible(visible) {
  document.getElementById('nav-replay-intro')?.classList.toggle('hidden', !visible);
}

/** Bind nav button actions */
export function bindNav({ onInventory, onSoundToggle, onHint, onReplayIntro }) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'inventory' && onInventory) onInventory();
      if (action === 'sound-toggle' && onSoundToggle) onSoundToggle();
      if (action === 'hint' && onHint) onHint();
      if (action === 'replay-intro' && onReplayIntro) onReplayIntro();
    });
  });
}
