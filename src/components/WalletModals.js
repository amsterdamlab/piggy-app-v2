import { renderIcon } from '../icons.js';
import { formatCOP } from '../services/mockData.js';
import { navigateTo } from '../router.js';

/**
 * Show Withdraw Modal
 */
export function showWithdrawModal(availableAmount) {
  const existing = document.getElementById('withdraw-modal');
  if (existing) existing.remove();

  const minWithdraw = 10000;
  const modal = document.createElement('div');
  modal.id = 'withdraw-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="withdraw-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
        <h3 class="modal-title mb-md">Retiro de Fondos</h3>
        <div class="form-group">
            <label class="form-label">Monto a retirar</label>
            <div class="input-wrapper" style="position:relative;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#999;">$</span>
                <input type="number" id="withdraw-amount" class="form-input" style="padding-left:30px; width:100%; box-sizing:border-box;" placeholder="0" min="${minWithdraw}" max="${availableAmount}">
                <button type="button" id="btn-withdraw-all" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--color-primary); font-weight:600; cursor:pointer;">Todo</button>
            </div>
            <div class="text-xs text-muted mt-sm">Disponible: ${formatCOP(availableAmount)} • Mínimo: ${formatCOP(minWithdraw)}</div>
            <div id="withdraw-error" class="text-xs" style="color:var(--color-danger); margin-top:4px; display:none;"></div>
        </div>
        <div class="form-group">
            <label class="form-label">Banco de destino</label>
            <select id="withdraw-bank" class="form-input" style="width:100%;">
                <option value="">Selecciona un banco</option>
                <option value="nequi">Nequi</option>
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
             <button class="bonus-close" id="success-close-x" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
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
            <a href="https://wa.me/573154870448?text=Hola,%20solicito%20mi%20retiro%20%23RET-${tid}%20por%20valor%20de%20${formatCOP(parseFloat(amount))}" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; width:100%;">
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
            <button class="bonus-close" id="meat-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
            <h3 class="modal-title mb-md">Disfruta tu cosecha 🥩</h3>
            <p class="text-muted mb-lg" style="margin-bottom:24px;">Contáctanos para coordinar tu pedido de carne fresca de Granja Villa Morales.</p>
            <div class="grid-2 gap-sm" style="display:grid; gap:12px;">
                <a href="https://wa.me/573154870448?text=Hola,%20quiero%20redimir%20mis%20ganancias%20en%20carne" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none;">
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
        <button class="bonus-close" id="bonus-close-btn">${renderIcon('close', '', '24')}</button>
        <div class="bonus-header"><h3 class="bonus-title text-center mt-lg">BONO DE BIENVENIDA</h3><p class="text-center text-primary font-bold text-lg">$50.000 EN CARNE</p></div>
        <div class="bonus-content mt-md" style="flex: 2;">
            <div class="bonus-text-scroll"><p>PIGGY otorga un Bono de Consumo de $50.000 a nuevos usuarios que realicen su primera adopción. Requiere compra mínima de $150.000. Envío gratis en Cali.</p></div>
        </div>
        <div class="bonus-footer mt-lg">
            <button class="btn btn--primary btn--block" id="btn-redeem-bonus">${hasPiggies ? 'Redimir Bono Ahora' : '¡Redime tu bono $50.000!'}</button>
        </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('bonus-close-btn').addEventListener('click', () => modal.remove());
  document.getElementById('btn-redeem-bonus').addEventListener('click', () => { modal.remove(); navigateTo('gourmet'); });
}
