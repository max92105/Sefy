/**
 * Screen: Evidence Board — shows collected intel and solved puzzles.
 */

/** Create the evidence screen DOM */
export function createEvidenceScreen() {
  const section = document.createElement('section');
  section.id = 'screen-evidence';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content">
      <div class="screen-header">
        <span class="header-tag">INTEL</span>
        <span class="header-title">TABLEAU DES PREUVES</span>
      </div>
      <div class="evidence-grid" id="evidence-grid">
        <p class="empty-state">Aucun renseignement collecté pour le moment.</p>
      </div>
      <button id="btn-evidence-back" class="btn btn-outline">RETOUR À LA MISSION</button>
    </div>
  `;
  return section;
}

/** Populate the evidence grid from state */
export function populateEvidence(state) {
  const grid = document.getElementById('evidence-grid');
  if (!grid) return;

  if (state.solvedPuzzles.length === 0 && state.inventory.length === 0) {
    grid.innerHTML = '<p class="empty-state">Aucun renseignement collecté pour le moment.</p>';
  } else {
    let html = '';
    for (const puzzleId of state.solvedPuzzles) {
      html += `
        <div class="evidence-card">
          <div class="evidence-label">Résolu</div>
          <div class="evidence-value">${puzzleId}</div>
        </div>`;
    }
    for (const item of state.inventory) {
      html += `
        <div class="evidence-card">
          <div class="evidence-label">Objet</div>
          <div class="evidence-value">${item}</div>
        </div>`;
    }
    grid.innerHTML = html;
  }
}
