/* ============================================
   PIGGY APP — Wallet Block (Granja Section)
   Wallet banner, recharge modal, and withdrawal modal
   ============================================ */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions, createWalletRequest, notifyAdminViaWhatsApp, rechargeWallet } from '../../services/walletService.js';
import { openWompiWidget, getWompiEnvironment } from '../../services/wompiService.js';
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
 * Matches the referrals modal style and slides from the bottom.export function showWalletDrawer(firstName, stats) {
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
  modal.style.background = '#0f172a';
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
 * Show the new multi-step Wallet Recharge modal:
 * Step 1: Amount selector
 * Step 2: Payment method (Wompi Simulation or WhatsApp)
 * Step 3: Wompi Simulator Widget
 * Step 4: Processing animation
 * Step 5: Success / Failure receipt
 *
 * @param {Object} liveStats - The stats object used by the current drawer (mutated in-place for mock mode)
 */
export async function openWalletRechargeInfo(liveStats = null) {
  const existing = document.getElementById('wallet-recharge-modal');
  if (existing) existing.remove();

  // Bloquear el scroll del fondo (body) para evitar scrollbars dobles o largos
  document.body.style.overflow = 'hidden';

  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const ADMIN_WHATSAPP = '573154870448';

  // Shared mutable mock state so that the drawer updates after simulation
  const mockState = {
    balance: liveStats?.saldoDisponible || 0,
    transactions: [...(liveStats?.transactions || [])],
  };

  const modal = document.createElement('div');
  modal.id = 'wallet-recharge-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = '#0f172a';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';
  document.body.appendChild(modal);

  const close = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  /* ── QUICK AMOUNT PRESETS ── */
  const PRESETS = [50000, 100000, 200000, 500000];
  let selectedAmount = 100000;
  let activeMethod = 'wompi_widget';

  /* ─────────────────────────────────────────
     STEP 1 — Amount selector
  ───────────────────────────────────────── */
  const renderStep1 = () => {
    modal.innerHTML = `
      <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        ${getWompiEnvironment() === 'sandbox' ? `
          <div style="background:#fef9c3; border-bottom:1px solid #fde047; padding:8px 16px; text-align:center; color:#854d0e; font-size:0.75rem; font-weight:700; flex-shrink:0;">
            🧪 MODO PRUEBAS (SANDBOX) — Recargas simuladas sin cobro real
          </div>
        ` : ''}
        <!-- Sticky Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#10B981,#059669); display:flex; align-items:center; justify-content:center; color:white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <div>
              <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Recargar Cuenta Agro</div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:500;">Selecciona el monto que deseas ingresar</div>
            </div>
          </div>
          <button id="rch-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:24px 20px; -webkit-overflow-scrolling:touch;">
          <!-- Preset buttons -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
            ${PRESETS.map(p => `
              <button class="preset-btn" data-amount="${p}" style="
                padding:16px 12px;
                border-radius:14px;
                border:2px solid ${selectedAmount === p ? '#10B981' : '#e5e7eb'};
                background:${selectedAmount === p ? '#ecfdf5' : 'white'};
                color:${selectedAmount === p ? '#059669' : '#374151'};
                font-weight:800;
                font-size:0.95rem;
                cursor:pointer;
                transition:all 0.15s;
              ">${formatCOP(p)}</button>
            `).join('')}
          </div>

          <!-- Custom amount -->
          <div style="margin-bottom:24px;">
            <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:8px;">O ingresa un monto personalizado</label>
            <div style="position:relative;">
              <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
              <input type="number" id="rch-custom-amount" placeholder="Ej: 150000" min="10000"
                value="${PRESETS.includes(selectedAmount) ? '' : selectedAmount}"
                style="width:100%; padding:14px 16px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
                onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e2e8f0';" />
            </div>
          </div>

          <!-- CTA -->
          <button id="rch-step1-next" style="
            width:100%; background:linear-gradient(135deg,#10B981,#059669); color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
            box-shadow:0 4px 14px rgba(16,185,129,0.35); transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; gap:8px;
          ">Continuar <span style="font-size:1.1rem;">→</span></button>
        </div>
      </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);

    // Preset selection
    modal.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAmount = parseInt(btn.dataset.amount);
        document.getElementById('rch-custom-amount').value = '';
        renderStep1();
      });
    });

    // Custom amount input
    document.getElementById('rch-custom-amount').addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      if (!isNaN(v) && v > 0) selectedAmount = v;
    });

    document.getElementById('rch-step1-next').addEventListener('click', () => {
      const customVal = parseInt(document.getElementById('rch-custom-amount').value);
      if (!isNaN(customVal) && customVal >= 10000) selectedAmount = customVal;
      if (!selectedAmount || selectedAmount < 10000) {
        alert('El monto mínimo de recarga es $10.000');
        return;
      }
      renderStep2();
    });
  };

  /* ─────────────────────────────────────────
     STEP 2 — Payment method chooser
  ───────────────────────────────────────── */
  const renderStep2 = () => {
    modal.innerHTML = `
      <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        ${getWompiEnvironment() === 'sandbox' ? `
          <div style="background:#fef9c3; border-bottom:1px solid #fde047; padding:8px 16px; text-align:center; color:#854d0e; font-size:0.75rem; font-weight:700; flex-shrink:0;">
            🧪 MODO PRUEBAS (SANDBOX) — Recargas simuladas sin cobro real
          </div>
        ` : ''}
        <!-- Sticky Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button id="rch-back" style="background:#f1f5f9; border:none; padding:8px 12px; border-radius:10px; font-size:0.82rem; font-weight:700; color:#334155; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">← Volver</button>
            <div>
              <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Método de Pago</div>
              <div style="font-size:0.75rem; color:#059669; font-weight:700;">Monto a ingresar: ${formatCOP(selectedAmount)}</div>
            </div>
          </div>
          <button id="rch-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:14px; -webkit-overflow-scrolling:touch;">
          <!-- Wompi Real / JS Widget Option -->
          <button id="rch-wompi-btn" style="
            background:linear-gradient(135deg,#6C14D0,#9B1DBA);
            color:white; border:none; padding:20px; border-radius:16px;
            font-weight:700; font-size:1rem; cursor:pointer;
            display:flex; align-items:center; gap:16px;
            box-shadow:0 6px 20px rgba(108,20,208,0.35);
            text-align:left; transition:all 0.2s;
          " onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
            <div style="width:46px; height:46px; background:white; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span style="font-size:24px;">💳</span>
            </div>
            <div style="flex:1;">
              <div style="font-size:1.02rem; font-weight:800; margin-bottom:2px;">Pagar en línea con Wompi</div>
              <div style="font-size:0.75rem; opacity:0.9; font-weight:400;">Bancolombia · Nequi · PSE · Tarjeta</div>
            </div>
            <div style="background:rgba(255,255,255,0.22); border-radius:8px; padding:4px 10px; font-size:0.68rem; font-weight:800; letter-spacing:0.5px;">ONLINE</div>
          </button>

          <!-- WhatsApp Fallback -->
          <button id="rch-whatsapp-btn" style="
            background:white; border:2px solid #e2e8f0; color:#1e293b;
            padding:18px 20px; border-radius:16px; font-weight:600; font-size:0.95rem;
            cursor:pointer; display:flex; align-items:center; gap:16px; text-align:left;
            transition:all 0.2s;
          " onmouseover="this.style.borderColor='#10B981';this.style.background='#f0fdf4';" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='white';">
            <div style="width:46px; height:46px; background:#ecfdf5; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span style="font-size:24px;">📲</span>
            </div>
            <div>
              <div style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-bottom:2px;">Recarga Asistida</div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:500;">Transferencia manual vía WhatsApp con un asesor</div>
            </div>
          </button>
        </div>

        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0;">🔒 Pasarela de pago segura operada por Bancolombia</p>
        </div>
      </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);
    document.getElementById('rch-back').addEventListener('click', renderStep1);

    const handleWompiOnline = async () => {
      renderStep4Processing();
      try {
        const res = await openWompiWidget({
          amountInCOP: selectedAmount,
          userId: profile?.id || 'anon',
          customerData: { fullName: profile?.full_name || userName }
        });

        if (res.status === 'CANCELLED') {
          renderStep2();
          return;
        }

        if (res.success) {
          const rechargeRes = await rechargeWallet(selectedAmount, 'wompi_widget', 'simulated_approved', mockState, res.reference);
          renderStep5Result(rechargeRes);
        } else {
          renderStep5Result({ success: false, reason: res.reason || 'El pago no fue aprobado por Wompi.' });
        }
      } catch (err) {
        console.error('Error abriendo Wompi Widget:', err);
        renderStep5Result({ success: false, reason: err.message || 'No se pudo iniciar la pasarela de pagos.' });
      }
    };

    document.getElementById('rch-wompi-btn').addEventListener('click', handleWompiOnline);
    document.getElementById('rch-whatsapp-btn').addEventListener('click', () => {
      close();
      const msg = `🐷 *PIGGY APP — Solicitud de Recarga de Cuenta*\n\n👤 *Usuario:* ${userName}\n\n💰 Monto a recargar: *${formatCOP(selectedAmount)}*\n\n📋 Por favor indícame el número de cuenta y el proceso a seguir.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  /* ─────────────────────────────────────────
     STEP 4 — Processing animation
  ───────────────────────────────────────── */
  const renderStep4Processing = () => {
    modal.innerHTML = `
      <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <div style="background:linear-gradient(135deg,#6C14D0,#9B1DBA); padding:18px 24px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
          <div style="font-weight:900; font-size:1.15rem; color:white;">🔐 wompi</div>
          <div style="font-size:0.75rem; color:white; opacity:0.85; background:rgba(255,255,255,0.15); padding:4px 12px; border-radius:20px;">by Bancolombia</div>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; text-align:center;">
          <div style="width:74px; height:74px; margin:0 auto 24px;">
            <div style="width:74px; height:74px; border:4px solid #ede9fe; border-top-color:#6C14D0; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          </div>
          <h3 style="margin:0 0 8px; font-size:1.25rem; font-weight:800; color:#0f172a;">Iniciando pago en línea...</h3>
          <p style="margin:0; font-size:0.88rem; color:#64748b; line-height:1.5; max-width:320px;">Conectando con los servidores seguros de Wompi para tu recarga de <strong style="color:#059669;">${formatCOP(selectedAmount)}</strong>.<br><br>Por favor completa el pago en la ventana emergente.</p>
        </div>
        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0;">🔒 Transacción cifrada con SSL · Wompi by Bancolombia</p>
        </div>
      </div>
    `;

    // Add spinner animation
    if (!document.getElementById('wompi-spin-style')) {
      const style = document.createElement('style');
      style.id = 'wompi-spin-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
  };

  /* ─────────────────────────────────────────
     STEP 5 — Result (success or failure)
  ───────────────────────────────────────── */
  const renderStep5Result = (result) => {
    const isApproved = result.success;
    const refId = (result.transactionId || Date.now().toString()).slice(-10).toUpperCase();
    const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    modal.innerHTML = `
      <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <!-- Wompi Result Header -->
        <div style="background:${isApproved ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'}; padding:28px 24px; text-align:center; color:white; flex-shrink:0;">
          <div style="font-size:48px; margin-bottom:8px;">${isApproved ? '✅' : '❌'}</div>
          <div style="font-weight:900; font-size:0.95rem; opacity:0.85; margin-bottom:4px;">🔐 wompi</div>
          <h3 style="margin:0 0 4px; font-size:1.35rem; font-weight:900;">${isApproved ? '¡Pago Aprobado!' : 'Pago Rechazado'}</h3>
          <p style="margin:0; font-size:0.85rem; opacity:0.9;">${isApproved ? 'Tu recarga fue procesada exitosamente' : 'Tu pago no pudo ser procesado'}</p>
        </div>

        <!-- Scrollable Receipt Body -->
        <div style="flex:1; overflow-y:auto; padding:24px 20px; -webkit-overflow-scrolling:touch;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:18px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed #cbd5e1;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:700;">REFERENCIA</span>
              <span style="font-size:0.8rem; color:#0f172a; font-weight:800; font-family:monospace;">#${refId}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Monto</span>
              <span style="font-size:0.9rem; font-weight:800; color:${isApproved ? '#16a34a' : '#dc2626'};">${isApproved ? '+' : ''}${formatCOP(selectedAmount)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Pasarela</span>
              <span style="font-size:0.85rem; font-weight:700; color:#0f172a;">Wompi Colombia</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Estado</span>
              <span style="font-size:0.78rem; font-weight:800; background:${isApproved ? '#dcfce7' : '#fee2e2'}; color:${isApproved ? '#16a34a' : '#dc2626'}; padding:4px 10px; border-radius:8px;">${isApproved ? 'APROBADO' : 'RECHAZADO'}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Fecha</span>
              <span style="font-size:0.82rem; color:#334155; font-weight:600;">${now}</span>
            </div>
            ${isApproved && result.newBalance !== undefined ? `
            <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #cbd5e1; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:700;">Nuevo saldo</span>
              <span style="font-size:1.05rem; font-weight:900; color:#059669;">${formatCOP(result.newBalance)}</span>
            </div>
            ` : ''}
          </div>

          ${!isApproved ? `
          <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:0.82rem; color:#9a3412; line-height:1.4;">
            💡 El rechazo fue registrado en tu historial para trazabilidad. Puedes intentarlo nuevamente con otro método o usar recarga asistida por WhatsApp.
            ${result.reason && result.reason !== 'simulated_rejected' ? `
            <div style="margin-top:10px; padding:10px; background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; color:#991b1b; font-size:0.75rem; word-break:break-all;">
              <strong>Detalle:</strong> ${result.reason}
            </div>
            ` : ''}
          </div>
          ` : `
          <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:0.82rem; color:#065f46; font-weight:600;">
            ✅ Tu saldo en Cuenta Agro ha sido actualizado. Ya puedes adquirir tus Piggies y multiplicar tu capital.
          </div>
          `}

          <button id="wompi-result-close" style="
            width:100%; background:${isApproved ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#6C14D0,#9B1DBA)'}; color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
            box-shadow:0 4px 14px ${isApproved ? 'rgba(16,185,129,0.35)' : 'rgba(108,20,208,0.35)'}; transition:opacity 0.2s;
          ">${isApproved ? '✅ Ver mi Cuenta Agro' : '🔄 Intentar de nuevo'}</button>
        </div>

        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0;">🔒 Cuentas Agro seguras · Piggy App</p>
        </div>
      </div>
    `;

    document.getElementById('wompi-result-close').addEventListener('click', () => {
      close();
      // If approved: update the live drawer if it's still open
      if (isApproved && liveStats) {
        liveStats.saldoDisponible = mockState.balance;
        liveStats.saldoDisponibleFormatted = formatCOP(mockState.balance);
        liveStats.transactions = mockState.transactions;

        // Re-render balance in drawer without full reload
        const balanceEl = document.querySelector('#wallet-drawer-modal [data-wallet-balance]');
        if (balanceEl) balanceEl.textContent = formatCOP(mockState.balance);
      }
      // Always trigger a full drawer reload so balance + history reflect the DB
      import('../../services/walletService.js').then(({ getWalletBalance, getWalletTransactions }) => {
        Promise.all([getWalletBalance(), getWalletTransactions()]).then(([newBal, newTxs]) => {
          if (liveStats) {
            liveStats.saldoDisponible = newBal;
            liveStats.saldoDisponibleFormatted = formatCOP(newBal);
            liveStats.transactions = newTxs;
          }
          // Re-open the drawer with fresh data
          import('./WalletBlock.js').then(({ openWalletDrawer }) => openWalletDrawer());
        }).catch(() => {});
      }).catch(() => {});
    });
  };

  // Kick off the flow
  renderStep1();
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

  document.body.style.overflow = 'hidden';

  const ADMIN_WHATSAPP = '573154870448';
  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const userPhone = profile?.phone_number || '';
  const minAmount = 10000;
  const BANKS = ['Bancolombia', 'Davivienda', 'BBVA', 'Nequi', 'Daviplata', 'Banco de Bogota', 'Scotiabank Colpatria', 'Otro'];

  const modal = document.createElement('div');
  modal.id = 'retiro-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = '#0f172a';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  const renderStep1 = () => `
    <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#10B981,#059669); display:flex; align-items:center; justify-content:center; color:white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" /><rect x="6" y="8" width="12" height="12" rx="2" /><path d="M 12 11 v 6" /><path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" /></svg>
          </div>
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Retirar mi Saldo</div>
            <div style="font-size:0.75rem; color:#059669; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      </div>

      <!-- Scrollable Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:14px; -webkit-overflow-scrolling:touch;">
        <p style="text-align:center; font-size:0.85rem; font-weight:600; color:#374151; margin:0 0 4px;">¿Cómo deseas tu saldo?</p>
        <button id="retiro-tipo-dinero" style="background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:20px; border-radius:16px; font-weight:700; font-size:1rem; cursor:pointer; display:flex; align-items:center; gap:16px; box-shadow:0 6px 20px rgba(16,185,129,0.35); text-align:left; transition:all 0.2s;" onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
          <div style="width:46px; height:46px; background:white; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <span style="font-size:24px;">&#127968;</span>
          </div>
          <div>
            <div style="font-size:1.02rem; font-weight:800; margin-bottom:2px;">Dinero en cuenta</div>
            <div style="font-size:0.75rem; opacity:0.9; font-weight:400;">Transferencia bancaria a tu cuenta personal</div>
          </div>
        </button>
        <button id="retiro-tipo-consumo" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:20px; border-radius:16px; font-weight:700; font-size:1rem; cursor:pointer; display:flex; align-items:center; gap:16px; box-shadow:0 6px 20px rgba(245,158,11,0.35); text-align:left; transition:all 0.2s;" onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
          <div style="width:46px; height:46px; background:white; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <span style="font-size:24px;">&#129385;</span>
          </div>
          <div>
            <div style="font-size:1.02rem; font-weight:800; margin-bottom:2px;">Bonos de Consumo</div>
            <div style="font-size:0.75rem; opacity:0.9; font-weight:400;">Canjear por productos de carne y cortes agro</div>
          </div>
        </button>
      </div>
    </div>
  `;

  const renderStep2Dinero = () => `
    <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button id="retiro-back" style="background:#f1f5f9; border:none; padding:8px 12px; border-radius:10px; font-size:0.82rem; font-weight:700; color:#334155; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">← Volver</button>
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Retiro de Dinero</div>
            <div style="font-size:0.75rem; color:#059669; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      </div>

      <!-- Scrollable Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch;">
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">Monto a retirar</label>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="retiro-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 70px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e2e8f0';" />
            <button type="button" id="btn-todo-retiro" onclick="document.getElementById('retiro-amount').value='${availableAmount}'; document.getElementById('retiro-amount').dispatchEvent(new Event('input'));" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:#ecfdf5; border:1px solid #a7f3d0; color:#059669; font-weight:800; cursor:pointer; padding:6px 12px; border-radius:10px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="retiro-amount-error" style="font-size:0.75rem; color:#dc2626; margin-top:6px; display:none; font-weight:600;"></div>
        </div>
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">Banco destino</label>
          <select id="retiro-bank" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:14px; font-size:0.95rem; font-weight:600; color:#0f172a; outline:none; background:white; box-sizing:border-box; cursor:pointer; transition:border 0.2s;"
            onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e2e8f0';">
            <option value="">Selecciona tu banco</option>
            ${BANKS.map(b => '<option value="' + b + '">' + b + '</option>').join('')}
          </select>
        </div>
        <button id="retiro-confirm-dinero" style="width:100%; margin-top:8px; background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:16px 20px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35); transition:opacity 0.2s;">
          Solicitar Retiro vía WhatsApp
        </button>
        <p style="text-align:center; font-size:0.75rem; color:#9ca3af; margin:0;">🔒 Nuestro equipo procesará el retiro en tu cuenta personal en máximo 48 horas hábiles.</p>
      </div>
    </div>
  `;

  const renderStep2Consumo = () => `
    <div class="animate-scale-in" style="width:100%; max-width:520px; height:100dvh; max-height:100dvh; background:white; display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button id="retiro-back" style="background:#f1f5f9; border:none; padding:8px 12px; border-radius:10px; font-size:0.82rem; font-weight:700; color:#334155; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">← Volver</button>
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Bonos de Consumo</div>
            <div style="font-size:0.75rem; color:#d97706; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      </div>

      <!-- Scrollable Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch;">
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">¿Cuánto saldo deseas canjear en bonos?</label>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="consumo-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 70px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#f59e0b';" onblur="this.style.borderColor='#e2e8f0';" />
            <button type="button" id="btn-todo-consumo" onclick="document.getElementById('consumo-amount').value='${availableAmount}'; document.getElementById('consumo-amount').dispatchEvent(new Event('input'));" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:#fffbeb; border:1px solid #fcd34d; color:#d97706; font-weight:800; cursor:pointer; padding:6px 12px; border-radius:10px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="consumo-amount-error" style="font-size:0.75rem; color:#dc2626; margin-top:6px; display:none; font-weight:600;"></div>
        </div>
        <button id="retiro-confirm-consumo" style="width:100%; margin-top:8px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:16px 20px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(245,158,11,0.35); transition:opacity 0.2s;">
          Solicitar Bonos de Consumo vía WhatsApp
        </button>
        <p style="text-align:center; font-size:0.75rem; color:#9ca3af; margin:0;">🥩 Nuestro equipo se comunicará contigo por WhatsApp para coordinar la entrega de tu pedido.</p>
      </div>
    </div>
  `;

  const safeRemove = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };

  const attachClose = (onBack) => {
    document.getElementById('retiro-close')?.addEventListener('click', safeRemove);
    modal.addEventListener('click', (e) => { if (e.target === modal) safeRemove(); });
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
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
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
        btn.innerText = 'Solicitar Retiro vía WhatsApp';
        btn.disabled = false;
        return;
      }

      notifyAdminViaWhatsApp('withdrawal', amount, userName, userPhone, bank, res.requestId);
      showWalletRequestSuccess('withdrawal', amount, bank, res.requestId);
      safeRemove();
    });
  };

  const goToStep2Consumo = () => {
    modal.innerHTML = renderStep2Consumo();
    attachClose(goToStep1);
    document.getElementById('retiro-confirm-consumo')?.addEventListener('click', async () => {
      const errDiv = document.getElementById('consumo-amount-error');
      const amount = parseFloat(document.getElementById('consumo-amount')?.value || 0);
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
      if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
      
      const btn = document.getElementById('retiro-confirm-consumo');
      btn.innerText = 'Procesando...';
      btn.disabled = true;

      errDiv.style.display = 'none';
      
      const res = await createWalletRequest('consumption', amount, null);
      if (!res.success) {
        errDiv.textContent = res.reason || 'Error al procesar la solicitud'; 
        errDiv.style.display = 'block';
        btn.innerText = 'Solicitar Bonos de Consumo vía WhatsApp';
        btn.disabled = false;
        return;
      }

      notifyAdminViaWhatsApp('consumption', amount, userName, userPhone, null, res.requestId);
      showWalletRequestSuccess('consumption', amount, null, res.requestId);
      safeRemove();
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

  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = '#0f172a';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  modal.innerHTML = `
    <div class="animate-scale-in text-center" style="width:100%; max-width:480px; background:white; border-radius:24px; padding:32px 24px; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <button id="wallet-success-close-x" style="background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; position:absolute; right:20px; top:20px; font-size:18px; font-weight:700; cursor:pointer; color:#334155; display:flex; align-items:center; justify-content:center;">✕</button>
      <div style="width:68px; height:68px; background:${isWithdrawal ? '#d1fae5' : '#fef3c7'}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
          <span style="font-size:32px;">${isWithdrawal ? '\u2705' : '\u{1F969}'}</span>
      </div>
      <h3 style="margin:0 0 8px; font-size:1.3rem; font-weight:900; color:#0f172a;">Solicitud de ${typeLabel} Recibida</h3>
      <p style="color:#64748b; font-size:0.92rem; margin:0 0 20px; line-height:1.5;">
        Tu solicitud de <strong>${typeLabel.toLowerCase()}</strong> por <strong style="color:#059669;">${formatCOP(amount)}</strong>${isWithdrawal && bank ? ` a <strong>${bank}</strong>` : ''} ha sido registrada exitosamente.
      </p>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:16px; margin-bottom:20px; text-align:left; font-size:0.88rem;">
          <div style="margin-bottom:6px; display:flex; justify-content:space-between;"><strong>Comprobante:</strong> <span style="font-family:monospace; font-weight:800;">#${typeLabel.toUpperCase().slice(0, 3)}-${shortId}</span></div>
          <div style="margin-bottom:6px; display:flex; justify-content:space-between;"><strong>Fecha:</strong> <span>${new Date().toLocaleDateString('es-CO')}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Estado:</strong> <span style="background:#fef3c7; color:#d97706; font-weight:800; padding:2px 8px; border-radius:6px; font-size:0.75rem;">Pendiente</span></div>
      </div>

      <p style="color:#94a3b8; font-size:0.78rem; margin:0 0 24px; line-height:1.4;">
        ${isWithdrawal
      ? 'Nuestro equipo procesará tu retiro en un plazo máximo de 48 horas hábiles. Te confirmaremos vía WhatsApp.'
      : 'Nuestro equipo se comunicará contigo por WhatsApp para coordinar la entrega de tus productos agro.'}
      </p>

      <button id="wallet-success-close" style="width:100%; background:linear-gradient(135deg, #10B981, #059669); border:none; color:white; padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35);">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };
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
