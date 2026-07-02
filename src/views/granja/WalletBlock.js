/* ==========================================================================
   PIGGY APP — Wallet Block (Granja Section)
   Main banner card and skeleton renderer.
   Re-exports modular drawer and modals for backward compatibility.
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { showWalletDrawer } from './WalletDrawerModal.js';

// Re-export modular components for 100% backward compatibility
export { showWalletDrawer, openWalletDrawer } from './WalletDrawerModal.js';
export { openWalletRechargeInfo } from './WalletRechargeModal.js';
export { showRetiroSaldoModal, showWalletRequestSuccess } from './WalletWithdrawalModal.js';

/**
 * Render the Wallet banner card (Green compact representation).
 * @param {string} firstName
 * @param {Object} stats
 * @returns {string} HTML
 */
export function renderWalletBanner(firstName, stats) {
  return `
        <!-- Wallet Banner Compact Card (Green) -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s;">
           <div class="wallet-banner-card" style="
              background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
              color: white; 
              padding: 20px 24px; 
              border-radius: 16px; 
              margin-bottom: 24px; 
              position: relative; 
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.3);
           ">
              <!-- Organic Pattern Background -->
              <div style="
                  position: absolute; 
                  top: 0; left: 0; right: 0; bottom: 0; 
                  opacity: 0.05; 
                  background-image: url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Ctext x=\\'0\\' y=\\'40\\' font-size=\\'30\\'%3E🐷%3C/text%3E%3C/svg%3E');
                  pointer-events: none;
              "></div>

              <!-- Decorative Piggy Icon -->
              <div style="position: absolute; bottom: -10px; right: -10px; opacity: 0.12; transform: rotate(-15deg); color:white;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>

              <div style="position:relative; z-index:2;">
                 <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:700;">Cuenta Agro de ${firstName}</h3>
                 
                 <div style="margin-bottom: 16px;">
                    <div style="font-size:0.75rem; opacity:0.85; margin-bottom:4px;">Saldo Disponible</div>
                    <div style="font-size:1.8rem; font-weight:850; letter-spacing: -0.5px; line-height: 1;">${stats.saldoDisponibleFormatted}</div>
                 </div>

                 <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.15); padding-top:12px; margin-bottom:16px;">
                    <span style="font-size:0.75rem; opacity:0.9;">
                       Margen Comercial Granja: <strong style="color:white; font-weight:800;">${stats.baseROIFormatted}</strong>
                    </span>
                 </div>

                 <button id="btn-explorar-cuenta" style="
                    width: 100%;
                    background: white;
                    color: #059669;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.92rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transition: transform 0.2s, box-shadow 0.2s;
                 "
                 onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.15)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg> Explorar Mi Cuenta
                 </button>
              </div>
           </div>
        </div>
  `;
}

/**
 * Render the Wallet skeleton (loading state matching compact style).
 * @param {string} firstName
 * @returns {string} HTML
 */
export function renderWalletSkeleton(firstName) {
  return `
        <!-- Stats Skeleton Compact Card -->
        <div class="section animate-fade-in-up">
           <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 20px 24px; border-radius: 16px; margin-bottom: 24px; color: white; position:relative; overflow:hidden;">
              <h3 style="margin:0 0 12px 0; font-size:1.1rem; opacity:0.9;">Cuenta Agro de ${firstName}</h3>
              <span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2); display:block; margin-bottom:6px;"></span>
              <div class="skeleton" style="width:140px; height:28px; background:rgba(255,255,255,0.3); margin-bottom:16px;"></div>
              <div class="skeleton" style="width:100%; height:40px; background:rgba(255,255,255,0.2); border-radius:12px;"></div>
              <div style="position: absolute; bottom: -10px; right: -10px; opacity: 0.15; transform: rotate(-15deg);">
                 <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>
           </div>
        </div>
  `;
}

/**
 * Attach wallet-related event listeners.
 * @param {Object} stats
 */
export function attachWalletListeners(stats) {
  const btnExplorar = document.getElementById('btn-explorar-cuenta');
  if (btnExplorar) {
    btnExplorar.addEventListener('click', () => {
      const profile = AppState.get('profile');
      const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';
      showWalletDrawer(firstName, stats);
    });
  }
}
