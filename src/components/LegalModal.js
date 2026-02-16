/* ============================================
   PIGGY APP — Legal Modal Component
   Persistent modal for Terms & Conditions
   ============================================ */

import { acceptTerms } from '../services/authService.js';
import { renderIcon } from '../icons.js';

/**
 * Render the legal modal and block interaction until accepted.
 */
export function renderLegalModal() {
    // Prevent duplicates
    if (document.getElementById('legal-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'legal-modal';
    modal.className = 'modal-overlay animate-fade-in';
    modal.innerHTML = `
    <div class="modal animate-scale-in">
      <div class="modal__header">
        <h3 class="modal__title">Antes de comenzar 🐷</h3>
      </div>
      <div class="modal__body">
        <p class="text-secondary mb-md">
          Para garantizar tu seguridad y cumplir con la normativa vigente, necesitamos que aceptes nuestros términos legales.
        </p>

        <label class="checkbox-wrapper mb-sm">
          <input type="checkbox" id="check-terms" />
          <span class="checkbox-custom"></span>
          <span class="checkbox-label">
            Acepto los <a href="#" class="text-highlight">Términos y Condiciones</a> de uso de la plataforma.
          </span>
        </label>

        <label class="checkbox-wrapper">
          <input type="checkbox" id="check-habeas" />
          <span class="checkbox-custom"></span>
          <span class="checkbox-label">
            Autorizo el tratamiento de mis datos personales según la ley de <a href="#" class="text-highlight">Habeas Data</a>.
          </span>
        </label>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary btn--block" id="btn-accept-legal" disabled>
          Continuar
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
    attachListeners(modal);
}

/**
 * Remove the legal modal.
 */
export function removeLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (modal) {
        modal.classList.add('animate-fade-out');
        setTimeout(() => modal.remove(), 300);
    }
}

/**
 * Attach listeners for checkboxes and button.
 */
function attachListeners(modal) {
    const checkTerms = modal.querySelector('#check-terms');
    const checkHabeas = modal.querySelector('#check-habeas');
    const btnAccept = modal.querySelector('#btn-accept-legal');

    function updateButtonState() {
        const allChecked = checkTerms.checked && checkHabeas.checked;
        btnAccept.disabled = !allChecked;
    }

    checkTerms.addEventListener('change', updateButtonState);
    checkHabeas.addEventListener('change', updateButtonState);

    btnAccept.addEventListener('click', async () => {
        btnAccept.disabled = true;
        btnAccept.textContent = 'Procesando...';
        await acceptTerms();
    });
}
