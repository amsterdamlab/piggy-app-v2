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
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.7)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  modal.innerHTML = `
    <div class="animate-scale-in" style="width: 100%; max-width: 620px; height: 100dvh; max-height: 100dvh; display: flex; flex-direction: column; background: var(--color-bg, #FDF2F5); overflow: hidden; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
      <!-- Header matching design screenshot -->
      <div style="padding: 24px 24px 0 24px; background: var(--color-bg, #FDF2F5); flex-shrink: 0;">
         <button id="btn-back-completed" style="background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.9rem; font-weight: 600; font-family: inherit; margin-bottom: 18px; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary, #E91E63)'" onmouseout="this.style.color='#64748b'">
           ← Volver a la Granja
         </button>
         <h2 style="margin: 0 0 6px 0; font-size: 1.75rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Ciclos Completados</h2>
         <p style="margin: 0 0 18px 0; font-size: 0.92rem; color: #475569; line-height: 1.4;">Historial de Piggys que han finalizado su etapa de engorde.</p>
         <div style="height: 1px; background: #e2e8f0; width: 100%;"></div>
      </div>

      <!-- Content (Scrollable List of Cards) -->
      <div style="flex: 1; overflow-y: auto; padding: 20px 20px 24px 20px; -webkit-overflow-scrolling: touch;">
         ${(completedPiggies || []).length === 0 ? `
           <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 18px; border: 1px solid #e2e8f0; color: #64748b; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
             <span style="font-size: 40px; display: block; margin-bottom: 12px;">🐷</span>
             Aún no tienes Piggys con ciclo finalizado.<br/>
             <span style="font-size: 0.82rem; color: #94a3b8; display: block; margin-top: 6px;">¡Sigue cuidando tu granja para que tus cerditos de engorde terminen su ciclo!</span>
           </div>
         ` : renderPiggiesList(completedPiggies, baseROI)}
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

  document.getElementById('btn-back-completed').addEventListener('click', close);
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
