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


function attachGranjaListeners(hasPiggies, stats) {
  document.querySelectorAll('.piggy-card').forEach((card) => {
    card.addEventListener('click', () => {
      navigateTo(`piggy/${card.dataset.piggyId}`);
    });
  });

  const banner = document.getElementById('bonus-banner');
  if (banner) {
    banner.addEventListener('click', () => {
      handleRewardClick(banner, hasPiggies);
    });
  }

  const quickBuyBtn = document.getElementById('btn-quick-buy');
  if (quickBuyBtn) {
    quickBuyBtn.addEventListener('click', async () => {
      quickBuyBtn.style.opacity = '0.7';
      quickBuyBtn.style.pointerEvents = 'none';
      try {
        const items = await getMarketplaceItems();
        const standardPiggy = items.find(i => i.currentMonth === 1 && i.category === 'standard') || items[0];
        if (standardPiggy) showCheckoutModal(standardPiggy);
        else navigateTo('mercado');
      } catch (error) {
        navigateTo('mercado');
      } finally {
        quickBuyBtn.style.opacity = '1';
        quickBuyBtn.style.pointerEvents = 'auto';
      }
    });
  }

  document.getElementById('btn-withdraw')?.addEventListener('click', () => {
    showWithdrawModal(stats?.disponible || 0);
  });

  document.getElementById('btn-meat')?.addEventListener('click', () => {
    showMeatModal();
  });
}

function renderMissionsModule() {
  const piggies = AppState.get('piggies') || [];
  const profile = AppState.get('profile');
  const hasFirstPiggy = piggies.length >= 1;
  const hasSecondPiggy = piggies.length >= 2;

  const processedMissions = MOCK_MISSIONS.map(m => {
    let mission = { ...m, is_locked: false };
    if (isMissionCompletedManual(mission.id)) {
      mission.is_completed = true;
    } else {
      if (mission.id === 'm1') mission.is_completed = !!profile;
      if (mission.id === 'm2') mission.is_completed = hasFirstPiggy;
      if (mission.id === 'm4') mission.is_completed = hasSecondPiggy;
      if (mission.id === 'm7') mission.is_completed = piggies.length >= 3;
    }
    if (mission.id === 'm4' && !hasFirstPiggy) mission.is_locked = true;
    if (mission.id === 'm7' && !hasSecondPiggy) mission.is_locked = true;
    if (mission.id === 'm6' && !hasFirstPiggy) mission.is_locked = true;
    return mission;
  });

  const activeMissions = processedMissions.filter(m => !m.is_completed && !m.is_locked);
  const total = processedMissions.length;
  const completed = processedMissions.filter(m => m.is_completed).length;
  const percent = Math.round((completed / total) * 100);

  if (activeMissions.length === 0) {
    return `
        <div class="missions-complete animate-fade-in-up" style="text-align:center; padding:32px; background:white; border-radius:16px; border:1px dashed #e0e0e0;">
            <div style="font-size:48px; margin-bottom:16px;">🏆</div>
            <h3 class="text-primary font-bold" style="font-size:1.2rem; margin-bottom:8px;">¡Eres un Granjero Maestro!</h3>
            <p class="text-muted text-sm">Has desbloqueado todos los bonos disponibles.</p>
        </div>
      `;
  }

  const missionsToShow = activeMissions.slice(0, 3);

  return `
    <div class="section__header" style="margin-bottom:12px;">
        <h3 class="section__title">Misiones</h3>
        <span class="text-sm font-semibold" style="color:#d97706;">${completed}/${total} Completadas</span>
    </div>
    <div style="background:#fef3c7; height:8px; border-radius:10px; overflow:hidden; margin-bottom:20px;">
        <div style="width:${percent}%; background:linear-gradient(90deg, #F59E0B, #d97706); height:100%; border-radius:10px; box-shadow:0 0 10px rgba(245,158,11,0.5); transition:width 1s;"></div>
    </div>
    <div class="missions-list">
        ${missionsToShow.map(renderMissionItem).join('')}
    </div>
  `;
}

function renderMissionItem(mission) {
  return `
        <div class="mission-card animate-fade-in-up" data-id="${mission.id}" data-cta="${mission.cta || ''}"
            style="background:white; border:1px solid #fce7f3; border-bottom: 3px solid #fce7f3; border-radius:16px; padding:16px; margin-bottom:12px; display:flex; align-items:center; gap:16px; cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden;"
            onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="width:48px; height:48px; background:#fffbeb; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0; border: 1px solid #fef3c7;">${mission.icon}</div>
            <div style="flex:1;">
                <div style="font-weight:700; color:#1f2937; font-size:0.95rem; margin-bottom:4px; line-height:1.2;">${mission.title}</div>
                <div style="font-size:0.85rem; color:#d97706; font-weight:700;">🎁 ${mission.reward}</div>
            </div>
            <div style="width:36px; height:36px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);">
                ${renderIcon('arrowRight', '', '18')}
            </div>
        </div>
    `;
}

export function renderGranjaView() {
  const app = document.getElementById('app');
  const profile = AppState.get('profile');
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';
  app.innerHTML = buildGranjaShell(firstName);
  loadGranjaData(firstName);
  return () => { removeBonusModal(); };
}

function buildGranjaShell(firstName) {
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title">Mi Granja</h2>
        <div class="section animate-fade-in-up">
           <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 16px; margin-bottom: 24px; color: white; position:relative; overflow:hidden;">
              <h3 style="margin:0 0 16px 0; font-size:1.1rem; opacity:0.9;">Wallet de ${firstName}</h3>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                  <div><div class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></div></div>
              </div>
           </div>
        </div>
        <div class="section" id="piggies-section"><div class="loading-container"><span>Cargando tu granja...</span></div></div>
      </div>
      ${renderBottomNav('granja')}
    </div>
  `;
}

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
  }
}

function buildGranjaFull(firstName, piggies, stats) {
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Mi Granja</h2>
        <div class="section animate-fade-in-up">
           <div class="wallet-banner-card" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);">
              <div style="position:relative; z-index:2;">
                 <h3 style="margin:0 0 20px 0; font-size:1.25rem; font-weight:700;">Wallet de ${firstName}</h3>
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <div><div style="font-size:0.75rem; opacity:0.8;">Adquisición Bonos</div><div>${stats.adquisicionBonosFormatted}</div></div>
                    <div><div style="font-size:0.75rem; opacity:0.8;">Diferencial</div><div style="color: #39FF14;">+${stats.diferencialPreventaFormatted}</div></div>
                    <div style="grid-column: span 2;"><div style="font-size:1.75rem; font-weight:800;">${stats.disponibleFormatted}</div></div>
                 </div>
                 ${stats.disponible > 0 ? `<button id="btn-withdraw" class="btn btn--white">Retirar</button>` : ''}
              </div>
           </div>
        </div>
        <div class="section animate-fade-in-up">
          <div class="section__header"><h3 class="section__title">Mis Piggys</h3></div>
          ${piggies.length === 0 ? renderEmptyPiggies() : renderPiggiesList(piggies, stats.baseROI)}
        </div>
        <div class="section animate-fade-in-up">${renderBonusBanner(piggies)}</div>
        <div class="section animate-fade-in-up">${renderMissionsModule()}</div>
      </div>
      ${renderBottomNav('granja')}
    </div>
  `;
}

function renderGreeting(firstName) {
  return `<div class="granja-greeting"><span>Hola, ${firstName}</span></div>`;
}

function renderEmptyPiggies() {
  return `<div class="empty-state"><h3>No tienes Piggys aún</h3><button onclick="location.hash='#/adopcion'">Compra un Piggy</button></div>`;
}

function renderPiggiesList(piggies, baseROI) {
  return `<div class="piggies-list">${piggies.map(p => renderPiggyCard(p, baseROI)).join('')}</div>`;
}

function renderPiggyCard(piggy, baseROI) {
  return `<div class="piggy-card" data-piggy-id="${piggy.id}"><h4>${piggy.name}</h4><div class="progress"><div class="progress__bar" style="width:${piggy.progress}%"></div></div></div>`;
}

export function renderBottomNav(activeTab) {
  return `<nav class="bottom-nav"><a href="#/granja">Granja</a><a href="#/mercado">Mercado</a></nav>`;
}

function showBonusModal(hasPiggies) {
  const modal = document.createElement('div');
  modal.id = 'bonus-modal';
  modal.innerHTML = `<div class="modal"><h3>BONO $50.000</h3><button id="btn-redeem-bonus">Redimir</button></div>`;
  document.body.appendChild(modal);
  document.getElementById('btn-redeem-bonus').addEventListener('click', () => {
    localStorage.setItem('bonus_redeemed', 'true');
    modal.remove();
    location.reload();
  });
}

const REWARD_TYPES = {
  BONUS_50K: 'bonus_50k',
  PIGGY_3M: 'unlock_piggy_3m',
  REFERRAL: 'unlock_referral',
  MARGIN_1: 'margin_plus_1',
  SILVER_24H: 'piggy_silver',
  CYCLE_FINISH: 'piggy_silver_cycle',
  MARGIN_KEEP: 'margin_keep_10',
  GOLD_24H: 'piggy_gold',
  WALLET_30K: 'wallet_30k'
};

function calculateMissionStates(piggies, profile) {
  const hasFirstPiggy = piggies && piggies.length >= 1;
  return {
    m1: !!profile,
    m2: hasFirstPiggy,
    m3: isMissionCompletedManual('m3'),
    m4: (piggies && piggies.length >= 2),
    m5: isMissionCompletedManual('m5'),
    m6: (piggies && piggies.some(p => p.isComplete)),
    m7: (piggies && piggies.length >= 3),
    m8: isMissionCompletedManual('m8'),
    m9: isMissionCompletedManual('m9')
  };
}

function getActiveReward(piggies) {
  const profile = AppState.get('profile');
  const status = calculateMissionStates(piggies, profile);

  if (status.m1 && localStorage.getItem('reward_redeemed_' + REWARD_TYPES.BONUS_50K) !== 'true') {
    return { id: REWARD_TYPES.BONUS_50K, type: 'modal_50k', badge: 'M1', title: 'Bono $50k', icon: '🎁' };
  }
  if (status.m2 && localStorage.getItem('reward_redeemed_' + REWARD_TYPES.PIGGY_3M) !== 'true') {
    return { id: REWARD_TYPES.PIGGY_3M, type: 'navigate', target: '#/mercado', badge: 'M2', title: 'Ciclos Cortos', icon: '🔓' };
  }
  return null;
}

function renderBonusBanner(piggies) {
  const activeReward = getActiveReward(piggies);
  if (!activeReward) return '';
  return `<div class="banner" id="bonus-banner" data-reward-id="${activeReward.id}" data-reward-type="${activeReward.type}" data-reward-target="${activeReward.target || ''}">
    <span>${activeReward.title}</span>
  </div>`;
}

function handleRewardClick(element, hasPiggies) {
  const rewardId = element.dataset.rewardId;
  const rewardType = element.dataset.rewardType;
  localStorage.setItem('reward_redeemed_' + rewardId, 'true');
  if (rewardType === 'modal_50k') showBonusModal(hasPiggies);
  else if (rewardType === 'navigate') location.hash = element.dataset.rewardTarget;
  else location.reload();
}

function removeBonusModal() {
  document.getElementById('bonus-modal')?.remove();
}

function showWithdrawModal(amount) { alert('Retiro de ' + amount); }
function showMeatModal() { alert('Pedido de carne'); }
