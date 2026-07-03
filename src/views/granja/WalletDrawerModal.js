/* ==========================================================================
   PIGGY APP — Wallet Drawer Modal
   Modular subcomponent for the main Wallet Drawer (Explorar mi cuenta).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions } from '../../services/walletService.js';
import { getUserPiggies, getDashboardStats } from '../../services/piggiesService.js';
import { openWalletRechargeInfo } from './WalletRechargeModal.js';
import { showRetiroSaldoModal } from './WalletWithdrawalModal.js';

/**
 * Show the full screen / bottom sheet Wallet Drawer with complete details, actions, and transaction traceability.
 * Matches the referrals modal style and slides from the bottom.
 */
export function showWalletDrawer(firstName, stats) {
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
    <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <!-- Sticky Professional Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#10B981,#059669); display:flex; align-items:center; justify-content:center; color:white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          </div>
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Cuenta Agro de ${firstName}</div>
            <div style="font-size:0.75rem; color:#64748b; font-weight:500;">Gestión e historial transaccional</div>
          </div>
        </div>
        <button id="wallet-drawer-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
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
            <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px; font-weight:600;">Saldo Disponible</div>
            <div style="font-size:2.4rem; font-weight:850; letter-spacing:-0.5px; line-height:1; margin-bottom:10px;" data-wallet-balance>${stats.saldoDisponibleFormatted}</div>
            <div style="font-size:0.82rem; opacity:0.95;">
               Margen Comercial: <strong style="color:white; font-weight:800;">${stats.baseROIFormatted}</strong>
            </div>
         </div>

         <!-- Preventa / Diferencial Grid -->
         <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:14px; border-radius:14px; text-align:center;">
               <div style="font-size:0.7rem; color:#64748b; margin-bottom:4px; font-weight:600;">Adquisición Bonos Preventa</div>
               <div style="font-size:0.98rem; font-weight:800; color:#0f172a;">${stats.adquisicionBonosFormatted}</div>
            </div>
            <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:14px; border-radius:14px; text-align:center;">
               <div style="font-size:0.7rem; color:#64748b; margin-bottom:4px; font-weight:600;">Diferencial de Preventa</div>
               <div style="font-size:0.98rem; font-weight:800; color:#059669;">+${stats.diferencialPreventaFormatted}</div>
            </div>
         </div>

         <!-- Bonos de Consumo -->
         ${stats.referralBonus > 0 ? `
         <div style="background:#fffbeb; border:1px solid #fde68a; padding:14px 16px; border-radius:14px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:0.75rem; color:#b45309; margin-bottom:2px; font-weight:700;">🎁 Bonos de Consumo</div>
              <div style="font-size:1.1rem; font-weight:800; color:#92400e;">${stats.referralBonusFormatted}</div>
            </div>
            <button id="btn-canjear-carne-drawer" style="
              background: #d97706;
              border: none;
              color: white;
              font-size: 0.75rem;
              font-weight: 700;
              padding: 8px 14px;
              border-radius: 10px;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(217,119,6,0.25);
            ">Canjear por carne</button>
         </div>
         ` : ''}

         <!-- Main Action Buttons -->
         <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
            <button id="btn-recargar-wallet-drawer" style="
               width: 100%;
               background: linear-gradient(135deg, #10B981, #059669);
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
               box-shadow: 0 4px 14px rgba(16,185,129,0.3);
               transition: all 0.2s;
            " onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
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
                  const isConsumo = tx.wallet_type === 'consumo';
                  const amountStr = (isDebit ? '-' : '+') + formatCOP(Math.abs(tx.amount));
                  const badgeColor = isDebit ? '#dc2626' : '#059669';
                  const badgeBg = isDebit ? '#fef2f2' : '#ecfdf5';
                  const accountType = isConsumo ? '🥩' : '🔔';
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
         <div style="text-align:center; color:#94a3b8; font-size:0.75rem; margin-top: 10px; padding-bottom: 10px;">
             🔒 Cuentas Agro seguras y cifradas bajo protocolos SSL
         </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const close = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };
  document.getElementById('wallet-drawer-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Recharge trigger
  document.getElementById('btn-recargar-wallet-drawer')?.addEventListener('click', () => {
    close();
    openWalletRechargeInfo(stats);
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
