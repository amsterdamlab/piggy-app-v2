/* ============================================
   PIGGY APP — Mercado (Marketplace) View
   Horizontal product cards with filters
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { navigateTo } from '../router.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';

/** In-memory state for current filter */
let currentFilter = 'all';
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
          <p class="mercado-subtitle">Encuentra tu Piggy ideal y empieza a invertir.</p>
        </div>

        <!-- Filter Bar -->
        <div class="mercado-filters animate-fade-in-up">
          <button class="filter-chip filter-chip--active" data-filter="all">Todos</button>
          <button class="filter-chip" data-filter="price">Menor precio</button>
          <button class="filter-chip" data-filter="stage">Etapa avanzada</button>
          <button class="filter-chip" data-filter="standard">Standard</button>
          <button class="filter-chip" data-filter="premium">Premium</button>
          <button class="filter-chip" data-filter="silver">Silver</button>
          <button class="filter-chip" data-filter="gold">Gold</button>
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

  attachFilterListeners();
  loadMarketplaceData();

  return () => { };
}

/**
 * Attach filter chip click listeners.
 */
function attachFilterListeners() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('filter-chip--active'));
      chip.classList.add('filter-chip--active');
      currentFilter = chip.dataset.filter;
      renderItems(cachedItems);
    });
  });
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
 * Apply filters and render items.
 */
function renderItems(items) {
  const container = document.getElementById('mercado-content');
  if (!container) return;

  let filtered = [...items];

  switch (currentFilter) {
    case 'price':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'stage':
      filtered.sort((a, b) => (b.current_weight || 0) - (a.current_weight || 0));
      break;
    case 'standard':
    case 'premium':
    case 'silver':
    case 'gold':
      filtered = filtered.filter(item => item.category === currentFilter);
      break;
    default:
      break;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="mercado-empty animate-fade-in-up">
        <span style="font-size:48px;">🔍</span>
        <p>No hay Piggies disponibles con este filtro.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="mercado-list">
      ${filtered.map(renderProductCard).join('')}
    </div>
  `;

  // Attach buy button listeners
  filtered.forEach(item => {
    document.getElementById(`buy-${item.id}`)?.addEventListener('click', () => {
      handleBuyPiggy(item);
    });
  });
}

/**
 * Render a single horizontal product card.
 */
function renderProductCard(item) {
  const categoryLabel = getCategoryLabel(item.category);
  const hasExtraROI = item.extra_roi > 0;
  const extraROIText = hasExtraROI ? `+${(item.extra_roi * 100).toFixed(0)}%` : '';
  const monthEstimate = Math.max(1, Math.round((item.current_weight || 15) / 10));

  return `
    <div class="mcard animate-fade-in-up">
      ${hasExtraROI ? `<span class="mcard__roi-badge">${extraROIText}</span>` : ''}

      <!-- Left: Image + Category -->
      <div class="mcard__left">
        <div class="mcard__img-wrap">
          <img src="pig1.png" alt="${item.item_name}" class="mcard__img" />
        </div>
        <span class="mcard__cat mcard__cat--${item.category || 'standard'}">${categoryLabel}</span>
      </div>

      <!-- Right: Details -->
      <div class="mcard__right">
        <h4 class="mcard__name">${item.item_name}</h4>
        <p class="mcard__desc">${item.description}</p>

        <!-- Tags: Month + Weight -->
        <div class="mcard__tags">
          <span class="mcard__tag mcard__tag--purple">Mes ${monthEstimate}</span>
          <span class="mcard__tag">${item.current_weight || 15} kg</span>
        </div>

        <!-- Price Row -->
        <div class="mcard__price-row">
          <div class="mcard__price-block">
            <span class="mcard__price">${item.priceFormatted}</span>
            <span class="mcard__stock">${item.stock} disponibles</span>
          </div>
          <button class="mcard__buy-btn" id="buy-${item.id}">
            ${renderIcon('shop', '', '16')}
            Comprar
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get human-readable category label.
 */
function getCategoryLabel(category) {
  const labels = {
    standard: 'Standard',
    premium: 'Premium',
    silver: 'Silver',
    gold: 'Gold',
  };
  return labels[category] || 'Standard';
}

/**
 * Handle buy piggy action.
 */
function handleBuyPiggy(item) {
  navigateTo('adopcion');
}
