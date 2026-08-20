/* ==========================================================================
   PIGGY APP — Wallet Recharge Modal
   Modular subcomponent containing the Wompi multi-step recharge flow.
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { openWompiWidget, getWompiEnvironment } from '../../services/wompiService.js';
import { rechargeWallet, requestBreBRecharge } from '../../services/walletService.js';

/**
 * Show the multi-step Wallet Recharge modal:
 * Step 1: Amount selector (Min $1.000.000 COP)
 * Step 2: Payment method (Bre-B 0%, Wompi +3%, Assisted WhatsApp)
 * Step 3: Bre-B instructions with official key @piggygranjamoral & WhatsApp confirmation
 * Step 4: Wompi processing animation
 * Step 5: Receipt / Success / Pending status
 *
 * @param {Object} liveStats - The stats object used by the current drawer (mutated in-place for mock mode)
 */
export async function openWalletRechargeInfo(liveStats = null) {
  const existing = document.getElementById('wallet-recharge-modal');
  if (existing) existing.remove();

  // Bloquear el scroll del fondo (body) para evitar scrollbars dobles
  document.body.style.overflow = 'hidden';

  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const ADMIN_WHATSAPP = '573154870448';
  const OFFICIAL_BRE_B_KEY = '@piggygranjamoral';

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
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  // Persistent white container
  const container = document.createElement('div');
  container.className = 'animate-scale-in';
  container.style.width = '100%';
  container.style.maxWidth = '520px';
  container.style.height = '100dvh';
  container.style.maxHeight = '100dvh';
  container.style.background = 'white';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.overflow = 'hidden';
  container.style.position = 'relative';
  container.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5)';

  modal.appendChild(container);
  document.body.appendChild(modal);

  const close = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  /* ── QUICK AMOUNT PRESETS (Mínimo $1.000.000 COP) ── */
  const PRESETS = [1000000, 2000000, 3000000, 5000000];
  let selectedAmount = 1000000;

  // Helper formatting functions for thousands separators (dots)
  const formatThousands = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseFormattedNumber = (val) => {
    if (!val) return 0;
    const digits = String(val).replace(/\D/g, '');
    return parseInt(digits, 10) || 0;
  };

  /* ─────────────────────────────────────────
     STEP 1 — Amount selector (Min $1.000.000)
  ───────────────────────────────────────── */
  const renderStep1 = () => {
    container.innerHTML = `
        ${getWompiEnvironment() === 'sandbox' ? `
          <div style="background:#fef9c3; border-bottom:1px solid #fde047; padding:8px 16px; text-align:center; color:#854d0e; font-size:0.75rem; font-weight:700; flex-shrink:0;">
            🧪 MODO PRUEBAS (SANDBOX) — Recargas simuladas sin cobro real
          </div>
        ` : ''}
        <!-- Sticky Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#10B981,#059669); display:flex; align-items:center; justify-content:center; color:white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <div>
              <div style="font-weight:800; font-size:1.15rem; color:#0f172a; line-height:1.2;">¿Cuánto quieres recargar?</div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Monto mínimo: $1.000.000 COP</div>
            </div>
          </div>
          <button id="rch-close" style="background:transparent; border:none; padding:4px 8px; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
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
              <input type="text" inputmode="numeric" id="rch-custom-amount" placeholder="Ej: 1.000.000"
                value="${formatThousands(selectedAmount)}"
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

          <!-- Términos y Condiciones -->
          <a href="terminos-y-condiciones.html" target="_blank" style="
            display:block; text-align:center; font-size:0.75rem; color:#64748b; font-weight:500;
            text-decoration:underline; margin-top:16px; cursor:pointer;
          ">Ver Términos y Condiciones</a>
        </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);

    const updatePresetStyles = (amount) => {
      container.querySelectorAll('.preset-btn').forEach(b => {
        const bAmount = parseInt(b.dataset.amount);
        if (bAmount === amount) {
          b.style.borderColor = '#10B981';
          b.style.background = '#ecfdf5';
          b.style.color = '#059669';
        } else {
          b.style.borderColor = '#e5e7eb';
          b.style.background = 'white';
          b.style.color = '#374151';
        }
      });
    };

    // Preset selection
    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAmount = parseInt(btn.dataset.amount);
        const customInput = document.getElementById('rch-custom-amount');
        if (customInput) customInput.value = formatThousands(selectedAmount);
        updatePresetStyles(selectedAmount);
      });
    });

    // Custom amount input con formateo automático de puntos
    const customInputEl = document.getElementById('rch-custom-amount');
    customInputEl.addEventListener('input', (e) => {
      const rawDigits = e.target.value.replace(/\D/g, '');
      if (!rawDigits) {
        e.target.value = '';
        selectedAmount = 0;
        updatePresetStyles(0);
        return;
      }
      const num = parseInt(rawDigits, 10);
      selectedAmount = num;
      e.target.value = formatThousands(num);
      updatePresetStyles(num);
    });

    document.getElementById('rch-step1-next').addEventListener('click', () => {
      const customVal = parseFormattedNumber(document.getElementById('rch-custom-amount').value);
      if (customVal >= 1000000) selectedAmount = customVal;
      if (!selectedAmount || selectedAmount < 1000000) {
        alert('El monto mínimo de recarga en Piggy es de $1.000.000 COP.');
        return;
      }
      renderStep2();
    });
  };

  /* ─────────────────────────────────────────
     STEP 2 — Payment method chooser
     Header limpio sin recuadro en "Volver",
     con Título y Monto ubicados debajo.
  ───────────────────────────────────────── */
  const renderStep2 = () => {
    // Cálculo transparente del 3% de pasarela para Wompi
    const wompiFee = Math.round(selectedAmount * 0.03);
    const wompiTotal = selectedAmount + wompiFee;

    container.innerHTML = `
        ${getWompiEnvironment() === 'sandbox' ? `
          <div style="background:#fef9c3; border-bottom:1px solid #fde047; padding:8px 16px; text-align:center; color:#854d0e; font-size:0.75rem; font-weight:700; flex-shrink:0;">
            🧪 MODO PRUEBAS (SANDBOX) — Recargas simuladas sin cobro real
          </div>
        ` : ''}
        
        <!-- Header Limpio: Volver arriba a la izq y cerrar a la der -->
        <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <button id="rch-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
              ← Volver
            </button>
            <button id="rch-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
          </div>
          
          <!-- Título y Monto ubicados debajo del botón Volver -->
          <div>
            <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Método de Pago</h2>
            <div style="font-size:0.85rem; color:#059669; font-weight:700;">Monto a recargar: ${formatCOP(selectedAmount)}</div>
          </div>
        </div>

        <!-- Scrollable Body Content (3 Botones en orden) -->
        <div style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:14px; -webkit-overflow-scrolling:touch;">
          
          <!-- 1. BOTÓN PRINCIPAL: Llave BRE-B (0% Comisión - Recomendado) -->
          <button id="rch-breb-btn" style="
            background: linear-gradient(135deg, #059669, #047857);
            color: white; border: none; padding: 18px 20px; border-radius: 16px;
            font-weight: 700; font-size: 1rem; cursor: pointer;
            display: flex; align-items: center; gap: 14px;
            box-shadow: 0 6px 20px rgba(5,150,105,0.35);
            text-align: left; transition: all 0.2s; position: relative; overflow: hidden;
          " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)';" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
            <div style="width:46px; height:46px; background:white; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#059669;">
              <span style="font-size:24px;">⚡</span>
            </div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px; flex-wrap:wrap;">
                <span style="font-size:1.02rem; font-weight:850;">Transferencia Bre-B</span>
                <span style="background:rgba(255,255,255,0.25); border-radius:6px; padding:2px 8px; font-size:0.68rem; font-weight:800; letter-spacing:0.4px;">0% COMISIÓN</span>
              </div>
              <div style="font-size:0.75rem; opacity:0.92; font-weight:400; line-height:1.3;">Desde cualquier banco · Llave ${OFFICIAL_BRE_B_KEY}</div>
              <div style="font-size:0.78rem; font-weight:800; margin-top:4px; color:#d1fae5;">Pagas exactos: ${formatCOP(selectedAmount)}</div>
            </div>
            <div style="color:white; font-size:1.2rem; font-weight:800;">→</div>
          </button>

          <!-- 2. BOTÓN SECUNDARIO: Wompi (+3% Costo de Procesamiento) -->
          <button id="rch-wompi-btn" style="
            background: linear-gradient(135deg, #6C14D0, #9B1DBA);
            color: white; border: none; padding: 18px 20px; border-radius: 16px;
            font-weight: 700; font-size: 1rem; cursor: pointer;
            display: flex; align-items: center; gap: 14px;
            box-shadow: 0 6px 20px rgba(108,20,208,0.3);
            text-align: left; transition: all 0.2s;
          " onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
            <div style="width:46px; height:46px; background:white; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span style="font-size:24px;">💳</span>
            </div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px; flex-wrap:wrap;">
                <span style="font-size:1.02rem; font-weight:850;">Pagar en línea con Wompi</span>
                <span style="background:rgba(255,255,255,0.22); border-radius:6px; padding:2px 8px; font-size:0.68rem; font-weight:800; letter-spacing:0.4px;">+3% PASARELA</span>
              </div>
              <div style="font-size:0.75rem; opacity:0.9; font-weight:400; line-height:1.3;">Bancolombia · Nequi · PSE · Tarjeta</div>
              <div style="font-size:0.78rem; font-weight:800; margin-top:4px; color:#fae8ff;">
                Total a pagar: ${formatCOP(wompiTotal)} <span style="font-size:0.7rem; font-weight:500; opacity:0.85;">(+${formatCOP(wompiFee)} tarifa)</span>
              </div>
            </div>
            <div style="color:white; font-size:1.2rem; font-weight:800;">→</div>
          </button>

          <!-- 3. BOTÓN TERCIARIO: Recarga Asistida (WhatsApp) -->
          <button id="rch-whatsapp-btn" style="
            background: white; border: 2px solid #e2e8f0; color: #1e293b;
            padding: 16px 18px; border-radius: 16px; font-weight: 600; font-size: 0.95rem;
            cursor: pointer; display: flex; align-items: center; gap: 14px; text-align: left;
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='#10B981';this.style.background='#f0fdf4';" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='white';">
            <div style="width:46px; height:46px; background:#ecfdf5; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span style="font-size:24px;">📲</span>
            </div>
            <div style="flex:1;">
              <div style="font-size:0.95rem; font-weight:750; color:#0f172a; margin-bottom:2px;">Recarga Asistida</div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:500;">Transferencia manual guiada con un asesor vía WhatsApp</div>
            </div>
            <div style="color:#94a3b8; font-size:1.1rem; font-weight:700;">→</div>
          </button>
        </div>

        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0 0 6px 0;">🔒 Transacciones seguras respaldadas por Piggy App</p>
          <a href="terminos-y-condiciones.html" target="_blank" style="
            display:inline-block; font-size:0.72rem; color:#64748b; font-weight:500;
            text-decoration:underline; cursor:pointer;
          ">Ver Términos y Condiciones</a>
        </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);
    document.getElementById('rch-back').addEventListener('click', renderStep1);

    // Botón 1: Bre-B
    document.getElementById('rch-breb-btn').addEventListener('click', () => {
      renderStep3BreB();
    });

    // Botón 2: Wompi con 3% de recargo
    const handleWompiOnline = async () => {
      renderStep4Processing(wompiTotal);
      const uiShell = document.getElementById('ui-shell');
      const prevUiDisplay = uiShell ? uiShell.style.display : '';
      const prevModalDisplay = modal.style.display;

      try {
        if (uiShell) uiShell.style.display = 'none';
        modal.style.display = 'none';
        document.body.style.overflow = '';

        // Se cobra el total con recargo (wompiTotal)
        const res = await openWompiWidget({
          amountInCOP: wompiTotal,
          userId: profile?.id || 'anon',
          customerData: { fullName: profile?.full_name || userName }
        });

        if (uiShell) uiShell.style.display = prevUiDisplay;
        modal.style.display = prevModalDisplay;
        document.body.style.overflow = 'hidden';

        if (res.status === 'CANCELLED') {
          renderStep2();
          return;
        }

        if (res.success) {
          // Se acredita el monto neto base (selectedAmount) en la Wallet
          const rechargeRes = await rechargeWallet(selectedAmount, 'wompi_widget', 'simulated_approved', mockState, res.reference);
          renderStep5Result({ ...rechargeRes, amountCredited: selectedAmount, totalPaid: wompiTotal });
        } else {
          renderStep5Result({ success: false, reason: res.reason || 'El pago no fue aprobado por Wompi.' });
        }
      } catch (err) {
        console.error('Error abriendo Wompi Widget:', err);
        if (uiShell) uiShell.style.display = prevUiDisplay;
        modal.style.display = prevModalDisplay;
        document.body.style.overflow = 'hidden';
        renderStep5Result({ success: false, reason: err.message || 'No se pudo iniciar la pasarela de pagos.' });
      }
    };

    document.getElementById('rch-wompi-btn').addEventListener('click', handleWompiOnline);

    // Botón 3: WhatsApp
    document.getElementById('rch-whatsapp-btn').addEventListener('click', () => {
      close();
      const msg = `🐷 *PIGGY APP — Solicitud de Recarga Asistida*\n\n👤 *Usuario:* ${userName}\n\n💰 Monto a recargar: *${formatCOP(selectedAmount)}*\n\n📋 Por favor indícame el número de cuenta y el proceso a seguir.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 — Bre-B Details & "Ya transferí"
  ───────────────────────────────────────── */
  const renderStep3BreB = () => {
    const breBRef = 'PGY-' + Math.floor(100000 + Math.random() * 900000);

    container.innerHTML = `
        <!-- Header Limpio -->
        <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <button id="rch-breb-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
              ← Volver a Métodos de Pago
            </button>
            <button id="rch-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
          </div>
          
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="margin:0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Transferencia Bre-B</h2>
              <span style="background:#ecfdf5; color:#059669; font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:6px; border:1px solid #a7f3d0;">0% COMISIÓN</span>
            </div>
            <div style="font-size:0.82rem; color:#64748b; margin-top:2px;">Transfiere desde cualquier banco de Colombia</div>
          </div>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;">
          
          <!-- Resumen de Monto -->
          <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5); border:1px solid #a7f3d0; border-radius:14px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:0.72rem; color:#065f46; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Monto Exacto a Transferir</div>
              <div style="font-size:1.4rem; font-weight:900; color:#065f46;">${formatCOP(selectedAmount)}</div>
            </div>
            <div style="font-size:28px;">⚡</div>
          </div>

          <!-- RECUADRO DE LLAVE BRE-B OFICIAL -->
          <div style="background:#f8fafc; border:2px solid #e2e8f0; border-radius:16px; padding:18px; margin-bottom:14px;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">
              Llave Bre-B Oficial
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; background:white; border:1.5px solid #cbd5e1; border-radius:12px; padding:12px 14px; margin-bottom:6px;">
              <span id="breb-key-text" style="font-size:1.15rem; font-weight:900; color:#0f172a; letter-spacing:0.5px; font-family:monospace;">${OFFICIAL_BRE_B_KEY}</span>
              <button id="btn-copy-breb-key" style="
                background: #059669; color: white; border: none; padding: 8px 14px;
                border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer;
                display: flex; align-items: center; gap: 6px; transition: all 0.15s;
              " onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
                📋 Copiar Llave
              </button>
            </div>
            <div id="toast-copy-breb" style="display:none; font-size:0.75rem; color:#059669; font-weight:700; text-align:right; margin-top:2px;">
              ¡Llave copiada al portapapeles! 📋
            </div>
            <div style="font-size:0.75rem; color:#64748b; margin-top:8px; line-height:1.4;">
              <strong>Titular:</strong> Granja Villa Morales del Valle SAS<br>
              <strong>Banco:</strong> Bancolombia
            </div>
          </div>

          <!-- BOTÓN "YA TRANSFERÍ" (Ubicado justo debajo de la llave) -->
          <div style="margin-bottom:20px;">
            <button id="btn-breb-ya-transferi" style="
              width: 100%;
              background: linear-gradient(135deg, #25D366, #128C7E);
              color: white;
              border: none;
              padding: 16px 20px;
              border-radius: 14px;
              font-weight: 850;
              font-size: 1.05rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              box-shadow: 0 6px 18px rgba(37,211,102,0.35);
              transition: all 0.2s;
            " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)';" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.364 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592z"/>
              </svg>
              Ya transferí
            </button>
            <p style="margin:8px 0 0 0; font-size:0.78rem; color:#64748b; text-align:center; line-height:1.4;">
              Una vez hayas hecho la transferencia, oprime este botón para enviarnos el comprobante de pago.
            </p>
          </div>

          <!-- Pasos para transferir -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px;">
            <div style="font-size:0.75rem; font-weight:800; color:#334155; text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px;">
              ¿Cómo hacer tu pago?
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; font-size:0.8rem; color:#475569; line-height:1.4;">
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <span style="background:#e2e8f0; color:#0f172a; font-weight:800; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.75rem;">1</span>
                <span>Abre la app de tu banco (Bancolombia, Nequi, Daviplata, Nu, etc.).</span>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <span style="background:#e2e8f0; color:#0f172a; font-weight:800; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.75rem;">2</span>
                <span>Selecciona transferir por <strong>Bre-B</strong> y pega la llave <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-weight:700; color:#0f172a;">${OFFICIAL_BRE_B_KEY}</code> por el valor de <strong>${formatCOP(selectedAmount)}</strong>.</span>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <span style="background:#e2e8f0; color:#0f172a; font-weight:800; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.75rem;">3</span>
                <span>Oprime el botón <strong>Ya transferí</strong> para enviarnos tu comprobante.</span>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:14px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0;">🔒 Interoperabilidad oficial Banco de la República de Colombia</p>
        </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);
    document.getElementById('rch-breb-back').addEventListener('click', renderStep2);

    // Copiado exclusivo de la llave (SOLO el texto @piggygranjamoral)
    document.getElementById('btn-copy-breb-key').addEventListener('click', () => {
      navigator.clipboard.writeText(OFFICIAL_BRE_B_KEY).then(() => {
        const toast = document.getElementById('toast-copy-breb');
        if (toast) {
          toast.style.display = 'block';
          setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }
      });
    });

    // Acción al pulsar "Ya transferí":
    // 1. Envía a la tabla wallet_transactions la solicitud en PENDING
    // 2. Abre WhatsApp para enviar comprobante
    // 3. Muestra pantalla de confirmación pendiente
    document.getElementById('btn-breb-ya-transferi').addEventListener('click', async () => {
      const btn = document.getElementById('btn-breb-ya-transferi');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Registrando solicitud...';

      try {
        // Registro en wallet_transactions (PENDING)
        await requestBreBRecharge({
          amount: selectedAmount,
          reference: breBRef,
          breBKey: OFFICIAL_BRE_B_KEY,
          mockState
        });

        // Abrir WhatsApp con el comprobante y referencia
        const msg = `🐷 *PIGGY APP — Comprobante de Recarga Bre-B*\n\n` +
          `👤 *Usuario:* ${userName}\n` +
          `💵 *Monto:* ${formatCOP(selectedAmount)} COP\n` +
          `🔑 *Llave:* ${OFFICIAL_BRE_B_KEY}\n` +
          `🎫 *Referencia:* #${breBRef}\n` +
          `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n` +
          `Hola, acabo de realizar la transferencia por Bre-B. Adjunto mi comprobante para que acrediten mi saldo en la Cuenta Agro.`;

        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');

        // Mostrar pantalla de solicitud pendiente registrada
        renderStep5BreBPending(breBRef);
      } catch (err) {
        console.error('Error registrando recarga Bre-B:', err);
        btn.disabled = false;
        btn.innerHTML = 'Ya transferí';
        alert('Hubo un inconveniente registrando tu solicitud. Por favor intenta de nuevo.');
      }
    });
  };

  /* ─────────────────────────────────────────
     STEP 4 — Wompi Processing animation
  ───────────────────────────────────────── */
  const renderStep4Processing = (wompiTotalAmount) => {
    container.innerHTML = `
        <div style="background:linear-gradient(135deg,#6C14D0,#9B1DBA); padding:18px 24px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
          <div style="font-weight:900; font-size:1.15rem; color:white;">🔐 wompi</div>
          <div style="font-size:0.75rem; color:white; opacity:0.85; background:rgba(255,255,255,0.15); padding:4px 12px; border-radius:20px;">by Bancolombia</div>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; text-align:center;">
          <div style="width:74px; height:74px; margin:0 auto 24px;">
            <div style="width:74px; height:74px; border:4px solid #ede9fe; border-top-color:#6C14D0; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          </div>
          <h3 style="margin:0 0 8px; font-size:1.25rem; font-weight:800; color:#0f172a;">Iniciando pago en línea...</h3>
          <p style="margin:0; font-size:0.88rem; color:#64748b; line-height:1.5; max-width:320px;">
            Conectando con la pasarela de Wompi para tu pago de <strong style="color:#6C14D0;">${formatCOP(wompiTotalAmount)}</strong>.<br><br>
            Abono a tu Wallet: <strong style="color:#059669;">${formatCOP(selectedAmount)}</strong>.
          </p>
        </div>
        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0;">🔒 Transacción cifrada con SSL · Wompi by Bancolombia</p>
        </div>
    `;

    if (!document.getElementById('wompi-spin-style')) {
      const style = document.createElement('style');
      style.id = 'wompi-spin-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
  };

  /* ─────────────────────────────────────────
     STEP 5 — Bre-B Pending Receipt
  ───────────────────────────────────────── */
  const renderStep5BreBPending = (refId) => {
    container.innerHTML = `
        <div style="background:linear-gradient(135deg,#059669,#047857); padding:28px 24px; text-align:center; color:white; flex-shrink:0;">
          <div style="font-size:44px; margin-bottom:8px;">⏳</div>
          <div style="font-weight:900; font-size:0.9rem; opacity:0.9; margin-bottom:2px;">⚡ BRE-B COLOMBIA</div>
          <h3 style="margin:0 0 4px; font-size:1.35rem; font-weight:900;">¡Solicitud en Verificación!</h3>
          <p style="margin:0; font-size:0.85rem; opacity:0.92;">Hemos registrado tu reporte de transferencia</p>
        </div>

        <div style="flex:1; overflow-y:auto; padding:24px 20px; -webkit-overflow-scrolling:touch;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:18px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed #cbd5e1;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:700;">REFERENCIA</span>
              <span style="font-size:0.85rem; color:#0f172a; font-weight:900; font-family:monospace;">#${refId}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Monto a acreditar</span>
              <span style="font-size:0.95rem; font-weight:850; color:#059669;">${formatCOP(selectedAmount)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Método</span>
              <span style="font-size:0.85rem; font-weight:700; color:#0f172a;">Llave Bre-B (${OFFICIAL_BRE_B_KEY})</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Estado</span>
              <span style="font-size:0.78rem; font-weight:800; background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:8px;">PENDIENTE DE REVISIÓN</span>
            </div>
          </div>

          <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:0.82rem; color:#065f46; line-height:1.45;">
            ✅ En cuanto nuestro equipo valide el comprobante con la cuenta bancaria, el saldo se sumará automáticamente a tu <strong>Cuenta Agro</strong>.
          </div>

          <button id="breb-result-close" style="
            width:100%; background:linear-gradient(135deg,#10B981,#059669); color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
            box-shadow:0 4px 14px rgba(16,185,129,0.35); transition:opacity 0.2s;
          ">Entendido, ir a Mi Cuenta Agro</button>
        </div>

        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0;">🔒 Cuentas Agro seguras · Piggy App</p>
        </div>
    `;

    document.getElementById('breb-result-close').addEventListener('click', () => {
      close();
      import('./WalletBlock.js').then(({ openWalletDrawer }) => openWalletDrawer()).catch(() => {});
    });
  };

  /* ─────────────────────────────────────────
     STEP 5 — Wompi Result (success or failure)
  ───────────────────────────────────────── */
  const renderStep5Result = (result) => {
    const isApproved = result.success;
    const refId = (result.transactionId || Date.now().toString()).slice(-10).toUpperCase();
    const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    container.innerHTML = `
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
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Saldo acreditado</span>
              <span style="font-size:0.9rem; font-weight:800; color:${isApproved ? '#16a34a' : '#dc2626'};">${isApproved ? '+' : ''}${formatCOP(selectedAmount)}</span>
            </div>
            ${result.totalPaid ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Total pagado (con 3%)</span>
              <span style="font-size:0.85rem; font-weight:700; color:#475569;">${formatCOP(result.totalPaid)}</span>
            </div>
            ` : ''}
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
            💡 El pago no pudo completarse. Puedes intentarlo con otro medio o utilizar <strong>Bre-B (0% comisión)</strong>.
            ${result.reason && result.reason !== 'simulated_rejected' ? `
            <div style="margin-top:10px; padding-top:10px; background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; color:#991b1b; font-size:0.75rem; word-break:break-all;">
              <strong>Detalle:</strong> ${result.reason}
            </div>
            ` : ''}
          </div>
          ` : `
          <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:0.82rem; color:#065f46; font-weight:600;">
            ✅ Tu saldo en Cuenta Agro ha sido acreditado exitosamente.
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
    `;

    document.getElementById('wompi-result-close').addEventListener('click', () => {
      close();
      if (isApproved && liveStats) {
        liveStats.saldoDisponible = mockState.balance;
        liveStats.saldoDisponibleFormatted = formatCOP(mockState.balance);
        liveStats.transactions = mockState.transactions;

        const balanceEl = document.querySelector('#wallet-drawer-modal [data-wallet-balance]');
        if (balanceEl) balanceEl.textContent = formatCOP(mockState.balance);
      }
      import('../../services/walletService.js').then(({ getWalletBalance, getWalletTransactions }) => {
        Promise.all([getWalletBalance(), getWalletTransactions()]).then(([newBal, newTxs]) => {
          if (liveStats) {
            liveStats.saldoDisponible = newBal;
            liveStats.saldoDisponibleFormatted = formatCOP(newBal);
            liveStats.transactions = newTxs;
          }
          import('./WalletBlock.js').then(({ openWalletDrawer }) => openWalletDrawer());
        }).catch(() => {});
      }).catch(() => {});
    });
  };

  // Kick off the flow at Step 1
  renderStep1();
}
