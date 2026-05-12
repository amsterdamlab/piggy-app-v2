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
import { getWalletBalance, getReferralBonusBalance, createWalletRequest, notifyAdminViaWhatsApp } from '../services/walletService.js';
import { getRandomTip } from '../services/tipsService.js';
import { getActiveMissions, completeMissionManual } from '../services/missionsService.js';

/* =========================================
   DYNAMIC NOTIFICATIONS
   Fetched from Supabase dynamic_tips table.
   Managed manually by admin — no hardcoding.
   ========================================= */

/* =========================================
   DYNAMIC MISSION BANNERS
   M1 ? M2 ? M3 based on piggy count
   ========================================= */

/**
 * Render the banner for the next active mission.
 * Preserves the premium styles for M1, M2, M3 and creates a generalized
 * beautiful banner for M4-M9 based on DB properties.
 */
function renderMissionBanner(activeMissions, piggyCount) {
  if (!activeMissions || activeMissions.length === 0) {
    // All missions complete! Show celebration
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
          <div style="font-size:32px;">&#127881;</div>
          <div>
            <div style="font-weight:800; color:#065f46; font-size:0.95rem;">&#161;Misiones completadas!</div>
            <div style="font-size:0.78rem; color:#047857;">Tu granja est&aacute; al m&aacute;ximo rendimiento.</div>
          </div>
        </div>
      </div>
    `;
  }

  const mission = activeMissions[0];

  // Specific premium design for M1
  if (mission.id === 'm1' && piggyCount === 0) {
    return `
      <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
        <div class="banner banner--interactive" id="mission-banner" data-mission="m1" data-cta="#/mercado" style="
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 16px; padding: 20px 24px; color: white; position: relative; overflow: hidden; box-shadow: 0 8px 25px -5px rgba(245, 158, 11, 0.4); cursor: pointer;
        ">
          <div style="position:absolute; top:0; left:0; right:0; bottom:0; opacity:0.06; background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%220%22 y=%2240%22 font-size=%2230%22%3E🐷%3C/text%3E%3C/svg%3E'); pointer-events:none;"></div>
          <div style="position:relative; z-index:2;">
            <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">&#127831; MISI&Oacute;N 1</div>
            <div style="font-size:1.2rem; font-weight:800; margin-bottom:4px;">Crea una cuenta y compra tu primer Piggy</div>
            <div style="font-size:0.85rem; opacity:0.9;">&#127873; Bono de Bienvenida: <strong>$50.000 en consumo de carne</strong></div>
            <div style="margin-top:14px;">
              <span style="background:white; color:#d97706; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">Compra tu Piggy &#128048;</span>
            </div>
          </div>
          <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">&#128048;</div>
        </div>
      </div>
    `;
  }

  // Specific premium design for M2 (plus the M1 redeem reminder if they have exactly 1 piggy)
  if (mission.id === 'm2' && piggyCount === 1) {
    return `
      <!-- M1 Completed: Redeem Bonus -->
      <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
        <div class="banner banner--interactive" id="mission-banner-redeem" data-mission="m1-redeem" data-cta="#/gourmet" style="
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 16px; padding: 18px 22px; color: white; position: relative; overflow: hidden; box-shadow: 0 8px 25px -5px rgba(245, 158, 11, 0.4); cursor: pointer;
        ">
          <div style="position:relative; z-index:2; display:flex; align-items:center; gap:14px;">
            <div style="font-size:36px; flex-shrink:0;">&#127873;</div>
            <div style="flex:1;">
              <div style="font-size:0.95rem; font-weight:800;">&#161;Tienes un Bono de $50.000!</div>
              <div style="font-size:0.78rem; opacity:0.9;">Bono de consumo en carne. &#161;Red&eacute;malo ahora!</div>
            </div>
            <span style="background:white; color:#d97706; padding:8px 16px; border-radius:10px; font-weight:700; font-size:0.8rem; white-space:nowrap;">Redimir Bono Ahora</span>
          </div>
        </div>
      </div>

      <!-- M2: Buy 2nd Piggy -->
      <div class="section animate-fade-in-up" style="animation-delay: 0.35s;">
        <div class="banner banner--interactive" id="mission-banner" data-mission="m2" data-cta="#/mercado" style="
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border-radius: 16px; padding: 20px 24px; color: white; position: relative; overflow: hidden; box-shadow: 0 8px 25px -5px rgba(99, 102, 241, 0.4); cursor: pointer;
        ">
          <div style="position:relative; z-index:2;">
            <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">&#127850; MISI&Oacute;N 2</div>
            <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Compra tu 2do Piggy</div>
            <div style="font-size:0.85rem; opacity:0.9;">&#9889; Desbloquea un piggy de 3 meses y <strong>+1% en Margen Comercial</strong></div>
            <div style="margin-top:14px;">
              <span style="background:white; color:#4f46e5; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">Ir al Mercado &#127048;</span>
            </div>
          </div>
          <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">&#128048;</div>
        </div>
      </div>
    `;
  }

  // Specific premium design for M3
  if (mission.id === 'm3') {
    return `
      <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
        <div class="banner banner--interactive" id="mission-banner" data-mission="m3" data-cta="#/mercado" style="
          background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
          border-radius: 16px; padding: 20px 24px; color: white; position: relative; overflow: hidden; box-shadow: 0 8px 25px -5px rgba(8, 145, 178, 0.4); cursor: pointer;
        ">
          <div style="position:relative; z-index:2;">
            <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">&#127775; MISI&Oacute;N 3</div>
            <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Invita a un amigo a Piggy</div>
            <div style="font-size:0.85rem; opacity:0.9;">&#10004; <strong>${mission.reward}</strong></div>
            <div style="margin-top:14px;">
              <span style="background:white; color:#0e7490; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">Reclamar recompensa &#128048;</span>
            </div>
          </div>
          <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">&#128048;</div>
        </div>
      </div>
    `;
  }

  // Generic dynamic design for any other mission (M4-M9)
  const isManual = !mission.cta;
  const btnLabel = isManual ? 'Completar misión' : 'Ir a cumplir misión';
  const ctaAttr  = mission.cta ? `data-cta="${mission.cta}"` : '';

  return `
    <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
      <div class="banner banner--interactive" id="mission-banner" data-mission="${mission.id}" ${ctaAttr} style="
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        border-radius: 16px; padding: 20px 24px; color: white; position: relative; overflow: hidden; box-shadow: 0 8px 25px -5px rgba(139, 92, 246, 0.4); cursor: pointer;
      ">
        <div style="position:relative; z-index:2;">
          <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">
            ${mission.icon} NUEVA MISI&Oacute;N
          </div>
          <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">${mission.title}</div>
          <div style="font-size:0.85rem; opacity:0.9;">&#10004; Recompensa: <strong>${mission.reward}</strong></div>
          <div style="margin-top:14px;">
            <span style="background:white; color:#6d28d9; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">${btnLabel} &rarr;</span>
          </div>
        </div>
        <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">${mission.icon.replace(/<[^>]*>?/gm, '') || '🚀'}</div>
      </div>
    </div>
  `;
}

/**
 * Render the notification strip.
 * @param {Object} notif - Tip data from tipsService (already resolved)
 */
function renderRandomNotification(notif) {
  // Guard: if no tip data provided, render nothing
  if (!notif) return '';

  const ctaAttr = notif.ctaUrl ? `data-cta="${notif.ctaUrl}"` : '';
  const cursor  = notif.ctaUrl ? 'pointer' : 'default';

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
        cursor: ${cursor};
        transition: transform 0.2s, box-shadow 0.2s;
      " ${ctaAttr}
         onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
        <div style="font-size:24px; flex-shrink:0;">${notif.icon}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; color:${notif.color}; font-size:0.82rem; line-height:1.3;">${notif.title}</div>
          <div style="font-size:0.72rem; color:#6b7280; margin-top:2px;">&#10024; ${notif.reward}</div>
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
        <h2 class="granja-title">Mi Granja (Test)</h2>

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
    // Fetch all data in parallel for performance
    const [piggies, tipData, walletBalance, referralBonus, activeMissions] = await Promise.all([
      getUserPiggies(),
      getRandomTip(),
      getWalletBalance(),
      getReferralBonusBalance(),
      getActiveMissions(),
    ]);
    const stats = await getDashboardStats(piggies);

    // wallet_balance = real cash (ciclos completados + recargas)
    // referral_balance = bonos de consumo por referidos (canje manual, NO suma al saldo)
    stats.walletBalance          = walletBalance;
    stats.referralBonus          = referralBonus;
    stats.referralBonusFormatted = formatCOP(referralBonus);
    stats.saldoDisponible        = walletBalance;
    stats.saldoDisponibleFormatted = formatCOP(walletBalance);

    AppState.set({ piggies });

    const app = document.getElementById('app');
    app.innerHTML = buildGranjaFull(firstName, piggies, stats, tipData, activeMissions);

    attachGranjaListeners(piggies.length > 0, stats, piggies.length);
  } catch (error) {
    console.error('Error loading granja data:', error);
    const section = document.getElementById('piggies-section');
    if (section) {
      section.innerHTML = `
        <div class="auth-form__error auth-form__error--visible">
          Error al cargar datos: ${error.message}<br/>
          <pre style="font-size:10px; text-align:left; color:#ff0000; overflow-x:auto;">${error.stack}</pre>
        </div>
      `;
    }
  }
}

/**
 * Build the full dashboard with data.
 */
function buildGranjaFull(firstName, piggies, stats, tipData, activeMissions) {
  const piggyCount = piggies.length;
  const missionBanner = renderMissionBanner(activeMissions, piggyCount);
  const notification = renderRandomNotification(tipData);

  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Mi Granja (Test)</h2>

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
                 <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>

              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; position:relative; z-index:2;">
                  <div>
                     <h3 style="margin: 0; font-size: 1.1rem; opacity: 0.9; font-weight:600;">Wallet de ${firstName}</h3>
                     <div style="font-size: 0.8rem; opacity: 0.8; margin-top:2px;">Billetera Inteligente Piggy</div>
                  </div>
                  <div style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
                     Activa &#128994;
                  </div>
              </div>

              <!-- Main Balance Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; position:relative; z-index:2;">
                 
                 <!-- Retornos Recibidos -->
                 <div>
                    <div style="font-size: 0.8rem; opacity: 0.9; font-weight: 500; margin-bottom: 4px;">Retornos (Ganancia)</div>
                    <div style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                       ${stats.saldoDisponibleFormatted}
                    </div>
                 </div>

                 <!-- Bonos Referidos -->
                 <div>
                    <div style="font-size: 0.8rem; opacity: 0.9; font-weight: 500; margin-bottom: 4px;">Bonos Referidos</div>
                    <div style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                       ${stats.referralBonusFormatted}
                    </div>
                 </div>

                 <!-- Total Compras (En Ciclo) -->
                 <div>
                    <div style="font-size: 0.8rem; opacity: 0.9; font-weight: 500; margin-bottom: 4px;">Capital Activo</div>
                    <div style="font-size: 1.1rem; font-weight: 700; opacity: 0.9;">
                       ${stats.adquisicionBonosFormatted}
                    </div>
                 </div>

                 <!-- ROI Estimado -->
                 <div>
                    <div style="font-size: 0.8rem; opacity: 0.9; font-weight: 500; margin-bottom: 4px;">Tasa Retorno Base</div>
                    <div style="font-size: 1.1rem; font-weight: 700; opacity: 0.9;">
                       ${stats.baseROIFormatted}
                    </div>
                 </div>

              </div>
           </div>
        </div>

        ${missionBanner}
        
        <div class="section" id="piggies-section">
          ${renderPiggiesList(piggies, stats)}
        </div>
      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

/**
 * Render the list of piggies.
 */
function renderPiggiesList(piggies, stats) {
  if (piggies.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">${renderIcon('piggy')}</div>
        <p>A&uacute;n no tienes ning&uacute;n Piggy.</p>
        <button class="button button--primary" onclick="window.location.hash='#/mercado'">
          Comprar mi primer Piggy
        </button>
      </div>
    `;
  }

  // Find the closest piggy if there are active ones
  let closestPiggyHTML = '';
  if (stats.nextCloseDays !== null) {
    closestPiggyHTML = `
      <div class="closest-piggy-alert animate-fade-in-up" style="animation-delay: 0.2s;">
        <div class="closest-piggy-alert__icon">⏳</div>
        <div class="closest-piggy-alert__content">
          <div class="closest-piggy-alert__title">Próximo Piggy en completarse</div>
          <div class="closest-piggy-alert__desc">
            En <strong>${stats.nextCloseDays} d&iacute;as</strong> recibes tu dinero.
          </div>
        </div>
      </div>
    `;
  }

  const listHTML = piggies.map((p, index) => {
    // Stagger animation based on index
    const delay = 0.2 + (index * 0.1);
    
    // Status Logic
    const isCompleted = p.isComplete;
    const progress = p.progress;
    
    const statusClass = isCompleted ? 'piggy-card__status--completed' : 'piggy-card__status--active';
    const statusText = isCompleted ? '✓ Ciclo Completado' : 'Engorde';
    const progressBarColor = isCompleted ? '#10B981' : 'var(--primary-color)';

    // Liquidar button is replaced by a non-clickable text that guides user to Wallet
    const actionArea = isCompleted
      ? `<div style="text-align:center; font-size:0.8rem; color:#059669; font-weight:600; padding: 12px 0 4px 0; border-top: 1px dashed #e2e8f0; margin-top: 8px;">
          ✓ El retorno de este ciclo ya está disponible en tu Wallet.
         </div>`
      : '';

    return `
      <div class="piggy-card animate-fade-in-up" style="animation-delay: ${delay}s;" data-id="${p.id}">
        <div class="piggy-card__header">
          <div class="piggy-card__avatar">
            <img src="/img/categories/${p.category || 'standard'}.jpg" alt="Piggy" onerror="this.src='/img/default-piggy.jpg'; this.onerror=null;" />
          </div>
          <div class="piggy-card__info">
            <h3 class="piggy-card__name">${p.name}</h3>
            <div class="piggy-card__status ${statusClass}">${statusText}</div>
          </div>
          <div class="piggy-card__weight">
            <span class="piggy-card__weight-value">${p.currentWeight}</span>
            <span class="piggy-card__weight-unit">kg</span>
          </div>
        </div>
        
        <div class="piggy-card__details">
          <div class="piggy-card__detail-row">
            <span>Inversi&oacute;n</span>
            <strong>${formatCOP(p.investment_amount)}</strong>
          </div>
          <div class="piggy-card__detail-row">
            <span>Retorno proyectado</span>
            <strong class="text-primary">${formatCOP(p.investment_amount + (p.investment_amount * (stats.baseROI + (p.extra_roi_bonus || 0))))}</strong>
          </div>
        </div>
        
        <div class="piggy-card__progress">
          <div class="piggy-card__progress-header">
            <span>Progreso del ciclo</span>
            <span style="color: ${progressBarColor}; font-weight: bold;">${progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width: ${progress}%; background-color: ${progressBarColor};"></div>
          </div>
        </div>
        
        ${actionArea}
      </div>
    `;
  }).join('');

  return closestPiggyHTML + '<div class="piggies-list">' + listHTML + '</div>';
}

/**
 * Common layout elements
 */
function renderGreeting(firstName) {
  return `
    <div class="granja-header animate-fade-in-down">
      <div class="granja-header__user">
        <div class="avatar">
          <span>${firstName.charAt(0)}</span>
          <div class="avatar__badge"></div>
        </div>
        <div class="granja-header__text">
          <span class="granja-header__welcome">¡Bienvenido!</span>
          <h1 class="granja-header__name">Hola, ${firstName}</h1>
        </div>
      </div>
      <button class="icon-button" id="profile-btn" aria-label="Perfil">
        ${renderIcon('moreHorizontal')}
      </button>
    </div>
  `;
}

function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav">
      <a href="#/" class="bottom-nav__item ${activeTab === 'granja' ? 'active' : ''}">
        ${renderIcon('home')}
        <span>Mi Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'active' : ''}">
        ${renderIcon('piggy')}
        <span>Mercado</span>
      </a>
      <a href="#/gourmet" class="bottom-nav__item ${activeTab === 'gourmet' ? 'active' : ''}">
        ${renderIcon('shoppingBag')}
        <span>Gourmet</span>
      </a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'active' : ''}">
        ${renderIcon('mapPin')}
        <span>Aliados</span>
      </a>
    </nav>
  `;
}

/**
 * Event Listeners
 */
function attachGranjaListeners(hasPiggies, stats, piggyCount) {
  // Navigation
  document.querySelectorAll('.bottom-nav__item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const href = e.currentTarget.getAttribute('href');
      if (href) navigateTo(href);
    });
  });

  // Profile Button Action
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', async () => {
      if (confirm('¿Deseas cerrar sesión?')) {
        await signOut();
        AppState.clear();
        navigateTo('#/login');
      }
    });
  }

  // Interactive Banners Action (Dynamic CTA resolution)
  const banners = document.querySelectorAll('.banner--interactive');
  banners.forEach(banner => {
    banner.addEventListener('click', () => {
      const cta = banner.getAttribute('data-cta');
      const missionId = banner.getAttribute('data-mission');

      if (cta) {
        navigateTo(cta);
      } else if (missionId === 'm3') {
        // Special case for M3 (Referrals)
        handleReferralAction();
      } else {
        // Fallback for missions without explicit CTA
        alert(`Has hecho clic en la misión: ${missionId}. Instrucciones en desarrollo.`);
      }
    });
  });

  // Dynamic Notification click
  const notif = document.getElementById('dynamic-notification');
  if (notif) {
    notif.addEventListener('click', () => {
      const cta = notif.getAttribute('data-cta');
      if (cta) navigateTo(cta);
    });
  }

  // Piggy Cards click
  const piggyCards = document.querySelectorAll('.piggy-card');
  piggyCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Prevent click if they clicked the 'liquidar' button (handled below)
      if (e.target.closest('.piggy-card__action')) return;
      
      const id = card.getAttribute('data-id');
      if (id) navigateTo(`#/piggy/${id}`);
    });
  });

  // Wallet WhatsApp claim listeners (Removed inside card, but keeping logic in case it's used elsewhere)
  const wpButtons = document.querySelectorAll('.btn-whatsapp-claim');
  wpButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
       e.stopPropagation(); // don't go to detail page
       
       // Build WhatsApp message for cycle completion
       const adminPhone = '573001234567'; // Replace with real admin
       const msg = `Hola equipo Piggy, mi ciclo ha terminado y quiero solicitar el desbloqueo de mi Piggy Silver o coordinar el uso de mi Wallet.`;
       const wpUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`;
       
       window.open(wpUrl, '_blank');
    });
  });
}

/**
 * Handle Referral Logic (M3)
 */
async function handleReferralAction() {
  try {
    const code = await getMyReferralCode();
    
    const modalHTML = `
      <div class="modal-overlay" id="referral-modal" style="display:flex; justify-content:center; align-items:center; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:9999; padding:20px;">
        <div class="modal-content animate-fade-in-up" style="background:white; border-radius:24px; padding:32px; width:100%; max-width:400px; text-align:center; position:relative;">
          <button id="close-referral-modal" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:24px; color:#9ca3af; cursor:pointer;">&times;</button>
          
          <div style="font-size:48px; margin-bottom:16px;">&#129309;</div>
          <h3 style="font-size:1.4rem; color:#111827; margin-bottom:8px; font-weight:800;">Invita y Gana</h3>
          <p style="color:#6b7280; font-size:0.95rem; margin-bottom:24px; line-height:1.5;">
            Comparte tu c&oacute;digo con amigos. Cuando ellos compren su primer Piggy, <strong style="color:#0891b2;">¡ambos ganan un bono de consumo!</strong>
          </p>

          <div style="background:#f3f4f6; border:2px dashed #cbd5e1; border-radius:16px; padding:16px; margin-bottom:24px;">
            <div style="font-size:0.75rem; color:#6b7280; text-transform:uppercase; font-weight:700; letter-spacing:1px; margin-bottom:4px;">Tu C&oacute;digo</div>
            <div style="font-size:1.8rem; font-weight:900; color:#0e7490; letter-spacing:2px;">${code}</div>
          </div>

          <button id="share-referral-btn" class="button button--primary" style="width:100%; background:linear-gradient(135deg, #0891b2 0%, #0e7490 100%);">
            Compartir c&oacute;digo ahora
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('close-referral-modal').addEventListener('click', () => {
      document.getElementById('referral-modal').remove();
    });

    document.getElementById('share-referral-btn').addEventListener('click', async () => {
      const shared = await shareReferralCode();
      if (shared) {
        document.getElementById('share-referral-btn').innerText = '¡Compartido!';
        document.getElementById('share-referral-btn').style.background = '#10B981';
        setTimeout(() => {
          document.getElementById('referral-modal')?.remove();
          // Completing M3 manually after successful share
          completeMissionManual('m3').then(() => {
            // Reload view to reflect updated mission banner
            renderGranjaView();
          });
        }, 1500);
      }
    });

  } catch (error) {
    console.error('Error fetching referral code:', error);
    alert('Hubo un error al generar tu código. Intenta de nuevo más tarde.');
  }
}

/**
 * Utility to remove modals
 */
function removeBonusModal() {
  const modal = document.getElementById('referral-modal');
  if (modal) modal.remove();
}
