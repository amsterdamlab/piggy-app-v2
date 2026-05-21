/* ============================================
   PIGGY APP — Missions Block (Granja Section)
   Dynamic mission banners (M1, M2, M3, generic)
   ============================================ */

import { completeMissionManual } from '../../services/missionsService.js';
import { navigateTo } from '../../router.js';

/**
 * Render the banner for the next active mission.
 * Preserves the premium styles for M1, M2, M3 and creates a generalized
 * beautiful banner for M4-M9 based on DB properties.
 */
export function renderMissionBanner(activeMissions, piggyCount) {
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
  const btnLabel = isManual ? 'Completar misi\u00F3n' : 'Ir a cumplir misi\u00F3n';
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
 * Attach mission-related event listeners.
 */
export function attachMissionListeners() {
  // Mission Banner click (dynamic based on mission)
  const missionBanner = document.getElementById('mission-banner');
  if (missionBanner) {
    missionBanner.addEventListener('click', async () => {
      const missionId = missionBanner.dataset.mission;
      const ctaUrl = missionBanner.dataset.cta;

      // Special case: M1 Redeem bonus reminder
      if (missionId === 'm1-redeem') {
        navigateTo('gourmet');
        return;
      }

      // If there is a route CTA, navigate there
      if (ctaUrl && ctaUrl.startsWith('#/')) {
        navigateTo(ctaUrl.replace('#/', ''));
        return;
      }

      // If no route CTA, it's a manual mission (e.g. m3, m5).
      // Mark as complete, notify, and reload.
      await completeMissionManual(missionId);
      
      // WhatsApp trigger logic for manual reward claims if requested (e.g., m3, m8, m9)
      const isMock = window.location.hostname.includes('localhost') ? false : true; // Adjust as needed
      // Temporary simple alert + reload for manual completions
      alert('\u00A1Misi\u00F3n completada! Procesando tu recompensa.');
      
      // Force reload to refresh missions from DB
      window.location.reload();
    });
  }

  const m1Redeem = document.getElementById('mission-banner-redeem');
  if (m1Redeem) {
    m1Redeem.addEventListener('click', () => {
      navigateTo('gourmet');
    });
  }
}
