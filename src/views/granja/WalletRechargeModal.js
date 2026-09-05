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
        ` : ''};
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
          <button id="rch-close" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:1.2rem; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; line-height:1; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b';">&times;</button>
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

          <!-- Custom amount -->
          <div style="margin-bottom:24px;">
            <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:8px;">O digita tu monto (min. $200.000)</label>
            <div style="position:relative;">
              <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
              <input type="text" inputmode="numeric" id="rch-custom-amount" placeholder="Ej: 500.000"
                value="${formatThousands(selectedAmount)}"
                style="width:100%; padding:14px 16px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
                onfocus="this.style.borderColor='#ec4899';" onblur="this.style.borderColor='#e2e8f0';" />
            </div>
          </div>

          <!-- CTA -->
          <button id="rch-step1-next" style="
            width:100%; background:#ec4899; color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
            box-shadow:0 8px 20px -5px rgba(236, 72, 153, 0.5); transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:8px;
          " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">Continuar <span style="font-size:1.1rem;">→</span></button>

          <!-- Términos y Condiciones -->
          <a href="terminos-y-condiciones.html" target="_blank" style="
            display:block; text-align:center; font-size:0.75rem; color:#64748b; font-weight:500;
            text-decoration:underline; margin-top:16px; cursor:pointer;
          ">Ver Términos y Condiciones</a>
        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);

    const updatePresetStyles = (amount) => {
      subscreen.querySelectorAll('.preset-btn').forEach(b => {
        const bAmount = parseInt(b.dataset.amount);
        if (bAmount === amount) {
          b.style.borderColor = '#ec4899';
          b.style.background = '#fce7ed';
          b.style.color = '#910957';
        } else {
          b.style.borderColor = '#ffe4e6';
          b.style.background = '#fdf2f5';
          b.style.color = '#0f172a';
        }
      });
    };

    // Preset selection
    subscreen.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAmount = parseInt(btn.dataset.amount);
        const customInput = document.getElementById('rch-custom-amount');
        if (customInput) customInput.value = formatThousands(selectedAmount);
        updatePresetStyles(selectedAmount);
      });
    });

    // Custom amount input
    const customInputEl = document.getElementById('rch-custom-amount');
    customInputEl?.addEventListener('input', (e) => {
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

    document.getElementById('rch-step1-next')?.addEventListener('click', () => {
      const customVal = parseFormattedNumber(document.getElementById('rch-custom-amount')?.value);
      if (customVal > 0) selectedAmount = customVal;
      if (!selectedAmount || selectedAmount < 200000) {
        alert('El monto mínimo de recarga en Piggy es de $200.000 COP.');
        return;
      }
      renderStep2();
    });
  };

  /* ─────────────────────────────────────────
     STEP 2 — Payment method chooser
  ───────────────────────────────────────── */
  const renderStep2 = () => {
    const wompiFee = Math.round(selectedAmount * 0.03);
    const wompiTotal = selectedAmount + wompiFee;

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
            <button id="rch-close" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:1.2rem; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; line-height:1; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b';">&times;</button>
          </div>
          
          <div>
            <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Método de Pago</h2>
            <div style="font-size:0.85rem; color:#059669; font-weight:700;">Monto a recargar: ${formatCOP(selectedAmount)}</div>
          </div>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:20px 20px 40px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
          
          <!-- 1. BOTÓN: Transferencia Bre-B -->
          <button id="rch-breb-btn" style="
            background: #fdf2f5; border: 1px solid #ffe4e6;
            color: #0f172a; padding: 22px 20px; border-radius: 18px;
            font-weight: 700; font-size: 1rem; cursor: pointer;
            display: flex; align-items: flex-start; gap: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.03);
            text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
          " onmouseover="this.style.background='#fce7ed'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fdf2f5'; this.style.transform='translateY(0)';">
            <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:white; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #ffe4e6; margin-top:2px;">
              <img src="/logo_breb.png" alt="Bre-B" style="width:44px; height:44px; object-fit:contain; border-radius:10px;" onerror="this.onerror=null; this.src='/piggy-favicon.svg';" />
            </div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                <span style="font-size:1.08rem; font-weight:850; color:#0f172a; letter-spacing:-0.01em; line-height:1.25;">Transferencia Bre-B</span>
                <span style="background:white; color:#be1260; border:1px solid #fbcfe8; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">SIN COMISIONES</span>
              </div>
              <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Transfiere desde cualquier banco a nuestra llave.</div>
            </div>
          </button>

          <!-- 2. BOTÓN: Paga con QR -->
          <button id="rch-qr-btn" style="
            background: #fdf2f5; border: 1px solid #ffe4e6;
            color: #0f172a; padding: 22px 20px; border-radius: 18px;
            font-weight: 700; font-size: 1rem; cursor: pointer;
            display: flex; align-items: flex-start; gap: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.03);
            text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
          " onmouseover="this.style.background='#fce7ed'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fdf2f5'; this.style.transform='translateY(0)';">
            <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:white; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #ffe4e6; margin-top:2px;">
              <img src="/logo_qr.png" alt="Código QR" style="width:44px; height:44px; object-fit:contain; border-radius:10px;" onerror="this.onerror=null; this.src='/piggyapp_logo1.png';" />
            </div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                <span style="font-size:1.08rem; font-weight:850; color:#0f172a; letter-spacing:-0.01em; line-height:1.25;">Paga con QR</span>
                <span style="background:white; color:#be1260; border:1px solid #fbcfe8; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">SIN COMISIONES</span>
              </div>
              <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Fácil y al instante desde la app de tu banco.</div>
            </div>
          </button>

          <!-- 3. BOTÓN: Wompi -->
          <button id="rch-wompi-btn" style="
            background: white; border: 1px solid #e2e8f0;
            color: #0f172a; padding: 22px 20px; border-radius: 18px;
            font-weight: 700; font-size: 1rem; cursor: pointer;
            display: flex; align-items: flex-start; gap: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.03);
            text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
          " onmouseover="this.style.background='#f8fafc'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='white'; this.style.transform='translateY(0)';">
            <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#f8fafc; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.04); border:1px solid #e2e8f0; margin-top:2px;">
              <img src="/logo_wompi.jpg" alt="Wompi" style="width:44px; height:44px; object-fit:contain; border-radius:10px;" onerror="this.onerror=null; this.src='/piggyapp_logo1.png';" />
            </div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                <span style="font-size:1.08rem; font-weight:850; color:#0f172a; letter-spacing:-0.01em; line-height:1.25;">Paga con Wompi</span>
                <span style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">+3% COMISIÓN</span>
              </div>
              <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4; margin-bottom:8px;">Transfiere con comisiones por pasarela de pagos.</div>
              <div style="font-size:0.95rem; font-weight:850; color:#0f172a;">
                Total a pagar: ${formatCOP(wompiTotal)} <span style="font-size:0.78rem; font-weight:600; color:#64748b;">(+${formatCOP(wompiFee)} tarifa)</span>
              </div>
            </div>
          </button>

          <!-- 4. BOTÓN: Recarga Asistida -->
          <button id="rch-whatsapp-btn" style="
            background: white; border: 1px solid #e2e8f0; color: #1e293b;
            padding: 20px 18px; border-radius: 18px; font-weight: 600; font-size: 0.95rem;
            cursor: pointer; display: flex; align-items: flex-start; gap: 14px; text-align: left;
            transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
          " onmouseover="this.style.borderColor='#10B981'; this.style.background='#f0fdf4';\" onmouseout=\"this.style.borderColor='#e2e8f0'; this.style.background='white';\">
            <div style=\"width:52px; height:52px; min-width:52px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#0f172a; margin-top:2px;\">
              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"36\" height=\"36\" viewBox=\"0 0 24 24\" fill=\"currentColor\">
                <path d=\"M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z\"/>
              </svg>
            </div>
            <div style=\"flex:1; min-width:0;\">
              <div style=\"font-size:1.05rem; font-weight:850; color:#0f172a; margin-bottom:6px; line-height:1.25;\">Recarga Asistida</div>
              <div style=\"font-size:0.86rem; color:#64748b; font-weight:500; line-height:1.4;\">Transferencia manual guiada con un asesor vía WhatsApp.</div>
            </div>
          </button>
        </div>

        <div style=\"padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;\">
          <p style=\"font-size:0.72rem; color:#94a3b8; margin:0 0 6px 0; display:flex; align-items:center; justify-content:center; gap:5px;\">
            <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></svg>
            <span>Transacciones seguras respaldadas por Piggy App</span>
          </p>
          <a href=\"terminos-y-condiciones.html\" target=\"_blank\" style=\"
            display:inline-block; font-size:0.72rem; color:#64748b; font-weight:500;
            text-decoration:underline; cursor:pointer;\">Ver Términos y Condiciones</a>
        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);
    document.getElementById('rch-back')?.addEventListener('click', renderStep1);

    // Botón 1: Bre-B
    document.getElementById('rch-breb-btn')?.addEventListener('click', () => {
      renderStep3BreB();
    });

    // Botón 2: QR
    document.getElementById('rch-qr-btn')?.addEventListener('click', () => {
      renderStep3QR();
    });

    // Botón 3: Wompi
    const handleWompiOnline = async () => {
      renderStep4Processing(wompiTotal);
      const uiShell = document.getElementById('ui-shell');
      const prevUiDisplay = uiShell ? uiShell.style.display : '';
      const drawerModal = document.getElementById('wallet-drawer-modal');
      const prevModalDisplay = drawerModal ? drawerModal.style.display : '';

      try {
        if (uiShell) uiShell.style.display = 'none';
        if (drawerModal) drawerModal.style.display = 'none';
        document.body.style.overflow = '';

        const res = await openWompiWidget({
          amountInCOP: wompiTotal,
          userId: profile?.id || 'anon',
          customerData: { fullName: profile?.full_name || userName }
        });

        if (uiShell) uiShell.style.display = prevUiDisplay;
        if (drawerModal) drawerModal.style.display = prevModalDisplay;
        document.body.style.overflow = 'hidden';

        if (res.status === 'CANCELLED') {
          renderStep2();
          return;
        }

        if (res.success) {
          const rechargeRes = await rechargeWallet(selectedAmount, 'wompi_widget', 'simulated_approved', mockState, res.reference);
          if (onUpdated && rechargeRes.newBalance !== undefined) {
            onUpdated(rechargeRes.newBalance);
          }
          renderStep5Result({ ...rechargeRes, amountCredited: selectedAmount, totalPaid: wompiTotal });
        } else {
          renderStep5Result({ success: false, reason: res.reason || 'El pago no fue aprobado por Wompi.' });
        }
      } catch (err) {
        console.error('Error abriendo Wompi Widget:', err);
        if (uiShell) uiShell.style.display = prevUiDisplay;
        if (drawerModal) drawerModal.style.display = prevModalDisplay;
        document.body.style.overflow = 'hidden';
        renderStep5Result({ success: false, reason: err.message || 'No se pudo iniciar la pasarela de pagos.' });
      }
    };

    document.getElementById('rch-wompi-btn')?.addEventListener('click', handleWompiOnline);

    // Botón 4: WhatsApp
    document.getElementById('rch-whatsapp-btn')?.addEventListener('click', () => {
      closeSubscreen();
      const msg = `🐷 *PIGGY APP — Solicitud de Recarga Asistida*\n\n👤 *Usuario:* ${userName}\n\n💰 Monto a recargar: *${formatCOP(selectedAmount)}*\n\n📋 Por favor indícame el número de cuenta y el proceso a seguir.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 (Bre-B) — Hazlo Bre-B
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
            <button id="rch-close" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:1.2rem; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; line-height:1; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b';">&times;</button>
          </div>
          
          <div>
            <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Hazlo Bre-B</h2>
            <div style="font-size:0.82rem; color:#64748b;">Transfiere desde cualquier banco fácil y seguro.</div>
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
            <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
              <img src="/logo_breb.png" alt="Bre-B" style="width:34px; height:34px; object-fit:contain;" onerror="this.style.display='none';" />
            </div>
          </div>

          <!-- RECUADRO DE LLAVE BRE-B -->
          <div style="background:#f8fafc; border:2px solid #e2e8f0; border-radius:16px; padding:18px; margin-bottom:14px;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px; text-align:center;">
              Llave Bre-B Oficial
            </div>
            
            <div id="btn-copy-breb-box" style="
              display:flex; flex-direction:column; align-items:center; justify-content:center;
              background:white; border:1.5px solid #cbd5e1; border-radius:12px;
              padding:14px 16px; cursor:pointer; transition:all 0.15s;
            " onmouseover="this.style.borderColor='#00A887'; this.style.background='#f0fdf9';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='white';">
              <span id="breb-key-text" style="font-size:1.3rem; font-weight:900; color:#0f172a; letter-spacing:0.5px; font-family:monospace;">${OFFICIAL_BRE_B_KEY}</span>
              <span style="font-size:0.72rem; color:#00A887; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; margin-top:6px; display:inline-flex; align-items:center; gap:4px;">
                📋 COPIAR LLAVE
              </span>
            </div>

            <div id="toast-copy-breb" style="display:none; font-size:0.78rem; color:#00A887; font-weight:800; text-align:center; margin-top:6px;">
              ¡Llave copiada al portapapeles! 📋
            </div>

            <div style="font-size:0.75rem; color:#64748b; margin-top:10px; line-height:1.4; text-align:center;">
              <strong>Titular:</strong> Granja Villa Morales del Valle SAS &nbsp;·&nbsp; <strong>Banco:</strong> Bancolombia
            </div>
          </div>

          <!-- BOTÓN YA TRANSFERÍ -->
          <div style="margin-bottom:20px;">
            <button id="btn-breb-ya-transferi" style="
              width: 100%;
              background: #22c55e;
              color: white;
              border: none;
              padding: 16px 20px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 1.05rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
              transition: all 0.2s;
            " onmouseover="this.style.background='#16a34a'; this.style.transform='translateY(-1px)';\" onmouseout=\"this.style.background='#22c55e'; this.style.transform='translateY(0)';\">
              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"33\" height=\"33\" viewBox=\"0 0 24 24\" fill=\"currentColor\">
                <path d=\"M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z\"/>
              </svg>
              <span>Ya transferí, notificar por WhatsApp</span>
            </button>
          </div>

          <!-- Pasos para transferir -->
          <div style=\"background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px 18px;\">
            <div style=\"font-size:0.8rem; font-weight:800; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; gap:6px;\">
              <span>📌</span> Pasos para transferir con Bre-B:
            </div>
            <ol style=\"margin:0; padding-left:18px; font-size:0.8rem; color:#475569; line-height:1.6; display:flex; flex-direction:column; gap:6px;\">
              <li>Ingresa a la app de tu banco favorito.</li>
              <li>Elige la opción <strong>\"Transferir con Bre-B / Llave\"</strong>.</li>
              <li>Pega nuestra llave: <code style=\"background:#e2e8f0; padding:2px 6px; border-radius:4px; font-weight:700;\">${OFFICIAL_BRE_B_KEY}</code></li>
              <li>Digita el monto exacto: <strong>${formatCOP(selectedAmount)}</strong>.</li>
              <li>Confirma y descarga el comprobante en tu celular.</li>
              <li>Toca el botón verde arriba para enviarnos el comprobante por WhatsApp.</li>
            </ol>
          </div>

        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);
    document.getElementById('rch-breb-back')?.addEventListener('click', renderStep2);

    // Copiar llave
    const copyBox = document.getElementById('btn-copy-breb-box');
    const toast = document.getElementById('toast-copy-breb');
    copyBox?.addEventListener('click', () => {
      navigator.clipboard.writeText(OFFICIAL_BRE_B_KEY).then(() => {
        if (toast) {
          toast.style.display = 'block';
          setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }
      }).catch(() => {
        alert('Llave Bre-B: ' + OFFICIAL_BRE_B_KEY);
      });
    });

    // Ya transferí
    document.getElementById('btn-breb-ya-transferi')?.addEventListener('click', async () => {
      await requestBreBRecharge(selectedAmount, breBRef, mockState);
      const msg = `🐷 *PIGGY APP — Comprobante Recarga Bre-B*\\n\\n👤 *Usuario:* ${userName}\\n🔑 *Referencia:* ${breBRef}\\n💰 *Monto transferido:* ${formatCOP(selectedAmount)}\\n🏦 *Llave utilizada:* ${OFFICIAL_BRE_B_KEY}\\n\\nAdjunto mi comprobante para que acrediten el saldo a mi cuenta.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
      closeSubscreen();
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 (QR) — Paga con Código QR
  ───────────────────────────────────────── */
  const renderStep3QR = () => {
    const qrRef = 'PGY-QR-' + Math.floor(100000 + Math.random() * 900000);

    subscreen.innerHTML = `
        <!-- Header Limpio: Paga con QR -->
        <div style=\"padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;\">
          <div style=\"display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;\">
            <button id=\"rch-qr-back\" style=\"background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;\" onmouseover=\"this.style.color='#0f172a'\" onmouseout=\"this.style.color='#64748b'\">
              ← Volver a Métodos de Pago
            </button>
            <button id=\"rch-close\" style=\"background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:1.2rem; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; line-height:1; transition:all 0.2s;\" onmouseover=\"this.style.background='#e2e8f0'; this.style.color='#0f172a';\" onmouseout=\"this.style.background='#f1f5f9'; this.style.color='#64748b';\">&times;</button>
          </div>
          
          <div>
            <h2 style=\"margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;\">Paga con Código QR</h2>
            <div style=\"font-size:0.82rem; color:#64748b;\">Escanea desde Bancolombia, Nequi o cualquier app bancaria.</div>
          </div>
        </div>

        <!-- Scrollable Body Content -->
        <div style=\"flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;\">
          
          <!-- Resumen de Monto -->
          <div style=\"background:linear-gradient(135deg,#ecfdf5,#d1fae5); border:1px solid #a7f3d0; border-radius:14px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;\">
            <div>
              <div style=\"font-size:0.72rem; color:#065f46; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;\">Monto Exacto a Pagar</div>
              <div style=\"font-size:1.4rem; font-weight:900; color:#065f46;\">${formatCOP(selectedAmount)}</div>
            </div>
            <div style=\"width:36px; height:36px; display:flex; align-items:center; justify-content:center;\">
              <img src=\"/logo_qr.png\" alt=\"QR\" style=\"width:34px; height:34px; object-fit:contain;\" onerror=\"this.style.display='none';\" />
            </div>
          </div>

          <!-- RECUADRO CON IMAGEN DEL QR REAL -->
          <div style=\"background:#f8fafc; border:2px solid #e2e8f0; border-radius:18px; padding:20px; margin-bottom:16px; text-align:center;\">
            <div style=\"font-size:0.75rem; color:#64748b; font-weight:700; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;\">
              Código QR Bancolombia / Nequi / Redeban
            </div>
            
            <div style=\"
              display:inline-block; background:white; padding:12px; border-radius:16px;
              border:1px solid #e2e8f0; box-shadow:0 4px 14px rgba(0,0,0,0.06); margin-bottom:12px;
            \">
              <img src=\"/qr_code.jpeg\" alt=\"Código QR de Pago\" style=\"width:200px; height:200px; object-fit:contain; display:block; border-radius:8px;\" onerror=\"this.parentElement.innerHTML='<div style=\\'width:200px;height:200px;display:flex;align-items:center;justify-content:center;color:#ef4444;font-size:0.8rem;\\'>No se pudo cargar la imagen del QR</div>';\" />
            </div>

            <div style=\"font-size:0.78rem; color:#475569; font-weight:600; line-height:1.4;\">
              Granja Villa Morales del Valle SAS<br/>
              <span style=\"font-size:0.72rem; color:#94a3b8; font-weight:500;\">Acepta Bancolombia, Nequi, Daviplata, Dale y más</span>
            </div>
          </div>

          <!-- BOTÓN YA TRANSFERÍ CON QR -->
          <div style=\"margin-bottom:20px;\">
            <button id=\"btn-qr-ya-transferi\" style=\"
              width: 100%;
              background: #22c55e;
              color: white;
              border: none;
              padding: 16px 20px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 1.05rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
              transition: all 0.2s;\">
              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"33\" height=\"33\" viewBox=\"0 0 24 24\" fill=\"currentColor\">
                <path d=\"M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z\"/>
              </svg>
              <span>Ya transferí, notificar por WhatsApp</span>
            </button>
          </div>

          <!-- Pasos para pagar con QR -->
          <div style=\"background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px 18px;\">
            <div style=\"font-size:0.8rem; font-weight:800; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; gap:6px;\">
              <span>📌</span> Pasos para pagar con Código QR:
            </div>
            <ol style=\"margin:0; padding-left:18px; font-size:0.8rem; color:#475569; line-height:1.6; display:flex; flex-direction:column; gap:6px;\">
              <li>Abre la app de tu banco y selecciona <strong>\"Escanear QR\"</strong>.</li>
              <li>Apunta al código QR de arriba (o toma una captura de pantalla si estás desde tu celular).</li>
              <li>Ingresa el valor exacto: <strong>${formatCOP(selectedAmount)}</strong>.</li>
              <li>Confirma el pago y guarda el comprobante digital.</li>
              <li>Toca el botón verde arriba para enviarnos el comprobante por WhatsApp.</li>
            </ol>
          </div>

        </div>
    `;

    document.getElementById('rch-close')?.addEventListener('click', closeSubscreen);
    document.getElementById('rch-qr-back')?.addEventListener('click', renderStep2);

    // Ya transferí con QR
    document.getElementById('btn-qr-ya-transferi')?.addEventListener('click', async () => {
      await requestQRRecharge(selectedAmount, qrRef, mockState);
      const msg = `🐷 *PIGGY APP — Comprobante Pago con QR*\\n\\n👤 *Usuario:* ${userName}\\n🔑 *Referencia:* ${qrRef}\\n💰 *Monto pagado:* ${formatCOP(selectedAmount)}\\n\\nAdjunto mi comprobante para que acrediten el saldo a mi cuenta.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
      closeSubscreen();
    });
  };

  /* ─────────────────────────────────────────
     STEP 4 — Processing
  ───────────────────────────────────────── */
  const renderStep4Processing = (totalPaid) => {
    subscreen.innerHTML = `
        <div style=\"padding:40px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1;\">
          <div class=\"spinner\" style=\"width:44px; height:44px; border:3px solid #fce7ed; border-top-color:#be1260; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:20px;\"></div>
          <div style=\"font-weight:850; font-size:1.15rem; color:#0f172a; margin-bottom:6px;\">Conectando con Wompi...</div>
          <div style=\"font-size:0.84rem; color:#64748b;\">Por favor no cierres esta ventana mientras se abre la pasarela de pagos.</div>
        </div>
    `;
  };

  /* ─────────────────────────────────────────
     STEP 5 — Success or Error Result
  ───────────────────────────────────────── */
  const renderStep5Result = (result) => {
    if (result.success) {
      subscreen.innerHTML = `
          <div style=\"padding:40px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1;\">
            <div style=\"width:64px; height:64px; border-radius:50%; background:#f0fdf4; color:#10B981; display:flex; align-items:center; justify-content:center; margin-bottom:16px;\">
              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"36\" height=\"36\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6 9 17l-5-5\"/></svg>
            </div>
            <div style=\"font-weight:850; font-size:1.3rem; color:#0f172a; margin-bottom:6px;\">¡Recarga Exitosa!</div>
            <div style=\"font-size:0.86rem; color:#64748b; margin-bottom:24px; line-height:1.5;\">
              Tu saldo ha sido actualizado con <strong style=\"color:#0f172a;\">${formatCOP(result.amountCredited || selectedAmount)}</strong>.<br/>
              Ref: <span style=\"font-family:monospace; font-weight:700; color:#475569;\">${result.transaction?.id || result.reference || 'PGY-TX-OK'}</span>
            </div>

            <div style=\"background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; width:100%; margin-bottom:24px; box-sizing:border-box;\">
              <div style=\"font-size:0.75rem; color:#64748b; margin-bottom:4px;\">Nuevo saldo disponible</div>
              <div style=\"font-size:1.5rem; font-weight:900; color:#10B981;\">${formatCOP(result.newBalance || (mockState.balance + selectedAmount))}</div>
            </div>

            <button id=\"rch-finish-btn\" style=\"
              width:100%; background:#ec4899; color:white; border:none;
              padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
              box-shadow:0 8px 20px -5px rgba(236, 72, 153, 0.5); transition:all 0.2s;\">Ir a mi Granja</button>
          </div>
      `;

      document.getElementById('rch-finish-btn')?.addEventListener('click', () => {
        closeSubscreen();
        if (onCloseAll) {
          onCloseAll();
        } else {
          document.getElementById('wallet-drawer-modal')?.remove();
        }
      });
    } else {
      subscreen.innerHTML = `
          <div style=\"padding:40px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1;\">
            <div style=\"width:64px; height:64px; border-radius:50%; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; margin-bottom:16px;\">
              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"36\" height=\"36\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m15 9-6 6\"/><path d=\"m9 9 6 6\"/></svg>
            </div>
            <div style=\"font-weight:850; font-size:1.3rem; color:#0f172a; margin-bottom:6px;\">No se completó la recarga</div>
            <div style=\"font-size:0.86rem; color:#64748b; margin-bottom:24px; line-height:1.5;\">
              ${result.reason || 'Ocurrió un error con el medio de pago seleccionado. No se realizó ningún débito.'}
            </div>

            <button id=\"rch-retry-btn\" style=\"
              width:100%; background:#0f172a; color:white; border:none;
              padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;\">Intentar de nuevo</button>
          </div>
      `;

      document.getElementById('rch-retry-btn')?.addEventListener('click', () => {
        renderStep1();
      });
    }
  };

  // Launch initial step
  renderStep1();
}

export function showWalletRechargeModal() {
  const container = document.getElementById('wallet-drawer-modal');
  if (container) {
    openWalletRechargeSubscreen(container);
  } else {
    openWalletDrawer({ initialSubscreen: 'recharge' });
  }
}
