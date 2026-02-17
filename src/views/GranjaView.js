/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Matches screen2.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats, formatCOP } from '../services/piggiesService.js';
import { navigateTo } from '../router.js';
// signOut removed as it is now in TopNav

/**
 * Render the Granja (Dashboard) view.
 */
export function renderGranjaView() {
  const app = document.getElementById('app');
  const profile = AppState.get('profile');
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

  // Show loading first, then fetch data
  app.innerHTML = buildGranjaShell(firstName);

  loadGranjaData(firstName);

  return () => {
    // cleanup if needed
  };
}

/**
 * Build the shell (before data is loaded).
 */
function buildGranjaShell(firstName) {
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title">Granja Piggy</h2>

        <!-- Stats Skeleton -->
        <div class="section animate-fade-in-up">
          <div class="stat-card" style="margin-bottom:var(--space-md);">
            <div>
              <div class="stat-card__label">Adopción Activa</div>
              <div class="stat-card__value">
                <span class="skeleton" style="display:inline-block;width:40px;height:28px;"></span>
              </div>
            </div>
            <div class="stat-card__icon">
              <span style="font-size: 28px;">🐷</span>
            </div>
          </div>
          <div class="grid-2">
            <div class="stat-card">
              <div>
                <div class="stat-card__label">Ganancia Real</div>
                <div class="stat-card__value stat-card__value--accent">
                  <span class="skeleton" style="display:inline-block;width:80px;height:24px;"></span>
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div>
                <div class="stat-card__label">Reclamados</div>
                <div class="stat-card__value">
                  <span class="skeleton" style="display:inline-block;width:30px;height:24px;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Piggies section skeleton -->
        <div class="section" id="piggies-section">
          <div class="loading-container">
            <div class="spinner"></div>
            <span>Cargando tu granja...</span>
          </div>
        </div>
      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

/**
 * Load data and update the dashboard.
 */
async function loadGranjaData(firstName) {
  try {
    const piggies = await getUserPiggies();
    const stats = await getDashboardStats(piggies);

    AppState.set({ piggies });

    // Update stats
    const app = document.getElementById('app');
    app.innerHTML = buildGranjaFull(firstName, piggies, stats);

    attachGranjaListeners();
  } catch (error) {
    console.error('Error loading granja data:', error);
    const section = document.getElementById('piggies-section');
    if (section) {
      section.innerHTML = `
        <div class="auth-form__error auth-form__error--visible">
          Error al cargar datos. Intenta de nuevo.
        </div>
      `;
    }
  }
}

/**
 * Build the full dashboard with data.
 */
function buildGranjaFull(firstName, piggies, stats) {
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Granja Piggy</h2>

        <!-- Stats -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s;">
          <div class="stat-card" style="margin-bottom:var(--space-md);">
            <div>
              <div class="stat-card__label">Adopción Activa</div>
              <div class="stat-card__value">${stats.activeCount}</div>
            </div>
            <div class="stat-card__icon">
              <span style="font-size: 28px;">🐷</span>
            </div>
          </div>
          <div class="grid-2">
            <div class="stat-card">
              <div>
                <div class="stat-card__label">Ganancia Real</div>
                <div class="stat-card__value stat-card__value--accent">${stats.projectedGainFormatted}</div>
              </div>
            </div>
            <div class="stat-card">
              <div>
                <div class="stat-card__label">Reclamados</div>
                <div class="stat-card__value">${stats.claimedCount}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ROI Info -->
        ${stats.activeCount > 0 ? `
          <div class="roi-info animate-fade-in-up" style="animation-delay: 0.15s;">
            ${renderIcon('trendUp', 'roi-info__icon', '16')}
            <span>Tu ROI base actual: <strong class="text-primary">${stats.baseROIFormatted}</strong></span>
          </div>
        ` : ''}

        <!-- Mis Cerdos -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.2s;">
          <div class="section__header">
            <h3 class="section__title">Mis Cerdos</h3>
            <a href="#" class="section__link">
              Ver historial ${renderIcon('arrowRight', '', '14')}
            </a>
          </div>

          ${piggies.length === 0 ? renderEmptyPiggies() : renderPiggiesList(piggies, stats.baseROI)}
        </div>

        <!-- Special Offer Banner -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
          <div class="banner" id="offer-banner">
            <div class="banner__badge">OFERTA ESPECIAL</div>
            <div class="banner__title">Consigue 5% extra</div>
            <div class="banner__subtitle">En tu primera adopción del mes.</div>
            <div class="banner__decoration">🐷</div>
          </div>
        </div>

        <!-- Missions Quick View -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.35s;">
          <div class="section__header">
            <h3 class="section__title">Misiones</h3>
          </div>
          <div class="missions-quick">
            <div class="mission-item" id="mission-feed">
              <span class="mission-item__icon">🍎</span>
              <div class="mission-item__info">
                <div class="mission-item__name">Alimenta a tu Piggy</div>
                <div class="mission-item__points">+10 pts</div>
              </div>
              <button class="btn btn--sm btn--primary mission-item__action">¡Listo!</button>
            </div>
            <div class="mission-item" id="mission-share">
              <span class="mission-item__icon">📱</span>
              <div class="mission-item__info">
                <div class="mission-item__name">Comparte tu progreso</div>
                <div class="mission-item__points">+25 pts</div>
              </div>
              <button class="btn btn--sm btn--secondary mission-item__action">Compartir</button>
            </div>
          </div>
        </div>

      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

/**
 * Render user greeting with avatar.
 */
function renderGreeting(firstName) {
  const initial = firstName.charAt(0).toUpperCase();
  return `
    <div class="granja-greeting animate-fade-in">
      <div class="granja-greeting__avatar">
        <span class="granja-greeting__initial">${initial}</span>
        <span class="granja-greeting__online"></span>
      </div>
      <div class="granja-greeting__text">
        <span class="granja-greeting__welcome">¡Bienvenido!</span>
        <span class="granja-greeting__name">Hola, ${firstName}</span>
      </div>
    </div>
  `;
}

/**
 * Render empty piggies state matching screen2.png.
 */
function renderEmptyPiggies() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">
        <span style="font-size: 32px;">🐷</span>
      </div>
      <div class="empty-state__title">No tienes cerdos aún</div>
      <div class="empty-state__description">
        Comienza tu granja adoptando tu primer cerdo y empieza a generar ganancias.
      </div>
      <button class="btn btn--primary" id="btn-adopt-empty" onclick="location.hash='#/adopcion'">
        Compra un nuevo Piggy
      </button>
    </div>
  `;
}

/**
 * Render piggies list.
 */
function renderPiggiesList(piggies, baseROI) {
  return `
    <div class="piggies-list">
      ${piggies.map((piggy) => renderPiggyCard(piggy, baseROI)).join('')}
    </div>
  `;
}

/**
 * Render a single piggy card.
 */
function renderPiggyCard(piggy, baseROI) {
  const totalROI = baseROI + (piggy.extra_roi_bonus || 0);
  const projectedReturn = piggy.investment_amount * (1 + totalROI);

  return `
    <div class="piggy-card card card--interactive" data-piggy-id="${piggy.id}">
      <div class="piggy-card__header">
        <div class="piggy-card__avatar">
          <span style="font-size: 36px;">🐷</span>
        </div>
        <div class="piggy-card__info">
          <div class="piggy-card__name">${piggy.name}</div>
          <div class="piggy-card__status">
            ${piggy.isComplete
      ? '<span class="badge badge--success">Listo para liquidar</span>'
      : `<span class="badge badge--primary">${piggy.daysLeft} días restantes</span>`
    }
          </div>
        </div>
        ${piggy.extra_roi_bonus > 0 ? `
          <span class="badge badge--warning">+${(piggy.extra_roi_bonus * 100).toFixed(0)}%</span>
        ` : ''}
      </div>

      <div class="piggy-card__progress">
        <div class="piggy-card__progress-header">
          <span class="text-sm text-muted">Progreso del ciclo</span>
          <span class="text-sm font-semibold">${piggy.progress}%</span>
        </div>
        <div class="progress">
          <div class="progress__bar" style="width: ${piggy.progress}%;"></div>
        </div>
      </div>

      <div class="piggy-card__stats grid-2">
        <div>
          <div class="text-xs text-muted">Peso actual</div>
          <div class="font-semibold">${piggy.currentWeight} kg</div>
        </div>
        <div>
          <div class="text-xs text-muted">Retorno estimado</div>
          <div class="font-semibold text-primary">${formatCOP(projectedReturn)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render bottom navigation.
 */
export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Navegación principal">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}" id="nav-granja">
        <span class="bottom-nav__icon">${renderIcon('farm', '', '24')}</span>
        <span>Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}" id="nav-mercado">
        <span class="bottom-nav__icon">${renderIcon('shop', '', '24')}</span>
        <span>Mercado</span>
      </a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}" id="nav-aliados">
        <span class="bottom-nav__icon">${renderIcon('people', '', '24')}</span>
        <span>Aliados</span>
      </a>
    </nav>
  `;
}

/**
 * Attach event listeners.
 */
function attachGranjaListeners() {
  // Piggy card click → navigate to detail
  document.querySelectorAll('.piggy-card').forEach((card) => {
    card.addEventListener('click', () => {
      const piggyId = card.dataset.piggyId;
      navigateTo(`piggy/${piggyId}`);
    });
  });

  // Offer banner click → marketplace
  document.getElementById('offer-banner')?.addEventListener('click', () => {
    navigateTo('mercado');
  });
}
