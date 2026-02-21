/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Modularized version
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats, formatCOP, formatPercentage, calculateTotalReturn } from '../services/piggiesService.js';
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
    <div id="dynamic-notification" class="animate-fade-in-up" data-cta="${notif.cta}" style="
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: 14px;
      background-color: ${notif.bgColor};
      border: 1px solid ${notif.borderColor || 'rgba(0,0,0,0.05)'};
      color: ${notif.color};
      cursor: pointer; margin-bottom: 16px;
      transition: transform 0.2s;
    ">
      <div style="
        width: 40px; height: 40px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
        background: ${notif.color}15;
      ">${notif.icon}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.82rem; font-weight:600; color:#1f2937;">${notif.title}</div>
        <div style="font-size:0.75rem; font-weight:700; color:${notif.color}; margin-top:2px;">${notif.reward}</div>
      </div>
      <div style="color:#9ca3af; flex-shrink:0;">${renderIcon('arrowRight', '', '14')}</div>
    </div>
  `;
}

/* =========================================
   MISSION BANNERS
   ========================================= */
function renderMissionBanner(piggyCount) {
  if (piggyCount === 0) {
    return `
      <div class="mission-banner animate-fade-in-up" id="mission-banner" data-mission="m1" style="
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        padding: 24px;
        border-radius: 20px;
        color: white;
        margin: 20px 0;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      ">
        <div style="position: absolute; right: -20px; top: -20px; opacity: 0.1; transform: rotate(15deg);">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style="position: relative; z-index: 1; flex: 1;">
          <div style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ec4899; margin-bottom: 8px;">Misión 01</div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">¡Gana tus primeros $50.000!</h3>
          <p style="font-size: 0.8rem; opacity: 0.8; margin: 0;">Adopta tu primer piggy y reclama tu bono.</p>
        </div>
        <button class="btn" style="background: white; color: #0f172a; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; border: none; flex-shrink: 0; margin-left: 16px;">Ver Bono</button>
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

    // Sync state
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
    <div class="empty-state animate-fade-in" style="
        padding: 40px 20px;
        text-align: center;
        background: white;
        border-radius: 20px;
        border: 2px dashed #e5e7eb;
        margin: 20px 0;
    ">
      <div style="width: 80px; height: 80px; margin: 0 auto 20px; opacity: 0.6;">
        <img src="pig1.png" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(1);" />
      </div>
      <div style="font-weight: 700; color: #374151; margin-bottom: 8px; font-size: 1.1rem;">Tu granja está vacía</div>
      <p style="font-size: 0.9rem; color: #6b7280; margin-bottom: 24px;">Adopta tu primer piggy para empezar a ganar beneficios reales.</p>
      <button class="btn btn--primary" style="background:#ec4899; border:none; padding:12px 24px; border-radius:12px; font-weight:700;" onclick="location.hash='#/mercado'">Adoptar mi primer Piggy</button>
    </div>
  `;
}

function renderPiggiesList(piggies, baseROI) {
  return `<div class="piggies-list">${piggies.map(p => renderPiggyCard(p, baseROI)).join('')}</div>`;
}

function renderPiggyCard(piggy, baseROI) {
  const totalROI = baseROI + (piggy.extra_roi_bonus || 0);
  const projectedReturn = calculateTotalReturn(piggy.investment_amount, baseROI, piggy.extra_roi_bonus || 0);
  const gain = projectedReturn - piggy.investment_amount;
  return `
    <div class="piggy-card card card--interactive" data-piggy-id="${piggy.id}">
      <div class="piggy-card__header">
        <div class="piggy-card__avatar" style="width:52px; height:52px; border-radius:50%; overflow:hidden; border: 3px solid #ec4899; flex-shrink:0; background:#FCE4EC;">
          <img src="pig1.png" style="width:130%; height:130%; object-fit:cover; margin-top:-8%; margin-left:-15%;" />
        </div>
        <div class="piggy-card__info" style="flex:1;">
          <div class="piggy-card__name" style="font-weight:700; font-size:1rem; margin-bottom:2px;">${piggy.name}</div>
          <div class="piggy-card__status" style="display:flex; align-items:center; gap:6px;">
            <span class="badge ${piggy.isComplete ? 'badge--success' : 'badge--primary'}">
              ${piggy.isComplete ? '✅ Listo para cosecha' : piggy.daysLeft + ' días'}
            </span>
            ${piggy.currentWeight ? `<span style="font-size:0.7rem; color:#6b7280;">🐷 ${piggy.currentWeight}kg</span>` : ''}
          </div>
        </div>
      </div>

      <div class="piggy-card__progress">
        <div class="piggy-card__progress-header" style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="font-size:0.7rem; color:#6b7280;">Progreso del ciclo</span>
          <span style="font-size:0.7rem; font-weight:700; color:#ec4899;">${piggy.progress}%</span>
        </div>
        <div class="progress"><div class="progress__bar" style="width: ${piggy.progress}%;"></div></div>
      </div>

      <div class="piggy-card__stats" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; padding-top:10px; border-top:1px solid #f3f4f6; margin-top:10px;">
        <div>
          <div style="font-size:0.65rem; color:#9ca3af; text-transform:uppercase;">Inversión</div>
          <div style="font-size:0.85rem; font-weight:700; color:#374151;">${formatCOP(piggy.investment_amount)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.65rem; color:#9ca3af; text-transform:uppercase;">Retorno Proyectado</div>
          <div style="font-size:0.85rem; font-weight:700; color:#059669;">${formatCOP(projectedReturn)}</div>
        </div>
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
