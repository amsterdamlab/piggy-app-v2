/* ==========================================================================
   PIGGY APP — Wallet Drawer Modal & Sliding Subscreens
   Modular subcomponent for the main Wallet Drawer (Explorar mi cuenta).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { renderIcon } from '../../icons.js';
import { AppState } from '../../state.js';
import { navigateTo } from '../../router.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions, requestMeatRedemption } from '../../services/walletService.js';
import { getDashboardStats } from '../../services/piggiesService.js';
import { openWalletRechargeSubscreen, openWalletRechargeInfo } from './WalletRechargeModal.js';
import { openWalletWithdrawalSubscreen, showRetiroSaldoModal } from './WalletWithdrawalModal.js';

/**
 * Show the full screen / bottom sheet Wallet Drawer with complete details, actions, and transaction traceability.
 * Matches the native subscreen navigation style.
 */
export function showWalletDrawer(firstName, stats, autoOpenRecharge = false, autoOpenWithdrawal = false) {
  // Remove existing
  const existing = document.getElementById('wallet-drawer-modal');
  if (existing) existing.remove();

  // Bloquear el scroll del fondo (body) para evitar scrollbars dobles o largos
  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.id = 'wallet-drawer-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  modal.innerHTML = `
    <div id="wallet-drawer-inner" class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      
      <!-- Main Content of Tu Cuenta Agro -->
      <div id="wallet-main-content" style="display:flex; flex-direction:column; height:100%; width:100%; overflow:hidden;">
         <!-- Header matching design structure (White Background) -->
         <div style="padding: 24px 24px 0 24px; background: white; flex-shrink: 0;">
            <button id="btn-back-wallet-drawer" style="background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.9rem; font-weight: 600; font-family: inherit; margin-bottom: 18px; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary, #E91E63)'" onmouseout="this.style.color='#64748b'">
              ← Volver a la Granja
            </button>
            <h2 style="margin: 0 0 6px 0; font-size: 1.75rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Tu Cuenta Agro</h2>
            <p style="margin: 0 0 18px 0; font-size: 0.92rem; color: #475569; line-height: 1.4;">Gestión e historial transaccional.</p>
            <div style="height: 1px; background: #e2e8f0; width: 100%;"></div>
         </div>

         <!-- Scrollable Body Content -->
         <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;">
            <!-- Wallet Balance Box (Premium Green Gradient) -->
            <div style="
               background: linear-gradient(135deg, #10B981 0%, #059669 100%);
               border-radius: 16px;
               padding: 22px 20px;
               margin-bottom: 20px;
               color: white;
               position: relative;
               overflow: hidden;
               box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.35);
            ">
               <!-- Decorative Wallet Icon (Line Style, difuminado y transparente) -->
               <div style="position: absolute; bottom: -10px; right: -10px; opacity: 0.14; transform: rotate(-15deg); color: white; pointer-events: none;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                     <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                     <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                     <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                  </svg>
               </div>

               <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px; font-weight:600; position:relative; z-index:2;">Saldo Disponible</div>
               <div style="font-size:2.4rem; font-weight:850; letter-spacing:-0.5px; line-height:1; margin-bottom:10px; position:relative; z-index:2;" id="drawer-main-balance" data-wallet-balance>${stats.saldoDisponibleFormatted}</div>
               <div style="font-size:0.82rem; opacity:0.95; position:relative; z-index:2;">
                  Margen Comercial Granja: <strong style="color:white; font-weight:800;">${stats.baseROIFormatted}</strong>
               </div>
            </div>

            <!-- Preventa / Diferencial Grid -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
               <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:14px; border-radius:14px; text-align:center;">
                  <div style="font-size:0.7rem; color:#64748b; margin-bottom:4px; font-weight:600;">Valor de Compra Piggys</div>
                  <div style="font-size:0.98rem; font-weight:800; color:#0f172a;">${stats.adquisicionBonosFormatted}</div>
               </div>
               <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:14px; border-radius:14px; text-align:center;">
                  <div style="font-size:0.7rem; color:#64748b; margin-bottom:4px; font-weight:600;">Valor Referencia en Mercado</div>
                  <div style="font-size:0.98rem; font-weight:800; color:#059669;">+${stats.diferencialPreventaFormatted}</div>
               </div>
            </div>

            <!-- Bonos de Consumo -->
            ${stats.referralBonus > 0 ? `
            <div id="drawer-bonos-consumo-card" style="
               background: #fff1f2;
               border: 1px solid #ffe4e6;
               padding: 14px 18px;
               border-radius: 14px;
               margin-bottom: 20px;
               display: flex;
               align-items: center;
               justify-content: space-between;
               box-shadow: 0 4px 14px rgba(190, 18, 96, 0.06);
            ">
               <div style="display: flex; flex-direction: column; gap: 4px;">
                 <div style="color: #be1260; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.5px; line-height: 1.2;">
                   BONOS DE CONSUMO
                 </div>
                 <div style="font-size: 1.45rem; font-weight: 850; color: #000000; line-height: 1.1;" id="drawer-bonos-balance">${stats.referralBonusFormatted}</div>
               </div>
               <button id="btn-canjear-carne-drawer" style="
                 background: #be1260;
                 border: 1px solid #be1260;
                 color: #ffffff;
                 font-size: 0.82rem;
                 font-weight: 800;
                 padding: 7px 15px;
                 border-radius: 10px;
                 cursor: pointer;
                 display: inline-flex;
                 align-items: center;
                 gap: 6px;
                 box-shadow: 0 2px 8px rgba(190, 18, 96, 0.2);
                 transition: transform 0.2s, opacity 0.2s;
               " onmouseover="this.style.transform='translateY(-1px)'; this.style.opacity='0.95'" onmouseout="this.style.transform='translateY(0)'; this.style.opacity='1'">
                 <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                   <line x1="3" y1="6" x2="21" y2="6"/>
                   <path d="M16 10a4 4 0 0 1-8 0"/>
                 </svg>
                 <span>Redimir</span>
               </button>
            </div>
            ` : ''}

            <!-- Main Action Buttons -->
            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
               <button id="btn-recargar-wallet-drawer" style="
                   width: 100%;
                   background: #ec4899;
                   color: white;
                   border: none;
                   padding: 16px 20px;
                   border-radius: 14px;
                   font-weight: 800;
                   font-size: 1rem;
                   cursor: pointer;
                   display: flex;
                   align-items: center;
                   justify-content: center;
                   gap: 10px;
                   box-shadow: 0 8px 20px -5px rgba(236, 72, 153, 0.5);
                   transition: all 0.2s;
                " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                  Recargar mi Cuenta
               </button>

               ${stats.saldoDisponible > 0 ? `
                  <button id="btn-retirar-saldo-drawer" style="
                     background: white;
                     color: #334155;
                     border: 2px solid #e2e8f0;
                     padding: 15px 20px;
                     border-radius: 14px;
                     font-weight: 700;
                     font-size: 0.95rem;
                     cursor: pointer;
                     width: 100%;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     gap: 10px;
                     transition: all 0.2s;
                  " onmouseover="this.style.borderColor='#10B981';this.style.color='#0f172a';" onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#334155';">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" /><rect x="6" y="8" width="12" height="12" rx="2" /><path d="M 12 11 v 6" /><path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" /></svg> 
                     Retirar mi Saldo
                  </button>
               ` : ''}
            </div>

            <!-- Trazabilidad de Movimientos (Transaction History) -->
            <div style="padding: 20px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 16px;">
               <div style="margin-bottom: 12px; display:flex; align-items:center; justify-content:space-between;">
                  <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a;">
                     Historial de Movimientos
                  </h4>
                  <span style="font-size:0.75rem; color:#64748b; font-weight:600;">Recientes</span>
               </div>

               <div id="transactions-list-drawer" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; padding-right: 4px;">
                  ${(stats.transactions || []).length === 0 ? `
                     <div style="text-align: center; padding: 30px 0; color: #94a3b8; font-size: 0.85rem;">
                        <span style="font-size:24px; display:block; margin-bottom:6px;">📂</span> No hay transacciones registradas aún.
                     </div>
                  ` : (stats.transactions || []).map((tx, i, arr) => {
                     const isDebit = tx.amount < 0;
                     const isConsumo = tx.wallet_type === 'consumo' || (tx.description && (tx.description.toLowerCase().includes('bono') || tx.description.toLowerCase().includes('consumo')));
                     const amountStr = (isDebit ? '-' : '+') + formatCOP(Math.abs(tx.amount));
                     const badgeColor = isDebit ? '#dc2626' : '#059669';
                     const badgeBg = isDebit ? '#fef2f2' : '#ecfdf5';
                     const bellIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: -2px; margin-right: 2px;"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
                     const couponIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: -2px; margin-right: 2px;"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>`;
                     const accountType = isConsumo ? couponIcon : bellIcon;
                     const dateStr = new Date(tx.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                     });
                     const isLast = i === arr.length - 1;
                     const borderBottom = isLast ? 'none' : '1px solid #e2e8f0';
                     
                     return `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: ${borderBottom};">
                           <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; padding-right: 12px; min-width: 0;">
                              <span style="font-size: 0.88rem; font-weight: 700; color: #1e293b; word-break: break-word; line-height: 1.3;">${tx.description || 'Movimiento de Cuenta'}</span>
                              <span style="font-size: 0.72rem; color: #64748b; margin-top: 2px; white-space: nowrap;">
                                <span style="font-size: 0.82rem; margin-right: 2px;">${accountType}</span> &bull; ${dateStr}
                              </span>
                           </div>
                           <span style="font-size: 0.88rem; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; padding: 6px 12px; border-radius: 8px; white-space: nowrap; flex-shrink: 0;">
                              ${amountStr}
                           </span>
                        </div>
                     `;
                  }).join('')}
               </div>
            </div>

            <!-- Footer note -->
            <div style="text-align:center; color:#94a3b8; font-size:0.75rem; margin-top: 10px; padding-bottom: 10px; display:flex; align-items:center; justify-content:center; gap:5px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: -2px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Cuentas Agro seguras y cifradas bajo protocolos SSL</span>
            </div>
         </div>
      </div>

      <!-- Dedicated Subscreen Container (Mounts sliding screens above base content) -->
      <div id="wallet-subscreen-container" style="position:absolute; inset:0; pointer-events:none; z-index:50;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeDrawer = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };

  document.getElementById('btn-back-wallet-drawer')?.addEventListener('click', closeDrawer);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeDrawer(); });

  const subscreenContainer = document.getElementById('wallet-subscreen-container');

  const updateDrawerState = (newBalance, newBonus) => {
    if (newBalance !== undefined) {
      stats.saldoDisponible = newBalance;
      stats.saldoDisponibleFormatted = formatCOP(newBalance);
      const balEl = document.getElementById('drawer-main-balance');
      if (balEl) balEl.textContent = stats.saldoDisponibleFormatted;
    }
    if (newBonus !== undefined) {
      stats.referralBonus = newBonus;
      stats.referralBonusFormatted = formatCOP(newBonus);
      const bonEl = document.getElementById('drawer-bonos-balance');
      if (bonEl) bonEl.textContent = stats.referralBonusFormatted;
    }
  };

  // Recharge trigger -> Open Sliding Subscreen
  document.getElementById('btn-recargar-wallet-drawer')?.addEventListener('click', () => {
    openWalletRechargeSubscreen(subscreenContainer, stats, updateDrawerState, closeDrawer);
  });

  // Withdrawal trigger -> Open Sliding Subscreen
  document.getElementById('btn-retirar-saldo-drawer')?.addEventListener('click', () => {
    openWalletWithdrawalSubscreen(subscreenContainer, stats?.saldoDisponible || 0, updateDrawerState, closeDrawer);
  });

  // Meat coupon redemption trigger -> Redirect to Tienda (#/gourmet)
  document.getElementById('btn-canjear-carne-drawer')?.addEventListener('click', () => {
    closeDrawer();
    window.location.hash = '#/gourmet';
    navigateTo('gourmet');
  });

  if (autoOpenRecharge) {
    openWalletRechargeSubscreen(subscreenContainer, stats, updateDrawerState, closeDrawer);
  } else if (autoOpenWithdrawal) {
    openWalletWithdrawalSubscreen(subscreenContainer, stats?.saldoDisponible || 0, updateDrawerState, closeDrawer);
  }
}

/**
 * Show the Meat Redemption pending popup (identical to Bre-B / QR confirmation design).
 */
export function openMeatRedemptionModal({ amount = null, referralBonus = 0, userName = 'Usuario', refId = null } = {}) {
  const existing = document.getElementById('meat-redemption-modal');
  if (existing) existing.remove();

  document.body.style.overflow = 'hidden';

  const finalRefId = refId || ('PGY-CRN-' + Math.floor(100000 + Math.random() * 900000));
  const displayAmount = amount !== null && amount !== undefined ? amount : referralBonus;
  const displayAmountStr = formatCOP(displayAmount);

  const modal = document.createElement('div');
  modal.id = 'meat-redemption-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  const container = document.createElement('div');
  container.className = 'animate-scale-in';
  container.style.width = '100%';
  container.style.maxWidth = '520px';
  container.style.height = '100dvh';
  container.style.maxHeight = '100dvh';
  container.style.background = 'white';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.overflow = 'hidden';
  container.style.position = 'relative';
  container.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5)';

  container.innerHTML = `
      <div style="background:linear-gradient(135deg,#16a34a,#15803d); padding:28px 24px; text-align:center; color:white; flex-shrink:0;">
        <div style="margin-bottom:12px;">
          <div style="width:58px; height:58px; background:white; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.12);">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <div style="font-weight:900; font-size:0.9rem; opacity:0.9; display:inline-flex; align-items:center; justify-content:center; gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              <path d="M13 5v2"/>
              <path d="M13 17v2"/>
              <path d="M13 11v2"/>
            </svg>
            <span>CANJE POR CARNE</span>
          </div>
        </div>
        <h3 style="margin:0 0 4px; font-size:1.35rem; font-weight:900;">¡Solicitud en Proceso!</h3>
        <p style="margin:0; font-size:0.85rem; opacity:0.92;">Estamos listos para atender tu pedido</p>
      </div>

      <div style="flex:1; overflow-y:auto; padding:24px 20px; -webkit-overflow-scrolling:touch;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:18px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed #cbd5e1;">
            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">REFERENCIA</span>
            <span style="font-size:0.85rem; color:#0f172a; font-weight:900; font-family:monospace;">#${finalRefId}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Monto a Canjear</span>
            <span style="font-size:0.95rem; font-weight:850; color:#be1260;">${displayAmountStr}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Tipo de Canje</span>
            <span style="font-size:0.85rem; font-weight:700; color:#0f172a;">Cortes Gourmet y Carne</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Estado</span>
            <span style="font-size:0.78rem; font-weight:800; background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:8px;">EN ATENCIÓN</span>
          </div>
        </div>

        <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:0.82rem; color:#065f46; line-height:1.45; display:flex; align-items:flex-start; gap:10px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Ya nos pondremos en contacto contigo para coordinar tu compra y gestionar la entrega de tus productos de carne.</span>
        </div>

        <button id="meat-redemption-close" style="
          width:100%; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none;
          padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
          box-shadow:0 4px 14px rgba(22,163,74,0.35); transition:opacity 0.2s;
          display:flex; align-items:center; justify-content:center; gap:8px;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Ir a Mi Granja</span>
        </button>
      </div>

      <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
        <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Canjes seguros · Piggy App</span>
        </p>
      </div>
  `;

  modal.appendChild(container);
  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal, #meat-redemption-modal')) {
      document.body.style.overflow = '';
    }
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('meat-redemption-close')?.addEventListener('click', () => {
    closeModal();
    window.location.href = '/#/granja';
    window.location.reload();
  });
}

/**
 * Load wallet data autonomously and show the Wallet Drawer.
 */
export async function openWalletDrawer(autoOpenRecharge = false, autoOpenWithdrawal = false) {
  try {
    const profile = AppState.get('profile');
    const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

    const piggiesList = AppState.get('piggies') || [];
    
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

    showWalletDrawer(firstName, stats, autoOpenRecharge, autoOpenWithdrawal);
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
    }, autoOpenRecharge, autoOpenWithdrawal);
  }
}
