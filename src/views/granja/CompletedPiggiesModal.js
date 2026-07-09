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
      <!-- Sticky Professional Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: white; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
         <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, #10B981, #059669); display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; box-shadow: 0 4px 10px rgba(16,185,129,0.3); flex-shrink: 0;">
               🏆
            </div>
            <div>
               <h3 style="margin: 0; font-size: 1.25rem; font-weight: 850; color: #0f172a; line-height: 1.2;">Ciclos Completados</h3>
               <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; margin-top: 2px;">Historial de Piggys madurados in tu granja</div>
            </div>
         </div>
         <button id="btn-close-completed-modal" style="background: #f1f5f9; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #334155; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      </div>

      <!-- Content (Scrollable List of Cards) -->
      <div style="flex: 1; overflow-y: auto; padding: 24px 20px; -webkit-overflow-scrolling: touch;">
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
