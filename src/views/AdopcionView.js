/* ============================================
   PIGGY APP — Adopción View (Compra de Cerdos)
   Matches screen1.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { buyMarketplaceItem } from '../services/piggiesService.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { formatCOP, formatPercentage } from '../services/mockData.js';
import { navigateTo } from '../router.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

let selectedItem = null;
let currentCustomName = '';
let currentItems = [];

/**
 * Render the Adopción view.
 */
export function renderAdopcionView() {
    const app = document.getElementById('app');

    // Show initial skeleton loader
    app.innerHTML = `
    <div class="page adopcion-page">
      <div class="page__content">
        ${renderHeader()}
        ${renderPiggyLoader('Cargando cerdos disponibles...')}
      </div>
      ${renderBottomNav('mercado')}
    </div>
  `;

    // Load available items from Supabase
    loadAdopcionData();

    return () => {
        // Cleanup if needed
        selectedItem = null;
        currentCustomName = '';
    };
}

/**
 * Load items from DB and render full view.
 */
async function loadAdopcionData() {
    try {
        const items = await getMarketplaceItems();
        currentItems = items;
        selectedItem = items.find((i) => i.isAvailable) || items[0] || null;

        const app = document.getElementById('app');
        app.innerHTML = buildAdopcionFull(items);

        attachAdopcionListeners(items);
    } catch (error) {
        console.error('Error loading adopcion data:', error);
    }
}

/**
 * Build the full Adopción view HTML.
 */
function buildAdopcionFull(items) {
    return `
    <div class="page adopcion-page">
      <div class="page__content">
        ${renderHeader()}

        <!-- Benefit Banner -->
        <div class="adopcion-banner">
          <div class="adopcion-banner__content">
            <span class="adopcion-banner__tag">🚀 Margen Comercial Seguro</span>
            <h2 class="adopcion-banner__title">Genera 8% - 10% por Ciclo</h2>
            <p class="adopcion-banner__subtitle">Nos encargamos de la crianza, alimentación y comercialización en granja.</p>
          </div>
        </div>

        <!-- Available Piggies Grid -->
        <div class="section">
          <div class="section__header">
            <h3 class="section__title">Cerdos Disponibles</h3>
            <span class="section__count">${items.filter((i) => i.isAvailable).length} disponibles</span>
          </div>

          <div class="adopcion-grid">
            ${items.map((item) => renderItemCard(item)).join('')}
          </div>
        </div>

        <!-- Purchase Summary Card (Sticky Bottom or Inline) -->
        ${selectedItem ? renderPurchaseCard(selectedItem) : ''}
      </div>

      ${renderBottomNav('mercado')}
    </div>
  `;
}

function renderHeader() {
    return `
    <div class="page-header">
      <button class="page-header__back" id="btn-back" aria-label="Volver">
        ${renderIcon('arrowLeft', '', '20')}
      </button>
      <h1 class="page-header__title">Mercado de Cerdos</h1>
      <div style="width: 40px;"></div>
    </div>
  `;
}

function renderItemCard(item) {
    const isSelected = selectedItem && selectedItem.id === item.id;

    return `
    <div class="adopcion-card card ${isSelected ? 'adopcion-card--selected' : ''} ${!item.isAvailable ? 'adopcion-card--sold-out' : 'card--interactive'}"
         data-item-id="${item.id}">
      ${item.badge ? `<span class="adopcion-card__badge">${item.badge}</span>` : ''}

      <div class="adopcion-card__image-wrap">
        <img src="${item.imageUrl}" alt="${item.name}" class="adopcion-card__image" loading="lazy" />
        ${!item.isAvailable ? '<span class="adopcion-card__sold-overlay">Agotado</span>' : ''}
      </div>

      <div class="adopcion-card__body">
        <h4 class="adopcion-card__name">${item.name}</h4>
        <p class="adopcion-card__breed">${item.breed}</p>

        <div class="adopcion-card__stats">
          <div class="adopcion-card__stat">
            <span class="adopcion-card__stat-label">Peso inicial</span>
            <span class="adopcion-card__stat-value">${item.currentWeight} kg</span>
          </div>
          <div class="adopcion-card__stat">
            <span class="adopcion-card__stat-label">Tiempo restante</span>
            <span class="adopcion-card__stat-value">${item.daysRemaining} días</span>
          </div>
        </div>

        <div class="adopcion-card__footer">
          <div class="adopcion-card__price">
            <span class="adopcion-card__price-label">Inversión</span>
            <span class="adopcion-card__price-val">${formatCOP(item.price)}</span>
          </div>
          <div class="adopcion-card__roi">
            <span class="adopcion-card__roi-label">Retorno estimado</span>
            <span class="adopcion-card__roi-val text-success">${formatCOP(item.projectedReturn)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPurchaseCard(item) {
    return `
    <div class="adopcion-purchase-card card" id="purchase-card">
      <h3 class="adopcion-purchase-card__title">Resumen de Adopción</h3>

      <!-- Name input -->
      <div class="input-group" style="margin-bottom: var(--space-md);">
        <label class="input-label" for="piggy-name-input">Nombre de tu Piggy</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">🐷</span>
          <input
            type="text"
            id="piggy-name-input"
            class="input-wrapper__field"
            placeholder="Ej: Pochito, Tocino, Bacon..."
            value="${currentCustomName}"
            maxlength="20"
          />
        </div>
      </div>

      <!-- Financial breakdown -->
      <div class="adopcion-breakdown">
        <div class="adopcion-breakdown__row">
          <span>Inversión Inicial:</span>
          <strong>${formatCOP(item.price)}</strong>
        </div>
        <div class="adopcion-breakdown__row">
          <span>Margen Base (1er Piggy):</span>
          <span class="text-success font-semibold">8%</span>
        </div>
        ${item.extraRoi > 0 ? `
          <div class="adopcion-breakdown__row">
            <span>Bono Especial:</span>
            <span class="text-success font-semibold">+${formatPercentage(item.extraRoi)}</span>
          </div>
        ` : ''}
        <div class="adopcion-breakdown__row adopcion-breakdown__row--total">
          <span>Retorno Total Estimado:</span>
          <strong class="text-primary">${formatCOP(item.projectedReturn)}</strong>
        </div>
      </div>

      <!-- Action Button -->
      <button class="btn btn--primary btn--lg" id="btn-continue-contract" ${!item.isAvailable ? 'disabled' : ''}>
        Continuar al Contrato Digital →
      </button>

      <p class="adopcion-purchase-card__notice">
        🔒 Contrato digital con firma electrónica y respaldo jurídico Valle Morales.
      </p>
    </div>
  `;
}

function renderBottomNav(activeTab) {
    return `
    <nav class="bottom-nav">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}">
        <span class="bottom-nav__icon">${renderIcon('farm', '', '24')}</span>
        <span>Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}">
        <span class="bottom-nav__icon">${renderIcon('pigSide', '', '24')}</span>
        <span>Mercado</span>
      </a>
      <a href="#/gourmet" class="bottom-nav__item ${activeTab === 'gourmet' ? 'bottom-nav__item--active' : ''}">
        <span class="bottom-nav__icon">${renderIcon('shoppingBag', '', '24')}</span>
        <span>Tienda</span>
      </a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}">
        <span class="bottom-nav__icon">${renderIcon('people', '', '24')}</span>
        <span>Aliados</span>
      </a>
    </nav>
  `;
}

function attachAdopcionListeners(items) {
    // Back button
    document.getElementById('btn-back')?.addEventListener('click', () => {
        navigateTo('granja');
    });

    // Item selection
    document.querySelectorAll('.adopcion-card:not(.adopcion-card--sold-out)').forEach((card) => {
        card.addEventListener('click', () => {
            const itemId = card.dataset.itemId;
            selectedItem = items.find((i) => i.id === itemId) || null;

            // Re-render
            const app = document.getElementById('app');
            app.innerHTML = buildAdopcionFull(items);
            attachAdopcionListeners(items);
        });
    });

    // Name input change
    const nameInput = document.getElementById('piggy-name-input');
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            currentCustomName = e.target.value;
        });
    }

    // Continue to contract
    document.getElementById('btn-continue-contract')?.addEventListener('click', () => {
        if (!selectedItem) return;

        const name = (currentCustomName || '').trim() || 'Mi Piggy';
        // Save selected item & chosen name to session state for ContratoView
        AppState.set({
            pendingAdoption: {
                item: selectedItem,
                customName: name,
            },
        });

        navigateTo('contrato');
    });
}
