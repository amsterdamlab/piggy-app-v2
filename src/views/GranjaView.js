/* ==========================================================================
   PIGGY APP — Granja View (Dashboard Principal)
   Clean implementation matching mobile mockups.
   Refactored to import modular components from /granja folder.
   ========================================================================== */

import { renderIcon } from '../components/Icons.js';
import { getUserPiggies, getDashboardStats } from '../services/piggiesService.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions } from '../services/walletService.js';
import { getRandomTip, getActiveNewsSlides } from '../services/tipsService.js';
import {
    getActiveMissions,
    getActiveUserFlashMissions,
    getActiveCycleMissions,
    detectAndCreateCycleMissions
} from '../services/missionsService.js';
import { AppState } from '../state.js';
import { getUserInitials } from '../utils/formatters.js';

// Modular component imports (clean SoC)
import { renderWalletBanner, openWalletDrawer } from './granja/WalletBlock.js';
import { renderPriorityMissionBanner } from '../components/MissionBanner.js';
import { showNewsBillboardModal } from './granja/NewsBillboardModal.js';
import { startOnboardingTourIfEligible } from './granja/OnboardingTourModal.js';
import { renderWalletSkeleton, renderPiggyLoader } from './granja/GranjaSkeletons.js';
import { removeBonusModal } from './granja/BonusModal.js';

/**
 * Utility: format COP currency safely.
 */
function formatCOP(amount) {
  const num = Number(amount);
  if (amount === undefined || amount === null || isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Render dynamic rotative tips/notifications banner.
 */
function renderRandomNotification(notif) {
  if (!notif) return '';

  const isEduPorkTip = notif.reward && notif.reward.includes('EduPork');
  const tipTitleColor = isEduPorkTip ? '#be123c' : '#059669';
  const ctaAttr = isEduPorkTip
      ? `onclick="location.hash='#/perfil'; setTimeout(() => { const el = document.getElementById('item-edupork'); if(el) el.scrollIntoView({behavior:'smooth'}); }, 300);"`
      : '';

  return `
    <div class="animate-fade-in-up" style="margin-bottom: 20px; animation-delay: 0.05s;">
      <div style="
        background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
        border: 1px solid #fecdd3;
        border-left: 4px solid ${tipTitleColor};
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 14px rgba(225,29,72,0.06);
        cursor: ${isEduPorkTip ? 'pointer' : 'default'};
        transition: transform 0.2s, box-shadow 0.2s;
      " ${ctaAttr}
         onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(190,18,60,0.1)'"
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
        <div style="font-size:24px; flex-shrink:0;">${notif.icon}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; color:${tipTitleColor}; font-size:0.82rem; line-height:1.3;">${notif.title}</div>
          <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">&#10024; ${notif.reward}</div>
        </div>
        <div style="font-size:14px; color:${tipTitleColor}; opacity:0.6; flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the Granja (Dashboard) view.
 */
export function renderGranjaView() {
  const app = document.getElementById('app');
  const profile = AppState.get('profile');
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

  app.innerHTML = buildGranjaShell(firstName);

  loadGranjaData(firstName);

  return () => {
    // cleanup
    removeBonusModal();
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
        <h2 class="granja-title">Mi Granja</h2>

        ${renderWalletSkeleton(firstName)}

        <!-- Piggies section skeleton -->
        <div class="section" id="piggies-section">
          ${renderPiggyLoader('Cargando tu granja...')}
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
    AppState.set({ piggies });

    await detectAndCreateCycleMissions(piggies);

    const [
        tipData, walletBalance, referralBonus,
        activeMissions, flashMissions, cycleMissions, stats,
        transactions, newsSlides,
    ] = await Promise.all([
      getRandomTip(),
      getWalletBalance(),
      getReferralBonusBalance(),
      getActiveMissions(piggies),
      getActiveUserFlashMissions(),
      getActiveCycleMissions(),
      getDashboardStats(piggies),
      getWalletTransactions(),
      getActiveNewsSlides(),
    ]);

    window._activeFlashMissions = flashMissions;
    window._activeCycleMissions = cycleMissions;

    stats.walletBalance          = walletBalance;
    stats.referralBonus          = referralBonus;
    stats.referralBonusFormatted = formatCOP(referralBonus);
    stats.saldoDisponible        = walletBalance;
    stats.saldoDisponibleFormatted = formatCOP(walletBalance);
    stats.transactions           = transactions;

    const app = document.getElementById('app');
    app.innerHTML = buildGranjaFull(firstName, piggies, stats, tipData, activeMissions, flashMissions, cycleMissions);

    showNewsBillboardModal(newsSlides);

    attachGranjaListeners(piggies.length > 0, stats, piggies.length, piggies);

    startOnboardingTourIfEligible();
  } catch (error) {
    console.error('Error loading granja data:', error);
    const section = document.getElementById('piggies-section');
    if (section) {
      section.innerHTML = `
        <div class="auth-form__error auth-form__error--visible">
          Error al cargar datos: ${error.message}<br/>
          <pre style="font-size:10px; text-align:left; color:#ff0000; overflow-x:auto;">${error.stack}</pre>
        </div>
      `;
    }
  }
}

/**
 * Build the full dashboard with data.
 */
function buildGranjaFull(firstName, piggies, stats, tipData, activeMissions, flashMissions, cycleMissions) {
  const activePiggies    = piggies.filter(p => !p.isComplete);
  const completedPiggies = piggies.filter(p => p.isComplete);
  const piggyCount       = piggies.length;
  const missionBanner = renderPriorityMissionBanner(
      flashMissions  || [],
      cycleMissions  || [],
      activeMissions || [],
      piggyCount
  );
  const notification = renderRandomNotification(tipData);

  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Mi Granja</h2>

        <!-- Dynamic Notification (rotates on refresh) -->
        ${notification}

        ${renderWalletBanner(firstName, stats)}

        <!-- ROI Info -->
        ${stats.activeCount > 0 ? `
          <div class="animate-fade-in-up" style="animation-delay: 0.18s; margin-top: 16px; margin-bottom: 28px;">
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
        <div class="section animate-fade-in-up" id="mis-piggies-section" style="animation-delay: 0.2s;">
          <div class="section__header" id="mis-piggies-header">
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
}

function renderGreeting(firstName) {
  const profile = AppState.get('profile') || {};
  const initials = getUserInitials(profile.full_name || firstName);
  const initialsFontSize = initials.length > 1 ? '1rem' : '1.15rem';

  const giftIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
    <rect x="3" y="8" width="18" height="4" rx="1"/>
    <path d="M12 8v13"/>
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
    <path d="M7.5 8C6.12 8 5 6.88 5 5.5C5 4.12 6.12 3 7.5 3C10 3 12 8 12 8C12 8 14 3 16.5 3C17.88 3 19 4.12 19 5.5C19 6.88 17.88 8 16.5 8"/>
  </svg>`;

  const headsetIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"/>
  </svg>`;

  const logoutIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`;

  return `
    <div class="granja-greeting animate-fade-in" id="granja-header" style="display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" id="btn-greeting-profile" title="Ver Mi Perfil">
        <div class="granja-greeting__avatar" style="aspect-ratio:1/1; border-radius:50%; display:flex; align-items:center; justify-content:center;">
          <span class="granja-greeting__initial" style="font-size:${initialsFontSize}; font-weight:800; line-height:1; letter-spacing:-0.5px;">${initials}</span>
          <span class="granja-greeting__online"></span>
        </div>
        <div class="granja-greeting__text">
          <span class="granja-greeting__welcome">¡Bienvenido!</span>
          <span class="granja-greeting__name">${firstName}</span>
        </div>
      </div>

      <div class="greeting-actions">
        <button class="greeting-action-btn" id="btn-greeting-referrals" aria-label="Programa de Referidos" title="Referidos">
          ${giftIconSVG}
        </button>
        <button class="greeting-action-btn" id="btn-greeting-support" aria-label="Atención al Cliente" title="Soporte">
          ${headsetIconSVG}
        </button>
        <button class="greeting-action-btn" id="btn-greeting-logout" aria-label="Cerrar sesión" title="Salir">
          ${logoutIconSVG}
        </button>
      </div>
    </div>
  `;
}

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

export function renderPiggiesList(piggies, baseROI) {
  return `
    <div class="piggies-list">
      ${piggies.map((piggy) => renderPiggyCard(piggy, baseROI)).join('')}
    </div>
  `;
}

export function renderPiggyCard(piggy, baseROI) {
  const inv = parseFloat(piggy.investment_amount) || 1000000;
  const extraRoi = parseFloat(piggy.extra_roi_bonus) || 0;
  const totalROI = baseROI + extraRoi;
  const projectedReturn = inv * (1 + totalROI);

  return `
    <div class="piggy-card card card--interactive" data-piggy-id="${piggy.id}">
      <div class="piggy-card__header">
        <div class="piggy-card__avatar">
          <img src="${piggy.imageUrl}" alt="${piggy.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.onerror=null;this.src='pig2.jpg'" />
        </div>
        <div class="piggy-card__info">
          <div class="piggy-card__name">${piggy.name}</div>
          <div class="piggy-card__status">
            ${piggy.isComplete
              ? '<span class="badge badge--success">✓ Completado</span>'
              : `<span class="badge badge--primary">${piggy.daysLeft} días restantes</span>`
            }
          </div>
        </div>
        ${extraRoi > 0 ? `
          <span class="badge badge--warning">+${(extraRoi * 100).toFixed(0)}%</span>
        ` : ''}
      </div>

      <div class="piggy-card__progress">
        <div class="piggy-card__progress-header">
          <span class="text-sm text-muted">Progreso del ciclo</span>
          <span class="text-sm font-semibold">${piggy.progress}%</span>
        </div>
        <div class="progress">
          <div class="progress__bar" style="width: ${piggy.progress}%; ${piggy.isComplete ? 'background: linear-gradient(135deg, #10B981, #059669);' : ''}"></div>
        </div>
      </div>

      <div class="piggy-card__stats grid-2">
        <div>
          <div class="text-xs text-muted">Peso actual</div>
          <div class="font-semibold">${piggy.currentWeight} kg</div>
        </div>
        <div>
          <div class="font-semibold text-primary" style="font-size:0.9rem;">
            <span style="color:var(--color-text-muted, #64748b); font-weight:600; font-size:0.78rem;">CC:</span> ${formatCOP(projectedReturn)}
          </div>
          ${extraRoi > 0 ? `<div class="text-xs" style="font-size:10px; color:var(--color-warning); margin-top:2px;">Incluye comisión +${(extraRoi * 100).toFixed(0)}%</div>` : ''}
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
        <span class="bottom-nav__icon">${renderIcon('market', '', '24')}</span>
        <span>Mercado</span>
      </a>
      <a href="#/tienda" class="bottom-nav__item ${activeTab === 'tienda' ? 'bottom-nav__item--active' : ''}" id="nav-tienda">
        <span class="bottom-nav__icon">${renderIcon('meat', '', '24')}</span>
        <span>Tienda</span>
      </a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}" id="nav-aliados">
        <span class="bottom-nav__icon">${renderIcon('handshake', '', '24')}</span>
        <span>Aliados</span>
      </a>
    </nav>
  `;
}

function attachGranjaListeners(hasPiggies, stats, piggyCount, piggies) {
  document.getElementById('btn-greeting-profile')?.addEventListener('click', () => {
    location.hash = '#/perfil';
  });

  document.getElementById('btn-greeting-referrals')?.addEventListener('click', () => {
    location.hash = '#/perfil';
    setTimeout(() => {
      window._openReferralModalFromProfile?.();
    }, 200);
  });

  document.getElementById('btn-greeting-support')?.addEventListener('click', () => {
    location.hash = '#/perfil';
    setTimeout(() => {
      window._openSupportModalFromProfile?.();
    }, 200);
  });

  document.getElementById('btn-greeting-logout')?.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      AppState.clear();
      location.hash = '#/';
      location.reload();
    }
  });

  document.getElementById('btn-quick-buy')?.addEventListener('click', () => {
    location.hash = '#/mercado';
  });

  document.getElementById('btn-ver-completados')?.addEventListener('click', () => {
    openWalletDrawer(stats);
  });

  const cards = document.querySelectorAll('.piggy-card');
  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('#btn-adopt-empty')) return;
      const piggyId = card.getAttribute('data-piggy-id');
      if (piggyId) {
        location.hash = `#/piggy/${piggyId}`;
      }
    });
  });
}
