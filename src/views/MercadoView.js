/* ============================================
   PIGGY APP — Mercado View (Piggy Marketplace)
   Fixed-slot adoption store with single-piggy limits,
   real-time inventory indicators, and adoption modal.
   ============================================ */

import { getMarketplaceItems, getMarketplaceStats, updateItemStock } from '../services/marketplaceService.js';
import { formatCOP, formatWeight, getGrowthPhaseName } from '../services/mockData.js';
import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';
import { getWalletBalance, deductWalletBalance } from '../services/walletService.js';
import { buyMarketplaceItem } from '../services/piggiesService.js';
import { openWalletDrawer } from './granja/WalletBlock.js';

let _activeFilter = 'todos';
let _allItems = [];

/**
 * Renders the Mercado / Adopción view.
 * @returns {Promise<string>} HTML string
 */
export async function renderMercadoView() {
    let items = [];
    let stats = { totalAvailable: 0, categoriesCount: 0 };

    try {
        [items, stats] = await Promise.all([
            getMarketplaceItems(),
            getMarketplaceStats(),
        ]);
        _allItems = items;
    } catch (err) {
        console.error('Error loading marketplace data:', err);
    }

    return `
    <div class="mercado-view">
      <!-- Top App Bar -->
      <header class="top-nav">
        <div class="top-nav__content" style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="top-nav__btn" id="btn-back-mercado" title="Volver a la Granja" style="background:none; border:none; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;">
              ${renderIcon('arrowLeft', '', '22')}
            </button>
            <h1 class="top-nav__title" style="margin:0; font-size:1.15rem; font-weight:800;">Mercado Piggy</h1>
          </div>
          <span class="badge" style="background:rgba(255,255,255,0.2); color:white; font-size:0.75rem; padding:4px 10px; border-radius:12px;">
            ${stats.totalAvailable} cupos disponibles
          </span>
        </div>
      </header>

      <main class="main-content" style="padding-top: 20px; padding-bottom: 90px;">

        <!-- Hero Header -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.05s;">
          <div style="
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 20px;
            padding: 24px;
            color: white;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px -5px rgba(16,185,129,0.3);
          ">
            <div style="position:relative; z-index:2;">
              <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.2); padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; margin-bottom:10px;">
                <span>🐷</span>
                <span>Cerditos de Engorde</span>
              </div>
              <h2 style="margin:0 0 6px 0; font-size:1.4rem; font-weight:900; line-height:1.2;">
                Adopta tu Piggy
              </h2>
              <p style="margin:0; font-size:0.85rem; opacity:0.9; line-height:1.4;">
                Cada piggy tiene un cupo único. Todos los cerditos generan el mismo margen comercial base con opción de bonificación especial.
              </p>
            </div>
            <!-- Background pig silhouette -->
            <div style="position:absolute; right:-15px; bottom:-20px; opacity:0.12; font-size:120px; line-height:1; pointer-events:none; select:none;">
              🐷
            </div>
          </div>
        </div>

        <!-- Category Filters -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s; margin-top: 16px;">
          <div class="filter-chips" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none;">
            <button class="filter-chip filter-chip--active" data-filter="todos">
              Todos (${items.length})
            </button>
            <button class="filter-chip" data-filter="standard">
              Mes 1 (Inicio)
            </button>
            <button class="filter-chip" data-filter="avanzado30">
              ⚡ Avanzados (Mes 2+)
            </button>
            <button class="filter-chip" data-filter="plus">
              🌟 Plus (+1%)
            </button>
            <button class="filter-chip" data-filter="dorado">
              🥇 Dorados (+2%)
            </button>
          </div>
        </div>

        <!-- Product Cards Grid -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.15s; margin-top: 16px;">
          <div id="marketplace-grid" style="display:grid; grid-template-columns: 1fr; gap:16px;">
            ${renderItemCards(items)}
          </div>
        </div>

        <!-- Security / Guarantee Notice -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.2s; margin-top: 24px;">
          <div style="
            background: var(--color-surface, white);
            border: 1px solid var(--color-border, #e5e7eb);
            border-radius: 16px;
            padding: 18px 20px;
            display: flex;
            align-items: flex-start;
            gap: 14px;
          ">
            <div style="
              width: 42px;
              height: 42px;
              border-radius: 12px;
              background: #ecfdf5;
              color: #059669;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">
              ${renderIcon('shield', '', '22')}
            </div>
            <div>
              <div style="font-weight:800; font-size:0.9rem; color:var(--color-text,#1f2937); margin-bottom:2px;">
                Garantía Granja Piggy
              </div>
              <div style="font-size:0.78rem; color:var(--color-text-secondary,#6b7280); line-height:1.4;">
                Cuidado integral incluido durante todo el ciclo de engorde (144 días). Seguimiento de peso semanal y liquidación al completar el ciclo.
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  `;
}

/**
 * Generates the HTML for the product cards list.
 * @param {Array} items
 * @returns {string}
 */
function renderItemCards(items) {
    if (!items || items.length === 0) {
        return `
      <div style="text-align:center; padding: 40px 20px; color: var(--color-text-secondary, #6b7280);">
        <div style="font-size: 48px; margin-bottom: 12px;">🐷</div>
        <div style="font-weight:700; font-size:1rem; margin-bottom:4px;">No hay cerditos en esta categoría</div>
        <div style="font-size:0.82rem;">Pronto habilitaremos más cupos de adopción.</div>
      </div>
    `;
    }

    return items.map((item) => {
        const isSoldOut = item.stock <= 0;
        const phaseName = getGrowthPhaseName(item.currentMonth || item.current_month || 1);
        const weightFormatted = formatWeight(item.current_weight || 15.0);
        const isAdvanced = item.days_advanced > 0;
        const isDorado = item.category === 'dorado' || item.category === 'gold';
        const isPlus = item.category === 'plus' || item.category === 'silver';

        let badgeBg = '#f3f4f6';
        let badgeColor = '#374151';
        let badgeText = `Mes ${item.currentMonth || item.current_month || 1}`;

        if (isDorado) {
            badgeBg = '#fef3c7';
            badgeColor = '#92400e';
            badgeText = '🥇 DORADO · +2% ROI';
        } else if (isPlus) {
            badgeBg = '#e0f2fe';
            badgeColor = '#0369a1';
            badgeText = '🌟 PLUS · +1% ROI';
        } else if (isAdvanced) {
            badgeBg = '#f3e8ff';
            badgeColor = '#6b21a8';
            badgeText = `⚡ AHORRA ${item.days_advanced} DÍAS`;
        }

        const cardBorder = isDorado
            ? '2px solid #f59e0b'
            : isPlus
                ? '2px solid #0ea5e9'
                : '1px solid var(--color-border, #e5e7eb)';

        return `
      <div class="marketplace-card" data-item-id="${item.id}" style="
        background: var(--color-surface, white);
        border: ${cardBorder};
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 15px -3px rgba(0,0,0,0.07);
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        flex-direction: column;
      ">
        <!-- Card Top: Image + Badges -->
        <div style="position:relative; width:100%; height:160px; background:#f9fafb; overflow:hidden;">
          <img
            src="${item.image_url}"
            alt="${item.item_name}"
            style="width:100%; height:100%; object-fit:cover; display:block;"
            onerror="this.src='assets/piggies/stage1/et1-1.jpg'"
          />
          
          <!-- Category Badge -->
          <div style="
            position: absolute;
            top: 12px;
            left: 12px;
            background: ${badgeBg};
            color: ${badgeColor};
            font-size: 0.7rem;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 20px;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          ">
            ${badgeText}
          </div>

          <!-- Stock Indicator -->
          <div style="
            position: absolute;
            top: 12px;
            right: 12px;
            background: ${isSoldOut ? '#ef4444' : 'rgba(0,0,0,0.65)'};
            backdrop-filter: blur(4px);
            color: white;
            font-size: 0.68rem;
            font-weight: 700;
            padding: 4px 9px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span style="width:6px; height:6px; border-radius:50%; background:${isSoldOut ? '#fff' : '#22c55e'}; display:inline-block;"></span>
            ${isSoldOut ? 'Agotado' : `${item.stock} disponible`}
          </div>

          <!-- Growth Phase Pill at bottom of image -->
          <div style="
            position: absolute;
            bottom: 8px;
            left: 12px;
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(4px);
            color: #1f2937;
            font-size: 0.72rem;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 8px;
          ">
            Etapa: ${phaseName} · ${weightFormatted}
          </div>
        </div>

        <!-- Card Body -->
        <div style="padding: 18px 20px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <h3 style="margin:0; font-size:1.1rem; font-weight:800; color:var(--color-text,#1f2937);">
                ${item.item_name}
              </h3>
            </div>
            
            <p style="margin:0 0 14px 0; font-size:0.8rem; color:var(--color-text-secondary,#6b7280); line-height:1.4;">
              ${item.description}
            </p>

            <!-- Metrics Row -->
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              background: var(--color-bg-secondary, #f8fafc);
              border-radius: 12px;
              padding: 10px 14px;
              margin-bottom: 16px;
            ">
              <div>
                <div style="font-size:0.68rem; color:var(--color-text-secondary,#9ca3af); font-weight:600; text-transform:uppercase;">Días restantes</div>
                <div style="font-size:0.95rem; font-weight:800; color:var(--color-text,#1f2937);">${item.days_remaining} días</div>
              </div>
              <div>
                <div style="font-size:0.68rem; color:var(--color-text-secondary,#9ca3af); font-weight:600; text-transform:uppercase;">Margen Comercial</div>
                <div style="font-size:0.95rem; font-weight:800; color:#059669;">
                  ${item.extra_roi > 0 ? `Base + ${(item.extra_roi * 100).toFixed(0)}%` : 'Margen Base'}
                </div>
              </div>
            </div>
          </div>

          <!-- Price + Adopt Button -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:12px; border-top:1px solid var(--color-border,#f3f4f6);">
            <div>
              <div style="font-size:0.68rem; color:var(--color-text-secondary,#9ca3af); font-weight:600; text-transform:uppercase;">Inversión</div>
              <div style="font-size:1.25rem; font-weight:900; color:var(--color-primary,#059669); line-height:1;">
                ${item.priceFormatted}
              </div>
            </div>

            <button
              class="btn-adoptar"
              data-item-id="${item.id}"
              ${isSoldOut ? 'disabled' : ''}
              style="
                background: ${isSoldOut ? '#e5e7eb' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'};
                color: ${isSoldOut ? '#9ca3af' : 'white'};
                border: none;
                padding: 11px 22px;
                border-radius: 12px;
                font-weight: 800;
                font-size: 0.88rem;
                cursor: ${isSoldOut ? 'not-allowed' : 'pointer'};
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: ${isSoldOut ? 'none' : '0 4px 12px rgba(16,185,129,0.3)'};
                transition: transform 0.15s, box-shadow 0.15s;
              "
            >
              <span>${isSoldOut ? 'Sin cupos' : 'Adoptar'}</span>
              ${!isSoldOut ? '<span>→</span>' : ''}
            </button>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

/**
 * Attaches event listeners for the Mercado view.
 */
export function attachMercadoListeners() {
    // Back button -> navigate to granja
    const btnBack = document.getElementById('btn-back-mercado');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            navigateTo('granja');
        });
    }

    // Filter chips
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => {
                c.classList.remove('filter-chip--active');
                c.style.background = '';
                c.style.color = '';
            });
            const target = e.currentTarget;
            target.classList.add('filter-chip--active');
            _activeFilter = target.dataset.filter;
            applyFilter(_activeFilter);
        });
    });

    // Adopt buttons -> open checkout modal
    attachAdoptButtons();
}

/**
 * Attaches click handlers to all "Adoptar" buttons.
 */
function attachAdoptButtons() {
    const buttons = document.querySelectorAll('.btn-adoptar:not([disabled])');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = e.currentTarget.dataset.itemId;
            const item = _allItems.find(i => i.id === itemId);
            if (item) {
                showCheckoutModal(item);
            }
        });
    });
}

/**
 * Filters the product grid dynamically.
 * @param {string} filter
 */
function applyFilter(filter) {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;

    let filtered = _allItems;
    if (filter === 'standard') {
        filtered = _allItems.filter(i => (i.currentMonth === 1 || i.current_month === 1) && i.category === 'standard');
    } else if (filter === 'avanzado30') {
        filtered = _allItems.filter(i => i.days_advanced > 0);
    } else if (filter === 'plus') {
        filtered = _allItems.filter(i => i.category === 'plus' || i.category === 'silver');
    } else if (filter === 'dorado') {
        filtered = _allItems.filter(i => i.category === 'dorado' || i.category === 'gold');
    }

    grid.innerHTML = renderItemCards(filtered);
    attachAdoptButtons();
}

/**
 * Shows the checkout / adoption confirmation modal.
 * @param {Object} item - Marketplace product item
 */
export function showCheckoutModal(item) {
    const existing = document.getElementById('checkout-modal');
    if (existing) existing.remove();

    const suggestedNames = ['Porky', 'Bacon', 'Piggy', 'Toby', 'Max', 'Gordo', 'Copito', 'Rocky'];
    const randomNames = suggestedNames.sort(() => 0.5 - Math.random()).slice(0, 3);
    const isSpecialItem = item.category === 'dorado' || item.category === 'gold' || item.category === 'avanzado60' || item.category === 'advanced60';

    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100dvh;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 99999;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  `;

    modal.innerHTML = `
    <div class="animate-fade-in-up" style="
      background: var(--color-surface, white);
      border-radius: 28px 28px 0 0;
      width: 100%;
      max-width: 480px;
      max-height: 90dvh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 0 0 calc(40px + env(safe-area-inset-bottom, 0px)) 0;
      position: relative;
    ">
      <!-- Handle -->
      <div style="width:40px; height:4px; background:#e5e7eb; border-radius:2px; margin: 12px auto 0;"></div>

      <!-- Close Button -->
      <button id="btn-close-checkout" style="
        position: absolute;
        top: 16px;
        right: 16px;
        background: #f3f4f6;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
      ">&times;</button>

      <!-- Content -->
      <div style="padding: 20px 24px 0 24px;">

        <!-- Product Preview Header -->
        <div style="display:flex; gap:16px; align-items:center; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #f3f4f6;">
          <img
            src="${item.image_url}"
            alt="${item.item_name}"
            style="width:70px; height:70px; border-radius:14px; object-fit:cover; flex-shrink:0;"
            onerror="this.src='assets/piggies/stage1/et1-1.jpg'"
          />
          <div>
            <span style="font-size:0.7rem; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:0.5px;">Adopción Inmediata</span>
            <h2 style="margin:2px 0 4px 0; font-size:1.15rem; font-weight:900; color:#1f2937;">${item.item_name}</h2>
            <div style="font-size:1.2rem; font-weight:900; color:#059669;">${item.priceFormatted}</div>
          </div>
        </div>

        <!-- Name Input -->
        <div style="margin-bottom: 20px;">
          <label style="font-size:0.82rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">
            Ponle un nombre a tu nuevo Piggy
          </label>
          <input
            type="text"
            id="checkout-piggy-name"
            placeholder="Ej: Porky, Copito..."
            autocomplete="off"
            style="
              width: 100%;
              padding: 14px 16px;
              box-sizing: border-box;
              border: 2px solid #e5e7eb;
              border-radius: 14px;
              font-size: 1rem;
              font-weight: 600;
              color: #1f2937;
              outline: none;
              text-align: center;
              transition: border-color 0.2s;
            "
            onfocus="this.style.borderColor='#10b981'"
            onblur="this.style.borderColor='#e5e7eb'"
          />
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; justify-content:center;">
            ${randomNames.map(n => `
              <button class="name-suggestion" style="
                background: #f0fdf4;
                color: #059669;
                border: 1px solid #bbf7d0;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.78rem;
                font-weight: 600;
                cursor: pointer;
              ">${n}</button>
            `).join('')}
          </div>
          <div id="name-error" style="color:#ef4444; font-size:0.75rem; margin-top:4px; display:none; text-align:center;">
            * Escribe un nombre de al menos 3 caracteres
          </div>
        </div>

        <!-- Wallet Balance Card (Dynamic Green Container) -->
        <div id="wallet-balance-container" style="
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 12px;
          color: white;
          position: relative;
          overflow: hidden;
        ">
          <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px;">Saldo disponible en tu Cuenta Agro</div>
          <div id="wallet-balance-display" style="font-size:1.8rem; font-weight:800; letter-spacing:-0.5px; line-height:1;">
            <span class="spinner" style="width:20px;height:20px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
          </div>
          <div style="position:absolute; bottom:-10px; right:-10px; opacity:0.1;">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          </div>
        </div>

        <!-- Recharge Button -->
        <button id="btn-recargar-checkout" style="
          width: 100%;
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          transition: all 0.2s;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          Recargar mi Cuenta
        </button>

        <!-- Insufficient Balance Alert -->
        <div id="insufficient-alert" style="
          display: none;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
          font-size: 0.82rem;
          color: #dc2626;
          text-align: center;
        ">
          ⚠️ Saldo insuficiente en tu Cuenta Agro. Recarga saldo para continuar con la adopción.
        </div>

        <!-- Investment Breakdown Summary Card -->
        <div style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          font-size: 0.82rem;
        ">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:#64748b;">
            <span>Valor de Inversión</span>
            <span style="font-weight:700; color:#1e293b;">${item.priceFormatted}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:#64748b;">
            <span>Cuidado y Alimentación</span>
            <span style="font-weight:700; color:#059669;">Incluido (0 COP)</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:#64748b;">
            <span>Duración del Ciclo</span>
            <span style="font-weight:700; color:#1e293b;">${item.days_remaining} días restantes</span>
          </div>
          <div style="border-top:1px dashed #cbd5e1; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; font-weight:800; color:#059669; font-size:0.88rem;">
            <span>Total a Descontar</span>
            <span>${item.priceFormatted}</span>
          </div>
        </div>

        <!-- Action Button -->
        <button id="btn-confirm-adopt" style="
          width: 100%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 15px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(16,185,129,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s, opacity 0.2s;
        ">
          <span>Firmar Contrato y Adoptar</span>
          <span>✍️</span>
        </button>

        <!-- Terms Footnote -->
        <p style="text-align:center; margin:12px 0 0 0; font-size:0.72rem; color:#9ca3af; line-height:1.3;">
          🔒 Al continuar, serás dirigido a firmar tu contrato digital seguro de adopción.
        </p>

      </div>
    </div>
  `;

    document.body.appendChild(modal);

    // ── Logic inside Modal ──────────────────────────────────────
    const inputName = document.getElementById('checkout-piggy-name');
    const nameError = document.getElementById('name-error');
    const balanceDisplay = document.getElementById('wallet-balance-display');
    const alertInsufficient = document.getElementById('insufficient-alert');
    const btnConfirm = document.getElementById('btn-confirm-adopt');
    const btnClose = document.getElementById('btn-close-checkout');
    let currentBalance = 0;

    // Suggestion chip clicks
    document.querySelectorAll('.name-suggestion').forEach(chip => {
        chip.addEventListener('click', () => {
            inputName.value = chip.textContent.trim();
            nameError.style.display = 'none';
        });
    });

    // Close logic
    const closeModal = () => {
        document.body.style.overflow = '';
        modal.remove();
    };
    btnClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Load Wallet Balance
    getWalletBalance().then(balance => {
        currentBalance = balance;
        balanceDisplay.textContent = formatCOP(balance);

        if (balance < item.price) {
            alertInsufficient.style.display = 'block';
            const btnRecargar = document.getElementById('btn-recargar-checkout');
            if (btnRecargar) btnRecargar.style.display = 'flex';
        }
    }).catch(err => {
        console.warn('Error fetching wallet balance:', err);
        balanceDisplay.textContent = '$0';
    });

    // Recargar button handler
    const btnRecargar = document.getElementById('btn-recargar-checkout');
    if (btnRecargar) {
        btnRecargar.addEventListener('click', async () => {
            const originalText = btnRecargar.innerHTML;
            btnRecargar.innerHTML = '<span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Cargando Wallet...';
            btnRecargar.style.pointerEvents = 'none';
            try {
                await openWalletDrawer(true);
                closeModal();
            } catch (e) {
                console.error('Error opening wallet from checkout:', e);
                btnRecargar.innerHTML = originalText;
                btnRecargar.style.pointerEvents = 'auto';
            }
        });
    }

    // Confirm Adoption Handler -> Digital Contract Signing Flow
    btnConfirm.addEventListener('click', () => {
        const customName = inputName.value.trim();

        if (customName.length < 3) {
            nameError.style.display = 'block';
            inputName.focus();
            return;
        }

        if (currentBalance < item.price) {
            alertInsufficient.style.display = 'block';
            return;
        }

        // Attach chosen name to item payload
        const pendingItem = { ...item, name: customName };

        // Save in sessionStorage as single source of truth for contract
        sessionStorage.setItem('pending_piggy_name', customName);
        sessionStorage.setItem('pending_marketplace_item', JSON.stringify(pendingItem));

        closeModal();

        // Navigate to contract view
        navigateTo(`contrato?name=${encodeURIComponent(customName)}&price=${item.price}&itemId=${encodeURIComponent(item.id)}`);
    });
}
