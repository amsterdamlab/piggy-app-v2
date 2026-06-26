/* ============================================
   PIGGY APP — Wallet Block (Granja Section)
   Wallet banner, recharge modal, and withdrawal modal
   ============================================ */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions, createWalletRequest, notifyAdminViaWhatsApp, rechargeWallet } from '../../services/walletService.js';
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
            <div style="margin-bottom: 8px;">
               <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #374151;">
                  Historial de Movimientos
               </h4>
            </div>

            <div id="transactions-list-drawer" style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; padding-right: 4px;">
               ${(stats.transactions || []).length === 0 ? `
                  <div style="text-align: center; padding: 20px 0; color: #9ca3af; font-size: 0.8rem;">
                     <span style="font-size:20px; display:block; margin-bottom:4px;">📂</span> No hay transacciones registradas aún.
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
                  const borderBottom = isLast ? 'none' : '1px solid #e5e7eb';
                  
                  return `
                     <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: ${borderBottom};">
                        <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; padding-right: 12px; min-width: 0;">
                           <span style="font-size: 0.85rem; font-weight: 700; color: #374151; word-break: break-word; line-height: 1.3;">${tx.description || 'Movimiento de Cuenta'}</span>
                           <span style="font-size: 0.7rem; color: #9ca3af; margin-top: 2px; white-space: nowrap;">
                             <span style="font-size: 0.8rem; margin-right: 2px;">${accountType}</span> &bull; ${dateStr}
                           </span>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; padding: 6px 10px; border-radius: 8px; white-space: nowrap; flex-shrink: 0;">
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
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  /* ── QUICK AMOUNT PRESETS ── */
  const PRESETS = [50000, 100000, 200000, 500000];
  let selectedAmount = 100000;
  let activeMethod = 'tarjeta'; // 'tarjeta' | 'pse'
  let simulationResult = null;   // 'simulated_approved' | 'simulated_rejected'

  /* ─────────────────────────────────────────
     STEP 1 — Amount selector
  ───────────────────────────────────────── */
  const renderStep1 = () => {
    modal.innerHTML = `
      <div class="modal animate-scale-in" style="max-width:400px; position:relative;">
        <button id="rch-close" style="background:none;border:none;position:absolute;right:16px;top:16px;font-size:22px;cursor:pointer;color:#6b7280;z-index:3;">&#x2715;</button>

        <!-- Header -->
        <div style="text-align:center; padding:28px 24px 0;">
          <div style="width:60px;height:60px;background:linear-gradient(135deg,#10B981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          </div>
          <h3 style="margin:0 0 4px;font-size:1.2rem;font-weight:800;color:#111827;">Recargar mi Cuenta</h3>
          <p style="margin:0 0 20px;font-size:0.82rem;color:#6b7280;">Selecciona el monto que deseas ingresar</p>
        </div>

        <div style="padding:0 20px 24px;">
          <!-- Preset buttons -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
            ${PRESETS.map(p => `
              <button class="preset-btn" data-amount="${p}" style="
                padding:14px 10px;
                border-radius:12px;
                border:2px solid ${selectedAmount === p ? '#10B981' : '#e5e7eb'};
                background:${selectedAmount === p ? '#ecfdf5' : 'white'};
                color:${selectedAmount === p ? '#059669' : '#374151'};
                font-weight:700;
                font-size:0.9rem;
                cursor:pointer;
                transition:all 0.15s;
              ">${formatCOP(p)}</button>
            `).join('')}
          </div>

          <!-- Custom amount -->
          <div style="margin-bottom:20px;">
            <label style="font-size:0.75rem;font-weight:700;color:#6b7280;display:block;margin-bottom:6px;">O ingresa un monto personalizado</label>
            <div style="position:relative;">
              <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-weight:700;color:#9ca3af;font-size:0.95rem;">$</span>
              <input type="number" id="rch-custom-amount" placeholder="Ej: 150000" min="10000"
                value="${PRESETS.includes(selectedAmount) ? '' : selectedAmount}"
                style="width:100%;padding:12px 14px 12px 26px;border:2px solid #e5e7eb;border-radius:12px;font-size:0.95rem;font-weight:700;color:#111827;outline:none;box-sizing:border-box;transition:border 0.2s;"
                onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e5e7eb';" />
            </div>
          </div>

          <!-- CTA -->
          <button id="rch-step1-next" style="
            width:100%;background:linear-gradient(135deg,#10B981,#059669);color:white;border:none;
            padding:14px;border-radius:12px;font-weight:800;font-size:1rem;cursor:pointer;
            box-shadow:0 4px 12px rgba(16,185,129,0.3);transition:opacity 0.2s;
          ">Continuar →</button>
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
      <div class="modal animate-scale-in" style="max-width:400px;position:relative;">
        <button id="rch-close" style="background:none;border:none;position:absolute;right:16px;top:16px;font-size:22px;cursor:pointer;color:#6b7280;z-index:3;">&#x2715;</button>
        <button id="rch-back" style="background:none;border:none;position:absolute;left:16px;top:18px;font-size:13px;color:#6b7280;cursor:pointer;z-index:3;font-weight:600;">&#8592; Volver</button>

        <div style="text-align:center;padding:28px 24px 16px;">
          <h3 style="margin:0 0 4px;font-size:1.1rem;font-weight:800;color:#111827;">Método de Pago</h3>
          <p style="margin:0;font-size:0.82rem;color:#6b7280;">Monto: <strong style="color:#059669;">${formatCOP(selectedAmount)}</strong></p>
        </div>

        <div style="padding:0 20px 24px;display:flex;flex-direction:column;gap:12px;">

          <!-- Wompi Simulation Option -->
          <button id="rch-wompi-btn" style="
            background:linear-gradient(135deg,#6C14D0,#9B1DBA);
            color:white;border:none;padding:18px 20px;border-radius:14px;
            font-weight:700;font-size:0.95rem;cursor:pointer;
            display:flex;align-items:center;gap:14px;
            box-shadow:0 4px 16px rgba(108,20,208,0.35);
            text-align:left;
          ">
            <div style="width:42px;height:42px;background:white;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:20px;">💳</span>
            </div>
            <div>
              <div style="font-size:0.95rem;font-weight:800;">Pagar con Wompi</div>
              <div style="font-size:0.72rem;opacity:0.85;font-weight:400;">Tarjeta de crédito · PSE · Nequi (Simulación)</div>
            </div>
            <div style="margin-left:auto;background:rgba(255,255,255,0.2);border-radius:6px;padding:3px 8px;font-size:0.65rem;font-weight:700;">SIMULAR</div>
          </button>

          <!-- WhatsApp Fallback -->
          <button id="rch-whatsapp-btn" style="
            background:white;border:2px solid #e5e7eb;color:#374151;
            padding:16px 20px;border-radius:14px;font-weight:600;font-size:0.9rem;
            cursor:pointer;display:flex;align-items:center;gap:14px;text-align:left;
            transition:border 0.2s;
          " onmouseover="this.style.borderColor='#25D366';" onmouseout="this.style.borderColor='#e5e7eb';">
            <div style="width:42px;height:42px;background:#ecfdf5;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:22px;">📲</span>
            </div>
            <div>
              <div style="font-size:0.9rem;font-weight:700;">Recarga Asistida</div>
              <div style="font-size:0.72rem;color:#9ca3af;font-weight:400;">Transferencia manual vía WhatsApp</div>
            </div>
          </button>

        </div>
      </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);
    document.getElementById('rch-back').addEventListener('click', renderStep1);

    document.getElementById('rch-wompi-btn').addEventListener('click', renderStep3Wompi);
    document.getElementById('rch-whatsapp-btn').addEventListener('click', () => {
      close();
      const msg = `🐷 *PIGGY APP — Solicitud de Recarga de Cuenta*\n\n👤 *Usuario:* ${userName}\n\n💰 Monto a recargar: *${formatCOP(selectedAmount)}*\n\n📋 Por favor indícame el número de cuenta y el proceso a seguir.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 — Wompi Simulator Widget
  ───────────────────────────────────────── */
  const renderStep3Wompi = () => {
    const PSE_BANKS = ['Bancolombia', 'Davivienda', 'BBVA Colombia', 'Banco de Bogotá', 'Nequi', 'Daviplata', 'Banco Popular', 'Banco Caja Social'];

    modal.innerHTML = `
      <div style="max-width:420px;width:90vw;background:white;border-radius:20px;overflow:hidden;position:relative;">

        <!-- 🔬 SIMULATION CONTROL BAR -->
        <div style="background:#1e293b;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;">
          <span style="color:#94a3b8;font-size:0.7rem;font-weight:600;">🔬 MODO SIMULACIÓN WOMPI</span>
          <div style="display:flex;gap:8px;">
            <button id="sim-approve" style="background:#16a34a;color:white;border:none;padding:5px 12px;border-radius:6px;font-size:0.7rem;font-weight:700;cursor:pointer;">🟢 Aprobar</button>
            <button id="sim-reject" style="background:#dc2626;color:white;border:none;padding:5px 12px;border-radius:6px;font-size:0.7rem;font-weight:700;cursor:pointer;">🔴 Rechazar</button>
          </div>
        </div>

        <!-- Wompi Header -->
        <div style="background:linear-gradient(135deg,#6C14D0,#9B1DBA);padding:20px 24px;color:white;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="font-weight:900;font-size:1.1rem;letter-spacing:-0.5px;">🔐 wompi</div>
            <div style="font-size:0.7rem;opacity:0.75;background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:20px;">by Bancolombia</div>
          </div>
          <div style="font-size:0.75rem;opacity:0.85;margin-bottom:4px;">Total a pagar</div>
          <div style="font-size:2rem;font-weight:900;letter-spacing:-1px;">${formatCOP(selectedAmount)}</div>
          <div style="font-size:0.72rem;opacity:0.7;margin-top:4px;">Piggy App — Recarga de Cuenta Agro</div>
        </div>

        <!-- Payment Method Tabs -->
        <div style="display:flex;border-bottom:2px solid #f1f5f9;">
          <button id="tab-tarjeta" class="wompi-tab" style="flex:1;padding:12px;background:white;border:none;font-weight:700;font-size:0.82rem;color:#6C14D0;border-bottom:2px solid #6C14D0;cursor:pointer;margin-bottom:-2px;">💳 Tarjeta</button>
          <button id="tab-pse" class="wompi-tab" style="flex:1;padding:12px;background:white;border:none;font-weight:600;font-size:0.82rem;color:#6b7280;cursor:pointer;">🏦 PSE</button>
        </div>

        <!-- Tarjeta Form -->
        <div id="wompi-tarjeta" style="padding:20px;">
          <div style="margin-bottom:14px;">
            <label style="font-size:0.72rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Número de tarjeta</label>
            <input id="card-number" placeholder="0000 0000 0000 0000" maxlength="19"
              style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.95rem;font-weight:600;letter-spacing:2px;outline:none;box-sizing:border-box;transition:border 0.2s;"
              onfocus="this.style.borderColor='#6C14D0';" onblur="this.style.borderColor='#e5e7eb';"
              oninput="this.value=this.value.replace(/\\D/g,'').slice(0,16).replace(/(\\d{4})(?=\\d)/g,'$1 ')" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
              <label style="font-size:0.72rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Vencimiento</label>
              <input id="card-expiry" placeholder="MM / AA" maxlength="7"
                style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.95rem;font-weight:600;outline:none;box-sizing:border-box;transition:border 0.2s;"
                onfocus="this.style.borderColor='#6C14D0';" onblur="this.style.borderColor='#e5e7eb';"
                oninput="let v=this.value.replace(/\\D/g,'').slice(0,4);if(v.length>2)v=v.slice(0,2)+' / '+v.slice(2);this.value=v;" />
            </div>
            <div>
              <label style="font-size:0.72rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">CVV</label>
              <input id="card-cvv" placeholder="•••" maxlength="4" type="password"
                style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.95rem;font-weight:600;outline:none;box-sizing:border-box;transition:border 0.2s;"
                onfocus="this.style.borderColor='#6C14D0';" onblur="this.style.borderColor='#e5e7eb';" />
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <label style="font-size:0.72rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Nombre en la tarjeta</label>
            <input id="card-name" placeholder="LAURA GOMEZ" style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.9rem;font-weight:600;outline:none;box-sizing:border-box;transition:border 0.2s;text-transform:uppercase;"
              onfocus="this.style.borderColor='#6C14D0';" onblur="this.style.borderColor='#e5e7eb';" />
          </div>
          <button id="wompi-pay-btn" style="
            width:100%;background:linear-gradient(135deg,#6C14D0,#9B1DBA);color:white;border:none;
            padding:14px;border-radius:12px;font-weight:800;font-size:1rem;cursor:pointer;
            box-shadow:0 4px 14px rgba(108,20,208,0.4);display:flex;align-items:center;justify-content:center;gap:8px;
          ">
            🔐 Pagar ${formatCOP(selectedAmount)}
          </button>
        </div>

        <!-- PSE Form (hidden by default) -->
        <div id="wompi-pse" style="padding:20px;display:none;">
          <div style="margin-bottom:14px;">
            <label style="font-size:0.72rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Banco</label>
            <select id="pse-bank" style="width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.9rem;outline:none;background:white;cursor:pointer;box-sizing:border-box;transition:border 0.2s;"
              onfocus="this.style.borderColor='#6C14D0';" onblur="this.style.borderColor='#e5e7eb';">
              <option value="">Selecciona tu banco</option>
              ${PSE_BANKS.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>
          <div style="margin-bottom:14px;">
            <label style="font-size:0.72rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Tipo de persona</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <label style="border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.85rem;font-weight:600;">
                <input type="radio" name="pse-type" value="natural" checked style="accent-color:#6C14D0;"> Natural
              </label>
              <label style="border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:0.85rem;font-weight:600;">
                <input type="radio" name="pse-type" value="juridica" style="accent-color:#6C14D0;"> Jurídica
              </label>
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <label style="font-size:0.72rem;font-weight:700;color:#374151;display:block;margin-bottom:6px;">Cédula / NIT</label>
            <input id="pse-doc" placeholder="1234567890" style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.9rem;font-weight:600;outline:none;box-sizing:border-box;transition:border 0.2s;"
              onfocus="this.style.borderColor='#6C14D0';" onblur="this.style.borderColor='#e5e7eb';" />
          </div>
          <button id="wompi-pse-btn" style="
            width:100%;background:linear-gradient(135deg,#6C14D0,#9B1DBA);color:white;border:none;
            padding:14px;border-radius:12px;font-weight:800;font-size:1rem;cursor:pointer;
            box-shadow:0 4px 14px rgba(108,20,208,0.4);display:flex;align-items:center;justify-content:center;gap:8px;
          ">
            🏦 Continuar con PSE
          </button>
        </div>

        <!-- Security note -->
        <div style="padding:0 20px 20px;text-align:center;">
          <p style="font-size:0.68rem;color:#9ca3af;margin:0;">🔒 Transacción cifrada con SSL · Wompi by Bancolombia</p>
        </div>
      </div>
    `;

    // Tab switching
    document.getElementById('tab-tarjeta').addEventListener('click', () => {
      activeMethod = 'tarjeta';
      document.getElementById('wompi-tarjeta').style.display = 'block';
      document.getElementById('wompi-pse').style.display = 'none';
      document.getElementById('tab-tarjeta').style.color = '#6C14D0';
      document.getElementById('tab-tarjeta').style.borderBottom = '2px solid #6C14D0';
      document.getElementById('tab-tarjeta').style.fontWeight = '700';
      document.getElementById('tab-pse').style.color = '#6b7280';
      document.getElementById('tab-pse').style.borderBottom = 'none';
      document.getElementById('tab-pse').style.fontWeight = '600';
    });
    document.getElementById('tab-pse').addEventListener('click', () => {
      activeMethod = 'pse';
      document.getElementById('wompi-pse').style.display = 'block';
      document.getElementById('wompi-tarjeta').style.display = 'none';
      document.getElementById('tab-pse').style.color = '#6C14D0';
      document.getElementById('tab-pse').style.borderBottom = '2px solid #6C14D0';
      document.getElementById('tab-pse').style.fontWeight = '700';
      document.getElementById('tab-tarjeta').style.color = '#6b7280';
      document.getElementById('tab-tarjeta').style.borderBottom = 'none';
      document.getElementById('tab-tarjeta').style.fontWeight = '600';
    });

    // Simulation control
    document.getElementById('sim-approve').addEventListener('click', () => {
      simulationResult = 'simulated_approved';
      document.getElementById('sim-approve').style.background = '#15803d';
      document.getElementById('sim-approve').style.boxShadow = '0 0 0 2px white, 0 0 0 4px #16a34a';
      document.getElementById('sim-reject').style.background = '#6b7280';
      document.getElementById('sim-reject').style.boxShadow = 'none';
    });
    document.getElementById('sim-reject').addEventListener('click', () => {
      simulationResult = 'simulated_rejected';
      document.getElementById('sim-reject').style.background = '#b91c1c';
      document.getElementById('sim-reject').style.boxShadow = '0 0 0 2px white, 0 0 0 4px #dc2626';
      document.getElementById('sim-approve').style.background = '#6b7280';
      document.getElementById('sim-approve').style.boxShadow = 'none';
    });

    // Trigger pay
    const handlePay = () => {
      if (!simulationResult) {
        alert('⚠️ Selecciona primero el resultado de la simulación: 🟢 Aprobar o 🔴 Rechazar');
        return;
      }
      renderStep4Processing();
    };
    document.getElementById('wompi-pay-btn').addEventListener('click', handlePay);
    document.getElementById('wompi-pse-btn').addEventListener('click', handlePay);
  };

  /* ─────────────────────────────────────────
     STEP 4 — Processing animation
  ───────────────────────────────────────── */
  const renderStep4Processing = () => {
    modal.innerHTML = `
      <div style="max-width:360px;width:90vw;background:white;border-radius:20px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6C14D0,#9B1DBA);padding:14px 20px;">
          <div style="font-weight:900;font-size:1rem;color:white;">🔐 wompi</div>
        </div>
        <div style="padding:48px 28px;text-align:center;">
          <div style="width:70px;height:70px;margin:0 auto 20px;">
            <div style="width:70px;height:70px;border:4px solid #ede9fe;border-top-color:#6C14D0;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
          </div>
          <h3 style="margin:0 0 8px;font-size:1.1rem;font-weight:800;color:#1e293b;">Procesando pago...</h3>
          <p style="margin:0;font-size:0.82rem;color:#64748b;">Estamos procesando tu recarga de <strong>${formatCOP(selectedAmount)}</strong>.<br>Por favor no cierres esta ventana.</p>
        </div>
        <div style="padding:0 20px 20px;text-align:center;">
          <p style="font-size:0.68rem;color:#9ca3af;margin:0;">🔒 Transacción cifrada con SSL · Wompi by Bancolombia</p>
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

    // Simulate processing delay then call the service
    setTimeout(async () => {
      try {
        const result = await rechargeWallet(selectedAmount, activeMethod, simulationResult, mockState);
        renderStep5Result(result);
      } catch (err) {
        console.error('Wompi simulation error:', err);
        renderStep5Result({ success: false, reason: err.message });
      }
    }, 2200);
  };

  /* ─────────────────────────────────────────
     STEP 5 — Result (success or failure)
  ───────────────────────────────────────── */
  const renderStep5Result = (result) => {
    const isApproved = result.success;
    const refId = (result.transactionId || Date.now().toString()).slice(-10).toUpperCase();
    const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const methodLabel = activeMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE';

    modal.innerHTML = `
      <div style="max-width:380px;width:90vw;background:white;border-radius:20px;overflow:hidden;">
        <!-- Wompi Result Header -->
        <div style="background:${isApproved ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'};padding:28px 24px;text-align:center;color:white;">
          <div style="font-size:48px;margin-bottom:8px;">${isApproved ? '✅' : '❌'}</div>
          <div style="font-weight:900;font-size:1rem;opacity:0.8;margin-bottom:6px;">🔐 wompi</div>
          <h3 style="margin:0 0 4px;font-size:1.2rem;font-weight:900;">${isApproved ? '¡Pago Aprobado!' : 'Pago Rechazado'}</h3>
          <p style="margin:0;font-size:0.82rem;opacity:0.85;">${isApproved ? 'Tu recarga fue procesada exitosamente' : 'Tu pago no pudo ser procesado'}</p>
        </div>

        <!-- Receipt -->
        <div style="padding:20px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed #e2e8f0;">
              <span style="font-size:0.75rem;color:#64748b;font-weight:600;">REFERENCIA</span>
              <span style="font-size:0.75rem;color:#1e293b;font-weight:800;font-family:monospace;">#${refId}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:0.8rem;color:#64748b;">Monto</span>
              <span style="font-size:0.8rem;font-weight:700;color:${isApproved ? '#16a34a' : '#dc2626'};">${isApproved ? '+' : ''}${formatCOP(selectedAmount)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:0.8rem;color:#64748b;">Método</span>
              <span style="font-size:0.8rem;font-weight:600;color:#1e293b;">${methodLabel}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:0.8rem;color:#64748b;">Estado</span>
              <span style="font-size:0.8rem;font-weight:700;background:${isApproved ? '#dcfce7' : '#fee2e2'};color:${isApproved ? '#16a34a' : '#dc2626'};padding:2px 8px;border-radius:6px;">${isApproved ? 'APROBADO' : 'RECHAZADO'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:0.8rem;color:#64748b;">Fecha</span>
              <span style="font-size:0.8rem;color:#1e293b;">${now}</span>
            </div>
            ${isApproved && result.newBalance !== undefined ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;display:flex;justify-content:space-between;">
              <span style="font-size:0.8rem;color:#64748b;">Nuevo saldo</span>
              <span style="font-size:0.9rem;font-weight:800;color:#059669;">${formatCOP(result.newBalance)}</span>
            </div>
            ` : ''}
          </div>

          ${!isApproved ? `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:0.78rem;color:#9a3412;">
            💡 El rechazo fue registrado en tu historial de transacciones para trazabilidad. Puedes intentarlo nuevamente o usar la recarga asistida por WhatsApp.
            ${result.reason && result.reason !== 'simulated_rejected' ? `
            <div style="margin-top:8px;padding:8px;background:#fef2f2;border:1px solid #fee2e2;border-radius:6px;color:#991b1b;font-family:sans-serif;font-size:0.7rem;word-break:break-all;">
              <strong>Detalle del error:</strong> ${result.reason}
            </div>
            ` : ''}
          </div>
          ` : `
          <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:0.78rem;color:#065f46;">
            ✅ Tu saldo ha sido actualizado. Ya puedes adquirir tus Piggies.
          </div>
          `}

          <button id="wompi-result-close" style="
            width:100%;background:${isApproved ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#6C14D0,#9B1DBA)'};color:white;border:none;
            padding:14px;border-radius:12px;font-weight:800;font-size:0.95rem;cursor:pointer;
          ">${isApproved ? '✅ Ver mi Cuenta' : '🔄 Intentar de nuevo'}</button>
        </div>

        <div style="padding:0 20px 16px;text-align:center;">
          <p style="font-size:0.65rem;color:#9ca3af;margin:0;">🔒 wompi by Bancolombia · Simulación interna Piggy App</p>
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
