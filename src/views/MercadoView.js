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
        position: relative !important;
        overflow: hidden !important;
        animation: pulseGlow7s 7s infinite ease-in-out !important;
      }
      .btn-pulse-glow-7s::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -120%;
        width: 60%;
        height: 200%;
        background: linear-gradient(
          90deg, 
          rgba(255, 255, 255, 0) 0%, 
          rgba(255, 255, 255, 0.55) 50%, 
          rgba(255, 255, 255, 0) 100%
        );
        transform: rotate(25deg);
        animation: shineSweep7s 7s infinite ease-in-out;
        pointer-events: none;
      }
    </style>

    <!-- Checkout Header matching Ciclos Completados structure -->
    <div style="padding: 20px 24px 0 24px; background: var(--color-bg, #FDF2F5); flex-shrink: 0; position: sticky; top: 0; z-index: 10;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <h2 style="margin: 0; font-size: 1.75rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Pasarela de Pago</h2>
          <button id="checkout-close-btn" style="
              background: none; 
              border: none; 
              cursor: pointer; 
              color: #64748b; 
              font-size: 1.3rem; 
              font-weight: 600; 
              padding: 4px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              transition: color 0.2s;"
              onmouseover="this.style.color='#0f172a';"
              onmouseout="this.style.color='#64748b'">
              ✕
          </button>
        </div>
        <div style="height: 1px; background: #e2e8f0; width: 100%;"></div>
    </div>
    
    <!-- Checklist Body -->
    <div class="checkout-body" style="padding: 20px 20px 16px 20px; flex: 1; display: flex; flex-direction: column; align-items: center; background: var(--color-bg, #FDF2F5);">
      
      <!-- Summary Section (Integrated with light pink background) -->
      <div class="checkout-summary" style="
          width: 100%; 
          max-width: 400px; 
          text-align: center; 
          background: transparent;
          padding: 0;
          margin-bottom: 20px;">
          
          <div style="
              width: 76px; 
              height: 76px; 
              margin: 0 auto 12px; 
              border-radius: 50%; 
              overflow: hidden;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
              <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null;this.src='pig2.jpg'">
          </div>
          
          <h2 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.01em;">¡Compra tu Piggy!</h2>
          <p style="font-size: 0.88rem; color: #64748b; line-height: 1.4; margin: 0;\">
            Un nuevo integrante para que tu granja siga creciendo desde
          </p>
          <div style="font-size: 1.4rem; font-weight: 850; color: var(--color-primary, #ec4899); margin-top: 4px;">${formatCOP(item.price || item.investment_amount || item.amount || item.precio || 1000000)}</div>
      </div>

      <!-- Custom Name Input Section -->
      <div class="form-group" style="width: 100%; max-width: 400px; margin-bottom: 24px; text-align: center;">
           
           <div style="margin-bottom: 12px;">
                <input type="text" id="piggy-custom-name" 
                       placeholder="Ponle un nombre a tu Piggy"
                       autocomplete="off"
                       style="
                           width: 100%;
                           padding: 14px 16px;
                           border: 2px solid #fce7f3;
                           border-radius: 14px;
                           font-size: 1rem;
                           font-weight: 600;
                           color: var(--color-text-primary);
                           outline: none;
                           text-align: center;
                           transition: all 0.2s;
                           box-sizing: border-box;
                           background: #fff;
                       "
                       onfocus="this.style.borderColor='var(--color-primary)'; this.style.boxShadow='0 0 0 4px rgba(236, 72, 153, 0.1)';"
                       onblur="this.style.borderColor='#fce7f3'; this.style.boxShadow='none';"
                />
           </div>

           <!-- Name Suggestions (3 White Pills with 1px Intense Pink Border) -->
           <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
               ${shuffled.map(name => `
                  <button class="name-pill" style="
                      background: white; 
                      color: #db2777; 
                      border: 1px solid #ec4899; 
                      padding: 7px 16px; 
                      border-radius: 20px; 
                      font-size: 0.85rem; 
                      font-weight: 700; 
                      cursor: pointer;
                      box-shadow: 0 2px 6px rgba(236, 72, 153, 0.08);
                      transition: all 0.2s;
                  " 
                  onmouseover="this.style.background='#fdf2f8'; this.style.transform='translateY(-1px)';"
                  onmouseout="this.style.background='white'; this.style.transform='translateY(0)';"
                  onclick="selectPiggyName('${name}')">${name}</button>
               `).join('')}
           </div>
           
           <div class="text-xs text-muted mt-sm fade-in" id="name-error" style="opacity:0; color:var(--color-primary); margin-top:8px;">
                * Debes darle un nombre para continuar
           </div>
      </div>

      <!-- Wallet Section -->
      <div id="wallet-checkout-section" style="width: 100%; max-width: 400px; transition: opacity 0.3s;">
        
        <!-- Balance Display -->
        <div style="
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 12px;
          color: white;
          position: relative;
          overflow: hidden;
        ">
          <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px;">Saldo disponible en tu Wallet</div>
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
          display: flex;
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

        <!-- Insufficient funds notice (shown when balance < price) -->
        <div id="insufficient-funds-notice" style="
          background:#fef2f2;
          border:1px solid #fecaca;
          border-radius:10px;
          padding:12px 16px;
          font-size:0.82rem;
          color:#dc2626;
          text-align:center;
          margin-bottom:12px;
          display:none;
        ">
          Saldo insuficiente. Recarga tu Cuenta para continuar.
        </div>

        <!-- Confirm Purchase Button (with 7s pulse & glow animation) -->
        <button id="btn-confirm-purchase" class="btn-pulse-glow-7s" style="
          width: 100%;
          background: linear-gradient(135deg, #ec4899, #db2777);
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 20px -4px rgba(236,72,153,0.4);
          transition: all 0.2s;
          opacity: 0.5;
          pointer-events: none;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>
          <span>Confirmar Compra</span>
        </button>
      </div>

      <div class="checkout-footer" style="margin-top: 16px; padding-top: 12px; padding-bottom: 16px; display: flex; justify-content: center;">
         <div class="secure-badge" style="display: flex; gap: 20px; color: #94a3b8; font-size: 0.78rem; font-weight: 600; align-items: center;">
            <span style="display: flex; align-items: center; gap: 5px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Pagos seguros
            </span>
            <span style="display: flex; align-items: center; gap: 5px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Cifrado SSL
            </span>
         </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // --- Logic ---

  const input = document.getElementById('piggy-custom-name');
  const walletSection = document.getElementById('wallet-checkout-section');
  const balanceDisplay = document.getElementById('wallet-balance-display');
  const insufficientNotice = document.getElementById('insufficient-funds-notice');
  const confirmBtn = document.getElementById('btn-confirm-purchase');
  const errorMsg = document.getElementById('name-error');
  const recargarBtn = document.getElementById('btn-recargar-checkout');
  const ADMIN_WHATSAPP = '573154870448';

  const itemPrice = Number(item.price || item.investment_amount || item.amount || item.precio || 1000000);
  let currentBalance = 0;

  // Load wallet balance
  getWalletBalance().then(balance => {
    currentBalance = balance;
    balanceDisplay.textContent = formatCOP(balance);
    updatePurchaseState(input.value.trim());
  }).catch(() => {
    balanceDisplay.textContent = '$0';
    updatePurchaseState(input.value.trim());
  });

  // Helper: update button states based on name + balance
  const updatePurchaseState = (nameVal) => {
    const nameValid = nameVal.length >= 3;
    const hasFunds = currentBalance >= itemPrice;

    // The wallet section itself should always be visible and active so the user can see their balance and click "Recargar mi Cuenta"
    walletSection.style.opacity = '1';
    walletSection.style.pointerEvents = 'auto';

    // Show/hide insufficient funds notice and recharge button
    insufficientNotice.style.display = !hasFunds ? 'block' : 'none';
    recargarBtn.style.display = !hasFunds ? 'flex' : 'none';

    // Enable confirm button directly if they have sufficient funds
    if (hasFunds) {
      confirmBtn.style.opacity = '1';
      confirmBtn.style.pointerEvents = 'auto';
    } else {
      confirmBtn.style.opacity = '0.5';
      confirmBtn.style.pointerEvents = 'none';
    }

    // Name validation feedback
    if (nameValid) {
      errorMsg.style.opacity = '0';
      input.style.borderColor = '#10B981';
    } else if (nameVal.length > 0) {
      errorMsg.style.opacity = '1';
      errorMsg.textContent = '* El nombre debe tener al menos 3 caracteres';
      input.style.borderColor = '#dc2626';
    } else {
      errorMsg.style.opacity = '0';
      input.style.borderColor = '#fce7f3';
    }
  };

  // Input listener
  input.addEventListener('input', () => updatePurchaseState(input.value.trim()));

  // Suggestion Pills
  window.selectPiggyName = (name) => {
    input.value = name;
    updatePurchaseState(name);
    input.focus();
  };

  // Close Logic
  const close = () => {
    document.body.style.overflow = '';
    delete window.selectPiggyName;
    modal.remove();
  };

  document.getElementById('checkout-close-btn').addEventListener('click', close);

  // Recargar Wallet
  recargarBtn.addEventListener('click', () => {
    close();
    openWalletDrawer({ initialSubscreen: 'recharge' });
  });

  // Confirm Purchase Logic (Wallet-based)
  confirmBtn.addEventListener('click', async () => {
    const customName = input.value.trim();
    if (customName.length < 3) {
      input.focus();
      return;
    }

    // Re-check balance before final deduction
    if (currentBalance < itemPrice) {
      alert('Saldo insuficiente para completar la compra.');
      return;
    }

    // Visual feedback: Loading state
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.7';
    confirmBtn.innerText = 'Procesando compra...';

    try {
      // 1. Deduct balance from wallet
      await deductWalletBalance(itemPrice, `Compra de ${customName} (${item.item_name || 'Piggy'})`);

      // 2. Register purchase & create piggy in user's farm
      const purchaseResult = await buyMarketplaceItem(item.id, customName, itemPrice, item);

      // 3. Close modal & navigate to granja
      close();

      // Show success modal
      showPurchaseSuccessModal(customName, item);

    } catch (err) {
      console.error('Error during checkout:', err);
      alert(err.message || 'Ocurrió un error al procesar la compra. Intenta de nuevo.');
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.innerText = 'Confirmar Compra';
    }
  });
}

/**
 * Show celebration modal after successful purchase
 */
function showPurchaseSuccessModal(piggyName, item) {
  const existing = document.getElementById('purchase-success-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'purchase-success-modal';
  modal.className = 'modal-overlay animate-fade-in';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    padding: 20px;
  `;

  modal.innerHTML = `
    <div class="animate-scale-in" style="
      background: white;
      border-radius: 24px;
      padding: 32px 24px 28px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    ">
      <div style="font-size: 3.5rem; margin-bottom: 8px;">🎉🐷</div>
      <h2 style="font-size: 1.5rem; font-weight: 850; color: #0f172a; margin: 0 0 6px 0;">¡Felicitaciones!</h2>
      <p style="font-size: 0.92rem; color: #64748b; margin: 0 0 20px 0; line-height: 1.45;">
        <strong style="color: #0f172a;">${piggyName}</strong> ya hace parte de tu granja digital.
      </p>

      <div style="
        background: #fdf2f8;
        border: 1px solid #fce7f3;
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 24px;
        text-align: left;
        font-size: 0.84rem;
      ">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b;">Piggy:</span>
          <strong style="color: #0f172a;">${piggyName}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #64748b;">Tipo:</span>
          <strong style="color: #db2777;">${item.item_name || 'Piggy Estándar'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b;">Inversión:</span>
          <strong style="color: #059669;">${formatCOP(item.price || item.investment_amount || 1000000)}</strong>
        </div>
      </div>

      <button id="btn-go-to-farm" style="
        width: 100%;
        background: linear-gradient(135deg, #ec4899, #db2777);
        color: white;
        border: none;
        padding: 15px;
        border-radius: 14px;
        font-weight: 800;
        font-size: 1rem;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(236, 72, 153, 0.4);
      ">
        Ver mi Granja
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-go-to-farm')?.addEventListener('click', () => {
    modal.remove();
    navigateTo('/granja');
  });
}
