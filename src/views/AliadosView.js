/* ============================================
   PIGGY APP — Aliados (Allies) View
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { getAllies, getAllyCategories } from '../services/alliesService.js';

let activeCategory = null;

/**
 * Render the Aliados view.
 */
export function renderAliadosView() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="page page--with-nav aliados-page">
      <div class="page__content">
        <h2 class="aliados-title animate-fade-in-up">Aliados</h2>
        <p class="aliados-subtitle animate-fade-in-up">Descubre la red de empresas asociadas, puntos de entrega y beneficios exclusivos.</p>

        <div id="aliados-filters" class="aliados-filters animate-fade-in-up"></div>
        <div id="aliados-content">
          <div class="loading-container">
            <div class="spinner"></div>
            <span>Cargando aliados...</span>
          </div>
        </div>
      </div>
      ${renderBottomNav('aliados')}
    </div>
  `;

    loadAliadosData();

    return () => {
        activeCategory = null;
    };
}

/**
 * Load allies data.
 */
async function loadAliadosData() {
    try {
        const [allies, categories] = await Promise.all([
            getAllies(activeCategory),
            getAllyCategories(),
        ]);

        renderFilters(categories);
        renderAlliesList(allies);
    } catch (error) {
        console.error('Error loading allies:', error);
        const container = document.getElementById('aliados-content');
        if (container) {
            container.innerHTML = `
        <div class="auth-form__error auth-form__error--visible">
          Error al cargar aliados. Intenta de nuevo.
        </div>
      `;
        }
    }
}

/**
 * Render category filter pills.
 */
function renderFilters(categories) {
    const container = document.getElementById('aliados-filters');
    if (!container) return;

    container.innerHTML = `
    <button class="aliados-filter ${!activeCategory ? 'aliados-filter--active' : ''}" data-category="">
      Todos
    </button>
    ${categories.map((cat) => `
      <button class="aliados-filter ${activeCategory === cat ? 'aliados-filter--active' : ''}" data-category="${cat}">
        ${getCategoryIcon(cat)} ${cat}
      </button>
    `).join('')}
  `;

    container.querySelectorAll('.aliados-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.category || null;
            loadAliadosData();
        });
    });
}

/**
 * Render allies list.
 */
function renderAlliesList(allies) {
    const container = document.getElementById('aliados-content');
    if (!container) return;

    if (allies.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">
          ${renderIcon('people', '', '32')}
        </div>
        <div class="empty-state__title">Sin aliados en esta categoría</div>
        <div class="empty-state__description">Próximamente más aliados se unirán a nuestra red.</div>
      </div>
    `;
        return;
    }

    container.innerHTML = `
    <div class="aliados-list">
      ${allies.map(renderAllyCard).join('')}
    </div>
  `;
}

/**
 * Render a single ally card.
 */
function renderAllyCard(ally) {
    const initial = ally.name.charAt(0).toUpperCase();
    return `
    <div class="ally-card card animate-fade-in-up">
      <div class="ally-card__header">
        <div class="ally-card__logo">${initial}</div>
        <div class="ally-card__info">
          <h4 class="ally-card__name">${ally.name}</h4>
          <span class="badge badge--primary">${ally.category}</span>
        </div>
      </div>
      <div class="ally-card__details">
        <div class="ally-card__location">
          ${renderIcon('location', '', '14')}
          <span>${ally.location}</span>
        </div>
        <div class="ally-card__discount">
          ${renderIcon('gift', '', '14')}
          <span>${ally.discount_info}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get icon for category.
 */
function getCategoryIcon(category) {
    const icons = {
        'Carnicería': '🥩',
        'Restaurante': '🍽️',
        'Distribuidor': '🚛',
    };
    return icons[category] || '🏢';
}
