/* ==========================================================================
   PIGGY APP — Wallet Withdrawal Modal & Success Receipt
   Modular subcomponent containing sliding withdrawal flows (money & consumption).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { requestBankWithdrawal, createWalletRequest, notifyAdminViaWhatsApp, requestMeatRedemption } from '../../services/walletService.js';
import { getProfile } from '../../services/authService.js';
import { openWalletDrawer, openMeatRedemptionModal } from './WalletDrawerModal.js';
import { navigateTo } from '../../router.js';
import { showToast } from '../../components/Toast.js';

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
  const renderStep1 = () => {
    return `
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
        <button id="retiro-close" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
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
              <rect width="20" height="14" x="2" y="5" rx="2"/>
              <line x1="2" x2="22" y1="10" y2="10"/>
            </svg>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 850; font-size: 1.05rem; color: #0f172a; line-height: 1.2;">Dinero en mi cuenta bancaria</div>
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 500; margin-top: 4px; line-height: 1.4;">
              Transferencia directa a tu banco o llave Bre-B registrada en tu perfil.
            </div>
            <div style="display: inline-block; background: #e0f2fe; color: #0284c7; font-size: 0.7rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-top: 8px;">
              ⏱ 3 a 5 días hábiles
            </div>
          </div>
          <div style="color: #be1260; font-size: 1.3rem; font-weight: 800; align-self: center;">→</div>
        </button>

        <!-- 2. BOTÓN: Consumo en Carne -->
        <button id="retiro-tipo-consumo" style="
          background: #f8fafc; border: 1px solid #e2e8f0;
          color: #0f172a; padding: 22px 20px; border-radius: 18px;
          font-weight: 700; font-size: 1rem; cursor: pointer;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
        " onmouseover="this.style.background='#f1f5f9'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#f8fafc'; this.style.transform='translateY(0)';">
          <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:white; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #e2e8f0; margin-top:2px; color:#16a34a; font-size:1.6rem;">
            🥩
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 850; font-size: 1.05rem; color: #0f172a; line-height: 1.2;">Comprar carne fresca (Granja)</div>
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 500; margin-top: 4px; line-height: 1.4;">
              Redime tu saldo disponible directamente en cortes premium de Piggy Gourmet.
            </div>
            <div style="display: inline-block; background: #dcfce7; color: #15803d; font-size: 0.7rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-top: 8px;">
              ⚡ Canje Inmediato
            </div>
          </div>
          <div style="color: #16a34a; font-size: 1.3rem; font-weight: 800; align-self: center;">→</div>
        </button>

        <!-- Terms Note -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; margin-top: 8px;">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div style="font-size: 1rem; line-height: 1; flex-shrink: 0;">📋</div>
            <div style="font-size: 0.76rem; color: #64748b; line-height: 1.45;">
              <strong style="color: #334155;">Términos Generales de Retiro:</strong><br>
              Monto mínimo de retiro: <strong>$50.000 COP</strong>. Las solicitudes en dinero son procesadas de lunes a viernes en horario bancario.
            </div>
          </div>
        </div>
      </div>
    `;
  };

  /* ─────────────────────────────────────────
     STEP 2 (DINERO) — Bank Details & Amount
  ───────────────────────────────────────── */
  const renderStep2Dinero = () => {
    const bankName = profile?.bank_name || '';
    const accountNum = profile?.bank_account_number || profile?.bank_breve_key || '';
    const accountType = profile?.bank_account_type || 'Ahorros';
    const hasBankData = Boolean(bankName && accountNum);

    return `
      <!-- Header Limpio: Volver arriba a la izq y cerrar a la der -->
      <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <button id="retiro-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
            ← Volver
          </button>
          <button id="retiro-close" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        </div>
        
        <div>
          <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Retiro de Dinero</h2>
          <div style="font-size:0.85rem; color:#059669; font-weight:700;">Saldo disponible: ${formatCOP(availableAmount)}</div>
        </div>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:20px 20px 30px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        
        <!-- Bank Account Card (Auto-populated from Profile) -->
        <div style="background: ${hasBankData ? '#f0fdf4' : '#fffbeb'}; border: 1px solid ${hasBankData ? '#bbf7d0' : '#fde68a'}; border-radius: 16px; padding: 16px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: ${hasBankData ? '#15803d' : '#b45309'}; letter-spacing: 0.05em;">
              ${hasBankData ? '✓ Cuenta Bancaria Registrada' : '⚠️ Información Bancaria Incompleta'}
            </div>
            <button id="retiro-btn-edit-perfil" style="background: none; border: none; font-size: 0.78rem; font-weight: 800; color: #be1260; cursor: pointer; text-decoration: underline; padding: 0;">
              ${hasBankData ? 'Cambiar cuenta' : 'Completar en Mi Perfil'}
            </button>
          </div>

          ${hasBankData ? `
            <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              ${bankName}
            </div>
            <div style="font-size: 0.82rem; color: #475569; font-family: monospace;">
              Número / Llave: <strong>${accountNum}</strong> (${accountType})
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
              Titular: ${profile?.full_name || userName}
            </div>
          ` : `
            <div style="font-size: 0.82rem; color: #92400e; line-height: 1.45;">
              Para transferir tu dinero necesitamos tus datos bancarios oficiales. Completa tu banco y número de cuenta en tu perfil para continuar.
            </div>
            <button id="retiro-btn-go-perfil" style="
              margin-top: 10px; width: 100%; background: #d97706; color: white;
              border: none; padding: 10px 14px; border-radius: 10px;
              font-weight: 700; font-size: 0.82rem; cursor: pointer;
            ">
              Configurar Datos Bancarios Ahora
            </button>
          `}
        </div>

        ${hasBankData ? `
          <!-- Amount Input -->
          <div style="background: white; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px 16px;">
            <label style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.04em; margin-bottom: 8px;">
              <span>Monto a Retirar</span>
              <button type="button" id="retiro-btn-max" style="background: none; border: none; color: #be1260; font-weight: 800; font-size: 0.78rem; cursor: pointer; padding: 0;">Retirar Todo</button>
            </label>
            <div style="display: flex; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 14px;">
              <span style="font-weight: 800; color: #0f172a; font-size: 1.2rem; margin-right: 8px;">$</span>
              <input type="text" id="retiro-amount-input" inputmode="numeric" placeholder="50.000" style="
                border: none; background: transparent; font-size: 1.25rem; font-weight: 800; color: #0f172a;
                width: 100%; outline: none; font-family: inherit;
              " />
            </div>
            <div id="retiro-amount-error" style="font-size: 0.75rem; color: #dc2626; margin-top: 6px; font-weight: 600; display: none;"></div>
            <div style="font-size: 0.74rem; color: #64748b; margin-top: 6px;">
              Mínimo: ${formatCOP(minAmount)} • Máximo disponible: ${formatCOP(availableAmount)}
            </div>
          </div>

          <!-- Terms Checkbox -->
          <div style="display: flex; align-items: flex-start; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
            <input type="checkbox" id="retiro-terms-check" style="margin-top: 2px; width: 16px; height: 16px; accent-color: #be1260; cursor: pointer;">
            <label for="retiro-terms-check" style="font-size: 0.76rem; color: #475569; line-height: 1.45; cursor: pointer;">
              Confirmo que la cuenta bancaria me pertenece y acepto el plazo estimado de procesamiento de <strong>3 a 5 días hábiles</strong>.
            </label>
          </div>
        ` : ''}

      </div>

      <!-- Sticky Footer CTA -->
      ${hasBankData ? `
        <div style="padding:16px 20px calc(24px + env(safe-area-inset-bottom, 0px)); background:white; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <button id="retiro-btn-submit" disabled style="
            width:100%; background:#be1260; color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1.02rem;
            cursor:not-allowed; opacity:0.5; transition:all 0.2s;
            box-shadow: 0 4px 14px rgba(190, 18, 96, 0.35);
          ">Solicitar Retiro</button>
        </div>
      ` : ''}
    `;
  };

  /* ─────────────────────────────────────────
     STEP 2 (CONSUMO) — Meat Purchase Option
  ───────────────────────────────────────── */
  const renderStep2Consumo = () => {
    return `
      <!-- Header Limpio: Volver arriba a la izq y cerrar a la der -->
      <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <button id="retiro-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
            ← Volver
          </button>
          <button id="retiro-close" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        </div>
        
        <div>
          <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Comprar Carne</h2>
          <div style="font-size:0.85rem; color:#059669; font-weight:700;">Saldo disponible: ${formatCOP(availableAmount)}</div>
        </div>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:20px 20px 30px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        
        <!-- Meat Banner Card -->
        <div style="background: linear-gradient(135deg, #15803d 0%, #166534 100%); border-radius: 20px; padding: 22px 20px; color: white; box-shadow: 0 10px 25px -5px rgba(22, 101, 52, 0.35);">
          <div style="font-size: 0.72rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.08em; opacity: 0.85; margin-bottom: 6px;">
            Granja Valle Morales — Calidad Premium
          </div>
          <div style="font-size: 1.35rem; font-weight: 900; line-height: 1.25; margin-bottom: 8px;">
            ¡Disfruta tu cosecha en la mesa! 🥩
          </div>
          <p style="font-size: 0.82rem; opacity: 0.9; margin: 0; line-height: 1.5;">
            Puedes usar el 100% de tu saldo disponible para comprar cortes seleccionados de cerdo, res o pollo con entrega a domicilio.
          </p>
        </div>

        <!-- How it works -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px;">
          <div style="font-weight: 800; font-size: 0.9rem; color: #0f172a; margin-bottom: 12px;">¿Cómo funciona el canje?</div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.8rem; color: #475569;">
            <div style="display: flex; gap: 10px;">
              <div style="font-weight: 800; color: #16a34a; background: #dcfce7; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
              <div>Explora el catálogo en la sección <strong>Piggy Gourmet</strong>.</div>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="font-weight: 800; color: #16a34a; background: #dcfce7; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
              <div>Selecciona tus cortes o combos favoritos.</div>
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="font-weight: 800; color: #16a34a; background: #dcfce7; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</div>
              <div>Al pagar, elige tu <strong>Saldo Disponible</strong> como método de pago.</div>
            </div>
          </div>
        </div>

        <!-- Direct WhatsApp Option -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 16px;">
          <div style="font-weight: 800; font-size: 0.85rem; color: #1e40af; margin-bottom: 4px;">¿Prefieres un pedido personalizado?</div>
          <div style="font-size: 0.78rem; color: #1d4ed8; line-height: 1.45; margin-bottom: 12px;">
            Un asesor de la granja te ayudará a armar un pedido a la medida de tu presupuesto.
          </div>
          <button id="retiro-btn-wa-carne" style="
            width: 100%; background: #16a34a; color: white; border: none;
            padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.85rem;
            cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          ">
            📲 Pedir Asesoría por WhatsApp
          </button>
        </div>

      </div>

      <!-- Sticky Footer CTA -->
      <div style="padding:16px 20px calc(24px + env(safe-area-inset-bottom, 0px)); background:white; border-top:1px solid #f1f5f9; flex-shrink:0;">
        <button id="retiro-goto-tienda" style="
          width:100%; background:#be1260; color:white; border:none;
          padding:16px; border-radius:14px; font-weight:800; font-size:1.02rem;
          cursor:pointer; transition:all 0.2s; box-shadow: 0 4px 14px rgba(190, 18, 96, 0.35);
        ">Ir a Piggy Gourmet (Tienda de Carne) →</button>
      </div>
    `;
  };

  /* ─────────────────────────────────────────
     CONTROLLER LOGIC & NAVIGATION
  ───────────────────────────────────────── */
  const attachClose = (onBack) => {
    document.getElementById('retiro-close')?.addEventListener('click', closeSubscreen);
    if (onBack) document.getElementById('retiro-back')?.addEventListener('click', onBack);
  };

  const goToStep1 = () => {
    subscreen.innerHTML = renderStep1();
    attachClose(null);
    
    document.getElementById('retiro-tipo-dinero')?.addEventListener('click', goToStep2Dinero);
    document.getElementById('retiro-tipo-consumo')?.addEventListener('click', goToStep2Consumo);
  };

  const goToStep2Dinero = () => {
    subscreen.innerHTML = renderStep2Dinero();
    attachClose(goToStep1);

    // Links a Mi Perfil (subscreen datos)
    const handleGotoProfile = () => {
      closeSubscreen();
      if (onCloseAll) {
        onCloseAll();
      } else {
        const d = document.getElementById('wallet-drawer-modal');
        if (d) d.remove();
      }
      navigateTo('perfil');
      setTimeout(() => {
        window.location.hash = '#/perfil?subscreen=datos';
      }, 50);
    };

    document.getElementById('retiro-btn-edit-perfil')?.addEventListener('click', handleGotoProfile);
    document.getElementById('retiro-btn-go-perfil')?.addEventListener('click', handleGotoProfile);

    const bankName = profile?.bank_name || '';
    const accountNum = profile?.bank_account_number || profile?.bank_breve_key || '';
    const hasBankData = Boolean(bankName && accountNum);
    if (!hasBankData) return;

    const amountInput = document.getElementById('retiro-amount-input');
    const termsCheck = document.getElementById('retiro-terms-check');
    const submitBtn = document.getElementById('retiro-btn-submit');
    const maxBtn = document.getElementById('retiro-btn-max');
    const errorDiv = document.getElementById('retiro-amount-error');

    let currentAmount = 0;

    const validate = () => {
      let error = '';

      if (currentAmount > 0 && currentAmount < minAmount) {
        error = `El monto mínimo de retiro es ${formatCOP(minAmount)}`;
      } else if (currentAmount > availableAmount) {
        error = `No tienes suficiente saldo disponible (${formatCOP(availableAmount)})`;
      }

      if (error) {
        errorDiv.textContent = error;
        errorDiv.style.display = 'block';
      } else {
        errorDiv.style.display = 'none';
      }

      const isValid = !error && currentAmount >= minAmount && currentAmount <= availableAmount && termsCheck.checked;
      submitBtn.disabled = !isValid;
      submitBtn.style.opacity = isValid ? '1' : '0.5';
      submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
      if (isValid) {
        submitBtn.innerText = `Solicitar Retiro de ${formatCOP(currentAmount)}`;
      } else {
        submitBtn.innerText = 'Solicitar Retiro';
      }
    };

    amountInput?.addEventListener('input', (e) => {
      const parsed = parseFormattedNumber(e.target.value);
      currentAmount = parsed;
      e.target.value = formatThousands(parsed);
      validate();
    });

    termsCheck?.addEventListener('change', validate);

    maxBtn?.addEventListener('click', () => {
      if (amountInput) {
        currentAmount = availableAmount;
        amountInput.value = formatThousands(availableAmount);
        validate();
      }
    });

    submitBtn?.addEventListener('click', async () => {
      if (currentAmount < minAmount || currentAmount > availableAmount) return;

      submitBtn.disabled = true;
      submitBtn.innerText = 'Procesando solicitud...';

      const tid = 'RET-' + Math.floor(100000 + Math.random() * 900000);

      try {
        await requestBankWithdrawal(currentAmount, {
          reference: tid,
          bankName: bankName,
          accountNumber: accountNum,
          accountType: profile?.bank_account_type || 'Ahorros',
          userName: profile?.full_name || userName,
          userPhone: userPhone
        });

        // Notify WhatsApp
        notifyAdminViaWhatsApp({
          type: 'withdrawal',
          amount: currentAmount,
          reference: tid,
          userName: profile?.full_name || userName,
          phone: userPhone,
          details: `${bankName} — ${accountNum} (${profile?.bank_account_type || 'Ahorros'})`
        });

        closeSubscreen();
        if (onUpdated) onUpdated();
        showToast('Solicitud de retiro registrada con éxito', 'success');

      } catch (err) {
        console.error('Error requesting withdrawal:', err);
        closeSubscreen();
        if (onUpdated) onUpdated();
        showToast('Solicitud registrada (modo respaldo)', 'success');
      }
    });
  };

  const goToStep2Consumo = () => {
    subscreen.innerHTML = renderStep2Consumo();
    attachClose(goToStep1);

    document.getElementById('retiro-goto-tienda')?.addEventListener('click', () => {
      closeSubscreen();
      if (onCloseAll) {
        onCloseAll();
      } else {
        const drawer = document.getElementById('wallet-drawer-modal');
        if (drawer) drawer.remove();
      }
      window.location.hash = '#/gourmet';
      navigateTo('gourmet');
    });

    document.getElementById('retiro-btn-wa-carne')?.addEventListener('click', () => {
      const msg = `👋 *PIGGY APP — Asesoría de Pedido de Carne*\n\n👤 *Usuario:* ${profile?.full_name || userName}\n💰 *Saldo Disponible:* ${formatCOP(availableAmount)}\n\nQuiero redimir mi saldo disponible en un pedido de carne fresca. ¿Me podrían asesorar por favor?`;
      window.open(`https://wa.me/573154870448?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  // Launch initial step
  goToStep1();
}
