/* ============================================
   PIGGY APP — Mi Granja (My Farm) View
   ============================================ */

import { renderIcon } from '../icons.js';
import { getProfile, isUsingMockData } from '../services/supabase.js';
import { MOCK_PROFILE, getMockPiggies, getMockStats } from '../services/mockData.js';
import { getActivePiggies, getCompletedPiggies, getGranjaStats } from '../services/piggiesService.js';
import { renderRandomNotification } from '../services/tipsService.js';
import { getActiveMissions } from '../services/missionsService.js';
import { AppState } from '../state.js';
import { navigateTo } from '../router.js';

// Subcomponents / Modals
import { attachWalletListeners, renderWalletBanner } from './granja/WalletBlock.js';
import { loadGreetingReferralCode } from './granja/ReferralsModal.js';
import { renderEmptyMissionsBlock, renderMissionsList } from './granja/MissionsBlock.js';
import { openCompletedPiggiesModal } from './granja/CompletedPiggiesModal.js';

let activeCategory = null;

/**
 * Render the main Granja (My Farm) dashboard view.
 */
export async function renderGranjaView() {
  const app = document.getElementById('app');

  // 1. Initial Loading State
  app.innerHTML = `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        <div class="loading-container" style="min-height: 50vh;">
          <div class="spinner"></div>
          <span>Cargando tu granja...</span>
        </div>
      </div>
      ${renderBottomNav('granja')}
    </div>
  `;

  // 2. Fetch User & Data
  let firstName = 'Granjero';
  let stats = {
    walletBalance: 0,
    referralBalance: 30000,
    activeCount: 0,
    activePiggiesCapital: 0,
    projectedReturn: 0,
    baseROI: 0.1,
  };
  let activePiggies = [];
  let completedPiggies = [];
  let tipData = '¡Alimenta tus cerditos a diario para maximizar su crecimiento!';

  try {
    const isMock = isUsingMockData();

    let profile = null;
    let userId = null;

    if (isMock) {
      profile = AppState.get('profile') || MOCK_PROFILE;
      userId = profile.id;
    } else {
      profile = await getProfile();
      userId = profile?.id;
    }

    if (profile) {
      firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'Granjero';
    }

    if (isMock) {
      stats = getMockStats();
      const allMockPiggies = getMockPiggies();
      activePiggies = allMockPiggies.filter((p) => p.status === 'active');
      completedPiggies = allMockPiggies.filter((p) => p.status === 'completed');
    } else if (userId) {
      const [fetchedStats, fetchedActive, fetchedCompleted] = await Promise.all([
        getGranjaStats(userId),
        getActivePiggies(userId),
        getCompletedPiggies(userId),
      ]);

      stats = fetchedStats;
      activePiggies = fetchedActive || [];
      completedPiggies = fetchedCompleted || [];
    }
  } catch (err) {
    console.error('Error fetching farm dashboard data:', err);
  }

  // 3. Render Dashboard content
  const activeMissions = AppState.get('missions') || [];
  const piggyCount = activePiggies.length;

  let missionBanner = renderEmptyMissionsBlock();
  if (activeMissions && activeMissions.length > 0) {
    missionBanner = renderMissionsList(
      activeMissions || [],
      piggyCount
    );
  }
  const notification = renderRandomNotification(tipData);

  app.innerHTML = `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Mi Granja</h2>

        <!-- Dynamic Notification (rotates on refresh) -->
        ${notification}

        ${renderWalletBanner(firstName, stats)}



        <!-- ROI Info -->
        ${stats.activeCount > 0 ? `
          <div class="animate-fade-in-up" style="animation-delay: 0.18s; margin-top: 16px; margin-bottom: 12px;">
            <button id="btn-quick-buy" style="
                background: #ec4899; 
                color: white; 
                border: none; 
                width: 100%; 
                padding: 14px 20px; 
                border-radius: 12px; 
                font-weight: 700; 
                font-size: 1rem; 
                cursor: pointer; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                gap: 10px;
                box-shadow: 0 8px 20px -5px rgba(236, 72, 153, 0.5);
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="
                    background: white; 
                    color: #ec4899;
                    width: 22px; 
                    height: 22px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-size: 18px;
                    font-weight: 800;
                    padding-bottom: 2px;
                ">+</div>
                Compra un Nuevo Piggy
            </button>
          </div>
        ` : ''}

        <!-- Mis Cerdos -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.2s;">
          <div class="section__header">
            <h3 class="section__title">Mis Piggys</h3>
            <button id="btn-ver-completados" class="section__link" style="background:none; border:none; cursor:pointer; font-size:0.85rem; font-weight:700; color:#ec4899; display:flex; align-items:center; gap:4px; padding:0; font-family:inherit;">
              Completados ${completedPiggies.length > 0 ? `(${completedPiggies.length})` : ''} ${renderIcon('arrowRight', '', '14')}
            </button>
          </div>

          ${activePiggies.length === 0 ? renderEmptyPiggies() : renderPiggiesList(activePiggies, stats.baseROI)}
        </div>

        <!-- Dynamic Mission Banner -->
        <div id="mission-banner-container">
          ${missionBanner}
        </div>

      </div>

      ${renderBottomNav('granja')}
    </div>
  `;

  // 4. Attach Event Listeners
  attachDashboardListeners(stats, completedPiggies);

  return () => {
    // Cleanup if necessary
  };
}

// ... renderGreeting remains the same ...

function renderGreeting(firstName) {
  const initial = firstName.charAt(0).toUpperCase();
  return `
    <div class="granja-greeting animate-fade-in" style="display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="granja-greeting__avatar">
          <span class="granja-greeting__initial">${initial}</span>
          <span class="granja-greeting__online"></span>
        </div>
        <div class="granja-greeting__text">
          <span class="granja-greeting__welcome">¡Bienvenido!</span>
          <span class="granja-greeting__name">Hola, ${firstName}</span>
        </div>
      </div>
      <div id="greeting-referral-code" style="
        display: flex;
        align-items: center;
        background: linear-gradient(135deg, #7c3aed, #5b21b6);
        color: white;
        padding: 6px 14px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(124,58,237,0.3);
        transition: transform 0.2s, box-shadow 0.2s;
        white-space: nowrap;
        letter-spacing: 1.5px;
      " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(124,58,237,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(124,58,237,0.3)'">
        <span id="greeting-code-value">···</span>
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
        <img src="pig2.jpg" alt="Piggy" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='pig2.jpg'" />
      </div>
      <div class="empty-state__title">No tienes Piggys aún</div>
      <div class="empty-state__description">
        Comienza tu granja comprando tu primer piggy y empieza a generar beneficios.
      </div>
      <button class="btn btn--primary" id="btn-adopt-empty" onclick="location.hash='#/mercado'">
        Compra un nuevo Piggy
      </button>
    </div>
  `;
}

// ... renderPiggiesList and renderPiggyCard remain the same ...

export function renderPiggiesList(piggies, baseROI) {
  return `
    <div class="piggies-list">
      ${piggies.map((piggy) => renderPiggyCard(piggy, baseROI)).join('')}
    </div>
  `;
}

export function renderPiggyCard(piggy, baseROI) {
  const totalROI = baseROI + (piggy.extra_roi_bonus || 0);
  const projectedReturn = piggy.investment_amount * (1 + totalROI);

  return `
    <div class="piggy-card animate-fade-in-up" onclick="location.hash='#/piggy/${piggy.id}'" style="cursor: pointer;">
      <div class="piggy-card__badge piggy-card__badge--active">Activo</div>
      
      <div class="piggy-card__header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size: 20px;">🐷</span>
          <div>
            <h4 class="piggy-card__title" style="margin: 0; font-size: 15px; font-weight: 700; color: #1a1a2e;">
              ${piggy.title || 'Mi Piggy'}
            </h4>
            <span class="piggy-card__meta" style="font-size: 11px; color: #6b6b80;">
              Comprado: ${new Date(piggy.purchase_date).toLocaleDateString('es-CO')}
            </span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 700; color: #ec4899;">
            +${Math.round(totalROI * 100)}%
          </div>
          <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b6b80; font-weight: 600;">
            ROI Total
          </span>
        </div>
      </div>

      <div class="piggy-card__progress-container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px; font-size: 11px; font-weight: 600; color: #1a1a2e;">
          <span>Crecimiento</span>
          <span>${piggy.progress_percentage || 0}%</span>
        </div>
        <div class="piggy-card__progress-bar">
          <div class="piggy-card__progress-fill" style="width: ${piggy.progress_percentage || 0}%;"></div>
        </div>
      </div>

      <div class="piggy-card__stats-grid">
        <div class="piggy-card__stat-item">
          <span class="piggy-card__stat-label">Inversión</span>
          <span class="piggy-card__stat-value">${formatCOP(piggy.investment_amount)}</span>
        </div>
        <div class="piggy-card__stat-item">
          <span class="piggy-card__stat-label">Retorno Est.</span>
          <span class="piggy-card__stat-value" style="color: #10b981; font-weight: 700;">
            ${formatCOP(projectedReturn)}
          </span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Format COP Currency.
 */
function formatCOP(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return '$' + Math.round(amount).toLocaleString('es-CO');
}

/**
 * Attach event listeners to the dashboard.
 */
function attachDashboardListeners(stats, completedPiggies) {
  // Navigation to completed piggies list
  const verCompletadosBtn = document.getElementById('btn-ver-completados');
  if (verCompletadosBtn) {
    verCompletadosBtn.addEventListener('click', () => {
      openCompletedPiggiesModal(completedPiggies);
    });
  }

  // Quick Buy Action -> Redirect to Mercado
  const quickBuyBtn = document.getElementById('btn-quick-buy');
  if (quickBuyBtn) {
    quickBuyBtn.addEventListener('click', () => {
      navigateTo('mercado');
    });
  }

  // Wallet listeners (delegated to module)
  attachWalletListeners(stats);

  // Referral code + modal (delegated to module)
  loadGreetingReferralCode();

  // Greeting referral code click → open referral modal
  const greetingReferral = document.getElementById('greeting-referral-code');
  if (greetingReferral) {
    greetingReferral.addEventListener('click', () => {
      // Trigger the click of the actual nav item or open directly
      const refTab = document.querySelector('[data-tab="referral"]');
      if (refTab) refTab.click();
    });
  }
}

/**
 * Helper: Bottom Navigation
 */
export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav">
      <button class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}" data-tab="granja" onclick="location.hash='#/granja'">
        <span class="bottom-nav__icon">🐷</span>
        <span class="bottom-nav__label">Mi Granja</span>
      </button>
      <button class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}" data-tab="mercado" onclick="location.hash='#/mercado'">
        <span class="bottom-nav__icon">🛒</span>
        <span class="bottom-nav__label">Mercado</span>
      </button>
      <button class="bottom-nav__item ${activeTab === 'gourmet' ? 'bottom-nav__item--active' : ''}" data-tab="gourmet" onclick="location.hash='#/gourmet'">
        <span class="bottom-nav__icon">🥩</span>
        <span class="bottom-nav__label">Tienda</span>
      </button>
      <button class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}" data-tab="aliados" onclick="location.hash='#/aliados'">
        <span class="bottom-nav__icon">🤝</span>
        <span class="bottom-nav__label">Aliados</span>
      </button>
    </nav>
  `;
}
