/* ============================================
   PIGGY APP — Piggy Gourmet View
   Meat combo offers & bonus redemption
   ============================================ */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';
import { renderBottomNav } from './GranjaView.js';

const WHATSAPP_PHONE = '573154870448';

/**
 * Weekly offers data.
 * Each offer defines a combo with name, description, price, and optional discount.
 */
function getWeeklyOffers() {
    return [
        {
            id: 'combo-parrilla',
            name: 'Combo Parrillero Familiar',
            description: '3kg Costilla de cerdo + 2kg Chorizo artesanal + 1kg Chicharrón',
            originalPrice: 185000,
            price: 149000,
            tag: '🔥 Más vendido',
            emoji: '🥩',
        },
        {
            id: 'combo-premium',
            name: 'Combo Premium Mixto',
            description: '2kg Lomo de cerdo + 2kg Pechuga de pollo + 1.5kg Carne de res molida',
            originalPrice: 210000,
            price: 178000,
            tag: '⭐ Premium',
            emoji: '🍖',
        },
        {
            id: 'combo-semanal',
            name: 'Combo Semanal Hogar',
            description: '2kg Pernil de cerdo + 2kg Muslo de pollo + 1kg Carne para guisar',
            originalPrice: 160000,
            price: 135000,
            tag: '💰 Ahorra más',
            emoji: '🐔',
        },
    ];
}

/**
 * Format COP currency.
 */
function formatPrice(value) {
    return '$' + value.toLocaleString('es-CO');
}

/**
 * Build the WhatsApp purchase link for a specific offer.
 */
function buildWhatsAppLink(offer) {
    const profile = AppState.get('profile');
    const userName = profile?.full_name || 'Usuario';
    const message = encodeURIComponent(
        `¡Hola equipo Piggy! 🐷 Soy ${userName}.\n\nQuiero pedir el *${offer.name}* por ${formatPrice(offer.price)}.\n\n${offer.description}\n\n¡Gracias!`
    );
    return `https://wa.me/${WHATSAPP_PHONE}?text=${message}`;
}

/**
 * Render the Piggy Gourmet view.
 */
export function renderPiggyGourmetView() {
    const app = document.getElementById('app');
    const offers = getWeeklyOffers();

    app.innerHTML = `
    <div class="page page--with-nav">
      <div class="page__content">

        <!-- Back Button + Title -->
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;" class="animate-fade-in">
          <button id="btn-gourmet-back" style="
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: transform 0.2s;
          " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
            ${renderIcon('arrowLeft', '', '20')}
          </button>
          <div>
            <h2 style="margin:0; font-size:1.6rem; font-weight:800; color:#1f2937;">Piggy Gourmet</h2>
            <p style="margin:0; font-size:0.8rem; color:#6b7280;">Proteína fresca directo de la granja 🐷</p>
          </div>
        </div>

        <!-- Bonus Reminder -->
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
            <div style="font-weight: 700; color: #92400e; font-size: 0.9rem;">¡Tienes un bono de $50.000!</div>
            <div style="font-size: 0.78rem; color: #a16207; margin-top: 2px;">Aplica en pedidos desde $150.000. Descuento directo al pagar.</div>
          </div>
        </div>

        <!-- OFERTA DE LA SEMANA Banner -->
        <div class="animate-fade-in-up" style="animation-delay: 0.1s;">
          <div style="
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            border-radius: 20px;
            padding: 24px;
            color: white;
            position: relative;
            overflow: hidden;
            margin-bottom: 24px;
            box-shadow: 0 10px 30px -5px rgba(220, 38, 38, 0.4);
          ">
            <!-- Decorative pattern -->
            <div style="
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              opacity: 0.06;
              background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%220%22 y=%2240%22 font-size=%2230%22%3E🥩%3C/text%3E%3C/svg%3E');
              pointer-events: none;
            "></div>

            <div style="position:relative; z-index:2;">
              <div style="
                background: rgba(255,255,255,0.2);
                display: inline-block;
                padding: 4px 14px;
                border-radius: 20px;
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin-bottom: 12px;
                backdrop-filter: blur(4px);
              ">🔥 OFERTA DE LA SEMANA</div>

              <h3 style="margin:0 0 6px 0; font-size:1.4rem; font-weight:800;">
                Combos de Carne Fresca
              </h3>
              <p style="margin:0; opacity:0.85; font-size:0.85rem; line-height:1.4;">
                Directo de Granja Villa Morales. Cerdo, pollo y res de la mejor calidad. Envío gratis en Cali.
              </p>
            </div>

            <!-- Big decoration -->
            <div style="position:absolute; bottom:-20px; right:-10px; font-size:80px; opacity:0.15; transform:rotate(-15deg);">🐷</div>
          </div>
        </div>

        <!-- Offer Cards -->
        <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:24px;">
          ${offers.map((offer, index) => renderOfferCard(offer, index)).join('')}
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
      ${renderBottomNav('granja')}
    </div>
  `;

    attachGourmetListeners(offers);
}

/**
 * Render an individual offer card.
 */
function renderOfferCard(offer, index) {
    const discount = Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100);

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

        <!-- Card Header -->
        <div style="
          background: linear-gradient(135deg, #fff7ed, #ffedd5);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:36px;">${offer.emoji}</div>
            <div>
              <div style="font-weight: 800; color: #1f2937; font-size: 1rem;">${offer.name}</div>
              <span style="
                background: #dc2626;
                color: white;
                font-size: 0.65rem;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 8px;
              ">${offer.tag}</span>
            </div>
          </div>
          <div style="
            background: #16a34a;
            color: white;
            font-size: 0.7rem;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 10px;
          ">-${discount}%</div>
        </div>

        <!-- Card Body -->
        <div style="padding: 16px 20px;">
          <p style="margin:0 0 14px 0; font-size:0.82rem; color:#6b7280; line-height:1.5;">
            ${offer.description}
          </p>

          <div style="display:flex; align-items:flex-end; justify-content:space-between;">
            <div>
              <div style="font-size:0.75rem; color:#9ca3af; text-decoration:line-through;">${formatPrice(offer.originalPrice)}</div>
              <div style="font-size:1.4rem; font-weight:800; color:#dc2626;">${formatPrice(offer.price)}</div>
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
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 15px rgba(34,197,94,0.35)'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Comprar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners for the gourmet view.
 */
function attachGourmetListeners(offers) {
    // Back button
    document.getElementById('btn-gourmet-back')?.addEventListener('click', () => {
        navigateTo('granja');
    });

    // Buy buttons → WhatsApp
    document.querySelectorAll('.btn-gourmet-buy').forEach((btn) => {
        btn.addEventListener('click', () => {
            const offerId = btn.dataset.offerId;
            const offer = offers.find((o) => o.id === offerId);

            if (!offer) return;

            const waLink = buildWhatsAppLink(offer);
            window.open(waLink, '_blank');
        });
    });
}
