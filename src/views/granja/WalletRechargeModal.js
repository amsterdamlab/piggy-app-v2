import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { openWompiWidget, getWompiEnvironment } from '../../services/wompiService.js';
import { rechargeWallet, requestBreBRecharge, requestQRRecharge } from '../../services/walletService.js';
import { openWalletDrawer } from './WalletDrawerModal.js';

/**
 * Open Wallet Recharge flow as a sliding subscreen inside the parent container.
 * Zero DOM destruction, zero flickering, native transitions.
 *
 * @param {HTMLElement} mountContainer - The element inside which the subscreen is mounted
 * @param {Object} liveStats - The stats object used by the drawer
 * @param {Function} onUpdated - Callback when balance or transactions change
 * @param {Function} onCloseAll - Callback to close the entire wallet drawer
 */
export function openWalletRechargeSubscreen(mountContainer, liveStats = null, onUpdated = null, onCloseAll = null) {
  if (!mountContainer) return;
  mountContainer.innerHTML = '';

  const subscreen = document.createElement('div');
  subscreen.className = 'wallet-subscreen';
  subscreen.style.pointerEvents = 'auto';
  mountContainer.appendChild(subscreen);

  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const ADMIN_WHATSAPP = '573154870448';
  const OFFICIAL_BRE_B_KEY = '@piggygranjamoral';

  // Preload QR Code and logo assets in background
  try {
    const qrPreload = new Image();
    qrPreload.src = '/qr_code.jpeg';
    const logoPreload = new Image();
    logoPreload.src = '/logo_qr.png';
  } catch (_) {}

  // Shared mutable mock state so that drawer updates after simulation
  const mockState = {
    balance: liveStats?.saldoDisponible || 0,
    transactions: [...(liveStats?.transactions || [])],
  };

  const closeSubscreen = () => {
    subscreen.remove();
  };

  const PRESETS = [1000000, 2000000, 3000000, 5000000];
  let selectedAmount = 1000000;

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
     STEP 1 — Amount selector (Min $200.000)
  ───────────────────────────────────────── */
  const renderStep1 = () => {
    subscreen.innerHTML = `
        ${getWompiEnvironment() === 'sandbox' ? `
          <div style="background:#fef9c3; border-bottom:1px solid #fde047; padding:8px 16px; text-align:center; color:#854d0e; font-size:0.75rem; font-weight:700; flex-shrink:0;">
            🧪 MODO PRUEBAS (SANDBOX) — Recargas simuladas sin cobro real
          </div>
        ` : ''}
        <!-- Sticky Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; justify-content:center; color:#be1260; flex-shrink:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <div>
              <div style="font-weight:850; font-size:1.35rem; color:#0f172a; line-height:1.2; letter-spacing:-0.02em;">¿Cuánto quieres recargar?</div>
            </div>
          </div>
          <button id="rch-close" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:24px 20px; -webkit-overflow-scrolling:touch;">
          <!-- Preset buttons -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
            ${PRESETS.map(p => `
              <button class="preset-btn" data-amount="${p}" style="
                padding:16px 12px;
                border-radius:14px;
                border:1.5px solid ${selectedAmount === p ? '#ec4899' : '#ffe4e6'};
                background:${selectedAmount === p ? '#fce7ed' : '#fdf2f5'};
                color:${selectedAmount === p ? '#910957' : '#0f172a'};
                font-weight:800;
                font-size:0.95rem;
                cursor:pointer;
                transition:all 0.15s;
              ">${formatCOP(p)}</button>
            `).join('')}
          </div>

          <!-- Custom amount input -->
          <div style="margin-bottom:20px;">
            <label style="display:block; font-size:0.8rem; font-weight:700; color:#475569; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">O escribe otro valor</label>
            <div style="display:flex; align-items:center; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:12px 16px; transition:border-color 0.15s;" id="input-wrap">
              <span style="font-weight:800; color:#0f172a; font-size:1.15rem; margin-right:8px;">$</span>
              <input type="text" id="rch-custom-input" inputmode="numeric" placeholder="1.000.000" value="${formatThousands(selectedAmount)}" style="
                border:none; background:transparent; font-size:1.15rem; font-weight:800; color:#0f172a;
                width:100%; outline:none; font-family:inherit;
              " />
            </div>
            <div id="rch-min-notice" style="font-size:0.75rem; color:#64748b; margin-top:6px; font-weight:600;">
              Mínimo: $200.000 COP
            </div>
          </div>

          <!-- Bottom Warning Banner (Consumo exclusivo de la app) -->
          <div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:12px; padding:12px 14px; display:flex; gap:10px; align-items:flex-start; margin-top:10px;">
            <div style="font-size:1.1rem; line-height:1; flex-shrink:0;">🔒</div>
            <div style="font-size:0.75rem; color:#991b1b; line-height:1.45; font-weight:500;">
              <strong>Importante:</strong> El saldo recargado es exclusivo para comprar chanchitos y combos en la tienda. No está habilitado para retiros a cuentas bancarias.
            </div>
          </div>
        </div>

        <!-- Sticky Footer CTA -->
        <div style="padding:16px 20px calc(24px + env(safe-area-inset-bottom, 0px)); background:white; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <button id="rch-continue-btn" style="
            width:100%;
            background:#be1260;
            color:white;
            border:none;
            padding:16px;
            border-radius:14px;
            font-weight:800;
            font-size:1.05rem;
            cursor:pointer;
            transition:opacity 0.2s, transform 0.1s;
            box-shadow: 0 4px 14px rgba(190, 18, 96, 0.35);
          ">Continuar (${formatCOP(selectedAmount)})</button>
        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);

    const updatePresetStyles = (amount) => {
      subscreen.querySelectorAll('.preset-btn').forEach(btn => {
        const val = parseInt(btn.dataset.amount, 10);
        const isActive = val === amount;
        btn.style.border = `1.5px solid ${isActive ? '#ec4899' : '#ffe4e6'}`;
        btn.style.background = isActive ? '#fce7ed' : '#fdf2f5';
        btn.style.color = isActive ? '#910957' : '#0f172a';
      });
    };

    const updateCTA = (amount) => {
      const cta = document.getElementById('rch-continue-btn');
      const notice = document.getElementById('rch-min-notice');
      if (amount < 200000) {
        cta.disabled = true;
        cta.style.opacity = '0.5';
        cta.innerText = 'Monto mínimo $200.000';
        if (notice) notice.style.color = '#dc2626';
      } else {
        cta.disabled = false;
        cta.style.opacity = '1';
        cta.innerText = `Continuar (${formatCOP(amount)})`;
        if (notice) notice.style.color = '#64748b';
      }
    };

    // Listeners for presets
    subscreen.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.amount, 10);
        selectedAmount = val;
        const input = document.getElementById('rch-custom-input');
        if (input) input.value = formatThousands(val);
        updatePresetStyles(val);
        updateCTA(val);
      });
    });

    // Listeners for input
    const input = document.getElementById('rch-custom-input');
    input?.addEventListener('input', (e) => {
      const parsed = parseFormattedNumber(e.target.value);
      selectedAmount = parsed;
      e.target.value = formatThousands(parsed);
      updatePresetStyles(parsed);
      updateCTA(parsed);
    });

    // Focus style on wrapper
    const wrap = document.getElementById('input-wrap');
    input?.addEventListener('focus', () => {
      if (wrap) wrap.style.borderColor = '#ec4899';
    });
    input?.addEventListener('blur', () => {
      if (wrap) wrap.style.borderColor = '#e2e8f0';
    });

    // Continue CTA
    document.getElementById('rch-continue-btn')?.addEventListener('click', () => {
      if (selectedAmount >= 200000) {
        renderStep2();
      }
    });
  };

  /* ─────────────────────────────────────────
     STEP 2 — Payment method selector
  ───────────────────────────────────────── */
  const renderStep2 = () => {
    subscreen.innerHTML = `
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
            <button id="rch-close" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
          </div>
          
          <div>
            <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Método de Pago</h2>
            <div style="font-size:0.85rem; color:#059669; font-weight:700;">Monto a recargar: ${formatCOP(selectedAmount)}</div>
          </div>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:20px 20px 40px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
          
          <!-- 1. Pasarela Automática (Wompi) -->
          <button id="opt-wompi" style="
            background:#fdf2f5; border:1px solid #ffe4e6;
            color:#0f172a; padding:18px 16px; border-radius:18px;
            font-weight:700; font-size:0.95rem; cursor:pointer;
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            text-align:left; transition:all 0.15s; font-family:inherit;
          " onmouseover="this.style.borderColor='#f472b6'; this.style.background='#fce7ed';" onmouseout="this.style.borderColor='#ffe4e6'; this.style.background='#fdf2f5';">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#6C14D0,#9B1DBA); color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.1rem; flex-shrink:0;">
                W
              </div>
              <div>
                <div style="font-weight:800; font-size:1rem; color:#0f172a; line-height:1.2;">Pasarela Automática</div>
                <div style="font-size:0.75rem; color:#64748b; font-weight:500; margin-top:2px;">PSE, Nequi, Tarjetas, Bancolombia</div>
                <div style="display:inline-block; background:#dcfce7; color:#15803d; font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:6px; margin-top:4px;">Acreditación Inmediata</div>
              </div>
            </div>
            <div style="color:#94a3b8; font-size:1.2rem; flex-shrink:0;">→</div>
          </button>

          <!-- 2. Transferencia Bre-B -->
          <button id="opt-breb" style="
            background:#f8fafc; border:1px solid #e2e8f0;
            color:#0f172a; padding:18px 16px; border-radius:18px;
            font-weight:700; font-size:0.95rem; cursor:pointer;
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            text-align:left; transition:all 0.15s; font-family:inherit;
          " onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f1f5f9';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#f8fafc';">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#0284c7,#0369a1); color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </div>
              <div>
                <div style="font-weight:800; font-size:1rem; color:#0f172a; line-height:1.2;">Transferencia Bre-B</div>
                <div style="font-size:0.75rem; color:#64748b; font-weight:500; margin-top:2px;">Llave oficial interoperable</div>
                <div style="display:inline-block; background:#e0f2fe; color:#0369a1; font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:6px; margin-top:4px;">Desde cualquier banco</div>
              </div>
            </div>
            <div style="color:#94a3b8; font-size:1.2rem; flex-shrink:0;">→</div>
          </button>

          <!-- 3. Pago QR Bancolombia -->
          <button id="opt-qr" style="
            background:#f8fafc; border:1px solid #e2e8f0;
            color:#0f172a; padding:18px 16px; border-radius:18px;
            font-weight:700; font-size:0.95rem; cursor:pointer;
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            text-align:left; transition:all 0.15s; font-family:inherit;
          " onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f1f5f9';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#f8fafc';">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#059669,#047857); color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
              </div>
              <div>
                <div style="font-weight:800; font-size:1rem; color:#0f172a; line-height:1.2;">Pago QR Bancolombia</div>
                <div style="font-size:0.75rem; color:#64748b; font-weight:500; margin-top:2px;">Escanea y paga con tu app</div>
                <div style="display:inline-block; background:#dcfce7; color:#15803d; font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:6px; margin-top:4px;">Sin costo extra</div>
              </div>
            </div>
            <div style="color:#94a3b8; font-size:1.2rem; flex-shrink:0;">→</div>
          </button>

          <!-- 4. Transferencia Asistida por WhatsApp -->
          <button id="opt-whatsapp" style="
            background:#f8fafc; border:1px solid #e2e8f0;
            color:#0f172a; padding:18px 16px; border-radius:18px;
            font-weight:700; font-size:0.95rem; cursor:pointer;
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            text-align:left; transition:all 0.15s; font-family:inherit;
          " onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f1f5f9';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#f8fafc';">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <div style="font-weight:800; font-size:1rem; color:#0f172a; line-height:1.2;">Transferencia Asistida</div>
                <div style="font-size:0.75rem; color:#64748b; font-weight:500; margin-top:2px;">Atención con un asesor oficial</div>
                <div style="display:inline-block; background:#dcfce7; color:#15803d; font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:6px; margin-top:4px;">Vía WhatsApp</div>
              </div>
            </div>
            <div style="color:#94a3b8; font-size:1.2rem; flex-shrink:0;">→</div>
          </button>
        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);
    document.getElementById('rch-back')?.addEventListener('click', renderStep1);

    // Option 1: Wompi
    document.getElementById('opt-wompi')?.addEventListener('click', () => {
      handleLaunchWompi();
    });

    // Option 2: Bre-B
    document.getElementById('opt-breb')?.addEventListener('click', () => {
      renderStep3BreB();
    });

    // Option 3: QR
    document.getElementById('opt-qr')?.addEventListener('click', () => {
      renderStep3QR();
    });

    // Option 4: WhatsApp
    document.getElementById('opt-whatsapp')?.addEventListener('click', () => {
      closeSubscreen();
      const msg = `👋 *PIGGY APP — Solicitud de Recarga Asistida*\n\n👤 *Usuario:* ${userName}\n\n💰 Monto a recargar: *${formatCOP(selectedAmount)}*\n\n📲 Por favor indícame el número de cuenta y el proceso a seguir.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 (Option A) — Bre-B Transfer Details
  ───────────────────────────────────────── */
  const renderStep3BreB = () => {
    const breBRef = 'PGY-' + Math.floor(100000 + Math.random() * 900000);

    subscreen.innerHTML = `
        <!-- Header Limpio: Hazlo Bre-B -->
        <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <button id="rch-breb-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
              ← Volver a Métodos de Pago
            </button>
            <button id="rch-close" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
          </div>
          
          <div>
            <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Hazlo Bre-B</h2>
            <div style="font-size:0.82rem; color:#64748b;">Transfiere desde cualquier banco fácil y seguro.</div>
          </div>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:20px 20px 30px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
          
          <!-- Bre-B Card -->
          <div style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius:20px; padding:20px; color:white; box-shadow:0 10px 25px -5px rgba(2,132,199,0.35);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <span style="font-size:0.75rem; text-transform:uppercase; font-weight:800; letter-spacing:0.08em; opacity:0.85;">Transferencia Interoperable</span>
              <span style="background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:99px; font-size:0.75rem; font-weight:800;">Bre-B</span>
            </div>
            
            <div style="font-size:0.8rem; opacity:0.85; margin-bottom:4px;">Llave Oficial Bre-B</div>
            <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2); padding:12px 14px; border-radius:12px; margin-bottom:14px;">
              <span style="font-family:monospace; font-size:1.05rem; font-weight:800; letter-spacing:0.02em;" id="breb-key-text">${OFFICIAL_BRE_B_KEY}</span>
              <button id="btn-copy-breb" style="background:white; color:#0369a1; border:none; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">Copiar</button>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.8rem;">
              <div>
                <div style="opacity:0.75; font-size:0.7rem;">Titular:</div>
                <div style="font-weight:700;">Granja Valle Morales</div>
              </div>
              <div>
                <div style="opacity:0.75; font-size:0.7rem;">Monto a enviar:</div>
                <div style="font-weight:800; font-size:0.95rem; color:#fef08a;">${formatCOP(selectedAmount)}</div>
              </div>
            </div>
          </div>

          <!-- Referencia de Pago -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:0.72rem; color:#64748b; font-weight:700; text-transform:uppercase;">Referencia asignada</div>
              <div style="font-family:monospace; font-size:0.95rem; font-weight:800; color:#0f172a; margin-top:2px;" id="breb-ref-text">${breBRef}</div>
            </div>
            <button id="btn-copy-breb-ref" style="background:#e2e8f0; color:#334155; border:none; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">Copiar</button>
          </div>

          <!-- Instructions steps -->
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:16px;">
            <div style="font-weight:800; font-size:0.85rem; color:#15803d; margin-bottom:8px;">Instrucciones para completar tu recarga:</div>
            <ol style="margin:0; padding-left:18px; font-size:0.78rem; color:#166534; line-height:1.55; display:flex; flex-direction:column; gap:6px;">
              <li>Abre la aplicación de tu banco o billetera digital.</li>
              <li>Busca la opción <strong>Transferir con Bre-B</strong> (o llave interoperable).</li>
              <li>Pega la llave <code>${OFFICIAL_BRE_B_KEY}</code> y transfiere exactamente <strong>${formatCOP(selectedAmount)}</strong>.</li>
              <li>Escribe en el concepto o descripción: <code>${breBRef}</code>.</li>
              <li>Guarda el comprobante y presiona el botón abajo para confirmar.</li>
            </ol>
          </div>
        </div>

        <!-- Sticky Footer CTA -->
        <div style="padding:16px 20px calc(24px + env(safe-area-inset-bottom, 0px)); background:white; border-top:1px solid #f1f5f9; flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
          <button id="btn-confirm-breb-recharge" style="
            width:100%;
            background:#16a34a;
            color:white;
            border:none;
            padding:16px;
            border-radius:14px;
            font-weight:800;
            font-size:1.02rem;
            cursor:pointer;
            transition:opacity 0.2s, transform 0.1s;
            box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
            display:flex;
            align-items:center;
            justify-content:center;
            gap:8px;
          ">
            <span>✓ Ya realicé la transferencia</span>
          </button>
          <div style="font-size:0.72rem; color:#64748b; text-align:center; font-weight:500;">
            Acreditación en 5 a 15 minutos hábiles
          </div>
        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);
    document.getElementById('rch-breb-back')?.addEventListener('click', renderStep2);

    // Copy Bre-B Key
    document.getElementById('btn-copy-breb')?.addEventListener('click', () => {
      navigator.clipboard.writeText(OFFICIAL_BRE_B_KEY).then(() => {
        const btn = document.getElementById('btn-copy-breb');
        if (btn) {
          btn.innerText = '¡Copiado!';
          setTimeout(() => { btn.innerText = 'Copiar'; }, 2000);
        }
      });
    });

    // Copy Bre-B Ref
    document.getElementById('btn-copy-breb-ref')?.addEventListener('click', () => {
      navigator.clipboard.writeText(breBRef).then(() => {
        const btn = document.getElementById('btn-copy-breb-ref');
        if (btn) {
          btn.innerText = '¡Copiado!';
          setTimeout(() => { btn.innerText = 'Copiar'; }, 2000);
        }
      });
    });

    // Confirm Bre-B button
    document.getElementById('btn-confirm-breb-recharge')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-confirm-breb-recharge');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Registrando solicitud...';
      }

      try {
        await requestBreBRecharge({
          amount: selectedAmount,
          reference: breBRef,
          userName: userName
        });

        // Open WhatsApp with prefilled message
        const waMsg = `👋 *PIGGY APP — Comprobante de Recarga Bre-B*\n\n👤 *Usuario:* ${userName}\n💰 *Monto:* ${formatCOP(selectedAmount)}\n🔖 *Referencia:* ${breBRef}\n🔑 *Llave destino:* ${OFFICIAL_BRE_B_KEY}\n\nAdjunto mi comprobante para agilizar la aprobación. ¡Muchas gracias!`;
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(waMsg)}`, '_blank');

        renderPendingReceipt('breb', selectedAmount, breBRef);
      } catch (err) {
        console.error('Error in Bre-B recharge:', err);
        renderPendingReceipt('breb', selectedAmount, breBRef);
      }
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 (Option B) — QR Bancolombia Flow
  ───────────────────────────────────────── */
  const renderStep3QR = () => {
    const qrRef = 'PGY-QR-' + Math.floor(100000 + Math.random() * 900000);

    subscreen.innerHTML = `
        <!-- Header Limpio: Paga con QR -->
        <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <button id="rch-qr-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
              ← Volver a Métodos de Pago
            </button>
            <button id="rch-close" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
          </div>
          
          <div>
            <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Paga con QR</h2>
            <div style="font-size:0.82rem; color:#64748b;">Fácil y al instante desde la app de tu banco.</div>
          </div>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:20px 20px 30px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
          
          <!-- Contenedor QR Central -->
          <div style="background:white; border:1.5px solid #e2e8f0; border-radius:20px; padding:20px 16px; text-align:center; box-shadow:0 8px 25px -5px rgba(0,0,0,0.06);">
            
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:800; color:#059669; letter-spacing:0.06em; margin-bottom:4px;">
              QR Bancolombia / Interoperable
            </div>
            <div style="font-size:1.35rem; font-weight:900; color:#0f172a; margin-bottom:14px;">
              ${formatCOP(selectedAmount)}
            </div>

            <!-- Marco de la imagen QR con Logo Superpuesto -->
            <div style="width:230px; height:230px; margin:0 auto 14px; position:relative; background:#f8fafc; border-radius:16px; padding:8px; box-sizing:border-box; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center;">
              <img src="/qr_code.jpeg" alt="Código QR Bancolombia" style="width:100%; height:100%; object-fit:contain; border-radius:10px; display:block;" onerror="this.src='/qr_code.jpeg';" />
              <!-- Badge de Logo Central -->
              <div style="position:absolute; width:46px; height:46px; background:white; border-radius:10px; box-shadow:0 3px 10px rgba(0,0,0,0.18); display:flex; align-items:center; justify-content:center; padding:3px; box-sizing:border-box;">
                <img src="/logo_qr.png" alt="Piggy Logo" style="width:100%; height:100%; object-fit:contain;" />
              </div>
            </div>

            <div style="font-size:0.8rem; color:#475569; font-weight:700;">
              Titular: Granja Valle Morales
            </div>
            <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">
              Escanea con Bancolombia, Nequi o tu banco favorito
            </div>
          </div>

          <!-- Referencia de Pago -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:0.72rem; color:#64748b; font-weight:700; text-transform:uppercase;">Referencia asignada</div>
              <div style="font-family:monospace; font-size:0.95rem; font-weight:800; color:#0f172a; margin-top:2px;" id="qr-ref-text">${qrRef}</div>
            </div>
            <button id="btn-copy-qr-ref" style="background:#e2e8f0; color:#334155; border:none; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer;">Copiar</button>
          </div>

          <!-- Instructions steps -->
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:14px; padding:16px;">
            <div style="font-weight:800; font-size:0.85rem; color:#1d4ed8; margin-bottom:8px;">¿Cómo pagar con este QR?</div>
            <ol style="margin:0; padding-left:18px; font-size:0.78rem; color:#1e40af; line-height:1.55; display:flex; flex-direction:column; gap:6px;">
              <li>Toma una captura de pantalla o escanea este QR desde otro dispositivo.</li>
              <li>Abre la app de tu banco y selecciona <strong>Escanear código QR</strong>.</li>
              <li>Ingresa el monto exacto: <strong>${formatCOP(selectedAmount)}</strong>.</li>
              <li>En la descripción escribe tu referencia: <code>${qrRef}</code>.</li>
              <li>Al finalizar, presiona el botón verde de abajo para confirmar.</li>
            </ol>
          </div>
        </div>

        <!-- Sticky Footer CTA -->
        <div style="padding:16px 20px calc(24px + env(safe-area-inset-bottom, 0px)); background:white; border-top:1px solid #f1f5f9; flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
          <button id="btn-confirm-qr-recharge" style="
            width:100%;
            background:#16a34a;
            color:white;
            border:none;
            padding:16px;
            border-radius:14px;
            font-weight:800;
            font-size:1.02rem;
            cursor:pointer;
            transition:opacity 0.2s, transform 0.1s;
            box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
            display:flex;
            align-items:center;
            justify-content:center;
            gap:8px;
          ">
            <span>✓ Ya escaneé y pagué</span>
          </button>
          <div style="font-size:0.72rem; color:#64748b; text-align:center; font-weight:500;">
            Acreditación en 5 a 15 minutos hábiles
          </div>
        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);
    document.getElementById('rch-qr-back')?.addEventListener('click', renderStep2);

    // Copy QR Ref
    document.getElementById('btn-copy-qr-ref')?.addEventListener('click', () => {
      navigator.clipboard.writeText(qrRef).then(() => {
        const btn = document.getElementById('btn-copy-qr-ref');
        if (btn) {
          btn.innerText = '¡Copiado!';
          setTimeout(() => { btn.innerText = 'Copiar'; }, 2000);
        }
      });
    });

    // Confirm QR button
    document.getElementById('btn-confirm-qr-recharge')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-confirm-qr-recharge');
      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Registrando solicitud...';
      }

      try {
        await requestQRRecharge({
          amount: selectedAmount,
          reference: qrRef,
          userName: userName
        });

        // Open WhatsApp with prefilled message
        const waMsg = `👋 *PIGGY APP — Comprobante de Pago QR Bancolombia*\n\n👤 *Usuario:* ${userName}\n💰 *Monto:* ${formatCOP(selectedAmount)}\n🔖 *Referencia:* ${qrRef}\n\nAdjunto el comprobante de mi pago QR para que sea acreditado a mi cuenta. ¡Muchas gracias!`;
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(waMsg)}`, '_blank');

        renderPendingReceipt('qr', selectedAmount, qrRef);
      } catch (err) {
        console.error('Error in QR recharge:', err);
        renderPendingReceipt('qr', selectedAmount, qrRef);
      }
    });
  };

  /* ─────────────────────────────────────────
     WOMPI LAUNCH HANDLER
  ───────────────────────────────────────── */
  const handleLaunchWompi = async () => {
    const userEmail = profile?.email || 'cliente@piggyapp.co';
    const userPhone = profile?.phone || '3000000000';
    const userFullName = profile?.full_name || userName;

    // Show loading state while widget is launched
    const prevBody = subscreen.innerHTML;
    subscreen.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center;">
        <div style="width:50px; height:50px; border:4px solid #fce7ed; border-top-color:#be1260; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:16px;"></div>
        <div style="font-weight:800; font-size:1.1rem; color:#0f172a;">Conectando con la Pasarela de Pago...</div>
        <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">Por favor espera un momento</div>
      </div>
      <style>@keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }</style>
    `;

    try {
      const result = await openWompiWidget({
        amountInCents: selectedAmount * 100,
        currency: 'COP',
        customerEmail: userEmail,
        customerFullName: userFullName,
        customerPhone: userPhone,
        redirectUrl: window.location.origin + '/#/granja'
      });

      if (result.success && result.transaction) {
        const tx = result.transaction;
        const status = tx.status; // 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR', 'PENDING'

        if (status === 'APPROVED') {
          // Add funds to state
          mockState.balance += selectedAmount;
          mockState.transactions.unshift({
            id: tx.id || 'wompi-' + Date.now(),
            type: 'recharge',
            amount: selectedAmount,
            description: `Recarga Wompi #${(tx.reference || '').slice(-6)}`,
            date: new Date().toISOString(),
            status: 'completed'
          });

          // Update backend service
          try {
            await rechargeWallet(selectedAmount, 'wompi', {
              transactionId: tx.id,
              reference: tx.reference,
              paymentMethod: tx.paymentMethod?.type || 'CARD'
            });
          } catch (e) {
            console.warn('Wompi backend sync warning:', e);
          }

          if (onUpdated) {
            onUpdated(mockState);
          }

          renderWompiResult(true, selectedAmount, tx.reference);
        } else {
          renderWompiResult(false, selectedAmount, tx.reference, status);
        }
      } else {
        // User closed or error
        renderStep2();
      }
    } catch (err) {
      console.error('Wompi launch error:', err);
      renderStep2();
    }
  };

  /* ─────────────────────────────────────────
     PENDING RECEIPT SCREEN (Bre-B & QR)
  ───────────────────────────────────────── */
  const renderPendingReceipt = (method, amount, ref) => {
    const isQR = method === 'qr';
    const methodTitle = isQR ? 'Pago con QR Bancolombia' : 'Transferencia Bre-B';

    subscreen.innerHTML = `
      <div style="flex:1; overflow-y:auto; padding:32px 20px; display:flex; flex-direction:column; align-items:center; text-align:center; -webkit-overflow-scrolling:touch;">
        
        <div style="width:72px; height:72px; background:#dcfce7; color:#16a34a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.2rem; margin-bottom:16px; box-shadow:0 8px 20px rgba(22, 163, 74, 0.2);">
          ✓
        </div>

        <h2 style="font-size:1.45rem; font-weight:850; color:#0f172a; margin:0 0 6px 0;">¡Solicitud Registrada!</h2>
        <p style="font-size:0.85rem; color:#64748b; margin:0 0 24px 0; max-width:320px; line-height:1.45;">
          Hemos recibido tu solicitud de recarga por <strong>${methodTitle}</strong>.
        </p>

        <!-- Receipt Card -->
        <div style="width:100%; max-width:360px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:18px; text-align:left; margin-bottom:20px; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Monto Solicitado:</span>
            <strong style="color:#0f172a; font-size:1rem;">${formatCOP(amount)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Referencia:</span>
            <strong style="color:#0f172a; font-family:monospace;">#${ref}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Método:</span>
            <span style="color:#0f172a; font-weight:700;">${methodTitle}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b;">Estado:</span>
            <span style="background:#fef9c3; color:#854d0e; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:6px;">En Verificación</span>
          </div>
        </div>

        <p style="font-size:0.8rem; color:#64748b; line-height:1.5; margin:0 0 24px 0; max-width:320px;">
          Tu saldo se actualizará automáticamente tan pronto el equipo verifique la transferencia en el chat de WhatsApp.
        </p>

        <div style="width:100%; max-width:360px; display:flex; flex-direction:column; gap:10px;">
          <button id="pending-result-close" style="
            width:100%; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
            box-shadow:0 4px 14px rgba(22, 163, 74, 0.35);
          ">Entendido, Volver a la Granja</button>
        </div>
      </div>
    `;

    document.getElementById('pending-result-close')?.addEventListener('click', () => {
      closeSubscreen();
      if (onCloseAll) {
        onCloseAll();
      } else {
        const d = document.getElementById('wallet-drawer-modal');
        if (d) d.remove();
      }
    });
  };

  /* ─────────────────────────────────────────
     WOMPI RESULT SCREEN
  ───────────────────────────────────────── */
  const renderWompiResult = (isApproved, amount, ref, status = '') => {
    subscreen.innerHTML = `
      <div style="flex:1; overflow-y:auto; padding:32px 20px; display:flex; flex-direction:column; align-items:center; text-align:center; -webkit-overflow-scrolling:touch;">
        
        <div style="width:72px; height:72px; background:${isApproved ? '#dcfce7' : '#fee2e2'}; color:${isApproved ? '#16a34a' : '#dc2626'}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:2.2rem; margin-bottom:16px; box-shadow:0 8px 20px ${isApproved ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.2)'};">
          ${isApproved ? '✓' : '✕'}
        </div>

        <h2 style="font-size:1.45rem; font-weight:850; color:#0f172a; margin:0 0 6px 0;">
          ${isApproved ? '¡Recarga Exitosa!' : 'Transacción No Completada'}
        </h2>
        
        <p style="font-size:0.85rem; color:#64748b; margin:0 0 24px 0; max-width:320px; line-height:1.45;">
          ${isApproved 
            ? `Tu saldo disponible ha sido acreditado por <strong>${formatCOP(amount)}</strong>.`
            : `El pago fue rechazado o cancelado (${status || 'No completado'}). No se realizó ningún cobro.`}
        </p>

        <!-- Receipt Card -->
        <div style="width:100%; max-width:360px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:18px; text-align:left; margin-bottom:24px; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Monto:</span>
            <strong style="color:#0f172a; font-size:1rem;">${formatCOP(amount)}</strong>
          </div>
          ${ref ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
              <span style="color:#64748b;">Referencia:</span>
              <strong style="color:#0f172a; font-family:monospace;">#${ref}</strong>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Método:</span>
            <span style="color:#0f172a; font-weight:700;">Pasarela Wompi</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b;">Estado:</span>
            <span style="background:${isApproved ? '#dcfce7' : '#fee2e2'}; color:${isApproved ? '#15803d' : '#991b1b'}; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:6px;">
              ${isApproved ? 'Aprobada' : 'Rechazada'}
            </span>
          </div>
        </div>

        <div style="width:100%; max-width:360px;">
          <button id="wompi-result-close" style="
            width:100%; background:${isApproved ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#6C14D0,#9B1DBA)'}; color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
            box-shadow:0 4px 14px ${isApproved ? 'rgba(22, 163, 74, 0.35)' : 'rgba(108, 20, 208, 0.35)'};
          ">${isApproved ? 'Ver mi Billetera Actualizada' : 'Intentar de Nuevo'}</button>
        </div>
      </div>
    `;

    document.getElementById('wompi-result-close')?.addEventListener('click', () => {
      if (!isApproved) {
        renderStep1();
        return;
      }
      closeSubscreen();
      if (onCloseAll) {
        onCloseAll();
      } else {
        const d = document.getElementById('wallet-drawer-modal');
        if (d) d.remove();
        openWalletDrawer(mockState.balance, mockState.balance);
      }
    });
  };

  // Start at Step 1
  renderStep1();
}
