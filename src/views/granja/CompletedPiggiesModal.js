/* ==========================================================================
   PIGGY APP — Completed Piggies Modal (Granja Section)
   Displays all completed piggies in a dedicated modal drawer/popup.
   ========================================================================== */

import { navigateTo } from '../../router.js';
import { renderPiggiesList } from '../GranjaView.js';

/**
 * Show Completed Piggies Modal
 * @param {Array} completedPiggies
 * @param {number} baseROI
 */
export function showCompletedPiggiesModal(completedPiggies, baseROI) {
  // Remove any existing modal
  removeCompletedPiggiesModal();

  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.id = 'completed-piggies-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '16px';
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';

  modal.innerHTML = `
    <div class="modal animate-scale-in" style="width: 100%; max-width: 520px; max-height: 85dvh; display: flex; flex-direction: column; background: white; border-radius: 20px; overflow: hidden; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);">
      <div class="modal__handle" style="margin: 10px auto 4px auto;"></div>
      <button id="btn-close-completed-modal" style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: absolute; right: 16px; top: 16px; font-size: 18px; font-weight: 700; color: #334155; cursor: pointer; transition: background 0.2s; z-index: 10;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      
      <!-- Header -->
      <div style="padding: 20px 24px 16px 24px; text-align: center; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;">
         <div style="font-size: 40px; margin-bottom: 6px; line-height: 1;">🏆</div>
         <h3 style="margin: 0 0 6px 0; font-size: 1.25rem; font-weight: 800; color: #0f172a;">Piggys en Ciclo Completado</h3>
         <p style="margin: 0; font-size: 0.82rem; color: #64748b; line-height: 1.4;">
            Historial de tus cerdos que ya finalizaron exitosamente su ciclo de engorde en la granja.
         </p>
      </div>

      <!-- Content (Scrollable List of Cards) -->
      <div style="flex: 1; overflow-y: auto; padding: 20px; -webkit-overflow-scrolling: touch;">
         ${(completedPiggies || []).length === 0 ? `
           <div style="text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; color: #64748b; font-size: 0.9rem;">
             <span style="font-size: 32px; display: block; margin-bottom: 10px;">🐷</span>
             Aún no tienes Piggys con ciclo finalizado.<br/>
             <span style="font-size: 0.8rem; color: #94a3b8; display: block; margin-top: 4px;">¡Sigue cuidando tu piara activa para madurar tus primeros ciclos!</span>
           </div>
         ` : renderPiggiesList(completedPiggies, baseROI)}
      </div>

      <!-- Footer note -->
      <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 0.75rem; color: #94a3b8; flex-shrink: 0;">
         ✨ Haz clic en cualquier tarjeta para revisar su detalle de liquidación
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close logic
  const close = () => {
    modal.remove();
    if (!document.querySelector('.modal-overlay, #wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };

  document.getElementById('btn-close-completed-modal').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Attach card click listeners inside the modal
  modal.querySelectorAll('.piggy-card').forEach((card) => {
    card.addEventListener('click', () => {
      close();
      const piggyId = card.dataset.piggyId;
      navigateTo(`piggy/${piggyId}`);
    });
  });
}

/**
 * Remove completed piggies modal if open
 */
export function removeCompletedPiggiesModal() {
  const existing = document.getElementById('completed-piggies-modal');
  if (existing) existing.remove();
}
