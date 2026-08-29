/* ============================================
   PIGGY APP — Mercado (Marketplace) View
   Streamlined Direct Purchase Flow (Wallet-based)
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { navigateTo } from '../router.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { buyMarketplaceItem } from '../services/piggiesService.js';
import { getWalletBalance, formatCOP, deductWalletBalance, addWalletBalance } from '../services/walletService.js';
import { AppState } from '../state.js';
import { openWalletRechargeInfo, openWalletDrawer } from './granja/WalletBlock.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

/** In-memory cache */
let cachedItems = [];

/**
 * Generate a stable photo number (1-5) for marketplace items.
 */
function getMarketplacePhotoNumber(itemId) {
  let hash = 0;
  const str = String(itemId || 'default');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 5) + 1;
}

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
          ${renderPiggyLoader('Cargando el mercado...')}
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
 * Render items inside container with attached listeners.
 */
function renderItems(items) {
  const container = document.getElementById('mercado-content');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="mercado-empty">
        <span class="mercado-empty__icon">🏷️</span>
        <p class="mercado-empty__title">No hay productos disponibles</p>
        <p class="mercado-empty__desc">Pronto añadiremos nuevos lotes de piggys al mercado.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="mercado-list">
      ${items.map(renderItemCard).join('')}
    </div>
  `;

  // Attach Buy Action directly
  items.forEach(item => {
    const buyBtn = document.getElementById(`buy-${item.id}`);
    if (buyBtn) {
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showCheckoutModal(item);
      });
    }
  });

  // Attach Ribbon Click Listeners to show category info popup
  document.querySelectorAll('.js-ribbon, .js-img-category').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cat = el.getAttribute('data-category');
      showCategoryInfoModal(cat);
    });
  });
}

/**
 * Show Category Explanation Modal (Popup).
 */
function showCategoryInfoModal(category) {
  // Remove existing modal if any
  const existing = document.getElementById('category-info-modal');
  if (existing) existing.remove();

  let title = '';
  let badgeColor = '';
  let badgeText = '';
  let icon = '';
  let description = '';

  switch (category) {
    case 'dorado':
    case 'gold':
      title = 'Categoría Dorado';
      badgeColor = '#CA8A04';
      badgeText = 'Dorados (+2% ROI)';
      icon = '🥇';
      description = 'Esta categoría es un lote premium exclusivo con un bono adicional del +2% de retorno garantizado sobre la inversión base. Ideal para maximizar tu rentabilidad en un ciclo estándar.';
      break;
    case 'avanzado':
    case 'advanced':
      title = 'Categoría Avanzado';
      badgeColor = '#EA580C';
      badgeText = 'Avanzados (Retorno Rápido)';
      icon = '⚡';
      description = 'Los cerdos de categoría Avanzado inician en etapas más maduras (mes 2 o mes 4), lo que reduce significativamente los días de ciclo restantes (114 o 54 días en lugar de 144) permitiendo liquidar tus ganancias mucho más rápido.';
      break;
    case 'oferta':
    case 'offer':
      title = 'Categoría Oferta';
      badgeColor = '#E11D48';
      badgeText = 'Oferta Especial';
      icon = '🔥';
      description = 'Lotes con precios promocionales por tiempo limitado o con bonificaciones adicionales de peso y margen comercial. ¡Aprovecha antes de que se agoten!';
      break;
    default:
      return;
  }

  const modal = document.createElement('div');
  modal.id = 'category-info-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in" style="max-width: 360px; padding: 24px 20px; text-align: center; border-radius: 20px;">
      <div style="font-size: 40px; margin-bottom: 8px;">${icon}</div>
      <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 6px;">${title}</h3>
      <div style="display: inline-block; background: #fefce8; color: ${badgeColor}; font-weight: 700; font-size: 12px; padding: 3px 10px; border-radius: 12px; margin-bottom: 14px; border: 1px solid #fef08a;">
        ${badgeText}
      </div>
      <p style="font-size: 0.88rem; color: #64748b; line-height: 1.5; margin-bottom: 20px; text-align: left;">
        ${description}
      </p>
      <button class="btn btn--primary" id="btn-close-cat-modal" style="width: 100%; border-radius: 12px; padding: 10px 0; font-weight: 700;">
        Entendido
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = document.getElementById('btn-close-cat-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.remove());
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

/**
 * Render single product card (matching exact image).
 */
function renderItemCard(item) {
  const currentMonth = item.current_month || item.stage || 1;
  const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
  const photoNum = getMarketplacePhotoNumber(item.id);
  const imgSrc = item.image_url || `assets/piggies/stage${stage}/et${stage}-${photoNum}.jpg`;

  // Determine category ribbons
  const isDorado = item.category === 'dorado' || (item.extra_roi && item.extra_roi > 0);
  const isAdvanced = item.days_advanced > 0;
  const isEstandar = !isDorado && !isAdvanced;

  let displayCategory = '';
  let categoryKey = '';
  if (isDorado) {
    displayCategory = 'Dorado';
    categoryKey = 'dorado';
  } else if (isAdvanced) {
    displayCategory = 'Avanzado';
    categoryKey = 'avanzado';
  }

  // Calculate days remaining dynamically: 144 - days_advanced
  const CYCLE_TOTAL_DAYS = 144;
  const daysAdvanced = item.days_advanced || 0;
  const daysRemaining = item.days_remaining || Math.max(1, CYCLE_TOTAL_DAYS - daysAdvanced);
  const daysSaved = daysAdvanced;

  const itemName = item.piggy_name || item.item_name || item.name || 'Piggy';

  return `
    <div class="mcard animate-fade-in-up">
      ${!isEstandar ? `
        <div class="mcard__ribbon mcard__ribbon--${categoryKey} js-ribbon" data-category="${categoryKey}" style="pointer-events: auto; cursor: pointer;">
          <span style="pointer-events: auto;">${displayCategory} ⓘ</span>
        </div>
      ` : ''}
      ${isAdvanced ? `<span class="mcard__time-badge">⚡ Ahorra ${daysSaved} días</span>` : ''}

      <!-- Left Column: Image + Buy Button -->
      <div class="mcard__left">
        <div class="mcard__img-wrap ${!isEstandar ? 'js-img-category' : ''}"
             ${!isEstandar ? `data-category="${categoryKey}" style="cursor: pointer;"` : ''}>
          <img src="${imgSrc}" alt="${itemName}" class="mcard__img" onerror="this.onerror=null;this.src='pig2.jpg'" />
        </div>
        
        <button class="mcard__buy-btn" id="buy-${item.id}">
          ${renderIcon('shop', '', '16')}
          Comprar
        </button>
      </div>

      <!-- Right Column: Details -->
      <div class="mcard__right">
        <h4 class="mcard__name" style="${!isEstandar ? 'padding-right: 65px;' : ''}">${itemName}</h4>
        <p class="mcard__desc">${item.description}</p>

        <!-- Info Row: Days Remaining + Weight -->
        <div class="mcard__info-row">
          <div class="mcard__info-item">
            <span class="mcard__info-label">FALTAN</span>
            <span class="mcard__info-value mcard__info-value--days">${daysRemaining} días</span>
          </div>

          <div class="mcard__info-divider"></div>
          <div class="mcard__info-item">
            <span class="mcard__info-label">PESO</span>
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
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'white';
  modal.style.zIndex = '9999';
  modal.style.overflowY = 'auto';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';

  const currentMonth = item.current_month || item.stage || 1;
  const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
  const photoNum = getMarketplacePhotoNumber(item.id);
  const imgSrc = item.image_url || `assets/piggies/stage${stage}/et${stage}-${photoNum}.jpg`;

  const CYCLE_TOTAL_DAYS = 144;
  const daysAdvanced = item.days_advanced || 0;
  const daysRemaining = item.days_remaining || Math.max(1, CYCLE_TOTAL_DAYS - daysAdvanced);
  const daysSaved = daysAdvanced;

  const itemName = item.piggy_name || item.item_name || item.name || 'Piggy';

  modal.innerHTML = `
    <!-- Top Bar -->
    <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #f1f5f9; position:sticky; top:0; background:white; z-index:10;">
      <button id="btn-close-checkout" style="background:none; border:none; color:#1e293b; cursor:pointer; display:flex; align-items:center; padding:4px;">
        ${renderIcon('arrowLeft', '', '22')}
      </button>
      <h3 style="margin:0; font-size:1.1rem; font-weight:800; color:#1e293b;">Resumen de Compra</h3>
      <div style="width:24px;"></div>
    </div>

    <div style="padding: 20px; flex: 1; max-width: 480px; margin: 0 auto; width: 100%;">

      <!-- Item Preview Card -->
      <div style="display:flex; gap:16px; background:#f8fafc; padding:16px; border-radius:16px; border:1px solid #e2e8f0; margin-bottom:20px;">
        <img src="${imgSrc}" alt="${itemName}" style="width:80px; height:80px; border-radius:12px; object-fit:cover;" onerror="this.onerror=null;this.src='pig2.jpg'" />
        <div style="flex:1;">
          <h4 style="margin:0 0 4px; font-size:1.05rem; font-weight:800; color:#0f172a;">${itemName}</h4>
          <p style="margin:0 0 8px; font-size:0.8rem; color:#64748b;">${item.description}</p>
          <div style="display:flex; gap:12px; font-size:0.75rem; font-weight:700;">
            <span style="color:#0284c7; background:#e0f2fe; padding:2px 8px; border-radius:6px;">Faltan ${daysRemaining} días</span>
            <span style="color:#475569; background:#f1f5f9; padding:2px 8px; border-radius:6px;">Peso: ${item.current_weight || 15} kg</span>
          </div>
        </div>
      </div>

      <!-- Piggy Name Input Field -->
      <div style="margin-bottom: 24px;">
        <label for="input-piggy-custom-name" style="display:block; font-size:0.85rem; font-weight:700; color:#1e293b; margin-bottom:8px;">
          ¿Cómo quieres llamar a tu Piggy?
        </label>
        <div style="position:relative;">
          <input 
            type="text" 
            id="input-piggy-custom-name" 
            placeholder="Ej: Pochito, Tocino, Bacon..." 
            value="${itemName}" 
            maxlength="25"
            style="
              width: 100%;
              padding: 12px 16px;
              border: 1.5px solid #cbd5e1;
              border-radius: 12px;
              font-size: 0.95rem;
              font-family: inherit;
              font-weight: 600;
              color: #0f172a;
              background: #f8fafc;
              outline: none;
              transition: border-color 0.2s, background 0.2s;
            "
            onfocus="this.style.borderColor='#ec4899'; this.style.background='#ffffff';"
            onblur="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc';"
          />
        </div>
        <span style="display:block; font-size:0.72rem; color:#64748b; margin-top:4px;">
          Este nombre se registrará en tu contrato y aparecerá en tu Granja.
        </span>
      </div>

      <!-- Financial Calculation -->
      <div style="background:white; border:1px solid #f1f5f9; border-radius:16px; padding:16px; box-shadow:0 4px 15px rgba(0,0,0,0.03); margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.9rem; color:#64748b;">
          <span>Precio del Cerdo</span>
          <span style="font-weight:700; color:#0f172a;">${item.priceFormatted}</span>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.9rem; color:#64748b;">
          <span>Garantía de Cuidado</span>
          <span style="font-weight:700; color:#10b981;">Incluida (Gratis)</span>
        </div>

        <div style="height:1px; background:#f1f5f9; margin:12px 0;"></div>

        <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; color:#0f172a;">
          <span>Total a Pagar</span>
          <span style="color:#ec4899;">${item.priceFormatted}</span>
        </div>
      </div>

      <!-- Wallet Balance Check -->
      <div id="wallet-status-box" style="padding:16px; border-radius:16px; margin-bottom:24px; background:#f8fafc; border:1px solid #e2e8f0;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Saldo en Cuenta Agro</div>
            <div id="checkout-wallet-balance" style="font-size:1.2rem; font-weight:800; color:#0f172a; margin-top:2px;">Cargando...</div>
          </div>
          <button id="btn-quick-recharge" class="btn btn--outline btn--sm" style="display:none; border-color:#ec4899; color:#ec4899; font-weight:700;">
            Recargar
          </button>
        </div>
      </div>

      <!-- Error / Notice Box -->
      <div id="checkout-error" style="display:none; padding:12px 16px; background:#fef2f2; border:1px solid #fecaca; border-radius:12px; color:#b91c1c; font-size:0.85rem; margin-bottom:16px;"></div>

      <!-- Action Button -->
      <button id="btn-confirm-purchase" class="btn btn--primary btn--lg btn-shine-7s" style="width:100%; border-radius:14px; font-weight:800;">
        Continuar al Contrato Digital →
      </button>

      <p style="text-align:center; font-size:0.75rem; color:#94a3b8; margin-top:12px;">
        Firmarás el contrato oficial con respaldo legal de Granja Villa Morales.
      </p>

    </div>
  `;

  document.body.appendChild(modal);

  // 2. Check Balance and Wire Up Listeners
  let currentBalance = 0;
  getWalletBalance().then(balance => {
    currentBalance = balance;
    const balanceEl = document.getElementById('checkout-wallet-balance');
    const rechargeBtn = document.getElementById('btn-quick-recharge');
    const confirmBtn = document.getElementById('btn-confirm-purchase');

    if (balanceEl) {
      balanceEl.textContent = formatCOP(balance);
    }

    if (balance < item.price) {
      if (rechargeBtn) rechargeBtn.style.display = 'block';
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Saldo Insuficiente';
        confirmBtn.style.opacity = '0.6';
      }
    }
  });

  // Close Modal Handler
  document.getElementById('btn-close-checkout').addEventListener('click', () => {
    document.body.style.overflow = '';
    modal.remove();
  });

  // Quick Recharge Button -> Opens recharge instruction modal
  document.getElementById('btn-quick-recharge').addEventListener('click', () => {
    document.body.style.overflow = '';
    modal.remove();
    openWalletRechargeInfo();
  });

  // Confirm Purchase Handler -> Navigate directly to ContratoView
  document.getElementById('btn-confirm-purchase').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('btn-confirm-purchase');
    const errorEl = document.getElementById('checkout-error');
    const customNameInput = document.getElementById('input-piggy-custom-name');
    const chosenName = (customNameInput ? customNameInput.value.trim() : '') || itemName;

    if (currentBalance < item.price) {
      errorEl.textContent = 'Saldo insuficiente para completar la compra.';
      errorEl.style.display = 'block';
      return;
    }

    // Set pending adoption in AppState and navigate to ContratoView for digital signature
    AppState.set({
      pendingAdoption: {
        item: {
          ...item,
          name: chosenName,
          piggy_name: chosenName,
          title: chosenName,
          price: item.price,
          cycleDays: daysRemaining,
          cycle_duration_days: daysRemaining,
          initial_weight: item.current_weight || 15.0,
          target_weight: 110.0,
          image_url: imgSrc,
          imageUrl: imgSrc,
          extraRoi: item.extra_roi || 0,
        },
        customName: chosenName,
      }
    });

    document.body.style.overflow = '';
    modal.remove();
    navigateTo('contrato');
  });
}
