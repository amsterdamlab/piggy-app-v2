/* ============================================
   PIGGY APP — Aliados (Allies) View
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { getAllies, getAllyCategories } from '../services/alliesService.js';
import { completeMissionOnVisit } from '../services/missionsService.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

let activeCategory = null;

/**
 * Render the Aliados view.
 */
export function renderAliadosView() {
  const app = document.getElementById('app');

  // M7: auto-complete "Compra en locales aliados" on first visit
  completeMissionOnVisit('m7');

  app.innerHTML = `
    <div class="page page--with-nav aliados-page">
      <div class="page__content">
        <h2 class="aliados-title animate-fade-in-up">Aliados</h2>
        <p class="aliados-subtitle animate-fade-in-up">Descubre la red de empresas asociadas, puntos de entrega y beneficios exclusivos.</p>

        <div id="aliados-filters" class="aliados-filters animate-fade-in-up"></div>
        <div id="aliados-content">
          ${renderPiggyLoader('Cargando aliados...')}
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
        <div class="empty-state__icon">🔍</div>
        <div class="empty-state__title">No se encontraron aliados</div>
        <div class="empty-state__description">Pronto agregaremos más aliados en esta categoría.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="aliados-grid">
      ${allies.map((ally) => renderAllyCard(ally)).join('')}
    </div>
  `;
}

/**
 * Render single ally card.
 */
function renderAllyCard(ally) {
  return `
    <div class="card ally-card animate-fade-in-up">
      <div class="ally-card__image-container">
        <img
          src="${ally.image_url}"
          alt="${ally.name}"
          class="ally-card__image"
          onerror="this.src='https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&fit=crop'"
        />
        <span class="badge ally-card__category">${ally.category}</span>
        ${ally.discount ? `<span class="badge badge--success ally-card__discount">${ally.discount}</span>` : ''}
      </div>

      <div class="ally-card__body">
        <h3 class="ally-card__name">${ally.name}</h3>
        <p class="ally-card__desc">${ally.description}</p>

        <div class="ally-card__meta">
          <span class="ally-card__location">
            ${renderIcon('mapPin', 'ally-card__meta-icon')}
            ${ally.city || 'Colombia'}
          </span>
          ${ally.address ? `<span class="ally-card__address">${ally.address}</span>` : ''}
        </div>

        ${ally.benefit ? `
          <div class="ally-card__benefit">
            <span class="ally-card__benefit-icon">🎁</span>
            <span class="ally-card__benefit-text">${ally.benefit}</span>
          </div>
        ` : ''}

        ${ally.instagram_url ? `
          <a
            href="${ally.instagram_url}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn--outline btn--sm ally-card__action"
          >
            ${renderIcon('externalLink', 'btn__icon')}
            Ver en Instagram
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Get emoji icon for category.
 */
function getCategoryIcon(category) {
  const icons = {
    Restaurantes: '🍽️',
    Gourmet: '🥩',
    Cafés: '☕',
    Mercados: '🛒',
    Experiencias: '🎪',
  };
  return icons[category] || '🏢';
}
