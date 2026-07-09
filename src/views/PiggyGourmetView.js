/* ==========================================================================
   PIGGY APP — Piggy Gourmet View
   Meat combo offers & bonus redemption
   Now powered by DB-backed gourmetService with premium real images.
   ========================================================================= */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';
import { renderBottomNav } from './GranjaView.js';
import {
  getGourmetOffers,
  formatGourmetPrice,
  buildGourmetWhatsAppLink,
} from '../services/gourmetService.js';
import { getReferralBonusBalance, createWalletRequest } from '../services/walletService.js';
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

        <!-- Title & Subtitle (Standardized size matching other sections) -->
        <div class="animate-fade-in" style="margin-bottom:24px;">
          <h2 style="font-size: var(--text-3xl); font-weight: var(--font-extrabold); color: var(--color-text-primary); margin: 0 0 var(--space-xs) 0;">Tienda</h2>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary); line-height: var(--leading-relaxed); margin: 0;">
            Encuentra diferentes cortes en cerdo, pollo y res de la mejor calidad directo desde Granja Valle Morales. 👌 <strong>¡Haz tu pedido aquí!</strong>.
          </p>
        </div>

        <!-- Bonus Reminder (Filled dynamically) -->
        <div id="gourmet-bonus-container"></div>

        <!-- Offer Cards Container -->
        <div id="gourmet-offers-container" style="display:flex; flex-direction:column; gap:20px; margin-bottom:24px;">
          ${renderPiggyLoader('Cargando ofertas...')}
        </div>

        <!-- Info Footer -->
        <div class="animate-fade-in-up" style="animation-delay: 0.5s;">
          <div style="
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 14px;
            padding: 16px 20px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          ">
            <div style="font-size:24px; flex-shrink:0; margin-top:2px;">🚚</div>
            <div>
              <div style="font-weight:700; color:#166534; font-size:0.85rem; margin-bottom:4px;">Información de entregas</div>
              <div style="font-size:0.78rem; color:#15803d; line-height:1.5;">
                <strong>Cali:</strong> Domicilio gratis en zona urbana.<br/>
                <strong>Otros municipios:</strong> Costo de envío según ubicación y peso.
              </div>
            </div>
          </div>
        </div>

      </div>
      ${renderBottomNav('gourmet')}
    </div>
  `;

  // Load offers from service
  loadGourmetOffers();
}

/* ─── Load and Render Offers ─── */

async function loadGourmetOffers() {
  try {
    // A 600ms delay ensures the premium logo loader is visible for a smooth UX transition
    const [offers, referralBonus] = await Promise.all([
      getGourmetOffers(),
      getReferralBonusBalance(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]);

    // Render dynamic bonus banner if user has balance
    const bonusContainer = document.getElementById('gourmet-bonus-container');
    if (bonusContainer && referralBonus > 0) {
      bonusContainer.innerHTML = `
        <div class="animate-fade-in-up" style="
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #fcd34d;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        ">
          <div style="font-size: 32px; flex-shrink: 0;">🎁</div>
          <div>
            <div style="font-weight: 800; color: #92400e; font-size: 0.95rem;">¡Tienes Bonos de Consumo por ${formatGourmetPrice(referralBonus)}!</div>
            <div style="font-size: 0.78rem; color: #a16207; margin-top: 2px;">Puedes usarlos para comprar carne de tu granja. Se aplicará como descuento.</div>
          </div>
        </div>
      `;
    }

    renderOfferCards(offers, referralBonus);
  } catch (err) {
    console.error('Error loading gourmet offers:', err);
    const container = document.getElementById('gourmet-offers-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px; color:#9ca3af;">
            Error al cargar las ofertas. Intenta de nuevo.
        </div>
      `;
    }
  }
}

function renderOfferCards(offers, referralBonus) {
  const container = document.getElementById('gourmet-offers-container');
  if (!container) return;

  // Display all active offers from database
  const displayOffers = offers;

  if (displayOffers.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px; color:#9ca3af;">
          <div style="font-size:48px; margin-bottom:12px;">🥩</div>
          <p>No hay ofertas disponibles en este momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayOffers.map((offer, index) => renderOfferCard(offer, index)).join('');

  // Attach buy listeners
  displayOffers.forEach(offer => {
    const btn = document.querySelector(`[data-offer-id="${offer.id}"]`);
    if (btn) {
      btn.addEventListener('click', async () => {
        // If user has bonus, ask if they want to apply it
        let appliedBonus = 0;
        
        if (referralBonus > 0) {
          const maxApplicable = Math.min(referralBonus, offer.price);
          const confirmUse = confirm(`Tienes ${formatGourmetPrice(referralBonus)} en Bonos de Consumo.\n\n¿Deseas aplicar ${formatGourmetPrice(maxApplicable)} como descuento para este pedido?`);
          
          if (confirmUse) {
            btn.style.opacity = '0.5';
            btn.innerText = 'Procesando...';
            
            // Record the consumption transaction in DB
            const res = await createWalletRequest('consumption', maxApplicable);
            if (!res.success) {
              alert('Hubo un error al procesar tu bono: ' + res.reason);
              btn.style.opacity = '1';
              btn.innerHTML = 'Comprar';
              return;
            }
            appliedBonus = maxApplicable;
            alert(`¡Bono aplicado con éxito! Se descontaron ${formatGourmetPrice(maxApplicable)} de tu saldo de referidos.`);
          }
        }

        // Build custom WhatsApp link with discount info
        let waLink = buildGourmetWhatsAppLink(offer);
        if (appliedBonus > 0) {
            const finalPrice = offer.price - appliedBonus;
            const extraMsg = encodeURIComponent(`\n\n*¡Atención!* He aplicado un Bono de Consumo por *${formatGourmetPrice(appliedBonus)}*.\n*Total a pagar:* ${formatGourmetPrice(finalPrice)}`);
            waLink += extraMsg;
        }

        window.open(waLink, '_blank');
        
        // Reload view to reflect updated balance if bonus was used
        if (appliedBonus > 0) {
          setTimeout(() => { window.location.reload(); }, 1000);
        }
      });
    }
  });
}

function renderOfferCard(offer, index) {
  const discount = offer.original_price
    ? Math.round(((offer.original_price - offer.price) / offer.original_price) * 100)
    : 0;

  // Real image URL with safe placeholder fallback
  const imageUrl = offer.image_url || 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80';

  return `
    <div class="animate-fade-in-up" style="animation-delay: ${0.15 + index * 0.1}s;">
      <div style="
        background: white;
        border-radius: 20px;
        border: 1px solid #f3f4f6;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        transition: transform 0.2s, box-shadow 0.2s;
      " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)'" 
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.06)'">

        <!-- Card Header Image with Overlay - Height reduced to 90px (half) -->
        <div style="
          height: 90px;
          position: relative;
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
        ">
          <!-- Dark gradient overlay for text readability -->
          <div style="
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.3) 60%, rgba(0, 0, 0, 0.1) 100%);
            z-index: 1;
          "></div>

          <!-- Overlay Badge (Semi-transparent Red) & Discount Percentage (Glassmorphism with shadow) -->
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
              background: rgba(220, 38, 38, 0.6);
              color: white;
              font-size: 0.62rem;
              font-weight: 800;
              padding: 3px 8px;
              border-radius: 20px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            ">${offer.tag || '🔥 Oferta'}</span>
            
            ${discount > 0 ? `
              <div style="
                background: rgba(255, 255, 255, 0.25);
                color: white;
                font-size: 0.68rem;
                font-weight: 900;
                padding: 4px 8px;
                border-radius: 20px;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                border: 1px solid rgba(255, 255, 255, 0.35);
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                text-shadow: 0 1px 3px rgba(0,0,0,0.5);
              ">-${discount}%</div>
            ` : ''}
          </div>

          <!-- Title Overlay at the bottom of the image -->
          <div style="
            position: absolute;
            bottom: 8px;
            left: 12px;
            right: 12px;
            z-index: 2;
          ">
            <h4 style="
              margin: 0;
              font-size: 1.1rem;
              font-weight: 800;
              color: white;
              text-shadow: 0 2px 4px rgba(0,0,0,0.6);
              line-height: 1.2;
            ">${offer.name}</h4>
          </div>
        </div>

        <!-- Card Body -->
        <div style="padding: 18px 20px;">
          <p style="margin:0 0 18px 0; font-size:0.82rem; color:#6b7280; line-height:1.55;">
            ${offer.description}
          </p>

          <div style="display:flex; align-items:flex-end; justify-content:space-between;">
            <div style="display:flex; flex-direction:column;">
              ${offer.original_price ? `<div style="font-size:0.75rem; color:#9ca3af; text-decoration:line-through; margin-bottom: 2px;">${formatGourmetPrice(offer.original_price)}</div>` : ''}
              <div style="font-size:1.45rem; font-weight:850; color:#dc2626; letter-spacing:-0.5px; line-height: 1;">${formatGourmetPrice(offer.price)}</div>
            </div>

            <button class="btn-gourmet-buy" data-offer-id="${offer.id}" style="
              background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 14px;
              font-weight: 700;
              font-size: 0.9rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              box-shadow: 0 6px 15px rgba(34, 197, 94, 0.35);
              transition: transform 0.2s, box-shadow 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(34,197,94,0.45)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 15px rgba(34, 197, 94, 0.35)'">
              <!-- Modern Shopping Bag Icon -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
