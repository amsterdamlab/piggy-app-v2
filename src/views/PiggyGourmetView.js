/* ==========================================================================
   PIGGY APP — Piggy Gourmet View (Tienda de la Granja)
   Meat combo offers, interactive checkout & multi-payment method redemption.
   ========================================================================= */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';
import { renderBottomNav } from './GranjaView.js';
import {
  getGourmetOffers,
  formatGourmetPrice,
  buildGourmetCheckoutWhatsAppLink,
  buildCustomOrderWhatsAppLink,
} from '../services/gourmetService.js';
import { getReferralBonusBalance, getWalletBalance, createWalletRequest } from '../services/walletService.js';
import { completeMissionOnVisit } from '../services/missionsService.js';
import { renderPiggyLoader } from '../components/PiggyLoader.js';

/* ─── Main Render ─── */

export function renderPiggyGourmetView() {
  const app = document.getElementById('app');

  // M1: auto-complete "Obtén tu Bono de Bienvenida" on first visit to Tienda
  completeMissionOnVisit('m1');

  app.innerHTML = `
    <div class="page page--with-nav gourmet-page">
      <div class="page__content">

        <!-- Title & Subtitle -->
        <div class="animate-fade-in" style="margin-bottom:24px;">
          <h2 style="font-size: var(--text-3xl); font-weight: var(--font-extrabold); color: var(--color-text-primary); margin: 0 0 var(--space-xs) 0;">Tienda</h2>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary); line-height: var(--leading-relaxed); margin: 0;">
            Cortes premium y combos gourmet directos de Granja Valle Morales. Paga con tu Cuenta Agro, redime tus Bonos de Consumo o paga contra entrega.
          </p>
        </div>

        <!-- Bonus Banner (Filled dynamically) -->
        <div id="gourmet-bonus-container"></div>

        <!-- Offer Cards Container -->
        <div id="gourmet-offers-container" style="display:flex; flex-direction:column; gap:20px; margin-bottom:24px;">
          ${renderPiggyLoader('Cargando ofertas...')}
        </div>

        <!-- Custom Order Card (Personaliza tu pedido) -->
        <div id="gourmet-custom-order-container" style="margin-bottom: 24px;"></div>

        <!-- Info Footer -->
        <div class="animate-fade-in-up" style="animation-delay: 0.4s;">
          <div style="
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 16px;
            padding: 18px 20px;
            position: relative;
            overflow: hidden;
          ">
            <!-- Decorative Truck Line SVG Watermark (Bottom Right) -->
            <div style="position: absolute; bottom: -8px; right: -8px; opacity: 0.15; transform: rotate(-5deg); color: #166534; pointer-events: none;">
               <svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                 <rect x="1" y="3" width="15" height="13" rx="1"/>
                 <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
                 <circle cx="5.5" cy="18.5" r="2.5"/>
                 <circle cx="18.5" cy="18.5" r="2.5"/>
               </svg>
            </div>

            <div style="position: relative; z-index: 2;">
              <div style="font-weight: 700; color: #166534; font-size: 0.88rem; margin-bottom: 6px;">Información de entregas</div>
              <div style="font-size: 0.78rem; color: #15803d; line-height: 1.5;">
                <strong>Cali:</strong> Domicilio gratis en zona urbana.<br/>
                <strong>Otros municipios cerca a Cali:</strong> Costo de envío según ubicación y peso del pedido.
              </div>
            </div>
          </div>
        </div>

      </div>
      ${renderBottomNav('gourmet')}
    </div>
  `;

  // Load offers and user balances
  loadGourmetOffers();
}

/* ─── Load and Render Offers ─── */

async function loadGourmetOffers() {
  try {
    const [offers, referralBonus, walletBalance] = await Promise.all([
      getGourmetOffers(),
      getReferralBonusBalance(),
      getWalletBalance(),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);

    const userStats = {
      referralBonus: referralBonus || 0,
      walletBalance: walletBalance || 0
    };

    // Render dynamic bonus banner if user has referral bonus balance
    const bonusContainer = document.getElementById('gourmet-bonus-container');
    if (bonusContainer && userStats.referralBonus > 0) {
      bonusContainer.innerHTML = `
        <div class="animate-fade-in-up" style="
          background: #fff1f2;
          border: 1px solid #ffe4e6;
          border-radius: 16px;
          padding: 16px 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        ">
          <div style="
            width: 44px; height: 44px; border-radius: 12px;
            background: white; border: 1px solid #fecdd3;
            display: flex; align-items: center; justify-content: center;
            color: #be1260; flex-shrink: 0;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 12v10H4V12"/>
              <path d="M2 7h20v5H2z"/>
              <path d="M12 22V7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; color: #881337; font-size: 0.92rem; line-height: 1.3;">
              Tienes Bonos de Consumo por ${formatGourmetPrice(userStats.referralBonus)}
            </div>
            <div style="font-size: 0.76rem; color: #9f1239; margin-top: 2px;">
              Aprovéchalos y redímelos en compras iguales o superiores a <strong>$150.000</strong>.
            </div>
          </div>
        </div>
      `;
    }

    renderOfferCards(offers, userStats);
    renderCustomOrderSection();
  } catch (err) {
    console.error('Error loading gourmet offers:', err);
    const container = document.getElementById('gourmet-offers-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px; color:#9ca3af;">
            Error al cargar las ofertas. Por favor intenta nuevamente.
        </div>
      `;
    }
  }
}

function renderOfferCards(offers, userStats) {
  const container = document.getElementById('gourmet-offers-container');
  if (!container) return;

  const displayOffers = offers || [];

  if (displayOffers.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px; color:#9ca3af;">
          <div style="width:54px; height:54px; margin:0 auto 12px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#f1f5f9; color:#64748b;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3c-5 0-9 4.5-9 10 0 5.5 4.5 8 9.5 8 5 0 8.5-3.5 8.5-7.5 0-4-3-5-4.5-6C15 6.5 15.5 3 12 3z"/>
              <path d="M11.8 5.2C8 5.2 4.8 8.8 4.8 13.2c0 4 3.7 6 7.4 6 3.8 0 7-3 7-6 0-3-2.4-4-4-5-1.4-1-1-3-3.4-3z"/>
            </svg>
          </div>
          <p style="font-weight:600; color:#64748b;">No hay ofertas disponibles en este momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayOffers.map((offer, index) => renderOfferCard(offer, index)).join('');

  // Attach interactive checkout listeners
  displayOffers.forEach(offer => {
    const btn = document.querySelector(`[data-offer-id="${offer.id}"]`);
    if (btn) {
      btn.addEventListener('click', () => {
        openGourmetCheckoutModal(offer, userStats);
      });
    }
  });
}

function renderOfferCard(offer, index) {
  const discount = offer.original_price
    ? Math.round(((offer.original_price - offer.price) / offer.original_price) * 100)
    : 0;

  const imageUrl = offer.image_url || 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80';

  return `
    <div class="animate-fade-in-up" style="animation-delay: ${0.1 + index * 0.08}s;">
      <div style="
        background: white;
        border-radius: 20px;
        border: 1px solid #f1f5f9;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        transition: transform 0.2s, box-shadow 0.2s;
      " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.08)'" 
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.05)'">

        <!-- Card Header Image -->
        <div style="
          height: 100px;
          position: relative;
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
        ">
          <div style="
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.3) 60%, rgba(0, 0, 0, 0.1) 100%);
            z-index: 1;
          "></div>

          <!-- Badges -->
          <div style="
            position: absolute;
            top: 8px;
            left: 12px;
            right: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 2;
          ">
            <span style="
              background: rgba(190, 18, 96, 0.75);
              color: white;
              font-size: 0.65rem;
              font-weight: 800;
              padding: 3px 9px;
              border-radius: 20px;
              letter-spacing: 0.3px;
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
            ">${offer.tag ? offer.tag.replace(/^[^\w\s]+/, '').trim() : 'Granja Valle Morales'}</span>
            
            ${discount > 0 ? `
              <div style="
                background: rgba(255, 255, 255, 0.28);
                color: white;
                font-size: 0.68rem;
                font-weight: 900;
                padding: 3px 8px;
                border-radius: 20px;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                border: 1px solid rgba(255, 255, 255, 0.4);
              ">-${discount}%</div>
            ` : ''}
          </div>

          <!-- Title Overlay -->
          <div style="
            position: absolute;
            bottom: 8px;
            left: 12px;
            right: 12px;
            z-index: 2;
          ">
            <h4 style="
              margin: 0;
              font-size: 1.08rem;
              font-weight: 800;
              color: white;
              text-shadow: 0 2px 4px rgba(0,0,0,0.6);
              line-height: 1.2;
            ">${offer.name}</h4>
          </div>
        </div>

        <!-- Card Body -->
        <div style="padding: 16px 18px;">
          <p style="margin:0 0 16px 0; font-size:0.82rem; color:#64748b; line-height:1.5;">
            ${offer.description}
          </p>

          <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:12px;">
            <div style="display:flex; flex-direction:column;">
              ${offer.original_price ? `<div style="font-size:0.75rem; color:#94a3b8; text-decoration:line-through; margin-bottom: 2px;">${formatGourmetPrice(offer.original_price)}</div>` : ''}
              <div style="font-size:1.35rem; font-weight:850; color:#0f172a; letter-spacing:-0.5px; line-height: 1;">${formatGourmetPrice(offer.price)}</div>
            </div>

            <button class="btn-gourmet-buy" data-offer-id="${offer.id}" style="
              background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 12px;
              font-weight: 750;
              font-size: 0.88rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
              transition: transform 0.2s, box-shadow 0.2s;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(22, 163, 74, 0.4)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(22, 163, 74, 0.3)'">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Comprar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ─── Render Custom Order Section ─── */

function renderCustomOrderSection() {
  const container = document.getElementById('gourmet-custom-order-container');
  if (!container) return;

  container.innerHTML = `
    <div class="animate-fade-in-up" style="
      background: #fdf2f5;
      border: 1.5px dashed #fbcfe8;
      border-radius: 20px;
      padding: 22px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 4px 14px rgba(190, 18, 96, 0.04);
    ">
      <div style="display: flex; align-items: flex-start; gap: 14px;">
        <div style="
          width: 48px; height: 48px; border-radius: 14px;
          background: white; border: 1px solid #fce7ed;
          display: flex; align-items: center; justify-content: center;
          color: #be1260; flex-shrink: 0; box-shadow: 0 2px 8px rgba(190, 18, 96, 0.08);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3c-5 0-9 4.5-9 10 0 5.5 4.5 8 9.5 8 5 0 8.5-3.5 8.5-7.5 0-4-3-5-4.5-6C15 6.5 15.5 3 12 3z"/>
            <path d="M11.8 5.2C8 5.2 4.8 8.8 4.8 13.2c0 4 3.7 6 7.4 6 3.8 0 7-3 7-6 0-3-2.4-4-4-5-1.4-1-1-3-3.4-3z"/>
            <circle cx="10" cy="14" r="1.8"/>
          </svg>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="margin: 0 0 4px; font-size: 1.05rem; font-weight: 850; color: #0f172a; letter-spacing: -0.01em;">
            Personaliza tu pedido
          </h3>
          <p style="margin: 0; font-size: 0.82rem; color: #64748b; line-height: 1.45;">
            ¿Deseas cortes específicos, porciones por libra o combos especiales? Escríbenos y con gusto armamos tu pedido directo con nuestro asesor.
          </p>
        </div>
      </div>

      <button id="btn-custom-order-wa" style="
        width: 100%;
        background: #be1260;
        color: white;
        border: none;
        padding: 13px 20px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 0.92rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(190, 18, 96, 0.25);
        transition: all 0.2s;
      " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        Personalizar por WhatsApp
      </button>
    </div>
  `;

  document.getElementById('btn-custom-order-wa')?.addEventListener('click', () => {
    window.open(buildCustomOrderWhatsAppLink(), '_blank');
  });
}

/* ─── Interactive Checkout Modal ─── */

function openGourmetCheckoutModal(offer, userStats) {
  const existing = document.getElementById('gourmet-checkout-modal');
  if (existing) existing.remove();

  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.id = 'gourmet-checkout-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(15, 23, 42, 0.65)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  const isBonusEligible = offer.price >= 150000;
  const userBonus = userStats.referralBonus || 0;
  const userWallet = userStats.walletBalance || 0;

  // Initial payment selections
  let useBonus = isBonusEligible && userBonus > 0;
  let useWallet = userWallet > 0;

  const calculateTotals = () => {
    let appliedBonus = 0;
    if (useBonus && isBonusEligible && userBonus > 0) {
      appliedBonus = Math.min(userBonus, offer.price);
    }

    let remainingAfterBonus = Math.max(0, offer.price - appliedBonus);

    let appliedWallet = 0;
    if (useWallet && userWallet > 0) {
      appliedWallet = Math.min(userWallet, remainingAfterBonus);
    }

    let cashDue = Math.max(0, remainingAfterBonus - appliedWallet);

    return {
      appliedBonus,
      appliedWallet,
      cashDue
    };
  };

  const renderContent = () => {
    const { appliedBonus, appliedWallet, cashDue } = calculateTotals();

    return `
      <div class="animate-scale-in" style="
        width: 100%; max-width: 480px; max-height: 90dvh; background: white;
        border-radius: 24px; display: flex; flex-direction: column; overflow: hidden;
        position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); margin: 16px;
      ">
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; border-bottom:1px solid #f1f5f9; background:white; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:10px; background:#f0fdf4; color:#16a34a; display:flex; align-items:center; justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div>
              <div style="font-size:1.15rem; font-weight:850; color:#0f172a; line-height:1.2;">Checkout del Pedido</div>
              <div style="font-size:0.75rem; color:#64748b; font-weight:500;">Granja Valle Morales</div>
            </div>
          </div>
          <button id="btn-close-gourmet-modal" style="background:transparent; border:none; padding:4px 8px; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1;">✕</button>
        </div>

        <!-- Scrollable Body -->
        <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:18px;">
          
          <!-- Selected Combo Summary -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <div style="min-width:0; flex:1;">
              <span style="font-size:0.7rem; font-weight:800; color:#be1260; text-transform:uppercase; letter-spacing:0.4px;">COMBO SELECCIONADO</span>
              <h4 style="margin:2px 0 4px; font-size:0.98rem; font-weight:800; color:#0f172a; line-height:1.25;">${offer.name}</h4>
              <div style="font-size:0.78rem; color:#64748b;">${offer.description}</div>
            </div>
            <div style="text-align:right; flex-shrink:0;">
              <div style="font-size:1.2rem; font-weight:850; color:#0f172a;">${formatGourmetPrice(offer.price)}</div>
            </div>
          </div>

          <!-- Métodos de Pago Section -->
          <div>
            <div style="font-size:0.82rem; font-weight:800; color:#475569; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.4px;">
              Métodos de Pago
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
              
              <!-- 1. Saldo Cuenta Agro -->
              <label style="
                background: ${userWallet > 0 ? '#f0fdf4' : '#f8fafc'};
                border: 1.5px solid ${userWallet > 0 ? (useWallet ? '#16a34a' : '#bbf7d0') : '#e2e8f0'};
                border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
                cursor: ${userWallet > 0 ? 'pointer' : 'default'}; opacity: ${userWallet > 0 ? '1' : '0.6'};
                transition: all 0.2s;
              ">
                <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                  <div style="width:36px; height:36px; border-radius:10px; background:white; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#16a34a; flex-shrink:0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-size:0.88rem; font-weight:800; color:#0f172a;">Saldo Cuenta Agro</div>
                    <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Disponible: ${formatGourmetPrice(userWallet)}</div>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                  ${userWallet > 0 ? `
                    <input type="checkbox" id="chk-use-wallet" ${useWallet ? 'checked' : ''} style="width:18px; height:18px; accent-color:#16a34a; cursor:pointer;" />
                  ` : `
                    <span style="font-size:0.7rem; font-weight:700; color:#94a3b8; background:#f1f5f9; padding:3px 8px; border-radius:6px;">Sin saldo</span>
                  `}
                </div>
              </label>

              <!-- 2. Bono de Consumo -->
              <label style="
                background: ${isBonusEligible && userBonus > 0 ? '#fff1f2' : '#f8fafc'};
                border: 1.5px solid ${isBonusEligible && userBonus > 0 ? (useBonus ? '#be1260' : '#fecdd3') : '#e2e8f0'};
                border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
                cursor: ${isBonusEligible && userBonus > 0 ? 'pointer' : 'default'}; opacity: ${isBonusEligible && userBonus > 0 ? '1' : '0.75'};
                transition: all 0.2s;
              ">
                <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                  <div style="width:36px; height:36px; border-radius:10px; background:white; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#be1260; flex-shrink:0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-size:0.88rem; font-weight:800; color:#0f172a;">Bono de Consumo</div>
                    <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Disponible: ${formatGourmetPrice(userBonus)}</div>
                  </div>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                  ${!isBonusEligible ? `
                    <span style="font-size:0.68rem; font-weight:800; color:#b45309; background:#fef3c7; padding:3px 8px; border-radius:6px;">Aplica en compras ≥ $150.000</span>
                  ` : userBonus > 0 ? `
                    <input type="checkbox" id="chk-use-bonus" ${useBonus ? 'checked' : ''} style="width:18px; height:18px; accent-color:#be1260; cursor:pointer;" />
                  ` : `
                    <span style="font-size:0.7rem; font-weight:700; color:#94a3b8; background:#f1f5f9; padding:3px 8px; border-radius:6px;">Sin bonos</span>
                  `}
                </div>
              </label>

              <!-- 3. Pago Contra Entrega -->
              <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:14px 16px; display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                  <div style="width:36px; height:36px; border-radius:10px; background:white; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#475569; flex-shrink:0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-size:0.88rem; font-weight:800; color:#0f172a;">Efectivo o Transferencia</div>
                    <div style="font-size:0.75rem; color:#64748b; font-weight:500;">Pagas al recibir tu pedido en domicilio</div>
                  </div>
                </div>
                <span style="font-size:0.72rem; font-weight:800; color:#059669; background:#ecfdf5; padding:3px 8px; border-radius:6px;">HABILITADO</span>
              </div>

            </div>
          </div>

          <!-- Desglose de Liquidación -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; font-size:0.84rem; color:#475569;">
              <span>Subtotal combo:</span>
              <strong style="color:#0f172a;">${formatGourmetPrice(offer.price)}</strong>
            </div>

            ${appliedBonus > 0 ? `
              <div style="display:flex; justify-content:space-between; font-size:0.84rem; color:#be1260;">
                <span>Descuento Bono de Consumo:</span>
                <strong>-${formatGourmetPrice(appliedBonus)}</strong>
              </div>
            ` : ''}

            ${appliedWallet > 0 ? `
              <div style="display:flex; justify-content:space-between; font-size:0.84rem; color:#16a34a;">
                <span>Pago con Cuenta Agro:</span>
                <strong>-${formatGourmetPrice(appliedWallet)}</strong>
              </div>
            ` : ''}

            <div style="height:1px; background:#e2e8f0; margin:4px 0;"></div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.92rem; font-weight:800; color:#0f172a;">Total contra entrega:</span>
              <span style="font-size:1.3rem; font-weight:850; color:${cashDue > 0 ? '#0f172a' : '#16a34a'};">
                ${cashDue > 0 ? formatGourmetPrice(cashDue) : '$0 (Cubierto al 100%)'}
              </span>
            </div>
          </div>

        </div>

        <!-- Footer Action Button -->
        <div style="padding:16px 20px; border-top:1px solid #f1f5f9; background:white; flex-shrink:0;">
          <button id="btn-confirm-gourmet-order" style="
            width: 100%;
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            color: white;
            border: none;
            padding: 16px 20px;
            border-radius: 14px;
            font-weight: 850;
            font-size: 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
            transition: all 0.2s;
          " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            Confirmar Pedido por WhatsApp
          </button>
        </div>
      </div>
    `;
  };

  const updateModalDOM = () => {
    modal.innerHTML = renderContent();
    attachModalListeners();
  };

  const closeModal = () => {
    modal.remove();
    document.body.style.overflow = '';
  };

  const attachModalListeners = () => {
    document.getElementById('btn-close-gourmet-modal')?.addEventListener('click', closeModal);

    const bonusChk = document.getElementById('chk-use-bonus');
    if (bonusChk) {
      bonusChk.addEventListener('change', (e) => {
        useBonus = e.target.checked;
        updateModalDOM();
      });
    }

    const walletChk = document.getElementById('chk-use-wallet');
    if (walletChk) {
      walletChk.addEventListener('change', (e) => {
        useWallet = e.target.checked;
        updateModalDOM();
      });
    }

    document.getElementById('btn-confirm-gourmet-order')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-confirm-gourmet-order');
      if (btn) {
        btn.innerText = 'Procesando pedido...';
        btn.disabled = true;
      }

      const { appliedBonus, appliedWallet, cashDue } = calculateTotals();

      // 1. Process bonus or wallet request in DB if applied
      if (appliedBonus > 0) {
        try {
          await createWalletRequest('consumption', appliedBonus);
        } catch (err) {
          console.warn('Error saving consumption request:', err);
        }
      }

      if (appliedWallet > 0) {
        try {
          await createWalletRequest('withdrawal', appliedWallet, `Compra Tienda: ${offer.name}`);
        } catch (err) {
          console.warn('Error saving wallet debit request:', err);
        }
      }

      // 2. Generate structured WhatsApp message
      const { url, refId } = buildGourmetCheckoutWhatsAppLink({
        offer,
        appliedSaldo: appliedWallet,
        appliedBonus,
        cashDue
      });

      window.open(url, '_blank');

      // 3. Close checkout and show receipt popup
      closeModal();
      showGourmetOrderSuccess({ offer, appliedBonus, appliedWallet, cashDue, refId });
    });
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.body.appendChild(modal);
  updateModalDOM();
}

/* ─── Gourmet Order Success Receipt Modal ─── */

function showGourmetOrderSuccess({ offer, appliedBonus = 0, appliedWallet = 0, cashDue = 0, refId = '' }) {
  const existing = document.getElementById('gourmet-order-success-modal');
  if (existing) existing.remove();

  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.id = 'gourmet-order-success-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(15, 23, 42, 0.7)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '999999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '16px';

  modal.innerHTML = `
    <div class="animate-scale-in" style="background:white; border-radius:24px; max-width:440px; width:100%; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); position:relative;">
      <div style="background:linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding:28px 24px; text-align:center; color:white;">
        <div style="width:60px; height:60px; background:white; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); color:#16a34a;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 style="margin:0 0 4px 0; font-size:1.35rem; font-weight:850; color:white;">¡Pedido Registrado!</h3>
        <p style="margin:0; font-size:0.85rem; opacity:0.92;">Estamos listos para coordinar tu entrega</p>
      </div>

      <div style="padding:22px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px; margin-bottom:18px; font-size:0.84rem; color:#334155;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Referencia:</span>
            <strong style="color:#0f172a; font-family:monospace;">#${refId}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Combo:</span>
            <strong style="color:#0f172a;">${offer.name}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Total Pedido:</span>
            <strong style="color:#059669; font-size:0.95rem;">${formatGourmetPrice(offer.price)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b;">Por Pagar en Entrega:</span>
            <strong style="color:#0f172a; font-weight:850;">${cashDue > 0 ? formatGourmetPrice(cashDue) : '$0'}</strong>
          </div>
        </div>

        <p style="font-size:0.8rem; color:#64748b; line-height:1.45; margin:0 0 20px 0; text-align:center;">
          Hemos abierto el chat de WhatsApp con Granja Valle Morales para coordinar dirección y horario de entrega.
        </p>

        <button id="btn-close-gourmet-receipt" style="
          width:100%; background:#0f172a; color:white; border:none; padding:14px;
          border-radius:12px; font-weight:750; font-size:0.95rem; cursor:pointer;
          box-shadow:0 4px 12px rgba(0,0,0,0.1); transition:all 0.2s;
        " onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
          Entendido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeReceipt = () => {
    modal.remove();
    document.body.style.overflow = '';
    // Refresh the view so balances are updated
    renderPiggyGourmetView();
  };

  document.getElementById('btn-close-gourmet-receipt')?.addEventListener('click', closeReceipt);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeReceipt(); });
}
