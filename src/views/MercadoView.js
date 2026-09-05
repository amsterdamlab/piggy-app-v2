/* ============================================
   PIGGY APP — Mercado (Marketplace) View
   Streamlined Direct Purchase Flow (Wallet-based)
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { navigateTo } from '../router.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { buyMarketplaceItem } from '../services/piggiesService.js';
import { getWalletBalance, formatCOP, deductWalletBalance, addWalletBalance } from '../services/walletService.js';
import { AppState } from '../state.js';
import { openWalletRechargeInfo, openWalletDrawer } from './granja/WalletBlock.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

/** In-memory cache */
let cachedItems = [];

/**
 * Generate a stable photo number (1-5) for marketplace items.
 */
function getMarketplacePhotoNumber(itemId) {
  let hash = 0;
  const str = String(itemId || 'default');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 5) + 1;
}

/**
 * Render the Mercado (Marketplace) view.
 */
export function renderMercadoView() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page page--with-nav mercado-page">
      <div class="page__content">

        <!-- Header -->
        <div class="mercado-header animate-fade-in-up">
          <h2 class="mercado-title">Mercado</h2>
          <p class="mercado-subtitle">Compra piggys exclusivos en el mercado para que tu granja siga creciendo.</p>
        </div>

        <!-- Products List -->
        <div id="mercado-content">
          ${renderPiggyLoader('Cargando el mercado...')}
        </div>

      </div>
      ${renderBottomNav('mercado')}
    </div>
  `;

  loadMarketplaceData();

  return () => { };
}

/**
 * Load marketplace data from service.
 */
async function loadMarketplaceData() {
  try {
    const items = await getMarketplaceItems();
    cachedItems = items;
    renderItems(items);
  } catch (error) {
    console.error('Error loading marketplace:', error);
    const container = document.getElementById('mercado-content');
    if (container) {
      container.innerHTML = `
        <div class="mercado-empty">
          <p>Error al cargar el mercado. Intenta de nuevo.</p>
        </div>
      `;
    }
  }
}

/**
 * Render items list.
 */
function renderItems(items) {
  const container = document.getElementById('mercado-content');
  if (!container) return;

  // Filter out zero stock (service does it, but double check)
  const availableItems = items.filter(item => item.stock > 0);

  if (availableItems.length === 0) {
    container.innerHTML = `
      <div class="mercado-empty animate-fade-in-up">
        <span style="font-size:48px;">🔍</span>
        <p>No hay Piggies disponibles en este momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="mercado-list">
      ${availableItems.map(renderProductCard).join('')}
    </div>
  `;

  // Attach buy button listeners
  availableItems.forEach(item => {
    document.getElementById(`buy-${item.id}`)?.addEventListener('click', () => {
      showCheckoutModal(item);
    });
  });

  // Attach ribbon click listeners programmatically
  container.querySelectorAll('.js-ribbon').forEach(ribbon => {
    ribbon.addEventListener('click', (e) => {
      e.stopPropagation();
      const category = ribbon.getAttribute('data-category');
      if (category && window.showCategoryInfo) {
        window.showCategoryInfo(category);
      }
    });
  });

  // Attach image click listeners for category info
  container.querySelectorAll('.js-img-category').forEach(imgWrap => {
    imgWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      const category = imgWrap.getAttribute('data-category');
      if (category && window.showCategoryInfo) {
        window.showCategoryInfo(category);
      }
    });
  });
}

/**
 * Render a single horizontal product card.
 * Layout: Image left, Buy button below image. Details right.
 * Shows current_month and daysRemaining to motivate purchase of advanced piggies.
 */
/**
 * Render a single horizontal product card.
 * Layout: Image left, Buy button below image. Details right.
 * Shows current_month and daysRemaining to motivate purchase of advanced piggies.
 */
function renderProductCard(item) {
  const itemName = item.piggy_name || item.item_name || item.name || 'Piggy';

  // Safe daysAdvanced extraction according to category or type
  let daysAdvanced = item.daysAdvanced ?? item.days_advanced;
  if (daysAdvanced === undefined || daysAdvanced === null) {
    const daysMatch = itemName.match(/(\d+)\s*d[ií]as/i);
    if (daysMatch) {
      daysAdvanced = Number(daysMatch[1]);
    } else {
      const monthMatch = itemName.match(/(\d+)\s*Mes(es)?/i);
      if (monthMatch) {
        daysAdvanced = (Number(monthMatch[1]) - 1) * 30;
      } else {
        const cat = (item.category || '').toLowerCase();
        if (cat.includes('90')) daysAdvanced = 90;
        else if (cat.includes('75')) daysAdvanced = 75;
        else if (cat.includes('60')) daysAdvanced = 60;
        else if (cat.includes('45')) daysAdvanced = 45;
        else if (cat.includes('30')) daysAdvanced = 30;
        else if (cat === 'avanzado' || cat === 'advanced') daysAdvanced = 30;
        else daysAdvanced = 0;
      }
    }
  }

  let currentMonth = item.currentMonth || item.current_month || (daysAdvanced >= 90 ? 4 : daysAdvanced >= 60 ? 3 : daysAdvanced >= 30 ? 2 : 1);
  const daysRemaining = item.daysRemaining || Math.max(1, 144 - daysAdvanced);
  const daysSaved = daysAdvanced;
  const isAdvanced = daysSaved > 0;
  const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
  let imgSrc = item.image_url || `/assets/piggies/stage${stage}/et${stage}-1.jpg`;
  if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
    imgSrc = '/' + imgSrc;
  }

  const categoryLabels = {
    estandar: 'Estandar',
    standard: 'Estandar',
    estandard: 'Estandar',
    avanzado: 'Avanzado',
    advanced: 'Avanzado',
    avanzado30: 'Avanzado',
    advanced30: 'Avanzado',
    avanzado45: 'Avanzado',
    advanced45: 'Avanzado',
    avanzado60: 'Avanzado',
    advanced60: 'Avanzado',
    avanzado75: 'Avanzado',
    advanced75: 'Avanzado',
    avanzado90: 'Avanzado',
    advanced90: 'Avanzado',
    plus: 'Plus',
    silver: 'Plus',
    dorado: 'Dorado',
    gold: 'Dorado',
    premium: 'Premium',
  };

  let categoryKey = (item.category || '').toLowerCase();
  if (!categoryKey || categoryKey === 'standard' || categoryKey === 'estandar' || categoryKey === 'estandard') {
    if (daysSaved > 0 || currentMonth > 1) {
      categoryKey = 'avanzado';
    } else {
      categoryKey = 'estandar';
    }
  }

  const displayCategory = categoryLabels[categoryKey] || item.category || 'Estandar';
  const isEstandar = categoryKey === 'estandar' && daysSaved === 0;

  // Safe price resolution
  const rawPrice = item.price ?? item.investment_amount ?? item.amount ?? item.precio ?? 1000000;
  const numPrice = Number(rawPrice) || 1000000;
  const priceDisplay = item.priceFormatted || formatCOP(numPrice);

  return `
    <div class="mcard animate-fade-in-up">
      ${!isEstandar ? `
        <div class="mcard__ribbon mcard__ribbon--${categoryKey} js-ribbon" data-category="${categoryKey}" style="pointer-events: auto; cursor: pointer;">
          <span style="pointer-events: auto;">${displayCategory} ⓘ</span>
        </div>
      ` : ''}
      ${isAdvanced ? `<span class="mcard__time-badge">⚡ Ahorra ${daysSaved} días</span>` : ''}

      <!-- Left Column: Image + Buy Button -->
      <div class="mcard__left">
        <div class="mcard__img-wrap ${!isEstandar ? 'js-img-category' : ''}"
             ${!isEstandar ? `data-category="${categoryKey}" style="cursor: pointer;"` : ''}>
          <img src="${imgSrc}" alt="${itemName}" class="mcard__img" onerror="this.onerror=null;this.src='pig2.jpg'" />
        </div>
        
        <button class="mcard__buy-btn" id="buy-${item.id}">
          ${renderIcon('shop', '', '16')}
          Comprar
        </button>
      </div>

      <!-- Right Column: Details -->
      <div class="mcard__right">
        <h4 class="mcard__name" style="${!isEstandar ? 'padding-right: 65px;' : ''}">${itemName}</h4>
        <p class="mcard__desc">${item.description || 'Cerdo con excelente rendimiento y cuidado óptimo.'}</p>

        <!-- Info Row: Faltan + Weight (Countdown to cycle completion) -->
        <div class="mcard__info-row">
          <div class="mcard__info-item">
            <span class="mcard__info-label">FALTAN</span>
            <span class="mcard__info-value mcard__info-value--days">${daysRemaining} días</span>
          </div>

          <div class="mcard__info-divider"></div>
          <div class="mcard__info-item">
            <span class="mcard__info-label">PESO</span>
            <span class="mcard__info-value">${item.current_weight !== undefined && item.current_weight !== null ? item.current_weight : (daysAdvanced >= 90 ? 55.4 : daysAdvanced >= 60 ? 39.0 : daysAdvanced >= 30 ? 22.5 : 6.0)} kg</span>
          </div>
        </div>

        <!-- Price Info -->
        <div class="mcard__price-row">
            <span class="mcard__price">${priceDisplay}</span>
            <span class="mcard__stock">${item.stock ?? 1} disponibles</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show Full Screen Checkout for Direct Purchase.
 */
export function showCheckoutModal(item) {
  // Remove existing if any
  const existing = document.getElementById('checkout-modal');
  if (existing) existing.remove();

  // 1. Lock Body Scroll
  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'checkout-fullscreen animate-fade-in-up';

  // Style for full screen override
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100dvh';
  modal.style.backgroundColor = 'var(--color-bg, #FDF2F5)'; // Light pink background matching app theme
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.overflowY = 'auto'; // Internal scroll if needed

  const stage = (item.currentMonth || 1) >= 4 ? 3 : (item.currentMonth || 1) >= 2 ? 2 : 1;
  let imgSrc = item.image_url || `/assets/piggies/stage${stage}/et${stage}-1.jpg`;
  if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
    imgSrc = '/' + imgSrc;
  }

  // Random names for suggestions (pick 3)
  const suggestedNames = ['Bacon', 'Pumba', 'Rosita', 'Chuleta', 'Wilbur', 'Peggy', 'Torrezno', 'Gordi', 'Jamón'];
  const shuffled = suggestedNames.sort(() => 0.5 - Math.random()).slice(0, 3);

  modal.innerHTML = `
    <style>
      @keyframes pulseGlow7s {
        0%, 78%, 100% {
          transform: scale(1);
          box-shadow: 0 6px 20px -4px rgba(236, 72, 153, 0.4);
        }
        83% {
          transform: scale(1.03);
          box-shadow: 0 12px 28px rgba(236, 72, 153, 0.7), 0 0 20px rgba(255, 255, 255, 0.8);
        }
        88% {
          transform: scale(0.99);
          box-shadow: 0 6px 20px -4px rgba(236, 72, 153, 0.4);
        }
        93% {
          transform: scale(1.02);
          box-shadow: 0 10px 24px rgba(236, 72, 153, 0.6);
        }
      }
      @keyframes shineSweep7s {
        0%, 75% {
          left: -120%;
        }
        88%, 100% {
          left: 220%;
        }
      }
      .btn-pulse-glow-7s {
        position: relative !important;\n        overflow: hidden !important;\n        animation: pulseGlow7s 7s infinite ease-in-out !important;\n      }\n      .btn-pulse-glow-7s::after {\n        content: '';\n        position: absolute;\n        top: -50%;\n        left: -120%;\n        width: 60%;\n        height: 200%;\n        background: linear-gradient(\n          90deg, \n          rgba(255, 255, 255, 0) 0%, \n          rgba(255, 255, 255, 0.55) 50%, \n          rgba(255, 255, 255, 100%)\n        );\n        transform: rotate(25deg);\n        animation: shineSweep7s 7s infinite ease-in-out;\n        pointer-events: none;\n      }\n    </style>\n\n    <!-- Checkout Header matching Ciclos Completados structure -->\n    <div style=\"padding: 20px 24px 0 24px; background: var(--color-bg, #FDF2F5); flex-shrink: 0; position: sticky; top: 0; z-index: 10;\">\n        <div style=\"display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;\">\n          <h2 style=\"margin: 0; font-size: 1.75rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;\">Pasarela de Pago</h2>\n          <button id=\"checkout-close-btn\" style=\"\n              background: none; \n              border: none; \n              cursor: pointer; \n              color: #64748b; \n              font-size: 1.3rem; \n              font-weight: 600; \n              padding: 4px; \n              display: flex; \n              align-items: center; \n              justify-content: center; \n              transition: color 0.2s;\"\n              onmouseover=\"this.style.color='#0f172a';\"\n              onmouseout=\"this.style.color='#64748b'\">\n              ✕\n          </button>\n        </div>\n        <div style=\"height: 1px; background: #e2e8f0; width: 100%;\"></div>\n    </div>\n    \n    <!-- Checklist Body -->\n    <div class=\"checkout-body\" style=\"padding: 20px 20px 16px 20px; flex: 1; display: flex; flex-direction: column; align-items: center; background: var(--color-bg, #FDF2F5);\">\n      \n      <!-- Summary Section (Integrated with light pink background) -->\n      <div class=\"checkout-summary\" style=\"\n          width: 100%; \n          max-width: 400px; \n          text-align: center; \n          background: transparent;\n          padding: 0;\n          margin-bottom: 20px;\">\n          \n          <div style=\"\n              width: 76px; \n              height: 76px; \n              margin: 0 auto 12px; \n              border-radius: 50%; \n              overflow: hidden;\n              border: 3px solid white;\n              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\">\n              <img src=\"${imgSrc}\" style=\"width:100%; height:100%; object-fit:cover;\" onerror=\"this.onerror=null;this.src='pig2.jpg'\">\n          </div>\n          \n          <h2 style=\"font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.01em;\">¡Compra tu Piggy!</h2>\n          <p style=\"font-size: 0.88rem; color: #64748b; line-height: 1.4; margin: 0;\">\n            Un nuevo integrante para que tu granja siga creciendo desde\n          </p>\n          <div style=\"font-size: 1.4rem; font-weight: 850; color: var(--color-primary, #ec4899); margin-top: 4px;\">${formatCOP(item.price || item.investment_amount || item.amount || item.precio || 1000000)}</div>\n      </div>\n\n      <!-- Custom Name Input Section -->\n      <div class=\"form-group\" style=\"width: 100%; max-width: 400px; margin-bottom: 24px; text-align: center;\">\n           \n           <div style=\"margin-bottom: 12px;\">\n                <input type=\"text\" id=\"piggy-custom-name\" \n                       placeholder=\"Ponle un nombre a tu Piggy\"\n                       autocomplete=\"off\"\n                       style=\"\n                           width: 100%;\n                           padding: 14px 16px;\n                           border: 2px solid #fce7f3;\n                           border-radius: 14px;\n                           font-size: 1rem;\n                           font-weight: 600;\n                           color: var(--color-text-primary);\n                           outline: none;\n                           text-align: center;\n                           transition: all 0.2s;\n                           box-sizing: border-box;\n                           background: #fff;\n                       \"\n                       onfocus=\"this.style.borderColor='var(--color-primary)'; this.style.boxShadow='0 0 0 4px rgba(236, 72, 153, 0.1)';\"\n                       onblur=\"this.style.borderColor='#fce7f3'; this.style.boxShadow='none';\"\n                />\n           </div>\n\n           <!-- Name Suggestions (3 White Pills with 1px Intense Pink Border) -->\n           <div style=\"display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;\">\n               ${shuffled.map(name => `\n                  <button class=\"name-pill\" style=\"\n                      background: white; \n                      color: #db2777; \n                      border: 1px solid #ec4899; \n                      padding: 7px 16px; \n                      border-radius: 20px; \n                      font-size: 0.85rem; \n                      font-weight: 700; \n                      cursor: pointer;\n                      box-shadow: 0 2px 6px rgba(236, 72, 153, 0.08);\n                      transition: all 0.2s;\n                  \" \n                  onmouseover=\"this.style.background='#fdf2f8'; this.style.transform='translateY(-1px)';\"\n                  onmouseout=\"this.style.background='white'; this.style.transform='translateY(0)';\"\n                  onclick=\"selectPiggyName('${name}')\">${name}</button>\n               `).join('')}\n           </div>\n           \n           <div class=\"text-xs text-muted mt-sm fade-in\" id=\"name-error\" style=\"opacity:0; color:var(--color-primary); margin-top:8px;\">\n                * Debes darle un nombre para continuar\n           </div>\n      </div>\n\n      <!-- Wallet Section -->\n      <div id=\"wallet-checkout-section\" style=\"width: 100%; max-width: 400px; transition: opacity 0.3s;\">\n        \n        <!-- Balance Display -->\n        <div style=\"\n          background: linear-gradient(135deg, #10B981 0%, #059669 100%);\n          border-radius: 16px;\n          padding: 18px 20px;\n          margin-bottom: 12px;\n          color: white;\n          position: relative;\n          overflow: hidden;\n        \">\n          <div style=\"font-size:0.78rem; opacity:0.85; margin-bottom:4px;\">Saldo disponible en tu Wallet</div>\n          <div id=\"wallet-balance-display\" style=\"font-size:1.8rem; font-weight:800; letter-spacing:-0.5px; line-height:1;\">\n            <span class=\"spinner\" style=\"width:20px;height:20px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;\"></span>\n          </div>\n          <div style=\"position:absolute; bottom:-10px; right:-10px; opacity:0.1;\">\n            <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"80\" height=\"80\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M21 12V7H5a2 2 0 0 1 0-4h14v4\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h16v-5\"/><path d=\"M18 12a2 2 0 0 0 0 4h4v-4Z\"/></svg>\n          </div>\n        </div>\n\n        <!-- Recharge Button -->\n        <button id=\"btn-recargar-checkout\" style=\"\n          width: 100%;\n          background: linear-gradient(135deg, #7c3aed, #5b21b6);\n          color: white;\n          border: none;\n          padding: 14px 20px;\n          border-radius: 12px;\n          font-weight: 700;\n          font-size: 0.95rem;\n          cursor: pointer;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          gap: 8px;\n          margin-bottom: 12px;\n          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);\n          transition: all 0.2s;\n        \">\n          <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12V7H5a2 2 0 0 1 0-4h14v4\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h16v-5\"/><path d=\"M18 12a2 2 0 0 0 0 4h4v-4Z\"/></svg>\n          Recargar mi Cuenta\n        </button>\n\n        <!-- Insufficient funds notice (shown when balance < price) -->\n        <div id=\"insufficient-funds-notice\" style=\"\n          background:#fef2f2;\n          border:1px solid #fecaca;\n          border-radius:10px;\n          padding:12px 16px;\n          font-size:0.82rem;\n          color:#dc2626;\n          text-align:center;\n          margin-bottom:12px;\n          display:none;\n        \">\n          Saldo insuficiente. Recarga tu Cuenta para continuar.\n        </div>\n\n        <!-- Confirm Purchase Button (with 7s pulse & glow animation) -->\n        <button id=\"btn-confirm-purchase\" class=\"btn-pulse-glow-7s\" style=\"\n          width: 100%;\n          background: linear-gradient(135deg, #ec4899, #db2777);\n          color: white;\n          border: none;\n          padding: 14px 20px;\n          border-radius: 12px;\n          font-weight: 700;\n          font-size: 0.95rem;\n          cursor: pointer;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          gap: 8px;\n          box-shadow: 0 6px 20px -4px rgba(236,72,153,0.4);\n          transition: all 0.2s;\n          opacity: 0.5;\n          pointer-events: none;\n        \">\n          <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"display: inline-block; vertical-align: middle;\"><path d=\"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z\"/><path d=\"M2 9v1c0 1.1.9 2 2 2h1\"/><path d=\"M16 11h.01\"/></svg>\n          <span>Confirmar Compra</span>\n        </button>\n      </div>\n\n      <div class=\"checkout-footer\" style=\"margin-top: 16px; padding-top: 12px; padding-bottom: 16px; display: flex; justify-content: center;\">\n         <div class=\"secure-badge\" style=\"display: flex; gap: 20px; color: #94a3b8; font-size: 0.78rem; font-weight: 600; align-items: center;\">\n            <span style=\"display: flex; align-items: center; gap: 5px;\">\n              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></svg>\n              Pagos seguros\n            </span>\n            <span style=\"display: flex; align-items: center; gap: 5px;\">\n              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/></svg>\n              Cifrado SSL\n            </span>\n         </div>\n      </div>\n    </div>\n  `;\n\n  document.body.appendChild(modal);\n\n  // --- Logic ---\n\n  const input = document.getElementById('piggy-custom-name');\n  const walletSection = document.getElementById('wallet-checkout-section');\n  const balanceDisplay = document.getElementById('wallet-balance-display');\n  const insufficientNotice = document.getElementById('insufficient-funds-notice');\n  const confirmBtn = document.getElementById('btn-confirm-purchase');\n  const errorMsg = document.getElementById('name-error');\n  const recargarBtn = document.getElementById('btn-recargar-checkout');\n  const ADMIN_WHATSAPP = '573154870448';\n\n  const itemPrice = Number(item.price || item.investment_amount || item.amount || item.precio || 1000000);\n  let currentBalance = 0;\n\n  // Load wallet balance\n  getWalletBalance().then(balance => {\n    currentBalance = balance;\n    balanceDisplay.textContent = formatCOP(balance);\n    updatePurchaseState(input.value.trim());\n  }).catch(() => {\n    balanceDisplay.textContent = '$0';\n    updatePurchaseState(input.value.trim());\n  });\n\n  // Helper: update button states based on name + balance\n  const updatePurchaseState = (nameVal) => {\n    const nameValid = nameVal.length >= 3;\n    const hasFunds = currentBalance >= itemPrice;\n\n    // The wallet section itself should always be visible and active so the user can see their balance and click \"Recargar mi Cuenta\"\n    walletSection.style.opacity = '1';\n    walletSection.style.pointerEvents = 'auto';\n\n    // Show/hide insufficient funds notice and recharge button\n    insufficientNotice.style.display = !hasFunds ? 'block' : 'none';\n    recargarBtn.style.display = !hasFunds ? 'flex' : 'none';\n\n    // Enable confirm button directly if they have sufficient funds\n    if (hasFunds) {\n      confirmBtn.style.opacity = '1';\n      confirmBtn.style.pointerEvents = 'auto';\n    } else {\n      confirmBtn.style.opacity = '0.5';\n      confirmBtn.style.pointerEvents = 'none';\n    }\n\n    // Name validation feedback\n    if (nameValid) {\n      errorMsg.style.opacity = '0';\n      input.style.borderColor = '#10B981';\n    } else if (nameVal.length > 0) {\n      errorMsg.style.opacity = '1';\n      errorMsg.textContent = '* El nombre debe tener al menos 3 caracteres';\n      input.style.borderColor = '#dc2626';\n    } else {\n      errorMsg.style.opacity = '0';\n      input.style.borderColor = '#fce7f3';\n    }\n  };\n\n  // Input listener\n  input.addEventListener('input', () => updatePurchaseState(input.value.trim()));\n\n  // Suggestion Pills\n  window.selectPiggyName = (name) => {\n    input.value = name;\n    updatePurchaseState(name);\n    input.focus();\n  };\n\n  // Close Logic\n  const close = () => {\n    document.body.style.overflow = '';\n    delete window.selectPiggyName;\n    modal.remove();\n  };\n\n  document.getElementById('checkout-close-btn').addEventListener('click', close);\n\n  // Recargar Wallet\n  recargarBtn.addEventListener('click', async () => {\n    const originalText = recargarBtn.innerHTML;\n    recargarBtn.innerHTML = '<span class=\"spinner\" style=\"width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;\"></span> Cargando Wallet...';\n    recargarBtn.style.pointerEvents = 'none';\n    try {\n      await openWalletDrawer(true);\n      close();\n    } catch (e) {\n      console.error('Error opening wallet from mercado view:', e);\n      recargarBtn.innerHTML = originalText;\n      recargarBtn.style.pointerEvents = 'auto';\n    }\n  });\n\n  // Confirm Purchase -> Navigate to Contract Signing\n  confirmBtn.addEventListener('click', () => {\n    const customName = input.value.trim();\n     \n    // Check name validation on click\n    if (customName.length < 3) {\n      errorMsg.style.opacity = '1';\n      errorMsg.textContent = '* Debes darle un nombre de al menos 3 letras a tu cerdito';\n      input.style.borderColor = '#dc2626';\n      input.focus();\n      return;\n    }\n\n    if (currentBalance < itemPrice) return;\n\n    // Save pending purchase details in session\n    sessionStorage.setItem('pending_piggy_name', customName);\n    sessionStorage.setItem('pending_marketplace_item', JSON.stringify({ ...item, price: itemPrice }));\n\n    close();\n    navigateTo(`contrato?name=${encodeURIComponent(customName)}&price=${itemPrice}`);\n  });\n}\n\n/**\n * Show premium, dorado, plus, avanzado category explanations in a custom popup modal.\n */\nwindow.showCategoryInfo = (category) => {\n  const existing = document.getElementById('category-info-popup');\n  if (existing) existing.remove();\n\n  const normalized = (category || '').toLowerCase();\n  const infoTexts = {\n    premium: 'Con este cerdito obtienes un extra en comisión (+3%) debido a la venta del cerdo en cadenas de restaurantes y hospedajes premium.',\n    dorado: 'Con este cerdito obtienes un extra en comisión (+2%) debido a la venta del cerdo en empresas, colegios y hospitales.',\n    gold: 'Con este cerdito obtienes un extra en comisión (+2%) debido a la venta del cerdo en empresas, colegios y hospitales.',\n    plus: 'Con este cerdito obtienes un extra en comisión (+1%) debido a la venta del cerdo en tiendas, mini-markets y supermercados.',\n    silver: 'Con este cerdito obtienes un extra en comisión (+1%) debido a la venta del cerdo en tiendas, mini-markets y supermercados.',\n    avanzado: 'Cerdito en etapa avanzada con más tiempo de engorde. Si eres de los que no les gusta esperar, este cerdito te ahorra semanas de espera.',\n    advanced: 'Cerdito en etapa avanzada con más tiempo de engorde. Si eres de los que no les gusta esperar, este cerdito te ahorra semanas de espera.',\n    avanzado30: 'Cerdito con 30 días de engorde avanzado (114 días restantes). Ahorra 1 mes de espera.',\n    avanzado45: 'Cerdito con 45 días de engorde avanzado (99 días restantes). Ahorra 1.5 meses de espera.',\n    avanzado60: 'Cerdito con 60 días de engorde avanzado (84 días restantes). Ahorra 2 meses de espera.',\n    avanzado75: 'Cerdito con 75 días de engorde avanzado (69 días restantes). Ahorra 2.5 meses de espera.',\n    avanzado90: 'Cerdito con 90 días de engorde avanzado (54 días restantes). Máximo ahorro de tiempo.',\n    estandar: 'Cerdito de raza clásica con rendimiento sólido y cuidado óptimo durante todo el ciclo.',\n    standard: 'Cerdito de raza clásica con rendimiento sólido y cuidado óptimo durante todo el ciclo.'\n  };\n\n  const text = infoTexts[normalized] || 'Cerdito exclusivo disponible en el mercado Piggy.';\n\n  const colors = {\n    premium: { bg: 'linear-gradient(135deg, #EC4899, #9D174D)', color: '#FFF' },\n    dorado: { bg: 'linear-gradient(135deg, #F59E0B, #B45309)', color: '#FFF' },\n    gold: { bg: 'linear-gradient(135deg, #F59E0B, #B45309)', color: '#FFF' },\n    plus: { bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#FFF' },\n    silver: { bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#FFF' },\n    avanzado: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' },\n    advanced: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' },\n    avanzado30: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' },\n    avanzado45: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' },\n    avanzado60: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' },\n    avanzado75: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' },\n    avanzado90: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' },\n    estandar: { bg: 'linear-gradient(135deg, #EC4899, #BE185D)', color: '#FFF' },\n    standard: { bg: 'linear-gradient(135deg, #EC4899, #BE185D)', color: '#FFF' }\n  };\n\n  const theme = colors[normalized] || { bg: 'var(--color-primary)', color: '#FFF' };\n\n  const popup = document.createElement('div');\n  popup.id = 'category-info-popup';\n  popup.style.cssText = `\n    position: fixed;\n    top: 0; left: 0; width: 100%; height: 100dvh;\n    background: rgba(0, 0, 0, 0.4);\n    backdrop-filter: blur(4px);\n    -webkit-backdrop-filter: blur(4px);\n    z-index: 100000;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 20px;\n    box-sizing: border-box;\n  `;\n\n  const capitalizedCat = category.charAt(0).toUpperCase() + category.slice(1);\n\n  popup.innerHTML = `\n    <div class=\"animate-scale-in\" style=\"\n      background: white;\n      border-radius: 20px;\n      width: 100%;\n      max-width: 340px;\n      overflow: hidden;\n      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      position: relative;\n    \">\n      <div style=\"\n        background: ${theme.bg};\n        color: ${theme.color};\n        width: 100%;\n        padding: 20px 24px;\n        text-align: center;\n        font-weight: 800;\n        font-size: 1.15rem;\n        letter-spacing: 0.5px;\n        text-transform: uppercase;\n      \">\n        Categoría ${capitalizedCat}\n      </div>\n\n      <div style=\"padding: 24px 20px; text-align: center; font-size: 0.95rem; color: #4b5563; line-height: 1.5; font-weight: 500;\">\n        ${text}\n      </div>\n\n      <div style=\"width: 100%; padding: 0 20px 20px 20px; box-sizing: border-box;\">\n        <button id=\"btn-close-cat-popup\" style=\"\n          width: 100%;\n          background: #BE1260;\n          color: white;\n          border: none;\n          padding: 13px;\n          border-radius: 12px;\n          font-weight: 750;\n          font-size: 0.95rem;\n          cursor: pointer;\n          box-shadow: 0 4px 14px rgba(190, 18, 96, 0.25);\n          transition: all 0.2s;\n        \" onmouseover=\"this.style.background='#a20f52'; this.style.transform='translateY(-1px)'\" onmouseout=\"this.style.background='#BE1260'; this.style.transform='translateY(0)'\">\n          Entendido\n        </button>\n      </div>\n    </div>\n  `;\n\n  document.body.appendChild(popup);\n\n  const close = () => popup.remove();\n  document.getElementById('btn-close-cat-popup').addEventListener('click', close);\n  popup.addEventListener('click', (e) => {\n    if (e.target === popup) close();\n  });\n};\n