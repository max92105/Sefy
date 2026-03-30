/**
 * Component: Global Nav — bottom navigation bar.
 */

/** Create the nav bar DOM and inject into body */
export function createNav() {
  const nav = document.createElement('nav');
  nav.id = 'global-nav';
  nav.className = 'global-nav hidden';
  nav.innerHTML = `
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

/** Bind nav button actions */
export function bindNav({ onInventory, onSoundToggle }) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'inventory' && onInventory) onInventory();
      if (action === 'sound-toggle' && onSoundToggle) onSoundToggle();
    });
  });
}
