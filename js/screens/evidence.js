/**
 * Screen: Inventory — shows collected keycards and lock station status.
 */

const KEYCARD_COLORS = {
  RED:    { label: 'ROUGE',  css: '#ff3040', name: 'Carte d\'accès Rouge — Niveau Alpha' },
  BLUE:   { label: 'BLEUE',  css: '#4488ff', name: 'Carte d\'accès Bleue — Niveau Bravo' },
  YELLOW: { label: 'JAUNE',  css: '#f5c542', name: 'Carte d\'accès Jaune — Niveau Charlie' },
};

const LOCK_STATIONS = [
  { id: 'RED',    label: 'Station Alpha',   requires: 'RED' },
  { id: 'BLUE',   label: 'Station Bravo',   requires: 'BLUE' },
  { id: 'YELLOW', label: 'Station Charlie',  requires: 'YELLOW' },
];

export { KEYCARD_COLORS, LOCK_STATIONS };

/** Create the inventory screen DOM */
export function createInventoryScreen() {
  const section = document.createElement('section');
  section.id = 'screen-inventory';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content">
      <div class="screen-header">
        <span class="header-tag">INVENTAIRE</span>
        <span class="header-title">CARTES D'ACCÈS</span>
      </div>

      <div class="inv-keycards" id="inv-keycards">
        <p class="empty-state">Aucune carte d'accès collectée.</p>
      </div>

      <div class="screen-header" style="margin-top: var(--space-md);">
        <span class="header-tag">STATIONS</span>
        <span class="header-title">VERROUILLAGE</span>
      </div>

      <div class="inv-locks" id="inv-locks"></div>

      <button id="btn-inventory-back" class="btn btn-outline" style="margin-top: var(--space-lg);">RETOUR À LA MISSION</button>
    </div>
  `;
  return section;
}

/** Populate the inventory from state */
export function populateInventory(state) {
  const keycardGrid = document.getElementById('inv-keycards');
  const lockGrid    = document.getElementById('inv-locks');
  if (!keycardGrid || !lockGrid) return;

  const cards = state.keycards || [];
  const unlocked = state.unlockedStations || [];

  // ── Keycards ──
  if (cards.length === 0) {
    keycardGrid.innerHTML = '<p class="empty-state">Aucune carte d\'accès collectée.</p>';
  } else {
    keycardGrid.innerHTML = cards.map(id => {
      const c = KEYCARD_COLORS[id] || { label: id, css: '#888', name: id };
      return `
        <div class="inv-keycard" data-card="${id}" style="--card-color: ${c.css}">
          <div class="inv-keycard-icon">🔑</div>
          <div class="inv-keycard-label">${c.label}</div>
        </div>`;
    }).join('');
  }

  // ── Lock stations ──
  lockGrid.innerHTML = LOCK_STATIONS.map(lock => {
    const isOpen = unlocked.includes(lock.id);
    const hasKey = cards.includes(lock.requires);
    const cls = isOpen ? 'inv-lock unlocked' : 'inv-lock locked';
    const icon = isOpen ? '🔓' : '🔒';
    const reqColor = KEYCARD_COLORS[lock.requires]?.css || '#888';
    return `
      <div class="${cls}" style="--lock-color: ${reqColor}">
        <span class="inv-lock-icon">${icon}</span>
        <span class="inv-lock-label">${lock.label}</span>
        <span class="inv-lock-status">${isOpen ? 'DÉVERROUILLÉE' : hasKey ? 'CLÉ EN POSSESSION' : 'VERROUILLÉE'}</span>
      </div>`;
  }).join('');
}

/** Update the nav badge count */
export function updateInventoryBadge(state) {
  const badge = document.getElementById('inv-badge');
  const count = (state.keycards || []).length;
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
}
