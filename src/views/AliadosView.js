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
 * Resilient to missing DB columns — uses fallbacks for image, description, specialty, benefit.
 */
function renderAllyCard(ally) {
  const imageUrl = ally.image_url || getFallbackImage(ally.category);
  const specialty = ally.specialty || ally.category || '';
  const description = ally.description || ally.discount_info || '';
  const benefitText = ally.benefit || ally.discount_info || '';
  
  // Fallback contact info if missing (User asked to invent data, so we can use placeholders or rely on DB/Mock)
  const phone = ally.phone || '300 123 4567';
  const address = ally.address || ally.location || 'Calle Principal # 123';

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${ally.name}" class="ally-card__image" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous">`
    : `<div class="ally-card__image-placeholder">${ally.name.charAt(0).toUpperCase()}</div>`;

  return `
    <div class="ally-card card animate-fade-in-up">
      <div class="ally-card__image-container">
        ${imageHtml}
        <div class="ally-card__category-tag">
           ${renderIcon('tag', 'ally-card__tag-icon', '14')}
           ${ally.category}
        </div>
      </div>
      
      <div class="ally-card__content">
        <div class="ally-card__header">
            <h3 class="ally-card__name">${ally.name}</h3>
            <span class="ally-card__specialty">${specialty}</span>
        </div>

        <p class="ally-card__description">${description}</p>
        
        <div class="ally-card__benefit">
            <div class="ally-card__benefit-icon">
                %
            </div>
            <div class="ally-card__benefit-info">
                <span class="ally-card__benefit-text">${benefitText}</span>
            </div>
        </div>

        <div class="ally-card__contact">
             <div class="ally-card__contact-item">
                ${renderIcon('phone', 'ally-card__contact-icon', '16')}
                <span>${phone}</span>
            </div>
            <div class="ally-card__contact-item">
                ${renderIcon('location', 'ally-card__contact-icon', '16')}
                <span>${address}</span>
            </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Provide a fallback Unsplash image based on ally category.
 */
function getFallbackImage(category) {
  const images = {
    'Carnicería': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
    'Restaurante': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    'Distribuidor': 'https://images.unsplash.com/photo-1558030006-d35974213323?auto=format&fit=crop&w=800&q=80',
    'Petshop': 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80',
    'Barbería': 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
  };
  return images[category] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80';
}

/**
 * Get icon for category.
 */
function getCategoryIcon(category) {
  const icons = {
    'Carnicería': '🥩',
    'Restaurante': '🍽️',
    'Distribuidor': '🚛',
    'Petshop': '🐾',
    'Barbería': '💈',
  };
  return icons[category] || '🏢';
}
