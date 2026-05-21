/* ============================================
   PIGGY APP — Wallet Block (Granja Section)
   Wallet banner, recharge modal, and withdrawal modal
   ============================================ */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';

/**
 * Render the Wallet banner card (green gradient).
 * @param {string} firstName
 * @param {Object} stats
 * @returns {string} HTML
 */
export function renderWalletBanner(firstName, stats) {
  return `
        <!-- Wallet Banner (Green) -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s;">
           <div class="wallet-banner-card" style="
              background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
              color: white; 
              padding: 24px; 
              border-radius: 16px; 
              margin-bottom: 24px; 
              position: relative; 
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
           ">
              <!-- Organic Pattern Background (Piggy Silhouette) -->
              <div style="
                  position: absolute; 
                  top: 0; left: 0; right: 0; bottom: 0; 
                  opacity: 0.05; 
                  background-image: url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Ctext x=\\'0\\' y=\\'40\\' font-size=\\'30\\'%3E🐷%3C/text%3E%3C/svg%3E');
                  pointer-events: none;
              "></div>

              <!-- Decorative Big Icon -->
              <div style="position: absolute; bottom: -15px; right: -15px; opacity: 0.15; transform: rotate(-15deg); color:white;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>

              <div style="position:relative; z-index:2;">
                 <h3 style="margin:0 0 20px 0; font-size:1.25rem; font-weight:700;">Wallet de ${firstName}</h3>
                 
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <!-- Adquisicion -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Adquisici\u00F3n Bonos de Preventa</div>
                       <div style="font-size:1rem; font-weight:600;">${stats.adquisicionBonosFormatted}</div>
                    </div>
                    <!-- Diferencial (High Visual Weight) -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Diferencial de Preventa</div>
                       <div style="
                           font-size: 1.3rem; 
                           font-weight: 700; 
                           color: #39FF14; 
                           text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
                           letter-spacing: 0.5px;
                       ">+${stats.diferencialPreventaFormatted}</div>
                    </div>

                    <!-- Disponible -->
                    <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.15); padding-top:16px;">
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Saldo Disponible</div>
                       <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                           <div style="font-size:1.75rem; font-weight:800; letter-spacing: -0.5px; line-height: 1;">${stats.saldoDisponibleFormatted}</div>
                           <div style="font-size:0.75rem; opacity:0.9; text-align:right; padding-bottom: 2px;">
                               Margen Comercial Granja: <strong style="color:white; font-weight:800;">${stats.baseROIFormatted}</strong>
                           </div>
                       </div>
                    </div>

                    <!-- Bonos de Consumo (Referidos) — canje manual, NO es saldo retirable -->
                    ${stats.referralBonus > 0 ? `
                    <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.10); padding-top:12px; margin-top:4px;">
                       <div style="display:flex; align-items:center; justify-content:space-between;">
                         <div>
                           <div style="font-size:0.72rem; opacity:0.75; margin-bottom:2px;">🎁 Bonos de Consumo (Referidos)</div>
                           <div style="font-size:1.1rem; font-weight:700; color:#bbf7d0;">${stats.referralBonusFormatted}</div>
                         </div>
                         <span style="
                           background:rgba(255,255,255,0.15);
                           border:1px solid rgba(255,255,255,0.25);
                           color:white;
                           font-size:0.7rem;
                           font-weight:700;
                           padding:5px 10px;
                           border-radius:8px;
                           white-space:nowrap;
                         ">Canjear por carne</span>
                       </div>
                    </div>
                    ` : ''}
                 </div>

                  <button id="btn-recargar-wallet" style="
                     width: 100%;
                     background: white;
                     color: #059669;
                     border: none;
                     padding: 13px 20px;
                     border-radius: 12px;
                     font-weight: 700;
                     font-size: 0.95rem;
                     cursor: pointer;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     gap: 8px;
                     box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                     transition: transform 0.2s, box-shadow 0.2s;
                  "
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)';"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                     Recargar mi Wallet
                  </button>

                  ${stats.saldoDisponible > 0 ? `
                  <div style="margin-top: 10px;">
                     <button id="btn-retirar-saldo" style="
                        background: rgba(255,255,255,0.18);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.35);
                        padding: 11px 20px;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 0.88rem;
                        cursor: pointer;
                        width: 100%;
                        backdrop-filter: blur(5px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                      "><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Retirar mi Saldo</button>
                  </div>
                  ` : ""}
              </div>
           </div>
        </div>
  `;
}

/**
 * Render the Wallet skeleton (loading state).
 * @param {string} firstName
 * @returns {string} HTML
 */
export function renderWalletSkeleton(firstName) {
  return `
        <!-- Stats Skeleton (New Wallet Look) -->
        <div class="section animate-fade-in-up">
           <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 16px; margin-bottom: 24px; color: white; position:relative; overflow:hidden;">
              <h3 style="margin:0 0 16px 0; font-size:1.1rem; opacity:0.9;">Wallet de ${firstName}</h3>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:60px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:60px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:100px; height:24px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:40px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
              </div>
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
  document.getElementById('btn-recargar-wallet')?.addEventListener('click', () => {
    openWalletRechargeInfo();
  });

  document.getElementById('btn-retirar-saldo')?.addEventListener('click', () => {
    showRetiroSaldoModal(stats?.saldoDisponible || 0);
  });
}

/**
 * Show Wallet Recharge Info modal with WhatsApp contact.
 * Informs user how to top up their wallet balance.
 */
async function openWalletRechargeInfo() {
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

      <h3 style="margin:0 0 8px; font-size:1.2rem; font-weight:800; color:#1f2937;">Recargar mi Wallet</h3>
      <p style="color:#6b7280; font-size:0.9rem; margin:0 0 24px; line-height:1.5;">
        Para recargar tu wallet y poder comprar Piggys, comunicate con nuestro equipo por WhatsApp.
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
    const msg = `\u{1F430} *PIGGY APP \u2014 Solicitud de Recarga de Wallet*\n\n\u{1F464} *Usuario:* ${userName}\n\n\u{1F4B0} Hola, deseo recargar mi wallet para comprar Piggys.\n\n\u{1F4CB} Por favor indic\u00E0me el n\u00FAmero de cuenta y el proceso a seguir.`;
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
        <div style="font-size:44px; margin-bottom:10px;">&#128176;</div>
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
        <button id="retiro-confirm-dinero" style="background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:14px 20px; border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.3);">
          Solicitar Retiro via WhatsApp
        </button>
        <p style="text-align:center; font-size:0.72rem; color:#9ca3af; margin:0;">Nuestro equipo procesara el retiro de tu dinero en maximo 48 horas.</p>
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
        <button id="retiro-confirm-consumo" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:14px 20px; border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer; box-shadow:0 4px 12px rgba(245,158,11,0.3);">
          Solicitar Bonos de Consumo via WhatsApp
        </button>
        <p style="text-align:center; font-size:0.72rem; color:#9ca3af; margin:0;">Nuestro equipo procesara el canje de tus bonos una vez realices tu compra de carne.</p>
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
    document.getElementById('retiro-confirm-dinero')?.addEventListener('click', () => {
      const errDiv = document.getElementById('retiro-amount-error');
      const amount = parseFloat(document.getElementById('retiro-amount')?.value || 0);
      const bank = document.getElementById('retiro-bank')?.value;
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto minimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
      if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
      if (!bank) { errDiv.textContent = 'Selecciona un banco'; errDiv.style.display = 'block'; return; }
      errDiv.style.display = 'none';
      const msg = '\uD83D\uDC37 *PIGGY APP \u2014 Solicitud de RETIRO DE DINERO*\n\n\uD83D\uDC64 *Usuario:* ' + userName + '\n\uD83D\uDCF1 *WhatsApp:* ' + (userPhone || 'No registrado') + '\n\uD83D\uDCB5 *Monto a retirar:* ' + formatCOP(amount) + '\n\uD83C\uDFE6 *Banco destino:* ' + bank + '\n\uD83D\uDCC5 *Fecha:* ' + new Date().toLocaleDateString('es-CO') + '\n\n\u26A1 Por favor procesar la transferencia y confirmar por este medio.';
      window.open('https://wa.me/' + ADMIN_WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
      modal.remove();
    });
  };

  const goToStep2Consumo = () => {
    modal.innerHTML = renderStep2Consumo();
    attachClose(goToStep1);
    document.getElementById('retiro-confirm-consumo')?.addEventListener('click', () => {
      const errDiv = document.getElementById('consumo-amount-error');
      const amount = parseFloat(document.getElementById('consumo-amount')?.value || 0);
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto minimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
      if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
      errDiv.style.display = 'none';
      const msg = '\uD83D\uDC37 *PIGGY APP \u2014 Solicitud de BONOS DE CONSUMO*\n\n\uD83D\uDC64 *Usuario:* ' + userName + '\n\uD83D\uDCF1 *WhatsApp:* ' + (userPhone || 'No registrado') + '\n\uD83E\uDD69 *Monto en bonos:* ' + formatCOP(amount) + '\n\uD83D\uDCC5 *Fecha:* ' + new Date().toLocaleDateString('es-CO') + '\n\n\u26A1 Por favor coordinar la entrega de bonos de carne y confirmar por este medio.';
      window.open('https://wa.me/' + ADMIN_WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
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
