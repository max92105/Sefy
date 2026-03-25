/**
 * Component: Modals — hint and reset dialogs.
 */

/** Create all modal DOM elements and inject into body */
export function createModals() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <!-- MODAL: Hint -->
    <div id="modal-hint" class="modal hidden" role="dialog" aria-modal="true">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <span class="header-tag">SUPPORT INTEL</span>
          <button class="modal-close" aria-label="Fermer">&times;</button>
        </div>
        <div class="modal-body" id="hint-body">
          <p id="hint-text">—</p>
          <p class="hint-warning" id="hint-warning"></p>
        </div>
        <div class="modal-actions">
          <button id="btn-reveal-hint" class="btn btn-secondary">RÉVÉLER L'INDICE</button>
          <button id="btn-close-hint" class="btn btn-outline">FERMER</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Confirm Reset -->
    <div id="modal-reset" class="modal hidden" role="dialog" aria-modal="true">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <span class="header-tag warning">ATTENTION</span>
        </div>
        <div class="modal-body">
          <p>Cela va effacer toute la progression de la mission. Êtes-vous sûr(e) ?</p>
        </div>
        <div class="modal-actions">
          <button id="btn-confirm-reset" class="btn btn-danger">CONFIRMER LA RÉINITIALISATION</button>
          <button id="btn-cancel-reset" class="btn btn-outline">ANNULER</button>
        </div>
      </div>
    </div>
  `;

  // Append each modal to body
  while (wrapper.firstElementChild) {
    document.body.appendChild(wrapper.firstElementChild);
  }
}

/** Setup close-on-backdrop-click and close buttons for all modals */
export function initModals() {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      backdrop.closest('.modal')?.classList.add('hidden');
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal')?.classList.add('hidden');
    });
  });
}

/** Open a modal by id */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.querySelector('button')?.focus();
  }
}

/** Close a modal by id */
export function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}
