/* ============================================
   PIGGY APP — Granja View (Dashboard)
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats, formatCOP } from '../services/piggiesService.js';
import { navigateTo } from '../router.js';
import { showCheckoutModal } from './MercadoView.js';
import { getMarketplaceItems } from '../services/marketplaceService.js';
import { MOCK_MISSIONS } from '../services/mockData.js';
import { completeMissionManual, isMissionCompletedManual } from '../services/missionsService.js';

// --- LOGICA DE RECOMPENSAS ---
const REWARD_TYPES = {
  BONUS_50K: 'bonus_50k',        // M1
  PIGGY_3M: 'unlock_piggy_3m',   // M2
  REFERRAL: 'unlock_referral',   // M3
  MARGIN_1: 'margin_plus_1',     // M4
  SILVER_24H: 'piggy_silver',    // M5
  CYCLE_FINISH: 'piggy_silver_cycle', // M6
  MARGIN_KEEP: 'margin_keep_10', // M7
  GOLD_24H: 'piggy_gold',        // M8
  WALLET_30K: 'wallet_30k'       // M9
};

function calculateMissionStates(piggies, profile) {
  const count = piggies?.length || 0;
  return {
    m1: !!profile,
    m2: count >= 1,
    m3: isMissionCompletedManual('m3'),
    m4: count >= 2,
    m5: isMissionCompletedManual('m5'),
    m6: piggies?.some(p => p.isComplete),
    m7: count >= 3,
    m8: isMissionCompletedManual('m8'),
    m9: isMissionCompletedManual('m9')
  };
}

function getActiveReward(piggies) {
  const profile = AppState.get('profile');
  const status = calculateMissionStates(piggies, profile);

  // Orden de prioridad: De M1 a M9
  if (status.m1 && localStorage.getItem('reward_redeemed_' + REWARD_TYPES.BONUS_50K) !== 'true') {
    return { id: REWARD_TYPES.BONUS_50K, type: 'modal_50k', badge: 'Misión #1', title: 'Bono de $50.000', icon: '🎁', style: 'background:linear-gradient(135deg, #ec4899, #be123c); color:white;' };
  }
  if (status.m2 && localStorage.getItem('reward_redeemed_' + REWARD_TYPES.PIGGY_3M) !== 'true') {
    return { id: REWARD_TYPES.PIGGY_3M, type: 'navigate', target: '#/mercado', badge: 'Misión #2', title: 'Piggy 3 Meses Desbloqueado', icon: '🔓', style: 'background:linear-gradient(135deg, #8b5cf6, #6d28d9); color:white;' };
  }
  // M3 a M9 siguen la misma lógica...
  if (status.m7 && localStorage.getItem('reward_redeemed_' + REWARD_TYPES.MARGIN_KEEP) !== 'true') {
    return { id: REWARD_TYPES.MARGIN_KEEP, type: 'info', title: 'Margen Maestro 10%', icon: '💎', style: 'background:linear-gradient(135deg, #0ea5e9, #0369a1); color:white;' };
  }
  
  return null;
}

// --- RENDERIZADO ---
export function renderGranjaView() {
  const app = document.getElementById('app');
  const profile = AppState.get('profile');
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';
  app.innerHTML = `
    <div class="page page--with-nav">
      <div id="granja-content" class="page__content">
        <div class="loading-container"><div class="spinner"></div></div>
      </div>
      ${renderBottomNav('granja')}
    </div>
  `;
  loadGranjaData(firstName);
}

async function loadGranjaData(firstName) {
  const container = document.getElementById('granja-content');
  try {
    const piggies = await getUserPiggies();
    const stats = await getDashboardStats(piggies);
    AppState.set({ piggies });
    
    container.innerHTML = `
      <div class="animate-fade-in">
        <h2 class="granja-title">Hola, ${firstName} 🐷</h2>
        ${renderWallet(stats)}
        ${renderPiggiesSection(piggies, stats.baseROI)}
        <div class="mt-lg">${renderBonusBanner(piggies)}</div>
        <div class="mt-lg">${renderMissionsModule(piggies)}</div>
      </div>
    `;
    attachListeners(piggies, stats);
  } catch (e) {
    container.innerHTML = '<p>Error cargando datos.</p>';
  }
}

function renderWallet(stats) {
  return `
    <div class="wallet-card" style="background: linear-gradient(135deg, #10B981, #059669); color:white; padding:20px; border-radius:16px; margin-bottom:20px;">
      <span class="text-sm opacity-80">Disponible para retiro</span>
      <div class="text-2xl font-bold">${stats.disponibleFormatted}</div>
    </div>
  `;
}

function renderPiggiesSection(piggies, baseROI) {
  if (piggies.length === 0) {
    return `
      <div class="empty-state">
        <img src="pig1.png" style="width:100px; margin-bottom:12px;">
        <h3>No tienes Piggys aún</h3>
        <button class="btn btn--primary" onclick="location.hash='#/mercado'">Comprar mi primer Piggy</button>
      </div>
    `;
  }
  return `
    <div class="piggies-list">
      ${piggies.map(p => `
        <div class="piggy-card card" onclick="location.hash='#/piggy/${p.id}'">
          <div class="font-bold">${p.name}</div>
          <div class="progress"><div class="progress__bar" style="width:${p.progress}%"></div></div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderBonusBanner(piggies) {
  const reward = getActiveReward(piggies);
  if (!reward) return '';
  return `
    <div class="banner banner--interactive" id="bonus-banner" data-id="${reward.id}" data-type="${reward.type}" data-target="${reward.target || ''}" style="${reward.style}">
      <div class="banner__badge">${reward.badge || '¡Nuevo!'}</div>
      <div class="banner__title">${reward.title}</div>
      <div class="banner__decoration">${reward.icon}</div>
      <button class="btn btn--white btn--sm mt-sm">COBRAR AHORA</button>
    </div>
  `;
}

function renderMissionsModule(piggies) {
  const profile = AppState.get('profile');
  const status = calculateMissionStates(piggies, profile);
  const missions = MOCK_MISSIONS.map(m => ({ ...m, is_completed: status[m.id] }));
  const completed = missions.filter(m => m.is_completed).length;

  return `
    <div class="section">
      <div class="flex-between mb-sm">
        <h3 class="section__title">Misiones</h3>
        <span class="text-primary font-bold">${completed}/9</span>
      </div>
      <div class="missions-list">
        ${missions.filter(m => !m.is_completed).slice(0, 3).map(m => `
          <div class="mission-item card" onclick="location.hash='${m.cta || '#/mercado'}'">
            <span class="mr-md">${m.icon}</span>
            <div>
              <div class="font-bold">${m.title}</div>
              <div class="text-xs text-muted">Premio: ${m.reward}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function attachListeners(piggies, stats) {
  document.getElementById('bonus-banner')?.addEventListener('click', function() {
    const id = this.dataset.id;
    const type = this.dataset.type;
    localStorage.setItem('reward_redeemed_' + id, 'true');
    if (type === 'modal_50k') alert('¡Bono de $50k activado! Revisa tu WhatsApp.');
    if (type === 'navigate') location.hash = this.dataset.target;
    location.reload();
  });
}

export function renderBottomNav(active) {
  return `
    <nav class="bottom-nav">
      <a href="#/granja" class="${active==='granja'?'active':''}">${renderIcon('farm','','20')}</a>
      <a href="#/mercado" class="${active==='mercado'?'active':''}">${renderIcon('shop','','20')}</a>
    </nav>
  `;
}
