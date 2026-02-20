/* ============================================
   PIGGY APP — Mercado (Marketplace) View
   Streamlined Direct Purchase Flow
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { navigateTo } from '../router.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { buyMarketplaceItem } from '../services/piggiesService.js';

/** In-memory cache */
let cachedItems = [];

/**
 * Render the Mercado (Marketplace) view.
 */
export function renderMercadoView() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page page--with-nav mercado-page">
      <div class="page__content">

        <!-- Header -->
        <div class="mercado-header animate-fade-in-up">
          <h2 class="mercado-title">Mercado</h2>
          <p class="mercado-subtitle">Compra piggys exclusivos en el mercado para que tu granja siga creciendo.</p>
        </div>

        <!-- Products List -->
        <div id="mercado-content">
          <div class="loading-container">
            <div class="spinner"></div>
            <span>Cargando el mercado...</span>
          </div>
        </div>

      </div>
      ${renderBottomNav('mercado')}
    </div>
  `;

  loadMarketplaceData();

  return () => { };
}

/**
 * Load marketplace data from service.
 */
async function loadMarketplaceData() {
  try {
    const items = await getMarketplaceItems();
    cachedItems = items;
    renderItems(items);
  } catch (error) {
    console.error('Error loading marketplace:', error);
    const container = document.getElementById('mercado-content');
    if (container) {
      container.innerHTML = `
        <div class="mercado-empty">
          <p>Error al cargar el mercado. Intenta de nuevo.</p>
        </div>
      `;
    }
  }
}

/**
 * Render items list.
 */
function renderItems(items) {
  const container = document.getElementById('mercado-content');
  if (!container) return;

  // Filter out zero stock (service does it, but double check)
  const availableItems = items.filter(item => item.stock > 0);

  if (availableItems.length === 0) {
    container.innerHTML = `
      <div class="mercado-empty animate-fade-in-up">
        <span style="font-size:48px;">🔍</span>
        <p>No hay Piggies disponibles en este momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="mercado-list">
      ${availableItems.map(renderProductCard).join('')}
    </div>
  `;

  // Attach buy button listeners
  availableItems.forEach(item => {
    document.getElementById(`buy-${item.id}`)?.addEventListener('click', () => {
      showCheckoutModal(item);
    });
  });
}

/**
 * Render a single horizontal product card.
 * Layout: Image left, Buy button below image. Details right.
 * Shows current_month and daysRemaining to motivate purchase of advanced piggies.
 */
function renderProductCard(item) {
  const hasExtraROI = item.extra_roi > 0;
  const extraROIText = hasExtraROI ? `+${(item.extra_roi * 100).toFixed(0)}%` : '';
  const currentMonth = item.currentMonth || 1;
  const daysRemaining = item.daysRemaining;
  const isAdvanced = currentMonth >= 2;
  const daysSaved = item.cycleTotalDays - daysRemaining;

  return `
    <div class="mcard animate-fade-in-up">
      ${hasExtraROI ? `<span class="mcard__roi-badge">${extraROIText}</span>` : ''}
      ${isAdvanced ? `<span class="mcard__time-badge">⚡ Ahorra ${daysSaved} días</span>` : ''}

      <!-- Left Column: Image + Buy Button -->
      <div class="mcard__left">
        <div class="mcard__img-wrap">
          <img src="pig1.png" alt="${item.item_name}" class="mcard__img" />
        </div>
        
        <button class="mcard__buy-btn" id="buy-${item.id}">
          ${renderIcon('shop', '', '16')}
          Comprar
        </button>
      </div>

      <!-- Right Column: Details -->
      <div class="mcard__right">
        <h4 class="mcard__name">${item.item_name}</h4>
        <p class="mcard__desc">${item.description}</p>

        <!-- Info Row: Month + Days Remaining + Weight -->
        <div class="mcard__info-row">
          <div class="mcard__info-item">
            <span class="mcard__info-label">Mes</span>
            <span class="mcard__info-value mcard__info-value--month">${currentMonth}</span>
          </div>

          <div class="mcard__info-divider"></div>
          <div class="mcard__info-item">
            <span class="mcard__info-label">Peso</span>
            <span class="mcard__info-value">${item.current_weight || 15} kg</span>
          </div>
        </div>


        <!-- Price Info -->
        <div class="mcard__price-row">
            <span class="mcard__price">${item.priceFormatted}</span>
            <span class="mcard__stock">${item.stock} disponibles</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show Full Screen Checkout for Direct Purchase.
 */
export function showCheckoutModal(item) {
  // Remove existing if any
  const existing = document.getElementById('checkout-modal');
  if (existing) existing.remove();

  // 1. Lock Body Scroll
  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'checkout-fullscreen animate-fade-in-up';

  // Style for full screen override
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100dvh'; // Dynamic viewport height
  modal.style.backgroundColor = '#ffffff'; // Solid background
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.overflowY = 'auto'; // Internal scroll if needed

  // Random names for suggestions
  const suggestedNames = ['Bacon', 'Pumba', 'Rosita', 'Chuleta', 'Wilbur', 'Peggy', 'Torrezno', 'Gordi', 'Jamón'];
  // Shuffle and pick 4
  const shuffled = suggestedNames.sort(() => 0.5 - Math.random()).slice(0, 4);

  modal.innerHTML = `
    <!-- Checkout Header -->
    <div class="checkout-header" style="
        padding: 16px 20px; 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        background: var(--color-bg); 
        border-bottom: 1px solid var(--color-border);
        position: sticky; top: 0; z-index: 10;">
        
        <h3 class="modal-title" style="margin:0; font-size: 1.25rem;">Pasarela de Pago</h3>
        <button class="checkout-close" id="checkout-close-btn" style="
            background: none; 
            border: none; 
            cursor: pointer; 
            padding: 8px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            background: #f0f0f0;">
            ${renderIcon('close', '', '20')}
        </button>
    </div>
    
    <!-- Checklist Body -->
    <div class="checkout-body" style="padding: 24px 20px; flex: 1; display: flex; flex-direction: column; align-items: center;">
      
      <!-- Summary Card -->
      <div class="checkout-summary" style="
          width: 100%; 
          max-width: 400px; 
          text-align: center; 
          background: #FFF0F5; 
          padding: 24px; 
          border-radius: 16px; 
          margin-bottom: 32px;
          border: 1px solid rgba(236, 72, 153, 0.1);
          box-shadow: 0 8px 20px rgba(236, 72, 153, 0.05);">
          
          <div style="
              width: 80px; 
              height: 80px; 
              margin: 0 auto 16px; 
              border-radius: 50%; 
              overflow: hidden; 
              border: 3px solid white; 
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <img src="pig1.png" style="width:100%; height:100%; object-fit:cover;">
          </div>
          
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 8px;">¡Compra tu Piggy!</h2>
          <p style="font-size: 1rem; color: var(--color-text-secondary); line-height: 1.4;">
            Un nuevo integrante para que tu granja siga creciendo desde <br>
            <span style="font-size: 1.5rem; font-weight: 900; color: var(--color-primary); display:block; margin-top:4px;">${item.priceFormatted}</span>
          </p>
      </div>

      <!-- Custom Name Input Section -->
      <div class="form-group" style="width: 100%; max-width: 400px; margin-bottom: 40px; text-align: center;">
           
           <div style="margin-bottom: 20px;">
                <input type="text" id="piggy-custom-name" 
                       placeholder="Ponle un nombre a tu Piggy"
                       autocomplete="off"
                       style="
                           width: 100%;
                           padding: 16px;
                           border: 2px solid #fce7f3; /* Pink-100 */
                           border-radius: 16px;
                           font-size: 1.1rem;
                           font-weight: 600;
                           color: var(--color-text-primary);
                           outline: none;
                           text-align: center;
                           transition: all 0.2s;
                           box-sizing: border-box;
                           background: #fff;
                       "
                       onfocus="this.style.borderColor='var(--color-primary)'; this.style.boxShadow='0 0 0 4px rgba(236, 72, 153, 0.1)';"
                       onblur="this.style.borderColor='#fce7f3'; this.style.boxShadow='none';"
                />
           </div>

           <!-- Name Suggestions (Pills) -->
           <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
               ${shuffled.map(name => `
                  <button class="name-pill" style="
                      background: #fdf2f8; 
                      color: #db2777; 
                      border: 1px solid #fce7f3; 
                      padding: 8px 16px; 
                      border-radius: 20px; 
                      font-size: 0.9rem; 
                      font-weight: 600; 
                      cursor: pointer;
                      transition: transform 0.1s;
                  " onclick="selectPiggyName('${name}')">${name}</button>
               `).join('')}
           </div>
           
           <div class="text-xs text-muted mt-sm fade-in" id="name-error" style="opacity:0; color:var(--color-primary); margin-top:12px;">
                * Debes darle un nombre para continuar
           </div>
      </div>

      <p class="mb-md text-center text-muted" style="margin-bottom: 24px;">Selecciona tu método de pago:</p>
      
      <div class="payment-methods" id="payment-methods-container" style="
           width: 100%; 
           max-width: 400px; 
           display: flex; 
           flex-direction: column; 
           gap: 12px; 
           opacity: 0.5; 
           pointer-events: none; 
           transition: opacity 0.3s;
      ">
        
        <button class="payment-option" data-method="nequi" style="display: flex; align-items: center; padding: 16px; border-radius: 12px; border: 1px solid #e0e0e0; background: white; cursor: pointer; transition: all 0.2s;">
          <div class="payment-icon" style="width: 40px; height: 40px; border-radius: 8px; background:#5500A1; color:white; display:flex; align-items:center; justify-content:center; font-size: 20px; margin-right: 16px;">📱</div>
          <span class="payment-name" style="font-weight: 600; font-size: 1rem;">Nequi</span>
          <div style="margin-left: auto; color: #ccc;">${renderIcon('arrowRight', '', '16')}</div>
        </button>
        
        <button class="payment-option" data-method="bancolombia" style="display: flex; align-items: center; padding: 16px; border-radius: 12px; border: 1px solid #e0e0e0; background: white; cursor: pointer; transition: all 0.2s;">
          <div class="payment-icon" style="width: 40px; height: 40px; border-radius: 8px; background:#FDDA24; color:black; display:flex; align-items:center; justify-content:center; font-size: 20px; margin-right: 16px;">🏛️</div>
          <span class="payment-name" style="font-weight: 600; font-size: 1rem;">Bancolombia</span>
          <div style="margin-left: auto; color: #ccc;">${renderIcon('arrowRight', '', '16')}</div>
        </button>
        
        <button class="payment-option" data-method="pse" style="display: flex; align-items: center; padding: 16px; border-radius: 12px; border: 1px solid #e0e0e0; background: white; cursor: pointer; transition: all 0.2s;">
           <div class="payment-icon" style="width: 40px; height: 40px; border-radius: 8px; background:#3366CC; color:white; display:flex; align-items:center; justify-content:center; font-size: 20px; margin-right: 16px;">🌐</div>
          <span class="payment-name" style="font-weight: 600; font-size: 1rem;">PSE</span>
          <div style="margin-left: auto; color: #ccc;">${renderIcon('arrowRight', '', '16')}</div>
        </button>
      </div>

      <div class="checkout-footer mt-lg" style="margin-top: auto; padding-top: 40px; padding-bottom: 20px; display: flex; justify-content: center;">
         <div class="secure-badge" style="display: flex; gap: 16px; color: var(--color-text-tertiary); font-size: 0.8rem;">
            <span>🔒 Pagos seguros</span>
            <span>🛡️ Cifrado SSL</span>
         </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // --- Logic ---

  const input = document.getElementById('piggy-custom-name');
  const paymentContainer = document.getElementById('payment-methods-container');
  const errorMsg = document.getElementById('name-error');

  // Helper to Validate
  const validateName = () => {
      const val = input.value.trim();
      const isValid = val.length >= 3; // Min 3 chars

      if (isValid) {
          paymentContainer.style.opacity = '1';
          paymentContainer.style.pointerEvents = 'auto';
          errorMsg.style.opacity = '0';
          input.style.borderColor = '#10B981'; // Green border for success
      } else {
          paymentContainer.style.opacity = '0.5';
          paymentContainer.style.pointerEvents = 'none';
          errorMsg.style.opacity = '1';
          if (val.length > 0) {
             input.style.borderColor = '#e0e0e0'; // Neutral if typing but short
          } else {
             input.style.borderColor = '#fce7f3'; // Reset to pink if empty
          }
      }
      return isValid;
  };

  // Input listener
  input.addEventListener('input', validateName);

  // Suggestion Pills Logic (Global helper or attached to window as inline onclick needs it)
  window.selectPiggyName = (name) => {
      input.value = name;
      validateName();
      input.focus(); // Keep focus for UX
  };

  // Close Logic
  const close = () => {
    document.body.style.overflow = ''; // Unlock scroll
    delete window.selectPiggyName; // Cleanup global
    modal.remove();
  };

  document.getElementById('checkout-close-btn').addEventListener('click', close);

  // Payment Logic
  document.querySelectorAll('.payment-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const method = btn.dataset.method;
      const customName = input.value.trim();

      if (customName.length < 3) return; // Basic Guard

      // Visual feedback on button
      const originalContent = btn.innerHTML;
      btn.style.opacity = '0.7';
      btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border:2px solid #555;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite; margin-right: 10px; display:inline-block;"></span> Procesando...';

      // Disable all
      document.querySelectorAll('.payment-option').forEach(b => b.disabled = true);
      input.disabled = true;

      // Simulate network delay
      await new Promise(r => setTimeout(r, 2000));

      try {
        // Execute Purchase Logic
        await buyMarketplaceItem(item, customName);

        close();
        navigateTo('granja');

      } catch (error) {
        console.error(error);
        alert('Error en la transacción: ' + error.message);

        // Reset
        btn.style.opacity = '1';
        btn.innerHTML = originalContent;
        document.querySelectorAll('.payment-option').forEach(b => b.disabled = false);
        input.disabled = false;
      }
    });
  });
}
