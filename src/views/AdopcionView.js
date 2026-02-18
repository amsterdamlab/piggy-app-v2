/* ============================================
   PIGGY APP — Adopcion (Purchase) View
   Custom view for adopting a new piggy
   ============================================ */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { renderBottomNav } from './GranjaView.js';
import { adoptPiggy } from '../services/piggiesService.js';

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
        <div class="adopcion-image-wrapper animate-scale-in">
          <div class="adopcion-image adopcion-image--clean">
            <!-- Clean image without badge -->
            <img src="img/pig1.png" alt="Piggy Bank" class="adopcion-image__img" />
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
 * Show Checkout/Payment Gateway Modal
 */
function showCheckoutModal(piggyName) {
  // Remove existing if any
  const existing = document.getElementById('checkout-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal checkout-modal animate-fade-in-up">
      <div class="modal__header-row">
        <h3 class="modal-title text-white">Pasarela de Pago</h3>
        <button class="checkout-close" id="checkout-close-btn">${renderIcon('close', '', '24')}</button>
      </div>
      
      <div class="checkout-body">
        <p class="mb-md text-center text-muted">Selecciona tu método de pago seguro:</p>
        
        <div class="payment-methods">
          <button class="payment-option" data-method="nequi">
            <div class="payment-icon" style="background:#5500A1; color:white;">📱</div>
            <span class="payment-name">Nequi</span>
          </button>
          
          <button class="payment-option" data-method="bancolombia">
            <div class="payment-icon" style="background:#FDDA24; color:black;">🏛️</div>
            <span class="payment-name">Bancolombia</span>
          </button>
          
          <button class="payment-option" data-method="pse">
             <div class="payment-icon" style="background:#3366CC; color:white;">🌐</div>
            <span class="payment-name">PSE</span>
          </button>
        </div>

        <div class="checkout-footer mt-lg">
           <div class="secure-badge">
              <span>🔒 Pagos seguros</span>
              <span>🛡️ Cifrado SSL</span>
           </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close Logic
  const close = () => modal.remove();
  document.getElementById('checkout-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Payment Logic
  document.querySelectorAll('.payment-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Simulate Processing
      const method = btn.dataset.method;
      btn.classList.add('payment-option--loading');
      btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;border-color:var(--color-text-primary) transparent transparent transparent;"></span> Procesando...';
      
      // Lock all buttons
      document.querySelectorAll('.payment-option').forEach(b => b.disabled = true);

      // Simulate network delay
      await new Promise(r => setTimeout(r, 2000));

      // Call API to create Piggy
      try {
        await adoptPiggy(piggyName);
        close();
        // Success feedback
        alert(`¡Pago exitoso con ${method.toUpperCase()}! Tu Piggy ha sido comprado.`);
        navigateTo('granja');
      } catch (error) {
        console.error(error);
        alert('Error en la transacción: ' + error.message);
        btn.classList.remove('payment-option--loading');
        // Reset Text
        if(method === 'nequi') btn.innerHTML = '<div class="payment-icon" style="background:#5500A1; color:white;">📱</div><span class="payment-name">Nequi</span>';
        if(method === 'bancolombia') btn.innerHTML = '<div class="payment-icon" style="background:#FDDA24; color:black;">🏛️</div><span class="payment-name">Bancolombia</span>';
        if(method === 'pse') btn.innerHTML = '<div class="payment-icon" style="background:#3366CC; color:white;">🌐</div><span class="payment-name">PSE</span>';
        
        document.querySelectorAll('.payment-option').forEach(b => b.disabled = false);
      }
    });
  });
}