/* ============================================
   PIGGY APP — Granja View (Dashboard)
   Displays user piggies, growth tracker,
   summary stats, and quick actions
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats } from '../services/piggiesService.js';
import {
    formatCOP,
    getDaysRemaining,
    getProgressPercentage,
    getPiggyGrowthStage,
    getCategoryBadge,
} from '../services/mockData.js';
import { getProfile } from '../services/authService.js';
import {
    getWalletBalance,
    getReferralBonusBalance,
    getWelcomeBonusExpiryInfo,
} from '../services/walletService.js';
import { getWalletTransactions } from '../services/walletTransactionsService.js';
import { renderWalletBanner, renderWalletSkeleton, attachWalletListeners } from './granja/WalletBlock.js';

// Cache for quick re-renders
let cachedPiggies = null;

/**
 * Build the complete Granja screen HTML using live data.
 * @param {string} firstName
 * @param {Array} piggies
 * @param {Object} stats
 * @param {number} totalCerditosCount
 * @param {Array} allPiggies
 * @returns {string} Complete HTML string
 */
function buildGranjaFull(firstName, piggies, stats, totalCerditosCount, allPiggies = []) {
    return `
    <div class="granja-view animate-fade-in" style="padding-bottom: 90px;">
      <!-- Main Container (Standard max-width: 480px) -->
      <div class="container" style="max-width: 480px; margin: 0 auto; padding: 0 16px;">
        
        <!-- Welcome Header with Referral Pill -->
        <div class="granja-header" style="margin-bottom: 20px; padding-top: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="flex: 1; min-width: 0;">
              <h1 style="font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; letter-spacing: -0.02em;">
                ¡Hola, ${firstName}! 👋
              </h1>
              <p style="color: #64748b; font-size: 0.88rem; margin: 0;">
                Bienvenido a tu granja digital
              </p>
            </div>
            <!-- Referral Pill -->
            <button id="btn-header-referral" class="animate-pulse" style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #fdf2f8;
              border: 1px solid #fbcfe8;
              padding: 6px 12px;
              border-radius: 20px;
              cursor: pointer;
              flex-shrink: 0;
              transition: all 0.2s;
            ">
              <span style="color: #db2777; display: flex; align-items: center;">${renderIcon('giftBox', '', '15')}</span>
              <span style="font-size: 0.75rem; font-weight: 700; color: #be185d;">Gana $20.000</span>
            </button>
          </div>
        </div>

        <!-- 30-Day Welcome Bonus Countdown Banner -->
        ${renderWelcomeBonusBanner()}

        <!-- Wallet Card (Compact Green Section) -->
        ${renderWalletBanner(firstName, stats)}

        <!-- Active Engorde Piggies Section -->
        <div class="section" style="margin-bottom: 28px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0;">
                Mis Cerditos en Engorde
              </h2>
              <span style="
                background: #f0fdf4;
                color: #16a34a;
                border: 1px solid #bbf7d0;
                font-size: 0.72rem;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 12px;
              ">
                ${piggies.length} activo${piggies.length === 1 ? '' : 's'}
              </span>
            </div>
            <a href="#/mercado" style="
              color: #db2777;
              font-size: 0.82rem;
              font-weight: 600;
              text-decoration: none;
              display: inline-flex;
              align-items: center;
              gap: 2px;
            ">
              Comprar +
            </a>
          </div>

          ${piggies.length > 0 ? renderPiggiesList(piggies) : renderEmptyPiggiesState()}
        </div>

        <!-- Historial de Cerditos (Expandable) -->
        ${renderCompletedPiggiesHistory(allPiggies)}

        <!-- Quick Access Section (2-Col Grid) -->
        <div class="section" style="margin-bottom: 28px;">
          <h2 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0 0 14px 0;">
            Explora tu Granja
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <!-- Tienda Gourmet Card -->
            <a href="#/tienda" style="
              background: #ffffff;
              border: 1px solid #f1f5f9;
              border-radius: 16px;
              padding: 16px;
              text-decoration: none;
              display: flex;
              flex-direction: column;
              gap: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.04);
              transition: all 0.2s;
            ">
              <div style="
                width: 36px;
                height: 36px;
                background: #fdf2f8;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #db2777;
              ">
                ${renderIcon('shoppingBag', '', '20')}
              </div>
              <div>
                <div style="font-weight: 700; font-size: 0.92rem; color: #1e293b;">Tienda de Carne</div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Canjea tus bonos</div>
              </div>
            </a>

            <!-- Aliados Card -->
            <a href="#/aliados" style="
              background: #ffffff;
              border: 1px solid #f1f5f9;
              border-radius: 16px;
              padding: 16px;
              text-decoration: none;
              display: flex;
              flex-direction: column;
              gap: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.04);
              transition: all 0.2s;
            ">
              <div style="
                width: 36px;
                height: 36px;
                background: #eff6ff;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #2563eb;
              ">
                ${renderIcon('store', '', '20')}
              </div>
              <div>
                <div style="font-weight: 700; font-size: 0.92rem; color: #1e293b;">Restaurantes Aliados</div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">Descuentos exclusivos</div>
              </div>
            </a>
          </div>
        </div>

      </div>
    </div>
    `;
}

/**
 * Render the Granja skeleton placeholder while data loads.
 * @param {string} firstName
 * @returns {string} Skeleton HTML string
 */
function buildGranjaShell(firstName) {
    return `
    <div class="granja-view animate-fade-in" style="padding-bottom: 90px;">
      <div class="container" style="max-width: 480px; margin: 0 auto; padding: 0 16px;">
        <!-- Header Skeleton -->
        <div class="granja-header" style="margin-bottom: 20px; padding-top: 8px;">
          <h1 style="font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 0 0 4px 0;">
            ¡Hola, ${firstName}! 👋
          </h1>
          <p style="color: #64748b; font-size: 0.88rem; margin: 0;">
            Cargando tu granja digital...
          </p>
        </div>

        <!-- Wallet Skeleton -->
        ${renderWalletSkeleton(firstName)}

        <!-- Piggies Loading Skeleton -->
        <div class="section" style="margin-bottom: 28px;">
          <div class="skeleton" style="width: 140px; height: 20px; margin-bottom: 14px; border-radius: 6px;"></div>
          <div class="skeleton" style="width: 100%; height: 160px; border-radius: 16px;"></div>
        </div>
      </div>
    </div>
    `;
}

/**
 * Fetch all required data for the Granja screen and render the full view.
 * @param {HTMLElement} container
 * @param {string} firstName
 */
async function loadGranjaData(container, firstName) {
    try {
        const [piggiesData, walletBalance, referralBonus, transactions] = await Promise.all([
            getUserPiggies(),
            getWalletBalance(),
            getReferralBonusBalance(),
            getWalletTransactions(),
        ]);

        const allPiggies = piggiesData || [];
        const activePiggiesList = allPiggies.filter((p) => p.status === 'engorde' && !p.isComplete);
        const stats = getDashboardStats(activePiggiesList);

        stats.walletBalance            = walletBalance;
        stats.referralBonus            = referralBonus;
        stats.referralBonusFormatted   = formatCOP(referralBonus);
        stats.saldoDisponible          = walletBalance;
        stats.saldoDisponibleFormatted = formatCOP(walletBalance);
        stats.transactions             = transactions || [];

        // Save to AppState for sync across views
        AppState.set({
            piggies: allPiggies,
            stats,
            granjaLoaded: true,
        });
        cachedPiggies = allPiggies;

        // Render the full screen with live data
        container.innerHTML = buildGranjaFull(
            firstName,
            activePiggiesList,
            stats,
            allPiggies.length,
            allPiggies
        );

        // Attach listeners once DOM is ready
        attachGranjaListeners(activePiggiesList.length > 0, stats, activePiggiesList.length, activePiggiesList);
    } catch (err) {
        console.error('🐷 Error loading Granja data:', err);
        // Fallback: render with empty/safe defaults
        const fallbackPiggies = cachedPiggies || [];
        const stats = getDashboardStats(fallbackPiggies);
        stats.walletBalance = 0;
        stats.referralBonus = 0;
        stats.referralBonusFormatted = '$ 0';
        stats.saldoDisponible = 0;
        stats.saldoDisponibleFormatted = '$ 0';
        stats.transactions = [];

        container.innerHTML = buildGranjaFull(
            firstName,
            fallbackPiggies,
            stats,
            fallbackPiggies.length,
            fallbackPiggies
        );
        attachGranjaListeners(fallbackPiggies.length > 0, stats, fallbackPiggies.length, fallbackPiggies);
    }
}

/**
 * Main render function for the Granja view.
 * Renders the skeleton shell first to eliminate any initial balance flicker,
 * then fetches fresh data asynchronously from Supabase.
 * @returns {string} Initial skeleton HTML
 */
export function renderGranjaView() {
    const profile = AppState.get('profile');
    const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

    // Asynchronously load real Supabase data after initial paint
    setTimeout(() => {
        const viewEl = document.getElementById('view-granja');
        if (viewEl) {
            loadGranjaData(viewEl, firstName);
        }
    }, 0);

    // Always render clean skeleton shell on initial navigation
    return buildGranjaShell(firstName);
}

/**
 * Render the 30-day welcome bonus expiration countdown banner.
 * @returns {string} HTML string
 */
function renderWelcomeBonusBanner() {
    const profile = AppState.get('profile');
    const bonusBal = profile?.consumption_balance ?? profile?.referral_balance ?? 0;
    if (bonusBal <= 0) return '';

    return `
    <div id="welcome-bonus-banner" class="animate-fade-in" style="
      background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
      border: 1px solid #fecdd3;
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    ">
      <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
        <span style="font-size: 1.4rem; flex-shrink: 0;">🎁</span>
        <div style="min-width: 0;">
          <div style="font-size: 0.82rem; font-weight: 700; color: #9f1239; line-height: 1.2;">
            Bono de Bienvenida: ${formatCOP(bonusBal)}
          </div>
          <div style="font-size: 0.72rem; color: #be123c; margin-top: 2px;" id="welcome-bonus-timer-text">
            Válido para redimir en Tienda de Carne
          </div>
        </div>
      </div>
      <a href="#/tienda" style="
        background: #e11d48;
        color: white;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 6px 10px;
        border-radius: 8px;
        text-decoration: none;
        white-space: nowrap;
        flex-shrink: 0;
      ">
        Redimir
      </a>
    </div>
    `;
}

/**
 * Render the active piggies list cards.
 * @param {Array} piggies
 * @returns {string} HTML string
 */
function renderPiggiesList(piggies) {
    return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${piggies.map((p, idx) => renderPiggyCard(p, idx)).join('')}
    </div>
    `;
}

/**
 * Render an individual Piggy Card for the active list.
 * @param {Object} piggy
 * @param {number} idx
 * @returns {string} HTML string
 */
function renderPiggyCard(piggy, idx) {
    const progress = piggy.progress || getProgressPercentage(piggy.purchase_date, piggy.end_date);
    const daysLeft = piggy.daysLeft !== undefined ? piggy.daysLeft : getDaysRemaining(piggy.end_date);
    const stage = piggy.growthStage || getPiggyGrowthStage(progress, piggy.name);
    const categoryBadge = piggy.categoryBadge || getCategoryBadge(piggy.category);
    const weight = piggy.currentWeight || 25;

    return `
    <div class="piggy-card animate-fade-in-up" style="
      background: #ffffff;
      border: 1px solid #f1f5f9;
      border-radius: 18px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      animation-delay: ${idx * 0.05}s;
    ">
      <!-- Top Row: Avatar + Name + Category Badge -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <!-- Piggy Photo Avatar -->
          <div style="
            width: 46px;
            height: 46px;
            border-radius: 14px;
            overflow: hidden;
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            flex-shrink: 0;
          ">
            <img 
              src="${piggy.image_url || stage.image}" 
              alt="${piggy.name}"
              style="width: 100%; height: 100%; object-fit: cover;"
              onerror="this.onerror=null; this.src='assets/piggies/stage1/et1-1.jpg';"
            />
          </div>
          <div>
            <div style="font-weight: 800; font-size: 1rem; color: #1e293b; line-height: 1.2;">
              ${piggy.name || 'Mi Piggy'}
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
              ${stage.title || 'Engorde Activo'}
            </div>
          </div>
        </div>

        <!-- Category Badge -->
        <span style="
          background: ${categoryBadge.color}18;
          color: ${categoryBadge.color};
          border: 1px solid ${categoryBadge.color}35;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        ">
          ${categoryBadge.icon} ${categoryBadge.label}
        </span>
      </div>

      <!-- Growth Progress Bar -->
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 5px;">
          <span style="color: #64748b; font-weight: 600;">Progreso de Engorde</span>
          <span style="font-weight: 700; color: #16a34a;">${progress}% (${daysLeft} días rest.)</span>
        </div>
        <div style="
          width: 100%;
          height: 8px;
          background: #f1f5f9;
          border-radius: 6px;
          overflow: hidden;
        ">
          <div style="
            width: ${progress}%;
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 6px;
            transition: width 0.6s ease;
          "></div>
        </div>
      </div>

      <!-- Stats Grid (Weight, Investment, Gain) -->
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        background: #f8fafc;
        border-radius: 12px;
        padding: 10px 8px;
        margin-bottom: 12px;
        text-align: center;
      ">
        <div>
          <div style="font-size: 0.68rem; color: #64748b; font-weight: 600;">Peso Est.</div>
          <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b; margin-top: 1px;">
            ${weight} kg
          </div>
        </div>
        <div>
          <div style="font-size: 0.68rem; color: #64748b; font-weight: 600;">Inversión</div>
          <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b; margin-top: 1px;">
            ${piggy.investmentFormatted || formatCOP(piggy.investment_amount || 0)}
          </div>
        </div>
        <div>
          <div style="font-size: 0.68rem; color: #64748b; font-weight: 600;">Retorno Est.</div>
          <div style="font-weight: 800; font-size: 0.88rem; color: #16a34a; margin-top: 1px;">
            +${piggy.returnGainFormatted || formatCOP(piggy.returnGain || 0)}
          </div>
        </div>
      </div>

      <!-- Action Row: Ver Contrato -->
      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
        ${piggy.contractUrl ? `
        <a 
          href="${piggy.contractUrl}" 
          target="_blank" 
          rel="noopener noreferrer"
          style="
            font-size: 0.75rem;
            color: #64748b;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          "
        >
          📄 Ver Contrato
        </a>
        ` : ''}
      </div>
    </div>
    `;
}

/**
 * Render empty state when user has no active piggies.
 * @returns {string} HTML string
 */
function renderEmptyPiggiesState() {
    return `
    <div style="
      background: #ffffff;
      border: 2px dashed #e2e8f0;
      border-radius: 18px;
      padding: 32px 20px;
      text-align: center;
    ">
      <div style="font-size: 2.5rem; margin-bottom: 10px;">🐷</div>
      <h3 style="font-weight: 800; font-size: 1.05rem; color: #1e293b; margin: 0 0 6px 0;">
        ¡Aún no tienes cerditos en engorde!
      </h3>
      <p style="color: #64748b; font-size: 0.83rem; margin: 0 0 18px 0; line-height: 1.4;">
        Comienza hoy tu participación en la porcicultura digital con respaldo real.
      </p>
      <a href="#/mercado" style="
        background: #db2777;
        color: white;
        font-weight: 700;
        font-size: 0.88rem;
        padding: 11px 22px;
        border-radius: 12px;
        text-decoration: none;
        display: inline-block;
        box-shadow: 0 4px 12px rgba(219, 39, 119, 0.3);
      ">
        Explorar Cerdos Disponibles
      </a>
    </div>
    `;
}

/**
 * Render completed piggies expandable history block.
 * @param {Array} allPiggies
 * @returns {string} HTML string
 */
function renderCompletedPiggiesHistory(allPiggies) {
    const completed = (allPiggies || []).filter((p) => p.status === 'completado' || p.isComplete);
    if (completed.length === 0) return '';

    return `
    <div class="section" style="margin-bottom: 28px;">
      <details style="
        background: #ffffff;
        border: 1px solid #f1f5f9;
        border-radius: 16px;
        padding: 14px 16px;
      ">
        <summary style="
          font-weight: 700;
          font-size: 0.95rem;
          color: #475569;
          cursor: pointer;
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <span>🏆 Cerditos Completados (${completed.length})</span>
          <span style="font-size: 0.8rem; color: #94a3b8;">Ver historial ▾</span>
        </summary>
        <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px;">
          ${completed.map((p) => `
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-top: 1px solid #f1f5f9;
            ">
              <div>
                <div style="font-weight: 700; font-size: 0.88rem; color: #1e293b;">${p.name || 'Piggy'}</div>
                <div style="font-size: 0.72rem; color: #16a34a; font-weight: 600;">✓ Ciclo Finalizado</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 800; font-size: 0.88rem; color: #059669;">
                  ${p.finalReturnFormatted || formatCOP(p.investment_amount || 0)}
                </div>
                <div style="font-size: 0.7rem; color: #94a3b8;">Liquidado</div>
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    </div>
    `;
}

/**
 * Attach event listeners to Granja interactive elements.
 * @param {boolean} hasPiggies
 * @param {Object} stats
 * @param {number} piggiesCount
 * @param {Array} piggiesList
 */
function attachGranjaListeners(hasPiggies, stats, piggiesCount, piggiesList) {
    // Referral Pill button listener
    const btnReferral = document.getElementById('btn-header-referral');
    if (btnReferral) {
        btnReferral.addEventListener('click', () => {
            window.location.hash = '#/referidos';
        });
    }

    // Attach Wallet block event listeners (explorar cuenta, etc.)
    attachWalletListeners(stats);
}
