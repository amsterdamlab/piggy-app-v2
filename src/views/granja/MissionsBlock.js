/* ============================================
   PIGGY APP — Missions Block (Granja Section)
   Renders dynamic mission banners for M1–M7.
   M6 has a 2-stage 72h Silver Piggy countdown.
   M8/M9: Flash missions (user-specific, manual).
   M10: Cycle completion exclusive missions.
   ============================================ */

import { navigateTo } from '../../router.js';
import { showSilverPiggyModal } from './SilverPiggyModal.js';
import { showReferralModal } from './ReferralsModal.js';
import { getMarketplaceItems } from '../../services/marketplaceService.js';
import { showCheckoutModal } from '../MercadoView.js';
import { showFlashMissionModal } from './FlashMissionModal.js';
import { showCycleMissionModal } from './CycleMissionModal.js';
import { getActiveMissions } from '../../services/missionsService.js';
import { getActiveUserFlashMissions, getActiveCycleMissions } from '../../services/flashMissionsService.js';
import { AppState } from '../../state.js';

/** Active countdown interval for M6 banner */
let _bannerCountdownInterval = null;

/* ─── Priority Banner Entry Point ────────────
   Shows flash missions (M8/M9) first, then
   cycle missions (M10), then regular M1–M7.
   ─────────────────────────────────────────── */

/**
 * Refresca dinámicamente el banner de misiones en la interfaz sin recargar la página.
 * Permite cambiar de Misión 3 a Misión 4 instantáneamente al abrir el modal de referidos.
 */
export async function refreshMissionBanner() {
    const container = document.getElementById('mission-banner-container');
    if (!container) return;

    try {
        const piggies = AppState.get('piggies') || [];
        const [activeMissions, flashMissions, cycleMissions] = await Promise.all([
            getActiveMissions(piggies),
            getActiveUserFlashMissions(),
            getActiveCycleMissions()
        ]);

        window._activeFlashMissions = flashMissions;
        window._activeCycleMissions = cycleMissions;

        const newBannerHTML = renderPriorityMissionBanner(flashMissions || [], cycleMissions || [], activeMissions || [], piggies.length);
        container.innerHTML = newBannerHTML;
        attachMissionListeners();
    } catch (e) {
        console.warn('Error al refrescar el banner de misiones:', e);
    }
}

/**
 * Main entry point — renders the highest-priority mission banner.
 * Priority: flashMissions > cycleMissions > regularMissions
 * @param {Array} flashMissions  - Active M8/M9 records
 * @param {Array} cycleMissions  - Active M10 records
 * @param {Array} regularMissions - Active M1–M7 records
 * @param {number} piggyCount
 */
export function renderPriorityMissionBanner(flashMissions, cycleMissions, regularMissions, piggyCount) {
    window._refreshMissionBanner = refreshMissionBanner;
    if (flashMissions && flashMissions.length > 0) {
        return renderFlashMissionBanner(flashMissions[0]);
    }
    if (cycleMissions && cycleMissions.length > 0) {
        return renderCycleMissionBanner(cycleMissions[0]);
    }
    return renderMissionBanner(regularMissions || [], piggyCount || 0);
}

/**
 * Helper: format remaining time from a silverExpiry ISO string.
 */
function formatRemainingTime(silverExpiry) {
    const ms = new Date(silverExpiry).getTime() - Date.now();
    if (ms <= 0) return null; // expired
    const hours   = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m`;
}

/**
 * Render the banner for the first active mission.
 * Each mission has a distinct premium banner design.
 * @param {Array} activeMissions - List of non-completed, non-locked missions
 * @param {number} piggyCount - Number of piggies the user has
 */
export function renderMissionBanner(activeMissions, piggyCount) {
    // Clean up any previous countdown
    if (_bannerCountdownInterval) {
        clearInterval(_bannerCountdownInterval);
        _bannerCountdownInterval = null;
    }

    if (!activeMissions || activeMissions.length === 0) {
        return `
            <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
                <div style="
                    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                    border: 1px solid #a7f3d0; border-radius: 16px;
                    padding: 20px 22px; display: flex; align-items: center; gap: 14px;
                ">
                    <div style="font-size:36px;">&#127881;</div>
                    <div>
                        <div style="font-weight:800; color:#065f46; font-size:0.95rem;">¡Misiones completadas!</div>
                        <div style="font-size:0.78rem; color:#047857; margin-top:2px;">Tu granja está al máximo rendimiento. ¡Felicitaciones! 🎉</div>
                    </div>
                </div>
            </div>
        `;
    }

    const mission = activeMissions[0];

    switch (mission.id) {
        case 'm1': return renderM1Banner(mission);
        case 'm2': return renderM2Banner(mission);
        case 'm3': return renderM3Banner(mission);
        case 'm4': return renderM4Banner(mission);
        case 'm5': return renderM5Banner(mission);
        case 'm6': return renderM6Banner(mission);
        case 'm7': return renderM7Banner(mission);
        default:   return renderGenericBanner(mission);
    }
}

/* ─── Individual Banner Renderers ─────────── */

function renderM1Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m1" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(245,158,11,0.4);
            ">
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; opacity:0.06;
                    background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%220%22 y=%2240%22 font-size=%2230%22%3E🎁%3C/text%3E%3C/svg%3E');
                    pointer-events:none;"></div>
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🎁 MISIÓN 1</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Obtén tu Bono de Bienvenida</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Entra a nuestra Tienda y redime tu Bono de Consumo</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#d97706; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ir a Tienda →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🎁</div>
            </div>
        </div>
    `;
}

function renderM2Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m2" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(236,72,153,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🐷 MISIÓN 2</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Compra tu primer Piggy</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Recarga tu Wallet y empieza a hacer crecer tu granja</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#db2777; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Compra un Piggy →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🐷</div>
            </div>
        </div>
    `;
}

function renderM3Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m3" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(8,145,178,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">📲 MISIÓN 3</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Invita a un amigo a Piggy</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Conoce tu código de referido y compártelo por WhatsApp</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#0e7490; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ir a Programa de Referidos →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">📲</div>
            </div>
        </div>
    `;
}

function renderM4Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m4" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(99,102,241,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">📈 MISIÓN 4</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Compra tu 2do Piggy</div>
                    <div style="font-size:0.82rem; opacity:0.9;">&#9889; Desbloquea <strong>+1% en Margen Comercial</strong> para toda tu granja</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#4f46e5; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ir a Mercado →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🐷</div>
            </div>
        </div>
    `;
}

function renderM5Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m5" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(5,150,105,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🏛️ MISIÓN 5</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Compra en locales aliados</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Descubre los descuentos exclusivos de nuestros locales comerciales</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#047857; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ir a Aliados →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🏛️</div>
            </div>
        </div>
    `;
}

function renderM6Banner(mission) {
    // Check if the 72h Silver offer is still active
    const withinWindow = mission.silverExpiry
        ? (Date.now() < new Date(mission.silverExpiry).getTime())
        : false;

    if (withinWindow) {
        const remaining = formatRemainingTime(mission.silverExpiry);
        return `
            <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
                <div class="banner banner--interactive" id="mission-banner" data-mission="m6" data-cta="open_silver_modal" data-silver-expiry="${mission.silverExpiry}" style="
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
                    border-radius: 16px; padding: 20px 24px; color: white;
                    position: relative; overflow: hidden; cursor: pointer;
                    box-shadow: 0 8px 25px -5px rgba(139,92,246,0.5);
                ">
                    <div style="position:relative; z-index:2;">
                        <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                            border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                            text-transform:uppercase; margin-bottom:10px;">🌟 MISIÓN 6 · OFERTA EXCLUSIVA</div>
                        <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">¡Tu Piggy Silver te espera!</div>
                        <div style="font-size:0.82rem; opacity:0.9;">Oferta única con <strong>+1% en Margen Comercial</strong>. Disponible por tiempo limitado.</div>

                        <!-- Countdown -->
                        <div style="
                            background:rgba(0,0,0,0.2); border-radius:10px;
                            padding:8px 14px; margin-top:10px; display:inline-flex;
                            align-items:center; gap:8px;
                        ">
                            <span>⏳</span>
                            <div>
                                <div style="font-size:0.6rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Tiempo restante</div>
                                <div id="m6-banner-countdown" style="font-size:1rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
                                    ${remaining || '00h 00m'}
                                </div>
                            </div>
                        </div>

                        <div style="margin-top:14px;">
                            <span style="background:white; color:#6d28d9; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                                Ver Piggy Silver ⭐
                            </span>
                        </div>
                    </div>
                    <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🌟</div>
                </div>
            </div>
        `;
    }

    // Offer has expired — show regular "go to Mercado" banner
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m6" data-cta="#/mercado" style="
                background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(139,92,246,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🌟 MISIÓN 6</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Activa tu 3er Piggy</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Compra tu siguiente Piggy en el Mercado y sigue haciendo crecer tu granja</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#6d28d9; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ir a Mercado →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🐷</div>
            </div>
        </div>
    `;
}

function renderM7Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m7" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(16,185,129,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🤝 MISIÓN 7</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Refiere y logra una compra</div>
                    <div style="font-size:0.82rem; opacity:0.9;">&#9989; Recompensa: <strong>$30.000 en tu Wallet</strong> cuando tu referido compre</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#059669; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ir a Programa de Referidos →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🤝</div>
            </div>
        </div>
    `;
}

function renderGenericBanner(mission) {
    const btnLabel = mission.cta?.startsWith('#/') ? 'Ir a cumplir misión' : 'Completar misión';
    const ctaAttr  = mission.cta ? `data-cta="${mission.cta}"` : '';
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="${mission.id}" ${ctaAttr} style="
                background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(139,92,246,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">
                        ${mission.icon} NUEVA MISIÓN
                    </div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">${mission.title}</div>
                    <div style="font-size:0.85rem; opacity:0.9;">&#10004; Recompensa: <strong>${mission.reward}</strong></div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#6d28d9; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">${btnLabel} &rarr;</span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.15; transform:rotate(-15deg);">${mission.icon}</div>
            </div>
        </div>
    `;
}

/* ─── Flash Mission Banner (M8 / M9) ─────── */

/**
 * Render the banner for an active M8/M9 flash mission.
 * Clicking opens FlashMissionModal.
 * @param {Object} mission - Active user_flash_missions record
 */
function renderFlashMissionBanner(mission) {
    const isGold     = mission.mission_key === 'm9' || mission.piggy_type === 'gold';
    const gradient   = isGold
        ? 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)'
        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)';
    const shadow     = isGold ? 'rgba(234,179,8,0.45)' : 'rgba(245,158,11,0.45)';
    const icon       = isGold ? '🥇' : '⚡';
    const missionNum = isGold ? '9' : '8';
    const roiPct     = `+${((mission.extra_roi_bonus || 0) * 100).toFixed(0)}%`;
    const remaining  = mission.remainingMs || 0;
    const hours      = String(Math.floor(remaining / 3600000)).padStart(2, '0');
    const mins       = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');

    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner"
                data-mission="flash-${mission.id}"
                data-cta="open_flash_modal"
                data-flash-id="${mission.id}"
                style="
                    background: ${gradient};
                    border-radius: 16px; padding: 20px 24px; color: white;
                    position: relative; overflow: hidden; cursor: pointer;
                    box-shadow: 0 8px 25px -5px ${shadow};
                ">

                <!-- Flash badge -->
                <div style="background:rgba(255,255,255,0.18); display:inline-flex; align-items:center; gap:6px;
                    padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700;
                    letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">
                    ${icon} MISIÓN ${missionNum} · OFERTA FLASH
                </div>

                <!-- Urgent badge -->
                <div style="background:rgba(220,38,38,0.85); display:inline-block; padding:2px 10px;
                    border-radius:20px; font-size:0.6rem; font-weight:700; margin-left:6px;
                    letter-spacing:0.5px; margin-bottom:10px;">🔥 LIMITADO</div>

                <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">${mission.title || mission.piggy_label}</div>
                <div style="font-size:0.82rem; opacity:0.92;">Piggy exclusivo con <strong>${roiPct} en Margen Comercial</strong></div>

                <!-- Countdown -->
                <div style="background:rgba(0,0,0,0.2); border-radius:10px;
                    padding:8px 14px; margin-top:10px; display:inline-flex;
                    align-items:center; gap:8px;">
                    <span>⏳</span>
                    <div>
                        <div style="font-size:0.6rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Tiempo restante</div>
                        <div id="flash-banner-countdown-${mission.id}"
                            data-expires-ms="${remaining}"
                            style="font-size:1rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
                            ${hours}h ${mins}m
                        </div>
                    </div>
                </div>

                <div style="margin-top:14px;">
                    <span style="background:white; color:#b45309; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                        Ver Oferta ${icon}
                    </span>
                </div>

                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🐷</div>
            </div>
        </div>
    `;
}

/* ─── Cycle Mission Banner (M10) ─────────── */

/**
 * Render the banner for an active M10 cycle completion mission.
 * Clicking opens CycleMissionModal.
 * @param {Object} mission - Active cycle_completion_missions record
 */
function renderCycleMissionBanner(mission) {
    const typeThemes = {
        silver:  { gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#6d28d9', icon: '🌟' },
        gold:    { gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)', shadow: 'rgba(234,179,8,0.45)',  btnColor: '#92400e', icon: '🥇' },
        premium: { gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)', shadow: 'rgba(236,72,153,0.45)',  btnColor: '#9d174d', icon: '💎' },
        advanced: { gradient: 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #7E22CE 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#7E22CE', icon: '⚡' },
    };
    const t        = typeThemes[mission.piggy_type] || typeThemes.silver;
    const roiPct   = `+${((mission.extra_roi_bonus || 0) * 100).toFixed(0)}%`;
    const remaining = mission.remainingMs || 0;
    const hours    = String(Math.floor(remaining / 3600000)).padStart(2, '0');
    const mins     = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');

    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner"
                data-mission="cycle-${mission.id}"
                data-cta="open_cycle_modal"
                data-cycle-id="${mission.id}"
                style="
                    background: ${t.gradient};
                    border-radius: 16px; padding: 20px 24px; color: white;
                    position: relative; overflow: hidden; cursor: pointer;
                    box-shadow: 0 8px 25px -5px ${t.shadow};
                ">

                <div style="background:rgba(255,255,255,0.18); display:inline-flex; align-items:center; gap:6px;
                    padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700;
                    letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">
                    ${t.icon} CICLO COMPLETADO · RECOMPENSA EXCLUSIVA
                </div>

                <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">🎉 ¡Tu Piggy terminó su ciclo!</div>
                <div style="font-size:0.82rem; opacity:0.92;">Obtén un <strong>${mission.piggy_label}</strong> exclusivo con <strong>${roiPct} adicional</strong></div>

                <!-- Countdown -->
                <div style="background:rgba(0,0,0,0.2); border-radius:10px;
                    padding:8px 14px; margin-top:10px; display:inline-flex;
                    align-items:center; gap:8px;">
                    <span>⏳</span>
                    <div>
                        <div style="font-size:0.6rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Tiempo restante</div>
                        <div id="cycle-banner-countdown-${mission.id}"
                            data-expires-ms="${remaining}"
                            style="font-size:1rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
                            ${hours}h ${mins}m
                        </div>
                    </div>
                </div>

                <div style="margin-top:14px;">
                    <span style="background:white; color:${t.btnColor}; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                        Ver mi Recompensa ${t.icon}
                    </span>
                </div>

                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🐷</div>
            </div>
        </div>
    `;
}

/* ─── Event Listeners ─────────────────────── */

/**
 * Attach mission banner click handlers.
 * Handles: navigation routes, special CTAs (open_buy_piggy,
 * open_referidos, open_silver_modal).
 */
export function attachMissionListeners() {
    // Clean up previous countdown if any
    if (_bannerCountdownInterval) {
        clearInterval(_bannerCountdownInterval);
        _bannerCountdownInterval = null;
    }

    const missionBanner = document.getElementById('mission-banner');
    if (!missionBanner) return;

    // Start live countdown for M6 if within silver window
    const missionId  = missionBanner.dataset.mission;
    const silverExpiry = missionBanner.dataset.silverExpiry;
    if (missionId === 'm6' && silverExpiry) {
        _bannerCountdownInterval = setInterval(() => {
            const el = document.getElementById('m6-banner-countdown');
            if (!el) { clearInterval(_bannerCountdownInterval); return; }
            const remaining = formatRemainingTime(silverExpiry);
            if (!remaining) {
                el.textContent = '¡Oferta vencida!';
                clearInterval(_bannerCountdownInterval);
            } else {
                el.textContent = remaining;
            }
        }, 30000); // update every 30s
    }

    missionBanner.addEventListener('click', async () => {
        const ctaUrl   = missionBanner.dataset.cta;
        const mId      = missionBanner.dataset.mission;
        const sExpiry  = missionBanner.dataset.silverExpiry;
        const flashId  = missionBanner.dataset.flashId;
        const cycleId  = missionBanner.dataset.cycleId;

        // ── Flash Mission (M8/M9): open FlashMissionModal
        if (ctaUrl === 'open_flash_modal' && flashId) {
            // Retrieve the full mission object stored on the banner's parent (set in GranjaView)
            const flashData = window._activeFlashMissions?.find(m => m.id === flashId);
            if (flashData) showFlashMissionModal(flashData);
            return;
        }

        // ── Cycle Mission (M10): open CycleMissionModal
        if (ctaUrl === 'open_cycle_modal' && cycleId) {
            const cycleData = window._activeCycleMissions?.find(m => m.id === cycleId);
            if (cycleData) showCycleMissionModal(cycleData);
            return;
        }

        // ── Special CTA: open standard buy-piggy checkout
        if (ctaUrl === 'open_buy_piggy') {
            try {
                const items = await getMarketplaceItems();
                const standardPiggy = items.find(i => i.currentMonth === 1 && i.category === 'standard') || items[0];
                if (standardPiggy) showCheckoutModal(standardPiggy);
                else navigateTo('mercado');
            } catch {
                navigateTo('mercado');
            }
            return;
        }

        // ── Special CTA: open Silver Piggy modal
        if (ctaUrl === 'open_silver_modal' && sExpiry) {
            showSilverPiggyModal(sExpiry);
            return;
        }

        // ── Special CTA: open Referidos modal
        if (ctaUrl === 'open_referidos') {
            showReferralModal();
            return;
        }

        // ── Standard navigation route
        if (ctaUrl && ctaUrl.startsWith('#/')) {
            navigateTo(ctaUrl.replace('#/', ''));
            return;
        }
    });
}
