/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Matches screen2.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { getProfile, signOut, getUserInitials } from '../services/authService.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats } from '../services/piggiesService.js';
import { formatCOP } from '../services/mockData.js';
import { navigateTo } from '../router.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions } from '../services/walletService.js';
import { getRandomTip } from '../services/tipsService.js';
import { getActiveMissions } from '../services/missionsService.js';
import {
    getActiveUserFlashMissions,
    getActiveCycleMissions,
    detectAndCreateCycleMissions,
} from '../services/flashMissionsService.js';

import { startOnboardingTourIfEligible } from './granja/OnboardingTourModal.js';

/* ── Module imports (Granja Section blocks) ───────── */
import { renderWalletBanner, renderWalletSkeleton, attachWalletListeners } from './granja/WalletBlock.js';
import { renderPriorityMissionBanner, attachMissionListeners } from './granja/MissionsBlock.js';
import { showReferralModal, loadGreetingReferralCode } from './granja/ReferralsModal.js';
import { showSupportModal, HEADSET_ICON_SVG } from './granja/SupportModal.js';
import { removeBonusModal } from './granja/WelcomeBonusModal.js';
import { showCompletedPiggiesModal } from './granja/CompletedPiggiesModal.js';

/* ── News Billboard Imports ── */
import { getActiveNewsSlides } from '../services/newsService.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';
import { showNewsBillboardModal } from '../components/NewsBillboardModal.js';

/* =========================================
   DYNAMIC NOTIFICATIONS
   Fetched from Supabase dynamic_tips table.
   Managed manually by admin — no hardcoding.
   ========================================= */

/**
 * Render the notification strip.
 * @param {Object} notif - Tip data from tipsService (already resolved)
 */
function renderRandomNotification(notif) {
  // Guard: if no tip data provided, render nothing
  if (!notif) return '';

  const ctaAttr = notif.ctaUrl ? `data-cta="${notif.ctaUrl}"` : '';
  const cursor  = notif.ctaUrl ? 'pointer' : 'default';

  // Unified background & border style matching exact image reference for ALL tips
  const tipBgColor     = '#fff1f2';
  const tipBorderColor = '#ffe4e6';
  const tipTitleColor  = '#be123c';

  return `
    <div class="animate-fade-in-up" style="animation-delay: 0.05s; margin-bottom: 16px;">
      <div id="dynamic-notification" style="
        background: ${tipBgColor};
        border: 1px solid ${tipBorderColor};
        border-radius: 14px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: ${cursor};
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

  // Mostrar el skeleton loader limpio mientras carga la información real de la BD
  app.innerHTML = buildGranjaShell(firstName);
  attachGreetingActions();

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
    // Cargar piggies y el resto de datos de forma paralela y resiliente
    const [
      piggies,
      tipData,
      walletBalance,
      referralBonus,
      flashMissions,
      cycleMissions,
      transactions,
      newsSlides
    ] = await Promise.all([
      getUserPiggies().catch((err) => {
        console.warn('⚠️ getUserPiggies error:', err);
        return AppState.get('piggies') || [];
      }),
      getRandomTip().catch(() => null),
      getWalletBalance().catch(() => 0),
      getReferralBonusBalance().catch(() => 0),
      getActiveUserFlashMissions().catch(() => []),
      getActiveCycleMissions().catch(() => []),
      getWalletTransactions().catch(() => []),
      getActiveNewsSlides().catch(() => [])
    ]);

    const activePiggiesList = piggies || [];
    AppState.set({ piggies: activePiggiesList });

    // Detección de misiones de ciclo en segundo plano (non-blocking)
    detectAndCreateCycleMissions(activePiggiesList).catch((err) => {
      console.warn('⚠️ detectAndCreateCycleMissions err:', err);
    });

    // Misiones activas basadas en los cerditos cargados
    const activeMissions = await getActiveMissions(activePiggiesList).catch(() => []);

    // Exponer misiones globalmente para los modales
    window._activeFlashMissions = flashMissions || [];
    window._activeCycleMissions = cycleMissions || [];

    const stats = getDashboardStats(activePiggiesList);
    stats.walletBalance          = walletBalance || 0;
    stats.referralBonus          = referralBonus || 0;
    stats.referralBonusFormatted = formatCOP(referralBonus || 0);
    stats.saldoDisponible        = walletBalance || 0;
    stats.saldoDisponibleFormatted = formatCOP(walletBalance || 0);
    stats.transactions           = transactions || [];

    const app = document.getElementById('app');
    if (!app) return;

    // Verificar si el usuario sigue en la vista de Granja
    const currentHash = (window.location.hash.slice(2).split('?')[0].split('/')[0] || 'granja').toLowerCase();
    if (currentHash !== 'granja' && currentHash !== 'referidos' && currentHash !== '') return;

    app.innerHTML = buildGranjaFull(firstName, activePiggiesList, stats, tipData, activeMissions || [], flashMissions || [], cycleMissions || []);

    // Muestra el popup de noticias si hay imágenes activas y el usuario no lo ha cerrado aún en esta sesión
    if (newsSlides && newsSlides.length > 0) {
      showNewsBillboardModal(newsSlides);
    }

    attachGranjaListeners(activePiggiesList.length > 0, stats, activePiggiesList.length, activePiggiesList);

    // Lanza el tutorial interactivo si el usuario es nuevo y no lo ha completado aún
    startOnboardingTourIfEligible();
  } catch (error) {
    console.error('Error loading granja data:', error);
    const app = document.getElementById('app');
    if (!app) return;

    // Si ocurre un error de red, mostrar la granja con datos por defecto seguros
    const fallbackPiggies = AppState.get('piggies') || [];
    const stats = getDashboardStats(fallbackPiggies);
    stats.walletBalance = 0;
    stats.saldoDisponible = 0;
    stats.saldoDisponibleFormatted = '$0';
    stats.referralBonus = 0;
    stats.referralBonusFormatted = '$0';
    app.innerHTML = buildGranjaFull(firstName, fallbackPiggies, stats, null, [], [], []);
    attachGranjaListeners(fallbackPiggies.length > 0, stats, fallbackPiggies.length, fallbackPiggies);
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
            <button id="btn-quick-buy" class="btn-shine-7s" style="
                background: #ec4899; 
                color: white; 
                border: none; 
                width: 100%; 
                padding: 13px 18px; 
                border-radius: 12px; 
                font-weight: 800; 
                font-size: 0.85rem; 
                white-space: nowrap;
                cursor: pointer; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                gap: 8px;
                box-shadow: 0 8px 20px -5px rgba(236, 72, 153, 0.5);
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="
                    background: white; 
                    color: #ec4899; 
                    width: 20px; 
                    height: 20px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 16px; 
                    font-weight: 800; 
                    padding-bottom: 2px; 
                    position: relative; 
                    z-index: 1; 
                    flex-shrink: 0;
                ">+</div>
                <span style="position: relative; z-index: 1; white-space: nowrap;">Compra un Nuevo Piggy</span>
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

// ... renderGreeting remains the same ...

function renderGreeting(firstName) {
  const profile = AppState.get('profile') || {};
  const initials = getUserInitials(profile.full_name || firstName);
  const initialsFontSize = initials.length > 1 ? '1rem' : '1.15rem';

  // Gift icon (stroke style, consistent with bottom nav)
  const giftIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
    <rect x="3" y="8" width="18" height="4" rx="1"/>
    <path d="M12 8v13"/>
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
    <path d="M7.5 8C6.12 8 5 6.88 5 5.5C5 4.12 6.12 3 7.5 3C10 3 12 8 12 8C12 8 14 3 16.5 3C17.88 3 19 4.12 19 5.5C19 6.88 17.88 8 16.5 8"/>
  </svg>`;

  // Headset icon (stroke style)
  const headsetIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"/>
  </svg>`;

  // Logout icon (stroke style)
  const logoutIconSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`;

  return `
    <div class="greeting-bar" style="margin-bottom: 24px;">
      <!-- Left: Avatar Button (links to Perfil) + Text -->
      <div style="display: flex; align-items: center; gap: 12px;">
        <button id="btn-greeting-profile" style="
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          border-radius: 50%;
          outline: none;
          transition: transform 0.2s, box-shadow 0.2s;
        "
        onmouseover="this.style.transform='scale(1.06)'"
        onmouseout="this.style.transform='scale(1)'"
        title="Ver mi perfil">
          <div class="greeting-bar__avatar" style="
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--color-primary, #E91E63), #FF4081);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: ${initialsFontSize};
            box-shadow: 0 4px 12px rgba(233,30,99,0.3);
            border: 2px solid #ffffff;
            flex-shrink: 0;
            letter-spacing: 0.5px;
          ">${initials}</div>
        </button>
        <div>
          <div class="greeting-bar__sub" style="font-size: 0.78rem; color: #64748b; font-weight: 500;">Bienvenido de nuevo</div>
          <div class="greeting-bar__name" style="font-size: 1.15rem; font-weight: 800; color: #1e293b; letter-spacing: -0.01em;">${firstName}</div>
        </div>
      </div>

      <!-- Right: Action Icons (Referidos, Soporte, Logout) -->
      <div style="display: flex; align-items: center; gap: 8px;">
        <!-- Botón Referidos -->
        <button id="btn-greeting-referrals" class="greeting-action-btn" title="Invitar y ganar" style="
          background: #fdf2f8;
          border: 1px solid #fce7f3;
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-primary, #E91E63);
          transition: all 0.2s ease;
          position: relative;
        "
        onmouseover="this.style.background='#fce7f3'; this.style.transform='translateY(-1px)'"
        onmouseout="this.style.background='#fdf2f8'; this.style.transform='translateY(0)'">
          ${giftIconSVG}
          <!-- Badge indicador de beneficio -->
          <span style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            background: #10B981;
            border-radius: 50%;
            border: 2px solid #ffffff;
          "></span>
        </button>

        <!-- Botón Soporte -->
        <button id="btn-greeting-support" class="greeting-action-btn" title="Soporte y ayuda" style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #475569;
          transition: all 0.2s ease;
        "
        onmouseover="this.style.background='#f1f5f9'; this.style.color='#1e293b'; this.style.transform='translateY(-1px)'"
        onmouseout="this.style.background='#f8fafc'; this.style.color='#475569'; this.style.transform='translateY(0)'">
          ${headsetIconSVG}
        </button>

        <!-- Botón Cerrar Sesión -->
        <button id="btn-greeting-logout" class="greeting-action-btn" title="Cerrar sesión" style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s ease;
        "
        onmouseover="this.style.background='#fee2e2'; this.style.color='#ef4444'; this.style.borderColor='#fecaca'; this.style.transform='translateY(-1px)'"
        onmouseout="this.style.background='#f8fafc'; this.style.color='#94a3b8'; this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
          ${logoutIconSVG}
        </button>
      </div>
    </div>
  `;
}

function renderEmptyPiggies() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon animate-bounce-slow" style="font-size: 52px; margin-bottom: 12px;">🐷</div>
      <div class="empty-state__title" style="font-size: 1.15rem; font-weight: 700; color: #1e293b;">¡Tu granja está lista para crecer!</div>
      <div class="empty-state__text" style="font-size: 0.85rem; color: #64748b; max-width: 280px; margin: 0 auto 20px auto; line-height: 1.4;">Comienza adoptando tu primer Piggy y gana hasta un 12% de margen comercial en cada ciclo.</div>
      <button class="btn btn--primary" id="btn-adopt-empty" style="
        padding: 12px 28px;
        font-weight: 700;
        font-size: 0.95rem;
        border-radius: 12px;
        box-shadow: 0 4px 14px rgba(233, 30, 99, 0.35);
        cursor: pointer;
      ">
        Adoptar mi Primer Piggy
      </button>
    </div>
  `;
}

function renderPiggiesList(piggies, baseROI) {
  return `
    <div class="piggies-list">
      ${piggies.map(p => renderPiggyCard(p, baseROI)).join('')}
    </div>
  `;
}

function renderPiggyCard(piggy, baseROI) {
  const inv = parseFloat(piggy.investment_amount) || 0;
  const extraRoi = parseFloat(piggy.extra_roi_bonus) || 0;
  const projectedReturn = calculateTotalReturn(inv, baseROI, extraRoi);

  // Growth stage text (Etapa 1, 2 o 3)
  const growthStageText = piggy.growthStage || (
    piggy.progress > 90 ? 'Etapa 3 · Acabado' :
    piggy.progress > 30 ? 'Etapa 2 · Desarrollo' :
    'Etapa 1 · Inicio'
  );

  // Status badge config
  const statusConfig = {
    engorde: { label: 'En engorde', class: 'status-badge--engorde', bg: '#fdf2f8', color: '#be123c', border: '#fce7f3' },
    completado: { label: 'Completado', class: 'status-badge--completado', bg: '#f0fdf4', color: '#15803d', border: '#dcfce7' },
    liquidado: { label: 'Liquidado', class: 'status-badge--liquidado', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  };

  const status = statusConfig[piggy.status] || statusConfig.engorde;
  const progressPercent = Math.min(100, Math.max(0, piggy.progress || 0));

  return `
    <div class="piggy-card card animate-scale-in" data-piggy-id="${piggy.id}" style="
      cursor: pointer; 
      border-radius: 16px; 
      border: 1px solid #f1f5f9; 
      box-shadow: 0 4px 16px rgba(0,0,0,0.04); 
      padding: 16px; 
      margin-bottom: 16px; 
      background: #ffffff;
      transition: transform 0.2s, box-shadow 0.2s;
    "
    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)';"
    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.04)';">
      
      <!-- Top row: Avatar + Name/ID + Status Badge -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <!-- Piggy Photo (Fallback to SVG if image fails) -->
          <div style="
            width: 48px; 
            height: 48px; 
            border-radius: 50%; 
            overflow: hidden; 
            background: #fdf2f8; 
            border: 2px solid #fce7f3; 
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <img 
              src="${piggy.imageUrl}" 
              alt="${piggy.name}" 
              style="width: 100%; height: 100%; object-fit: cover;"
              onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: linear-gradient(135deg, #fce4ec, #f8bbd0);">
              ${renderIcon('pigFace', '', '28')}
            </div>
          </div>

          <!-- Name & ID -->
          <div>
            <div style="font-weight: 800; font-size: 1rem; color: #0f172a; line-height: 1.2; margin-bottom: 2px;">
              ${piggy.name}
            </div>
            <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; font-family: monospace;">
              ${piggy.displayCode || `#${String(piggy.id).slice(-6).toUpperCase()}`}
            </div>
          </div>
        </div>

        <!-- Status Badge -->
        <span style="
          background: ${status.bg}; 
          color: ${status.color}; 
          border: 1px solid ${status.border}; 
          font-size: 0.72rem; 
          font-weight: 700; 
          padding: 4px 10px; 
          border-radius: 20px;
          letter-spacing: 0.2px;
        ">
          ${status.label}
        </span>
      </div>

      <!-- Growth Stage & Progress Section -->
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 0.75rem; color: #475569; font-weight: 700;">
            ${growthStageText}
          </span>
          <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">
            ${piggy.isComplete ? 'Ciclo finalizado' : `${piggy.daysLeft} días restantes`}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="progress" style="height: 10px; background: #FCE4EC; border-radius: 9999px; overflow: hidden; width: 100%; position: relative;">
          <div class="progress__bar" style="width: ${progressPercent}%; height: 100%; background: ${piggy.isComplete ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #E91E63 0%, #FF4081 100%)'}; border-radius: 9999px; transition: width 0.8s ease-out; min-width: ${progressPercent > 0 ? '6px' : '0'};"></div>
        </div>
      </div>

      <div class="piggy-card__stats grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
        <div>
          <div class="text-xs text-muted" style="font-size: 0.72rem; color: #64748b; font-weight: 600; margin-bottom: 2px;">Peso actual</div>
          <div class="font-semibold" style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${piggy.currentWeight} kg</div>
        </div>
        <div style="text-align: right;">
          <div class="font-semibold text-primary" style="font-size: 0.95rem; font-weight: 800; color: #E91E63;">
            <span style="color: #64748b; font-weight: 600; font-size: 0.78rem;">TB:</span> ${formatCOP(projectedReturn)}
          </div>
          ${extraRoi > 0 ? `<div class="text-xs" style="font-size: 10px; color: #b45309; margin-top: 2px; font-weight: 700;">Beneficio x Venta: +${(extraRoi * 100).toFixed(0)}%</div>` : ''}
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

  // Completed piggies modal trigger
  const btnCompletados = document.getElementById('btn-ver-completados');
  if (btnCompletados) {
    btnCompletados.addEventListener('click', () => {
      const completedPiggies = (piggies || []).filter(p => p.isComplete);
      showCompletedPiggiesModal(completedPiggies, stats.baseROI);
    });
  }

  // Mission listeners (delegated to module)
  attachMissionListeners();

  // Dynamic Notification click
  const notifEl = document.getElementById('dynamic-notification');
  if (notifEl && notifEl.dataset.cta) {
    notifEl.addEventListener('click', () => {
      const cta = notifEl.dataset.cta;
      if (cta.startsWith('#/')) {
        navigateTo(cta.replace('#/', ''));
      } else {
        window.open(cta, '_blank');
      }
    });
  }

  // Quick Buy Action -> Redirect to Mercado
  const quickBuyBtn = document.getElementById('btn-quick-buy');
  if (quickBuyBtn) {
    quickBuyBtn.addEventListener('click', () => {
      navigateTo('mercado');
    });
  }

  // Adopt Empty Action -> Redirect to Mercado
  const adoptEmptyBtn = document.getElementById('btn-adopt-empty');
  if (adoptEmptyBtn) {
    adoptEmptyBtn.addEventListener('click', () => {
      navigateTo('mercado');
    });
  }

  // Wallet listeners (delegated to module)
  attachWalletListeners(stats);

  // Greeting actions (profile, referrals, support, logout)
  attachGreetingActions();
}

/**
 * Attach listeners for greeting action bar (works in both skeleton and full state).
 */
export function attachGreetingActions() {
  // Greeting avatar / profile trigger
  document.getElementById('btn-greeting-profile')?.addEventListener('click', () => {
    navigateTo('perfil');
  });

  // Greeting action buttons
  document.getElementById('btn-greeting-referrals')?.addEventListener('click', () => {
    showReferralModal();
  });

  document.getElementById('btn-greeting-support')?.addEventListener('click', () => {
    showSupportModal();
  });

  document.getElementById('btn-greeting-logout')?.addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
      await signOut();
      navigateTo('auth');
    }
  });
}
