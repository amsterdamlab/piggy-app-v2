/* ============================================
   PIGGY APP — Granja View (Dashboard)
   Main screen showing all adopted pigs, feed
   progress, growth, and actions.
   ============================================ */

import { AppState } from '../state.js';
import { formatCOP, formatWeight, getGrowthPercentage } from '../services/mockData.js';
import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { getProfile } from '../services/authService.js';
import { getPiggies, getDashboardStats, feedPiggy } from '../services/piggiesService.js';
import { renderNewsBillboardModal } from '../components/NewsBillboardModal.js';
import { showWalletDrawer, openWalletDrawer } from './granja/WalletDrawerModal.js';
import { showRetiroSaldoModal } from './granja/WalletWithdrawalModal.js';
import { showReferralsModal } from './granja/ReferralsModal.js';
import { showSilverPiggyModal } from './granja/SilverPiggyModal.js';
import { showCycleMissionModal } from './granja/CycleMissionModal.js';
import { showFlashMissionModal } from './granja/FlashMissionModal.js';
import { initOnboardingTour } from './granja/OnboardingTourModal.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

let intervalId = null;

/**
 * Render the Granja (My Farm) view.
 * @param {HTMLElement} container - Target container.
 */
export async function renderGranjaView(container) {
  // Clear any existing timer
  if (intervalId) clearInterval(intervalId);

  // Initial loading state
  container.innerHTML = `
    <div class="page granja-page">
      <div class="container">
        ${renderPiggyLoader('Cargando tu granja...')}
      </div>
      ${renderBottomNav('granja')}
    </div>
  `;

  try {
    // 1. Fetch user profile from Supabase (or fallback to local session)
    let profile = AppState.get('profile');
    if (!profile) {
      profile = await getProfile();
      if (profile) AppState.set({ profile });
    }

    // 2. Fetch user's piggies from Supabase (fallback to mock)
    const piggies = await getPiggies();
    AppState.set({ piggies });

    // 3. Compute stats dynamically
    const stats = await getDashboardStats(piggies);

    // 4. Render main view
    const firstName = profile?.full_name?.split(' ')[0] || 'Granjero';
    const piggyCount = piggies.length;
    const hasPiggies = piggyCount > 0;

    container.innerHTML = `
      <div class="page granja-page animate-fade-in">
        <div class="container">

          <!-- 1. GREETING & ACTION BAR -->
          ${renderGreetingBar(firstName, stats)}

          <!-- 2. TOTAL BENEFIT CARD -->
          ${hasPiggies ? renderTotalBenefitCard(stats) : ''}

          <!-- 3. ACTION SHORTCUTS (3 Horizontal Cards) -->
          ${renderActionShortcuts(stats)}

          <!-- 4. PIGGIES SECTION (Cards or Empty State) -->
          ${hasPiggies ? renderPiggiesSection(piggies) : renderEmptyState()}

        </div>

        <!-- Sticky Bottom Navigation -->
        ${renderBottomNav('granja')}
      </div>
    `;

    // 5. Attach event listeners
    attachGranjaListeners(hasPiggies, stats, piggyCount, piggies);

    // 6. Setup auto-refresh for growth progress (every 60s)
    intervalId = setInterval(async () => {
      const updatedPiggies = await getPiggies();
      AppState.set({ piggies: updatedPiggies });
      updatePiggyProgress(updatedPiggies);
    }, 60000);

    // 7. Check if there are unviewed billboard news to display
    renderNewsBillboardModal();

    // 8. Launch Interactive Tour for first-time users (if eligible)
    initOnboardingTour({ hasPiggies, piggyCount });

  } catch (error) {
    console.error('Error rendering GranjaView:', error);
    container.innerHTML = `
      <div class="page granja-page">
        <div class="container">
          <div class="empty-state">
            <div class="empty-state__icon">⚠️</div>
            <h3 class="empty-state__title">Error al cargar la granja</h3>
            <p class="empty-state__text">${error.message || 'Intenta recargar la página'}</p>
            <button class="btn btn--primary" onclick="location.reload()">Recargar</button>
          </div>
        </div>
        ${renderBottomNav('granja')}
      </div>
    `;
  }
}

/**
 * 1. Greeting & User Profile Action Bar
 */
function renderGreetingBar(firstName, stats) {
  const profile = AppState.get('profile');
  const avatarUrl = profile?.avatar_url || '';
  const initial = (firstName || 'G')[0].toUpperCase();

  return `
    <div class="granja-greeting-bar" id="tour-step-greeting">
      <div class="granja-greeting-user">
        <a href="#/perfil" class="granja-avatar-link" title="Mi Perfil" id="granja-avatar-btn">
          ${avatarUrl
            ? `<img src="${avatarUrl}" alt="${firstName}" class="granja-avatar-img" />`
            : `<div class="granja-avatar-fallback">${initial}</div>`
          }
        </a>
        <div class="granja-greeting-text">
          <span class="granja-greeting-sub">Bienvenido de nuevo,</span>
          <h2 class="granja-greeting-name">${firstName}</h2>
        </div>
      </div>
      <div class="granja-greeting-actions">
        <button class="granja-action-btn" id="btn-descargar-app" title="Descargar App">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button class="granja-action-btn" id="btn-referidos" title="Invitar y Ganar">
          ${renderIcon('gift', '', '18')}
        </button>
        <button class="granja-action-btn" id="btn-perfil" title="Mi Perfil">
          ${renderIcon('user', '', '18')}
        </button>
      </div>
    </div>
  `;
}

/**
 * 2. Total Projected Benefit Card (Green)
 */
function renderTotalBenefitCard(stats) {
  return `
    <div class="benefit-card" id="tour-step-benefit">
      <div class="benefit-card__bg-decoration">
        ${renderIcon('pigSide', '', '120')}
      </div>
      <div class="benefit-card__header">
        <span class="benefit-card__badge">
          ${renderIcon('trendUp', '', '14')} Rentabilidad Total
        </span>
        <span class="benefit-card__roi">${stats.baseROIFormatted} ROI Base</span>
      </div>
      <div class="benefit-card__amount" data-total-benefit>${stats.totalProjectedFormatted}</div>
      <div class="benefit-card__sub">${stats.activePiggies} ${stats.activePiggies === 1 ? 'Piggy activo' : 'Piggies activos'} en producción</div>
      <div class="benefit-card__footer">
        <div class="benefit-card__stat">
          <span class="benefit-card__stat-label">Margen Comercial Granja</span>
          <span class="benefit-card__stat-value" data-total-roi>${stats.totalROIFormatted}</span>
        </div>
        <div class="benefit-card__stat-divider"></div>
        <div class="benefit-card__stat">
          <span class="benefit-card__stat-label">Valor de Compra</span>
          <span class="benefit-card__stat-value" data-total-invested>${stats.totalInvestedFormatted}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * 3. Action Shortcuts (3 Cards)
 */
function renderActionShortcuts(stats) {
  return `
    <div class="action-shortcuts">
      <!-- Retirar Saldo Card -->
      <div class="shortcut-card" id="btn-retiro-saldo">
        <div class="shortcut-card__icon shortcut-card__icon--green">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" />
            <rect x="6" y="8" width="12" height="12" rx="2" />
            <path d="M 12 11 v 6" />
            <path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" />
          </svg>
        </div>
        <div class="shortcut-card__body">
          <span class="shortcut-card__label">Retirar mi Saldo</span>
          <strong class="shortcut-card__value" data-wallet-balance>${stats.saldoDisponibleFormatted}</strong>
          <span class="shortcut-card__sub shortcut-card__sub--green">Disponible Inmediato</span>
        </div>
      </div>

      <!-- Bonos de Consumo Card -->
      <div class="shortcut-card" id="btn-bonos-consumo">
        <div class="shortcut-card__icon shortcut-card__icon--primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            <path d="M13 5v2"/>
            <path d="M13 17v2"/>
            <path d="M13 11v2"/>
          </svg>
        </div>
        <div class="shortcut-card__body">
          <span class="shortcut-card__label">Bonos Consumo</span>
          <strong class="shortcut-card__value" data-referral-bonus>${stats.referralBonusFormatted}</strong>
          <span class="shortcut-card__sub shortcut-card__sub--primary">Compras en Tienda</span>
        </div>
      </div>

      <!-- Cuenta Agro Card -->
      <div class="shortcut-card" id="btn-wallet-drawer">
        <div class="shortcut-card__icon shortcut-card__icon--blue">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
          </svg>
        </div>
        <div class="shortcut-card__body">
          <span class="shortcut-card__label">Tu Cuenta Agro</span>
          <strong class="shortcut-card__value">Explorar</strong>
          <span class="shortcut-card__sub shortcut-card__sub--blue">Trazabilidad Total</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * 4. Piggies Section (Active Cards)
 */
function renderPiggiesSection(piggies) {
  return `
    <div class="piggies-section" id="tour-step-piggies">
      <div class="section-header">
        <h3 class="section-title">Tus Piggys en Granja</h3>
        <span class="badge badge--success">${piggies.length} ${piggies.length === 1 ? 'Activo' : 'Activos'}</span>
      </div>
      <div class="piggies-grid" id="piggies-grid">
        ${piggies.map((piggy) => renderPiggyCard(piggy)).join('')}
      </div>
    </div>
  `;
}

/**
 * Empty State (No Piggies Adopted)
 */
function renderEmptyState() {
  return `
    <div class="empty-farm-state animate-fade-in">
      <div class="empty-farm-card">
        <div class="empty-farm-card__icon-wrapper">
          ${renderIcon('farm', '', '48')}
        </div>
        <h3 class="empty-farm-card__title">¡Tu granja está lista para comenzar!</h3>
        <p class="empty-farm-card__text">
          Aún no tienes cerditos en engorde. Adopta tu primer Piggy en el mercado y comienza a generar rentabilidad mientras nosotros cuidamos de él.
        </p>
        <a href="#/mercado" class="btn btn--primary btn--lg btn--block empty-farm-card__cta">
          ${renderIcon('shoppingBag', '', '20')} Ir al Mercado de Piggys
        </a>
      </div>

      <!-- Trust Badges Grid -->
      <div class="trust-badges-grid">
        <div class="trust-badge">
          <div class="trust-badge__icon">🛡️</div>
          <strong class="trust-badge__title">100% Asegurado</strong>
          <span class="trust-badge__sub">Póliza y monitoreo 24/7</span>
        </div>
        <div class="trust-badge">
          <div class="trust-badge__icon">📈</div>
          <strong class="trust-badge__title">12% Retorno Base</strong>
          <span class="trust-badge__sub">En cada ciclo de engorde</span>
        </div>
        <div class="trust-badge">
          <div class="trust-badge__icon">🌾</div>
          <strong class="trust-badge__title">Cuidado Experto</strong>
          <span class="trust-badge__sub">Granja Valle Morales</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render individual Piggy Card (matches original dashboard layout).
 */
function renderPiggyCard(piggy) {
  const currentWeight = piggy.initial_weight_kg + ((piggy.target_weight_kg - piggy.initial_weight_kg) * (piggy.growth_percentage || 0) / 100);
  const weightGain = currentWeight - piggy.initial_weight_kg;
  const initialPrice = piggy.initial_price || 0;
  const extraRoi = piggy.extra_roi || 0;
  const totalRoiPercentage = 0.12 + extraRoi;
  const projectedReturn = initialPrice * (1 + totalRoiPercentage);

  return `
    <div class="piggy-card" data-piggy-id="${piggy.id}">
      <div class="piggy-card__header">
        <div class="piggy-card__avatar">
          <img src="${piggy.image_url || '/pig2.jpg'}" alt="${piggy.name}" class="piggy-card__img" onerror="this.onerror=null;this.src='/pig2.jpg';" />
          <span class="piggy-card__stage-badge">${piggy.stage || 'Etapa 1'}</span>
        </div>
        <div class="piggy-card__info">
          <div class="piggy-card__name-row">
            <h4 class="piggy-card__name">${piggy.name}</h4>
            <span class="badge badge--success badge--sm">Activo</span>
          </div>
          <span class="piggy-card__id">#PGY-${(piggy.id || '').substring(0, 6).toUpperCase()}</span>
          <div class="piggy-card__meta">
            <span>Día ${piggy.day_current || 1} de ${piggy.day_total || 90}</span>
            <span>&bull;</span>
            <span>Raza: ${piggy.breed || 'Pietrain'}</span>
          </div>
        </div>
      </div>

      <!-- Growth Progress Bar -->
      <div class="piggy-card__progress-block">
        <div class="piggy-card__progress-labels">
          <span class="text-xs text-muted">Progreso de Engorde</span>
          <span class="text-xs font-bold text-primary">${Math.min(100, Math.round(piggy.growth_percentage || 0))}%</span>
        </div>
        <div class="progress-bar progress-bar--lg">
          <div class="progress-bar__fill progress-bar__fill--gradient" style="width: ${Math.min(100, Math.round(piggy.growth_percentage || 0))}%"></div>
        </div>
      </div>

      <!-- Weight & Financial Grid -->
      <div class="piggy-card__stats-grid">
        <div class="piggy-card__stat">
          <span class="piggy-card__stat-label">Peso Actual</span>
          <div class="piggy-card__stat-val">
            <span class="font-bold">${formatWeight(currentWeight)}</span>
            <span class="text-xs text-success font-medium">+${formatWeight(weightGain)}</span>
          </div>
          <div class="text-xs text-muted">Meta: ${formatWeight(piggy.target_weight_kg)}</div>
        </div>
        <div class="piggy-card__stat-divider"></div>
        <div class="piggy-card__stat">
          <span class="piggy-card__stat-label">Retorno Proyectado</span>
          <div class="font-semibold text-primary" style="font-size:0.9rem;">
            <span style="color:var(--color-text-muted, #64748b); font-weight:600; font-size:0.78rem;">TB:</span> ${formatCOP(projectedReturn)}
          </div>
          ${extraRoi > 0 ? `<div class="text-xs" style="font-size:10px; color:var(--color-warning); margin-top:2px;">Beneficio x Venta: +${(extraRoi * 100).toFixed(0)}%</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" id="granja-bottom-nav" aria-label="Navegación principal" style="grid-template-columns: repeat(4, 1fr);">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}" id="nav-granja">
        <span class="bottom-nav__icon">${renderIcon('farm', '', '24')}</span>
        <span>Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}" id="nav-mercado">
        <span class="bottom-nav__icon">${renderIcon('pigSide', '', '24')}</span>
        <span>Mercado</span>
      </a>
      <a href="#/gourmet" class="bottom-nav__item ${activeTab === 'gourmet' ? 'bottom-nav__item--active' : ''}" id="nav-gourmet">
        <span class="bottom-nav__icon">${renderIcon('shoppingBag', '', '24')}</span>
        <span>Tienda</span>
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
function attachGranjaListeners(hasPiggies, stats, piggyCount, piggies = []) {
  // Piggy card click
  document.querySelectorAll('.piggy-card').forEach((card) => {
    card.addEventListener('click', () => {
      const piggyId = card.dataset.piggyId;
      navigateTo(`piggy/${piggyId}`);
    });
  });

  // Action buttons
  document.getElementById('btn-referidos')?.addEventListener('click', () => {
    showReferralsModal();
  });

  document.getElementById('btn-perfil')?.addEventListener('click', () => {
    navigateTo('perfil');
  });

  document.getElementById('btn-descargar-app')?.addEventListener('click', () => {
    navigateTo('descargar');
  });

  // Shortcut 1: Retirar Saldo -> Opens Withdrawal Drawer
  document.getElementById('btn-retiro-saldo')?.addEventListener('click', () => {
    showRetiroSaldoModal(stats.saldoDisponible || 0);
  });

  // Shortcut 2: Bonos de Consumo -> Opens Full Drawer directly
  document.getElementById('btn-bonos-consumo')?.addEventListener('click', () => {
    openWalletDrawer();
  });

  // Shortcut 3: Tu Cuenta Agro -> Opens Full Drawer
  document.getElementById('btn-wallet-drawer')?.addEventListener('click', () => {
    openWalletDrawer();
  });

  // Check mission triggers if piggies exist
  if (hasPiggies && piggies.length > 0) {
    checkMissionTriggers(piggies);
  }
}

/**
 * Checks and triggers applicable mission modals (Cycle, Flash, Silver).
 */
function checkMissionTriggers(piggies) {
  // 1. Check for Completed Cycle Piggies (Priority 1)
  const completedPig = piggies.find(p => p.day_current >= (p.day_total || 90) || (p.growth_percentage || 0) >= 100);
  if (completedPig) {
    const key = `cycle_mission_seen_${completedPig.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      setTimeout(() => {
        showCycleMissionModal(completedPig);
      }, 800);
      return; // Show one modal per session
    }
  }

  // 2. Check for Flash Mission (Day 30-40) (Priority 2)
  const flashPig = piggies.find(p => p.day_current >= 30 && p.day_current <= 40);
  if (flashPig) {
    const key = `flash_mission_seen_${flashPig.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      setTimeout(() => {
        showFlashMissionModal(flashPig);
      }, 1000);
      return;
    }
  }

  // 3. Check for Silver Piggy Offer (Day 60-70) (Priority 3)
  const silverPig = piggies.find(p => p.day_current >= 60 && p.day_current <= 70);
  if (silverPig) {
    const key = `silver_mission_seen_${silverPig.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      setTimeout(() => {
        showSilverPiggyModal(silverPig);
      }, 1200);
      return;
    }
  }
}

/**
 * Real-time DOM update for piggy progress bars.
 */
function updatePiggyProgress(piggies) {
  piggies.forEach((piggy) => {
    const card = document.querySelector(`.piggy-card[data-piggy-id="${piggy.id}"]`);
    if (card) {
      const progressFill = card.querySelector('.progress-bar__fill');
      const progressLabel = card.querySelector('.piggy-card__progress-labels .text-primary');
      if (progressFill) progressFill.style.width = `${Math.min(100, Math.round(piggy.growth_percentage || 0))}%`;
      if (progressLabel) progressLabel.textContent = `${Math.min(100, Math.round(piggy.growth_percentage || 0))}%`;
    }
  });
}
