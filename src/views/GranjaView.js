/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Matches screen2.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats } from '../services/piggiesService.js';
import { formatCOP } from '../services/mockData.js';
import { navigateTo } from '../router.js';
import { signOut } from '../services/authService.js';
import { showCheckoutModal } from './MercadoView.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { getWalletBalance, getReferralBonusBalance, getWalletTransactions } from '../services/walletService.js';
import { getRandomTip } from '../services/tipsService.js';
import { getActiveMissions } from '../services/missionsService.js';
import {
    getActiveUserFlashMissions,
    getActiveCycleMissions,
    detectAndCreateCycleMissions,
} from '../services/flashMissionsService.js';

/* ── Module imports (Granja Section blocks) ───────── */
import { renderWalletBanner, renderWalletSkeleton, attachWalletListeners } from './granja/WalletBlock.js';
import { renderPriorityMissionBanner, attachMissionListeners } from './granja/MissionsBlock.js';
import { showReferralModal, loadGreetingReferralCode } from './granja/ReferralsModal.js';
import { removeBonusModal } from './granja/WelcomeBonusModal.js';
import { showCompletedPiggiesModal } from './granja/CompletedPiggiesModal.js';

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

  return `
    <div class="animate-fade-in-up" style="animation-delay: 0.05s; margin-bottom: 16px;">
      <div id="dynamic-notification" style="
        background: ${notif.bgColor};
        border: 1px solid ${notif.borderColor};
        border-radius: 14px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: ${cursor};
        transition: transform 0.2s, box-shadow 0.2s;
      " ${ctaAttr}
         onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
        <div style="font-size:24px; flex-shrink:0;">${notif.icon}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; color:${notif.color}; font-size:0.82rem; line-height:1.3;">${notif.title}</div>
          <div style="font-size:0.72rem; color:#6b7280; margin-top:2px;">&#10024; ${notif.reward}</div>
        </div>
        <div style="font-size:14px; color:${notif.color}; opacity:0.5; flex-shrink:0;">
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
    // ── Paso 1: cargar piggies primero y actualizar AppState ────────────
    // IMPORTANTE: getActiveMissions() necesita conocer los piggies del usuario
    // para calcular qué misiones están completadas. Si se ejecuta en paralelo
    // con getUserPiggies(), AppState todavía está vacío → race condition.
    const piggies = await getUserPiggies();
    AppState.set({ piggies });

    // ── Paso 2: detectar piggies que completaron ciclo y crear M10 si aplica ─
    // Se ejecuta antes de cargar misiones para que las M10 ya estén en BD
    await detectAndCreateCycleMissions(piggies);

    // ── Paso 3: cargar el resto de datos en paralelo ────────────────
    const [
        tipData, walletBalance, referralBonus,
        activeMissions, flashMissions, cycleMissions, stats,
        transactions,
    ] = await Promise.all([
      getRandomTip(),
      getWalletBalance(),
      getReferralBonusBalance(),
      getActiveMissions(piggies),
      getActiveUserFlashMissions(),
      getActiveCycleMissions(),
      getDashboardStats(piggies),
      getWalletTransactions(),
    ]);

    // Exponer misiones flash y de ciclo globalmente para que los modales puedan acceder
    window._activeFlashMissions = flashMissions;
    window._activeCycleMissions = cycleMissions;

    // wallet_balance = real cash (ciclos completados + recargas)
    // referral_balance = bonos de consumo por referidos (canje manual, NO suma al saldo)
    stats.walletBalance          = walletBalance;
    stats.referralBonus          = referralBonus;
    stats.referralBonusFormatted = formatCOP(referralBonus);
    stats.saldoDisponible        = walletBalance;
    stats.saldoDisponibleFormatted = formatCOP(walletBalance);
    stats.transactions           = transactions;

    const app = document.getElementById('app');
    app.innerHTML = buildGranjaFull(firstName, piggies, stats, tipData, activeMissions, flashMissions, cycleMissions);

    attachGranjaListeners(piggies.length > 0, stats, piggies.length, piggies);
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
      <button class="btn btn--primary" id="btn-adopt-empty" onclick="location.hash='#/adopcion'">
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
          <div class="progress__bar" style="width: ${piggy.progress}%; ${piggy.isComplete ? 'background: linear-gradient(135deg, #10B981, #059669);' : ''}"></div>
        </div>
      </div>

      <div class="piggy-card__stats grid-2">
        <div>
          <div class="text-xs text-muted">Peso actual</div>
          <div class="font-semibold">${piggy.currentWeight} kg</div>
        </div>
        <div>
          <div class="text-xs text-muted">Margen Comercial Estimado</div>
          <div class="font-semibold text-primary">${formatCOP(projectedReturn)}</div>
          ${piggy.extra_roi_bonus > 0 ? `<div class="text-xs" style="font-size:10px; color:var(--color-warning);">Incluye comisión +${(piggy.extra_roi_bonus * 100).toFixed(0)}%</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ... renderBottomNav remains the same ...
export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Navegación principal" style="grid-template-columns: repeat(4, 1fr);">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}" id="nav-granja">
        <span class="bottom-nav__icon">${renderIcon('farm', '', '24')}</span>
        <span>Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}" id="nav-mercado">
        <span class="bottom-nav__icon">
          <span class="icon" style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>
          </span>
        </span>
        <span>Mercado</span>
      </a>
      <a href="#/gourmet" class="bottom-nav__item ${activeTab === 'gourmet' ? 'bottom-nav__item--active' : ''}" id="nav-gourmet">
        <span class="bottom-nav__icon">${renderIcon('shop', '', '24')}</span>
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

  // Quick Buy Action
  const quickBuyBtn = document.getElementById('btn-quick-buy');
  if (quickBuyBtn) {
    quickBuyBtn.addEventListener('click', async () => {
      quickBuyBtn.style.opacity = '0.7';
      quickBuyBtn.style.pointerEvents = 'none';

      try {
        const items = await getMarketplaceItems();
        // Find Standard Initial Piggy (Month 1, Standard)
        const standardPiggy = items.find(i => i.currentMonth === 1 && i.category === 'standard') || items[0];

        if (standardPiggy) {
          showCheckoutModal(standardPiggy);
        } else {
          navigateTo('mercado');
        }
      } catch (error) {
        console.error('Quick buy error:', error);
        navigateTo('mercado');
      } finally {
        quickBuyBtn.style.opacity = '1';
        quickBuyBtn.style.pointerEvents = 'auto';
      }
    });
  }

  // Wallet listeners (delegated to module)
  attachWalletListeners(stats);

  // Referral code + modal (delegated to module)
  loadGreetingReferralCode();

  // Greeting referral code click → open referral modal
  document.getElementById('greeting-referral-code')?.addEventListener('click', () => {
    showReferralModal();
  });
}
