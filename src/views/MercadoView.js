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
  const currentMonth = item.currentMonth || 1;
  const daysRemaining = item.daysRemaining;
  const isAdvanced = currentMonth >= 2;
  const daysSaved = item.cycleTotalDays - daysRemaining;
  const photoNum = getMarketplacePhotoNumber(item.id);
  const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
  let imgSrc = item.image_url || `/assets/piggies/stage${stage}/et${stage}-${photoNum}.jpg`;
  if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
    imgSrc = '/' + imgSrc;
  }

  return `
    <div class="mcard animate-fade-in-up">
      ${item.category && item.category !== 'standard' ? `
        <div class="mcard__ribbon mcard__ribbon--${item.category} js-ribbon" data-category="${item.category}" style="pointer-events: auto; cursor: pointer;">
          <span style="pointer-events: auto;">${item.category === 'advanced' ? 'Advanced' : item.category} ⓘ</span>
        </div>
      ` : ''}
      ${isAdvanced ? `<span class="mcard__time-badge">⚡ Ahorra ${daysSaved} días</span>` : ''}

      <!-- Left Column: Image + Buy Button -->
      <div class="mcard__left">
        <div class="mcard__img-wrap ${item.category && item.category !== 'standard' ? 'js-img-category' : ''}"
             ${item.category && item.category !== 'standard' ? `data-category="${item.category}" style="cursor: pointer;"` : ''}>
          <img src="${imgSrc}" alt="${item.item_name}" class="mcard__img" onerror="this.onerror=null;this.src='pig2.jpg'" />
        </div>
        
        <button class="mcard__buy-btn" id="buy-${item.id}">
          ${renderIcon('shop', '', '16')}
          Comprar
        </button>
      </div>

      <!-- Right Column: Details -->
      <div class="mcard__right">
        <h4 class="mcard__name">${item.item_name}</h4>
        <p class="mcard__desc">${item.description}</p>

        <!-- Info Row: Month + Days Remaining + Weight -->
        <div class="mcard__info-row">
          <div class="mcard__info-item">
            <span class="mcard__info-label">Mes</span>
            <span class="mcard__info-value mcard__info-value--month">${currentMonth}</span>
          </div>

          <div class="mcard__info-divider"></div>
          <div class="mcard__info-item">
            <span class="mcard__info-label">Peso</span>
            <span class="mcard__info-value">${item.current_weight || 15} kg</span>
          </div>
        </div>


        <!-- Price Info -->
        <div class="mcard__price-row">
            <span class="mcard__price">${item.priceFormatted}</span>
            <span class="mcard__stock">${item.stock} disponibles</span>
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

  const photoNum = getMarketplacePhotoNumber(item.id);
  const stage = (item.currentMonth || 1) >= 4 ? 3 : (item.currentMonth || 1) >= 2 ? 2 : 1;
  let imgSrc = item.image_url || `assets/piggies/stage${stage}/et${stage}-${photoNum}.jpg`;
  if (imgSrc && !imgSrc.startsWith('http')) {
    if (imgSrc.startsWith('/')) {
      imgSrc = imgSrc.slice(1);
    }
    imgSrc = `https://raw.githubusercontent.com/amsterdamlab/piggy-app-v2/refs/heads/main/public/${imgSrc}`;
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
          <p style="font-size: 0.88rem; color: #64748b; line-height: 1.4; margin: 0;">
            Un nuevo integrante para que tu granja siga creciendo desde
          </p>
          <div style="font-size: 1.4rem; font-weight: 850; color: var(--color-primary, #ec4899); margin-top: 4px;">${formatCOP(item.price)}</div>
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
          Confirmar Compra
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
    const hasFunds = currentBalance >= item.price;

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
  recargarBtn.addEventListener('click', async () => {
    const originalText = recargarBtn.innerHTML;
    recargarBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Cargando Wallet...';
    recargarBtn.style.pointerEvents = 'none';
    try {
      await openWalletDrawer(true);
      close();
    } catch (e) {
      console.error('Error opening wallet from mercado view:', e);
      recargarBtn.innerHTML = originalText;
      recargarBtn.style.pointerEvents = 'auto';
    }
  });

  // Confirm Purchase
  confirmBtn.addEventListener('click', async () => {
    const customName = input.value.trim();
     
    // Check name validation on click
    if (customName.length < 3) {
      errorMsg.style.opacity = '1';
      errorMsg.textContent = '* Debes darle un nombre de al menos 3 letras a tu cerdito';
      input.style.borderColor = '#dc2626';
      input.focus();
      return;
    }

    if (currentBalance < item.price) return;

    // Visual feedback
    confirmBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Procesando...';
    confirmBtn.style.pointerEvents = 'none';

    try {
      // ── CRÍTICO: Descontar wallet PRIMERO antes de llamar el RPC ──
      // El RPC buy_piggy maneja stock y creación del piggy pero NO descuenta wallet.
      const deductResult = await deductWalletBalance(item.price);
      if (!deductResult.success) {
        throw new Error(
          deductResult.reason === 'insufficient_balance'
            ? 'Saldo insuficiente en tu Wallet.'
            : 'No se pudo procesar el pago. Intenta de nuevo.'
        );
      }

      // Wallet descontada ✅ — ahora crear el piggy
      try {
        await buyMarketplaceItem(item, customName);
      } catch (piggyError) {
        console.error('Fallo al crear el Piggy, realizando reembolso automático:', piggyError);
        await addWalletBalance(item.price, `Reembolso de emergencia: fallo en compra de ${customName}`);
        throw new Error('Hubo un inconveniente al generar tu cerdito. Tu dinero fue reembolsado automáticamente a tu Cuenta Agro.');
      }

      close();
      navigateTo('granja');
    } catch (error) {
      console.error(error);
      alert('Error en la transacción: ' + error.message);
      confirmBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>Confirmar Compra`;
      confirmBtn.style.pointerEvents = 'auto';
    }
  });
}

/**
 * Show premium, gold, silver, advanced category explanations in a custom popup modal.
 */
window.showCategoryInfo = (category) => {
  const existing = document.getElementById('category-info-popup');
  if (existing) existing.remove();

  const infoTexts = {
    premium: 'Con este cerdito obtienes un extra en comisión (+3%) debido a la venta del cerdo en cadenas de restaurantes y hospedajes premium.',
    gold: 'Con este cerdito obtienes un extra en comisión (+2%) debido a la venta del cerdo en empresas, colegios y hospitales.',
    silver: 'Con este cerdito obtienes un extra en comisión (+1%) debido a la venta del cerdo en tiendas, mini-markets y supermercados.',
    advanced: 'Cerdito en etapa avanzada con más tiempo de engorde. Si eres de los que no les gusta esperar, este cerdito será tu mejor aliado.'
  };

  const text = infoTexts[category.toLowerCase()] || '';
  if (!text) return;

  const colors = {
    premium: { bg: 'linear-gradient(135deg, #EC4899, #9D174D)', color: '#FFF' },
    gold: { bg: 'linear-gradient(135deg, #F59E0B, #B45309)', color: '#FFF' },
    silver: { bg: 'linear-gradient(135deg, #BDC3C7, #7F8C8D)', color: '#FFF' },
    advanced: { bg: 'linear-gradient(135deg, #A855F7, #7E22CE)', color: '#FFF' }
  };

  const theme = colors[category.toLowerCase()] || { bg: 'var(--color-primary)', color: '#FFF' };

  const popup = document.createElement('div');
  popup.id = 'category-info-popup';
  popup.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100dvh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  `;

  const capitalizedCat = category.charAt(0).toUpperCase() + category.slice(1);

  popup.innerHTML = `
    <div class="animate-scale-in" style="
      background: white;
      border-radius: 20px;
      width: 100%;
      max-width: 340px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    ">
      <div style="
        background: ${theme.bg};
        color: ${theme.color};
        width: 100%;
        padding: 20px 24px;
        text-align: center;
        font-weight: 800;
        font-size: 1.15rem;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      ">
        Categoría ${capitalizedCat}
      </div>

      <div style="padding: 24px 20px; text-align: center; font-size: 0.95rem; color: #4b5563; line-height: 1.5; font-weight: 500;">
        ${text}
      </div>

      <div style="width: 100%; padding: 0 20px 20px 20px; box-sizing: border-box;">
        <button id="btn-close-cat-popup" style="
          width: 100%;
          background: #f3f4f6;
          color: #1f2937;
          border: none;
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
          Entendido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const close = () => popup.remove();
  document.getElementById('btn-close-cat-popup').addEventListener('click', close);
  popup.addEventListener('click', (e) => {
    if (e.target === popup) close();
  });
};
