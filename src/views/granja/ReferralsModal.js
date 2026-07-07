/* ============================================
   PIGGY APP — Referidos Modal Component
   ============================================ */

import { renderIcon } from '../../icons.js';
import { getMyReferralCode, getMyReferralStats, shareReferralCode } from '../../services/referralService.js';
import { completeMissionOnVisit } from '../../services/missionsService.js';
import { formatCOP } from '../../services/mockData.js';

/**
 * Load the referral code into the greeting element in GranjaView.
 */
export async function loadGreetingReferralCode() {
  try {
    const code = await getMyReferralCode();
    const element = document.getElementById('greeting-referral-code');
    if (element) {
      element.innerHTML = `🎁 Código de invitado: <strong>${code || '---'}</strong>`;
    }
  } catch (error) {
    console.warn('Error loading referral code for greeting:', error);
  }
}

/**
 * Show the Referral Program modal with explanation, referrals list,
 * commission tiers, and WhatsApp share button.
 */
export async function showReferralModal() {
  // M3: auto-complete "Invita a un amigo a Piggy" on first referral modal open
  await completeMissionOnVisit('m3');
  if (window._refreshMissionBanner) window._refreshMissionBanner();

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
  const close = () => {
    modal.remove();
    if (window._refreshMissionBanner) window._refreshMissionBanner();
    if (window.location.hash === '#/referidos') {
      window.location.hash = '#/granja';
    }
  };
  document.getElementById('referral-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Fetch data
  try {
    const [code, stats] = await Promise.all([
      getMyReferralCode(),
      getMyReferralStats(),
    ]);

    const referralCode = code || '---';
    const referrals = stats?.referrals || [];
    const completedCount = stats?.completedReferralsCount || 0;
    const pendingCount = stats?.pendingReferralsCount || 0;
    const currentTier = stats?.currentTier || 'tier_1';

    // Saldo Comisiones = sum of commission_amount for completed referrals
    const commissionsEarned = referrals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.commission_amount || 0), 0);

    // Build referrals list
    let referralsListHTML = '';
    if (referrals.length === 0) {
      referralsListHTML = `
        <div style="text-align:center; padding: 20px; color: var(--color-text-muted); font-size: 0.85rem;">
          Aún no tienes referidos. ¡Comparte tu código para empezar a ganar!
        </div>
      `;
    } else {
      referralsListHTML = referrals.map(r => {
        const commissionText = r.status === 'completed' 
          ? `+${formatCOP(r.commission_amount)}`
          : 'Pendiente primera compra';
        const commissionColor = r.status === 'completed' ? '#10B981' : 'var(--color-text-muted)';
        
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--color-border); font-size:0.85rem;">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-weight:700; color:var(--color-text-primary);">${r.referred_name || 'Amigo Piggy'}</span>
              <span style="font-size:0.75rem; color:var(--color-text-muted);">${new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <span style="font-weight:700; color:${commissionColor}; font-size:0.8rem;">${commissionText}</span>
          </div>
        `;
      }).join('');
    }

    // Modal Content
    modal.innerHTML = `
      <div class="modal animate-scale-in" style="max-width:420px; max-height:90vh; overflow-y:auto; padding:24px; box-sizing:border-box;">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="referral-modal-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer; z-index:3;">&times;</button>
        
        <div style="text-align:center; margin-bottom:20px; margin-top: 10px;">
          <span style="font-size: 40px; display:block; margin-bottom: 8px;">🎁</span>
          <h3 style="margin:0 0 6px 0; font-size:1.25rem; font-weight:800; color:var(--color-text-primary);">Programa de Referidos</h3>
          <p style="margin:0; font-size:0.85rem; color:var(--color-text-secondary); line-height:1.4;">
            Invita a tus amigos y gana dinero por cada uno de ellos que adopte su primer Piggy.
          </p>
        </div>

        <!-- Código de Invitado -->
        <div id="referral-code-box" style="background:var(--color-bg); border:1.5px dashed var(--color-primary-light); border-radius:14px; padding:14px; text-align:center; margin-bottom:20px; cursor:pointer; position:relative;" title="Haz clic para copiar">
          <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--color-primary); margin-bottom:4px; letter-spacing:0.5px;">Tu código de invitado</div>
          <div style="font-size:1.45rem; font-weight:900; color:var(--color-primary-dark); letter-spacing:1px;" id="referral-code-text">${referralCode}</div>
          <div style="font-size:0.65rem; color:var(--color-text-muted); margin-top:4px;">✨ Haz clic para copiar código</div>
        </div>

        <!-- Mis Referidos -->
        <div style="margin-bottom:24px;">
          <h4 style="margin:0 0 8px 0; font-size:0.9rem; font-weight:800; color:var(--color-text-primary); text-transform:uppercase; letter-spacing:0.5px;">Mis Invitados</h4>
          <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
            ${referralsListHTML}
          </div>
        </div>

        <!-- Comisiones Tiers -->
        <div style="background:var(--color-bg-section); border-radius:14px; padding:16px; margin-bottom:24px;">
          <h4 style="margin:0 0 10px 0; font-size:0.85rem; font-weight:800; color:var(--color-text-primary); text-transform:uppercase; letter-spacing:0.5px; text-align:center;">Niveles de Comisión</h4>
          
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding:4px 0; border-bottom:1px solid rgba(0,0,0,0.05); ${currentTier === 'tier_1' ? 'font-weight:700; color:var(--color-primary);' : 'color:var(--color-text-secondary);'}">
              <span>Nivel 1 (1 - 4 amigos):</span>
              <span>${formatCOP(30000)} / amigo</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding:4px 0; border-bottom:1px solid rgba(0,0,0,0.05); ${currentTier === 'tier_2' ? 'font-weight:700; color:var(--color-primary);' : 'color:var(--color-text-secondary);'}">
              <span>Nivel 2 (5 - 14 amigos):</span>
              <span>${formatCOP(50000)} / amigo</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding:4px 0; ${currentTier === 'tier_3' ? 'font-weight:700; color:var(--color-primary);' : 'color:var(--color-text-secondary);'}">
              <span>Nivel 3 (15+ amigos):</span>
              <span>${formatCOP(80000)} / amigo</span>
            </div>
          </div>
          
          <p style="margin:12px 0 0 0; font-size:0.7rem; color:var(--color-text-muted); text-align:center; line-height:1.3;">
            La comisión se asigna automáticamente a tus Bonos de Consumo cuando tu amigo realiza su primera compra.
          </p>
        </div>

        <!-- Compartir Button -->
        <button id="btn-modal-share-referral" class="btn btn--primary btn--block btn--lg" style="gap:8px; display:flex; align-items:center; justify-content:center;">
          <svg style="width:18px; height:18px;" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.004 22l1.352-4.88c-1.028-1.788-1.572-3.816-1.572-5.9 0-6.508 5.292-11.8 11.8-11.8 3.152 0 6.116 1.228 8.348 3.46 2.232 2.232 3.46 5.196 3.46 8.348 0 6.508-5.292 11.8-11.8 11.8-1.996 0-3.964-.508-5.712-1.472zm6.208-3.084l.324.192c1.62.964 3.472 1.472 5.372 1.472 5.728 0 10.388-4.66 10.388-10.388C24.296 4.464 19.636-.2 13.908-.2c-5.728 0-10.388 4.66-10.388 10.388 0 2.02.532 3.996 1.544 5.736l.212.368-.912 3.284zm11.204-6.84c-.3-.152-1.776-.876-2.052-.976-.276-.1-.476-.152-.676.152-.2.3-.776.976-.952 1.176-.176.2-.352.228-.652.076-.3-.152-1.268-.468-2.416-1.492-.892-.796-1.496-1.78-1.672-2.08-.176-.3-.02-.464.132-.612.136-.132.3-.348.452-.524.152-.176.2-.3.3-.5.1-.2.05-.376-.024-.524-.076-.152-.676-1.632-.924-2.228-.244-.596-.492-.516-.676-.524-.172-.008-.372-.008-.572-.008-.2 0-.524.076-.8.376-.276.3-1.052 1.028-1.052 2.508a4.89 4.89 0 001.02 2.6c.104.14 2.016 3.08 4.884 4.32 1.62.7 2.884 1.12 3.868 1.432.812.26 1.552.224 2.136.136.652-.1 2.008-.82 2.292-1.616.284-.796.284-1.476.2-1.616-.084-.144-.284-.224-.584-.376z"/>
          </svg>
          Compartir Invitación
        </button>
      </div>
    `;

    // Bind event listeners to new elements
    document.getElementById('referral-modal-close').addEventListener('click', close);
    
    document.getElementById('btn-modal-share-referral').addEventListener('click', async () => {
      if (referralCode && referralCode !== '---') {
        await shareReferralCode(referralCode);
      }
    });

    const codeBox = document.getElementById('referral-code-box');
    codeBox.addEventListener('click', () => {
      if (referralCode && referralCode !== '---') {
        navigator.clipboard.writeText(referralCode).then(() => {
          const textEl = document.getElementById('referral-code-text');
          const original = textEl.textContent;
          textEl.textContent = '¡COPIADO!';
          setTimeout(() => {
            textEl.textContent = original;
          }, 1500);
        });
      }
    });

  } catch (error) {
    console.error('Error loading referral modal stats:', error);
    modal.innerHTML = `
      <div class="modal animate-scale-in" style="max-width:320px; padding:24px; box-sizing:border-box;">
        <button class="bonus-close" id="referral-modal-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
        <div style="text-align:center; padding:20px 0;">
          <p style="color:#ef4444; font-size:0.9rem; font-weight:700; margin-bottom:16px;">Error al cargar datos de referidos.</p>
          <button class="btn btn--text" id="referral-modal-retry" style="font-weight:700; color:var(--color-primary);">Reintentar</button>
        </div>
      </div>
    `;
    document.getElementById('referral-modal-close').addEventListener('click', close);
    document.getElementById('referral-modal-retry').addEventListener('click', () => {
      showReferralModal();
    });
  }
}
