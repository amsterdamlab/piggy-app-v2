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

  availableItems.forEach(item => {
    document.getElementById(`buy-${item.id}`)?.addEventListener('click', () => {
      showCheckoutModal(item);
    });
  });
}

/**
 * Render a single horizontal product card.
 */
function renderProductCard(item) {
  const hasExtraROI = item.extra_roi > 0;
  const extraROIText = hasExtraROI ? `+${(item.extra_roi * 100).toFixed(0)}%` : '';
  const currentMonth = item.currentMonth || 1;
  const daysRemaining = item.daysRemaining;
  const isAdvanced = currentMonth >= 2;
  const daysSaved = item.cycleTotalDays - daysRemaining;

  return `
    <div class="mcard animate-fade-in-up">
      ${hasExtraROI ? `<span class="mcard__roi-badge">${extraROIText}</span>` : ''}
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

        <div class="mcard__price-row">
            <span class="mcard__price">${item.priceFormatted}</span>
            <span class="mcard__stock">${item.stock} disponibles</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show Full Screen Checkout — Wallet-based purchase flow.
 * Validates balance locally before allowing confirmation.
 * After successful purchase, deducts balance from DB.
 */
export function showCheckoutModal(item) {
  const existing = document.getElementById('checkout-modal');
  if (existing) existing.remove();

  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.className = 'checkout-fullscreen animate-fade-in-up';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100dvh; background:#ffffff; z-index:99999; display:flex; flex-direction:column; overflow-y:auto;';

  const ADMIN_WHATSAPP = '573154870448';
  const suggestedNames = ['Bacon', 'Pumba', 'Rosita', 'Chuleta', 'Wilbur', 'Peggy', 'Torrezno', 'Gordi', 'Jamón'];
  const shuffled = suggestedNames.sort(() => 0.5 - Math.random()).slice(0, 4);

  modal.innerHTML = `
    <div class="checkout-header" style="padding:16px 20px; display:flex; align-items:center; justify-content:space-between; background:var(--color-bg); border-bottom:1px solid var(--color-border); position:sticky; top:0; z-index:10;">
        <h3 class="modal-title" style="margin:0; font-size:1.25rem;">Comprar Piggy</h3>
        <button id="checkout-close-btn" style="background:#f0f0f0; border:none; cursor:pointer; padding:8px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            ${renderIcon('close', '', '20')}
        </button>
    </div>
    
    <div class="checkout-body" style="padding:24px 20px; flex:1; display:flex; flex-direction:column; align-items:center;">
      
      <!-- Summary Card -->
      <div style="width:100%; max-width:400px; text-align:center; background:#FFF0F5; padding:24px; border-radius:16px; margin-bottom:28px; border:1px solid rgba(236,72,153,0.1); box-shadow:0 8px 20px rgba(236,72,153,0.05);">
          <div style="width:80px; height:80px; margin:0 auto 16px; border-radius:50%; overflow:hidden; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
              <img src="pig1.png" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <h2 style="font-size:1.5rem; font-weight:800; color:var(--color-text-primary); margin-bottom:8px;">¡Compra tu Piggy!</h2>
          <p style="font-size:1rem; color:var(--color-text-secondary); line-height:1.4;">
            Un nuevo integrante para tu granja desde <br>
            <span style="font-size:1.5rem; font-weight:900; color:var(--color-primary); display:block; margin-top:4px;">${item.priceFormatted}</span>
          </p>
      </div>

      <!-- Custom Name Input -->
      <div style="width:100%; max-width:400px; margin-bottom:28px; text-align:center;">
           <div style="margin-bottom:20px;">
                <input type="text" id="piggy-custom-name" 
                       placeholder="Ponle un nombre a tu Piggy"
                       autocomplete="off"
                       style="width:100%; padding:16px; border:2px solid #fce7f3; border-radius:16px; font-size:1.1rem; font-weight:600; color:var(--color-text-primary); outline:none; text-align:center; transition:all 0.2s; box-sizing:border-box; background:#fff;"
                       onfocus="this.style.borderColor='var(--color-primary)'; this.style.boxShadow='0 0 0 4px rgba(236,72,153,0.1)';"
                       onblur="this.style.borderColor='#fce7f3'; this.style.boxShadow='none';"
                />
           </div>
           <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">
               ${shuffled.map(name => `
                  <button style="background:#fdf2f8; color:#db2777; border:1px solid #fce7f3; padding:8px 16px; border-radius:20px; font-size:0.9rem; font-weight:600; cursor:pointer; transition:transform 0.1s;" onclick="selectPiggyName('${name}')">${name}</button>
               `).join('')}
           </div>
           <div id="name-error" style="opacity:0; color:var(--color-primary); margin-top:12px; font-size:0.8rem;">* Debes darle un nombre para continuar</div>
      </div>

      <!-- Wallet Section -->
      <div id="wallet-checkout-section" style="width:100%; max-width:400px; opacity:0.5; pointer-events:none; transition:opacity 0.3s;">
        
        <!-- Balance Display -->
        <div style="background:linear-gradient(135deg,#10B981 0%,#059669 100%); border-radius:16px; padding:20px 24px; margin-bottom:16px; color:white; position:relative; overflow:hidden;">
          <div style="font-size:0.8rem; opacity:0.85; margin-bottom:4px;">Saldo disponible en tu Wallet</div>
          <div id="wallet-balance-display" style="font-size:2rem; font-weight:800; letter-spacing:-0.5px; line-height:1;">
            <span class="spinner" style="width:20px;height:20px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
          </div>
        </div>

        <!-- Recharge Button -->
        <button id="btn-recargar-checkout" style="width:100%; background:white; color:#059669; border:2px solid #a7f3d0; padding:13px 20px; border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:12px; transition:all 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          Recargar mi Wallet
        </button>

        <!-- Insufficient funds notice -->
        <div id="insufficient-funds-notice" style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:12px 16px; font-size:0.82rem; color:#dc2626; text-align:center; margin-bottom:12px; display:none;">
          Saldo insuficiente. Recarga tu Wallet para continuar.
        </div>

        <!-- Confirm Purchase Button -->
        <button id="btn-confirm-purchase" style="width:100%; background:linear-gradient(135deg,#ec4899,#db2777); color:white; border:none; padding:15px 20px; border-radius:12px; font-weight:700; font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 6px 20px -4px rgba(236,72,153,0.4); transition:all 0.2s; opacity:0.5; pointer-events:none;">
          Confirmar Compra con mi Wallet
        </button>
      </div>

      <div style="margin-top:auto; padding-top:32px; padding-bottom:20px; display:flex; justify-content:center;">
         <div style="display:flex; gap:16px; color:var(--color-text-tertiary); font-size:0.8rem;">
            <span>🔒 Pagos seguros</span>
            <span>🛡️ Cifrado SSL</span>
         </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = document.getElementById('piggy-custom-name');
  const walletSection = document.getElementById('wallet-checkout-section');
  const balanceDisplay = document.getElementById('wallet-balance-display');
  const insufficientNotice = document.getElementById('insufficient-funds-notice');
  const confirmBtn = document.getElementById('btn-confirm-purchase');
  const errorMsg = document.getElementById('name-error');

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

  // Update button states based on name validity + available balance
  const updatePurchaseState = (nameVal) => {
    const nameValid = nameVal.length >= 3;
    const hasFunds = currentBalance >= item.price;

    walletSection.style.opacity = nameValid ? '1' : '0.5';
    walletSection.style.pointerEvents = nameValid ? 'auto' : 'none';
    insufficientNotice.style.display = (nameValid && !hasFunds) ? 'block' : 'none';

    if (nameValid && hasFunds) {
      confirmBtn.style.opacity = '1';
      confirmBtn.style.pointerEvents = 'auto';
    } else {
      confirmBtn.style.opacity = '0.5';
      confirmBtn.style.pointerEvents = 'none';
    }

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

  input.addEventListener('input', () => updatePurchaseState(input.value.trim()));

  window.selectPiggyName = (name) => {
    input.value = name;
    updatePurchaseState(name);
    input.focus();
  };

  const close = () => {
    document.body.style.overflow = '';
    delete window.selectPiggyName;
    modal.remove();
  };

  document.getElementById('checkout-close-btn').addEventListener('click', close);

  // Recargar Wallet — Open WhatsApp to admin
  document.getElementById('btn-recargar-checkout').addEventListener('click', () => {
    const profile = AppState.get('profile');
    const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
    const msg = `🐷 *PIGGY APP — Solicitud de Recarga de Wallet*\n\n👤 *Usuario:* ${userName}\n\n💰 Hola, deseo recargar mi wallet para comprar Piggys.\n\n📋 Por favor indícame el número de cuenta y el proceso a seguir.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  });

  // Confirm Purchase — validate + buy + deduct balance
  confirmBtn.addEventListener('click', async () => {
    const customName = input.value.trim();
    if (customName.length < 3 || currentBalance < item.price) return;

    confirmBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Procesando...';
    confirmBtn.style.pointerEvents = 'none';

    try {
      await buyMarketplaceItem(item, customName);

      // ─── CRÍTICO: Descontar balance de la wallet en DB ───
      const deductResult = await deductWalletBalance(item.price);
      if (!deductResult.success) {
        // Purchase recorded but balance not deducted — log for admin reconciliation
        console.error('[WALLET] Balance deduction failed after purchase:', deductResult.reason);
      }

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
