/* ============================================
   PIGGY APP — Granja View (Dashboard)
   ============================================ */

import { AppState } from '../state.js';
import { router } from '../router.js';
import { getUserPiggies, getDashboardStats } from '../services/piggiesService.js';
import { getLatestMarketItems } from '../services/marketplaceService.js';
import { formatCOP } from '../services/mockData.js';
import { 
  syncMissionsStatus, 
  getMissionsProgress, 
  completeMissionManual, 
  isMissionCompletedManual 
} from '../services/missionsService.js';

/**
 * Main render function for the Granja (Dashboard) view.
 */
export async function renderGranjaView() {
  const root = document.getElementById('app');
  root.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando tu granja...</p></div>';

  try {
    const piggies = await getUserPiggies();
    const stats = await getDashboardStats(piggies);
    const missions = syncMissionsStatus();
    const progress = getMissionsProgress();
    const marketItems = await getLatestMarketItems();
    
    // Sort market items so accelerators/standard appear correctly
    const featuredItems = marketItems.slice(0, 3);

    root.innerHTML = `
      <div class="view-container animate-fade-in">
        <!-- Dashboard Header -->
        <header class="granja-header">
          <div class="granja-header__profile">
            <div class="profile-avatar">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${AppState.get('profile')?.full_name || 'User'}" alt="Avatar">
            </div>
            <div class="profile-info">
              <h1 class="profile-name">Hola, ${AppState.get('profile')?.full_name?.split(' ')[0] || 'Granjero'}! 🐷</h1>
              <p class="profile-status">Nivel Principiante • Miembro Pro</p>
            </div>
          </div>
          <div class="header-actions">
            <button class="icon-button" id="btn-notifications">
               ${renderIcon('bell', '', '24')}
               <span class="notification-badge"></span>
            </button>
          </div>
        </header>

        <!-- Stats Grid -->
        <section class="stats-grid">
          <div class="stat-card stat-card--primary">
            <div class="stat-card__icon">${renderIcon('wallet', '#fff', '20')}</div>
            <div class="stat-card__content">
              <span class="stat-card__label">Adquisición Bonos</span>
              <h2 class="stat-card__value">${stats.adquisicionBonosFormatted}</h2>
              <div class="stat-card__trend">
                <span class="trend-icon">↑</span>
                <span>Inversión Activa</span>
              </div>
            </div>
          </div>

          <div class="stat-card stat-card--success" id="stat-disponible">
            <div class="stat-card__icon">${renderIcon('cash', '#fff', '20')}</div>
            <div class="stat-card__content">
              <span class="stat-card__label">Disponible</span>
              <h2 class="stat-card__value">${stats.disponibleFormatted}</h2>
              <div class="stat-card__trend">
                 <span class="trend-icon">★</span>
                 <span>Listo para retirar</span>
              </div>
            </div>
          </div>

          <div class="stat-card stat-card--info">
            <div class="stat-card__icon">${renderIcon('trending-up', '#fff', '20')}</div>
            <div class="stat-card__content">
              <span class="stat-card__label">Diferencial Preventa</span>
              <h2 class="stat-card__value">${stats.diferencialPreventaFormatted}</h2>
              <div class="stat-card__trend">
                <span>Ganancia Proyectada</span>
              </div>
            </div>
          </div>

          <div class="stat-card stat-card--accent">
            <div class="stat-card__icon">${renderIcon('piggy-bank', '#fff', '20')}</div>
            <div class="stat-card__content">
              <span class="stat-card__label">Margen Comercial</span>
              <h2 class="stat-card__value">${stats.baseROIFormatted}</h2>
              <div class="stat-card__trend">
                <span>Rentabilidad Base</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Dynamic Bonus Banner Slot -->
        <section class="banner-slot" id="banner-container">
           ${renderBonusBanner(piggies)}
        </section>

        <!-- Close Cycle Status -->
        ${stats.activeCount > 0 ? `
          <section class="cycle-status card">
            <div class="cycle-status__header">
              <h3 class="card-title">Próxima Cosecha</h3>
              <span class="badge badge--success animate-pulse">${stats.nextCloseDays} días restantes</span>
            </div>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.nextCloseProgress}%"></div>
              </div>
              <div class="progress-labels">
                <span>Crecimiento del lote</span>
                <span>${stats.nextCloseProgress}%</span>
              </div>
            </div>
          </section>
        ` : ''}

        <!-- Piggies Showcase -->
        <section class="piggies-showcase">
          <div class="section-header">
            <h3 class="section-title">Mis Piggies (${piggies.length})</h3>
            <a href="#/mis-piggies" class="view-all-link">Ver todos</a>
          </div>
          
          <div class="piggies-horizontal-scroll">
            ${piggies.length > 0 ? 
              piggies.slice(0, 5).map(pig => renderPiggyCard(pig)).join('') :
              renderEmptyPiggiesState()
            }
          </div>
        </section>

        <!-- Missions Module -->
        <section class="missions-module card">
          <div class="section-header">
            <h3 class="card-title">Ruta del Granjero</h3>
            <span class="text-xs font-bold text-primary">${progress.completed}/${progress.total}</span>
          </div>
          <div class="progress-bar progress-bar--sm mb-md">
            <div class="progress-fill" style="width: ${progress.percent}%"></div>
          </div>
          
          <div class="missions-list">
            ${missions.map(m => renderMissionItem(m)).join('')}
          </div>
        </section>

        <!-- Marketplace Preview -->
        <section class="market-preview">
          <div class="section-header">
            <h3 class="section-title">Nuevas Oportunidades</h3>
            <a href="#/mercado" class="view-all-link">Ir al Mercado</a>
          </div>
          <div class="market-grid">
            ${featuredItems.map(item => `
              <div class="market-card-mini" onclick="location.hash='#/mercado'">
                <div class="market-card-mini__image">
                   ${item.category === 'accelerator' ? '🚀' : '🐷'}
                </div>
                <div class="market-card-mini__content">
                  <h4 class="market-card-mini__title">${item.item_name}</h4>
                  <p class="market-card-mini__price">${formatCOP(item.price)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <div style="height: 80px;"></div> <!-- Spacer for Tab Bar -->
      </div>
    `;

    attachGranjaListeners(piggies.length > 0, stats);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="error-state"><p>Error: ${err.message}</p><button onclick="location.reload()">Reintentar</button></div>`;
  }
}

/**
 * Render a single mission item in the farmer's path.
 */
function renderMissionItem(mission) {
  const isCompleted = mission.is_completed;
  const isLocked = mission.is_locked;

  if (isLocked) {
     return `
      <div class="mission-item mission-item--locked">
        <div class="mission-item__icon">🔒</div>
        <div class="mission-item__content">
          <h4 class="mission-item__title">Misión Bloqueada</h4>
          <p class="mission-item__reward">Completa misiones anteriores</p>
        </div>
      </div>
     `;
  }

  return `
    <div class="mission-item ${isCompleted ? 'mission-item--completed' : ''}" 
         data-id="${mission.id}" 
         data-cta="${mission.cta || ''}">
      <div class="mission-item__icon">${isCompleted ? '✅' : (mission.icon || '🎯')}</div>
      <div class="mission-item__content">
        <h4 class="mission-item__title">${mission.title}</h4>
        <p class="mission-item__reward">🎁 ${mission.reward}</p>
      </div>
      ${!isCompleted && mission.cta ? `
        <button class="mission-item__action">
          ${renderIcon('chevron-right', 'var(--color-primary)', '16')}
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Render a single piggy card for the horizontal scroll.
 */
function renderPiggyCard(pig) {
  return `
    <div class="pig-card-mini animate-scale-in" onclick="location.hash='#/mis-piggies'">
      <div class="pig-card-mini__header">
        <span class="pig-card-mini__name">${pig.name}</span>
        <span class="pig-card-mini__weight">${pig.currentWeight}kg</span>
      </div>
      <div class="pig-card-mini__avatar">🐷</div>
      <div class="pig-card-mini__progress">
        <div class="progress-bar-mini">
           <div class="progress-fill" style="width: ${pig.progress}%"></div>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyPiggiesState() {
  return `
    <div class="empty-state-mini" onclick="location.hash='#/mercado'">
      <div class="empty-state-mini__icon">🎁</div>
      <p>Aún no tienes Piggies. <br><strong>¡Empieza hoy!</strong></p>
    </div>
  `;
}

/**
 * Attach event listeners for the Granja view.
 */
function attachGranjaListeners(hasPiggies, stats) {
  // Withdraw listener
  document.getElementById('stat-disponible')?.addEventListener('click', () => {
    if (stats.disponible > 0) {
      showWithdrawModal(stats.disponible);
    }
  });

  // Missions logic
  document.querySelectorAll('.mission-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const cta = el.dataset.cta;
      
      if (!id || el.classList.contains('mission-item--completed')) return;

      if (cta) {
          if (cta.startsWith('http')) {
             completeMissionManual(id);
             window.open(cta, '_blank');
             setTimeout(() => renderGranjaView(), 500); // UI Refresh
          } else {
             location.hash = cta;
          }
      }
    });
  });

  // Rewards Banner listener
  const banner = document.getElementById('bonus-banner');
  if (banner) {
    banner.addEventListener('click', () => {
      handleRewardClick(banner, hasPiggies);
    });
  }
}

/**
 * Simple SVG Icon Router
 */
function renderIcon(name, color = 'currentColor', size = '24') {
  const icons = {
    'bell': `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>`,
    'wallet': `<rect x="2" width="20" height="14" rx="2" y="5"></rect><path d="M16 11h.01"></path>`,
    'cash': `<rect width="20" height="12" x="2" y="6" rx="2"></rect><circle cx="12" cy="12" r="3"></circle><path d="M6 12h.01M18 12h.01"></path>`,
    'trending-up': `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>`,
    'piggy-bank': `<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1 .5-1.5 1-2 1.5-1.5 1.5-3 1.5-3s-1.5-1.5-3-1.5Z"></path><path d="M7 11c.7 0 1.3.6 1.3 1.3 0 .7-.6 1.3-1.3 1.3-.7 0-1.3-.6-1.3-1.3 0-.7.6-1.3 1.3-1.3Z"></path>`,
    'chevron-right': `<polyline points="9 18 15 12 9 6"></polyline>`,
    'check': `<polyline points="20 6 9 17 4 12"></polyline>`,
    'whatsapp': `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.4 8.38 8.38 0 0 1 3.8.9L21 4.5ZM10.5 7.5l-1.5 1c-1 1-1.5 2-1 3.5.5 1.5 1.5 3 3 4.5s3 2.5 4.5 3c1.5.5 2.5 0 3.5-1l1-1.5-2.5-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2.5Z"></path>`
  };

  const path = icons[name] || '';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${path}
    </svg>
  `;
}


/* =========================================
   REWARDS SYSTEM LOGIC (STRICT MAPPING)
   ========================================= */

const REWARD_TYPES = {
  BONUS_50K: 'bonus_50k',        // Premio M1
  PIGGY_3M: 'unlock_piggy_3m',   // Premio M2
  REFERRAL: 'unlock_referral',   // Premio M3
  MARGIN_1: 'margin_plus_1',     // Premio M4
  SILVER_24H: 'piggy_silver',    // Premio M5
  CYCLE_FINISH: 'piggy_silver_cycle', // Premio M6
  MARGIN_KEEP: 'margin_keep_10', // Premio M7
  GOLD_24H: 'piggy_gold',        // Premio M8
  WALLET_30K: 'wallet_30k'       // Premio M9
};

/**
 * Calculates the completion status of all missions based on current app state.
 * This is the SOURCE OF TRUTH for both the Missions List and the Rewards Banner.
 */
function calculateMissionStates(piggies, profile) {
  const hasFirstPiggy = piggies && piggies.length >= 1;
  const hasSecondPiggy = piggies && piggies.length >= 2;
  const hasFinishedCycle = piggies && piggies.some(p => p.isComplete);

  return {
    m1: !!profile, // Registro
    m2: hasFirstPiggy, // 1er Piggy
    m3: isMissionCompletedManual('m3'), // Invitar (Manual check via localStorage)
    m4: hasSecondPiggy, // 2do Piggy
    m5: isMissionCompletedManual('m5'), // Aliados (Manual)
    m6: hasFinishedCycle, // Cerrar ciclo
    m7: piggies && piggies.length >= 3, // 3er Piggy
    m8: isMissionCompletedManual('m8'), // Oferta semana
    m9: isMissionCompletedManual('m9') // Referido compra
  };
}

/**
 * Determine which reward should be shown in the banner slot.
 * RULES:
 * 1. Mission MUST be completed.
 * 2. Reward MUST NOT be redeemed yet.
 */
function getActiveReward(piggies) {
  const profile = AppState.get('profile');
  const status = calculateMissionStates(piggies, profile);

  // 1. BONO DE BIENVENIDA ($50.000) (M1)
  const bonus50kRedeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.BONUS_50K) === 'true';
  // Legacy fix
  if (localStorage.getItem('bonus_redeemed') === 'true' && !bonus50kRedeemed) {
    localStorage.setItem('reward_redeemed_' + REWARD_TYPES.BONUS_50K, 'true');
  }

  if (status.m1 && !bonus50kRedeemed) {
    return {
      id: REWARD_TYPES.BONUS_50K,
      type: 'modal_50k',
      badge: '¡Misión #1 Cumplida!',
      title: 'Bono de $50.000 Disponible',
      subtitle: 'Toca aquí para redimir tu regalo de bienvenida.',
      icon: '🎁',
      bgClass: 'banner--interactive',
      ctaLabel: 'COBRAR PREMIO'
    };
  }

  // 2. PIGGY 3 MESES (M2)
  const piggy3mRedeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.PIGGY_3M) === 'true';
  if (status.m2 && !piggy3mRedeemed) {
    return {
      id: REWARD_TYPES.PIGGY_3M,
      type: 'navigate',
      target: '#/mercado',
      badge: '¡Misión #2 Cumplida!',
      title: 'Has desbloqueado Ciclos Cortos',
      subtitle: 'Acceso exclusivo a Piggies de 3 Meses.',
      icon: '🔓',
      style: 'background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color:white;',
      ctaLabel: 'VER MERCADO'
    };
  }

  // 3. CODIGO REFERIDO (M3)
  const referralRedeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.REFERRAL) === 'true';
  if (status.m3 && !referralRedeemed) {
    return {
      id: REWARD_TYPES.REFERRAL,
      type: 'show_code', // New action type
      badge: '¡Misión #3 Cumplida!',
      title: 'Tu Código de Referido está listo',
      subtitle: 'Empieza a ganar comisiones por invitar.',
      icon: '🎫',
      style: 'background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color:white;',
      ctaLabel: 'VER CÓDIGO'
    };
  }

  // 4. MARGEN +1% (M4)
  const marginRedeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.MARGIN_1) === 'true';
  if (status.m4 && !marginRedeemed) {
    return {
      id: REWARD_TYPES.MARGIN_1,
      type: 'info_claim',
      badge: '¡Misión #4 Cumplida!',
      title: 'Mejora de Margen Activada',
      subtitle: 'Tu rentabilidad base ha subido un +1%.',
      icon: '',
      style: 'background: linear-gradient(135deg, #10B981 0%, #059669 100%); color:white;',
      ctaLabel: 'ENTENDIDO'
    };
  }

  // 5. PIGGY SILVER (24H) (M5)
  const silverRedeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.SILVER_24H) === 'true';
  if (status.m5 && !silverRedeemed) {
    return {
      id: REWARD_TYPES.SILVER_24H,
      type: 'navigate',
      target: '#/mercado',
      badge: '¡Misión #5 Cumplida!',
      title: 'Has desbloqueado el Piggy Silver',
      subtitle: 'Disponible solo por 24 horas en el mercado.',
      icon: '🥈',
      style: 'background: linear-gradient(135deg, #94a3b8 0%, #475569 100%); color:white;',
      ctaLabel: 'IR AL MERCADO'
    };
  }

  // 6. PIGGY SILVER (24H) (M6)
  const silverCycleRedeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.CYCLE_FINISH) === 'true';
  if (status.m6 && !silverCycleRedeemed) {
    return {
      id: REWARD_TYPES.CYCLE_FINISH,
      type: 'navigate',
      target: '#/mercado',
      badge: '¡Misión #6 Cumplida!',
      title: 'Premio por completar ciclo',
      subtitle: 'Nuevo Piggy Silver desbloqueado.',
      icon: '🏁',
      style: 'background: linear-gradient(135deg, #64748b 0%, #334155 100%); color:white;',
      ctaLabel: 'VER PREMIO'
    };
  }

  // 7. MARGEN FIJO 10% (M7)
  const margin10Redeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.MARGIN_KEEP) === 'true';
  if (status.m7 && !margin10Redeemed) {
    return {
      id: REWARD_TYPES.MARGIN_KEEP,
      type: 'info_claim',
      badge: '¡Misión #7 Cumplida!',
      title: 'Margen Maestro Activado',
      subtitle: 'Tu margen ahora es del 10% para toda tu granja.',
      icon: '💎',
      style: 'background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color:white;',
      ctaLabel: 'ENTENDIDO'
    };
  }

  // 8. PIGGY GOLD (24H) (M8)
  const goldRedeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.GOLD_24H) === 'true';
  if (status.m8 && !goldRedeemed) {
    return {
      id: REWARD_TYPES.GOLD_24H,
      type: 'navigate',
      target: '#/mercado',
      badge: '¡Misión #8 Cumplida!',
      title: '¡DESBLOQUEASTE EL PIGGY GOLD!',
      subtitle: 'Máxima rentabilidad disponible por 24 horas.',
      icon: '🥇',
      style: 'background: linear-gradient(135deg, #facc15 0%, #ca8a04 100%); color:white;',
      ctaLabel: 'COBRAR PREMIO'
    };
  }

  // 9. WALLET $30.000 (M9)
  const wallet30Redeemed = localStorage.getItem('reward_redeemed_' + REWARD_TYPES.WALLET_30K) === 'true';
  if (status.m9 && !wallet30Redeemed) {
    return {
      id: REWARD_TYPES.WALLET_30K,
      type: 'whatsapp_claim',
      badge: '¡Misión #9 Cumplida!',
      title: '¡Tienes $30.000 de Regalo!',
      subtitle: 'Abonaremos este dinero a tu wallet de inmediato.',
      icon: '💵',
      style: 'background: linear-gradient(135deg, #22c55e 0%, #15803d 100%); color:white;',
      ctaLabel: 'RECLAMAR AL WHATSAPP'
    };
  }

  // Si no hay premios pendientes (Misiones no cumplidas O premios ya reclamados)
  return null;
}


/**
 * Render logic for the bonus banner.
 * If null, returns empty string (Banner disappears).
 */
function renderBonusBanner(piggies) {
  const activeReward = getActiveReward(piggies);

  if (!activeReward) {
    // Si no hay premio activo, NO MOSTRAR NADA.
    // Dejar que el usuario se enfoque en las misiones de abajo.
    return '';
  }

  const customStyle = activeReward.style || '';

  return `
    <div class="banner banner--interactive animate-bounce-in" id="bonus-banner" 
         data-reward-id="${activeReward.id}"
         data-reward-type="${activeReward.type}"
         data-reward-target="${activeReward.target || ''}"
         style="${customStyle}">
      <div class="banner__badge" style="opacity:0.9; background:white; color:#333; font-weight:800; box-shadow:0 2px 4px rgba(0,0,0,0.1);">${activeReward.badge}</div>
      <div class="banner__title" style="margin-top:8px;">${activeReward.title}</div>
      <div class="banner__subtitle" style="opacity:0.9;">${activeReward.subtitle}</div>
      <div class="banner__decoration">${activeReward.icon}</div>
      <div class="mt-sm">
        <span style="background:rgba(255,255,255,0.25); padding:6px 16px; border-radius:30px; font-weight:bold; font-size:12px; letter-spacing:0.5px; border:1px solid rgba(255,255,255,0.4);">
           ${activeReward.ctaLabel}
        </span>
      </div>
    </div>
  `;
}



/**
 * Global Handler for Reward Clicks
 */
function handleRewardClick(element, hasPiggies) {
  const rewardId = element.dataset.rewardId;
  const rewardType = element.dataset.rewardType;
  const target = element.dataset.rewardTarget;

  if (!rewardId) return;

  // Mark as redeemed immediately
  if (rewardType !== 'modal_50k' && rewardType !== 'whatsapp_claim') {
    localStorage.setItem('reward_redeemed_' + rewardId, 'true');
  }

  // --- ACTIONS DISPATCHER ---

  // 1. Modal 50k
  if (rewardType === 'modal_50k') {
    showBonusModal(hasPiggies);
    return;
  }

  // 2. Navigation (Market)
  if (rewardType === 'navigate') {
    location.hash = target;
    return;
  }

  // 3. Show Referral Code
  if (rewardType === 'show_code') {
    alert('¡Felicidades! Tu código de referido es: PIGGY2026\nCompártelo con tus amigos.');
    // Force reload to update banner
    setTimeout(() => location.reload(), 500);
    return;
  }

  // 4. Info Claim (Simple confirmation)
  if (rewardType === 'info_claim') {
    // Visual feedback
    element.style.transform = 'scale(0.95)';
    element.style.opacity = '0.5';
    setTimeout(() => location.reload(), 500);
    return;
  }

  // 5. WhatsApp Claim (Misiones con dinero real como M9)
  if (rewardType === 'whatsapp_claim') {
    const phone = "573154870448";
    const profile = AppState.get('profile');
    const name = profile?.full_name || 'Usuario';
    const text = encodeURIComponent(`¡Hola equipo Piggy! Soy ${name}. 🐷 He completado la Misión Especial y vengo a reclamar mi premio de $30.000 en la wallet.`);

    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    localStorage.setItem('reward_redeemed_' + rewardId, 'true');

    // Visual feedback
    element.style.transition = "all 0.5s ease";
    element.style.filter = "grayscale(1)";
    element.style.opacity = "0.7";
    element.style.cursor = "default";
    element.style.pointerEvents = "none";
    element.innerHTML = `
        <div class="banner__badge" style="background:#6b7280;">RECLAMADO</div>
        <div class="banner__title">Solicitud enviada al WhatsApp</div>
        <div class="banner__subtitle">Tu premio será cargado pronto.</div>
        <div class="banner__decoration">✅</div>
      `;
    return;
  }
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
                \${renderIcon('check', '', '32')}
            </div>
            <h3 class="modal-title">Solicitud Recibida</h3>
            <p class="text-muted mb-md">Tu solicitud de retiro por <strong>\${formatCOP(parseFloat(amount))}</strong> a <strong>\${bank}</strong> ha sido generada.</p>
            
            <div class="card bg-gray-50 mb-md text-left p-sm text-sm" style="background:#f9fafb; padding:12px; border-radius:8px; margin-bottom:16px;">
                <div><strong>Comprobante:</strong> #RET-\${Date.now().toString().slice(-6)}</div>
                <div><strong>Fecha:</strong> \${new Date().toLocaleDateString()}</div>
                <div><strong>Estado:</strong> En Proceso</div>
            </div>

            <p class="text-xs text-muted mb-lg" style="margin-bottom:24px;">
                Recuerda que a partir de este momento comienzan a correr los 3 días hábiles.
                Para agilizar, escríbenos al WhatsApp y envía este comprobante.
            </p>

            <a href="https://wa.me/573154870448?text=Hola,%20solicito%20mi%20retiro%20%23RET-\${Date.now().toString().slice(-6)}%20por%20valor%20de%20\${formatCOP(parseFloat(amount))}" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; text-decoration:none;">
                \${renderIcon('whatsapp', '', '20')} Contactar soporte personalizado
            </a>
            <button class="btn btn--text btn--block mt-sm" id="success-close" style="width:100%; margin-top:8px;">Cerrar</button>
        </div>
    `;
  document.body.appendChild(modal);
  document.getElementById('success-close').addEventListener('click', () => modal.remove());
  document.getElementById('success-close-x').addEventListener('click', () => modal.remove());
}

function showMeatModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
        <div class="modal animate-scale-in text-center">
             <button class="bonus-close" id="meat-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
            
            <h3 class="modal-title mb-md">Disfruta tu cosecha 🥩</h3>
            <p class="text-muted mb-lg" style="margin-bottom:24px;">
                Escríbenos para brindarte una atención personalizada y coordinar tu pedido de carne fresca de Granja Villa Morales.
            </p>

            <div class="grid-2 gap-sm" style="display:grid; gap:12px;">
                <a href="https://wa.me/573154870448?text=Hola,%20quiero%20redimir%20mis%20ganancias%20en%20carne" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none;">
                    \${renderIcon('whatsapp', '', '20')} WhatsApp
                </a>
                <a href="#" class="btn btn--secondary btn--block" style="text-decoration:none; display:flex; align-items:center; justify-content:center;">
                   Ver Catálogo
                </a>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
  document.getElementById('meat-close-btn').addEventListener('click', () => modal.remove());
}

function showBonusModal(hasPiggies) {
  removeBonusModal();

  const modal = document.createElement('div');
  modal.id = 'bonus-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="bonus-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
        
        <div class="text-center mb-lg">
            <div style="font-size:48px; margin-bottom:12px;">🎁</div>
            <h3 class="modal-title">¡Bono de Bienvenida!</h3>
            <p class="text-muted">Has desbloqueado un regalo de $50.000 COP por unirte a la granja.</p>
        </div>

        <div class="card bg-primary-light mb-lg" style="background:rgba(255,107,107,0.1); border:1px dashed var(--color-primary); padding:20px; text-align:center;">
            <span style="display:block; font-size:12px; font-weight:bold; color:var(--color-primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Tu Código Único</span>
            <span style="display:block; font-size:28px; font-weight:800; color:var(--color-primary);">PIGGY50K</span>
        </div>

        <div class="reward-info mb-lg">
            <div class="reward-item" style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                <div style="width:24px; height:24px; background:var(--color-success); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:12px;">✓</div>
                <p class="text-sm">Válido para tu primera compra de carne</p>
            </div>
            <div class="reward-item" style="display:flex; align-items:center; gap:12px;">
                <div style="width:24px; height:24px; background:var(--color-success); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:12px;">✓</div>
                <p class="text-sm">Redimible vía WhatsApp con soporte</p>
            </div>
        </div>

        <button class="btn btn--primary btn--block" id="btn-redeem-bonus" style="width:100%;">
            RECLAMAR AL WHATSAPP
        </button>
        
        <p class="text-center text-xs text-muted mt-md">El bono se aplicará automáticamente al contactar.</p>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('bonus-close-btn').addEventListener('click', () => removeBonusModal());
  
  document.getElementById('btn-redeem-bonus').addEventListener('click', () => {
    const phone = "573154870448";
    const profile = AppState.get('profile');
    const name = profile?.full_name || 'Usuario';
    const text = encodeURIComponent(\`Hola equipo Piggy! Soy \${name}. 🐷 Quiero redimir mi bono de bienvenida de $50.000.\`);
    
    window.open(\`https://wa.me/\${phone}?text=\${text}\`, '_blank');
    
    // Mark M1 as redeemed
    localStorage.setItem('reward_redeemed_' + REWARD_TYPES.BONUS_50K, 'true');
    removeBonusModal();
    
    // Refresh view
    setTimeout(() => renderGranjaView(), 1000);
  });
}
