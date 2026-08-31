/* ==========================================================================
   PIGGY APP — Wallet Drawer Modal (Tu Cuenta Agro)
   Full-featured bottom sheet / drawer modal with transaction traceability.
   Refactored from monolithic WalletBlock to maintain modularity.
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { getWalletBalance, getReferralBonusBalance } from '../../services/walletService.js';
import { getWalletTransactions, getCachedWalletTransactions } from '../../services/walletTransactionsService.js';
import { getDashboardStats } from '../../services/piggiesService.js';
import { openWalletRechargeInfo } from './WalletRechargeModal.js';
import { showRetiroSaldoModal } from './WalletWithdrawalModal.js';

/**
 * Helper to render individual transaction item.
 */
function renderTransactionItem(tx) {
  const isCredit = tx.type === 'credit' || tx.type === 'recharge' || (tx.type === 'simulation_recharge' && tx.simulation_status === 'simulated_approved');
  const isPending = tx.simulation_status === 'PENDING';
  const isRejected = tx.simulation_status === 'REJECTED' || tx.simulation_status === 'simulated_rejected';
  
  const sign = isCredit ? '+' : (tx.amount < 0 ? '-' : '');
  const absAmount = Math.abs(tx.amount);
  const color = isRejected ? '#94a3b8' : (isPending ? '#f59e0b' : (isCredit ? '#10B981' : '#0f172a'));
  
  const dateStr = tx.created_at ? new Date(tx.created_at).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Reciente';

  let badge = '';
  if (isPending) {
    badge = `<span style="font-size:0.65rem; background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">EN PROCESO</span>`;
  } else if (isRejected) {
    badge = `<span style="font-size:0.65rem; background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">RECHAZADA</span>`;
  } else if (tx.wallet_type === 'consumo' || tx.wallet_type === 'bono_consumo') {
    badge = `<span style="font-size:0.65rem; background:#ffe4e6; color:#e11d48; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:6px;">BONO CARNE</span>`;
  }

  return `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 0; border-bottom:1px solid #f1f5f9; text-decoration:${isRejected ? 'line-through' : 'none'}; opacity:${isRejected ? 0.6 : 1};">
      <div style="max-width:70%;">
        <div style="font-size:0.85rem; font-weight:700; color:#1e293b; line-height:1.25; margin-bottom:3px;">
          ${tx.description || 'Movimiento de cuenta'} ${badge}
        </div>
        <div style="font-size:0.72rem; color:#94a3b8; font-weight:500;">
          ${dateStr}
        </div>
      </div>
      <div style="font-size:0.92rem; font-weight:800; color:${color}; text-align:right; white-space:nowrap;">
        ${sign}${formatCOP(absAmount)}
      </div>
    </div>
  `;
}

/**
 * Show the full screen / bottom sheet Wallet Drawer with complete details, actions, and transaction traceability.
 * Matches the native subscreen navigation style.
 */
export function showWalletDrawer(firstName, stats = {}, autoOpenRecharge = false, autoOpenWithdrawal = false) {
  // Remove existing
  const existing = document.getElementById('wallet-drawer-modal');
  if (existing) existing.remove();

  // Bloquear el scroll del fondo (body) para evitar scrollbars dobles o largos
  document.body.style.overflow = 'hidden';

  const safeStats = {
    saldoDisponible: stats?.saldoDisponible ?? stats?.walletBalance ?? 0,
    saldoDisponibleFormatted: stats?.saldoDisponibleFormatted || formatCOP(stats?.saldoDisponible ?? stats?.walletBalance ?? 0),
    referralBonus: stats?.referralBonus ?? 0,
    referralBonusFormatted: stats?.referralBonusFormatted || formatCOP(stats?.referralBonus ?? 0),
    baseROIFormatted: stats?.baseROIFormatted || (stats?.baseROI ? `${(Number(stats.baseROI) * 100).toFixed(0)}%` : '12%'),
    adquisicionBonosFormatted: stats?.adquisicionBonosFormatted || formatCOP(stats?.adquisicionBonos ?? 0),
    diferencialPreventaFormatted: stats?.diferencialPreventaFormatted || formatCOP(stats?.diferencialPreventa ?? 0),
    transactions: stats?.transactions || []
  };

  const initialTxs = (safeStats.transactions && safeStats.transactions.length > 0)
    ? safeStats.transactions
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
               <div style="font-size:2.4rem; font-weight:850; letter-spacing:-0.5px; line-height:1; margin-bottom:10px; position:relative; z-index:2;" id="drawer-main-balance" data-wallet-balance>${safeStats.saldoDisponibleFormatted}</div>
               <div style="font-size:0.82rem; opacity:0.95; position:relative; z-index:2;">
                  Margen Comercial Granja: <strong style="color:white; font-weight:800;">${safeStats.baseROIFormatted}</strong>
               </div>
            </div>

            <!-- Preventa / Diferencial Grid -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
               <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:14px; border-radius:14px; text-align:center;">
                  <div style="font-size:0.7rem; color:#64748b; margin-bottom:4px; font-weight:600;">Valor de Compra Piggys</div>
                  <div style="font-size:0.98rem; font-weight:800; color:#0f172a;">${safeStats.adquisicionBonosFormatted}</div>
               </div>
               <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:14px; border-radius:14px; text-align:center;">
                  <div style="font-size:0.7rem; color:#64748b; margin-bottom:4px; font-weight:600;">Valor Referencia en Mercado</div>
                  <div style="font-size:0.98rem; font-weight:800; color:#059669;">+${safeStats.diferencialPreventaFormatted}</div>
               </div>
            </div>

            <!-- Bonos de Consumo -->
            ${safeStats.referralBonus > 0 ? `
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
                 <div style="font-size: 1.45rem; font-weight: 850; color: #000000; line-height: 1.1;" id="drawer-bonos-balance">${safeStats.referralBonusFormatted}</div>
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

               ${safeStats.saldoDisponible > 0 ? `
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
            <div>
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <h4 style="margin:0; font-size:1.05rem; font-weight:800; color:#0f172a;">Historial de Movimientos</h4>
                  <span style="font-size:0.75rem; color:#64748b; font-weight:600;" id="tx-count-label">
                     ${initialTxs.length} movimiento${initialTxs.length === 1 ? '' : 's'}
                  </span>
               </div>

               <div id="drawer-tx-list">
                  ${initialTxs.length > 0
                    ? initialTxs.map(renderTransactionItem).join('')
                    : `<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:0.85rem; font-weight:500;">
                         Aún no tienes movimientos registrados en tu Cuenta Agro.
                       </div>`
                  }
               </div>
            </div>

         </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Background fetch of latest transactions to update seamlessly if cache was shown
  getWalletTransactions().then(freshTxs => {
    if (freshTxs && freshTxs.length > 0) {
      const container = document.getElementById('drawer-tx-list');
      const countLabel = document.getElementById('tx-count-label');
      if (container && countLabel) {
        container.innerHTML = freshTxs.map(renderTransactionItem).join('');
        countLabel.textContent = `${freshTxs.length} movimiento${freshTxs.length === 1 ? '' : 's'}`;
      }
    }
  }).catch(err => {
    console.warn('Silent tx fetch warning in drawer:', err);
  });

  // Attach Close handlers
  const closeModal = () => {
    document.body.style.overflow = ''; // Restaurar scroll del body
    modal.classList.add('animate-fade-out');
    setTimeout(() => modal.remove(), 200);
  };

  const btnBack = document.getElementById('btn-back-wallet-drawer');
  if (btnBack) btnBack.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Attach Action Handlers
  const btnRecargar = document.getElementById('btn-recargar-wallet-drawer');
  if (btnRecargar) {
    btnRecargar.addEventListener('click', () => {
      openWalletRechargeInfo();
    });
  }

  const btnRetirar = document.getElementById('btn-retirar-saldo-drawer');
  if (btnRetirar) {
    btnRetirar.addEventListener('click', () => {
      showRetiroSaldoModal();
    });
  }

  const btnCanjearCarne = document.getElementById('btn-canjear-carne-drawer');
  if (btnCanjearCarne) {
    btnCanjearCarne.addEventListener('click', () => {
      closeModal();
      window.location.hash = '#/tienda';
    });
  }

  // Auto Open features if requested
  if (autoOpenRecharge) {
    setTimeout(() => openWalletRechargeInfo(), 250);
  } else if (autoOpenWithdrawal && safeStats.saldoDisponible > 0) {
    setTimeout(() => showRetiroSaldoModal(), 250);
  }
}

/**
 * Open the Wallet Drawer by fetching latest profile and stats.
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
  } catch (err) {
    console.error('Error opening wallet drawer:', err);
    // Fallback drawer with zero balance
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
