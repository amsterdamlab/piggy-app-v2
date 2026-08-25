/* ==========================================================================
   PIGGY APP — Wallet Drawer Modal
   Modular subcomponent for the main Wallet Drawer (Explorar mi cuenta).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { renderIcon } from '../../icons.js';
import { AppState } from '../../state.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions } from '../../services/walletService.js';
import { getDashboardStats } from '../../services/piggiesService.js';
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
            <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px; font-weight:600;">Saldo Disponible</div>
            <div style="font-size:2.4rem; font-weight:850; letter-spacing:-0.5px; line-height:1; margin-bottom:10px;" data-wallet-balance>${stats.saldoDisponibleFormatted}</div>
            <div style="font-size:0.82rem; opacity:0.95;">
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
         <div style="
            background: #fff1f2;
            border: 1px solid #ffe4e6;
            padding: 16px 18px;
            border-radius: 14px;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(190, 18, 96, 0.06);
         ">
            <div style="display: flex; align-items: center; gap: 8px; color: #be1260; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                <path d="M13 5v2"/>
                <path d="M13 17v2"/>
                <path d="M13 11v2"/>
              </svg>
              <span>BONOS DE CONSUMO</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="font-size: 1.45rem; font-weight: 850; color: #000000; line-height: 1;">${stats.referralBonusFormatted}</div>
              <button id="btn-canjear-carne-drawer" style="
                background: #be1260;
                border: 1px solid #be1260;
                color: #ffffff;
                font-size: 0.78rem;
                font-weight: 800;
                padding: 8px 16px;
                border-radius: 10px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(190, 18, 96, 0.2);
                transition: transform 0.2s, opacity 0.2s;
              " onmouseover="this.style.transform='translateY(-1px)'; this.style.opacity='0.95'" onmouseout="this.style.transform='translateY(0)'; this.style.opacity='1'">Canjear por Carne</button>
            </div>
            <div style="font-size: 0.72rem; color: #9f1239; margin-top: 2px; font-weight: 500; line-height: 1.3;">
              *Aplican términos y condiciones de compra.
            </div>
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
  `;

  document.body.appendChild(modal);

  // Close handlers
  const close = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };
  document.getElementById('btn-back-wallet-drawer').addEventListener('click', close);
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
