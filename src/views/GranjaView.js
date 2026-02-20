/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Matches screen2.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats, formatCOP } from '../services/piggiesService.js';
import { navigateTo } from '../router.js';
import { showCheckoutModal } from './MercadoView.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { MOCK_MISSIONS } from '../services/mockData.js';
import { completeMissionManual } from '../services/missionsService.js';


// ... (existing imports)

// ...

function attachGranjaListeners(hasPiggies, stats) {
  // Piggy card click
  document.querySelectorAll('.piggy-card').forEach((card) => {
    card.addEventListener('click', () => {
      const piggyId = card.dataset.piggyId;
      navigateTo(`piggy/${piggyId}`);
    });
  });

  // Missions click
  document.querySelectorAll('.mission-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const cta = card.dataset.cta;

      if (!cta) return;

      // Si es un link externo (WhatsApp, etc), lo marcamos como completado
      if (cta.startsWith('http')) {
        completeMissionManual(id);
        window.open(cta, '_blank');

        // Recargamos la vista para actualizar la lista de misiones
        const profile = AppState.get('profile');
        if (profile) {
          loadGranjaData(profile.full_name?.split(' ')[0] || 'Usuario');
        }
      } else {
        // Navegación interna (ir al mercado, etc)
        // No completamos la misión automáticamente aquí porque esas dependen de lógica (ej: comprar)
        if (cta.startsWith('#')) {
          location.hash = cta;
        } else {
          window.location.hash = cta;
        }
      }
    });
  });

  // Bonus Banner click
  document.getElementById('bonus-banner')?.addEventListener('click', () => {
    showBonusModal(hasPiggies);
  });

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
    showWithdrawModal(stats?.disponible || 0);
  });

  document.getElementById('btn-meat')?.addEventListener('click', () => {
    showMeatModal();
  });
}

// ...



/* =========================================
   MISSIONS MODULE
   ========================================= */

function renderMissionsModule() {
  const piggies = AppState.get('piggies') || [];
  const profile = AppState.get('profile');

  // Lógica de Estado Local para Misiones
  // Esto asegura que la vista siempre tenga la lógica más fresca sin depender de caché de módulos externos si hay problemas.
  const hasFirstPiggy = piggies.length >= 1;
  const hasSecondPiggy = piggies.length >= 2;

  // Procesar misiones
  const processedMissions = MOCK_MISSIONS.map(m => {
    let mission = { ...m, is_locked: false };

    // 1. Estados de Completado
    if (mission.id === 'm1') mission.is_completed = !!profile;
    if (mission.id === 'm2') mission.is_completed = hasFirstPiggy;
    if (mission.id === 'm4') mission.is_completed = hasSecondPiggy;
    if (mission.id === 'm7') mission.is_completed = piggies.length >= 3;

    // 2. Bloqueos (Game Leveling)
    // Si no tienes el primer piggy, el segundo se bloquea
    if (mission.id === 'm4' && !hasFirstPiggy) mission.is_locked = true;
    // Si no tienes el segundo, el tercero se bloquea
    if (mission.id === 'm7' && !hasSecondPiggy) mission.is_locked = true;

    // Otros bloqueos lógicos opcionales
    if (mission.id === 'm6' && !hasFirstPiggy) mission.is_locked = true; // Cerrar ciclo requiere abrirlo

    return mission;
  });

  const activeMissions = processedMissions.filter(m => !m.is_completed && !m.is_locked);
  const total = processedMissions.length;
  const completed = processedMissions.filter(m => m.is_completed).length;
  const percent = Math.round((completed / total) * 100);

  // DEBUG: Mostrar conteo de piggies si hay dudas (visible solo si inspeccionan elemento)
  // console.log('Piggies detected for missions:', piggies.length);

  if (activeMissions.length === 0) {
    return `
        <div class="missions-complete animate-fade-in-up" style="text-align:center; padding:32px; background:white; border-radius:16px; border:1px dashed #e0e0e0;">
            <div style="font-size:48px; margin-bottom:16px;">🏆</div>
            <h3 class="text-primary font-bold" style="font-size:1.2rem; margin-bottom:8px;">¡Eres un Granjero Maestro!</h3>
            <p class="text-muted text-sm">Has desbloqueado todos los bonos disponibles.</p>
        </div>
      `;
  }

  // Show only first 3 active missions
  const missionsToShow = activeMissions.slice(0, 3);

  return `
    <div class="section__header" style="margin-bottom:12px;">
        <h3 class="section__title">Misiones</h3>
        <span class="text-sm font-semibold" style="color:#d97706;">${completed}/${total} Completadas</span>
    </div>

    <!-- Progress Bar -->
    <div style="background:#fef3c7; height:8px; border-radius:10px; overflow:hidden; margin-bottom:20px;">
        <div style="width:${percent}%; background:linear-gradient(90deg, #F59E0B, #d97706); height:100%; border-radius:10px; box-shadow:0 0 10px rgba(245,158,11,0.5); transition:width 1s;"></div>
    </div>

    <!-- Missions List -->
    <div class="missions-list">
        ${missionsToShow.map(renderMissionItem).join('')}
    </div>
  `;
}

function renderMissionItem(mission) {
  // Usamos data-attributes para ser capturados por attachGranjaListeners
  // y evitar onclicks inline que rompen CSP o complican la logica
  return `
        <div class="mission-card animate-fade-in-up" 
            data-id="${mission.id}" 
            data-cta="${mission.cta || ''}"
            style="
            background:white; 
            border:1px solid #fce7f3; 
            border-bottom: 3px solid #fce7f3;
            border-radius:16px; 
            padding:16px; 
            margin-bottom:12px; 
            display:flex; 
            align-items:center; 
            gap:16px;
            cursor:pointer;
            transition:all 0.2s;
            position:relative;
            overflow:hidden;
        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            
            <div style="
                width:48px; 
                height:48px; 
                background:#fffbeb; 
                border-radius:12px; 
                display:flex; 
                align-items:center; 
                justify-content:center; 
                font-size:24px;
                flex-shrink:0;
                border: 1px solid #fef3c7;
            ">${mission.icon}</div>

            <div style="flex:1;">
                <div style="font-weight:700; color:#1f2937; font-size:0.95rem; margin-bottom:4px; line-height:1.2;">${mission.title}</div>
                <div style="font-size:0.85rem; color:#d97706; font-weight:700;">🎁 ${mission.reward}</div>
            </div>

            <div style="
                width:36px; 
                height:36px; 
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                border-radius:50%; 
                display:flex; 
                align-items:center; 
                justify-content:center;
                color:white;
                box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
            ">
                ${renderIcon('arrowRight', '', '18')}
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

    AppState.set({ piggies });

    const app = document.getElementById('app');
    app.innerHTML = buildGranjaFull(firstName, piggies, stats);

    attachGranjaListeners(piggies.length > 0, stats);
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
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Mi Granja</h2>

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
                    <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.15); padding-top:16px;">
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Disponible para Retiro</div>
                       <div style="font-size:1.75rem; font-weight:800; letter-spacing: -0.5px;">${stats.disponibleFormatted}</div>
                    </div>
                 </div>

                 ${stats.disponible > 0 ? `
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
                      ">Convertir Bono en Efectivo</button>
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
                      ">Solicitar Entrega de Carne</button>
                   </div>
                 ` : ''}
              </div>
           </div>
        </div>

        <!-- ROI Info -->
        ${stats.activeCount > 0 ? `
          <div class="roi-info animate-fade-in-up" style="animation-delay: 0.15s;">
            ${renderIcon('trendUp', 'roi-info__icon', '16')}
            <span>Margen Comercial Granja: <strong class="text-primary">${stats.baseROIFormatted}</strong></span>
          </div>

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

        <!-- Bonus Banner -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
          <div class="banner banner--interactive" id="bonus-banner">
            <div class="banner__badge">BONO PLUS DE BIENVENIDA</div>
            <div class="banner__title">Consigue bono de consumo por $50.000</div>
            <div class="banner__subtitle">Comprando tu primer piggy.</div>
            <div class="banner__decoration">🎁</div>
            <div class="text-xs mt-sm" style="opacity:0.7;">*Aplican términos y condiciones.</div>
          </div>
        </div>

        <!-- Missions Module -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.35s;">
          ${renderMissionsModule()}
        </div>

      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

function renderGreeting(firstName) {
  const initial = firstName.charAt(0).toUpperCase();
  return `
    <div class="granja-greeting animate-fade-in">
      <div class="granja-greeting__avatar">
        <span class="granja-greeting__initial">${initial}</span>
        <span class="granja-greeting__online"></span>
      </div>
      <div class="granja-greeting__text">
        <span class="granja-greeting__welcome">¡Bienvenido!</span>
        <span class="granja-greeting__name">Hola, ${firstName}</span>
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
      <div class="empty-state__icon" style="
        width: 150px; 
        height: 150px; 
        margin: 0 auto 20px; 
        border-radius: 50%;
        border: 4px solid #fff; 
        box-shadow: 0 10px 30px rgba(236, 72, 153, 0.2);
        overflow: hidden;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="pig1.png" alt="Piggy" style="
            width: 100%;
            height: 100%;
            object-fit: cover;
        " />
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

export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Navegación principal">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}" id="nav-granja">
        <span class="bottom-nav__icon">${renderIcon('farm', '', '24')}</span>
        <span>Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}" id="nav-mercado">
        <span class="bottom-nav__icon">${renderIcon('shop', '', '24')}</span>
        <span>Mercado</span>
      </a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}" id="nav-aliados">
        <span class="bottom-nav__icon">${renderIcon('people', '', '24')}</span>
        <span>Aliados</span>
      </a>
    </nav>
  `;
}

function showBonusModal(hasPiggies) {
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

  const close = () => modal.remove();
  document.getElementById('bonus-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.getElementById('btn-redeem-bonus').addEventListener('click', () => {
    close();
    if (hasPiggies) {
      navigateTo('mercado');
    } else {
      navigateTo('adopcion');
    }
  });
}

function removeBonusModal() {
  const existing = document.getElementById('bonus-modal');
  if (existing) existing.remove();
}

function showWithdrawModal(availableAmount) {
  const existing = document.getElementById('withdraw-modal');
  if (existing) existing.remove();

  const minWithdraw = 10000;

  const modal = document.createElement('div');
  modal.id = 'withdraw-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="withdraw-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
        
        <h3 class="modal-title mb-md">Retiro de Fondos</h3>
        
        <div class="form-group">
            <label class="form-label">Monto a retirar</label>
            <div class="input-wrapper" style="position:relative;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#999;">$</span>
                <input type="number" id="withdraw-amount" class="form-input" style="padding-left:30px; width:100%; box-sizing:border-box;" placeholder="0" min="${minWithdraw}" max="${availableAmount}">
                <button type="button" id="btn-withdraw-all" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--color-primary); font-weight:600; cursor:pointer;">Todo</button>
            </div>
            <div class="text-xs text-muted mt-sm">Disponible: ${formatCOP(availableAmount)} • Mínimo: ${formatCOP(minWithdraw)}</div>
            <div id="withdraw-error" class="text-xs" style="color:var(--color-danger); margin-top:4px; display:none;"></div>
        </div>

        <div class="form-group">
            <label class="form-label">Banco de destino</label>
            <select id="withdraw-bank" class="form-input" style="width:100%;">
                <option value="">Selecciona un banco</option>
                <option value="nequi">Nequi</option>
                <option value="bancolombia">Bancolombia</option>
                <option value="pse">PSE / Otros Bancos</option>
            </select>
        </div>

        <div class="form-group" style="display:flex; align-items:flex-start; gap:8px;">
            <input type="checkbox" id="withdraw-terms" style="margin-top:4px;">
            <label for="withdraw-terms" class="text-sm text-muted">He leído y acepto los términos y condiciones para efectuar retiros, incluyendo el tiempo de procesamiento de 3 días hábiles.</label>
        </div>

        <button class="btn btn--primary btn--block btn--disabled" id="btn-solicitar-retiro" disabled style="width:100%; margin-top:16px;">Solicitar Retiro</button>
    </div>
  `;

  document.body.appendChild(modal);

  const amountInput = document.getElementById('withdraw-amount');
  const bankInput = document.getElementById('withdraw-bank');
  const termsInput = document.getElementById('withdraw-terms');
  const submitBtn = document.getElementById('btn-solicitar-retiro');
  const errorDiv = document.getElementById('withdraw-error');

  const validate = () => {
    const amount = parseFloat(amountInput.value) || 0;
    const bank = bankInput.value;
    const terms = termsInput.checked;

    let valid = true;
    let errorMsg = '';

    if (amount < minWithdraw) {
      valid = false;
      if (amount > 0) errorMsg = `El monto mínimo es ${formatCOP(minWithdraw)}`;
    } else if (amount > availableAmount) {
      valid = false;
      errorMsg = 'Fondos insuficientes';
    }

    if (errorMsg) {
      errorDiv.textContent = errorMsg;
      errorDiv.style.display = 'block';
    } else {
      errorDiv.style.display = 'none';
    }

    if (valid && bank && terms) {
      submitBtn.classList.remove('btn--disabled');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    } else {
      submitBtn.classList.add('btn--disabled');
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
    }
  };

  amountInput.addEventListener('input', validate);
  bankInput.addEventListener('change', validate);
  termsInput.addEventListener('change', validate);

  document.getElementById('btn-withdraw-all').addEventListener('click', () => {
    amountInput.value = availableAmount;
    validate();
  });

  const close = () => modal.remove();
  document.getElementById('withdraw-close-btn').addEventListener('click', close);

  submitBtn.addEventListener('click', () => {
    showWithdrawSuccess(amountInput.value, bankInput.options[bankInput.selectedIndex].text);
    close();
  });
}

function showWithdrawSuccess(amount, bank) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
        <div class="modal animate-scale-in text-center">
             <button class="bonus-close" id="success-close-x" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
            <div style="width:60px; height:60px; background:var(--color-success-light); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
                ${renderIcon('check', '', '32')}
            </div>
            <h3 class="modal-title">Solicitud Recibida</h3>
            <p class="text-muted mb-md">Tu solicitud de retiro por <strong>${formatCOP(parseFloat(amount))}</strong> a <strong>${bank}</strong> ha sido generada.</p>
            
            <div class="card bg-gray-50 mb-md text-left p-sm text-sm" style="background:#f9fafb; padding:12px; border-radius:8px; margin-bottom:16px;">
                <div><strong>Comprobante:</strong> #RET-${Date.now().toString().slice(-6)}</div>
                <div><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</div>
                <div><strong>Estado:</strong> En Proceso</div>
            </div>

            <p class="text-xs text-muted mb-lg" style="margin-bottom:24px;">
                Recuerda que a partir de este momento comienzan a correr los 3 días hábiles.
                Para agilizar, escríbenos al WhatsApp y envía este comprobante.
            </p>
            
            <button class="btn btn--primary btn--block" id="btn-finish-withdraw">
                Volver al Inicio
            </button>
        </div>
      `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('success-close-x').addEventListener('click', close);

  document.getElementById('btn-finish-withdraw').addEventListener('click', () => {
    close();
  });
}
