/* ============================================
   PIGGY APP — Mercado (Marketplace) View
   Streamlined Direct Purchase Flow (Wallet-based)
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';
import { navigateTo } from '../router.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { buyMarketplaceItem } from '../services/piggiesService.js';
import { getWalletBalance, formatCOP, deductWalletBalance } from '../services/walletService.js';
import { AppState } from '../state.js';
import { openWalletRechargeInfo, openWalletDrawer } from './granja/WalletBlock.js';

/** In-memory cache */
let cachedItems = [];

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

  return `
    <div class="mcard animate-fade-in-up">
      ${item.category && item.category !== 'standard' ? `
        <div class="mcard__ribbon mcard__ribbon--${item.category}">
          <span>${item.category === 'advanced' ? 'Advanced' : item.category}</span>
        </div>
      ` : ''}
      ${isAdvanced ? `<span class="mcard__time-badge">⚡ Ahorra ${daysSaved} días</span>` : ''}

      <!-- Left Column: Image + Buy Button -->
      <div class="mcard__left">
        <div class="mcard__img-wrap">
          <img src="pig1.png" alt="${item.item_name}" class="mcard__img" />
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
  modal.style.height = '100dvh'; // Dynamic viewport height
  modal.style.backgroundColor = '#ffffff'; // Solid background
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.overflowY = 'auto'; // Internal scroll if needed

  // Random names for suggestions
  const suggestedNames = ['Bacon', 'Pumba', 'Rosita', 'Chuleta', 'Wilbur', 'Peggy', 'Torrezno', 'Gordi', 'Jamón'];
  // Shuffle and pick 4
  const shuffled = suggestedNames.sort(() => 0.5 - Math.random()).slice(0, 4);

  modal.innerHTML = `
    <!-- Checkout Header -->
    <div class="checkout-header" style="
        padding: 16px 20px; 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        background: var(--color-bg); 
        border-bottom: 1px solid var(--color-border);
        position: sticky; top: 0; z-index: 10;">
        
        <h3 class="modal-title" style="margin:0; font-size: 1.25rem;">Pasarela de Pago</h3>
        <button class="checkout-close" id="checkout-close-btn" style="
            background: none; 
            border: none; 
            cursor: pointer; 
            padding: 8px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            background: #f0f0f0;">
            ${renderIcon('close', '', '20')}
        </button>
    </div>
    
    <!-- Checklist Body -->
    <div class="checkout-body" style="padding: 24px 20px; flex: 1; display: flex; flex-direction: column; align-items: center;">
      
      <!-- Summary Card -->
      <div class="checkout-summary" style="
          width: 100%; 
          max-width: 400px; 
          text-align: center; 
          background: #FFF0F5; 
          padding: 24px; 
          border-radius: 16px; 
          margin-bottom: 32px;
          border: 1px solid rgba(236, 72, 153, 0.1);
          box-shadow: 0 8px 20px rgba(236, 72, 153, 0.05);">
          
          <div style="
              width: 80px; 
              height: 80px; 
              margin: 0 auto 16px; 
              border-radius: 50%; 
              overflow: hidden; 
              border: 3px solid white; 
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <img src="pig1.png" style="width:100%; height:100%; object-fit:cover;">
          </div>
          
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 8px;">¡Compra tu Piggy!</h2>
          <p style="font-size: 1rem; color: var(--color-text-secondary); line-height: 1.4;">
            Un nuevo integrante para que tu granja siga creciendo desde <br>
            <span style="font-size: 1.5rem; font-weight: 900; color: var(--color-primary); display:block; margin-top:4px;">${item.priceFormatted}</span>
          </p>
      </div>

      <!-- Custom Name Input Section -->
      <div class="form-group" style="width: 100%; max-width: 400px; margin-bottom: 40px; text-align: center;">
           
           <div style="margin-bottom: 20px;">
                <input type="text" id="piggy-custom-name" 
                       placeholder="Ponle un nombre a tu Piggy"
                       autocomplete="off"
                       style="
                           width: 100%;
                           padding: 16px;
                           border: 2px solid #fce7f3; /* Pink-100 */
                           border-radius: 16px;
                           font-size: 1.1rem;
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

           <!-- Name Suggestions (Pills) -->
           <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
               ${shuffled.map(name => `
                  <button class="name-pill" style="
                      background: #fdf2f8; 
                      color: #db2777; 
                      border: 1px solid #fce7f3; 
                      padding: 8px 16px; 
                      border-radius: 20px; 
                      font-size: 0.9rem; 
                      font-weight: 600; 
                      cursor: pointer;
                      transition: transform 0.1s;
                  " onclick="selectPiggyName('${name}')">${name}</button>
               `).join('')}
           </div>
           
           <div class="text-xs text-muted mt-sm fade-in" id="name-error" style="opacity:0; color:var(--color-primary); margin-top:12px;">
                * Debes darle un nombre para continuar
           </div>
      </div>

      <!-- Wallet Section -->
      <div id="wallet-checkout-section" style="width: 100%; max-width: 400px; opacity: 0.5; pointer-events: none; transition: opacity 0.3s;">
        
        <!-- Balance Display -->
        <div style="
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 16px;
          color: white;
          position: relative;
          overflow: hidden;
        ">
          <div style="font-size:0.8rem; opacity:0.85; margin-bottom:4px;">Saldo disponible en tu Wallet</div>
          <div id="wallet-balance-display" style="font-size:2rem; font-weight:800; letter-spacing:-0.5px; line-height:1;">
            <span class="spinner" style="width:20px;height:20px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
          </div>
          <div style="position:absolute; bottom:-10px; right:-10px; opacity:0.1;">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          </div>
        </div>

        <!-- Recharge Button -->
        <button id="btn-recargar-checkout" style="
          width: 100%;
          background: white;
          color: #059669;
          border: 2px solid #a7f3d0;
          padding: 13px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
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

        <!-- Confirm Purchase Button -->
        <button id="btn-confirm-purchase" style="
          width: 100%;
          background: linear-gradient(135deg, #ec4899, #db2777);
          color: white;
          border: none;
          padding: 15px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
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
          Confirmar Compra con mi Wallet
        </button>
      </div>

      <div class="checkout-footer mt-lg" style="margin-top: auto; padding-top: 32px; padding-bottom: 20px; display: flex; justify-content: center;">
         <div class="secure-badge" style="display: flex; gap: 16px; color: var(--color-text-tertiary); font-size: 0.8rem;">
            <span>&#128274; Pagos seguros</span>
            <span>&#128737; Cifrado SSL</span>
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

    // Unlock wallet section once name is valid
    walletSection.style.opacity = nameValid ? '1' : '0.5';
    walletSection.style.pointerEvents = nameValid ? 'auto' : 'none';

    // Show/hide insufficient funds notice
    insufficientNotice.style.display = (nameValid && !hasFunds) ? 'block' : 'none';

    // Enable confirm button only if name valid + funds sufficient
    if (nameValid && hasFunds) {
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
      input.style.borderColor = '#e0e0e0';
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
  const recargarBtn = document.getElementById('btn-recargar-checkout');
  recargarBtn.addEventListener('click', async () => {
    const originalText = recargarBtn.innerHTML;
    recargarBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border:2px solid #059669;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Cargando Wallet...';
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
    if (customName.length < 3 || currentBalance < item.price) return;

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
      await buyMarketplaceItem(item, customName);

      close();
      navigateTo('granja');
    } catch (error) {
      console.error(error);
      alert('Error en la transaccion: ' + error.message);
      confirmBtn.innerHTML = 'Confirmar Compra con mi Wallet';
      confirmBtn.style.pointerEvents = 'auto';
    }
  });
}
