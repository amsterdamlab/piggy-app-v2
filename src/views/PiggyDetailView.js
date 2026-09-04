/* ============================================
   PIGGY APP — Piggy Detail View
   Individual pig view with progress and liquidation
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getPiggyById, calculateBaseROI, formatCOP, formatPercentage, getDaysRemaining, getDashboardStats } from '../services/piggiesService.js';
import { getUserPiggies } from '../services/piggiesService.js';
import { getRouteParam, navigateTo } from '../router.js';
import { openWalletDrawer } from './granja/WalletBlock.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

/**
 * Render the Piggy Detail view.
 */
export function renderPiggyDetailView() {
  const piggyId = getRouteParam();
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page piggy-detail-page">
      <div class="page__content">
        ${renderPiggyLoader('Cargando detalles...')}
      </div>
    </div>
  `;

  if (piggyId) {
    loadPiggyDetail(piggyId);
  } else {
    navigateTo('granja');
  }

  return () => { };
}

/**
 * Load and render piggy details.
 */
async function loadPiggyDetail(piggyId) {
  try {
    const [piggy, allPiggies] = await Promise.all([
      getPiggyById(piggyId),
      getUserPiggies(),
    ]);

    if (AppState.get('currentView') !== 'piggy') return;

    if (!piggy) {
      navigateTo('granja');
      return;
    }

    const stats = getDashboardStats(allPiggies);
    const baseROI = stats.baseROI;
    const totalROI = baseROI + (piggy.extra_roi_bonus || 0);
    const projectedReturn = piggy.investment_amount * (1 + totalROI);
    const gain = projectedReturn - piggy.investment_amount;

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page piggy-detail-page">
        <div class="page__content">

          <!-- Back button -->
          <button class="piggy-detail__back animate-fade-in" id="btn-back">
            ← Volver a la Granja
          </button>

          <!-- Piggy hero -->
          <div class="piggy-detail__hero animate-scale-in">
            <div class="piggy-detail__avatar" style="overflow: hidden; border-radius: 50%; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: #fff; border: 4px solid #ffffff; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);">
              <img src="${piggy.imageUrl}" alt="${piggy.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null;this.src='pig2.jpg'" />
            </div>
            <h2 class="piggy-detail__name">${piggy.name}</h2>
            <div style="display: flex; align-items: center; justify-content: center; margin-top: 4px; margin-bottom: 6px;">
              <span class="badge badge--primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem; padding: 6px 14px; letter-spacing: 0.3px; background: #FCE4EC; color: #E91E63; border-radius: 9999px;">
                <span style="display: inline-flex; align-items: center; color: currentColor;">${renderIcon('tag', '', '14')}</span>
                <span>${piggy.displayCode || piggy.contract_code || '#000000'}</span>
              </span>
            </div>
          </div>

          <!-- Progress section -->
          <div class="section animate-fade-in-up" style="animation-delay:0.1s;">
            <h3 class="section__title" style="margin-bottom: 12px;">Ciclo de Engorde</h3>
            <div class="piggy-detail__progress-card card" style="background: white; border: 1px solid #f1f5f9; border-radius: 20px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);">
              <div class="piggy-card__progress-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="text-sm text-muted" style="font-size: 0.85rem; color: #64748b; font-weight: 600;">Progreso general</span>
                <span class="text-md font-bold text-primary" style="font-size: 1rem; font-weight: 800; color: #E91E63;">${piggy.progress}%</span>
              </div>
              <div class="progress" style="height: 12px; background: #FCE4EC; border-radius: 9999px; overflow: hidden; width: 100%; position: relative;">
                <div class="progress__bar" style="width: ${piggy.progress}%; height: 100%; background: ${piggy.isComplete ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #E91E63 0%, #FF4081 100%)'}; border-radius: 9999px; transition: width 0.8s ease-out; min-width: ${piggy.progress > 0 ? '6px' : '0'};"></div>
              </div>
              <div class="grid-2 mt-md" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                <div class="piggy-detail__metric" style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: #E91E63; display: flex; align-items: center;">${renderIcon('clock', '', '18')}</span>
                  <div>
                    <div class="text-xs text-muted" style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Tiempo restante</div>
                    <div class="font-semibold" style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${piggy.daysLeft} días</div>
                  </div>
                </div>
                <div class="piggy-detail__metric" style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">⚖️</span>
                  <div>
                    <div class="text-xs text-muted" style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Peso estimado</div>
                    <div class="font-semibold" style="font-size: 0.95rem; font-weight: 800; color: #0f172a;">${piggy.currentWeight} kg</div>
                  </div>
                </div>
              </div>

              <!-- Etapa de Desarrollo en Tiempo Real -->
              ${piggy.growthStage ? `
                <div style="
                  margin-top: 16px;
                  padding-top: 14px;
                  border-top: 1px solid #f1f5f9;
                ">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="font-size: 1.1rem; line-height: 1;">${piggy.growthStage.icon}</span>
                    <span style="font-size: 0.95rem; font-weight: 800; color: #0f172a; line-height: 1.2;">
                      ${piggy.growthStage.stageName}
                    </span>
                  </div>
                  <p style="
                    font-size: 0.82rem;
                    color: #475569;
                    line-height: 1.45;
                    margin: 0;
                    font-weight: 500;
                  ">
                    ${piggy.growthStage.description}
                  </p>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Financial info -->
          <div class="section animate-fade-in-up" style="animation-delay:0.2s;">
            <h3 class="section__title" style="margin-bottom: 12px;">Información Comercial</h3>
            <div class="card" style="background: white; border: 1px solid #f1f5f9; border-radius: 20px; padding: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);">
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">ID / Radicado</span>
                <span class="font-semibold" style="display:flex;align-items:center;gap:5px;">
                  <span style="color:#E91E63;display:inline-flex;">${renderIcon('tag', '', '14')}</span>
                  ${piggy.displayCode || piggy.contract_code}
                </span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">Valor Piggy</span>
                <span class="font-semibold">${formatCOP(piggy.investment_amount)}</span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">Fecha Cierre de Ciclo</span>
                <span class="font-semibold">${new Date(piggy.end_date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">Beneficio</span>
                <span class="font-semibold" style="display:flex;align-items:center;gap:6px;">${formatPercentage(baseROI)}<span class="info-tooltip-wrapper" data-tooltip="Identifica el porcentaje sobre la comercialización del cerdo. Se establece entre el 8% al 13% según la variación del mercado."><span class="info-icon">ℹ</span><span class="info-tooltip-bubble">Identifica el porcentaje sobre la comercialización del cerdo. Se establece entre el 8% al 13% según la variación del mercado.</span></span></span>
              </div>
              ${piggy.extra_roi_bonus > 0 ? `
                <div class="piggy-detail__finance-row">
                  <span class="text-sm text-muted">Beneficio Canal de Venta</span>
                  <span class="font-semibold text-primary" style="display:flex;align-items:center;gap:6px; color: #E91E63;">+${formatPercentage(piggy.extra_roi_bonus)}<span class="info-tooltip-wrapper" data-tooltip="Se establece una adición debido a la venta del cerdo en un mercado premium."><span class="info-icon">ℹ</span><span class="info-tooltip-bubble">Se establece una adición debido a la venta del cerdo en un mercado premium.</span></span></span>
                </div>
              ` : ''}
              <div class="divider" style="margin: var(--space-sm) 0;"></div>
              <div class="piggy-detail__finance-row">
                <span class="font-semibold">Valor Referencia en Mercado</span>
                <span class="font-bold" style="font-size:var(--text-lg);">${formatCOP(gain)}</span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="font-semibold">Total Beneficio</span>
                <span class="font-bold text-primary" style="font-size:var(--text-lg); color: #E91E63;">${formatCOP(projectedReturn)}</span>
              </div>
            </div>
          </div>


          <!-- Liquidation (only if cycle complete) -->
          ${piggy.isComplete ? `
            <div class="section animate-fade-in-up" style="animation-delay:0.3s;">
              <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border: 1px solid rgba(16, 185, 129, 0.2); text-align: center;">
                <h3 class="section__title" style="color: #059669; margin-bottom: var(--space-sm);">✓ Completado</h3>
                <p style="color: var(--text-color); font-size: 0.95rem; line-height: 1.5; margin-bottom: var(--space-md);">
                  Tu piggy ya ha completado su ciclo, a partir de este momento verás reflejadas tus comisiones en tu <strong>Cuenta Agroproductiva</strong>.
                </p>
                <button class="btn btn--primary btn--block" id="btn-ver-wallet" style="background: linear-gradient(135deg, #10B981, #059669); color: white;">
                  Ver Cuenta Agroproductiva
                </button>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;

    // Back button
    document.getElementById('btn-back')?.addEventListener('click', () => {
      navigateTo('granja');
    });

    // Ver Cuenta Agroproductiva button → wallet drawer
    document.getElementById('btn-ver-wallet')?.addEventListener('click', () => {
      openWalletDrawer();
    });
  } catch (error) {
    console.error('Error loading piggy detail:', error);
    navigateTo('granja');
  }
}
