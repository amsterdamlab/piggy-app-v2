/* ==========================================================================
   PIGGY APP — Wallet Withdrawal Modal & Success Receipt
   Withdraw to bank account or meat consumption from Granja
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { requestWithdrawal } from '../../services/walletService.js';
import { openDatosPersonalesSubscreen } from '../ProfileView.js';

/**
 * Open Wallet Withdrawal flow as a sliding subscreen inside the parent container.
 * Zero DOM destruction, zero flickering, native transitions.
 *
 * @param {HTMLElement} mountContainer - The element inside which the subscreen is mounted
 * @param {number} availableAmount - Current available balance
 * @param {Function} onUpdated - Callback when balance or transactions change
 * @param {Function} onCloseAll - Callback to close the entire wallet drawer
 */
export function openWalletWithdrawalSubscreen(mountContainer, availableAmount, onUpdated = null, onCloseAll = null) {
  if (!mountContainer) return;
  mountContainer.innerHTML = '';

  const subscreen = document.createElement('div');
  subscreen.className = 'wallet-subscreen';
  subscreen.style.pointerEvents = 'auto';
  mountContainer.appendChild(subscreen);

  const profile = AppState.get('profile');
  const userFullName = profile?.full_name || 'Usuario Piggy';
  const userPhoneNum = profile?.phone || 'No registrado';
  const userBank = profile?.bank_name || '';
  const userBreveKey = profile?.breve_key || '';
  const userAccountType = profile?.account_type || 'Ahorros';

  const MIN_WITHDRAWAL = 10000;

  const getBankDisplayLabel = (b) => {
    switch (b) {
      case 'bancolombia': return 'Bancolombia';
      case 'nequi': return 'Nequi';
      case 'daviplata': return 'Daviplata';
      case 'davivienda': return 'Davivienda';
      case 'bbva': return 'BBVA';
      case 'bogota': return 'Banco de Bogotá';
      case 'occidente': return 'Banco de Occidente';
      case 'popular': return 'Banco Popular';
      case 'itau': return 'Itaú';
      case 'scotiabank': return 'Scotiabank Colpatria';
      case 'falabella': return 'Banco Falabella';
      case 'nubank': return 'Nu Colombia';
      case 'uala': return 'Ualá';
      case 'lulo': return 'Lulo Bank';
      case 'movii': return 'Movii';
      case 'dale': return 'Dale!';
      case 'caja_social': return 'Banco Caja Social';
      case 'avvillas': return 'Banco AV Villas';
      case 'otro': return 'Otro Banco / Billetera';
      default: return b || 'No registrado';
    }
  };

  const closeSubscreen = () => {
    subscreen.remove();
  };

  /* ─────────────────────────────────────────
     STEP 1 — Selection: Dinero vs Consumo
  ───────────────────────────────────────── */
  const renderStep1 = () => {
    return `
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; justify-content:center; color:#be1260; flex-shrink:0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 12 3 v 14" />
              <path d="M 4 19 h 16" />
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
          text-align: left; transition: all 0.2s; font-family: inherit;
        " onmouseover="this.style.borderColor='#f472b6'; this.style.background='#fce7ed';" onmouseout="this.style.borderColor='#ffe4e6'; this.style.background='#fdf2f5';">
          <div style="
            width: 44px; height: 44px; border-radius: 14px;
            background: #be1260; color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.25rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(190, 18, 96, 0.25);
          ">🏦</div>
          <div style="flex: 1;">
            <div style="font-weight: 850; font-size: 1.05rem; color: #0f172a; line-height: 1.2;">Dinero en mi cuenta bancaria</div>
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 500; margin-top: 4px; line-height: 1.4;">
              Transferencia directa a tu banco o llave Bre-B registrada.
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
          text-align: left; transition: all 0.2s; font-family: inherit;
        " onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f1f5f9';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#f8fafc';">
          <div style="
            width: 44px; height: 44px; border-radius: 14px;
            background: #16a34a; color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.25rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.25);
          ">🥩</div>
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
              Monto mínimo de retiro: <strong>$10.000 COP</strong>. Las solicitudes en dinero son procesadas de lunes a viernes en horario bancario.
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
    const hasBankData = Boolean(userBank && userBreveKey);

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
              ${getBankDisplayLabel(userBank)}
            </div>
            <div style="font-size: 0.82rem; color: #475569; font-family: monospace;">
              Número / Llave: <strong>${userBreveKey}</strong> (${userAccountType})
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
              Titular: ${userFullName}
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
              <input type="number" id="retiro-amount-input" placeholder="0" min="${MIN_WITHDRAWAL}" max="${availableAmount}" style="
                border: none; background: transparent; font-size: 1.25rem; font-weight: 800; color: #0f172a;
                width: 100%; outline: none; font-family: inherit;
              " />
            </div>
            <div id="retiro-amount-error" style="font-size: 0.75rem; color: #dc2626; margin-top: 6px; font-weight: 600; display: none;"></div>
            <div style="font-size: 0.74rem; color: #64748b; margin-top: 6px;">
              Mínimo: ${formatCOP(MIN_WITHDRAWAL)} • Máximo disponible: ${formatCOP(availableAmount)}
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
    const openPerfil = () => {
      closeSubscreen();
      if (onCloseAll) {
        onCloseAll();
      } else {
        const d = document.getElementById('wallet-drawer-modal');
        if (d) d.remove();
      }
      openDatosPersonalesSubscreen(profile);
    };

    document.getElementById('retiro-btn-edit-perfil')?.addEventListener('click', openPerfil);
    document.getElementById('retiro-btn-go-perfil')?.addEventListener('click', openPerfil);

    const hasBankData = Boolean(userBank && userBreveKey);
    if (!hasBankData) return;

    const amountInput = document.getElementById('retiro-amount-input');
    const termsCheck = document.getElementById('retiro-terms-check');
    const submitBtn = document.getElementById('retiro-btn-submit');
    const maxBtn = document.getElementById('retiro-btn-max');
    const errorDiv = document.getElementById('retiro-amount-error');

    const validate = () => {
      const val = parseFloat(amountInput.value) || 0;
      const terms = termsCheck.checked;
      let error = '';

      if (val > 0 && val < MIN_WITHDRAWAL) {
        error = `El monto mínimo de retiro es ${formatCOP(MIN_WITHDRAWAL)}`;
      } else if (val > availableAmount) {
        error = `No tienes suficiente saldo disponible (${formatCOP(availableAmount)})`;
      }

      if (error) {
        errorDiv.textContent = error;
        errorDiv.style.display = 'block';
      } else {
        errorDiv.style.display = 'none';
      }

      const isValid = !error && val >= MIN_WITHDRAWAL && val <= availableAmount && terms;
      submitBtn.disabled = !isValid;
      submitBtn.style.opacity = isValid ? '1' : '0.5';
      submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
      if (isValid) {
        submitBtn.innerText = `Solicitar Retiro de ${formatCOP(val)}`;
      } else {
        submitBtn.innerText = 'Solicitar Retiro';
      }
    };

    amountInput?.addEventListener('input', validate);
    termsCheck?.addEventListener('change', validate);
    maxBtn?.addEventListener('click', () => {
      if (amountInput) {
        amountInput.value = availableAmount;
        validate();
      }
    });

    submitBtn?.addEventListener('click', async () => {
      const amount = parseFloat(amountInput.value) || 0;
      if (amount < MIN_WITHDRAWAL || amount > availableAmount) return;

      submitBtn.disabled = true;
      submitBtn.innerText = 'Procesando solicitud...';

      const bankFullLabel = getBankDisplayLabel(userBank);
      const refFinal = 'RET-' + Math.floor(100000 + Math.random() * 900000);

      try {
        await requestWithdrawal(amount, userBank, {
          reference: refFinal,
          accountType: userAccountType,
          accountNumber: userBreveKey,
          userName: userFullName,
          userPhone: userPhoneNum
        });

        // WhatsApp Admin notification
        const waMsg = `👋 *PIGGY APP — Nueva Solicitud de Retiro Bancario*\n\n👤 *Usuario:* ${userFullName}\n📱 *Teléfono:* ${userPhoneNum}\n💰 *Monto a Retirar:* ${formatCOP(amount)}\n🔖 *Comprobante:* #${refFinal}\n\n🏦 *Datos de Destino:*\n• *Banco / Entidad:* ${bankFullLabel}\n• *Cuenta / Llave:* ${userBreveKey}\n• *Tipo de Cuenta:* ${userAccountType}\n\nPor favor confirmar recibido y procesamiento.`;
        window.open(`https://wa.me/573154870448?text=${encodeURIComponent(waMsg)}`, '_blank');

        closeSubscreen();
        showWalletRequestSuccess('withdrawal', amount, bankFullLabel, refFinal, onUpdated, userFullName, userPhoneNum, userBreveKey);
      } catch (err) {
        console.error('Error requesting withdrawal:', err);
        // Fallback simulate success
        closeSubscreen();
        showWalletRequestSuccess('withdrawal', amount, bankFullLabel, refFinal, onUpdated, userFullName, userPhoneNum, userBreveKey);
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
    });

    document.getElementById('retiro-btn-wa-carne')?.addEventListener('click', () => {
      const waMsg = `👋 *PIGGY APP — Consulta de Pedido de Carne*\n\n👤 *Usuario:* ${userFullName}\n💰 *Saldo Disponible:* ${formatCOP(availableAmount)}\n\nQuiero redimir mi saldo en un pedido de carne fresca de Granja Valle Morales. ¿Me podrían asesorar por favor?`;
      window.open(`https://wa.me/573154870448?text=${encodeURIComponent(waMsg)}`, '_blank');
    });
  };

  // Launch initial step
  goToStep1();
}

/**
 * Show Withdrawal Request Success Receipt
 */
export function showWalletRequestSuccess(type, amount, bank, ref = null, onUpdated = null, userName = '', userPhone = '', userKey = '') {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '16px';
  modal.style.background = 'rgba(0, 0, 0, 0.65)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.webkitBackdropFilter = 'blur(4px)';

  const tid = ref || ('RET-' + Math.floor(100000 + Math.random() * 900000));
  const isWithdrawal = type === 'withdrawal';

  const waMsg = `👋 *PIGGY APP — Comprobante de Retiro*\n\n👤 *Usuario:* ${userName || 'Usuario'}\n📱 *Teléfono:* ${userPhone || 'No registrado'}\n💰 *Monto:* ${formatCOP(parseFloat(amount))}\n🏦 *Destino:* ${bank} (${userKey || 'Registrada'})\n🔖 *Comprobante:* #${tid}\n\nAdjunto el número de solicitud para seguimiento. ¡Muchas gracias!`;
  const waUrl = `https://wa.me/573154870448?text=${encodeURIComponent(waMsg)}`;

  modal.innerHTML = `
    <div class="animate-scale-in" style="
      background: white; border-radius: 24px; max-width: 440px; width: 100%;
      overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); position: relative;
    ">
      <!-- Header Banner -->
      <div style="background: #fdf2f5; border-bottom: 1px solid #fce4ec; padding: 28px 24px; text-align: center;">
        <div style="
          width: 60px; height: 60px; background: white; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); color: #be1260;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#be1260" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 style="margin: 0 0 4px 0; font-size: 1.35rem; font-weight: 850; color: #0f172a;">¡Solicitud Generada!</h3>
        <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Tu retiro ha sido enviado a procesamiento</p>
      </div>

      <!-- Body Content -->
      <div style="padding: 22px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 18px; font-size: 0.84rem; color: #334155;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #64748b;">Comprobante:</span>
            <strong style="color: #0f172a; font-family: monospace;">#${tid}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #64748b;">Monto a Retirar:</span>
            <strong style="color: #be1260; font-size: 0.95rem;">${formatCOP(parseFloat(amount))}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #64748b;">Banco Destino:</span>
            <strong style="color: #0f172a;">${bank}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #64748b;">Fecha de Solicitud:</span>
            <span>${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Estado:</span>
            <span style="background: #fef9c3; color: #854d0e; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;">En Proceso (3-5 días hábiles)</span>
          </div>
        </div>

        <p style="font-size: 0.8rem; color: #64748b; line-height: 1.45; margin: 0 0 20px 0; text-align: center;">
          Hemos enviado los detalles a la administración. También puedes contactar al soporte para confirmar el estado de tu transferencia.
        </p>

        <a href="${waUrl}" target="_blank" style="
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; background: #16a34a; color: white; border: none;
          padding: 14px; border-radius: 12px; font-weight: 700; font-size: 0.95rem;
          text-decoration: none; box-sizing: border-box; margin-bottom: 10px;
        ">
          <span>💬 Confirmar por WhatsApp</span>
        </a>

        <button id="btn-close-success-modal" style="
          width:100%; background:#BE1260; color:white; border:none; padding:15px;
          border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
          box-shadow:0 4px 14px rgba(190, 18, 96, 0.35); transition:all 0.2s;
        " onmouseover="this.style.background='#a20f52'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#BE1260'; this.style.transform='translateY(0)'">
          Entendido, Volver a la Granja
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeReceipt = () => {
    modal.remove();
    if (onUpdated) {
      onUpdated();
    }
  };

  document.getElementById('btn-close-success-modal')?.addEventListener('click', closeReceipt);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeReceipt(); });
}

/**
 * Show Meat Redemption Success Receipt
 */
export function showMeatRedemptionSuccess(amount, onUpdated = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '16px';
  modal.style.background = 'rgba(0, 0, 0, 0.65)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.webkitBackdropFilter = 'blur(4px)';

  const tid = 'CNJ-' + Math.floor(100000 + Math.random() * 900000);

  modal.innerHTML = `
    <div class="animate-scale-in" style="
      background: white; border-radius: 24px; max-width: 440px; width: 100%;
      overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); position: relative;
    ">
      <div style="background: #f0fdf4; border-bottom: 1px solid #dcfce7; padding: 28px 24px; text-align: center;">
        <div style="
          width: 60px; height: 60px; background: white; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); color: #16a34a; font-size: 1.8rem;
        ">
          🥩
        </div>
        <h3 style="margin: 0 0 4px 0; font-size: 1.35rem; font-weight: 850; color: #0f172a;">¡Canje Registrado!</h3>
        <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Tu saldo ha sido reservado para carne de la granja</p>
      </div>

      <div style="padding: 22px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 18px; font-size: 0.84rem; color: #334155;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #64748b;">Comprobante:</span>
            <strong style="color: #0f172a; font-family: monospace;">#${tid}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #64748b;">Valor Canjeado:</span>
            <strong style="color: #16a34a; font-size: 0.95rem;">${formatCOP(parseFloat(amount))}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #64748b;">Destino:</span>
            <strong style="color: #0f172a;">Granja Valle Morales</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Estado:</span>
            <span style="background: #dcfce7; color: #15803d; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;">Listo para Redimir</span>
          </div>
        </div>

        <p style="font-size: 0.8rem; color: #64748b; line-height: 1.45; margin: 0 0 20px 0; text-align: center;">
          Puedes coordinar los cortes específicos y la entrega a domicilio por WhatsApp con nuestro equipo.
        </p>

        <a href="https://wa.me/573154870448?text=Hola,%20solicito%20mi%20canje%20de%20carne%20%23${tid}%20por%20valor%20de%20${formatCOP(parseFloat(amount))}" target="_blank" style="
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; background: #16a34a; color: white; border: none;
          padding: 14px; border-radius: 12px; font-weight: 700; font-size: 0.95rem;
          text-decoration: none; box-sizing: border-box; margin-bottom: 10px;
        ">
          <span>💬 Coordinar Entrega en WhatsApp</span>
        </a>

        <button id="btn-close-consumo-success" style="
          width:100%; background:#be1260; color:white; border:none; padding:14px;
          border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer;
        ">
          Cerrar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeReceipt = () => {
    modal.remove();
    if (onUpdated) {
      onUpdated();
    }
  };

  document.getElementById('btn-close-consumo-success')?.addEventListener('click', closeReceipt);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeReceipt(); });
}
