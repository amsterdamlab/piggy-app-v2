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
 */
function renderProductCard(item) {
  const hasExtraROI = item.extra_roi > 0;
  const extraROIText = hasExtraROI ? `+${(item.extra_roi * 100).toFixed(0)}%` : '';
  const monthEstimate = Math.max(1, Math.round((item.current_weight || 15) / 10));

  return `
    <div class="mcard animate-fade-in-up">
      ${hasExtraROI ? `<span class="mcard__roi-badge">${extraROIText}</span>` : ''}

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

        <!-- Tags: Month + Weight -->
        <div class="mcard__tags">
          <span class="mcard__tag mcard__tag--purple">Mes ${monthEstimate}</span>
          <span class="mcard__tag">${item.current_weight || 15} kg</span>
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
 * Show Checkout Modal for Direct Purchase.
 */
function showCheckoutModal(item) {
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
        <div class="checkout-summary mb-md">
            <p>Estás comprando a <strong>${item.item_name}</strong></p>
            <p class="text-xl font-bold text-primary">${item.priceFormatted}</p>
        </div>

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
      const method = btn.dataset.method;
      btn.classList.add('payment-option--loading');
      btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;border-color:var(--color-text-primary) transparent transparent transparent;"></span> Procesando...';
      
      document.querySelectorAll('.payment-option').forEach(b => b.disabled = true);

      // Simulate network delay
      await new Promise(r => setTimeout(r, 2000));

      try {
        // Execute Purchase Logic
        await buyMarketplaceItem(item);
        
        close();
        // Success
        // Use a nice native notification or navigate directly
        // alert(`¡Compra exitosa! ${item.item_name} ahora está en tu granja.`);
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
