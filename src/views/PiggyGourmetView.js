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
import { getReferralBonusBalance, getWalletBalance, getWelcomeBonusExpiryInfo, createWalletRequest } from '../services/walletService.js';
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
            Encuentra diferentes cortes en cerdo, pollo y res de la mejor calidad directo desde Granja Valle Morales. <strong>¡Haz tu pedido aquí!</strong>
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
    const [offers, referralBonus, walletBalance, expiryInfo] = await Promise.all([
      getGourmetOffers().catch(err => {
        console.warn('⚠️ getGourmetOffers error, using fallback:', err);
        return [];
      }),
      getReferralBonusBalance().catch(() => 0),
      getWalletBalance().catch(() => 0),
      getWelcomeBonusExpiryInfo().catch(() => null),
    ]);

    const userStats = {
      referralBonus: referralBonus || 0,
      walletBalance: walletBalance || 0
    };

    // Render dynamic bonus banner if user has referral bonus balance
    const bonusContainer = document.getElementById('gourmet-bonus-container');
    if (bonusContainer) {
      if (userStats.referralBonus > 0) {
        const isExpiringSoon = expiryInfo && expiryInfo.status === 'active' && !expiryInfo.isExpired && expiryInfo.daysRemaining > 0;
        const daysText = expiryInfo?.daysRemaining === 1 ? '1 día' : `${expiryInfo?.daysRemaining} días`;

        bonusContainer.innerHTML = `
          <div class="animate-fade-in-up" style="
            background: linear-gradient(135deg, #fffdf2 0%, #fef8db 50%, #fef3c7 100%);
            border: 1.5px solid #fbbf24;
            border-radius: 18px;
            padding: 16px 18px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(245, 158, 11, 0.22), 0 0 12px rgba(251, 191, 36, 0.18);
            position: relative;
          ">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div style="
                width: 38px; height: 38px; border-radius: 11px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                display: flex; align-items: center; justify-content: center;
                color: white; flex-shrink: 0; box-shadow: 0 2px 8px rgba(217, 119, 6, 0.3);
              ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 12v10H4V12"/>
                  <path d="M2 7h20v5H2z"/>
                  <path d="M12 22V7"/>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
              <div style="font-weight: 850; color: #78350f; font-size: 0.95rem; line-height: 1.3; flex: 1;">
                Tienes Bonos de Consumo por ${formatGourmetPrice(userStats.referralBonus)}
              </div>
            </div>
            ${isExpiringSoon ? `
              <div style="font-size: 0.80rem; color: #b45309; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>⏳</span> Aprovecha tu Bono por tiempo limitado. Faltan (${daysText}) para expirar.
              </div>
            ` : ''}
            <div style="font-size: 0.78rem; color: #92400e; line-height: 1.45; width: 100%; border-top: 1px dashed #fde68a; padding-top: 8px;">
              <strong>TC:</strong> Redímelos en compras iguales o superiores a $150.000.
            </div>
          </div>
        `;
      } else {
        bonusContainer.innerHTML = '';
      }
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
          width: 100%;
          aspect-ratio: 800 / 700;
          position: relative;
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        ">
          <div style="
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.25) 30%, transparent 60%);
            z-index: 1;
          "></div>

          <!-- Badges -->
          <div style="
            position: absolute;
            top: 12px;
            left: 12px;
            z-index: 2;
          ">
            <span style="
              background: #fffbeb;
              color: #b45309;
              font-size: 0.72rem;
              font-weight: 800;
              padding: 4px 11px;
              border-radius: 9999px;
              letter-spacing: 0.2px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
            ">${offer.tag ? offer.tag.replace(/^[^\\w\\s]+/, '').trim() : 'Granja Valle Morales'}</span>
          </div>

          <!-- Title Overlay -->
          <div style="
            position: absolute;
            bottom: 12px;
            left: 14px;
            right: 14px;
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
          <p style="margin:0 0 16px 0; font-size:0.82rem; color:#64748b; line-height:1.55; white-space:pre-line;">
            ${(offer.description || '').replace(/\\n/g, '\n').trim()}
          </p>

          <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:12px;">
            <div style="display:flex; flex-direction:column;">
              ${offer.original_price ? `<div style="font-size:0.75rem; color:#94a3b8; text-decoration:line-through; margin-bottom: 2px;">${formatGourmetPrice(offer.original_price)}</div>` : ''}
              <div style="font-size:1.35rem; font-weight:850; color:#0f172a; letter-spacing:-0.5px; line-height: 1;">${formatGourmetPrice(offer.price)}</div>
            </div>

            <button class="btn-gourmet-buy" data-offer-id="${offer.id}" style="
              background: #b80049;
              color: white;
              border: none;
              padding: 10px 22px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 0.9rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              box-shadow: 0 4px 14px rgba(184, 0, 73, 0.35);
              transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
            " onmouseover="this.style.background='#a00040'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 18px rgba(184, 0, 73, 0.45)'"
               onmouseout="this.style.background='#b80049'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 14px rgba(184, 0, 73, 0.35)'">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="margin: 0 0 4px; font-size: 1.05rem; font-weight: 850; color: #0f172a; letter-spacing: -0.01em;">
            ¿Quieres armar los combos a tu medida?
          </h3>
          <p style="margin: 0; font-size: 0.82rem; color: #64748b; line-height: 1.45;">
            Escríbenos y con gusto te enviamos todos los productos que manejamos en cerdo, pollo, y res.
          </p>
        </div>
      </div>

      <button id="btn-custom-order-wa" style="
        width: 100%;
        background: #22c55e;
        color: white;
        border: none;
        padding: 16px 20px;
        border-radius: 9999px;
        font-weight: 800;
        font-size: 1.05rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
        transition: all 0.2s;
      " onmouseover="this.style.background='#16a34a'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#22c55e'; this.style.transform='translateY(0)'">
        <svg xmlns="http://www.w3.org/2000/svg" width="33" height="33" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z"/>
      </svg>
      Contactar Asesor
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

  // Initial payment selections
  let useBonus = isBonusEligible && userBonus > 0;

  const calculateTotals = () => {
    let appliedBonus = 0;
    if (useBonus && isBonusEligible && userBonus > 0) {
      appliedBonus = Math.min(userBonus, offer.price);
    }

    let cashDue = Math.max(0, offer.price - appliedBonus);

    return {
      appliedBonus,
      appliedWallet: 0,
      cashDue
    };
  };

  const renderContent = () => {
    const { appliedBonus, cashDue } = calculateTotals();

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
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="width:100%;">
              <h4 style="margin:0 0 6px; font-size:1.05rem; font-weight:850; color:#0f172a; line-height:1.3;">${offer.name}</h4>
              <div style="font-size:0.82rem; color:#64748b; line-height:1.5; white-space:pre-line;">${(offer.description || '').replace(/\\n/g, '\n').trim()}</div>
            </div>
            <div style="border-top:1px dashed #e2e8f0; padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.82rem; font-weight:700; color:#64748b;">Precio:</span>
              <div style="font-size:1.25rem; font-weight:850; color:#0f172a;">${formatGourmetPrice(offer.price)}</div>
            </div>
          </div>

          ${isBonusEligible ? `
          <!-- Bono de Consumo Option -->
          <label style="
            background: ${userBonus > 0 ? '#fff1f2' : '#f8fafc'};
            border: 1.5px solid ${userBonus > 0 ? (useBonus ? '#be1260' : '#fecdd3') : '#e2e8f0'};
            border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
            cursor: ${userBonus > 0 ? 'pointer' : 'default'}; opacity: ${userBonus > 0 ? '1' : '0.75'};
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
              ${userBonus > 0 ? `
                <input type="checkbox" id="chk-use-bonus" ${useBonus ? 'checked' : ''} style="width:18px; height:18px; accent-color:#be1260; cursor:pointer;" />
              ` : `
                <span style="font-size:0.7rem; font-weight:700; color:#94a3b8; background:#f1f5f9; padding:3px 8px; border-radius:6px;">Sin bonos</span>
              `}
            </div>
          </label>
          ` : ''}

          <!-- Desglose de Liquidación -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; font-size:0.84rem; color:#475569;">
              <span>Subtotal combo:</span>
              <strong style="color:#0f172a;">${formatGourmetPrice(offer.price)}</strong>
            </div>

            ${appliedBonus > 0 ? `
              <div style="display:flex; justify-content:space-between; font-size:0.84rem; color:#be1260;">
                <span>Descuento Bono:</span>
                <strong>-${formatGourmetPrice(appliedBonus)}</strong>
              </div>
            ` : ''}

            <div style="height:1px; background:#e2e8f0; margin:4px 0;"></div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:1.15rem; font-weight:850; color:#0f172a;">Total:</span>
              <span style="font-size:1.15rem; font-weight:850; color:#0f172a;">
                ${formatGourmetPrice(cashDue)}
              </span>
            </div>
          </div>

        </div>

        <!-- Footer Action Button -->
        <div style="padding:16px 20px; border-top:1px solid #f1f5f9; background:white; flex-shrink:0;">
          <button id="btn-confirm-gourmet-order" style="
            width: 100%;
            background: #22c55e;
            color: white;
            border: none;
            padding: 16px 20px;
            border-radius: 9999px;
            font-weight: 800;
            font-size: 1.05rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
            transition: all 0.2s;
          " onmouseover="this.style.background='#16a34a'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#22c55e'; this.style.transform='translateY(0)'">
            <svg xmlns="http://www.w3.org/2000/svg" width="33" height="33" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z"/>
          </svg>
          Confirmar Pedido
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
      <div style="background:#fdf2f5; border-bottom:1px solid #fce4ec; padding:28px 24px; text-align:center;">
        <div style="width:60px; height:60px; background:white; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; box-shadow:0 4px 12px rgba(0,0,0,0.06); color:#059669;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 style="margin:0 0 4px 0; font-size:1.35rem; font-weight:850; color:#0f172a;">¡Pedido Registrado!</h3>
        <p style="margin:0; font-size:0.85rem; color:#64748b;">Estamos listos para coordinar tu entrega</p>
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
          width:100%; background:#BE1260; color:white; border:none; padding:15px;
          border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
          box-shadow:0 4px 14px rgba(190, 18, 96, 0.35); transition:all 0.2s;
        " onmouseover="this.style.background='#a20f52'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#BE1260'; this.style.transform='translateY(0)'">
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
