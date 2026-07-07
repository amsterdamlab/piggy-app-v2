/* ============================================
   PIGGY APP — Aliados (Allies) View
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { getAllies, getAllyCategories } from '../services/alliesService.js';
import { completeMissionOnVisit } from '../services/missionsService.js';

let activeCategory = null;

/**
 * Render the Aliados view.
 */
export function renderAliadosView() {
  const app = document.getElementById('app');

  // M5: auto-complete "Compra en locales aliados" on first visit
  completeMissionOnVisit('m5');

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
  const imageUrl = ally.image_url || getFallbackImage(ally.category);
  const specialty = ally.specialty || ally.category || '';
  const description = ally.description || ally.discount_info || '';
  const benefitText = ally.benefit || ally.discount_info || '';
  const phone = ally.phone || '300 123 4567';
  const address = ally.address || ally.location || 'Calle Principal # 123';

  const rawPhone = ally.phone || '3001234567';
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
    cleanPhone = '57' + cleanPhone;
  }
  const waLink = `https://wa.me/${cleanPhone}`;

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${ally.name}" class="ally-card__image" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=\\'ally-card__image-placeholder\\'>${ally.name.charAt(0).toUpperCase()}</div>'">`
    : `<div class="ally-card__image-placeholder">${ally.name.charAt(0).toUpperCase()}</div>`;

  return `
    <div class="ally-card animate-fade-in-up">
      <div class="ally-card__image-container">
        ${imageHtml}
        <div class="ally-card__category-tag">
           ${renderIcon('tag', 'ally-card__tag-icon', '14')}
           ${ally.category}
        </div>
      </div>
      
      <div class="ally-card__content">
        <h3 class="ally-card__name">${ally.name}</h3>
        <span class="ally-card__specialty">${specialty}</span>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-xs); flex-wrap: wrap; margin-bottom: 2px;">
          <p class="ally-card__contact-line" style="margin: 0;">📞 ${phone}</p>
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="ally-card__wa-btn" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #25D366;
            color: white;
            padding: 5px 12px;
            border-radius: var(--radius-sm, 8px);
            font-size: 0.72rem;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 2px 6px rgba(37, 211, 102, 0.25);
            transition: background var(--transition-fast), transform var(--transition-fast);
          " onmouseover="this.style.background='#20ba5a'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#25D366'; this.style.transform='translateY(0)'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display: block;">
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.993L2 22l5.13-1.35c1.472.8 3.128 1.22 4.878 1.22h.004c5.505 0 9.989-4.478 9.99-9.984A9.97 9.97 0 0 0 12.012 2zm4.72 13.916c-.26.732-1.272 1.332-1.748 1.378-.456.046-.9.23-2.9-.575-2.4-1-3.924-3.44-4.044-3.602-.12-.162-1.02-1.357-1.02-2.588s.642-1.848.87-2.083c.228-.236.498-.295.666-.295.168 0 .336.002.48.01.149.007.348-.056.545.422.203.49.696 1.706.756 1.83.06.123.1.266.018.432-.08.167-.123.272-.246.417-.122.145-.257.324-.366.435-.12.122-.246.255-.106.495.14.24.62 1.025 1.333 1.66.917.818 1.693 1.07 1.933 1.19.24.12.38.1.522-.065.14-.167.62-.725.786-.973.167-.247.33-.207.558-.122.228.085 1.446.683 1.692.807.247.123.412.185.472.29.06.103.06.6-.2 1.332z"/>
            </svg>
            Contactar
          </a>
        </div>
        <p class="ally-card__contact-line">📍 ${address}</p>

        <p class="ally-card__description">${description}</p>
        
        <div class="ally-card__benefit">
            <div class="ally-card__benefit-icon">
                %
            </div>
            <div class="ally-card__benefit-info">
                <span class="ally-card__benefit-text">${benefitText}</span>
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
