/* ============================================
   PIGGY APP — Wallet Block (Granja Section)
   Wallet banner, recharge modal, and withdrawal modal
   ============================================ */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions, createWalletRequest, notifyAdminViaWhatsApp } from '../../services/walletService.js';
import { getUserPiggies, getDashboardStats } from '../../services/piggiesService.js';

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

/**
 * Show the full screen / bottom sheet Wallet Drawer with complete details, actions, and transaction traceability.
 * Matches the referrals modal style and slides from the bottom.
 */
export function showWalletDrawer(firstName, stats) {
  // Remove existing
  const existing = document.getElementById('wallet-drawer-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'wallet-drawer-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in" style="max-width:440px; max-height:92vh; overflow-y:auto;">
      <div class="modal__handle"></div>
      <button class="bonus-close" id="wallet-drawer-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer; z-index:3;">&times;</button>

      <!-- Header -->
      <div style="text-align:center; padding:20px 24px 0;">
        <div style="width:64px; height:64px; background:linear-gradient(135deg,#10B981,#059669); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
        </div>
        <h3 style="margin:0 0 4px 0; font-size:1.25rem; font-weight:800; color:#111827;">Cuenta Agro de ${firstName}</h3>
        <p style="margin:0; font-size:0.8rem; color:#6b7280;">Detalles y trazabilidad de tu cuenta agropecuaria</p>
      </div>

      <!-- Main Balance Sheet -->
      <div style="padding: 20px;">
         
         <!-- Wallet Balance Box (Premium Green Gradient) -->
         <div style="
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            color: white;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 20px -4px rgba(16, 185, 129, 0.3);
         ">
            <div style="font-size:0.75rem; opacity:0.85; margin-bottom:4px;">Saldo Disponible</div>
            <div style="font-size:2.2rem; font-weight:850; letter-spacing: -0.5px; line-height: 1; margin-bottom: 8px;">${stats.saldoDisponibleFormatted}</div>
            <div style="font-size:0.8rem; opacity:0.9;">
               Margen Comercial: <strong style="color:white; font-weight:800;">${stats.baseROIFormatted}</strong>
            </div>
         </div>

         <!-- Preventa / Diferencial Grid -->
         <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background:#f9fafb; border: 1px solid #e5e7eb; padding:14px; border-radius:14px; text-align:center;">
               <div style="font-size:0.68rem; color:#6b7280; margin-bottom:4px;">Adquisición Bonos Preventa</div>
               <div style="font-size:0.95rem; font-weight:700; color:#111827;">${stats.adquisicionBonosFormatted}</div>
            </div>
            <div style="background:#f9fafb; border: 1px solid #e5e7eb; padding:14px; border-radius:14px; text-align:center;">
               <div style="font-size:0.68rem; color:#6b7280; margin-bottom:4px;">Diferencial de Preventa</div>
               <div style="font-size:0.95rem; font-weight:700; color:#059669;">+${stats.diferencialPreventaFormatted}</div>
            </div>
         </div>

         <!-- Bonos de Consumo -->
         ${stats.referralBonus > 0 ? `
         <div style="background:#fffbeb; border:1px solid #fef3c7; padding:12px 16px; border-radius:14px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:0.72rem; color:#b45309; margin-bottom:2px;">🎁 Bonos de Consumo</div>
              <div style="font-size:1.05rem; font-weight:700; color:#92400e;">${stats.referralBonusFormatted}</div>
            </div>
            <button id="btn-canjear-carne-drawer" style="
              background: #d97706;
              border: none;
              color: white;
              font-size: 0.72rem;
              font-weight: 700;
              padding: 6px 12px;
              border-radius: 8px;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(217,119,6,0.2);
            ">Canjear por carne</button>
         </div>
         ` : ''}

         <!-- Main Action Buttons -->
         <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:24px;">
            <button id="btn-recargar-wallet-drawer" style="
               width: 100%;
               background: linear-gradient(135deg, #10B981, #059669);
               color: white;
               border: none;
               padding: 14px 20px;
               border-radius: 12px;
               font-weight: 700;
               font-size: 0.95rem;
               cursor: pointer;
               display: flex;
               align-items: center;
               justify-content: center;
               gap: 8px;
               box-shadow: 0 4px 12px rgba(16,185,129,0.25);
            ">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
               Recargar mi Cuenta
            </button>

            ${stats.saldoDisponible > 0 ? `
               <button id="btn-retirar-saldo-drawer" style="
                  background: white;
                  color: #374151;
                  border: 2px solid #e5e7eb;
                  padding: 13px 20px;
                  border-radius: 12px;
                  font-weight: 700;
                  font-size: 0.92rem;
                  cursor: pointer;
                  width: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  transition: border 0.2s;
               " onmouseover="this.style.borderColor='#10B981'" onmouseout="this.style.borderColor='#e5e7eb'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" /><rect x="6" y="8" width="12" height="12" rx="2" /><path d="M 12 11 v 6" /><path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" /></svg> 
                  Retirar mi Saldo
               </button>
            ` : ''}
         </div>

         <!-- Trazabilidad de Movimientos (Transaction History) -->
         <div style="padding: 18px; border-radius: 16px; background: #f9fafb; border: 1px solid #e5e7eb; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
               <h4 style="margin: 0; font-size: 0.9rem; font-weight: 800; color: #374151; display: flex; align-items: center; gap: 6px;">
                  <span>🧾</span> Historial de Movimientos
               </h4>
               <span style="font-size: 0.68rem; color: #4b5563; font-weight: 700; background: #e5e7eb; padding: 4px 8px; border-radius: 6px;">
                  ${(stats.transactions || []).length} transacción(es)
               </span>
            </div>

            <div id="transactions-list-drawer" style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 2px;">
               ${(stats.transactions || []).length === 0 ? `
                  <div style="text-align: center; padding: 20px 0; color: #9ca3af; font-size: 0.8rem;">
                     <span style="font-size:20px; display:block; margin-bottom:4px;">📂</span> No hay transacciones registradas aún.
                  </div>
               ` : (stats.transactions || []).map(tx => {
                  const isDebit = tx.amount < 0;
                  const isConsumo = tx.wallet_type === 'consumo';
                  const amountStr = (isDebit ? '-' : '+') + formatCOP(Math.abs(tx.amount));
                  const badgeColor = isDebit ? '#dc2626' : '#059669';
                  const badgeBg = isDebit ? '#fef2f2' : '#ecfdf5';
                  const accountType = isConsumo ? 'Consumo' : 'Comercio';
                  const dateStr = new Date(tx.created_at).toLocaleDateString('es-CO', {
                     day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  });
                  
                  return `
                     <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 12px 14px; border-radius: 12px; background: white; border: 1px solid #f3f4f6; margin-bottom: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; padding-right: 12px; min-width: 0;">
                           <span style="font-size: 0.85rem; font-weight: 700; color: #374151; word-break: break-word; line-height: 1.3;">${tx.description || 'Movimiento de Cuenta'}</span>
                           <span style="font-size: 0.7rem; color: #9ca3af; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                             <strong style="font-weight: 800;">${accountType}</strong> &bull; ${dateStr}
                           </span>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; padding: 6px 10px; border-radius: 8px; white-space: nowrap; flex-shrink: 0; margin-top: -2px;">
                           ${amountStr}
                        </span>
                     </div>
                  `;
               }).join('')}
            </div>
         </div>

         <!-- Footer note -->
         <div style="text-align:center; color:#9ca3af; font-size:0.7rem; margin-top: 16px;">
             🔒 Cuentas Agro seguras y cifradas bajo protocolos SSL
         </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const close = () => modal.remove();
  document.getElementById('wallet-drawer-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Recharge trigger
  document.getElementById('btn-recargar-wallet-drawer')?.addEventListener('click', () => {
    close();
    openWalletRechargeInfo();
  });

  // Withdrawal trigger
  document.getElementById('btn-retirar-saldo-drawer')?.addEventListener('click', () => {
    close();
    showRetiroSaldoModal(stats?.saldoDisponible || 0);
  });

  // Meat coupon redemption trigger
  document.getElementById('btn-canjear-carne-drawer')?.addEventListener('click', () => {
    close();
    const ADMIN_WHATSAPP = '573154870448';
    const profile = AppState.get('profile');
    const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
    const referralBonusStr = formatCOP(stats.referralBonus);
    const msg = `🥩 *PIGGY APP — Canje de Bonos de Consumo (Referidos)*\n\n👤 *Usuario:* ${userName}\n\n🎁 Hola, deseo canjear mi saldo de bonos de consumo (${referralBonusStr}) por productos de carne.\n\n⚡ Por favor, indícame los pasos a seguir.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  });
}

/**
 * Show Wallet Recharge Info modal with WhatsApp contact.
 * Informs user how to top up their wallet balance.
 */
export async function openWalletRechargeInfo() {
  // Remove existing
  const existing = document.getElementById('wallet-recharge-modal');
  if (existing) existing.remove();

  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const ADMIN_WHATSAPP = '573154870448';

  const modal = document.createElement('div');
  modal.id = 'wallet-recharge-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal animate-scale-in" style="max-width:380px; padding:28px 24px; text-align:center;">
      <button id="recharge-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; color:#9ca3af;">&#x2715;</button>

      <div style="width:64px; height:64px; background:linear-gradient(135deg,#10B981,#059669); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
      </div>

      <h3 style="margin:0 0 8px; font-size:1.2rem; font-weight:800; color:#1f2937;">Recargar mi Cuenta</h3>
      <p style="color:#6b7280; font-size:0.9rem; margin:0 0 24px; line-height:1.5;">
        Para recargar tu cuenta y poder comprar Piggys, comunícate con nuestro equipo por WhatsApp.
      </p>

      <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:12px; padding:16px; margin-bottom:24px; text-align:left;">
        <div style="font-size:0.8rem; font-weight:700; color:#065f46; margin-bottom:8px;">&#128197; Proceso de Recarga:</div>
        <div style="font-size:0.82rem; color:#047857; line-height:1.8;">
          <div>1. Toca el boton de WhatsApp abajo</div>
          <div>2. Indica el monto que deseas recargar</div>
          <div>3. Realiza la transferencia bancaria</div>
          <div>4. Tu saldo se actualiza en 24 horas</div>
        </div>
      </div>

      <button id="recharge-whatsapp-btn" style="
        width: 100%;
        background: linear-gradient(135deg, #25D366, #128C7E);
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(37,211,102,0.35);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.122 1.528 5.855L0 24l6.336-1.506A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.37l-.36-.213-3.727.885.916-3.623-.234-.373A9.818 9.818 0 0 1 2.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/></svg>
        Contactar por WhatsApp
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  // Close
  const close = () => modal.remove();
  document.getElementById('recharge-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // WhatsApp
  document.getElementById('recharge-whatsapp-btn').addEventListener('click', () => {
    const msg = `\u{1F430} *PIGGY APP \u2014 Solicitud de Recarga de Cuenta*\n\n\u{1F464} *Usuario:* ${userName}\n\n\u{1F4B0} Hola, deseo recargar mi cuenta para comprar Piggys.\n\n\u{1F4CB} Por favor ind\u00EDcame el n\u00FAmero de cuenta y el proceso a seguir.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  });
}


/**
 * Unified "Retirar mi Saldo" modal — multi-step flow.
 * Step 1: Choose type (Dinero o Consumo)
 * Step 2a (Dinero): Enter amount + choose bank -> WhatsApp
 * Step 2b (Consumo): Enter amount -> "Solicitar Bonos de Consumo" -> WhatsApp
 */
function showRetiroSaldoModal(availableAmount) {
  const existing = document.getElementById('retiro-modal');
  if (existing) existing.remove();

  const ADMIN_WHATSAPP = '573154870448';
  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const userPhone = profile?.phone_number || '';
  const minAmount = 10000;
  const BANKS = ['Bancolombia', 'Davivienda', 'BBVA', 'Nequi', 'Daviplata', 'Banco de Bogota', 'Scotiabank Colpatria', 'Otro'];

  const modal = document.createElement('div');
  modal.id = 'retiro-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  const renderStep1 = () => `
    <div class="modal animate-scale-in" style="position:relative; padding-bottom:8px;">
      <div class="modal__handle"></div>
      <button id="retiro-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; z-index:3;">&times;</button>
      <div style="text-align:center; padding:20px 24px 0;">
        <div style="width:64px; height:64px; background:linear-gradient(135deg,#10B981,#059669); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" /><rect x="6" y="8" width="12" height="12" rx="2" /><path d="M 12 11 v 6" /><path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" /></svg>
        </div>
        <h3 style="margin:0 0 6px; font-size:1.2rem; font-weight:800; color:#111827;">Retirar mi Saldo</h3>
        <p style="margin:0 0 16px; font-size:0.82rem; color:#6b7280;">Saldo disponible: <strong style="color:#059669;">${formatCOP(availableAmount)}</strong></p>
      </div>
      <div style="padding:0 20px 24px; display:flex; flex-direction:column; gap:12px;">
        <p style="text-align:center; font-size:0.85rem; font-weight:600; color:#374151; margin:0 0 4px;">Como deseas tu saldo?</p>
        <button id="retiro-tipo-dinero" style="background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:18px 20px; border-radius:14px; font-weight:700; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; gap:14px; box-shadow:0 4px 12px rgba(16,185,129,0.3);">
          <span style="font-size:26px;">&#127968;</span>
          <div style="text-align:left;">
            <div>Dinero en cuenta</div>
            <div style="font-size:0.72rem; opacity:0.85; font-weight:500;">Transferencia bancaria a tu cuenta</div>
          </div>
        </button>
        <button id="retiro-tipo-consumo" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:18px 20px; border-radius:14px; font-weight:700; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; gap:14px; box-shadow:0 4px 12px rgba(245,158,11,0.3);">
          <span style="font-size:26px;">&#129385;</span>
          <div style="text-align:left;">
            <div>Bonos de Consumo</div>
            <div style="font-size:0.72rem; opacity:0.85; font-weight:500;">Canjear por productos de carne</div>
          </div>
        </button>
      </div>
    </div>
  `;

  const renderStep2Dinero = () => `
    <div class="modal animate-scale-in" style="position:relative; padding-bottom:8px;">
      <div class="modal__handle"></div>
      <button id="retiro-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; z-index:3;">&times;</button>
      <button id="retiro-back" style="background:none; border:none; position:absolute; left:16px; top:18px; font-size:13px; color:#6b7280; cursor:pointer; z-index:3; font-weight:600;">&larr; Volver</button>
      <div style="text-align:center; padding:20px 24px 0;">
        <div style="font-size:36px; margin-bottom:8px;">&#127968;</div>
        <h3 style="margin:0 0 4px; font-size:1.1rem; font-weight:800; color:#111827;">Retiro de Dinero</h3>
        <p style="margin:0 0 16px; font-size:0.8rem; color:#6b7280;">Disponible: <strong style="color:#059669;">${formatCOP(availableAmount)}</strong></p>
      </div>
      <div style="padding:0 20px 24px; display:flex; flex-direction:column; gap:12px;">
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">Monto a retirar</label>
          <div style="position:relative;">
            <input type="number" id="retiro-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:12px 50px 12px 14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem; font-weight:700; color:#111827; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e5e7eb';" />
            <button type="button" id="btn-todo-retiro" onclick="document.getElementById('retiro-amount').value='${availableAmount}'; document.getElementById('retiro-amount').dispatchEvent(new Event('input'));" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:#ecfdf5; border:1px solid #a7f3d0; color:#059669; font-weight:700; cursor:pointer; padding:4px 10px; border-radius:8px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="retiro-amount-error" style="font-size:0.72rem; color:#dc2626; margin-top:4px; display:none;"></div>
        </div>
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">Banco destino</label>
          <select id="retiro-bank" style="width:100%; padding:12px 14px; border:2px solid #e5e7eb; border-radius:12px; font-size:0.95rem; color:#111827; outline:none; background:white; box-sizing:border-box; cursor:pointer; transition:border 0.2s;"
            onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e5e7eb';">
            <option value="">Selecciona tu banco</option>
            ${BANKS.map(b => '<option value="' + b + '">' + b + '</option>').join('')}
          </select>
        </div>
        <button id="retiro-confirm-dinero" style="width:100%; margin-top:16px; margin-bottom:8px; display:block; background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:14px 20px; border-radius:12px; font-weight:700; font-size:1rem; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.3);">
          Solicitar Retiro via WhatsApp
        </button>
        <p style="text-align:center; font-size:0.75rem; color:#9ca3af; margin:0;">Nuestro equipo procesará el retiro de tu dinero en máximo 48 horas.</p>
      </div>
    </div>
  `;

  const renderStep2Consumo = () => `
    <div class="modal animate-scale-in" style="position:relative; padding-bottom:8px;">
      <div class="modal__handle"></div>
      <button id="retiro-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; z-index:3;">&times;</button>
      <button id="retiro-back" style="background:none; border:none; position:absolute; left:16px; top:18px; font-size:13px; color:#6b7280; cursor:pointer; z-index:3; font-weight:600;">&larr; Volver</button>
      <div style="text-align:center; padding:20px 24px 0;">
        <div style="font-size:36px; margin-bottom:8px;">&#129385;</div>
        <h3 style="margin:0 0 4px; font-size:1.1rem; font-weight:800; color:#111827;">Bonos de Consumo</h3>
        <p style="margin:0 0 16px; font-size:0.8rem; color:#6b7280;">Disponible: <strong style="color:#d97706;">${formatCOP(availableAmount)}</strong></p>
      </div>
      <div style="padding:0 20px 24px; display:flex; flex-direction:column; gap:12px;">
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">Cuanto saldo deseas en bonos?</label>
          <div style="position:relative;">
            <input type="number" id="consumo-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:12px 50px 12px 14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem; font-weight:700; color:#111827; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#f59e0b';" onblur="this.style.borderColor='#e5e7eb';" />
            <button type="button" id="btn-todo-consumo" onclick="document.getElementById('consumo-amount').value='${availableAmount}'; document.getElementById('consumo-amount').dispatchEvent(new Event('input'));" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:#fffbeb; border:1px solid #fcd34d; color:#d97706; font-weight:700; cursor:pointer; padding:4px 10px; border-radius:8px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="consumo-amount-error" style="font-size:0.72rem; color:#dc2626; margin-top:4px; display:none;"></div>
        </div>
        <button id="retiro-confirm-consumo" style="width:100%; margin-top:16px; margin-bottom:8px; display:block; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:14px 20px; border-radius:12px; font-weight:700; font-size:1rem; cursor:pointer; box-shadow:0 4px 12px rgba(245,158,11,0.3);">
          Solicitar Bonos de Consumo via WhatsApp
        </button>
        <p style="text-align:center; font-size:0.75rem; color:#9ca3af; margin:0;">Nuestro equipo procesará el canje de tus bonos una vez realices tu compra de carne.</p>
      </div>
    </div>
  `;

  const attachClose = (onBack) => {
    document.getElementById('retiro-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    if (onBack) document.getElementById('retiro-back')?.addEventListener('click', onBack);
  };

  const goToStep1 = () => {
    modal.innerHTML = renderStep1();
    attachClose(null);
    document.getElementById('retiro-tipo-dinero')?.addEventListener('click', goToStep2Dinero);
    document.getElementById('retiro-tipo-consumo')?.addEventListener('click', goToStep2Consumo);
  };

  const goToStep2Dinero = () => {
    modal.innerHTML = renderStep2Dinero();
    attachClose(goToStep1);
    document.getElementById('retiro-confirm-dinero')?.addEventListener('click', async () => {
      const errDiv = document.getElementById('retiro-amount-error');
      const amount = parseFloat(document.getElementById('retiro-amount')?.value || 0);
      const bank = document.getElementById('retiro-bank')?.value;
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto minimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
      if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
      if (!bank) { errDiv.textContent = 'Selecciona un banco'; errDiv.style.display = 'block'; return; }
      
      const btn = document.getElementById('retiro-confirm-dinero');
      btn.innerText = 'Procesando...';
      btn.disabled = true;

      errDiv.style.display = 'none';
      
      const res = await createWalletRequest('withdrawal', amount, bank);
      if (!res.success) {
        errDiv.textContent = res.reason || 'Error al procesar la solicitud'; 
        errDiv.style.display = 'block';
        btn.innerText = 'Solicitar Retiro via WhatsApp';
        btn.disabled = false;
        return;
      }

      notifyAdminViaWhatsApp('withdrawal', amount, userName, userPhone, bank, res.requestId);
      showWalletRequestSuccess('withdrawal', amount, bank, res.requestId);
      modal.remove();
    });
  };

  const goToStep2Consumo = () => {
    modal.innerHTML = renderStep2Consumo();
    attachClose(goToStep1);
    document.getElementById('retiro-confirm-consumo')?.addEventListener('click', async () => {
      const errDiv = document.getElementById('consumo-amount-error');
      const amount = parseFloat(document.getElementById('consumo-amount')?.value || 0);
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto minimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
      if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
      
      const btn = document.getElementById('retiro-confirm-consumo');
      btn.innerText = 'Procesando...';
      btn.disabled = true;

      errDiv.style.display = 'none';
      
      const res = await createWalletRequest('consumption', amount, null);
      if (!res.success) {
        errDiv.textContent = res.reason || 'Error al procesar la solicitud'; 
        errDiv.style.display = 'block';
        btn.innerText = 'Solicitar Bonos de Consumo via WhatsApp';
        btn.disabled = false;
        return;
      }

      notifyAdminViaWhatsApp('consumption', amount, userName, userPhone, null, res.requestId);
      showWalletRequestSuccess('consumption', amount, null, res.requestId);
      modal.remove();
    });
  };

  document.body.appendChild(modal);
  goToStep1();
}

/**
 * Show success confirmation after wallet request.
 */
export function showWalletRequestSuccess(requestType, amount, bank, requestId) {
  const isWithdrawal = requestType === 'withdrawal';
  const shortId = requestId ? requestId.slice(-8).toUpperCase() : Date.now().toString().slice(-6);
  const typeLabel = isWithdrawal ? 'Retiro' : 'Consumo';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal animate-scale-in text-center" style="max-width:400px;">
      <button class="bonus-close" id="wallet-success-close-x" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
      <div style="width:60px; height:60px; background:${isWithdrawal ? '#d1fae5' : '#fef3c7'}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          <span style="font-size:28px;">${isWithdrawal ? '\u2705' : '\u{1F969}'}</span>
      </div>
      <h3 style="margin:0 0 8px; font-size:1.15rem; font-weight:800; color:#1f2937;">Solicitud de ${typeLabel} Recibida</h3>
      <p style="color:#6b7280; font-size:0.9rem; margin:0 0 16px;">
        Tu solicitud de <strong>${typeLabel.toLowerCase()}</strong> por <strong>${formatCOP(amount)}</strong>${isWithdrawal && bank ? ` a <strong>${bank}</strong>` : ''} ha sido registrada.
      </p>

      <div style="background:#f9fafb; padding:14px; border-radius:10px; margin-bottom:16px; text-align:left; font-size:0.85rem;">
          <div style="margin-bottom:4px;"><strong>Comprobante:</strong> #${typeLabel.toUpperCase().slice(0, 3)}-${shortId}</div>
          <div style="margin-bottom:4px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</div>
          <div><strong>Estado:</strong> <span style="color:#f59e0b; font-weight:600;">Pendiente</span></div>
      </div>

      <p style="color:#9ca3af; font-size:0.78rem; margin:0 0 20px;">
        ${isWithdrawal
      ? 'Nuestro equipo procesar\u00E1 tu retiro en un plazo m\u00E1ximo de 3 d\u00EDas h\u00E1biles. Te enviaremos un mensaje de WhatsApp para confirmar.'
      : 'Nuestro equipo se comunicar\u00E1 contigo por WhatsApp para coordinar la entrega de tu pedido.'}
      </p>

      <button class="btn btn--primary btn--block" id="wallet-success-close" style="width:100%; background:linear-gradient(135deg, #10B981, #059669); border:none; color:white; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('wallet-success-close').addEventListener('click', closeModal);
  document.getElementById('wallet-success-close-x').addEventListener('click', closeModal);
}

/**
 * Load wallet data autonomously and show the Wallet Drawer.
 */
export async function openWalletDrawer(autoOpenRecharge = false) {
  try {
    const profile = AppState.get('profile');
    const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

    // Load piggies to calculate stats accurately
    const piggies = AppState.get('piggies') || await getUserPiggies();
    const piggiesList = Array.isArray(piggies) ? piggies : [];
    
    const [balance, referral, stats, transactions] = await Promise.all([
      getWalletBalance(),
      getReferralBonusBalance(),
      getDashboardStats(piggiesList),
      getWalletTransactions()
    ]);

    stats.walletBalance            = balance;
    stats.referralBonus            = referral;
    stats.referralBonusFormatted   = formatCOP(referral);
    stats.saldoDisponible          = balance;
    stats.saldoDisponibleFormatted = formatCOP(balance);
    stats.transactions             = transactions;

    showWalletDrawer(firstName, stats);

    if (autoOpenRecharge) {
      openWalletRechargeInfo();
    }
  } catch (error) {
    console.error('Error opening autonomous wallet drawer:', error);
    // Fallback in case of failure
    const profile = AppState.get('profile');
    const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';
    showWalletDrawer(firstName, {
      saldoDisponible: 0,
      saldoDisponibleFormatted: formatCOP(0),
      referralBonus: 0,
      referralBonusFormatted: formatCOP(0),
      baseROIFormatted: '12%',
      adquisicionBonosFormatted: formatCOP(0),
      diferencialPreventaFormatted: formatCOP(0),
      transactions: []
    });

    if (autoOpenRecharge) {
      openWalletRechargeInfo();
    }
  }
}
