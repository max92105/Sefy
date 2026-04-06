/**
 * Screen: Inventory — shows all collected items (keycards, AR objects, misc).
 */

const KEYCARD_COLORS = {
  RED:    { label: 'ROUGE',  css: '#ff3040', icon: '🔑' },
  BLUE:   { label: 'BLEUE',  css: '#4488ff', icon: '🔑' },
  YELLOW: { label: 'JAUNE',  css: '#f5c542', icon: '🔑' },
};

const AR_ITEM_INFO = {
  bomb:        { label: 'BOMBE',           icon: '💣', css: '#ff0040' },
  'tier3-card': { label: 'CARTE TIER 3',  icon: '🪪', css: '#00ff41' },
};

export { KEYCARD_COLORS };

/** Create the inventory screen DOM */
export function createInventoryScreen() {
  const section = document.createElement('section');
  section.id = 'screen-inventory';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content">
      <div class="screen-header">
        <span class="header-tag">INVENTAIRE</span>
        <span class="header-title">OBJETS COLLECTÉS</span>
      </div>

      <div class="inv-items" id="inv-items">
        <p class="empty-state">Aucun objet collecté.</p>
      </div>

      <button id="btn-inventory-back" class="btn btn-outline" style="margin-top: var(--space-lg);">RETOUR À LA MISSION</button>
    </div>
  `;
  return section;
}

/** Populate the inventory from state */
export function populateInventory(state) {
  const grid = document.getElementById('inv-items');
  if (!grid) return;

  const items = [];

  // Keycards
  for (const id of (state.keycards || [])) {
    const c = KEYCARD_COLORS[id] || { label: id, css: '#888', icon: '🔑' };
    items.push({ label: `Carte ${c.label}`, icon: c.icon, css: c.css });
  }

  // AR objects
  for (const id of (state.arFound || [])) {
    const info = AR_ITEM_INFO[id] || { label: id, icon: '📦', css: '#888' };
    items.push({ label: info.label, icon: info.icon, css: info.css });
  }

  // Generic inventory items
  for (const id of (state.inventory || [])) {
    items.push({ label: id, icon: '📦', css: '#888' });
  }

  if (items.length === 0) {
    grid.innerHTML = '<p class="empty-state">Aucun objet collecté.</p>';
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="inv-item" style="--item-color: ${item.css}">
      <div class="inv-item-icon">${item.icon}</div>
      <div class="inv-item-label">${item.label}</div>
    </div>
  `).join('');
}

/** Update the nav badge count */
export function updateInventoryBadge(state) {
  const badge = document.getElementById('inv-badge');
  const count = (state.keycards || []).length
              + (state.arFound || []).length
              + (state.inventory || []).length;
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
}
