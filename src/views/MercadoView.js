/* ============================================
   PIGGY APP — Adopcion (Purchase) View
   ============================================ */

import { renderIcon } from '../icons.js';
import { formatCOP, formatRate, formatPercent } from '../services/mockData.js';
import { AppState } from '../state.js';
import { navigateTo } from '../router.js';

const PIGGY_NAMES = [
  'Rosita', 'Porki', 'Pepo', 'Bacon', 'Hamlet',
  'Chicharron', 'Trompitas', 'Piggy', 'Oinky', 'Gordi',
  'Panchito', 'Copito', 'Manchas', 'Duque', 'Tito'
];

function getRandomName() {
  return PIGGY_NAMES[Math.floor(Math.random() * PIGGY_NAMES.length)];
}

const ITEM_PRICE = 1000000;
const ITEM_ROI = 15;
const ITEM_DAYS = 90;

export function renderAdopcionView() {
  const main = document.getElementById('main-content');
  const piggyName = getRandomName();
  const estimatedReturn = ITEM_PRICE * (1 + ITEM_ROI / 100);

  main.innerHTML = `
    <div class="view-header">
      <div class="view-header__title">
        ${renderIcon('sparkles', 'var(--color-primary)')}
        <span>Adopta tu Piggy</span>
      </div>
      <p class="view-header__subtitle">Elige el nombre y comienza tu ciclo productivo</p>
    </div>

    <!-- Piggy Preview Card -->
    <div class="card text-center mb-lg">
      <div class="piggy-avatar" style="font-size: 5rem; margin-bottom: var(--space-md);">🐷</div>
      <div class="form-group mb-md">
        <label class="form-label">Nombre de tu Piggy</label>
        <div style="display: flex; gap: var(--space-sm); justify-content: center;">
          <input type="text" id="piggy-name-input" class="form-input text-center font-bold" value="${piggyName}" style="max-width: 200px; font-size: 1.1rem;">
          <button class="btn btn--outline btn--sm" id="btn-random-name" title="Nombre aleatorio">🎲</button>
        </div>
      </div>
      <span class="badge badge--success">Raza: Landrace x Pietrain</span>
    </div>

    <!-- Financial Breakdown -->
    <div class="card mb-lg">
      <h3 class="card__title mb-md">Resumen de la Inversión</h3>
      <div class="summary-list">
        <div class="summary-item">
          <span class="text-muted">Valor de Adopción:</span>
          <span class="font-bold">${formatCOP(ITEM_PRICE)}</span>
        </div>
        <div class="summary-item">
          <span class="text-muted">Rendimiento Estimado:</span>
          <span class="font-bold text-success">${formatPercent(ITEM_ROI)}</span>
        </div>
        <div class="summary-item">
          <span class="text-muted">Duración del Ciclo:</span>
          <span class="font-bold">${ITEM_DAYS} días</span>
        </div>
        <div class="summary-item">
          <span class="text-muted">Alimentación y Cuidados:</span>
          <span class="text-success font-bold">Incluido</span>
        </div>
        <div class="summary-item">
          <span class="text-muted">Monitoreo 24/7:</span>
          <span class="text-success font-bold">Incluido</span>
        </div>
        <hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--space-sm) 0;">
        <div class="summary-item" style="font-size: 1.1rem;">
          <span class="font-bold">Retorno Estimado:</span>
          <span class="font-bold text-primary">${formatCOP(estimatedReturn)}</span>
        </div>
      </div>
    </div>

    <!-- Guarantee Notice -->
    <div class="card bg-gray-50 mb-xl" style="background: var(--color-bg-section);">
      <div style="display: flex; gap: var(--space-md); align-items: flex-start;">
        <div style="color: var(--color-primary);">${renderIcon('shield', '', '28')}</div>
        <div>
          <div class="font-bold text-sm">Garantía Piggy</div>
          <div class="text-xs text-muted">Todos los lechones cuentan con seguro veterinario y reposición garantizada en caso de cualquier eventualidad.</div>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <button class="btn btn--primary btn--block btn--lg" id="btn-adoptar-action">
      Continuar con la Adopción
    </button>
  `;

  // Random Name Button Event
  const nameInput = document.getElementById('piggy-name-input');
  document.getElementById('btn-random-name').addEventListener('click', () => {
    nameInput.value = getRandomName();
  });

  // Init Purchase Flow (Open Checkout Modal)
  document.getElementById('btn-adoptar-action').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Piggy';
    // Comprobar contrato antes
    const userContracts = AppState.get('contracts') || [];
    const hasSignedContract = userContracts.some(c => c.status === 'activo' || c.status === 'completado');

    showCheckoutModal(name);
  });
}

/**
 * Show Checkout Modal - Wallet-based purchase flow
 */
function showCheckoutModal(piggyName) {
  const existing = document.getElementById('checkout-modal');
  if (existing) existing.remove();

  const userStats = AppState.get('userStats') || {};
  const walletBalance = userStats.saldoDisponible || userStats.walletBalance || 0;
  const isBalanceSufficient = walletBalance >= ITEM_PRICE;

  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal checkout-modal animate-fade-in-up" style="position:relative;">
      <div class="modal__header-row">
        <h3 class="modal-title text-white">Confirmar Compra</h3>
        <button id="checkout-close-btn" style="background:none; border:none; font-size:24px; color:rgba(255,255,255,0.85); cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#ffffff'" onmouseout="this.style.color='rgba(255,255,255,0.85)'">&times;</button>
      </div>
      
      <div class="checkout-body" style="padding: 24px 20px;">
        
        <!-- Piggy Summary -->
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:0.95rem; color:#4b5563; margin-bottom:4px;">Comprando</div>
          <div style="font-size:1.2rem; font-weight:800; color:#1f2937;">Piggy &quot;${piggyName}&quot;</div>
          <div style="font-size:1.5rem; font-weight:900; color:var(--color-primary); margin-top:4px;">${formatCOP(ITEM_PRICE)}</div>
        </div>

        <!-- Wallet Balance -->
        <div style="
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 14px;
          color: white;
          position: relative;
        ">
          <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; opacity:0.85;">Tu Billetera Piggy</div>
          <div style="font-size:1.5rem; font-weight:900; margin-top:4px;">${formatCOP(walletBalance)}</div>
          <div style="font-size:0.8rem; margin-top:4px; opacity:0.95;">
            ${isBalanceSufficient 
              ? '✓ Saldo suficiente para realizar la compra' 
              : `⚠️ Saldo insuficiente (Faltan ${formatCOP(ITEM_PRICE - walletBalance)})`}
          </div>
        </div>

        <!-- Warning if balance insufficient -->
        ${!isBalanceSufficient ? `
          <div style="
            background: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 16px;
            font-size: 0.85rem;
            color: #92400E;
          ">
            Para continuar, por favor recarga tu billetera desde la sección <strong>Mi Granja</strong>.
          </div>
        ` : ''}

        <!-- Terms -->
        <div class="form-group" style="display:flex; align-items:flex-start; gap:8px; margin-bottom:20px;">
          <input type="checkbox" id="checkout-terms" style="margin-top:3px;" ${isBalanceSufficient ? '' : 'disabled'}>
          <label for="checkout-terms" class="text-xs text-muted">
            Acepto los términos del contrato de crianza y autorizo el débito de mi billetera.
          </label>
        </div>

        <!-- Action Button -->
        <button class="btn btn--primary btn--block btn--lg" id="btn-pay-wallet" ${isBalanceSufficient ? 'disabled' : 'disabled'}>
          ${isBalanceSufficient ? 'Confirmar y Pagar' : 'Recargar Billetera Primero'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const termsCheckbox = document.getElementById('checkout-terms');
  const payBtn = document.getElementById('btn-pay-wallet');

  // Terms validation
  if (isBalanceSufficient) {
    termsCheckbox.addEventListener('change', () => {
      payBtn.disabled = !termsCheckbox.checked;
    });
  } else {
    payBtn.disabled = false;
    payBtn.addEventListener('click', () => {
      modal.remove();
      navigateTo('granja');
    });
  }

  // Handle successful purchase
  if (isBalanceSufficient) {
    payBtn.addEventListener('click', () => {
      payBtn.disabled = true;
      payBtn.textContent = 'Procesando...';

      setTimeout(() => {
        // Deduct from wallet
        const newBalance = walletBalance - ITEM_PRICE;
        AppState.update('userStats', {
          saldoDisponible: newBalance,
          walletBalance: newBalance,
          piggiesActivos: (userStats.piggiesActivos || 0) + 1,
          totalInvertido: (userStats.totalInvertido || 0) + ITEM_PRICE
        });

        // Add new active piggy
        const userPiggies = AppState.get('piggies') || [];
        const newPiggy = {
          id: `piggy-${Date.now()}`,
          name: piggyName,
          breed: 'Landrace x Pietrain',
          weight: 15.0,
          targetWeight: 105.0,
          currentDay: 1,
          totalDays: ITEM_DAYS,
          status: 'healthy',
          statusText: 'Creciendo',
          image: '/piggy-hero.png',
          invested: ITEM_PRICE,
          roi: ITEM_ROI,
          estimatedReturn: ITEM_PRICE * (1 + ITEM_ROI / 100),
          feedType: 'Iniciador Pro',
          temperature: 24,
          lastCheck: 'Hoy'
        };

        AppState.set('piggies', [newPiggy, ...userPiggies]);

        modal.remove();

        // Navigate to success or granja
        navigateTo('granja');
      }, 1000);
    });
  }

  // Close logic
  const close = () => modal.remove();
  document.getElementById('checkout-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}
