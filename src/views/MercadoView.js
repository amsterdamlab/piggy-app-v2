/* ============================================
   PIGGY APP — Mercado (Marketplace) View
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';

/**
 * Render the Mercado (Marketplace) view.
 */
export function renderMercadoView() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="page page--with-nav mercado-page">
      <div class="page__content">
        <h2 class="mercado-title animate-fade-in-up">Mercado</h2>
        <p class="mercado-subtitle animate-fade-in-up">Adopta un nuevo Piggy o potencia tu granja con aceleradores.</p>

        <div id="mercado-content">
          <div class="loading-container">
            <div class="spinner"></div>
            <span>Cargando el mercado...</span>
          </div>
        </div>
      </div>
      ${renderBottomNav('mercado')}
    </div>
  `;

    loadMarketplaceData();

    return () => { };
}

/**
 * Load marketplace data.
 */
async function loadMarketplaceData() {
    try {
        const items = await getMarketplaceItems();
        const container = document.getElementById('mercado-content');
        if (!container) return;

        const standardItems = items.filter((item) => item.category === 'standard');
        const acceleratorItems = items.filter((item) => item.category === 'accelerator');
        const boosterItems = items.filter((item) => item.category === 'booster');

        container.innerHTML = `
      <!-- Standard Piggies -->
      ${standardItems.length ? `
        <div class="section animate-fade-in-up">
          <div class="section__header">
            <h3 class="section__title">🐷 Piggies Disponibles</h3>
          </div>
          <div class="mercado-grid">
            ${standardItems.map(renderMarketplaceCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Accelerators -->
      ${acceleratorItems.length ? `
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s;">
          <div class="section__header">
            <h3 class="section__title">🚀 Aceleradores</h3>
            <span class="badge badge--warning">ROI Extra</span>
          </div>
          <div class="mercado-grid">
            ${acceleratorItems.map(renderMarketplaceCard).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Boosters -->
      ${boosterItems.length ? `
        <div class="section animate-fade-in-up" style="animation-delay: 0.2s;">
          <div class="section__header">
            <h3 class="section__title">⚡ Potenciadores</h3>
          </div>
          <div class="mercado-grid">
            ${boosterItems.map(renderMarketplaceCard).join('')}
          </div>
        </div>
      ` : ''}
    `;
    } catch (error) {
        console.error('Error loading marketplace:', error);
        const container = document.getElementById('mercado-content');
        if (container) {
            container.innerHTML = `
        <div class="auth-form__error auth-form__error--visible">
          Error al cargar el mercado. Intenta de nuevo.
        </div>
      `;
        }
    }
}

/**
 * Render a marketplace card.
 */
function renderMarketplaceCard(item) {
    return `
    <div class="mercado-card card animate-scale-in">
      <div class="mercado-card__image">
        ${renderIcon('pigFace', '', '48')}
        ${item.hasBonus ? `
          <span class="mercado-card__bonus">${item.bonusText} ROI</span>
        ` : ''}
      </div>
      <div class="mercado-card__body">
        <h4 class="mercado-card__name">${item.item_name}</h4>
        <p class="mercado-card__desc">${item.description}</p>
        <div class="mercado-card__footer">
          <span class="mercado-card__price">${item.priceFormatted}</span>
          <button class="btn btn--primary btn--sm" id="buy-${item.id}">
            Comprar
          </button>
        </div>
        <div class="mercado-card__stock text-xs text-muted">
          ${item.stock} disponibles
        </div>
      </div>
    </div>
  `;
}
