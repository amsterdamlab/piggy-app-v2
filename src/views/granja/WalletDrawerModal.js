/* ==========================================================================
   PIGGY APP — Wallet Drawer Modal & Sliding Subscreens
   Modular subcomponent for the main Wallet Drawer (Explorar mi cuenta).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { renderIcon } from '../../icons.js';
import { AppState } from '../../state.js';
import { navigateTo } from '../../router.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions, getCachedWalletTransactions, requestMeatRedemption } from '../../services/walletService.js';
import { getDashboardStats } from '../../services/piggiesService.js';
import { openWalletRechargeSubscreen, openWalletRechargeInfo } from './WalletRechargeModal.js';
import { openWalletWithdrawalSubscreen, showRetiroSaldoModal } from './WalletWithdrawalModal.js';

/**
 * Render transaction rows HTML for the drawer.
 */
export function renderTransactionsListHtml(transactions = []) {
  if (!transactions || transactions.length === 0) {
    return `
      <div style="text-align: center; padding: 30px 0; color: #94a3b8; font-size: 0.85rem;">
        <span style="font-size:24px; display:block; margin-bottom:6px;">📂</span> No hay transacciones registradas aún.
      </div>
    `;
  }

  return transactions.map((tx, i, arr) => {
    const isDebit = Number(tx.amount) < 0;
    const isConsumo = tx.wallet_type === 'consumo' || (tx.description && (tx.description.toLowerCase().includes('bono') || tx.description.toLowerCase().includes('consumo')));
    const amountStr = (isDebit ? '-' : '+') + formatCOP(Math.abs(Number(tx.amount)));
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
  }).join('');
}

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

  const initialTxs = (stats.transactions && stats.transactions.length > 0)
    ? stats.transactions
    : getCachedWalletTransactions();

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
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     gap: 10px;
                     transition: all 0.2s;
                  " onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
                     Retirar mi Saldo
                  </button>
               ` : ''}
            </div>

            <!-- Transaction History Section -->
            <div style="margin-top: 10px;">
               <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0;">Historial de Movimientos</h3>
                  <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">Recientes</span>
               </div>
               
               <div id="drawer-transactions-container" style="background: white; border: 1px solid #f1f5f9; border-radius: 16px; padding: 4px 16px;">
                  ${renderTransactionsListHtml(initialTxs)}
               </div>
            </div>
         </div>
      </div>

   </div>
  `;

  document.body.appendChild(modal);

  // Background fetch of latest transactions
  getWalletTransactions().then(freshTxs => {
    const container = document.getElementById('drawer-transactions-container');
    if (container && freshTxs && freshTxs.length > 0) {
      container.innerHTML = renderTransactionsListHtml(freshTxs);
    }
  }).catch(err => console.warn('Background tx fetch error in drawer:', err));

  // --- Attach Handlers ---
  const closeModal = () => {
    modal.remove();
    document.body.style.overflow = '';
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('btn-back-wallet-drawer')?.addEventListener('click', closeModal);

  document.getElementById('btn-recargar-wallet-drawer')?.addEventListener('click', () => {
    openWalletRechargeSubscreen(modal);
  });

  document.getElementById('btn-retirar-saldo-drawer')?.addEventListener('click', () => {
    const currentBalance = stats.saldoDisponible || 0;
    openWalletWithdrawalSubscreen(modal, currentBalance);
  });

  document.getElementById('btn-canjear-carne-drawer')?.addEventListener('click', () => {
    openMeatRedemptionModal(stats.referralBonus || 0);
  });

  if (autoOpenRecharge) {
    openWalletRechargeSubscreen(modal);
  } else if (autoOpenWithdrawal) {
    openWalletWithdrawalSubscreen(modal, stats.saldoDisponible || 0);
  }
}

/**
 * Open the Meat Redemption modal for Referral / Consumption bonus.
 */
export function openMeatRedemptionModal(currentBonus) {
  const existing = document.getElementById('meat-redemption-modal');
  if (existing) existing.remove();

  const packs = [
    { id: 'combo_parrillero_mini', name: 'Combo Parrillero Mini (2 kg)', cost: 50000, desc: 'Cortes premium seleccionados listos para asar.', icon: '🥩' },
    { id: 'pack_chuleton_familiar', name: 'Pack Chuletón Familiar (4 kg)', cost: 100000, desc: 'Chuletones jugosos de cerdo de granja certificada.', icon: '🍖' },
    { id: 'combo_gourmet_master', name: 'Combo Gourmet Master (7 kg)', cost: 200000, desc: 'Lomo fino, costilla especial y tocineta artesanal.', icon: '🥓' }
  ];

  const modal = document.createElement('div');
  modal.id = 'meat-redemption-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.65)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '100001';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '16px';

  modal.innerHTML = `
    <div class="animate-scale-in" style="background:white; border-radius:24px; max-width:440px; width:100%; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); display:flex; flex-direction:column; max-height:90dvh;">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg, #be123c, #9f1239); color:white; padding:22px 20px; position:relative; flex-shrink:0;">
        <button id="meat-modal-close" style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.2); border:none; color:white; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;">✕</button>
        <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; opacity:0.9; margin-bottom:4px;">Tienda Gourmet</div>
        <h3 style="margin:0; font-size:1.35rem; font-weight:800;">Redimir Bonos de Consumo</h3>
        <div style="margin-top:8px; font-size:0.85rem; opacity:0.95;">Saldo disponible: <strong>${formatCOP(currentBonus)}</strong></div>
      </div>

      <!-- Pack Options -->
      <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
        ${packs.map(p => {
          const canAfford = currentBonus >= p.cost;
          return `
            <div style="
              border: 1.5px solid ${canAfford ? '#fecdd3' : '#e2e8f0'};
              background: ${canAfford ? '#fff1f2' : '#f8fafc'};
              border-radius: 16px;
              padding: 16px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              opacity: ${canAfford ? '1' : '0.6'};
              transition: transform 0.2s;
            ">
              <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <span style="font-size:32px; line-height:1;">${p.icon}</span>
                <div>
                  <div style="font-weight:800; color:#1e293b; font-size:0.92rem;">${p.name}</div>
                  <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${p.desc}</div>
                  <div style="font-size:0.85rem; font-weight:800; color:#be123c; margin-top:4px;">${formatCOP(p.cost)} en Bonos</div>
                </div>
              </div>
              <button class="btn-canjear-pack" data-id="${p.id}" data-name="${p.name}" data-cost="${p.cost}" ${canAfford ? '' : 'disabled'} style="
                background: ${canAfford ? '#be123c' : '#cbd5e1'};
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 12px;
                font-weight: 800;
                font-size: 0.82rem;
                cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                white-space: nowrap;
                flex-shrink: 0;
                box-shadow: ${canAfford ? '0 4px 12px rgba(190,18,60,0.3)' : 'none'};
              ">
                Canjear
              </button>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('meat-modal-close')?.addEventListener('click', closeModal);

  modal.querySelectorAll('.btn-canjear-pack').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cost = Number(btn.dataset.cost);
      const name = btn.dataset.name;
      if (!confirm(`¿Confirmas el canje de "${name}" por ${formatCOP(cost)} de tus bonos de consumo?`)) return;

      btn.disabled = true;
      btn.innerText = 'Procesando...';

      const res = await requestMeatRedemption(cost, name);
      if (res.success) {
        modal.remove();
        showMeatRedemptionSuccess(name, cost);
      } else {
        alert(res.error || 'No se pudo completar el canje');
        btn.disabled = false;
        btn.innerText = 'Canjear';
      }
    });
  });
}

/**
 * Success modal after redeeming meat consumption coupons.
 */
function showMeatRedemptionSuccess(packName, cost) {
  const modal = document.createElement('div');
  modal.id = 'meat-redemption-success-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.7)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '100002';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '16px';

  const container = document.createElement('div');
  container.className = 'animate-scale-in';
  container.style.cssText = `
    background: #ffffff;
    border-radius: 24px;
    max-width: 440px;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    max-height: 90dvh;
  `;

  container.innerHTML = `
      <div style="background:linear-gradient(135deg, #16a34a, #15803d); color:white; padding:32px 24px; text-align:center; position:relative; flex-shrink:0;">
        <div style="
          width:64px; height:64px; background:rgba(255,255,255,0.2);
          border-radius:50%; margin:0 auto 16px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 12px rgba(0,0,0,0.1);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 style="margin:0 0 6px 0; font-size:1.5rem; font-weight:850; letter-spacing:-0.02em;">¡Canje Exitoso!</h3>
        <p style="margin:0; font-size:0.88rem; opacity:0.95;">Tu pedido ha sido registrado correctamente en la plataforma.</p>
      </div>

      <div style="padding:24px 20px; overflow-y:auto; flex:1; -webkit-overflow-scrolling:touch;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:18px; margin-bottom:20px;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Detalle del Producto</div>
          <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-bottom:4px;">${packName}</div>
          <div style="font-size:0.85rem; color:#16a34a; font-weight:700;">-${formatCOP(cost)} de Bonos aplicados</div>
        </div>

        <div style="background:#ecfdf5; border:1px solid #d1fae5; border-radius:14px; padding:14px; margin-bottom:20px;">
          <div style="font-size:0.8rem; color:#065f46; line-height:1.4; font-weight:500;">
            📦 Un asesor de logística se comunicará contigo vía WhatsApp para coordinar la entrega o el despacho de tu combo cárnico.
          </div>
        </div>

        <button id="meat-redemption-close" style="
          width:100%; background:#16a34a; color:white;
          border:none; padding:14px; border-radius:14px;
          font-weight:800; font-size:0.95rem; cursor:pointer;
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
    const stats = getDashboardStats(piggiesList);
    
    const [balance, referral, transactions] = await Promise.all([
      getWalletBalance(),
      getReferralBonusBalance(),
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
