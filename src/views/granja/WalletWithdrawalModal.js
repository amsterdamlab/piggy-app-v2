/* ==========================================================================
   PIGGY APP — Wallet Withdrawal Modal & Success Receipt
   Modular subcomponent containing sliding withdrawal flows (money & consumption).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { createWalletRequest, notifyAdminViaWhatsApp, requestMeatRedemption } from '../../services/walletService.js';
import { getProfile } from '../../services/authService.js';
import { openWalletDrawer, openMeatRedemptionModal } from './WalletDrawerModal.js';
import { navigateTo } from '../../router.js';

/**
 * Open Wallet Withdrawal flow as a sliding subscreen inside the parent container.
 * Zero DOM destruction, zero flickering, native transitions.
 *
 * @param {HTMLElement} mountContainer - The element inside which the subscreen is mounted
 * @param {number} availableAmount - The user's available wallet balance
 * @param {Function} onUpdated - Callback when balance changes
 * @param {Function} onCloseAll - Callback to close the entire wallet drawer
 */
export function openWalletWithdrawalSubscreen(mountContainer, availableAmount, onUpdated = null, onCloseAll = null) {
  if (!mountContainer) return;
  mountContainer.innerHTML = '';

  const subscreen = document.createElement('div');
  subscreen.className = 'wallet-subscreen';
  subscreen.style.pointerEvents = 'auto';
  mountContainer.appendChild(subscreen);

  // Profile data from local AppState for instantaneous rendering
  let profile = AppState.get('profile') || {};

  // Fetch fresh profile in background to keep 100% sync with Supabase
  getProfile().then(fresh => {
    if (fresh) {
      profile = fresh;
      AppState.set({ profile: fresh });
    }
  }).catch(e => console.warn('Background profile refresh error:', e));

  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const userPhone = profile?.whatsapp || profile?.phone_number || '';
  const minAmount = 50000;

  const formatThousands = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseFormattedNumber = (val) => {
    if (!val) return 0;
    const digits = String(val).replace(/\D/g, '');
    return parseInt(digits, 10) || 0;
  };

  const closeSubscreen = () => {
    subscreen.remove();
  };

  /* ─────────────────────────────────────────
     STEP 1 — Destino del Retiro (Dinero / Consumo)
  ───────────────────────────────────────── */
  const renderStep1 = () => `
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; justify-content:center; color:#be1260; flex-shrink:0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" />
              <rect x="6" y="8" width="12" height="12" rx="2" />
              <path d="M 12 11 v 6" />
              <path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" />
            </svg>
          </div>
          <div>
            <div style="font-weight:850; font-size:1.35rem; color:#0f172a; line-height:1.2; letter-spacing:-0.02em;">Retirar mi saldo</div>
            <div style="font-size:0.85rem; color:#059669; font-weight:700; margin-top:2px;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:transparent; border:none; padding:4px 8px; font-size:22px; font-weight:700; color:#94a3b8; cursor:line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:20px 20px 40px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        <div style="font-size:0.88rem; font-weight:600; color:#475569; margin:0 0 2px;">Selecciona el destino de tu retiro:</div>
        
        <!-- 1. BOTÓN: Dinero en Cuenta -->
        <button id="retiro-tipo-dinero" style="
          background: #fdf2f5; border: 1px solid #ffe4e6;
          color: #0f172a; padding: 22px 20px; border-radius: 18px;
          font-weight: 700; font-size: 1rem; cursor: pointer;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
        " onmouseover="this.style.background='#fce7ed'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fdf2f5'; this.style.transform='translateY(0)';">
          <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:white; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #ffe4e6; margin-top:2px; color:#be1260;">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"/>
              <path d="M3 10h18"/>
              <path d="M5 6l7-3 7 3"/>
              <path d="M4 10v11"/>
              <path d="M20 10v11"/>
              <path d="M8 14v4"/>
              <path d="M12 14v4"/>
              <path d="M16 14v4"/>
            </svg>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span style="font-size:1.08rem; font-weight:850; color:#0f172a; letter-spacing:-0.01em; line-height:1.25;">Dinero en cuenta</span>
              <span style="background:white; color:#be1260; border:1px solid #fbcfe8; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">TRANSFERENCIA</span>
            </div>
            <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Transferencia bancaria a tu cuenta personal registrada.</div>
          </div>
        </button>

        <!-- 2. BOTÓN: Bonos de Consumo -->
        <button id="retiro-tipo-consumo" style="
          background: #fdf2f5; border: 1px solid #ffe4e6;
          color: #0f172a; padding: 22px 20px; border-radius: 18px;
          font-weight: 700; font-size: 1rem; cursor: pointer;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
        " onmouseover="this.style.background='#fce7ed'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fdf2f5'; this.style.transform='translateY(0)';">
          <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:white; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #ffe4e6; margin-top:2px; color:#be1260;">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              <path d="M13 5v2"/>
              <path d="M13 17v2"/>
              <path d="M13 11v2"/>
            </svg>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span style="font-size:1.08rem; font-weight:850; color:#0f172a; letter-spacing:-0.01em; line-height:1.25;">Bonos de Consumo</span>
              <span style="background:white; color:#be1260; border:1px solid #fbcfe8; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">CANJE INMEDIATO</span>
            </div>
            <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Canjear por cortes gourmet y productos cárnicos en Tienda.</div>
          </div>
        </button>
      </div>

      <!-- Footer Info -->
      <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
        <p style="font-size:0.72rem; color:#94a3b8; margin:0 0 6px 0; display:flex; align-items:center; justify-content:center; gap:5px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Transferencias 100% seguras en Piggy App.</span>
        </p>
      </div>
  `;

  /* ─────────────────────────────────────────
     STEP 2A — Retiro de Dinero (Transferencia Bancaria)
  ───────────────────────────────────────── */
  const renderStep2Dinero = () => {
    const curProfile = AppState.get('profile') || profile || {};
    const userBank = curProfile.bank_name || '';
    const userBreveKey = curProfile.bank_breve_key || '';
    const userAccountType = curProfile.bank_account_type || 'Cuenta de Ahorros';
    const userCedula = curProfile.cedula || curProfile.document_id || '';
    const hasBankData = Boolean(userBank && userBreveKey);

    return `
      <!-- Header Limpio: Volver arriba a la izq y cerrar a la der -->
      <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <button id="retiro-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
            ← Volver
          </button>
          <button id="retiro-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
        </div>
        
        <div>
          <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Retiro de Dinero</h2>
          <div style="font-size:0.85rem; color:#059669; font-weight:700;">Saldo disponible: ${formatCOP(availableAmount)}</div>
        </div>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;">
        
        <!-- Recuadro Datos Bancarios -->
        <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:16px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">
              DATOS BANCARIOS
            </span>
            <span style="background:#ecfdf5; color:#059669; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:6px;">
              ${hasBankData ? 'VINCULADO' : 'PENDIENTE'}
            </span>
          </div>

          ${hasBankData ? `
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:0.88rem; font-weight:700; color:#64748b;">${userAccountType}:</span>
                <span style="font-size:0.98rem; font-weight:850; color:#0f172a;">${userBank || 'Banco Registrado'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#334155;">
                <span style="color:#64748b; font-weight:600;">Llave Bre-B:</span>
                <code style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-weight:700; color:#0f172a;">${userBreveKey || 'No registrada'}</code>
              </div>
              ${userCedula ? `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; color:#64748b;">
                <span style="font-weight:600;">Cédula (C.C):</span>
                <strong style="color:#334155;">${userCedula}</strong>
              </div>
              ` : ''}
              <div style="margin-top:6px; padding-top:8px; border-top:1px dashed #cbd5e1; text-align:right;">
                <button id="btn-goto-profile-edit" style="background:none; border:none; color:#be1260; font-size:0.75rem; font-weight:700; cursor:pointer; padding:0; text-decoration:underline;">
                  Cambiar o editar en Mi Perfil
                </button>
              </div>
            </div>
          ` : `
            <div style="text-align:center; padding:10px 0;">
              <p style="font-size:0.85rem; color:#64748b; margin:0 0 10px 0;">Aún no tienes un banco y Llave Bre-B registrados en tu perfil.</p>
              <button id="btn-goto-profile-setup" style="
                background: #fdf2f5; color: #be1260; border: 1.5px solid #fbcfe8;
                padding: 10px 18px; border-radius: 12px; font-weight: 800; font-size: 0.82rem;
                cursor: pointer; transition: all 0.2s;
              " onmouseover="this.style.background='#fce7ed'" onmouseout="this.style.background='#fdf2f5'">
                Actualizar mis datos en Mi Perfil →
              </button>
            </div>
          `}
        </div>

        <!-- Monto a Retirar con Botón TODO interior -->
        <div style="margin-bottom:20px;">
          <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:8px;">¿Cuánto deseas retirar?</label>
          <div style="position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:16px; font-weight:800; color:#9ca3af; font-size:1rem; pointer-events:none;">$</span>
            <input type="text" inputmode="numeric" id="retiro-amount" placeholder="Ej: 500.000"
              style="width:100%; padding:14px 75px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#be1260';" onblur="this.style.borderColor='#e2e8f0';" />
            <button type="button" id="btn-todo-retiro" style="
              position:absolute; right:10px; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1;
              border-radius:8px; padding:6px 12px; font-size:0.75rem; font-weight:800; cursor:pointer;
              transition:all 0.15s;
            " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">TODO</button>
          </div>
          <div id="retiro-amount-error" style="color:#dc2626; font-size:0.75rem; font-weight:600; margin-top:6px; display:none;"></div>
          <div style="font-size:0.72rem; color:#64748b; margin-top:6px;">Monto mínimo de retiro: <strong>${formatCOP(minAmount)}</strong>.</div>
        </div>

        <!-- BOTÓN SOLICITAR RETIRO -->
        <div style="margin-bottom:20px;">
          <button id="retiro-confirm-dinero" style="
            width: 100%;
            background: #22c55e;
            color: white;
            border: none;
            padding: 16px 20px;
            border-radius: 9999px;
            font-weight: 850;
            font-size: 1.05rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
            transition: all 0.2s;
          " onmouseover="this.style.background='#16a34a'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#22c55e'; this.style.transform='translateY(0)';">
            <svg xmlns="http://www.w3.org/2000/svg" width="33" height="33" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z"/>
272:             </svg>
273:             Solicitar Retiro
274:           </button>
275:         </div>
276: 
277:         <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:14px; padding:14px 16px; font-size:0.8rem; color:#065f46; line-height:1.45;">
278:           ⏱️ <strong>Tiempos de abono:</strong> Tu solicitud será revisada y abonada a tu cuenta en un plazo habitual de 1 a 24 horas hábiles.
279:         </div>
280:       </div>
281: 
282:       <div style="padding:14px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
283:         <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
284:           <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
285:           <span>Transferencias 100% seguras en Piggy App.</span>
286:         </p>
287:       </div>
288:     `;
289:   };
290: 
291:   /* ─────────────────────────────────────────
292:      STEP 2B — Canje a Bonos de Consumo
293:   ───────────────────────────────────────── */
294:   const renderStep2Consumo = () => `
295:       <!-- Header Limpio: Volver arriba a la izq y cerrar a la der -->
296:       <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
297:         <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
298:           <button id="retiro-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
299:             ← Volver
300:           </button>
301:           <button id="retiro-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
302:         </div>
303:         
304:         <div>
305:           <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Canje por Carne</h2>
306:           <div style="font-size:0.85rem; color:#059669; font-weight:700;">Saldo disponible: ${formatCOP(availableAmount)}</div>
307:         </div>
308:       </div>
309: 
310:       <!-- Scrollable Body Content -->
311:       <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;">
312:         
313:         <!-- Info Canje -->
314:         <div style="background:#fff1f2; border:1px solid #ffe4e6; border-radius:16px; padding:16px; margin-bottom:18px; display:flex; gap:12px; align-items:flex-start;">
315:           <div style="color:#be1260; flex-shrink:0; margin-top:2px;">
316:             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
317:               <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
318:               <path d="M13 5v2"/>
319:               <path d="M13 17v2"/>
320:               <path d="M13 11v2"/>
321:             </svg>
322:           </div>
323:           <div style="font-size:0.85rem; color:#9f1239; line-height:1.45;">
324:             El monto que solicites será destinado para tu pedido de cortes gourmet y productos cárnicos en <strong>Granja Valle Morales</strong>.
325:           </div>
326:         </div>
327: 
328:         <!-- Monto a Canjear con Botón TODO interior -->
329:         <div style="margin-bottom:20px;">
330:           <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:8px;">Monto a canjear en carne</label>
331:           <div style="position:relative; display:flex; align-items:center;">
332:             <span style="position:absolute; left:16px; font-weight:800; color:#9ca3af; font-size:1rem; pointer-events:none;">$</span>
333:             <input type="text" inputmode="numeric" id="consumo-amount" placeholder="Ej: 100.000"
334:               style="width:100%; padding:14px 75px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
335:               onfocus="this.style.borderColor='#be1260';" onblur="this.style.borderColor='#e2e8f0';" />
336:             <button type="button" id="btn-todo-consumo" style="
337:               position:absolute; right:10px; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1;
338:               border-radius:8px; padding:6px 12px; font-size:0.75rem; font-weight:800; cursor:pointer;
339:               transition:all 0.15s;
340:             " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">TODO</button>
341:           </div>
342:           <div id="consumo-amount-error" style="color:#dc2626; font-size:0.75rem; font-weight:600; margin-top:6px; display:none;"></div>
343:           <div style="font-size:0.72rem; color:#64748b; margin-top:6px;">Monto mínimo de canje: <strong>${formatCOP(minAmount)}</strong>.</div>
344:         </div>
345: 
346:         <!-- BOTÓN CANJEAR -->
347:         <button id="retiro-confirm-consumo" style="
348:           width: 100%;
349:           background: #be1260;
350:           color: white;
351:           border: none;
352:           padding: 16px 20px;
353:           border-radius: 14px;
354:           font-weight: 850;
355:           font-size: 1rem;
356:           cursor: pointer;
357:           display: flex;
358:           align-items: center;
359:           justify-content: center;
360:           gap: 10px;
361:           box-shadow: 0 4px 14px rgba(190, 18, 96, 0.35);
362:           transition: all 0.2s;
363:         " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
364:           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
365:             <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
366:             <path d="M13 5v2"/>
367:             <path d="M13 17v2"/>
368:             <path d="M13 11v2"/>
369:           </svg>
370:           Solicitar Canje por Carne
371:         </button>
372:       </div>
373: 
374:       <div style="padding:14px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
375:         <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
376:           <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
377:           <span>Transferencias 100% seguras en Piggy App.</span>
378:         </p>
379:       </div>
380:   `;
381: 
382:   const attachClose = (onBack) => {
383:     document.getElementById('retiro-close')?.addEventListener('click', closeSubscreen);
384:     if (onBack) document.getElementById('retiro-back')?.addEventListener('click', onBack);
385:   };
386: 
387:   const goToStep1 = () => {
388:     subscreen.innerHTML = renderStep1();
389:     attachClose(null);
390:     document.getElementById('retiro-tipo-dinero')?.addEventListener('click', goToStep2Dinero);
391:     document.getElementById('retiro-tipo-consumo')?.addEventListener('click', goToStep2Consumo);
392:   };
393: 
394:   const goToStep2Dinero = () => {
395:     subscreen.innerHTML = renderStep2Dinero();
396:     attachClose(goToStep1);
397: 
398:     // Links a Mi Perfil (subscreen datos)
399:     const handleGotoProfile = () => {
400:       closeSubscreen();
401:       if (onCloseAll) {
402:         onCloseAll();
403:       } else {
404:         const d = document.getElementById('wallet-drawer-modal');
405:         if (d) d.remove();
406:       }
407:       navigateTo('perfil');
408:       setTimeout(() => {
409:         window.location.hash = '#/perfil?subscreen=datos';
410:       }, 50);
411:     };
412: 
413:     document.getElementById('btn-goto-profile-setup')?.addEventListener('click', handleGotoProfile);
414:     document.getElementById('btn-goto-profile-edit')?.addEventListener('click', handleGotoProfile);
415: 
416:     // Formatting with thousands dots
417:     const input = document.getElementById('retiro-amount');
418:     input?.addEventListener('input', (e) => {
419:       const raw = e.target.value.replace(/\D/g, '');
420:       if (!raw) {
421:         e.target.value = '';
422:         return;
423:       }
424:       const num = parseInt(raw, 10);
425:       e.target.value = formatThousands(num);
426:     });
427: 
428:     // Setup the "TODO" button inside the input
429:     document.getElementById('btn-todo-retiro')?.addEventListener('click', () => {
430:       if (input) {
431:         input.value = formatThousands(availableAmount);
432:         input.dispatchEvent(new Event('input'));
433:       }
434:     });
435: 
436:     document.getElementById('retiro-confirm-dinero')?.addEventListener('click', async () => {
437:       const curProfile = AppState.get('profile') || profile || {};
438:       const userBank = curProfile.bank_name || '';
439:       const userBreveKey = curProfile.bank_breve_key || '';
440:       const errDiv = document.getElementById('retiro-amount-error');
441:       const amount = parseFormattedNumber(document.getElementById('retiro-amount')?.value);
442: 
443:       if (!amount || amount < minAmount) {
444:         errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount);
445:         errDiv.style.display = 'block';
446:         return;
447:       }
448:       if (amount > availableAmount) {
449:         errDiv.textContent = 'El monto supera tu saldo disponible';
450:         errDiv.style.display = 'block';
451:         return;
452:       }
453:       if (!userBank || !userBreveKey) {
454:         errDiv.textContent = 'Por favor registra tu banco y Llave Bre-B en Mi Perfil para continuar.';
455:         errDiv.style.display = 'block';
456:         return;
457:       }
458:       
459:       const btn = document.getElementById('retiro-confirm-dinero');
460:       btn.innerText = 'Procesando...';
461:       btn.disabled = true;
462: 
463:       errDiv.style.display = 'none';
464:       
465:       const res = await createWalletRequest('withdrawal', amount, userBank || 'Banco Registrado');
466:       if (!res.success) {
467:         errDiv.textContent = res.reason || 'Error al procesar la solicitud'; 
468:         errDiv.style.display = 'block';
469:         btn.innerHTML = `
470:           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
471:             <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
472:             <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
473:           </svg>
474:           Solicitar Retiro
475:         `;
476:         btn.disabled = false;
477:         return;
478:       }
479: 
480:       notifyAdminViaWhatsApp('withdrawal', amount, userName, userPhone, userBank || 'Banco Registrado', res.requestId, userBreveKey);
481:       closeSubscreen();
482:       showWalletRequestSuccess('withdrawal', amount, userBank || 'Banco Registrado', res.requestId, onUpdated);
483:     });
484:   };
485: 
486:   const goToStep2Consumo = () => {
487:     subscreen.innerHTML = renderStep2Consumo();
488:     attachClose(goToStep1);
489: 
490:     const input = document.getElementById('consumo-amount');
491:     input?.addEventListener('input', (e) => {
492:       const raw = e.target.value.replace(/\D/g, '');
493:       if (!raw) {
494:         e.target.value = '';
495:         return;
496:       }
497:       const num = parseInt(raw, 10);
498:       e.target.value = formatThousands(num);
499:     });
500: 
501:     // Setup the "TODO" button inside the input
502:     document.getElementById('btn-todo-consumo')?.addEventListener('click', () => {
503:       if (input) {
504:         input.value = formatThousands(availableAmount);
505:         input.dispatchEvent(new Event('input'));
506:       }
507:     });
508: 
509:     document.getElementById('retiro-confirm-consumo')?.addEventListener('click', async () => {
510:       const errDiv = document.getElementById('consumo-amount-error');
511:       const amount = parseFormattedNumber(document.getElementById('consumo-amount')?.value);
512:       if (!amount || amount < minAmount) {
513:         errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount);
514:         errDiv.style.display = 'block';
515:         return;
516:       }
517:       if (amount > availableAmount) {
518:         errDiv.textContent = 'El monto supera tu saldo disponible';
519:         errDiv.style.display = 'block';
520:         return;
521:       }
522:       
523:       const btn = document.getElementById('retiro-confirm-consumo');
524:       btn.innerText = 'Procesando...';
525:       btn.disabled = true;
526: 
527:       errDiv.style.display = 'none';
528: 
529:       const ADMIN_WHATSAPP = '573154870448';
530:       const curProfile = AppState.get('profile') || profile || {};
531:       const userFullName = curProfile.full_name || userName || 'Usuario';
532:       const userPhoneNum = curProfile.phone || userPhone || 'No registrado';
533:       const refId = 'PGY-CRN-' + Math.floor(100000 + Math.random() * 900000);
534: 
535:       // 1. Guardar solicitud en tabla wallet_requests con request_type 'consumption'
536:       requestMeatRedemption({ amount, reference: refId }).catch(err => {
537:         console.warn('Error al registrar canje de carne en wallet_requests:', err);
538:       });
539: 
540:       // 2. Abrir WhatsApp con mensaje estructurado
541:       const msg = `🥩 *PIGGY APP — Solicitud de Canje por Carne*\n\n` +
542:         `👤 *Usuario:* ${userFullName}\n` +
543:         `📱 *WhatsApp:* ${userPhoneNum}\n` +
544:         `💵 *Monto a Canjear:* ${formatCOP(amount)}\n` +
545:         `🎫 *Referencia:* #${refId}\n` +
546:         `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n` +
547:         `Hola, deseo canjear este monto de mi saldo disponible por productos de carne. Por favor, indíquenme los cortes disponibles y pasos a seguir.`;
548: 
549:       window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
550: 
551:       // 3. Cerrar drawer y abrir popup de atencion en proceso
552:       closeSubscreen();
553:       if (onCloseAll) {
554:         onCloseAll();
555:       } else {
556:         const drawer = document.getElementById('wallet-drawer-modal');
557:         if (drawer) drawer.remove();
558:       }
559: 
560:       openMeatRedemptionModal({ amount, userName: userFullName, refId });
561:     });
562:   };
563: 
564:   // Immediate synchronous render for instantaneous 0ms transition
565:   goToStep1();
566: }
567: 
568: /**
569:  * Show success confirmation after wallet request.
570:  */
571: export function showWalletRequestSuccess(requestType, amount, bank, requestId, onUpdated = null) {
572:   const isWithdrawal = requestType === 'withdrawal';
573:   const modal = document.createElement('div');
574:   modal.id = 'wallet-success-modal';
575:   modal.style.position = 'fixed';
576:   modal.style.inset = '0';
577:   modal.style.background = 'rgba(15, 23, 42, 0.7)';
578:   modal.style.backdropFilter = 'blur(8px)';
579:   modal.style.webkitBackdropFilter = 'blur(8px)';
580:   modal.style.zIndex = '999999';
581:   modal.style.display = 'flex';
582:   modal.style.alignItems = 'center';
583:   modal.style.justifyContent = 'center';
584:   modal.style.padding = '20px';
585: 
586:   modal.innerHTML = `
587:     <div class="animate-scale-in" style="background:white; border-radius:24px; max-width:440px; width:100%; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); position:relative;">
588:       <div style="background:linear-gradient(135deg, #10B981 0%, #059669 100%); padding:28px 24px; text-align:center; color:white;">
589:         <div style="width:60px; height:60px; background:white; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
590:           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
591:             <polyline points="20 6 9 17 4 12"></polyline>
592:           </svg>
593:         </div>
594:         <h3 style="margin:0 0 4px 0; font-size:1.4rem; font-weight:800; color:white;">¡Solicitud Enviada!</h3>
595:         <p style="margin:0; font-size:0.85rem; opacity:0.9;">Tu solicitud de retiro fue registrada exitosamente</p>
596:       </div>
597: 
598:       <div style="padding:24px;">
599:         <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; margin-bottom:20px; font-size:0.85rem; color:#334155;">
600:           <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
601:             <span style="color:#64748b;">Referencia:</span>
602:             <strong style="color:#0f172a; font-family:monospace;">#${requestId || 'REQ-' + Math.floor(1000 + Math.random() * 9000)}</strong>
603:           </div>
604:           <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
605:             <span style="color:#64748b;">Monto:</span>
606:             <strong style="color:#059669; font-size:0.95rem;">${formatCOP(amount)}</strong>
607:           </div>
608:           <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
609:             <span style="color:#64748b;">Destino:</span>
610:             <strong style="color:#0f172a;">${bank}</strong>
611:           </div>
612:           <div style="display:flex; justify-content:space-between;">
613:             <span style="color:#64748b;">Estado:</span>
614:             <span style="background:#fef3c7; color:#d97706; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;">En Revisión</span>
615:           </div>
616:         </div>
617: 
618:         <p style="font-size:0.8rem; color:#64748b; line-height:1.4; margin:0 0 20px 0; text-align:center;">
619:           Hemos abierto WhatsApp para que confirmes la solicitud con administración. Tu saldo se actualizará tras la aprobación.
620:         </p>
621: 
622:         <button id="btn-close-success-modal" style="
623:           width:100%; background:#0f172a; color:white; border:none; padding:14px;
624:           border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer;
625:           box-shadow:0 4px 12px rgba(0,0,0,0.1); transition:all 0.2s;
626:         " onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
627:           Entendido
628:         </button>
629:       </div>
630:     </div>
631:   `;
632: 
633:   document.body.appendChild(modal);
634: 
635:   const closeReceipt = () => {
636:     modal.remove();
637:     if (onUpdated) {
638:       openWalletDrawer();
639:     }
640:   };
641: 
642:   document.getElementById('btn-close-success-modal')?.addEventListener('click', closeReceipt);
643:   modal.addEventListener('click', (e) => { if (e.target === modal) closeReceipt(); });
644: }
645: 
646: /**
647:  * Show success confirmation after instant consumption bonus conversion.
648:  */
649: export function showConsumptionConversionSuccess(amount, onUpdated = null) {
650:   const modal = document.createElement('div');
651:   modal.id = 'consumption-success-modal';
652:   modal.style.position = 'fixed';
653:   modal.style.inset = '0';
654:   modal.style.background = 'rgba(15, 23, 42, 0.7)';
655:   modal.style.backdropFilter = 'blur(8px)';
656:   modal.style.webkitBackdropFilter = 'blur(8px)';
657:   modal.style.zIndex = '999999';
658:   modal.style.display = 'flex';
659:   modal.style.alignItems = 'center';
660:   modal.style.justifyContent = 'center';
661:   modal.style.padding = '20px';
662: 
663:   modal.innerHTML = `
664:     <div class="animate-scale-in" style="background:white; border-radius:24px; max-width:440px; width:100%; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); position:relative;">
665:       <div style="background:linear-gradient(135deg, #be1260 0%, #9f1239 100%); padding:28px 24px; text-align:center; color:white;">
666:         <div style="width:60px; height:60px; background:white; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); color:#be1260;">
667:           <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
668:             <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
669:             <path d="M13 5v2"/>
670:             <path d="M13 17v2"/>
671:             <path d="M13 11v2"/>
672:           </svg>
673:         </div>
674:         <h3 style="margin:0 0 4px 0; font-size:1.4rem; font-weight:800; color:white;">¡Canje Exitoso!</h3>
675:         <p style="margin:0; font-size:0.85rem; opacity:0.9;">Tus bonos ya están listos para usar</p>
676:       </div>
677: 
678:       <div style="padding:24px;">
679:         <div style="background:#fff1f2; border:1px solid #ffe4e6; border-radius:14px; padding:16px; margin-bottom:20px; font-size:0.85rem; color:#881337;">
680:           <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #fecdd3; padding-bottom:8px;">
681:             <span style="color:#9f1239;">Monto Canjeado:</span>
682:             <strong style="color:#be1260; font-size:1rem;">${formatCOP(amount)}</strong>
683:           </div>
684:           <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #fecdd3; padding-bottom:8px;">
685:             <span style="color:#9f1239;">Destino:</span>
686:             <strong style="color:#881337;">Bonos de Consumo</strong>
687:           </div>
688:           <div style="display:flex; justify-content:space-between;">
689:             <span style="color:#9f1239;">Disponibilidad:</span>
690:             <span style="background:#dcfce7; color:#15803d; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;">Inmediata</span>
691:           </div>
692:         </div>
693: 
694:         <p style="font-size:0.8rem; color:#64748b; line-height:1.4; margin:0 0 20px 0; text-align:center;">
695:           Tu saldo en Bonos de Consumo se ha acreditado. Ya puedes redimirlo en productos gourmet de la tienda.
696:         </p>
697: 
698:         <button id="btn-close-consumo-success" style="
699:           width:100%; background:#be1260; color:white; border:none; padding:14px;
700:           border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer;
701:           box-shadow:0 4px 12px rgba(190, 18, 96, 0.2); transition:all 0.2s;
702:         " onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
703:           Entendido
704:         </button>
705:       </div>
706:     </div>
707:   `;
708: 
709:   document.body.appendChild(modal);
710: 
711:   const closeReceipt = () => {
712:     modal.remove();
713:     if (onUpdated) {
714:       openWalletDrawer();
715:     }
716:   };
717: 
718:   document.getElementById('btn-close-consumo-success')?.addEventListener('click', closeReceipt);
719:   modal.addEventListener('click', (e) => { if (e.target === modal) closeReceipt(); });
720: }
721: 
722: /**
723:  * Backwards compatible standalone opener: opens wallet drawer with withdrawal subscreen pre-selected.
724:  */
725: export async function showRetiroSaldoModal(availableAmount) {
726:   const existingDrawer = document.getElementById('wallet-drawer-modal');
727:   if (existingDrawer) {
728:     const subContainer = document.getElementById('wallet-subscreen-container');
729:     if (subContainer) {
730:       openWalletWithdrawalSubscreen(subContainer, availableAmount);
731:       return;
732:     }
733:   }
734:   openWalletDrawer(false, true);
735: }
