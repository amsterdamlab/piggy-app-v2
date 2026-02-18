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
 * Show Full Screen Checkout for Direct Purchase.
 */
function showCheckoutModal(item) {
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
          padding: 20px; 
          border-radius: 16px; 
          margin-bottom: 32px;
          box-shadow: 0 4px 12px rgba(233, 30, 99, 0.05);">
          
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
          
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 4px;">Estás comprando a</p>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 8px;">${item.item_name}</h2>
          <p style="font-size: 1.75rem; font-weight: 900; color: var(--color-primary);">${item.priceFormatted}</p>
      </div>

      <p class="mb-md text-center text-muted" style="margin-bottom: 24px;">Selecciona tu método de pago:</p>
      
      <div class="payment-methods" style="width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 12px;">
        
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

  // Close Logic
  const close = () => {
      document.body.style.overflow = ''; // Unlock scroll
      modal.remove();
  };
  
  document.getElementById('checkout-close-btn').addEventListener('click', close);
  
  // Payment Logic
  document.querySelectorAll('.payment-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const method = btn.dataset.method;
      
      // Visual feedback on button
      const originalContent = btn.innerHTML;
      btn.style.opacity = '0.7';
      btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border:2px solid #555;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite; margin-right: 10px; display:inline-block;"></span> Procesando...';
      
      // Disable all
      document.querySelectorAll('.payment-option').forEach(b => b.disabled = true);

      // Simulate network delay
      await new Promise(r => setTimeout(r, 2000));

      try {
        // Execute Purchase Logic
        await buyMarketplaceItem(item);
        
        close();
        navigateTo('granja');

      } catch (error) {
        console.error(error);
        alert('Error en la transacción: ' + error.message);
        
        // Reset
        btn.style.opacity = '1';
        btn.innerHTML = originalContent;
        document.querySelectorAll('.payment-option').forEach(b => b.disabled = false);
      }
    });
  });
}
