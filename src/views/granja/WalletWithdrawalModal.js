import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { openWalletDrawer } from './WalletDrawerModal.js';
import { requestWithdrawal } from '../../services/walletService.js';

/**
 * Open Wallet Withdrawal flow as a sliding subscreen inside the parent container.
 * Zero DOM destruction, zero flickering, native transitions.
 *
 * @param {HTMLElement} mountContainer - The element inside which the subscreen is mounted
 * @param {Object} liveStats - The stats object used by the drawer
 * @param {Function} onUpdated - Callback when balance changes
 * @param {Function} onCloseAll - Callback to close the entire wallet drawer
 */
export function openWalletWithdrawalSubscreen(mountContainer, liveStats = null, onUpdated = null, onCloseAll = null) {
  if (!mountContainer) return;
  mountContainer.innerHTML = '';

  const subscreen = document.createElement('div');
  subscreen.className = 'wallet-subscreen';
  subscreen.style.pointerEvents = 'auto';
  mountContainer.appendChild(subscreen);

  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const availableBalance = liveStats?.saldoDisponible || 0;

  const closeSubscreen = () => {
    subscreen.remove();
  };

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
     STEP 1 — Amount & Bank Details Form
  ───────────────────────────────────────── */
  const renderForm = () => {
    subscreen.innerHTML = `
        <!-- Sticky Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; justify-content:center; color:#059669; flex-shrink:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><rect width="20" height="14" x="2" y="6" rx="2"/><circle cx="12" cy="13" r="2"/></svg>
            </div>
            <div>
              <div style="font-weight:850; font-size:1.35rem; color:#0f172a; line-height:1.2; letter-spacing:-0.02em;">Retirar a tu Banco</div>
            </div>
          </div>
          <button id="wth-close" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:1.2rem; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; line-height:1; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b';">&times;</button>
        </div>

        <!-- Scrollable Body Content -->
        <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;">
          
          <!-- Balance banner -->
          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7); border:1px solid #bbf7d0; border-radius:14px; padding:14px 18px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:0.72rem; color:#166534; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Saldo Disponible</div>
              <div style="font-size:1.4rem; font-weight:900; color:#15803d;">${formatCOP(availableBalance)}</div>
            </div>
            <button id="wth-btn-all" style="background:#16a34a; color:white; border:none; padding:8px 14px; border-radius:10px; font-weight:800; font-size:0.8rem; cursor:pointer;">Retirar Todo</button>
          </div>

          <form id="wth-form" style="display:flex; flex-direction:column; gap:16px;">
            
            <!-- Monto -->
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Monto a Retirar (COP)</label>
              <div style="position:relative;">
                <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
                <input type="text" inputmode="numeric" id="wth-amount" placeholder="Ej: 500.000"
                  style="width:100%; padding:14px 16px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box;"
                  required />
              </div>
            </div>

            <!-- Banco -->
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Banco de Destino</label>
              <select id="wth-bank" style="width:100%; padding:14px 16px; border:2px solid #e2e8f0; border-radius:14px; font-size:0.95rem; font-weight:600; color:#0f172a; outline:none; background:white; box-sizing:border-box;" required>
                <option value="" disabled selected>Selecciona tu banco</option>
                <option value="Bancolombia">Bancolombia</option>
                <option value="Nequi">Nequi</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Davivienda">Davivienda</option>
                <option value="BBVA Colombia">BBVA Colombia</option>
                <option value="Banco de Bogotá">Banco de Bogotá</option>
                <option value="Nu Colombia">Nu (Nubank)</option>
                <option value="Lulo Bank">Lulo Bank</option>
                <option value="Banco Popular">Banco Popular</option>
                <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                <option value="Banco Falabella">Banco Falabella</option>
                <option value="Otro">Otro Banco</option>
              </select>
            </div>

            <!-- Tipo de Cuenta -->
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Tipo de Cuenta</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <label style="display:flex; align-items:center; gap:8px; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:12px; cursor:pointer; font-weight:700; font-size:0.88rem; color:#0f172a; background:#f8fafc;">
                  <input type="radio" name="wth-acc-type" value="Ahorros" checked style="accent-color:#059669;" />
                  Ahorros
                </label>
                <label style="display:flex; align-items:center; gap:8px; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:12px; cursor:pointer; font-weight:700; font-size:0.88rem; color:#0f172a; background:#f8fafc;">
                  <input type="radio" name="wth-acc-type" value="Corriente" style="accent-color:#059669;" />
                  Corriente
                </label>
              </div>
            </div>

            <!-- Número de Cuenta -->
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Número de Cuenta / Teléfono</label>
              <input type="text" inputmode="numeric" id="wth-account-number" placeholder="Ej: 1234567890"
                style="width:100%; padding:14px 16px; border:2px solid #e2e8f0; border-radius:14px; font-size:0.95rem; font-weight:600; color:#0f172a; outline:none; box-sizing:border-box;"
                required />
            </div>

            <!-- Titular de la Cuenta -->
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Nombre del Titular</label>
              <input type="text" id="wth-holder-name" placeholder="Nombre completo"
                value="${profile?.full_name || ''}"
                style="width:100%; padding:14px 16px; border:2px solid #e2e8f0; border-radius:14px; font-size:0.95rem; font-weight:600; color:#0f172a; outline:none; box-sizing:border-box;"
                required />
            </div>

            <!-- Documento de Identidad -->
            <div>
              <label style="font-size:0.78rem; font-weight:700; color:#475569; display:block; margin-bottom:6px;">Documento de Identidad (C.C. / NIT)</label>
              <input type="text" inputmode="numeric" id="wth-doc-id" placeholder="Ej: 1144123456"
                style="width:100%; padding:14px 16px; border:2px solid #e2e8f0; border-radius:14px; font-size:0.95rem; font-weight:600; color:#0f172a; outline:none; box-sizing:border-box;"
                required />
            </div>

            <!-- Info de Tiempos -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; font-size:0.78rem; color:#64748b; line-height:1.45;">
              ⏱ <strong>Tiempo de procesamiento:</strong> Los retiros se transfieren en <strong>1 a 24 horas hábiles</strong> vía ACH / Transferencia bancaria directa.
            </div>

            <!-- CTA -->
            <button type="submit" id="wth-submit-btn" style="
              width:100%; background:#059669; color:white; border:none;
              padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
              box-shadow:0 8px 20px -5px rgba(5, 150, 105, 0.4); transition:all 0.2s; margin-top:8px;
            ">Confirmar Solicitud de Retiro</button>

          </form>
        </div>
    `;

    document.getElementById('wth-close')?.addEventListener('click', closeSubscreen);

    const amountInput = document.getElementById('wth-amount');

    // Botón Retirar Todo
    document.getElementById('wth-btn-all')?.addEventListener('click', () => {
      if (amountInput) {
        amountInput.value = formatThousands(availableBalance);
      }
    });

    // Formateo de miles en input de monto
    amountInput?.addEventListener('input', (e) => {
      const rawDigits = e.target.value.replace(/\D/g, '');
      if (!rawDigits) {
        e.target.value = '';
        return;
      }
      const num = parseInt(rawDigits, 10);
      e.target.value = formatThousands(num);
    });

    // Envío del formulario
    document.getElementById('wth-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rawAmount = parseFormattedNumber(document.getElementById('wth-amount')?.value);
      const bank = document.getElementById('wth-bank')?.value;
      const accountType = document.querySelector('input[name="wth-acc-type"]:checked')?.value || 'Ahorros';
      const accountNumber = document.getElementById('wth-account-number')?.value?.trim();
      const holderName = document.getElementById('wth-holder-name')?.value?.trim();
      const docId = document.getElementById('wth-doc-id')?.value?.trim();

      if (!rawAmount || rawAmount < 20000) {
        alert('El monto mínimo de retiro es de $20.000 COP.');
        return;
      }

      if (rawAmount > availableBalance) {
        alert(`Saldo insuficiente. Tu saldo disponible para retirar es de ${formatCOP(availableBalance)}.`);
        return;
      }

      if (!bank || !accountNumber || !holderName || !docId) {
        alert('Por favor completa todos los datos bancarios.');
        return;
      }

      const submitBtn = document.getElementById('wth-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando retiro...';
      }

      try {
        const withdrawalRes = await requestWithdrawal({
          amount: rawAmount,
          bank,
          accountType,
          accountNumber,
          holderName,
          docId
        });

        if (onUpdated && withdrawalRes.newBalance !== undefined) {
          onUpdated(withdrawalRes.newBalance);
        }

        renderSuccess(rawAmount, bank, accountNumber, withdrawalRes.reference);
      } catch (err) {
        console.error('Error procesando retiro:', err);
        alert(err.message || 'Ocurrió un error al procesar tu retiro.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirmar Solicitud de Retiro';
        }
      }
    });
  };

  /* ─────────────────────────────────────────
     STEP 2 — Success Confirmation
  ───────────────────────────────────────── */
  const renderSuccess = (amount, bank, accountNumber, reference) => {
    const maskedAcc = accountNumber.length > 4 ? `****${accountNumber.slice(-4)}` : accountNumber;

    subscreen.innerHTML = `
        <div style="padding:40px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1;">
          <div style="width:64px; height:64px; border-radius:50%; background:#f0fdf4; color:#10B981; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <div style="font-weight:850; font-size:1.3rem; color:#0f172a; margin-bottom:6px;">¡Solicitud de Retiro Enviada!</div>
          <div style="font-size:0.86rem; color:#64748b; margin-bottom:24px; line-height:1.5;">
            Hemos registrado tu solicitud de retiro por <strong style="color:#0f172a;">${formatCOP(amount)}</strong> a tu cuenta de <strong>${bank} (${maskedAcc})</strong>.<br/>
            Ref: <span style="font-family:monospace; font-weight:700; color:#475569;">${reference || 'PGY-WTH-REQ'}</span>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; width:100%; margin-bottom:24px; box-sizing:border-box; text-align:left; font-size:0.82rem; color:#475569; line-height:1.6;">
            <div>⏱ <strong>Estado:</strong> En proceso de dispersión</div>
            <div>🏦 <strong>Destino:</strong> ${bank} · ${maskedAcc}</div>
            <div>💼 <strong>Tiempo estimado:</strong> 1 a 24 horas hábiles</div>
          </div>

          <button id="wth-finish-btn" style="
            width:100%; background:#0f172a; color:white; border:none;
            padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
          ">Entendido, Volver a mi Granja</button>
        </div>
    `;

    document.getElementById('wth-finish-btn')?.addEventListener('click', () => {
      closeSubscreen();
      if (onCloseAll) {
        onCloseAll();
      } else {
        document.getElementById('wallet-drawer-modal')?.remove();
      }
    });
  };

  // Launch form
  renderForm();
}

export function showWalletWithdrawalModal() {
  const container = document.getElementById('wallet-drawer-modal');
  if (container) {
    openWalletWithdrawalSubscreen(container);
  } else {
    openWalletDrawer({ initialSubscreen: 'withdrawal' });
  }
}
