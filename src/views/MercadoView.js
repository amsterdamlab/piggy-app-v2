/* ============================================
   PIGGY APP — Mercado (Marketplace) View
   Redesigned product listing with filters
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

        <!-- Products Grid -->
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
      // Update active state
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
      // Sort by current_weight descending (heavier = more advanced stage)
      filtered.sort((a, b) => (b.current_weight || 0) - (a.current_weight || 0));
      break;
    case 'standard':
    case 'premium':
    case 'silver':
    case 'gold':
      filtered = filtered.filter(item => item.category === currentFilter);
      break;
    default:
      // 'all' — no filter
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
    <div class="mercado-grid">
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
 * Render a single product card matching the target design.
 */
function renderProductCard(item) {
  const categoryLabel = getCategoryLabel(item.category);
  const categoryClass = `mercado-card__cat--${item.category || 'standard'}`;
  const hasExtraROI = item.extra_roi > 0;
  const extraROIText = hasExtraROI ? `+${(item.extra_roi * 100).toFixed(0)}% ROI` : '';

  return `
    <div class="mercado-card card animate-scale-in">
      <!-- Image Section -->
      <div class="mercado-card__image-section">
        <img src="pig1.png" alt="${item.item_name}" class="mercado-card__img" />
        ${hasExtraROI ? `
          <span class="mercado-card__roi-badge">${extraROIText}</span>
        ` : ''}
        <span class="mercado-card__category-tag ${categoryClass}">${categoryLabel}</span>
      </div>

      <!-- Info Section -->
      <div class="mercado-card__info">
        <h4 class="mercado-card__name">${item.item_name}</h4>
        <p class="mercado-card__desc">${item.description}</p>

        <div class="mercado-card__bottom">
          <div class="mercado-card__pricing">
            <span class="mercado-card__price">${item.priceFormatted}</span>
            <span class="mercado-card__stock">${item.stock} disponibles</span>
          </div>
          <button class="btn btn--primary btn--sm mercado-card__buy-btn" id="buy-${item.id}">
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
 * Handle buy piggy action — redirect to adopcion with pre-selected item.
 */
function handleBuyPiggy(item) {
  // Navigate to adoption/purchase flow
  navigateTo('adopcion');
}
