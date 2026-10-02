/* ============================================
   PIGGY APP — Wallet Modals Component
   ============================================ */

import { renderIcon } from './Icons.js';
import { formatCOP } from '../services/mockData.js';
import { navigateTo } from '../router.js';

/**
 * Show Withdraw Modal
 */
export function showWithdrawModal(availableAmount) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';
  const minWithdraw = 50000;

  modal.innerHTML = `
    <div class="modal animate-scale-in">
        <div class="modal__handle"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 class="modal-title" style="margin:0;">Retirar Fondos</h3>
            <button id="withdraw-close-btn" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        </div>
        <p class="text-sm text-muted mb-md">Saldo disponible para retiro: <strong>${formatCOP(availableAmount)}</strong></p>
        
        <div class="form-group mb-sm">
            <label class="form-label text-xs">Monto a retirar</label>
            <div style="position:relative;">
                <input type="number" id="withdraw-amount" class="input input--block" placeholder="Mínimo $50.000" min="${minWithdraw}" max="${availableAmount}">
                <button type="button" id="btn-withdraw-all" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:#fce7f3; color:#db2777; border:none; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">MÁX</button>
            </div>
            <div id="withdraw-error" style="color:#ef4444; font-size:0.75rem; margin-top:4px; display:none;"></div>
        </div>

        <div class="form-group mb-md">
            <label class="form-label text-xs">Cuenta de Destino</label>
            <select id="withdraw-bank" class="input input--block">
                <option value="">Selecciona tu banco</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="bancolombia">Bancolombia</option>
                <option value="pse">PSE / Otros Bancos</option>
            </select>
        </div>
        <div class="form-group" style="display:flex; align-items:flex-start; gap:8px;">
            <input type="checkbox" id="withdraw-terms" style="margin-top:4px;">
            <label for="withdraw-terms" class="text-sm text-muted">He leído y acepto los términos y condiciones de retiro (3 días hábiles).</label>
        </div>
        <button class="btn btn--primary btn--block btn--disabled" id="btn-solicitar-retiro" disabled style="width:100%; margin-top:16px;">Solicitar Retiro</button>
    </div>
  `;
  document.body.appendChild(modal);

  const amountInput = document.getElementById('withdraw-amount');
  const bankInput = document.getElementById('withdraw-bank');
  const termsInput = document.getElementById('withdraw-terms');
  const submitBtn = document.getElementById('btn-solicitar-retiro');
  const errorDiv = document.getElementById('withdraw-error');

  const validate = () => {
    const amount = parseFloat(amountInput.value) || 0;
    const bank = bankInput.value;
    const terms = termsInput.checked;
    let errorMsg = '';
    if (amount < minWithdraw && amount > 0) errorMsg = `El monto mínimo es ${formatCOP(minWithdraw)}`;
    else if (amount > availableAmount) errorMsg = 'Fondos insuficientes';
    
    errorDiv.textContent = errorMsg;
    errorDiv.style.display = errorMsg ? 'block' : 'none';

    const isValid = !errorMsg && amount >= minWithdraw && bank && terms;
    submitBtn.disabled = !isValid;
    submitBtn.style.opacity = isValid ? '1' : '0.5';
  };

  amountInput.addEventListener('input', validate);
  bankInput.addEventListener('change', validate);
  termsInput.addEventListener('change', validate);
  document.getElementById('btn-withdraw-all').addEventListener('click', () => { amountInput.value = availableAmount; validate(); });
  document.getElementById('withdraw-close-btn').addEventListener('click', () => modal.remove());
  submitBtn.addEventListener('click', () => { showWithdrawSuccess(amountInput.value, bankInput.options[bankInput.selectedIndex].text); modal.remove(); });
}

/**
 * Show Withdraw Success
 */
export function showWithdrawSuccess(amount, bank) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  const tid = Date.now().toString().slice(-6);
  modal.innerHTML = `
        <div class="modal animate-scale-in text-center">
             <button id="success-close-x" style="background:none; border:none; position:absolute; right:18px; top:18px; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s; z-index:10;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
            <div style="width:60px; height:60px; background:var(--color-success-light); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
                ${renderIcon('check', '', '32')}
            </div>
            <h3 class="modal-title">Solicitud Recibida</h3>
            <p class="text-muted mb-md">Retiro de <strong>${formatCOP(parseFloat(amount))}</strong> a <strong>${bank}</strong> generado.</p>
            <div class="card bg-gray-50 mb-md text-left p-sm text-sm" style="background:#f9fafb; padding:12px; border-radius:8px; margin-bottom:16px;">
                <div><strong>Comprobante:</strong> #RET-${tid}</div>
                <div><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</div>
                <div><strong>Estado:</strong> En Proceso</div>
            </div>
            <a href="https://wa.me/573044281766?text=Hola,%20solicito%20mi%20retiro%20%23RET-${tid}%20por%20valor%20de%20${formatCOP(parseFloat(amount))}" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; width:100%;">
                ${renderIcon('whatsapp', '', '20')} Contactar soporte personalizado
            </a>
            <button class="btn btn--text btn--block mt-sm" id="success-close" style="width:100%; margin-top:8px;">Cerrar</button>
        </div>
    `;
  document.body.appendChild(modal);
  document.getElementById('success-close').addEventListener('click', () => modal.remove());
  document.getElementById('success-close-x').addEventListener('click', () => modal.remove());
}

/**
 * Show Meat Modal
 */
export function showMeatModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
        <div class="modal animate-scale-in text-center">
            <button id="meat-close-btn" style="background:none; border:none; position:absolute; right:18px; top:18px; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s; z-index:10;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
            <h3 class="modal-title mb-md">Disfruta tu cosecha 🥩</h3>
            <p class="text-muted mb-lg" style="margin-bottom:24px;">Contáctanos para coordinar tu pedido de carne fresca de Granja Villa Morales.</p>
            <div class="grid-2 gap-sm" style="display:grid; gap:12px;">
                <a href="https://wa.me/573044281766?text=Hola,%20quiero%20redimir%20mis%20ganancias%20en%20carne" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none;">
                    ${renderIcon('whatsapp', '', '20')} WhatsApp
                </a>
                <a href="#" class="btn btn--secondary btn--block" style="text-decoration:none; display:flex; align-items:center; justify-content:center;">Ver Catálogo</a>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
  document.getElementById('meat-close-btn').addEventListener('click', () => modal.remove());
}

/**
 * Show Bonus Modal
 */
export function showBonusModal(hasPiggies) {
  const existing = document.getElementById('bonus-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'bonus-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal bonus-modal animate-scale-in">
        <div class="modal__handle"></div>
        <button id="bonus-close-btn" style="background:none; border:none; position:absolute; right:18px; top:18px; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s; z-index:10;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        <div class="bonus-header"><h3 class="bonus-title text-center mt-lg">BONO DE BIENVENIDA</h3><p class="text-center text-primary font-bold text-lg">$20.000 EN CARNE</p></div>
        <div class="bonus-content mt-md" style="flex: 2;">
            <div class="bonus-text-scroll"><p>PIGGY otorga un Bono de Consumo de $20.000 a nuevos usuarios al registrarse en la plataforma. Requiere compra mínima de $150.000. Envío gratis en Cali.</p></div>
        </div>
        <div class="bonus-footer mt-lg\">\n            <button class="btn btn--primary btn--block" id="btn-redeem-bonus">${hasPiggies ? 'Redimir Bono Ahora' : '¡Redime tu bono $20.000!'}</button>
        </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('bonus-close-btn').addEventListener('click', () => modal.remove());
  document.getElementById('btn-redeem-bonus').addEventListener('click', () => { modal.remove(); navigateTo('gourmet'); });
}
