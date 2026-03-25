/**
 * Component: Global Nav — bottom navigation bar.
 */

/** Create the nav bar DOM and inject into body */
export function createNav() {
  const nav = document.createElement('nav');
  nav.id = 'global-nav';
  nav.className = 'global-nav hidden';
  nav.innerHTML = `
    <button class="nav-btn" data-action="evidence" title="Tableau des preuves">
      <span class="nav-icon">📋</span>
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

/** Bind nav button actions. Receives callbacks object: { onEvidence, onSoundToggle } */
export function bindNav({ onEvidence, onSoundToggle }) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'evidence' && onEvidence) onEvidence();
      if (action === 'sound-toggle' && onSoundToggle) onSoundToggle();
    });
  });
}
