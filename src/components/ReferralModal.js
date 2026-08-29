import { getMyReferralCode, getMyReferralStats, formatReferralBalance, shareReferralCode } from '../services/referralService.js';

/**
 * Render the Referral Badge (Coin icon + Code) for the greeting section
 */
export function renderReferralBadge() {
  return `
    <div id="greeting-referral-code" style="
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #7c3aed, #5b21b6);
      color: white;
      padding: 6px 14px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.72rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(124,58,237,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      white-space: nowrap;
    " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(124,58,237,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(124,58,237,0.3)'">
      <span>💰</span>
      <strong id="greeting-code-value" style="letter-spacing:1.5px; font-family:monospace;">···</strong>
    </div>
  `;
}

/**
 * Load the code into the existing badge
 */
export async function loadGreetingReferralCode() {
  try {
    const code = await getMyReferralCode();
    const codeEl = document.getElementById('greeting-code-value');
    if (codeEl) codeEl.textContent = code || '···';
  } catch (err) {
    console.warn('Error loading referral code:', err);
  }
}

/**
 * Show the Referral Program modal
 */
export async function showReferralModal() {
  const existing = document.getElementById('referral-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'referral-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fadeIn 0.25s ease;
    padding: 0;
  `;

  modal.innerHTML = `
    <div class="animate-slide-up-modal" style="
      background: white;
      border-radius: 28px 28px 0 0;
      padding: 20px 20px calc(32px + env(safe-area-inset-bottom, 0px));
      width: 100%;
      max-width: 480px;
      max-height: 88dvh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
      position: relative;
      box-sizing: border-box;
    ">
      <!-- Pill handle (Tirador de cajón) -->
      <div style="
        width: 44px;
        height: 5px;
        background: #e2e8f0;
        border-radius: 99px;
        margin: 0 auto 16px;
      "></div>
      <button id="referral-modal-close" style="
        background: none;
        border: none;
        position: absolute;
        right: 18px;
        top: 18px;
        font-size: 24px;
        color: #9ca3af;
        cursor: pointer;
        z-index: 10;
        line-height: 1;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
      " onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
      <div class="loading-container" style="padding:40px 0;">
        <div class="spinner"></div>
        <span>Cargando referidos...</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('referral-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

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

    let referralsListHTML = '';
    if (referrals.length === 0) {
      referralsListHTML = `<div style="text-align:center; padding:16px 0; color:#9ca3af; font-size:0.85rem;">Aún no tienes referidos. ¡Comparte tu código!</div>`;
    } else {
      referralsListHTML = referrals.map(r => {
        const statusIcon = r.status === 'completed' ? '✅' : r.status === 'pending' ? '⏳' : '❌';
        const commissionText = r.status === 'completed' ? formatReferralBalance(r.commission_amount) : '-';
        const dateStr = new Date(r.created_at).toLocaleDateString('es-CO', { day:'numeric', month:'short' });
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f3f4f6;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:50%; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#6b7280;">
                ${(r.referredName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:600; font-size:0.85rem; color:#111827;">${r.referredName || 'Usuario'}</div>
                <div style="font-size:0.7rem; color:#9ca3af;">${dateStr} · ${statusIcon} ${r.status === 'completed' ? 'Completado' : 'Pendiente'}</div>
              </div>
            </div>
            <div style="font-weight:700; font-size:0.85rem; color:${r.status === 'completed' ? '#059669' : '#9ca3af'};">
              ${commissionText}
            </div>
          </div>
        `;
      }).join('');
    }

    const modalContent = modal.querySelector('.animate-slide-up-modal') || modal.firstElementChild;
    modalContent.innerHTML = `
      <!-- Pill handle (Tirador de cajón) -->
      <div style="
        width: 44px;
        height: 5px;
        background: #e2e8f0;
        border-radius: 99px;
        margin: 0 auto 16px;
      "></div>
      <button id="referral-modal-close-2" style="
        background: none;
        border: none;
        position: absolute;
        right: 18px;
        top: 18px;
        font-size: 24px;
        color: #9ca3af;
        cursor: pointer;
        z-index: 10;
        line-height: 1;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s;
      " onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>

      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:48px; margin-bottom:8px;">💰</div>
        <h3 style="margin:0 0 6px 0; font-size:1.2rem; font-weight:800; color:#111827;">Programa de Referidos</h3>
        <p style="margin:0; font-size:0.8rem; color:#6b7280; line-height:1.4;">
          Comparte tu código con amigos. Cuando compren su <strong>primer Piggy</strong>, recibes una comisión automática en tu wallet.
        </p>
      </div>

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

      <div style="margin-bottom:20px;">
        <h4 style="margin:0 0 8px 0; font-size:0.85rem; font-weight:700; color:#374151;">Mis Referidos</h4>
        <div style="max-height:160px; overflow-y:auto; border:1px solid #f3f4f6; border-radius:12px; padding:4px 14px;">
          ${referralsListHTML}
        </div>
      </div>

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
        📤 Invitar Amigos por WhatsApp
      </button>
    `;

    document.getElementById('referral-modal-close-2')?.addEventListener('click', close);
    document.getElementById('btn-modal-share-referral')?.addEventListener('click', async () => {
      if (referralCode && referralCode !== '---') {
        await shareReferralCode(referralCode);
      }
    });

  } catch (err) {
    console.error('Error loading referral modal:', err);
    modal.remove();
  }
}
