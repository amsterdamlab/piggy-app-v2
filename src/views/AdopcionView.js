/* ============================================
   PIGGY APP — Adopcion (Purchase) View
   Custom view for adopting a new piggy
   ============================================ */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { renderBottomNav } from './GranjaView.js';
import { adoptPiggy } from '../services/piggiesService.js';
import { getWalletBalance } from '../services/walletService.js';
import { formatCOP } from '../services/mockData.js';
import { AppState } from '../state.js';

/**
 * Render the Adopcion view.
 */
export function renderAdopcionView() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page page--with-nav adopcion-page">
      
      <!-- Header / Back -->
      <div class="adopcion-header">
        <button class="btn btn--ghost btn--sm" id="btn-back-adopcion">
          ${renderIcon('arrowRight', '', '16')} Cancelar compra
        </button>
      </div>

      <div class="page__content adopcion-content">
        
        <!-- Piggy Image Circle -->
        <!-- Piggy Image Circle -->
        <div class="adopcion-image-wrapper animate-scale-in">
          <div class="adopcion-image adopcion-image--clean">
            <!-- Clean image without badge -->
            <img src="pig1.png" alt="Piggy Bank" class="adopcion-image__img" />
          </div>
        </div>

        <!-- Adoption Card -->
        <div class="adopcion-card card animate-fade-in-up">
          <h2 class="adopcion-title">¡Compra tu Piggy!</h2>
          <p class="adopcion-subtitle">Inicia con $ 1.000.000</p>

          <!-- Inputs -->
          <div class="adopcion-form">
            <div class="input-wrapper">
              <input 
                type="text" 
                class="input-wrapper__field text-center" 
                id="piggy-name-input" 
                placeholder="Ponle un nombre a tu Piggy"
                autocomplete="off"
              />
            </div>

            <!-- Name Chips -->
            <div class="adopcion-chips">
              <button class="chip" data-name="Bacon">Bacon</button>
              <button class="chip" data-name="Piggy">Piggy</button>
              <button class="chip" data-name="Oink">Oink</button>
              <button class="chip" data-name="Rosita">Rosita</button>
            </div>

            <!-- Action Button -->
            <button class="btn btn--primary btn--block btn--lg" id="btn-adopt-init">
              ${renderIcon('shop', '', '20')}
              Compra por $ 1.000.000
            </button>
          </div>
        </div>

      </div>

      ${renderBottomNav('granja')}
    </div>
  `;

  attachAdopcionListeners();

  return () => { };
}

function attachAdopcionListeners() {
  // Back button
  document.getElementById('btn-back-adopcion')?.addEventListener('click', () => {
    navigateTo('granja');
  });

  // Name chips
  const input = document.getElementById('piggy-name-input');
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (input) {
        input.value = chip.dataset.name;
      }
    });
  });

  // Init Purchase Flow (Open Checkout Modal)
  document.getElementById('btn-adopt-init')?.addEventListener('click', () => {
    const name = input?.value?.trim();
    if (!name) {
      alert('¡Por favor ponle un nombre a tu cerdito!');
      return;
    }
    showCheckoutModal(name);
  });
}

/**
 * Show Checkout Modal — Wallet-based purchase flow
 */
function showCheckoutModal(piggyName) {
  const existing = document.getElementById('checkout-modal');
  if (existing) existing.remove();

  const ITEM_PRICE = 1000000;
  const ADMIN_WHATSAPP = '573154870448';
  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';

  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal checkout-modal animate-fade-in-up" style="position:relative;">
      <div class="modal__header-row">
        <h3 class="modal-title text-white">Confirmar Compra</h3>
        <button class="checkout-close" id="checkout-close-btn">${renderIcon('close', '', '24')}</button>
      </div>
      
      <div class="checkout-body" style="padding: 24px 20px;">
        
        <!-- Piggy Summary -->
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:0.95rem; color:#4b5563; margin-bottom:4px;">Comprando</div>
          <div style="font-size:1.2rem; font-weight:800; color:#1f2937;">Piggy "${piggyName}"</div>
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
          overflow: hidden;
        ">
          <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px;">Saldo disponible en tu Wallet</div>
          <div id="adopcion-balance-display" style="font-size:1.8rem; font-weight:800; letter-spacing:-0.5px;">
            <span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
          </div>
        </div>

        <!-- Recharge Button -->
        <button id="adopcion-btn-recargar" style="
          width:100%; background:white; color:#059669; border:2px solid #a7f3d0;
          padding:12px 20px; border-radius:12px; font-weight:700; font-size:0.9rem;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          gap:8px; margin-bottom:12px; transition:all 0.2s;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          Recargar mi Wallet
        </button>

        <!-- Insufficient Notice -->
        <div id="adopcion-insufficient" style="
          background:#fef2f2; border:1px solid #fecaca; border-radius:10px;
          padding:10px 14px; font-size:0.82rem; color:#dc2626; text-align:center;
          margin-bottom:12px; display:none;
        ">Saldo insuficiente. Recarga tu Wallet para continuar.</div>

        <!-- Confirm Button -->
        <button id="adopcion-btn-confirm" style="
          width:100%; background:linear-gradient(135deg,#ec4899,#db2777); color:white;
          border:none; padding:14px 20px; border-radius:12px; font-weight:700; font-size:1rem;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow:0 6px 20px -4px rgba(236,72,153,0.4); transition:all 0.2s;
          opacity:0.5; pointer-events:none;
        ">
          Confirmar Compra con mi Wallet
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const balanceDisplay = document.getElementById('adopcion-balance-display');
  const insufficientNotice = document.getElementById('adopcion-insufficient');
  const confirmBtn = document.getElementById('adopcion-btn-confirm');
  let currentBalance = 0;

  // Load balance
  getWalletBalance().then(balance => {
    currentBalance = balance;
    balanceDisplay.textContent = formatCOP(balance);
    const hasFunds = balance >= ITEM_PRICE;
    insufficientNotice.style.display = hasFunds ? 'none' : 'block';
    if (hasFunds) {
      confirmBtn.style.opacity = '1';
      confirmBtn.style.pointerEvents = 'auto';
    }
  }).catch(() => {
    balanceDisplay.textContent = '$0';
    insufficientNotice.style.display = 'block';
  });

  // Close
  const close = () => modal.remove();
  document.getElementById('checkout-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Recargar — Open WhatsApp to admin
  document.getElementById('adopcion-btn-recargar').addEventListener('click', () => {
    const msg = `🐷 *PIGGY APP — Solicitud de Recarga de Wallet*\n\n👤 *Usuario:* ${userName}\n\n💰 Hola, deseo recargar mi wallet para comprar Piggys.\n\n📋 Por favor indícame el número de cuenta y el proceso a seguir.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  });

  // Confirm Purchase with Wallet
  confirmBtn.addEventListener('click', async () => {
    if (currentBalance < ITEM_PRICE) return;
    confirmBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Procesando...';
    confirmBtn.style.pointerEvents = 'none';
    try {
      await adoptPiggy(piggyName);
      close();
      alert(`¡Compra exitosa! Tu Piggy ha sido registrado.`);
      navigateTo('granja');
    } catch (error) {
      console.error(error);
      alert('Error en la transacción: ' + error.message);
      confirmBtn.innerHTML = 'Confirmar Compra con mi Wallet';
      confirmBtn.style.pointerEvents = 'auto';
    }
  });
}
