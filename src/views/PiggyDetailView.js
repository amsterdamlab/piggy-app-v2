/* ============================================
   PIGGY APP — Piggy Detail View
   Individual pig view with progress and liquidation
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getPiggyById, calculateBaseROI, formatCOP, formatPercentage, getDaysRemaining } from '../services/piggiesService.js';
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

    if (!piggy) {
      navigateTo('granja');
      return;
    }

    const baseROI = calculateBaseROI(allPiggies.length);
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
            <span class="badge ${piggy.isComplete ? 'badge--success' : 'badge--primary'}">
              ${piggy.isComplete ? '✓ Completado' : `${piggy.daysLeft} días restantes`}
            </span>
          </div>

          <!-- Progress section -->
          <div class="section animate-fade-in-up" style="animation-delay:0.1s;">
            <h3 class="section__title">Ciclo de Engorde</h3>
            <div class="piggy-detail__progress-card card">
              <div class="piggy-card__progress-header">
                <span class="text-sm text-muted">Progreso general</span>
                <span class="text-md font-bold text-primary">${piggy.progress}%</span>
              </div>
              <div class="progress" style="height: 12px;">
                <div class="progress__bar" style="width: ${piggy.progress}%; ${piggy.isComplete ? 'background: linear-gradient(135deg, #10B981, #059669);' : ''}"></div>
              </div>
              <div class="grid-2 mt-md">
                <div class="piggy-detail__metric">
                  ${renderIcon('clock', '', '16')}
                  <div>
                    <div class="text-xs text-muted">Tiempo restante</div>
                    <div class="font-semibold">${piggy.daysLeft} días</div>
                  </div>
                </div>
                <div class="piggy-detail__metric">
                  <span style="font-size:16px;">⚖️</span>
                  <div>
                    <div class="text-xs text-muted">Peso estimado</div>
                    <div class="font-semibold">${piggy.currentWeight} kg</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Financial info -->
          <div class="section animate-fade-in-up" style="animation-delay:0.2s;">
            <h3 class="section__title">Información Comercial</h3>
            <div class="card">
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">Preventa Comercial</span>
                <span class="font-semibold">${formatCOP(piggy.investment_amount)}</span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">Comisión Comercial Variable</span>
                <span class="font-semibold" style="display:flex;align-items:center;gap:6px;">${formatPercentage(baseROI)}<span class="info-tooltip-wrapper" data-tooltip="Identifica el porcentaje sobre la comercialización del cerdo. Se establece entre el 8% al 13% según la variación del mercado."><span class="info-icon">ℹ</span><span class="info-tooltip-bubble">Identifica el porcentaje sobre la comercialización del cerdo. Se establece entre el 8% al 13% según la variación del mercado.</span></span></span>
              </div>
              ${piggy.extra_roi_bonus > 0 ? `
                <div class="piggy-detail__finance-row">
                  <span class="text-sm text-muted">Comisión Extra</span>
                  <span class="font-semibold text-primary" style="display:flex;align-items:center;gap:6px;">+${formatPercentage(piggy.extra_roi_bonus)}<span class="info-tooltip-wrapper" data-tooltip="Se establece una adición debido a la venta del cerdo en un mercado premium."><span class="info-icon">ℹ</span><span class="info-tooltip-bubble">Se establece una adición debido a la venta del cerdo en un mercado premium.</span></span></span>
                </div>
              ` : ''}
              <div class="divider" style="margin: var(--space-sm) 0;"></div>
              <div class="piggy-detail__finance-row">
                <span class="font-semibold">Comisión Comercial</span>
                <span class="font-bold text-primary" style="font-size:var(--text-lg);">${formatCOP(gain)}</span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="font-semibold">Saldo del Cierre Comercial</span>
                <span class="font-bold" style="font-size:var(--text-lg);">${formatCOP(projectedReturn)}</span>
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
