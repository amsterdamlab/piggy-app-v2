/* ============================================
   PIGGY APP — Piggy Detail View
   Individual pig view with progress and liquidation
   ============================================ */

import { renderIcon } from '../icons.js';
import { getPiggyById, calculateBaseROI, formatCOP, formatPercentage, getDaysRemaining } from '../services/piggiesService.js';
import { getUserPiggies } from '../services/piggiesService.js';
import { getRouteParam, navigateTo } from '../router.js';

/**
 * Render the Piggy Detail view.
 */
export function renderPiggyDetailView() {
  const piggyId = getRouteParam();
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page piggy-detail-page">
      <div class="page__content">
        <div class="loading-container">
          <div class="spinner"></div>
          <span>Cargando detalles...</span>
        </div>
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
            <div class="piggy-detail__avatar" style="overflow: hidden; border-radius: 50%; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: #fff;">
              <img src="pig1.png" alt="Piggy" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <h2 class="piggy-detail__name">${piggy.name}</h2>
            <span class="badge ${piggy.isComplete ? 'badge--success' : 'badge--primary'}">
              ${piggy.isComplete ? '✓ Ciclo Completado' : `${piggy.daysLeft} días restantes`}
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
                <div class="progress__bar" style="width: ${piggy.progress}%;"></div>
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
            <h3 class="section__title">Información Financiera</h3>
            <div class="card">
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">Bono de Preventa</span>
                <span class="font-semibold">${formatCOP(piggy.investment_amount)}</span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="text-sm text-muted">Margen Comercial Estimado</span>
                <span class="font-semibold">${formatPercentage(baseROI)}</span>
              </div>
              ${piggy.extra_roi_bonus > 0 ? `
                <div class="piggy-detail__finance-row">
                  <span class="text-sm text-muted">Bono Extra</span>
                  <span class="font-semibold text-primary">+${formatPercentage(piggy.extra_roi_bonus)}</span>
                </div>
              ` : ''}
              <div class="divider" style="margin: var(--space-sm) 0;"></div>
              <div class="piggy-detail__finance-row">
                <span class="font-semibold">Diferencial de Preventa</span>
                <span class="font-bold text-primary" style="font-size:var(--text-lg);">${formatCOP(gain)}</span>
              </div>
              <div class="piggy-detail__finance-row">
                <span class="font-semibold">Disponibilidad al Cierre Comercial</span>
                <span class="font-bold" style="font-size:var(--text-lg);">${formatCOP(projectedReturn)}</span>
              </div>
            </div>
          </div>

          <!-- Liquidation (only if cycle complete) -->
          ${piggy.isComplete ? `
            <div class="section animate-fade-in-up" style="animation-delay:0.3s;">
              <h3 class="section__title">Opciones de Liquidación</h3>
              <div class="piggy-detail__liquidation">
                <button class="btn btn--primary btn--block" id="btn-monetize">
                  ${renderIcon('dollar', '', '20')}
                  Monetizar — Transferencia Bancaria
                </button>
                <button class="btn btn--secondary btn--block" id="btn-consume" style="margin-top:var(--space-sm);">
                  ${renderIcon('qrCode', '', '20')}
                  Consumo — Canjear Producto
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
  } catch (error) {
    console.error('Error loading piggy detail:', error);
    navigateTo('granja');
  }
}
