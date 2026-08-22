import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { openWompiWidget, getWompiEnvironment } from '../../services/wompiService.js';
import { rechargeWallet, requestBreBRecharge, requestQRRecharge } from '../../services/walletService.js';

/**
 * Show the multi-step Wallet Recharge modal:
 * Step 1: Amount selector (Min $1.000.000 COP)
 * Step 2: Payment method (Bre-B, Paga con QR, Wompi +3%, Assisted WhatsApp)
 * Step 3 (Bre-B): Hazlo Bre-B (@piggygranjamoral)
 * Step 3 (QR): Paga con QR (qr_code.jpg download + instructions)
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

  // Preload QR Code and logo assets in background so they render immediately
  try {
    const qrPreload = new Image();
    qrPreload.src = '/qr_code.jpeg';
    const logoPreload = new Image();
    logoPreload.src = '/logo_qr.png';
  } catch (_) {}

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
            <div style="display:flex; align-items:center; justify-content:center; color:#2596be; flex-shrink:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <div>
              <div style="font-weight:800; font-size:1.15rem; color:#0f172a; line-height:1.2;">¿Cuánto quieres recargar?</div>
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

    document.getElementById('rch-close').addEventListener('click', close);

    const updatePresetStyles = (amount) => {
      container.querySelectorAll('.preset-btn').forEach(b => {
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
     Botones en fondo blanco con bordes de color,
     logos actualizados, SIN COMISIONES y sin flechas.
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

        <!-- Scrollable Body Content (4 Botones en orden: Bre-B, QR, Wompi, Asistida) -->
        <div style="flex:1; overflow-y:auto; padding:20px 20px 40px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
          
          <!-- 1. BOTÓN: Transferencia Bre-B (Fondo #fdf2f5, borde tenue 1px #ffe4e6) -->
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
                <span style="background:white; color:#8125d1; border:1px solid #ddd6fe; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">SIN COMISIONES</span>
              </div>
              <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Transfiere desde cualquier banco a nuestra llave.</div>
            </div>
          </button>

          <!-- 2. BOTÓN: Paga con QR (Fondo #fdf2f5, borde tenue 1px #ffe4e6, logo_qr.png) -->
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
                <span style="background:white; color:#8125d1; border:1px solid #ddd6fe; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">SIN COMISIONES</span>
              </div>
              <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Fácil y al instante desde la app de tu banco.</div>
            </div>
          </button>

          <!-- 3. BOTÓN: Wompi (Fondo blanco, borde tenue 1px #e2e8f0) -->
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

          <!-- 4. BOTÓN: Recarga Asistida (Líneas limpias, ícono WhatsApp negro) -->
          <button id="rch-whatsapp-btn" style="
            background: white; border: 1px solid #e2e8f0; color: #1e293b;
            padding: 20px 18px; border-radius: 18px; font-weight: 600; font-size: 0.95rem;
            cursor: pointer; display: flex; align-items: flex-start; gap: 14px; text-align: left;
            transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
          " onmouseover="this.style.borderColor='#10B981'; this.style.background='#f0fdf4';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white';">
            <div style="width:52px; height:52px; min-width:52px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#0f172a; margin-top:2px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z"/>
              </svg>
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:1.05rem; font-weight:850; color:#0f172a; margin-bottom:6px; line-height:1.25;">Recarga Asistida</div>
              <div style="font-size:0.86rem; color:#64748b; font-weight:500; line-height:1.4;">Transferencia manual guiada con un asesor vía WhatsApp.</div>
            </div>
          </button>
        </div>

        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0 0 6px 0; display:flex; align-items:center; justify-content:center; gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Transacciones seguras respaldadas por Piggy App</span>
          </p>
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

    // Botón 2: Paga con QR
    document.getElementById('rch-qr-btn').addEventListener('click', () => {
      renderStep3QR();
    });

    // Botón 3: Wompi con 3% de recargo
    const handleWompiOnline = async () => {
      renderStep4Processing(wompiTotal);
      const uiShell = document.getElementById('ui-shell');
      const prevUiDisplay = uiShell ? uiShell.style.display : '';
      const prevModalDisplay = modal.style.display;

      try {
        if (uiShell) uiShell.style.display = 'none';
        modal.style.display = 'none';
        document.body.style.overflow = '';

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

    // Botón 4: WhatsApp
    document.getElementById('rch-whatsapp-btn').addEventListener('click', () => {
      close();
      const msg = `🐷 *PIGGY APP — Solicitud de Recarga Asistida*\n\n👤 *Usuario:* ${userName}\n\n💰 Monto a recargar: *${formatCOP(selectedAmount)}*\n\n📋 Por favor indícame el número de cuenta y el proceso a seguir.`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 (Bre-B) — Hazlo Bre-B
  ───────────────────────────────────────── */
  const renderStep3BreB = () => {
    const breBRef = 'PGY-' + Math.floor(100000 + Math.random() * 900000);

    container.innerHTML = `
        <!-- Header Limpio: Hazlo Bre-B -->
        <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <button id="rch-breb-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
              ← Volver a Métodos de Pago
            </button>
            <button id="rch-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
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

          <!-- RECUADRO DE LLAVE BRE-B (Con aviso COPIAR LLAVE debajo) -->
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

          <!-- BOTÓN "YA TRANSFERÍ" (Ubicado justo debajo de la llave) -->
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
            " onmouseover="this.style.background='#16a34a'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#22c55e'; this.style.transform='translateY(0)';">
              <svg xmlns="http://www.w3.org/2000/svg" width="33" height="33" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z"/>
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
          <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Pagos instantaneos y seguros con Llave Bre-B</span>
          </p>
        </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);
    document.getElementById('rch-breb-back').addEventListener('click', renderStep2);

    // Copiado exclusivo de la llave (SOLO @piggygranjamoral) al pulsar en la caja o el texto
    document.getElementById('btn-copy-breb-box').addEventListener('click', () => {
      navigator.clipboard.writeText(OFFICIAL_BRE_B_KEY).then(() => {
        const toast = document.getElementById('toast-copy-breb');
        if (toast) {
          toast.style.display = 'block';
          setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }
      });
    });

    // Acción "Ya transferí" Bre-B
    document.getElementById('btn-breb-ya-transferi').addEventListener('click', async () => {
      const btn = document.getElementById('btn-breb-ya-transferi');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Registrando solicitud...';

      try {
        const res = await requestBreBRecharge({
          amount: selectedAmount,
          reference: breBRef,
          breBKey: OFFICIAL_BRE_B_KEY,
          mockState
        });

        if (res && res.success === false) {
          throw new Error(res.reason || 'Error al registrar solicitud');
        }

        const msg = `🐷 *PIGGY APP — Comprobante de Recarga Bre-B*\n\n` +
          `👤 *Usuario:* ${userName}\n` +
          `💵 *Monto:* ${formatCOP(selectedAmount)} COP\n` +
          `🔑 *Llave:* ${OFFICIAL_BRE_B_KEY}\n` +
          `🎫 *Referencia:* #${breBRef}\n` +
          `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n` +
          `Hola, acabo de realizar la transferencia por Bre-B. Adjunto mi comprobante para que acrediten mi saldo en la Cuenta Agro.`;

        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
        renderStep5Pending({ refId: breBRef, method: 'BRE_B' });
      } catch (err) {
        console.error('Error registrando recarga Bre-B:', err);
        btn.disabled = false;
        btn.innerHTML = 'Ya transferí';
        alert('Hubo un inconveniente registrando tu solicitud. Por favor intenta de nuevo.');
      }
    });
  };

  /* ─────────────────────────────────────────
     STEP 3 (QR) — Paga con QR (qr_code.jpg)
  ───────────────────────────────────────── */
  const renderStep3QR = () => {
    const qrRef = 'PGY-QR-' + Math.floor(100000 + Math.random() * 900000);

    container.innerHTML = `
        <!-- Header Limpio: Paga con QR -->
        <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <button id="rch-qr-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
              ← Volver a Métodos de Pago
            </button>
            <button id="rch-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
          </div>
          
          <div>
            <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Paga con QR</h2>
            <div style="font-size:0.82rem; color:#64748b;">Fácil y al instante desde la app de tu banco.</div>
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
              <img src="/logo_qr.png" alt="QR" style="width:34px; height:34px; object-fit:contain;" onerror="this.style.display='none';" />
            </div>
          </div>

          <!-- RECUADRO DE CÓDIGO QR -->
          <div style="background:white; border:2px solid #e2e8f0; border-radius:16px; padding:18px; text-align:center; margin-bottom:14px; box-shadow:0 4px 14px rgba(0,0,0,0.04);">
            <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase; margin-bottom:12px; letter-spacing:0.5px;">
              Código QR Oficial Bancolombia
            </div>
            
            <div style="display:inline-block; padding:12px; background:white; border:1.5px solid #cbd5e1; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,0.06); margin-bottom:10px; min-width:210px; min-height:210px;">
              <img src="/qr_code.jpeg" alt="Código QR de Pago" loading="eager" decoding="async" style="width:210px; height:210px; object-fit:contain; display:block; border-radius:8px;" onerror="this.onerror=null; this.src='/piggyapp_logo1.png';" />
            </div>

            <!-- Botón en texto subrayado para descargar el QR -->
            <div>
              <a href="/qr_code.jpeg" download="QR_Piggy_App.jpeg" target="_blank" id="btn-download-qr" style="
                display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                color: #059669; font-weight: 700; font-size: 0.85rem; text-decoration: underline;
                background: none; border: none; padding: 4px 0; cursor: pointer; transition: color 0.15s;
              " onmouseover="this.style.color='#047857'" onmouseout="this.style.color='#059669'">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Descarga el QR en tu celular
              </a>
            </div>

            <div style="font-size:0.75rem; color:#64748b; margin-top:12px; line-height:1.4;">
              <strong>Titular:</strong> Granja Villa Morales del Valle SAS &nbsp;·&nbsp; <strong>Cuenta:</strong> Bancolombia
            </div>
          </div>

          <!-- BOTÓN "YA TRANSFERÍ" (Ubicado justo debajo del QR) -->
          <div style="margin-bottom:20px;">
            <button id="btn-qr-ya-transferi" style="
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
              </svg>
              Ya transferí
            </button>
            <p style="margin:8px 0 0 0; font-size:0.78rem; color:#64748b; text-align:center; line-height:1.4;">
              Una vez hayas hecho la transferencia, oprime este botón para enviarnos el comprobante de pago.
            </p>
          </div>

          <!-- Pasos para pagar con QR -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px;">
            <div style="font-size:0.75rem; font-weight:800; color:#334155; text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px;">
              ¿Cómo pagar con Código QR?
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; font-size:0.8rem; color:#475569; line-height:1.4;">
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <span style="background:#e2e8f0; color:#0f172a; font-weight:800; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.75rem;">1</span>
                <span>Descarga o escanea el código QR desde la app de tu banco (Bancolombia, Nequi, Daviplata, etc.).</span>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <span style="background:#e2e8f0; color:#0f172a; font-weight:800; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.75rem;">2</span>
                <span>Ingresa el monto exacto: <strong>${formatCOP(selectedAmount)}</strong>.</span>
              </div>
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <span style="background:#e2e8f0; color:#0f172a; font-weight:800; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.75rem;">3</span>
                <span>Oprime el botón <strong>Ya transferí</strong> para enviarnos tu comprobante de pago.</span>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:14px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Pagos instantaneos y seguros con QR</span>
          </p>
        </div>
    `;

    document.getElementById('rch-close').addEventListener('click', close);
    document.getElementById('rch-qr-back').addEventListener('click', renderStep2);

    // Acción "Ya transferí" QR
    document.getElementById('btn-qr-ya-transferi').addEventListener('click', async () => {
      const btn = document.getElementById('btn-qr-ya-transferi');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Registrando solicitud...';

      try {
        const res = await requestQRRecharge({
          amount: selectedAmount,
          reference: qrRef,
          mockState
        });

        if (res && res.success === false) {
          throw new Error(res.reason || 'Error al registrar solicitud');
        }

        const msg = `🐷 *PIGGY APP — Comprobante de Recarga con Código QR*\n\n` +
          `👤 *Usuario:* ${userName}\n` +
          `💵 *Monto:* ${formatCOP(selectedAmount)} COP\n` +
          `🎫 *Referencia:* #${qrRef}\n` +
          `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n` +
          `Hola, acabo de realizar el pago mediante el Código QR. Adjunto mi comprobante para que acrediten mi saldo en la Cuenta Agro.`;

        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
        renderStep5Pending({ refId: qrRef, method: 'QR_CODE' });
      } catch (err) {
        console.error('Error registrando recarga QR:', err);
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
          <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Transacción cifrada con SSL · Wompi by Bancolombia</span>
          </p>
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
     STEP 5 (Pending Receipt) — Bre-B & QR
  ───────────────────────────────────────── */
  const renderStep5Pending = ({ refId, method = 'BRE_B' }) => {
    const isBreB = method === 'BRE_B';
    const methodTitle = isBreB ? '⚡ BRE-B COLOMBIA' : '📷 CÓDIGO QR';
    const methodLabel = isBreB ? `Llave Bre-B (${OFFICIAL_BRE_B_KEY})` : 'Código QR Bancolombia';

    container.innerHTML = `
        <div style="background:linear-gradient(135deg,#059669,#047857); padding:28px 24px; text-align:center; color:white; flex-shrink:0;">
          <div style="font-size:48px; margin-bottom:8px;">⏳</div>
          <div style="font-weight:900; font-size:0.9rem; opacity:0.9; margin-bottom:2px;">${methodTitle}</div>
          <h3 style="margin:0 0 4px; font-size:1.35rem; font-weight:900;">¡Solicitud en Verificación!</h3>
          <p style="margin:0; font-size:0.85rem; opacity:0.92;">Hemos registrado tu reporte de pago</p>
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
              <span style="font-size:0.85rem; font-weight:700; color:#0f172a;">${methodLabel}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="font-size:0.85rem; color:#64748b; font-weight:600;">Estado</span>
              <span style="font-size:0.78rem; font-weight:800; background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:8px;">PENDIENTE DE REVISIÓN</span>
            </div>
          </div>

          <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:0.82rem; color:#065f46; line-height:1.45;">
            ✅ En cuanto nuestro equipo valide el comprobante con la cuenta bancaria, el saldo se sumará automáticamente a tu <strong>Cuenta Agro</strong>.
          </div>

          <button id="pending-result-close" style="
            width:100%; background:linear-gradient(135deg,#10B981,#059669); color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
            box-shadow:0 4px 14px rgba(16,185,129,0.35); transition:opacity 0.2s;
          ">Entendido, ir a Mi Cuenta Agro</button>
        </div>

        <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
          <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Cuentas Agro seguras · Piggy App</span>
          </p>
        </div>
    `;

    document.getElementById('pending-result-close').addEventListener('click', () => {
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
            💡 El pago no pudo completarse. Puedes intentarlo con otro medio o utilizar <strong>Bre-B / QR (0% comisión)</strong>.
            ${result.reason && result.reason !== 'simulated_rejected' ? `
            <div style="margin-top:10px; padding:10px; background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; color:#991b1b; font-size:0.75rem; word-break:break-all;">
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
          <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Cuentas Agro seguras · Piggy App</span>
          </p>
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
