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
          <p class="hint-counter" id="hint-counter"></p>
          <p id="hint-text">—</p>
          <p class="hint-warning" id="hint-warning"></p>
          <div class="hint-nav hidden" id="hint-nav">
            <button id="btn-hint-prev" class="btn btn-outline hint-nav-btn" aria-label="Indice précédent">◀ PRÉCÉDENT</button>
            <button id="btn-hint-next" class="btn btn-outline hint-nav-btn" aria-label="Indice suivant">SUIVANT ▶</button>
          </div>
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

    <!-- MODAL: Inject unknown syringe (confirm) -->
    <div id="modal-syringe" class="modal hidden" role="dialog" aria-modal="true">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <span class="header-tag warning">OBJET INCONNU</span>
        </div>
        <div class="modal-body">
          <p>Vous injecter le contenu de cette seringue ?</p>
          <p class="hint-warning">Vous ignorez ce qu'elle contient et ses effets. Ce choix est définitif.</p>
        </div>
        <div class="modal-actions">
          <button id="btn-syringe-confirm" class="btn btn-danger">INJECTER</button>
          <button id="btn-syringe-cancel" class="btn btn-outline">ANNULER</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Injection result -->
    <div id="modal-syringe-done" class="modal hidden" role="dialog" aria-modal="true">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <span class="header-tag">INJECTION</span>
        </div>
        <div class="modal-body">
          <p>Une chaleur se répand dans vos veines…</p>
          <p>Votre organisme se stabilise. Le virus ARK-41 reflue.</p>
        </div>
        <div class="modal-actions">
          <button id="btn-syringe-ok" class="btn btn-primary">FERMER</button>
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
