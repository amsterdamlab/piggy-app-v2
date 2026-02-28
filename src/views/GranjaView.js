/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Matches screen2.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats, formatCOP } from '../services/piggiesService.js';
import { navigateTo } from '../router.js';
import { signOut } from '../services/authService.js';
import { showCheckoutModal } from './MercadoView.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { getMyReferralCode, getMyReferralStats, shareReferralCode, formatReferralBalance } from '../services/referralService.js';
import { getWalletBalance, createWalletRequest, notifyAdminViaWhatsApp } from '../services/walletService.js';

/* =========================================
   DYNAMIC NOTIFICATIONS
   Rotate randomly on each page load
   ========================================= */

const NOTIFICATIONS = [
  {
    icon: '🎉',
    title: 'Compra en locales aliados',
    reward: 'Desbloquea un Piggy Silver (24h)',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    cta: '#/aliados',
  },
  {
    icon: '⏳',
    title: 'Al cerrar un ciclo',
    reward: 'Desbloquea Piggy Silver (24h)',
    color: '#0891b2',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    cta: null,
  },
  {
    icon: '🔥',
    title: 'Compra la oferta de la semana',
    reward: 'Desbloquea un Piggy Gold (24h)',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    cta: '#/gourmet',
  },
  {
    icon: '🤝',
    title: 'Refiere a un amigo y si compra su 1er Piggy',
    reward: 'Obtén $30.000 en tu Wallet',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    cta: null,
  },
];

/**
 * Pick a random notification from the pool.
 */
function getRandomNotification() {
  const index = Math.floor(Math.random() * NOTIFICATIONS.length);
  return NOTIFICATIONS[index];
}

/* =========================================
   DYNAMIC MISSION BANNERS
   M1 ? M2 ? M3 based on piggy count
   ========================================= */

/**
 * Determine which mission banner to show based on user's piggy count.
 * M1: 0 piggies ? Welcome Bonus ($50,000 consumption bonus)
 * M2: 1 piggy  ? Buy 2nd Piggy ? +1% Commercial Margin
 * M3: 2 piggies ? Activate 3rd Piggy ? Maintain 10%
 * 3+ piggies: All missions complete, no banner
 */
function renderMissionBanner(piggyCount) {
  if (piggyCount === 0) {
    // M1: No piggies yet ? Show welcome bonus banner
    return `
      <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
        <div class="banner banner--interactive" id="mission-banner" data-mission="m1" style="
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 16px;
          padding: 20px 24px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 25px -5px rgba(245, 158, 11, 0.4);
          cursor: pointer;
        ">
          <div style="position:absolute; top:0; left:0; right:0; bottom:0; opacity:0.06; background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%220%22 y=%2240%22 font-size=%2230%22%3E🐷%3C/text%3E%3C/svg%3E'); pointer-events:none;"></div>
          <div style="position:relative; z-index:2;">
            <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">🎯 MISIÓN 1</div>
            <div style="font-size:1.2rem; font-weight:800; margin-bottom:4px;">Crea una cuenta y compra tu primer Piggy</div>
            <div style="font-size:0.85rem; opacity:0.9;">🎁 Bono de Bienvenida: <strong>$50.000 en consumo de carne</strong></div>
            <div style="margin-top:14px;">
              <span style="background:white; color:#d97706; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">Compra tu Piggy 🛒</span>
            </div>
          </div>
          <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">🐷</div>
        </div>
      </div>
    `;
  }

  if (piggyCount === 1) {
    // M1 completed (has 1st piggy). Show redeem bonus CTA ? Gourmet
    // Then show M2 below it
    return `
      <!-- M1 Completed: Redeem Bonus -->
      <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
        <div class="banner banner--interactive" id="mission-banner" data-mission="m1-redeem" style="
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 16px;
          padding: 18px 22px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 25px -5px rgba(245, 158, 11, 0.4);
          cursor: pointer;
        ">
          <div style="position:relative; z-index:2; display:flex; align-items:center; gap:14px;">
            <div style="font-size:36px; flex-shrink:0;">🎁</div>
            <div style="flex:1;">
              <div style="font-size:0.95rem; font-weight:800;">¡Tienes un Bono de $50.000!</div>
              <div style="font-size:0.78rem; opacity:0.9;">Bono de consumo en carne. ¡Redímelo ahora!</div>
            </div>
            <span style="background:white; color:#d97706; padding:8px 16px; border-radius:10px; font-weight:700; font-size:0.8rem; white-space:nowrap;">Redimir Bono Ahora</span>
          </div>
        </div>
      </div>

      <!-- M2: Buy 2nd Piggy -->
      <div class="section animate-fade-in-up" style="animation-delay: 0.35s;">
        <div class="banner banner--interactive" id="mission-banner-m2" data-mission="m2" style="
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border-radius: 16px;
          padding: 20px 24px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 25px -5px rgba(99, 102, 241, 0.4);
          cursor: pointer;
        ">
          <div style="position:relative; z-index:2;">
            <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">🎯 MISIÓN 2</div>
            <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Compra tu 2do Piggy</div>
            <div style="font-size:0.85rem; opacity:0.9;">🚀 Desbloquea un piggy de 3 meses y <strong>+1% en Margen Comercial</strong></div>
            <div style="margin-top:14px;">
              <span style="background:white; color:#4f46e5; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">Ir al Mercado 🛒</span>
            </div>
          </div>
          <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">🥈</div>
        </div>
      </div>
    `;
  }

  if (piggyCount === 2) {
    // M2 completed, show M3
    return `
      <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
        <div class="banner banner--interactive" id="mission-banner" data-mission="m3" style="
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
          border-radius: 16px;
          padding: 20px 24px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 25px -5px rgba(8, 145, 178, 0.4);
          cursor: pointer;
        ">
          <div style="position:relative; z-index:2;">
            <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">🎯 MISIÓN 3</div>
            <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Activa tu 3er Piggy</div>
            <div style="font-size:0.85rem; opacity:0.9;">⭐ Mantén el <strong>10% en Margen Comercial</strong> de la Granja</div>
            <div style="margin-top:14px;">
              <span style="background:white; color:#0e7490; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">Ir al Mercado 🛒</span>
            </div>
          </div>
          <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">🥇</div>
        </div>
      </div>
    `;
  }

  // 3+ piggies: All missions complete! Show celebration
  return `
    <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
      <div style="
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        border: 1px solid #a7f3d0;
        border-radius: 16px;
        padding: 18px 22px;
        display: flex;
        align-items: center;
        gap: 14px;
      ">
        <div style="font-size:32px;">🎉</div>
        <div>
          <div style="font-weight:800; color:#065f46; font-size:0.95rem;">¡Misiones completadas!</div>
          <div style="font-size:0.78rem; color:#047857;">Tu granja está al máximo. Margen Comercial: 10%</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the random notification strip.
 */
function renderRandomNotification() {
  const notif = getRandomNotification();
  return `
    <div class="animate-fade-in-up" style="animation-delay: 0.05s; margin-bottom: 16px;">
      <div id="dynamic-notification" style="
        background: ${notif.bgColor};
        border: 1px solid ${notif.borderColor};
        border-radius: 14px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: ${notif.cta ? 'pointer' : 'default'};
        transition: transform 0.2s, box-shadow 0.2s;
      " ${notif.cta ? `data-cta="${notif.cta}"` : ''}
         onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
        <div style="font-size:24px; flex-shrink:0;">${notif.icon}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; color:${notif.color}; font-size:0.82rem; line-height:1.3;">${notif.title}</div>
          <div style="font-size:0.72rem; color:#6b7280; margin-top:2px;">? ${notif.reward}</div>
        </div>
        <div style="font-size:14px; color:${notif.color}; opacity:0.5; flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the Granja (Dashboard) view.
 */
export function renderGranjaView() {
  const app = document.getElementById('app');
  const profile = AppState.get('profile');
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

  app.innerHTML = buildGranjaShell(firstName);

  loadGranjaData(firstName);

  return () => {
    // cleanup
    removeBonusModal();
  };
}

/**
 * Build the shell (before data is loaded).
 */
function buildGranjaShell(firstName) {
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title">Mi Granja</h2>

        <!-- Stats Skeleton (New Wallet Look) -->
        <div class="section animate-fade-in-up">
           <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 16px; margin-bottom: 24px; color: white; position:relative; overflow:hidden;">
              <h3 style="margin:0 0 16px 0; font-size:1.1rem; opacity:0.9;">Wallet de ${firstName}</h3>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:60px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:60px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:100px; height:24px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:40px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
              </div>
              <div style="position: absolute; bottom: -10px; right: -10px; opacity: 0.15; transform: rotate(-15deg);">
                 <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>
           </div>
        </div>

        <!-- Piggies section skeleton -->
        <div class="section" id="piggies-section">
          <div class="loading-container">
            <div class="spinner"></div>
            <span>Cargando tu granja...</span>
          </div>
        </div>
      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

/**
 * Load data and update the dashboard.
 */
async function loadGranjaData(firstName) {
  try {
    const piggies = await getUserPiggies();
    const stats = await getDashboardStats(piggies);

    // Fetch wallet balance (referral commissions)
    const walletBalance = await getWalletBalance();
    stats.walletBalance = walletBalance;
    stats.saldoDisponible = (stats.disponible || 0) + walletBalance;
    stats.saldoDisponibleFormatted = formatCOP(stats.saldoDisponible);

    AppState.set({ piggies });

    const app = document.getElementById('app');
    app.innerHTML = buildGranjaFull(firstName, piggies, stats);

    attachGranjaListeners(piggies.length > 0, stats, piggies.length);
  } catch (error) {
    console.error('Error loading granja data:', error);
    const section = document.getElementById('piggies-section');
    if (section) {
      section.innerHTML = `
        <div class="auth-form__error auth-form__error--visible">
          Error al cargar datos. Intenta de nuevo.
        </div>
      `;
    }
  }
}

/**
 * Build the full dashboard with data.
 */
function buildGranjaFull(firstName, piggies, stats) {
  const piggyCount = piggies.length;
  const missionBanner = renderMissionBanner(piggyCount);
  const notification = renderRandomNotification();

  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Mi Granja</h2>

        <!-- Dynamic Notification (rotates on refresh) -->
        ${notification}

        <!-- Wallet Banner (Green) -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s;">
           <div class="wallet-banner-card" style="
              background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
              color: white; 
              padding: 24px; 
              border-radius: 16px; 
              margin-bottom: 24px; 
              position: relative; 
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
           ">
              <!-- Organic Pattern Background (Piggy Silhouette) -->
              <div style="
                  position: absolute; 
                  top: 0; left: 0; right: 0; bottom: 0; 
                  opacity: 0.05; 
                  background-image: url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Ctext x=\\'0\\' y=\\'40\\' font-size=\\'30\\'%3E🐷%3C/text%3E%3C/svg%3E');
                  pointer-events: none;
              "></div>

              <!-- Decorative Big Icon -->
              <div style="position: absolute; bottom: -15px; right: -15px; opacity: 0.15; transform: rotate(-15deg); color:white;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>

              <div style="position:relative; z-index:2;">
                 <h3 style="margin:0 0 20px 0; font-size:1.25rem; font-weight:700;">Wallet de ${firstName}</h3>
                 
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <!-- Adquisicion -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Adquisición Bonos de Preventa</div>
                       <div style="font-size:1rem; font-weight:600;">${stats.adquisicionBonosFormatted}</div>
                    </div>
                    <!-- Diferencial (High Visual Weight) -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Diferencial de Preventa</div>
                       <div style="
                           font-size: 1.3rem; 
                           font-weight: 700; 
                           color: #39FF14; 
                           text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
                           letter-spacing: 0.5px;
                       ">+${stats.diferencialPreventaFormatted}</div>
                    </div>
                    
                    <!-- Fase de Maduracion (Progress Bar) -->
                    <div style="grid-column: span 2;">
                       <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:6px;">
                           <div style="font-size:0.75rem; opacity:0.8;">Fase de Maduración Técnica</div>
                           <div style="font-size:0.85rem; font-weight:600;">${stats.nextCloseDays !== null ? stats.nextCloseDays + ' días restantes' : '-'}</div>
                       </div>
                       
                       <div style="background:rgba(0,0,0,0.25); height:8px; border-radius:10px; overflow:hidden; position:relative;">
                           <div style="
                               width:${stats.nextCloseProgress}%; 
                               background: linear-gradient(90deg, #39FF14, #B4F8C8); 
                               height:100%; 
                               border-radius:10px; 
                               box-shadow: 0 0 8px rgba(57,255,20,0.6);
                               transition: width 1s ease-out;
                           "></div>
                       </div>

                       <div style="display:flex; justify-content:space-between; margin-top:4px; opacity:0.6; font-size:10px;">
                           <span>Inicio Ciclo</span>
                           <span>Cosecha (19 sem)</span>
                       </div>
                    </div>

                    <!-- Disponible -->
                    <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.15); padding-top:16px; position:relative;">
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Saldo Disponible</div>
                       <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                           <div style="font-size:1.75rem; font-weight:800; letter-spacing: -0.5px; line-height: 1;">${stats.saldoDisponibleFormatted}</div>
                           <div style="font-size:0.75rem; opacity:0.9; text-align:right; padding-bottom: 2px;">
                               Margen Comercial Granja: <strong style="color:white; font-weight:800;">${stats.baseROIFormatted}</strong>
                           </div>
                       </div>
                    </div>
                 </div>

                 ${stats.saldoDisponible > 0 ? `
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                       <button id="btn-withdraw" style="
                          background: white; 
                          color: #059669; 
                          border: none; 
                          padding: 10px 20px; 
                          border-radius: 12px; 
                          font-weight: 700; 
                          font-size: 0.9rem; 
                          cursor: pointer;
                          flex: 1;
                          white-space: nowrap;
                          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                          transition: transform 0.2s;
                       ">Retiro</button>
                       <button id="btn-meat" style="
                          background: rgba(255,255,255,0.15); 
                          color: white; 
                          border: 1px solid rgba(255,255,255,0.3); 
                          padding: 10px 20px; 
                          border-radius: 12px; 
                          font-weight: 600; 
                          font-size: 0.9rem; 
                          cursor: pointer;
                          flex: 1;
                          white-space: nowrap;
                          backdrop-filter: blur(5px);
                       ">Consumo</button>
                    </div>
                  ` : ''}
              </div>
           </div>
        </div>



        <!-- ROI Info -->
        ${stats.activeCount > 0 ? `
          <div class="animate-fade-in-up" style="animation-delay: 0.18s; margin-top: 16px; margin-bottom: 12px;">
            <button id="btn-quick-buy" style="
                background: #ec4899; 
                color: white; 
                border: none; 
                width: 100%; 
                padding: 14px 20px; 
                border-radius: 12px; 
                font-weight: 700; 
                font-size: 1rem; 
                cursor: pointer; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                gap: 10px;
                box-shadow: 0 8px 20px -5px rgba(236, 72, 153, 0.5);
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="
                    background: white; 
                    color: #ec4899;
                    width: 22px; 
                    height: 22px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-size: 18px;
                    font-weight: 800;
                    padding-bottom: 2px;
                ">+</div>
                Compra un Nuevo Piggy
            </button>
          </div>
        ` : ''}

        <!-- Mis Cerdos -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.2s;">
          <div class="section__header">
            <h3 class="section__title">Mis Piggys</h3>
            <a href="#/mercado" class="section__link">
              Ver ofertas ${renderIcon('arrowRight', '', '14')}
            </a>
          </div>

          ${piggies.length === 0 ? renderEmptyPiggies() : renderPiggiesList(piggies, stats.baseROI)}
        </div>

        <!-- Dynamic Mission Banner -->
        ${missionBanner}

      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

// ... renderGreeting remains the same ...

function renderGreeting(firstName) {
  const initial = firstName.charAt(0).toUpperCase();
  return `
    <div class="granja-greeting animate-fade-in" style="display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="granja-greeting__avatar">
          <span class="granja-greeting__initial">${initial}</span>
          <span class="granja-greeting__online"></span>
        </div>
        <div class="granja-greeting__text">
          <span class="granja-greeting__welcome">¡Bienvenido!</span>
          <span class="granja-greeting__name">Hola, ${firstName}</span>
        </div>
      </div>
      <div id="greeting-referral-code" style="
        display: flex;
        align-items: center;
        background: linear-gradient(135deg, #7c3aed, #5b21b6);
        color: white;
        padding: 6px 14px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(124,58,237,0.3);
        transition: transform 0.2s, box-shadow 0.2s;
        white-space: nowrap;
        letter-spacing: 1.5px;
      " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(124,58,237,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(124,58,237,0.3)'">
        <span id="greeting-code-value">···</span>
      </div>
    </div>
  `;
}

/**
 * Render empty piggies state matching screen2.png.
 */
function renderEmptyPiggies() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">
        <img src="pig1.png" alt="Piggy" style="width:100%; height:100%; object-fit:cover;" />
      </div>
      <div class="empty-state__title">No tienes Piggys aún</div>
      <div class="empty-state__description">
        Comienza tu granja comprando tu primer piggy y empieza a generar beneficios.
      </div>
      <button class="btn btn--primary" id="btn-adopt-empty" onclick="location.hash='#/adopcion'">
        Compra un nuevo Piggy
      </button>
    </div>
  `;
}

// ... renderPiggiesList and renderPiggyCard remain the same ...

function renderPiggiesList(piggies, baseROI) {
  return `
    <div class="piggies-list">
      ${piggies.map((piggy) => renderPiggyCard(piggy, baseROI)).join('')}
    </div>
  `;
}

function renderPiggyCard(piggy, baseROI) {
  const totalROI = baseROI + (piggy.extra_roi_bonus || 0);
  const projectedReturn = piggy.investment_amount * (1 + totalROI);

  return `
    <div class="piggy-card card card--interactive" data-piggy-id="${piggy.id}">
      <div class="piggy-card__header">
        <div class="piggy-card__avatar">
          <img src="pig1.png" alt="Piggy" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />
        </div>
        <div class="piggy-card__info">
          <div class="piggy-card__name">${piggy.name}</div>
          <div class="piggy-card__status">
            ${piggy.isComplete
      ? '<span class="badge badge--success">Listo para liquidar</span>'
      : `<span class="badge badge--primary">${piggy.daysLeft} días restantes</span>`
    }
          </div>
        </div>
        ${piggy.extra_roi_bonus > 0 ? `
          <span class="badge badge--warning">+${(piggy.extra_roi_bonus * 100).toFixed(0)}%</span>
        ` : ''}
      </div>

      <div class="piggy-card__progress">
        <div class="piggy-card__progress-header">
          <span class="text-sm text-muted">Progreso del ciclo</span>
          <span class="text-sm font-semibold">${piggy.progress}%</span>
        </div>
        <div class="progress">
          <div class="progress__bar" style="width: ${piggy.progress}%;"></div>
        </div>
      </div>

      <div class="piggy-card__stats grid-2">
        <div>
          <div class="text-xs text-muted">Peso actual</div>
          <div class="font-semibold">${piggy.currentWeight} kg</div>
        </div>
        <div>
          <div class="text-xs text-muted">Margen Comercial Estimado</div>
          <div class="font-semibold text-primary">${formatCOP(projectedReturn)}</div>
          ${piggy.extra_roi_bonus > 0 ? `<div class="text-xs" style="font-size:10px; color:var(--color-warning);">Incluye bono extra +${(piggy.extra_roi_bonus * 100).toFixed(0)}%</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ... renderBottomNav remains the same ...
export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Navegación principal" style="grid-template-columns: repeat(4, 1fr);">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}" id="nav-granja">
        <span class="bottom-nav__icon">${renderIcon('farm', '', '24')}</span>
        <span>Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}" id="nav-mercado">
        <span class="bottom-nav__icon"><span style="display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; font-size:22px; filter: ${activeTab === 'mercado' ? 'none' : 'grayscale(100%) opacity(60%)'}; transition: filter 0.2s;">🐖</span></span>
        <span>Mercado</span>
      </a>
      <a href="#/gourmet" class="bottom-nav__item ${activeTab === 'gourmet' ? 'bottom-nav__item--active' : ''}" id="nav-gourmet">
        <span class="bottom-nav__icon">${renderIcon('shop', '', '24')}</span>
        <span>Tienda</span>
      </a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}" id="nav-aliados">
        <span class="bottom-nav__icon">${renderIcon('people', '', '24')}</span>
        <span>Aliados</span>
      </a>
    </nav>
  `;
}

/**
 * Attach event listeners.
 */
function attachGranjaListeners(hasPiggies, stats, piggyCount) {
  // Piggy card click
  document.querySelectorAll('.piggy-card').forEach((card) => {
    card.addEventListener('click', () => {
      const piggyId = card.dataset.piggyId;
      navigateTo(`piggy/${piggyId}`);
    });
  });

  // Mission Banner click (dynamic based on mission)
  const missionBanner = document.getElementById('mission-banner');
  if (missionBanner) {
    missionBanner.addEventListener('click', () => {
      const mission = missionBanner.dataset.mission;
      switch (mission) {
        case 'm1':
          // No piggies ? go to mercado to buy first piggy
          navigateTo('mercado');
          break;
        case 'm1-redeem':
          // Has 1 piggy ? redeem bonus ? go to gourmet
          navigateTo('gourmet');
          break;
        case 'm3':
          // Buy 3rd piggy ? go to mercado
          navigateTo('mercado');
          break;
        default:
          break;
      }
    });
  }

  // M2 Banner click (when piggyCount === 1, both banners visible)
  const m2Banner = document.getElementById('mission-banner-m2');
  if (m2Banner) {
    m2Banner.addEventListener('click', () => {
      navigateTo('mercado');
    });
  }

  // Dynamic Notification click
  const notifEl = document.getElementById('dynamic-notification');
  if (notifEl && notifEl.dataset.cta) {
    notifEl.addEventListener('click', () => {
      const cta = notifEl.dataset.cta;
      if (cta.startsWith('#/')) {
        navigateTo(cta.replace('#/', ''));
      } else {
        window.open(cta, '_blank');
      }
    });
  }

  // Quick Buy Action
  const quickBuyBtn = document.getElementById('btn-quick-buy');
  if (quickBuyBtn) {
    quickBuyBtn.addEventListener('click', async () => {
      quickBuyBtn.style.opacity = '0.7';
      quickBuyBtn.style.pointerEvents = 'none';

      try {
        const items = await getMarketplaceItems();
        // Find Standard Initial Piggy (Month 1, Standard)
        const standardPiggy = items.find(i => i.currentMonth === 1 && i.category === 'standard') || items[0];

        if (standardPiggy) {
          showCheckoutModal(standardPiggy);
        } else {
          navigateTo('mercado');
        }
      } catch (error) {
        console.error('Quick buy error:', error);
        navigateTo('mercado');
      } finally {
        quickBuyBtn.style.opacity = '1';
        quickBuyBtn.style.pointerEvents = 'auto';
      }
    });
  }

  // Wallet Actions
  document.getElementById('btn-withdraw')?.addEventListener('click', () => {
    showWalletRequestModal('withdrawal', stats?.saldoDisponible || 0);
  });

  document.getElementById('btn-meat')?.addEventListener('click', () => {
    showWalletRequestModal('consumption', stats?.saldoDisponible || 0);
  });

  // Load referral code into greeting badge
  loadGreetingReferralCode();

  // Greeting referral code click ? open referral modal
  document.getElementById('greeting-referral-code')?.addEventListener('click', () => {
    showReferralModal();
  });
}

/**
 * Load the referral code into the greeting badge.
 */
async function loadGreetingReferralCode() {
  try {
    const code = await getMyReferralCode();
    const codeEl = document.getElementById('greeting-code-value');
    if (codeEl) codeEl.textContent = code || '···';
  } catch (err) {
    console.warn('Error loading referral code:', err);
  }
}

/**
 * Show the Referral Program modal with explanation, referrals list,
 * commission tiers, and WhatsApp share button.
 */
async function showReferralModal() {
  // Remove existing
  const existing = document.getElementById('referral-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'referral-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  // Show loading state first
  modal.innerHTML = `
    <div class="modal animate-scale-in" style="max-width:420px; max-height:90vh; overflow-y:auto;">
      <div class="modal__handle"></div>
      <button class="bonus-close" id="referral-modal-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer; z-index:3;">&times;</button>
      <div class="loading-container" style="padding:40px 0;">
        <div class="spinner"></div>
        <span>Cargando referidos...</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close handlers
  const close = () => modal.remove();
  document.getElementById('referral-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Fetch data
  try {
    const [code, stats] = await Promise.all([
      getMyReferralCode(),
      getMyReferralStats(),
    ]);

    const referralCode = code || '---';
    const balance = stats?.balance || 0;
    const referrals = stats?.referrals || [];
    const completedCount = stats?.completedReferrals || 0;
    const pendingCount = stats?.pendingReferrals || 0;
    const currentTier = stats?.currentTier || { amount: 30000, label: '$30.000' };

    // Build referrals list
    let referralsListHTML = '';
    if (referrals.length === 0) {
      referralsListHTML = `
        <div style="text-align:center; padding:16px 0; color:#9ca3af; font-size:0.85rem;">
          Aún no tienes referidos. ¡Comparte tu código!
        </div>
      `;
    } else {
      referralsListHTML = referrals.map(r => {
        const statusIcon = r.status === 'completed' ? '?' : r.status === 'pending' ? '?' : '?';
        const statusLabel = r.status === 'completed' ? 'Completado' : r.status === 'pending' ? 'Pendiente' : 'Expirado';
        const commissionText = r.status === 'completed' ? formatReferralBalance(r.commission_amount) : '-';
        const dateStr = new Date(r.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f3f4f6;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:50%; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#6b7280;">
                ${(r.referredName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:600; font-size:0.85rem; color:#111827;">${r.referredName || 'Usuario'}</div>
                <div style="font-size:0.7rem; color:#9ca3af;">${dateStr} · ${statusIcon} ${statusLabel}</div>
              </div>
            </div>
            <div style="font-weight:700; font-size:0.85rem; color:${r.status === 'completed' ? '#059669' : '#9ca3af'};">
              ${commissionText}
            </div>
          </div>
        `;
      }).join('');
    }

    // Build modal content
    const modalContent = modal.querySelector('.modal');
    modalContent.innerHTML = `
      <div class="modal__handle"></div>
      <button class="bonus-close" id="referral-modal-close-2" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer; z-index:3;">&times;</button>

      <!-- Header -->
      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:48px; margin-bottom:8px;">🤝</div>
        <h3 style="margin:0 0 6px 0; font-size:1.2rem; font-weight:800; color:#111827;">Programa de Referidos</h3>
        <p style="margin:0; font-size:0.8rem; color:#6b7280; line-height:1.4;">
          Comparte tu código con amigos. Cuando compren su <strong>primer Piggy</strong>, recibes una comisión automática en tu wallet.
        </p>
      </div>

      <!-- Code + Balance -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div style="background:linear-gradient(135deg,#7c3aed,#5b21b6); color:white; padding:14px; border-radius:14px; text-align:center;">
          <div style="font-size:0.68rem; opacity:0.8; margin-bottom:4px;">Tu Código</div>
          <div style="font-size:1.2rem; font-weight:800; letter-spacing:2px; font-family:monospace;">${referralCode}</div>
        </div>
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:14px; border-radius:14px; text-align:center;">
          <div style="font-size:0.68rem; color:#047857; margin-bottom:4px;">Balance Ganado</div>
          <div style="font-size:1.2rem; font-weight:800; color:#059669;">${formatReferralBalance(balance)}</div>
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:flex; gap:8px; margin-bottom:20px;">
        <div style="flex:1; background:#f9fafb; border-radius:10px; padding:10px; text-align:center;">
          <div style="font-size:1.1rem; font-weight:800; color:#111827;">${completedCount}</div>
          <div style="font-size:0.65rem; color:#6b7280;">Completados</div>
        </div>
        <div style="flex:1; background:#f9fafb; border-radius:10px; padding:10px; text-align:center;">
          <div style="font-size:1.1rem; font-weight:800; color:#111827;">${pendingCount}</div>
          <div style="font-size:0.65rem; color:#6b7280;">Pendientes</div>
        </div>
      </div>

      <!-- Mis Referidos -->
      <div style="margin-bottom:20px;">
        <h4 style="margin:0 0 8px 0; font-size:0.85rem; font-weight:700; color:#374151;">Mis Referidos</h4>
        <div style="max-height:160px; overflow-y:auto; border:1px solid #f3f4f6; border-radius:12px; padding:4px 14px;">
          ${referralsListHTML}
        </div>
      </div>

      <!-- Commission Tiers -->
      <div style="margin-bottom:24px;">
        <h4 style="margin:0 0 10px 0; font-size:0.85rem; font-weight:700; color:#374151;">Tabla de Comisiones</h4>
        <div style="border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; background:#f9fafb; padding:8px 14px; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px;">
            <span>Rango</span>
            <span style="text-align:center;">Referidos</span>
            <span style="text-align:right;">Comisión</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; padding:10px 14px; font-size:0.82rem; border-top:1px solid #f3f4f6; ${completedCount <= 5 ? 'background:#f0fdf4;' : ''}">
            <span style="font-weight:600;">🥉 Bronce</span>
            <span style="text-align:center; color:#6b7280;">0 - 5</span>
            <span style="text-align:right; font-weight:700; color:#059669;">$30.000</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; padding:10px 14px; font-size:0.82rem; border-top:1px solid #f3f4f6; ${completedCount > 5 && completedCount <= 15 ? 'background:#f0fdf4;' : ''}">
            <span style="font-weight:600;">🥈 Plata</span>
            <span style="text-align:center; color:#6b7280;">6 - 15</span>
            <span style="text-align:right; font-weight:700; color:#059669;">$50.000</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; padding:10px 14px; font-size:0.82rem; border-top:1px solid #f3f4f6; ${completedCount > 15 ? 'background:#f0fdf4;' : ''}">
            <span style="font-weight:600;">🥇 Oro</span>
            <span style="text-align:center; color:#6b7280;">16+</span>
            <span style="text-align:right; font-weight:700; color:#059669;">$80.000</span>
          </div>
        </div>
        <p style="margin:8px 0 0 0; font-size:0.68rem; color:#9ca3af; text-align:center; line-height:1.3;">
          La comisión se asigna automáticamente una única vez cuando tu referido compra su primer Piggy.
        </p>
      </div>

      <!-- Share Button -->
      <button id="btn-modal-share-referral" style="
        width: 100%;
        background: linear-gradient(135deg, #25d366, #128c7e);
        color: white;
        border: none;
        padding: 14px;
        border-radius: 14px;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 6px 16px rgba(37,211,102,0.35);
        transition: transform 0.2s;
      " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        💬 Invitar Amigos por WhatsApp
      </button>
    `;

    // Re-attach close
    document.getElementById('referral-modal-close-2')?.addEventListener('click', close);

    // Share button
    document.getElementById('btn-modal-share-referral')?.addEventListener('click', async () => {
      if (referralCode && referralCode !== '---') {
        await shareReferralCode(referralCode);
      }
    });

  } catch (err) {
    console.error('Error loading referral modal:', err);
    const modalContent = modal.querySelector('.modal');
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="modal__handle"></div>
        <button class="bonus-close" id="referral-modal-close-err" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
        <div style="text-align:center; padding:30px 0;">
          <p style="color:#ef4444;">Error al cargar datos de referidos.</p>
          <button class="btn btn--text" id="referral-modal-retry">Reintentar</button>
        </div>
      `;
      document.getElementById('referral-modal-close-err')?.addEventListener('click', close);
      document.getElementById('referral-modal-retry')?.addEventListener('click', () => {
        close();
        showReferralModal();
      });
    }
  }
}

/**
 * Show Bonus Modal
 */
function showBonusModal(hasPiggies) {
  // Remove existing
  removeBonusModal();

  const modal = document.createElement('div');
  modal.id = 'bonus-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal bonus-modal animate-scale-in">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="bonus-close-btn">${renderIcon('close', '', '24')}</button>
        
        <div class="bonus-header">
            <!-- Image removed for cleaner look -->
            <h3 class="bonus-title text-center mt-lg">BONO DE BIENVENIDA</h3>
            <p class="text-center text-primary font-bold text-lg">$50.000 PESOS EN CONSUMO DE CARNE</p>
        </div>

        <div class="bonus-content mt-md" style="flex: 2;">
            <h4 class="font-bold mb-sm">Términos y Condiciones: Bono de Bienvenida</h4>
            
            <div class="bonus-text-scroll">
                <p><strong>1. Definición del Beneficio:</strong><br/>
                PIGGY otorga un Bono de Consumo por valor de CINCUENTA MIL PESOS M/CTE ($50.000 COP) a todo usuario nuevo que complete satisfactoriamente el registro en la plataforma y realice su primera adopción de un "Piggy" (pago único de $1.000.000 COP).</p>

                <p><strong>2. Condiciones de Redención:</strong><br/>
                Para hacer efectivo el bono, el usuario deberá realizar un pedido de productos cárnicos a través de Granja Villa Morales, bajo las siguientes condiciones:</p>
                <ul>
                    <li><strong>Compra Mínima:</strong> El valor del pedido debe ser igual o superior a CIENTO CINCUENTA MIL PESOS M/CTE ($150.000 COP), sin incluir costos de envío.</li>
                    <li><strong>Aplicación del Bono:</strong> Una vez cumplido el monto mínimo, el bono de $50.000 se restará del valor total a pagar por los productos.</li>
                    <li><strong>Alcance de Productos:</strong> El beneficio es válido exclusivamente para la compra de proteína animal: Cerdo, Pollo y Res. No aplica para otros servicios o productos dentro de la plataforma.</li>
                </ul>

                <p><strong>3. Política de Envíos y Logística:</strong></p>
                <ul>
                    <li><strong>Cali:</strong> El servicio de domicilio será completamente gratuito unicamente para entregas dentro del perímetro urbano de la ciudad de Cali.</li>
                    <li><strong>Otras Ubicaciones:</strong> Para entregas en municipios aledaños (Jamundí, Palmira, Yumbo, etc.) o en el resto del territorio nacional, el USUARIO deberá asumir el 100% del costo del envío, el cual se cotizará según la ubicación y el peso del pedido.</li>
                </ul>

                <p><strong>4. Vigencia y Restricciones:</strong></p>
                <ul>
                    <li>El bono es personal, intransferible y no es canjeable por dinero en efectivo.</li>
                    <li>Solo se permite la redención de un (1) bono por usuario único y por la primera compra de activo productivo.</li>
                    <li>El bono tendrá una vigencia de 30 días calendario a partir del momento de la confirmación de la primera compra del piggy inicial.</li>
                </ul>
            </div>
        </div>

        <div class="bonus-footer mt-lg">
            <button class="btn btn--primary btn--block" id="btn-redeem-bonus">
                ${hasPiggies ? 'Redimir Bono Ahora' : '¡Redime tu bono $50.000!'}
            </button>
            ${!hasPiggies ? '<p class="text-xs text-center mt-sm text-muted">Debes tener un Piggy activo para redimir.</p>' : ''}
        </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close logic
  const close = () => modal.remove();
  document.getElementById('bonus-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Action logic
  document.getElementById('btn-redeem-bonus').addEventListener('click', () => {
    close();
    // Always navigate to Piggy Gourmet for bonus redemption
    navigateTo('gourmet');
  });
}

function removeBonusModal() {
  const existing = document.getElementById('bonus-modal');
  if (existing) existing.remove();
}

/**
 * Show Wallet Request Modal (unified for Retiro and Consumo).
 * @param {'withdrawal' | 'consumption'} requestType
 * @param {number} availableAmount - Total saldo disponible
 */
function showWalletRequestModal(requestType, availableAmount) {
  // Remove existing
  const existing = document.getElementById('wallet-request-modal');
  if (existing) existing.remove();

  const isWithdrawal = requestType === 'withdrawal';
  const title = isWithdrawal ? '\u{1F4B0} Retiro de Fondos' : '\u{1F969} Consumo de Carne';
  const subtitle = isWithdrawal
    ? '\u00BFCu\u00E1nto dinero deseas retirar a tu cuenta bancaria?'
    : '\u00BFCu\u00E1nto de tu saldo deseas usar para consumo de carne?';
  const buttonLabel = isWithdrawal ? 'Solicitar Retiro' : 'Solicitar Consumo';
  const gradientFrom = isWithdrawal ? '#10B981' : '#f59e0b';
  const gradientTo = isWithdrawal ? '#059669' : '#d97706';
  const minAmount = 10000;

  const modal = document.createElement('div');
  modal.id = 'wallet-request-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in" style="max-width:400px;">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="wallet-req-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer; z-index:3;">&times;</button>

        <div style="text-align:center; margin-bottom:20px;">
            <div style="font-size:40px; margin-bottom:8px;">${isWithdrawal ? '\u{1F4B0}' : '\u{1F969}'}</div>
            <h3 style="margin:0 0 6px; font-size:1.15rem; font-weight:800; color:#1f2937;">${title}</h3>
            <p style="margin:0; font-size:0.85rem; color:#6b7280;">${subtitle}</p>
        </div>

        <div style="background:linear-gradient(135deg, ${gradientFrom}, ${gradientTo}); color:white; padding:16px; border-radius:12px; text-align:center; margin-bottom:20px;">
            <div style="font-size:0.75rem; opacity:0.85; margin-bottom:4px;">Tu Saldo Disponible</div>
            <div style="font-size:1.5rem; font-weight:800;">${formatCOP(availableAmount)}</div>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label" style="font-weight:600; color:#374151; margin-bottom:6px; display:block;">Monto a ${isWithdrawal ? 'retirar' : 'consumir'}</label>
            <div style="position:relative;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#999; font-weight:600;">$</span>
                <input type="number" id="wallet-req-amount" class="form-input" style="padding-left:30px; width:100%; box-sizing:border-box; font-size:1.1rem; font-weight:600;" placeholder="0" min="${minAmount}" max="${availableAmount}">
                <button type="button" id="wallet-req-all" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:#e0f2fe; border:none; color:#0284c7; font-weight:700; cursor:pointer; padding:4px 12px; border-radius:6px; font-size:0.8rem;">Todo</button>
            </div>
            <div class="text-xs text-muted" style="margin-top:6px;">Disponible: ${formatCOP(availableAmount)} \u2022 M\u00EDnimo: ${formatCOP(minAmount)}</div>
            <div id="wallet-req-error" class="text-xs" style="color:var(--color-danger); margin-top:4px; display:none;"></div>
        </div>

        ${isWithdrawal ? `
        <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label" style="font-weight:600; color:#374151; margin-bottom:6px; display:block;">Banco de destino</label>
            <select id="wallet-req-bank" class="form-input" style="width:100%;">
                <option value="">Selecciona un banco</option>
                <option value="Nequi">Nequi</option>
                <option value="Bancolombia">Bancolombia</option>
                <option value="Daviplata">Daviplata</option>
                <option value="PSE / Otro">PSE / Otros Bancos</option>
            </select>
        </div>
        ` : ''}

        <button class="btn btn--primary btn--block" id="wallet-req-submit" disabled style="width:100%; margin-top:8px; opacity:0.5; background:linear-gradient(135deg, ${gradientFrom}, ${gradientTo}); border:none; color:white; padding:14px; border-radius:12px; font-weight:700; font-size:1rem; cursor:pointer;">${buttonLabel}</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Elements
  const amountInput = document.getElementById('wallet-req-amount');
  const submitBtn = document.getElementById('wallet-req-submit');
  const errorDiv = document.getElementById('wallet-req-error');
  const bankInput = isWithdrawal ? document.getElementById('wallet-req-bank') : null;

  const validate = () => {
    const amount = parseFloat(amountInput.value) || 0;
    let valid = true;
    let errorMsg = '';

    if (amount < minAmount) {
      valid = false;
      if (amount > 0) errorMsg = `El monto m\u00EDnimo es ${formatCOP(minAmount)}`;
    } else if (amount > availableAmount) {
      valid = false;
      errorMsg = 'Fondos insuficientes';
    }

    if (isWithdrawal && bankInput && !bankInput.value) {
      valid = false;
    }

    if (errorMsg) {
      errorDiv.textContent = errorMsg;
      errorDiv.style.display = 'block';
    } else {
      errorDiv.style.display = 'none';
    }

    submitBtn.disabled = !valid;
    submitBtn.style.opacity = valid ? '1' : '0.5';
  };

  amountInput.addEventListener('input', validate);
  if (bankInput) bankInput.addEventListener('change', validate);

  // "Todo" button
  document.getElementById('wallet-req-all').addEventListener('click', () => {
    amountInput.value = availableAmount;
    validate();
  });

  // Close
  const close = () => modal.remove();
  document.getElementById('wallet-req-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Submit
  submitBtn.addEventListener('click', async () => {
    const amount = parseFloat(amountInput.value);
    const bank = bankInput ? bankInput.options[bankInput.selectedIndex].text : null;
    const bankValue = bankInput ? bankInput.value : null;

    // Disable button to prevent double-click
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';

    try {
      // 1. Register in DB
      const result = await createWalletRequest(requestType, amount, bankValue);

      if (!result.success) {
        errorDiv.textContent = result.reason === 'insufficient_balance'
          ? 'Saldo insuficiente'
          : 'Error al procesar solicitud. Intenta de nuevo.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = buttonLabel;
        return;
      }

      close();

      // 2. Show success modal
      const profile = AppState.get('profile');
      const userName = profile?.full_name || 'Usuario';
      const userWhatsApp = profile?.whatsapp || '';

      showWalletRequestSuccess(requestType, amount, bank, result.requestId);

      // 3. Notify admin via WhatsApp
      notifyAdminViaWhatsApp(requestType, amount, userName, userWhatsApp, bank, result.requestId);
    } catch (err) {
      console.error('Wallet request error:', err);
      errorDiv.textContent = 'Error inesperado. Intenta de nuevo.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = buttonLabel;
    }
  });
}

/**
 * Show success confirmation after wallet request.
 */
function showWalletRequestSuccess(requestType, amount, bank, requestId) {
  const isWithdrawal = requestType === 'withdrawal';
  const shortId = requestId ? requestId.slice(-8).toUpperCase() : Date.now().toString().slice(-6);
  const typeLabel = isWithdrawal ? 'Retiro' : 'Consumo';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal animate-scale-in text-center" style="max-width:400px;">
      <button class="bonus-close" id="wallet-success-close-x" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
      <div style="width:60px; height:60px; background:${isWithdrawal ? '#d1fae5' : '#fef3c7'}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          <span style="font-size:28px;">${isWithdrawal ? '\u2705' : '\u{1F969}'}</span>
      </div>
      <h3 style="margin:0 0 8px; font-size:1.15rem; font-weight:800; color:#1f2937;">Solicitud de ${typeLabel} Recibida</h3>
      <p style="color:#6b7280; font-size:0.9rem; margin:0 0 16px;">
        Tu solicitud de <strong>${typeLabel.toLowerCase()}</strong> por <strong>${formatCOP(amount)}</strong>${isWithdrawal && bank ? ` a <strong>${bank}</strong>` : ''} ha sido registrada.
      </p>

      <div style="background:#f9fafb; padding:14px; border-radius:10px; margin-bottom:16px; text-align:left; font-size:0.85rem;">
          <div style="margin-bottom:4px;"><strong>Comprobante:</strong> #${typeLabel.toUpperCase().slice(0, 3)}-${shortId}</div>
          <div style="margin-bottom:4px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</div>
          <div><strong>Estado:</strong> <span style="color:#f59e0b; font-weight:600;">Pendiente</span></div>
      </div>

      <p style="color:#9ca3af; font-size:0.78rem; margin:0 0 20px;">
        ${isWithdrawal
      ? 'Nuestro equipo procesar\u00E1 tu retiro en un plazo m\u00E1ximo de 3 d\u00EDas h\u00E1biles. Te enviaremos un mensaje de WhatsApp para confirmar.'
      : 'Nuestro equipo se comunicar\u00E1 contigo por WhatsApp para coordinar la entrega de tu pedido.'}
      </p>

      <button class="btn btn--primary btn--block" id="wallet-success-close" style="width:100%; background:linear-gradient(135deg, #10B981, #059669); border:none; color:white; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('wallet-success-close').addEventListener('click', closeModal);
  document.getElementById('wallet-success-close-x').addEventListener('click', closeModal);
}

