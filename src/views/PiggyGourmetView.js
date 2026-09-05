/* ==========================================================================
   PIGGY APP — Piggy Gourmet View (Tienda de la Granja)
   Meat combo offers, interactive checkout & multi-payment method redemption.
   ========================================================================== */

import {
  getGourmetOffers,
  formatGourmetPrice,
  buildGourmetWhatsAppLink,
  buildGourmetCustomWhatsAppLink,
  buildGourmetCheckoutWhatsAppLink,
  getGourmetUserStats,
  redeemGourmetOrder
} from '../services/gourmetService.js';
import { AppState } from '../state.js';

export function renderPiggyGourmetView() {
  const main = document.getElementById('main-content');
  if (!main) return;

  const offers = getGourmetOffers();
  const userStats = getGourmetUserStats();

  main.innerHTML = `
    <div class="gourmet-container animate-fade-in" style="padding-bottom: 90px;">
      
      <!-- Top Title Bar -->
      <div class="gourmet-header" style="text-align: center; padding: 24px 16px 16px;">
        <span class="gourmet-header__badge" style="
          display: inline-block;
          background: #fce7ed;
          color: #be1260;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        ">🥩 Tienda de la Granja</span>
        <h1 style="font-size: 1.65rem; font-weight: 850; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.02em;">Piggy Gourmet</h1>
        <p style="font-size: 0.88rem; color: #64748b; margin: 0 auto; max-width: 380px; line-height: 1.45;">
          Encuentra diferentes cortes en cerdo, pollo y res de la mejor calidad directo desde Granja Valle Morales. <strong>¡Haz tu pedido aquí!</strong>
        </p>
      </div>

      <!-- Combo Offers Grid -->
      <div class="gourmet-offers" style="display: flex; flex-direction: column; gap: 20px; padding: 0 16px; margin-bottom: 24px;">
        ${offers.map(offer => renderOfferCard(offer, userStats)).join('')}
      </div>

      <!-- Custom Order Card (Personaliza tu pedido) -->
      <div style="padding: 0 16px; margin-bottom: 24px;">
        <div class="gourmet-custom-card" style="
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-radius: 20px;
          padding: 24px 20px;
          color: white;
          text-align: center;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
          position: relative;
          overflow: hidden;
        ">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔪🥩</div>
          <h3 style="font-size: 1.25rem; font-weight: 850; margin: 0 0 6px 0;">¿Deseas otros cortes o cantidades?</h3>
          <p style="font-size: 0.84rem; color: #cbd5e1; margin: 0 0 18px 0; line-height: 1.45;">
            Personaliza tu pedido con costilla especial, lomo fino, chuletas, cortes de res o pollo al por mayor y al detal.
          </p>
          <a href="${buildGourmetCustomWhatsAppLink()}" target="_blank" style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: #10b981;
            color: white;
            padding: 13px 24px;
            border-radius: 14px;
            font-weight: 800;
            font-size: 0.95rem;
            text-decoration: none;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
            transition: transform 0.15s ease;
          ">
            <span>📲 Cotizar Pedido Personalizado</span>
          </a>
        </div>
      </div>

      <!-- Shipping & Coverage Details Card -->
      <div style="padding: 0 16px;">
        <div style="
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
        ">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
            <span>🚚 Cobertura y Tiempos de Entrega</span>
          </h4>
          <ul style="margin: 0; padding-left: 18px; font-size: 0.82rem; color: #475569; line-height: 1.6; display: flex; flex-direction: column; gap: 4px;">
            <li><strong>Cali y Jamundí:</strong> Domicilios programados de lunes a sábado en cadena de frío.</li>
            <li><strong>Otros municipios cerca a Cali:</strong> Costo de envío según ubicación y peso del pedido.</li>
            <li><strong>Garantía:</strong> Producto 100% fresco, empacado al vacío y con registro sanitario.</li>
          </ul>
        </div>
      </div>

    </div>
  `;

  attachGourmetListeners(offers, userStats);
}

/**
 * Render single offer card
 */
function renderOfferCard(offer, userStats) {
  const isEligibleBonus = offer.price >= 150000;
  const hasReferralBonus = (userStats.referralBonus || 0) > 0;
  const userBonusFormatted = formatGourmetPrice(userStats.referralBonus || 0);

  return `
    <div class="gourmet-card" style="
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 8px 20px -4px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      position: relative;
    ">
      
      <!-- Top Image Banner -->
      <div style="position: relative; height: 190px; width: 100%; overflow: hidden; background: #1e293b;">
        <img 
          src="${offer.image}" 
          alt="${offer.name}" 
          style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
          onerror="this.src='/combo_carnes.jpg';"
        />
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%);"></div>
        
        <!-- Badge Tag -->
        <span style="
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          color: white;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
          letter-spacing: 0.03em;
        ">${offer.tag}</span>

        <!-- Bottom Overlay Info: Title & Subtitle -->
        <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; color: white;">
          <h3 style="font-size: 1.22rem; font-weight: 850; margin: 0 0 2px 0; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${offer.name}</h3>
          <span style="font-size: 0.78rem; opacity: 0.9; font-weight: 600;">${offer.subtitle}</span>
        </div>
      </div>

      <!-- Card Body Content -->
      <div style="padding: 18px 16px 20px; display: flex; flex-direction: column; gap: 14px; flex: 1;">
        
        <!-- Description / Cuts list -->
        <div style="font-size: 0.84rem; color: #475569; line-height: 1.5; white-space: pre-line;">
          ${(offer.description || '').replace(/\\n/g, '\n').trim()}
        </div>

        <!-- Bonus Banner notice if applicable -->
        ${isEligibleBonus ? `
          <div style="
            background: #fdf2f5;
            border: 1px dashed #f472b6;
            border-radius: 12px;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          ">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 1rem;">🎁</span>
              <span style="font-size: 0.76rem; color: #9d174d; font-weight: 700;">Aplica para Bono de Bienvenida ($50.000)</span>
            </div>
            ${hasReferralBonus ? `
              <span style="background: #be1260; color: white; font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;">
                Tienes ${userBonusFormatted}
              </span>
            ` : ''}
          </div>
        ` : ''}

        <!-- Price & CTA Section -->
        <div style="
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        ">
          <div>
            <span style="display: block; font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Precio Especial</span>
            <span style="font-size: 1.35rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em;">${formatGourmetPrice(offer.price)}</span>
          </div>

          <button 
            class="btn-order-combo" 
            data-offer-id="${offer.id}"
            style="
              background: #be1260;
              color: white;
              border: none;
              padding: 12px 18px;
              border-radius: 14px;
              font-weight: 850;
              font-size: 0.9rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
              box-shadow: 0 4px 12px rgba(190, 18, 96, 0.3);
              transition: transform 0.15s ease, background 0.15s ease;
            "
          >
            <span>Pedir Combo</span>
            <span style="font-size: 1.05rem;">→</span>
          </button>
        </div>

      </div>

    </div>
  `;
}

/**
 * Attach listeners to cards
 */
function attachGourmetListeners(offers, userStats) {
  // Attach interactive checkout listeners
  document.querySelectorAll('.btn-order-combo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const offerId = btn.dataset.offerId;
      const offer = offers.find(o => o.id === offerId);
      if (offer) {
        openGourmetCheckoutModal(offer, userStats);
      }
    });
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
          <button id="btn-close-gourmet-modal" style="background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
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

          <!-- Payment Methods / Disccounts Section -->
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:0.82rem; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:0.04em;">Opciones de Pago y Descuentos</div>

            <!-- Option A: Welcome/Referral Bonus -->
            ${isBonusEligible && userBonus > 0 ? `
              <div style="background:#fdf2f5; border:1.5px solid ${useBonus ? '#ec4899' : '#fbcfe8'}; border-radius:14px; padding:14px; display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="font-size:1.3rem;">🎁</div>
                  <div>
                    <div style="font-size:0.88rem; font-weight:800; color:#0f172a;">Bono de Bienvenida</div>
                    <div style="font-size:0.75rem; color:#be1260; font-weight:600;">Descuento aplicable: -${formatGourmetPrice(appliedBonus)}</div>
                  </div>
                </div>
                <label style="position:relative; display:inline-block; width:44px; height:24px; cursor:pointer;">
                  <input type="checkbox" id="toggle-bonus" ${useBonus ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                  <span style="position:absolute; inset:0; background:${useBonus ? '#be1260' : '#cbd5e1'}; border-radius:24px; transition:0.2s;"></span>
                  <span style="position:absolute; top:2px; left:${useBonus ? '22px' : '2px'}; width:20px; height:20px; background:white; border-radius:50%; transition:0.2s;"></span>
                </label>
              </div>
            ` : ''}

          </div>

          <!-- Total Breakdown Card -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">
            <div style="display:flex; justify-content:space-between; color:#64748b;">
              <span>Subtotal del Combo:</span>
              <span>${formatGourmetPrice(offer.price)}</span>
            </div>

            ${appliedBonus > 0 ? `
              <div style="display:flex; justify-content:space-between; color:#be1260; font-weight:700;">
                <span>Descuento Bono:</span>
                <span>-${formatGourmetPrice(appliedBonus)}</span>
              </div>
            ` : ''}

            <div style="border-top:1px solid #e2e8f0; margin-top:4px; padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; font-size:0.95rem; color:#0f172a;">Total a Pagar en Entrega:</span>
              <span style="font-weight:900; font-size:1.3rem; color:#059669;">
                ${cashDue > 0 ? formatGourmetPrice(cashDue) : '$0 (100% Cubierto)'}
              </span>
            </div>
          </div>

          <!-- Shipping Notice -->
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:10px 14px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.1rem;">🛵</span>
            <span style="font-size:0.75rem; color:#166534; line-height:1.4;">
              Envío contra entrega en Cali y alrededores. La dirección y fecha de despacho se confirman vía WhatsApp con Granja Valle Morales.
            </span>
          </div>

        </div>

        <!-- Sticky Footer CTA -->
        <div style="padding:16px 20px calc(20px + env(safe-area-inset-bottom, 0px)); border-top:1px solid #f1f5f9; background:white; flex-shrink:0;">
          <button id="btn-confirm-gourmet-order" style="
            width: 100%;
            background: #16a34a;
            color: white;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-weight: 850;
            font-size: 1.02rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
            transition: all 0.2s ease;
          ">
            <span>Confirmar Pedido</span>
            <span style="font-size:1.15rem;">💬</span>
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

    document.getElementById('toggle-bonus')?.addEventListener('change', (e) => {
      useBonus = e.target.checked;
      updateModalDOM();
    });

    document.getElementById('btn-confirm-gourmet-order')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-confirm-gourmet-order');
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.innerText = 'Procesando pedido...';
      }

      const { appliedBonus, appliedWallet, cashDue } = calculateTotals();

      // 1. Record redemption in service
      await redeemGourmetOrder({
        offerId: offer.id,
        offerName: offer.name,
        price: offer.price,
        appliedBonus,
        appliedWallet,
        cashDue
      });

      // 2. Open WhatsApp with prefilled message
      const { url, refId } = buildGourmetCheckoutWhatsAppLink({
        offer,
        appliedBonus,
        appliedWallet,
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
