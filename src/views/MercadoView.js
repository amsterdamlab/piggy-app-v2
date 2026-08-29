/* ============================================
   PIGGY APP — Mercado View (Catálogo de Cerdos)
   Matches screen1.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getMarketplaceItems, getMarketplaceStats } from '../services/marketplaceService.js';
import { getUserPiggies } from '../services/piggiesService.js';
import { formatCOP, formatPercentage } from '../services/mockData.js';
import { navigateTo } from '../router.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

let activeFilter = 'todos'; // 'todos' | 'destete' | 'crecimiento' | 'engorde' | 'dorado'

/**
 * Render the Mercado view.
 */
export function renderMercadoView() {
    const app = document.getElementById('app');

    // Initial loading state
    app.innerHTML = `
    <div class="page page--with-nav mercado-page">
      <div class="page__content">
        ${renderMercadoHeader()}
        ${renderPiggyLoader('Cargando catálogo de cerdos...')}
      </div>
      ${renderBottomNav('mercado')}
    </div>
  `;

    loadMercadoData();

    return () => {
        // cleanup
    };
}

/**
 * Load items from DB and render.
 */
async function loadMercadoData() {
    try {
        const [items, userPiggies] = await Promise.all([
            getMarketplaceItems(),
            getUserPiggies(),
        ]);

        const stats = getMarketplaceStats(items);
        const app = document.getElementById('app');

        app.innerHTML = buildMercadoFull(items, stats, userPiggies.length);
        attachMercadoListeners(items);
    } catch (error) {
        console.error('Error loading mercado data:', error);
    }
}

/**
 * Build full Mercado view HTML.
 */
function buildMercadoFull(items, stats, userPiggyCount) {
    const filteredItems = filterItems(items, activeFilter);

    return `
    <div class="page page--with-nav mercado-page">
      <div class="page__content">
        ${renderMercadoHeader()}

        <!-- Benefit / Marketing Banner -->
        <div class="mercado-banner">
          <div class="mercado-banner__tag">🚀 Margen Comercial Garantizado</div>
          <h2 class="mercado-banner__title">Gana del 8% al 10% por Ciclo</h2>
          <p class="mercado-banner__subtitle">
            Nosotros cuidamos, alimentamos y comercializamos tu cerdo en granja. Tú recibes el retorno al finalizar el ciclo.
          </p>
          <div class="mercado-banner__badges">
            <span class="mercado-banner__badge">🛡️ Garantía Valle Morales</span>
            <span class="mercado-banner__badge">📜 Contrato Digital</span>
            <span class="mercado-banner__badge">📊 Monitoreo en Vivo</span>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="mercado-filters">
          <button class="filter-chip ${activeFilter === 'todos' ? 'filter-chip--active' : ''}" data-filter="todos">
            Todos (${items.length})
          </button>
          <button class="filter-chip ${activeFilter === 'destete' ? 'filter-chip--active' : ''}" data-filter="destete">
            🍼 Destete (1 Mes)
          </button>
          <button class="filter-chip ${activeFilter === 'crecimiento' ? 'filter-chip--active' : ''}" data-filter="crecimiento">
            🌱 Crecimiento (2-3 Meses)
          </button>
          <button class="filter-chip ${activeFilter === 'engorde' ? 'filter-chip--active' : ''}" data-filter="engorde">
            ⚡ Engorde (4 Meses)
          </button>
          <button class="filter-chip ${activeFilter === 'dorado' ? 'filter-chip--active' : ''}" data-filter="dorado">
            🥇 Dorados (+2% ROI)
          </button>
        </div>

        <!-- Items Grid -->
        <div class="section">
          <div class="section__header">
            <h3 class="section__title">Lotes Disponibles</h3>
            <span class="section__count">${filteredItems.filter((i) => i.isAvailable).length} en stock</span>
          </div>

          ${filteredItems.length === 0 ? renderEmptyFilter() : `
            <div class="mercado-grid">
              ${filteredItems.map((item) => renderMercadoCard(item, userPiggyCount)).join('')}
            </div>
          `}
        </div>
      </div>

      ${renderBottomNav('mercado')}
    </div>
  `;
}

function renderMercadoHeader() {
    return `
    <div class="mercado-header">
      <div>
        <h1 class="mercado-header__title">Mercado de Cerdos</h1>
        <p class="mercado-header__subtitle">Selecciona tu Piggy y comienza a producir</p>
      </div>
    </div>
  `;
}

function renderMercadoCard(item, userPiggyCount) {
    const isSoldOut = !item.isAvailable;
    const extraMargin = userPiggyCount >= 2 ? (userPiggyCount >= 4 ? 0.02 : 0.01) : 0;
    const totalRoiForUser = item.totalRoi + extraMargin;
    const projectedReturn = item.price * (1 + totalRoiForUser);

    return `
    <div class="mercado-card card ${isSoldOut ? 'mercado-card--sold-out' : 'card--interactive'}" data-item-id="${item.id}">
      ${item.badge ? `<span class="mercado-card__badge">${item.badge}</span>` : ''}

      <!-- Image -->
      <div class="mercado-card__image-wrap">
        <img src="${item.imageUrl}" alt="${item.name}" class="mercado-card__image" loading="lazy" />
        ${isSoldOut ? '<div class="mercado-card__sold-overlay"><span>Agotado</span></div>' : ''}
        <span class="mercado-card__stock-tag ${item.stock <= 2 ? 'mercado-card__stock-tag--low' : ''}">
          ${isSoldOut ? 'Sin unidades' : `¡Solo ${item.stock} disponibles!`}
        </span>
      </div>

      <!-- Content -->
      <div class="mercado-card__content">
        <div class="mercado-card__header">
          <h4 class="mercado-card__name">${item.name}</h4>
          <span class="mercado-card__breed">${item.breed}</span>
        </div>

        <p class="mercado-card__desc">${item.description}</p>

        <!-- Stats Grid -->
        <div class="mercado-card__stats">
          <div class="mercado-card__stat">
            <span class="mercado-card__stat-label">Peso actual</span>
            <span class="mercado-card__stat-value font-bold">${item.currentWeight} kg</span>
          </div>
          <div class="mercado-card__stat">
            <span class="mercado-card__stat-label">Tiempo de ciclo</span>
            <span class="mercado-card__stat-value font-bold">${item.daysRemaining} días</span>
          </div>
          <div class="mercado-card__stat">
            <span class="mercado-card__stat-label">Margen estimado</span>
            <span class="mercado-card__stat-value font-bold text-success">${formatPercentage(totalRoiForUser)}</span>
          </div>
          <div class="mercado-card__stat">
            <span class="mercado-card__stat-label">Etapa</span>
            <span class="mercado-card__stat-value font-bold">Mes ${item.currentMonth}/5</span>
          </div>
        </div>

        <!-- Price & CTA -->
        <div class="mercado-card__footer">
          <div>
            <span class="mercado-card__price-label">Inversión</span>
            <div class="mercado-card__price-val">${formatCOP(item.price)}</div>
            <span class="mercado-card__return-text">Retorno: ${formatCOP(projectedReturn)}</span>
          </div>

          <button class="btn btn--primary btn--sm btn-shine-7s" ${isSoldOut ? 'disabled' : ''} data-buy-id="${item.id}">
            ${isSoldOut ? 'Agotado' : 'Comprar →'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyFilter() {
    return `
    <div class="empty-state" style="padding: var(--space-2xl) var(--space-lg);">
      <div class="empty-state__icon">🔍</div>
      <div class="empty-state__title">No hay cerdos en esta categoría</div>
      <div class="empty-state__description">Prueba seleccionando otro filtro o vuelve pronto.</div>
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

function filterItems(items, filter) {
    switch (filter) {
        case 'destete':
            return items.filter((i) => i.currentMonth === 1);
        case 'crecimiento':
            return items.filter((i) => i.currentMonth === 2 || i.currentMonth === 3);
        case 'engorde':
            return items.filter((i) => i.currentMonth >= 4);
        case 'dorado':
            return items.filter((i) => i.category === 'dorado' || i.extraRoi > 0);
        default:
            return items;
    }
}

function attachMercadoListeners(items) {
    // Filter chips
    document.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            activeFilter = chip.dataset.filter;
            // Update active state in UI
            document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('filter-chip--active'));
            chip.classList.add('filter-chip--active');

            // Re-render grid
            const userPiggies = AppState.get('piggies') || [];
            const stats = getMarketplaceStats(items);
            const app = document.getElementById('app');
            app.innerHTML = buildMercadoFull(items, stats, userPiggies.length);
            attachMercadoListeners(items);
        });
    });

    // Buy button clicks
    document.querySelectorAll('[data-buy-id]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.buyId;
            const item = items.find((i) => i.id === itemId);
            if (!item || !item.isAvailable) return;

            // Save selected item to state and navigate to Contrato
            AppState.set({
                pendingAdoption: {
                    item,
                    customName: item.name,
                },
            });

            navigateTo('contrato');
        });
    });

    // Card clicks (also open adoption/contract)
    document.querySelectorAll('.mercado-card:not(.mercado-card--sold-out)').forEach((card) => {
        card.addEventListener('click', () => {
            const itemId = card.dataset.itemId;
            const item = items.find((i) => i.id === itemId);
            if (!item || !item.isAvailable) return;

            AppState.set({
                pendingAdoption: {
                    item,
                    customName: item.name,
                },
            });

            navigateTo('contrato');
        });
    });
}
