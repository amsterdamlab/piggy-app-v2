/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Modularized version
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats } from '../services/piggiesService.js';
import { navigateTo } from '../router.js';

// Components
import { renderWalletCard } from '../components/WalletCard.js';
import { renderReferralBadge, loadGreetingReferralCode, showReferralModal } from '../components/ReferralModal.js';
import { showWithdrawModal, showMeatModal, showBonusModal } from '../components/WalletModals.js';

/* =========================================
   DYNAMIC NOTIFICATIONS
   ========================================= */
const NOTIFICATIONS = [
  { icon: '🏪', title: 'Compra en locales aliados', reward: 'Piggy Silver (24h)', color: '#8b5cf6', bgColor: '#f5f3ff', cta: '#/aliados' },
  { icon: '🏁', title: 'Completa tu perfil 100%', reward: 'Bono extra +0.5% ROI', color: '#ec4899', bgColor: '#fdf2f8', cta: '#/perfil' },
  { icon: '💰', title: 'Refiere a un amigo', reward: 'Obtén $30.000', color: '#059669', bgColor: '#ecfdf5', cta: '#referral-modal' },
];

function getRandomNotification() {
  return NOTIFICATIONS[Math.floor(Math.random() * NOTIFICATIONS.length)];
}

function renderRandomNotification() {
  const notif = getRandomNotification();
  return `
    <div id="dynamic-notification" class="notif-bar animate-fade-in-up" data-cta="${notif.cta}" style="background-color: ${notif.bgColor}; border: 1px solid rgba(0,0,0,0.05); cursor:pointer;">
      <div class="notif-bar__icon" style="background:${notif.color}">${notif.icon}</div>
      <div class="notif-bar__content">
        <div class="notif-bar__title">${notif.title}</div>
        <div class="notif-bar__reward" style="color:${notif.color}">${notif.reward}</div>
      </div>
      <div class="notif-bar__arrow">${renderIcon('arrowRight', '', '12')}</div>
    </div>
  `;
}

/* =========================================
   MISSION BANNERS
   ========================================= */
function renderMissionBanner(piggyCount) {
  if (piggyCount === 0) {
    return `
      <div class="mission-banner mission-banner--m1 animate-fade-in-up" id="mission-banner" data-mission="m1" style="background: linear-gradient(135deg, #1e293b, #0f172a);">
        <div class="mission-banner__content">
          <div class="mission-banner__badge">MISIÓN 01</div>
          <h3 class="mission-banner__title">¡Gana tus primeros $50.000!</h3>
          <p class="mission-banner__text">Tu granja está vacía. Adopta tu primer piggy y reclama tu bono de consumo.</p>
        </div>
        <button class="mission-banner__btn">Ver Bono</button>
      </div>
    `;
  }
  return '';
}

/* =========================================
   MAIN VIEW RENDERING
   ========================================= */
export function renderGranjaView() {
  const state = AppState.getState();
  const user = state.currentUser;
  if (!user) return navigateTo('auth');

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'Granjero';
  const app = document.getElementById('app');

  // Shell
  app.innerHTML = `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        <div class="loading-container" style="padding:100px 0;">
          <div class="spinner"></div>
          <p class="mt-md text-muted">Cargando tu granja...</p>
        </div>
      </div>
      ${renderBottomNav('granja')}
    </div>
  `;

  loadGranjaData(firstName);
}

async function loadGranjaData(firstName) {
  try {
    const piggies = await getUserPiggies();
    const stats = await getDashboardStats(piggies);
    const app = document.getElementById('app');

    AppState.set({ piggies });

    const piggyCount = piggies.length;
    const missionBanner = renderMissionBanner(piggyCount);
    const notification = renderRandomNotification();

    app.innerHTML = `
      <div class="page page--with-nav granja-page">
        <div class="page__content">
          ${renderGreeting(firstName)}
          <h2 class="granja-title">Mi Granja</h2>
          ${notification}
          ${renderWalletCard(firstName, stats)}
          
          <div class="section">
            <div class="section__header">
              <h3 class="section__title">Mis Piggys</h3>
              <a href="#/mercado" class="section__link">Ver ofertas ${renderIcon('arrowRight', '', '14')}</a>
            </div>
            ${piggies.length === 0 ? renderEmptyPiggies() : renderPiggiesList(piggies, stats.baseROI)}
          </div>

          ${missionBanner}
          
          ${stats.activeCount > 0 ? `
            <button id="btn-quick-buy" class="btn btn--primary btn--block mt-lg" style="background:#ec4899; padding:16px;">
              + Compra un Nuevo Piggy
            </button>
          ` : ''}
        </div>
        ${renderBottomNav('granja')}
      </div>
    `;

    attachGranjaListeners(piggies.length > 0, stats, piggies.length);
  } catch (err) {
    console.error(err);
  }
}

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
      ${renderReferralBadge()}
    </div>
  `;
}

function renderEmptyPiggies() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon"><img src="pig1.png" style="width:100%;" /></div>
      <div class="empty-state__title">Tu granja está vacía</div>
      <button class="btn btn--primary" onclick="location.hash='#/adopcion'">Compra tu primer Piggy</button>
    </div>
  `;
}

function renderPiggiesList(piggies, baseROI) {
  return `<div class="piggies-list">${piggies.map(p => renderPiggyCard(p, baseROI)).join('')}</div>`;
}

function renderPiggyCard(piggy, baseROI) {
  const totalROI = baseROI + (piggy.extra_roi_bonus || 0);
  const projectedReturn = piggy.investment_amount * (1 + totalROI);
  return `
    <div class="piggy-card card card--interactive" data-piggy-id="${piggy.id}">
      <div class="piggy-card__header">
        <div class="piggy-card__avatar"><img src="pig1.png" style="width:100%; border-radius:50%;" /></div>
        <div class="piggy-card__info">
          <div class="piggy-card__name">${piggy.name}</div>
          <div class="piggy-card__status">
            <span class="badge ${piggy.isComplete ? 'badge--success' : 'badge--primary'}">
              ${piggy.isComplete ? 'Listo' : piggy.daysLeft + ' días'}
            </span>
          </div>
        </div>
      </div>
      <div class="piggy-card__progress">
        <div class="progress"><div class="progress__bar" style="width: ${piggy.progress}%;"></div></div>
      </div>
    </div>
  `;
}

function attachGranjaListeners(hasPiggies, stats, piggyCount) {
  // Navigation
  document.querySelectorAll('.piggy-card').forEach(c => c.addEventListener('click', () => navigateTo(`piggy/${c.dataset.piggyId}`)));

  // Modals
  document.getElementById('greeting-referral-code')?.addEventListener('click', showReferralModal);
  document.getElementById('btn-withdraw')?.addEventListener('click', () => showWithdrawModal(stats.disponible));
  document.getElementById('btn-meat')?.addEventListener('click', showMeatModal);
  document.getElementById('mission-banner')?.addEventListener('click', () => showBonusModal(hasPiggies));

  // Notification CTA
  const notifEl = document.getElementById('dynamic-notification');
  notifEl?.addEventListener('click', () => {
    const cta = notifEl.dataset.cta;
    if (cta === '#referral-modal') showReferralModal();
    else if (cta.startsWith('#/')) navigateTo(cta.replace('#/', ''));
  });

  // Quick Buy — navigate to marketplace instead of importing (avoids circular dep)
  document.getElementById('btn-quick-buy')?.addEventListener('click', () => {
    navigateTo('mercado');
  });

  loadGreetingReferralCode();
}

export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}">${renderIcon('farm', '', '24')}<span>Granja</span></a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}">${renderIcon('shop', '', '24')}<span>Mercado</span></a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}">${renderIcon('people', '', '24')}<span>Aliados</span></a>
    </nav>
  `;
}
