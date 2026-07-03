/* ==========================================================================
   PIGGY APP — Wallet Withdrawal Modal & Success Receipt
   Modular subcomponent containing withdrawal flows (money & consumption).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { createWalletRequest, notifyAdminViaWhatsApp } from '../../services/walletService.js';

/**
 * Unified "Retirar mi Saldo" modal — multi-step flow.
 * Step 1: Choose type (Dinero o Consumo)
 * Step 2a (Dinero): Enter amount + choose bank -> WhatsApp
 * Step 2b (Consumo): Enter amount -> "Solicitar Bonos de Consumo" -> WhatsApp
 */
export function showRetiroSaldoModal(availableAmount) {
  const existing = document.getElementById('retiro-modal');
  if (existing) existing.remove();

  document.body.style.overflow = 'hidden';

  const ADMIN_WHATSAPP = '573154870448';
  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const userPhone = profile?.phone_number || '';
  const minAmount = 10000;
  const BANKS = ['Bancolombia', 'Davivienda', 'BBVA', 'Nequi', 'Daviplata', 'Banco de Bogotá', 'Scotiabank Colpatria', 'Otro'];

  const modal = document.createElement('div');
  modal.id = 'retiro-modal';
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

  const renderStep1 = () => `
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#10B981,#059669); display:flex; align-items:center; justify-content:center; color:white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" /><rect x="6" y="8" width="12" height="12" rx="2" /><path d="M 12 11 v 6" /><path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" /></svg>
          </div>
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Retirar mi Saldo</div>
            <div style="font-size:0.75rem; color:#059669; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      </div>

      <!-- Scrollable Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:14px; -webkit-overflow-scrolling:touch;">
        <p style="text-align:center; font-size:0.85rem; font-weight:600; color:#374151; margin:0 0 4px;">¿Cómo deseas tu saldo?</p>
        <button id="retiro-tipo-dinero" style="background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:20px; border-radius:16px; font-weight:700; font-size:1rem; cursor:pointer; display:flex; align-items:center; gap:16px; box-shadow:0 6px 20px rgba(16,185,129,0.35); text-align:left; transition:all 0.2s;" onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
          <div style="width:46px; height:46px; background:white; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <span style="font-size:24px;">🏦</span>
          </div>
          <div>
            <div style="font-size:1.02rem; font-weight:800; margin-bottom:2px;">Dinero en cuenta</div>
            <div style="font-size:0.75rem; opacity:0.9; font-weight:400;">Transferencia bancaria a tu cuenta personal</div>
          </div>
        </button>
        <button id="retiro-tipo-consumo" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:20px; border-radius:16px; font-weight:700; font-size:1rem; cursor:pointer; display:flex; align-items:center; gap:16px; box-shadow:0 6px 20px rgba(245,158,11,0.35); text-align:left; transition:all 0.2s;" onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
          <div style="width:46px; height:46px; background:white; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <span style="font-size:24px;">🥩</span>
          </div>
          <div>
            <div style="font-size:1.02rem; font-weight:800; margin-bottom:2px;">Bonos de Consumo</div>
            <div style="font-size:0.75rem; opacity:0.9; font-weight:400;">Canjear por productos de carne y cortes agro</div>
          </div>
        </button>
      </div>
  `;

  const renderStep2Dinero = () => `
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button id="retiro-back" style="background:#f1f5f9; border:none; padding:8px 12px; border-radius:10px; font-size:0.82rem; font-weight:700; color:#334155; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">← Volver</button>
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Retiro de Dinero</div>
            <div style="font-size:0.75rem; color:#059669; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      </div>

      <!-- Scrollable Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch;">
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">Monto a retirar</label>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="retiro-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 70px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e2e8f0';" />
            <button type="button" id="btn-todo-retiro" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:#ecfdf5; border:1px solid #a7f3d0; color:#059669; font-weight:800; cursor:pointer; padding:6px 12px; border-radius:10px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="retiro-amount-error" style="font-size:0.75rem; color:#dc2626; margin-top:6px; display:none; font-weight:600;"></div>
        </div>
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">Banco destino</label>
          <select id="retiro-bank" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:14px; font-size:0.95rem; font-weight:600; color:#0f172a; outline:none; background:white; box-sizing:border-box; cursor:pointer; transition:border 0.2s;"
            onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e2e8f0';">
            <option value="">Selecciona tu banco</option>
            ${BANKS.map(b => '<option value="' + b + '">' + b + '</option>').join('')}
          </select>
        </div>
        <button id="retiro-confirm-dinero" style="width:100%; margin-top:8px; background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:16px 20px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35); transition:opacity 0.2s;">
          Solicitar Retiro vía WhatsApp
        </button>
        <p style="text-align:center; font-size:0.75rem; color:#9ca3af; margin:0;">🔒 Nuestro equipo procesará el retiro en tu cuenta personal en máximo 48 horas hábiles.</p>
      </div>
  `;

  const renderStep2Consumo = () => `
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <button id="retiro-back" style="background:#f1f5f9; border:none; padding:8px 12px; border-radius:10px; font-size:0.82rem; font-weight:700; color:#334155; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">← Volver</button>
          <div>
            <div style="font-weight:800; font-size:1.1rem; color:#0f172a; line-height:1.2;">Bonos de Consumo</div>
            <div style="font-size:0.75rem; color:#d97706; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:#f1f5f9; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#334155; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">✕</button>
      </div>

      <!-- Scrollable Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch;">
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">¿Cuánto saldo deseas canjear en bonos?</label>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="consumo-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 70px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#f59e0b';" onblur="this.style.borderColor='#e2e8f0';" />
            <button type="button" id="btn-todo-consumo" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:#fffbeb; border:1px solid #fcd34d; color:#d97706; font-weight:800; cursor:pointer; padding:6px 12px; border-radius:10px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="consumo-amount-error" style="font-size:0.75rem; color:#dc2626; margin-top:6px; display:none; font-weight:600;"></div>
        </div>
        <button id="retiro-confirm-consumo" style="width:100%; margin-top:8px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:16px 20px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(245,158,11,0.35); transition:opacity 0.2s;">
          Solicitar Bonos de Consumo vía WhatsApp
        </button>
        <p style="text-align:center; font-size:0.75rem; color:#9ca3af; margin:0;">🥩 Nuestro equipo se comunicará contigo por WhatsApp para coordinar la entrega de tu pedido.</p>
      </div>
  `;

  const safeRemove = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };

  const attachClose = (onBack) => {
    document.getElementById('retiro-close')?.addEventListener('click', safeRemove);
    modal.addEventListener('click', (e) => { if (e.target === modal) safeRemove(); });
    if (onBack) document.getElementById('retiro-back')?.addEventListener('click', onBack);
  };

  const goToStep1 = () => {
    container.innerHTML = renderStep1();
    attachClose(null);
    document.getElementById('retiro-tipo-dinero')?.addEventListener('click', goToStep2Dinero);
    document.getElementById('retiro-tipo-consumo')?.addEventListener('click', goToStep2Consumo);
  };

  const goToStep2Dinero = () => {
    container.innerHTML = renderStep2Dinero();
    attachClose(goToStep1);

    // Setup the "Todo" button dynamically
    document.getElementById('btn-todo-retiro')?.addEventListener('click', () => {
      const input = document.getElementById('retiro-amount');
      if (input) {
        input.value = availableAmount;
        input.dispatchEvent(new Event('input'));
      }
    });

    document.getElementById('retiro-confirm-dinero')?.addEventListener('click', async () => {
      const errDiv = document.getElementById('retiro-amount-error');
      const amount = parseFloat(document.getElementById('retiro-amount')?.value || 0);
      const bank = document.getElementById('retiro-bank')?.value;
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
      if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
      if (!bank) { errDiv.textContent = 'Selecciona un banco'; errDiv.style.display = 'block'; return; }
      
      const btn = document.getElementById('retiro-confirm-dinero');
      btn.innerText = 'Procesando...';
      btn.disabled = true;

      errDiv.style.display = 'none';
      
      const res = await createWalletRequest('withdrawal', amount, bank);
      if (!res.success) {
        errDiv.textContent = res.reason || 'Error al procesar la solicitud'; 
        errDiv.style.display = 'block';
        btn.innerText = 'Solicitar Retiro vía WhatsApp';
        btn.disabled = false;
        return;
      }

      notifyAdminViaWhatsApp('withdrawal', amount, userName, userPhone, bank, res.requestId);
      showWalletRequestSuccess('withdrawal', amount, bank, res.requestId);
      safeRemove();
    });
  };

  const goToStep2Consumo = () => {
    container.innerHTML = renderStep2Consumo();
    attachClose(goToStep1);

    // Setup the "Todo" button dynamically
    document.getElementById('btn-todo-consumo')?.addEventListener('click', () => {
      const input = document.getElementById('consumo-amount');
      if (input) {
        input.value = availableAmount;
        input.dispatchEvent(new Event('input'));
      }
    });

    document.getElementById('retiro-confirm-consumo')?.addEventListener('click', async () => {
      const errDiv = document.getElementById('consumo-amount-error');
      const amount = parseFloat(document.getElementById('consumo-amount')?.value || 0);
      if (!amount || amount < minAmount) { errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
      if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
      
      const btn = document.getElementById('retiro-confirm-consumo');
      btn.innerText = 'Procesando...';
      btn.disabled = true;

      errDiv.style.display = 'none';
      
      const res = await createWalletRequest('consumption', amount, null);
      if (!res.success) {
        errDiv.textContent = res.reason || 'Error al procesar la solicitud'; 
        errDiv.style.display = 'block';
        btn.innerText = 'Solicitar Bonos de Consumo vía WhatsApp';
        btn.disabled = false;
        return;
      }

      notifyAdminViaWhatsApp('consumption', amount, userName, userPhone, null, res.requestId);
      showWalletRequestSuccess('consumption', amount, null, res.requestId);
      safeRemove();
    });
  };

  goToStep1();
}

/**
 * Show success confirmation after wallet request.
 */
export function showWalletRequestSuccess(requestType, amount, bank, requestId) {
  const isWithdrawal = requestType === 'withdrawal';
  const shortId = requestId ? requestId.slice(-8).toUpperCase() : Date.now().toString().slice(-6);
  const typeLabel = isWithdrawal ? 'Retiro' : 'Consumo';

  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
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

  modal.innerHTML = `
    <div class="animate-scale-in text-center" style="width:100%; max-width:480px; background:white; border-radius:24px; padding:32px 24px; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <button id="wallet-success-close-x" style="background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; position:absolute; right:20px; top:20px; font-size:18px; font-weight:700; cursor:pointer; color:#334155; display:flex; align-items:center; justify-content:center;">✕</button>
      <div style="width:68px; height:68px; background:${isWithdrawal ? '#d1fae5' : '#fef3c7'}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
          <span style="font-size:32px;">${isWithdrawal ? '\u2705' : '\u{1F969}'}</span>
      </div>
      <h3 style="margin:0 0 8px; font-size:1.3rem; font-weight:900; color:#0f172a;">Solicitud de ${typeLabel} Recibida</h3>
      <p style="color:#64748b; font-size:0.92rem; margin:0 0 20px; line-height:1.5;">
        Tu solicitud de <strong>${typeLabel.toLowerCase()}</strong> por <strong style="color:#059669;">${formatCOP(amount)}</strong>${isWithdrawal && bank ? ` a <strong>${bank}</strong>` : ''} ha sido registrada exitosamente.
      </p>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:16px; margin-bottom:20px; text-align:left; font-size:0.88rem;">
          <div style="margin-bottom:6px; display:flex; justify-content:space-between;"><strong>Comprobante:</strong> <span style="font-family:monospace; font-weight:800;">#${typeLabel.toUpperCase().slice(0, 3)}-${shortId}</span></div>
          <div style="margin-bottom:6px; display:flex; justify-content:space-between;"><strong>Fecha:</strong> <span>${new Date().toLocaleDateString('es-CO')}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Estado:</strong> <span style="background:#fef3c7; color:#d97706; font-weight:800; padding:2px 8px; border-radius:6px; font-size:0.75rem;">Pendiente</span></div>
      </div>

      <p style="color:#94a3b8; font-size:0.78rem; margin:0 0 24px; line-height:1.4;">
        ${isWithdrawal
      ? 'Nuestro equipo procesará tu retiro en un plazo máximo de 48 horas hábiles. Te confirmaremos vía WhatsApp.'
      : 'Nuestro equipo se comunicará contigo por WhatsApp para coordinar la entrega de tus productos agro.'}
      </p>

      <button id="wallet-success-close" style="width:100%; background:linear-gradient(135deg, #10B981, #059669); border:none; color:white; padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35);">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };
  document.getElementById('wallet-success-close').addEventListener('click', closeModal);
  document.getElementById('wallet-success-close-x').addEventListener('click', closeModal);
}
