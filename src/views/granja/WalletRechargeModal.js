/* ==========================================================================
   PIGGY APP — Wallet Recharge Modal
   Modular subcomponent containing the Wompi multi-step recharge flow.
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { openWompiWidget, getWompiEnvironment } from '../../services/wompiService.js';
import { rechargeWallet } from '../../services/walletService.js';

/**
 * Show the multi-step Wallet Recharge modal:
 * Step 1: Amount selector
 * Step 2: Payment method (Wompi Online or WhatsApp Assisted)
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
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  // Persistent white container to prevent black flickers
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

  /* ── QUICK AMOUNT PRESETS ── */
  const PRESETS = [200000, 500000, 1000000, 2000000];
  let selectedAmount = 200000;

  /* ─────────────────────────────────────────
     STEP 1 — Amount selector
  ───────────────────────────────────────── */
  const renderStep1 = () => {
    container.innerHTML = `
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
    `;

    document.getElementById('rch-close').addEventListener('click', close);

    // Preset selection: Actualización reactiva de estilos para evitar re-renderizado total (flicker)
    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAmount = parseInt(btn.dataset.amount);
        const customInput = document.getElementById('rch-custom-amount');
        if (customInput) customInput.value = '';

        container.querySelectorAll('.preset-btn').forEach(b => {
          b.style.borderColor = '#e5e7eb';
          b.style.background = 'white';
          b.style.color = '#374151';
        });
        btn.style.borderColor = '#10B981';
        btn.style.background = '#ecfdf5';
        btn.style.color = '#059669';
      });
    });

    // Custom amount input
    document.getElementById('rch-custom-amount').addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      if (!isNaN(v) && v > 0) {
        selectedAmount = v;
        // Quitar selección visual de los presets
        container.querySelectorAll('.preset-btn').forEach(b => {
          b.style.borderColor = '#e5e7eb';
          b.style.background = 'white';
          b.style.color = '#374151';
        });
      }
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
    container.innerHTML = `
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
    `;

    document.getElementById('rch-close').addEventListener('click', close);
    document.getElementById('rch-back').addEventListener('click', renderStep1);

    const handleWompiOnline = async () => {
      renderStep4Processing();
      const uiShell = document.getElementById('ui-shell');
      const prevUiDisplay = uiShell ? uiShell.style.display : '';
      const prevModalDisplay = modal.style.display;

      try {
        // Ocultar la aplicación de fondo y el modal para que no causen scrollbar extra
        if (uiShell) uiShell.style.display = 'none';
        modal.style.display = 'none';

        // Habilitar temporalmente el scroll del body para que el iframe de Wompi responda al scroll
        document.body.style.overflow = '';

        const res = await openWompiWidget({
          amountInCOP: selectedAmount,
          userId: profile?.id || 'anon',
          customerData: { fullName: profile?.full_name || userName }
        });

        // Restaurar visibilidad
        if (uiShell) uiShell.style.display = prevUiDisplay;
        modal.style.display = prevModalDisplay;
        // Bloquear nuevamente el scroll
        document.body.style.overflow = 'hidden';

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
        if (uiShell) uiShell.style.display = prevUiDisplay;
        modal.style.display = prevModalDisplay;
        document.body.style.overflow = 'hidden';
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
          <p style="margin:0; font-size:0.88rem; color:#64748b; line-height:1.5; max-width:320px;">Conectando con los servidores seguros de Wompi para tu recarga de <strong style="color:#059669;">${formatCOP(selectedAmount)}</strong>.<br><br>Por favor completa el pago en la ventana emergente.</p>
        </div>
        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0;">🔒 Transacción cifrada con SSL · Wompi by Bancolombia</p>
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
