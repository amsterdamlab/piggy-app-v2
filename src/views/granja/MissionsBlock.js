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
import { triggerPWAInstall } from '../../services/pwaService.js';

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
        if (localStorage.getItem('piggy_hide_completed_missions_banner') === 'true') {
            return '';
        }

        return `
            <div class="section animate-fade-in-up" id="completed-missions-banner-section" style="animation-delay: 0.3s;">
                <div style="
                    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                    border: 1px solid #a7f3d0; border-radius: 14px;
                    padding: 12px 16px; display: flex; align-items: center; gap: 12px;
                    position: relative; overflow: hidden;
                ">
                    <img src="/piggy-favicon.svg" alt="Piggy" style="width: 36px; height: 36px; flex-shrink: 0; object-fit: contain;" />
                    <div style="flex: 1; padding-right: 20px; min-width: 0;">
                        <div style="font-weight:800; color:#065f46; font-size:0.92rem; line-height:1.2;">¡Felicitaciones!</div>
                        <div style="font-size:0.78rem; color:#047857; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;">Sigue creciendo tu granja Piggy.</div>
                    </div>
                    <button id="btn-close-completed-banner" onclick="
                        localStorage.setItem('piggy_hide_completed_missions_banner', 'true');
                        document.getElementById('completed-missions-banner-section')?.remove();
                    " style="
                        position: absolute; top: 10px; right: 12px; background: none; border: none;
                        color: #065f46; font-size: 1.2rem; font-weight: 700; cursor: pointer;
                        padding: 2px; line-height: 1; opacity: 0.7; transition: opacity 0.15s;
                    " onmouseover="this.style.opacity='1';" onmouseout="this.style.opacity='0.7';">&times;</button>
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
        case 'm8': return renderM8Banner(mission);
        case 'm9': return renderM9Banner(mission);
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
            <div class="banner banner--interactive" id="mission-banner" data-mission="m4" data-cta="install_pwa" style="
                background: linear-gradient(135deg, #b80049 0%, #880036 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(184,0,73,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">📱 MISIÓN 4</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Descarga Piggy en tu Celular</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Agrega el acceso directo en la pantalla de inicio de tu celular</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#b80049; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Descargar Piggy App 📱
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">📱</div>
            </div>
        </div>
    `;
}

function renderM5Banner(mission) {
    const withinWindow = mission.flashExpiry
        ? (Date.now() < new Date(mission.flashExpiry).getTime())
        : true;

    const remaining = mission.flashExpiry ? formatRemainingTime(mission.flashExpiry) : null;

    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m5" data-cta="open_buy_gold" style="
                background: linear-gradient(135deg, #f59e0b 0%, #ca8a04 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(245,158,11,0.45);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🏆 MISIÓN 5 - CRECE TU GRANJA</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Compra tu 2do Piggy (Dorado)</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Aprovecha esta oportunidad de tener en tu granja un piggy especial con extra de comisión. (Por tiempo limitado)</div>

                    ${withinWindow && remaining ? `
                        <div style="background:rgba(0,0,0,0.2); border-radius:10px; padding:6px 12px; margin-top:8px; display:inline-flex; align-items:center; gap:6px;">
                            <span>⏳</span>
                            <span style="font-size:0.85rem; font-weight:800; font-family:monospace;">${remaining}</span>
                        </div>
                    ` : ''}

                    <div style="margin-top:14px;">
                        <span style="background:white; color:#a16207; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Comprar Piggy Dorado 🏆
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🏆</div>
            </div>
        </div>
    `;
}

function renderM6Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m6" data-cta="#/perfil?subscreen=datos" style="
                background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(2,132,199,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">💳 MISIÓN 6</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Completa tus Datos</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Completa tus datos para enviarte tus comisiones al final de cada ciclo</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#0369a1; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Completar Mis Datos →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">💳</div>
            </div>
        </div>
    `;
}

function renderM7Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m7" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(5,150,105,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🏛️ MISIÓN 7</div>
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

function renderM8Banner(mission) {
    const withinWindow = mission.flashExpiry
        ? (Date.now() < new Date(mission.flashExpiry).getTime())
        : true;

    const remaining = mission.flashExpiry ? formatRemainingTime(mission.flashExpiry) : null;

    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m8" data-cta="open_buy_advanced30" style="
                background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(124,58,237,0.45);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">&#9889; MISIÓN 8 - SUBE TU NIVEL</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:2px;">Activa tu Piggy Avanzado</div>
                    <div style="font-size:0.95rem; font-weight:700; opacity:0.85; margin-bottom:4px;">(60 días de engorde)</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Esto no se ve todos los días. Obtén un piggy con 60 días de engorde avanzado. (Por tiempo limitado)</div>

                    ${withinWindow && remaining ? `
                        <div style="background:rgba(0,0,0,0.2); border-radius:10px; padding:6px 12px; margin-top:8px; display:inline-flex; align-items:center; gap:6px;">
                            <span>&#9203;</span>
                            <span style="font-size:0.85rem; font-weight:800; font-family:monospace;">${remaining}</span>
                        </div>
                    ` : ''}

                    <div style="margin-top:14px;">
                        <span style="background:white; color:#5b21b6; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Comprar Piggy Avanzado &#9889;
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">&#9889;</div>
            </div>
        </div>
    `;
}

function renderM9Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m9" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(16,185,129,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🤝 MISIÓN 9</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Refiere y logra una compra</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Obtén un bono de consumo extra en tu Wallet por tu primer referido efectivo</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#059669; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ver Mi Enlace de Referidos →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🤝</div>
            </div>
        </div>
    `;
}

function renderGenericBanner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="${mission.id}" data-cta="${mission.cta || ''}" style="
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(99,102,241,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🎯 ${mission.title}</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">${mission.title}</div>
                    <div style="font-size:0.82rem; opacity:0.9;">${mission.reward || ''}</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#4f46e5; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Continuar Misión →
                        </span>
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
 * Supports plus, dorado, premium, avanzado30..90.
 * @param {Object} mission - Active user_flash_missions record
 */
function renderFlashMissionBanner(mission) {
    const rawType = (mission.piggy_type || 'avanzado30').toLowerCase();
    const typeThemes = {
        plus:        { gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', shadow: 'rgba(14,165,233,0.45)', btnColor: '#0284c7', icon: '🌟', label: 'Plus' },
        silver:      { gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', shadow: 'rgba(14,165,233,0.45)', btnColor: '#0284c7', icon: '🌟', label: 'Plus' },
        dorado:      { gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)', shadow: 'rgba(234,179,8,0.45)',  btnColor: '#92400e', icon: '🥇', label: 'Dorado' },
        gold:        { gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)', shadow: 'rgba(234,179,8,0.45)',  btnColor: '#92400e', icon: '🥇', label: 'Dorado' },
        premium:     { gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)', shadow: 'rgba(236,72,153,0.45)',  btnColor: '#9d174d', icon: '💎', label: 'Premium' },
        avanzado30:  { gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#6B21A8', icon: '⚡', label: 'Avanzado (30d)' },
        advanced30:  { gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#6B21A8', icon: '⚡', label: 'Avanzado (30d)' },
        avanzado45:  { gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#6B21A8', icon: '⚡', label: 'Avanzado (45d)' },
        advanced45:  { gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#6B21A8', icon: '⚡', label: 'Avanzado (45d)' },
        avanzado60:  { gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)', shadow: 'rgba(147,51,234,0.45)', btnColor: '#4C1D95', icon: '🚀', label: 'Avanzado (60d)' },
        advanced60:  { gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)', shadow: 'rgba(147,51,234,0.45)', btnColor: '#4C1D95', icon: '🚀', label: 'Avanzado (60d)' },
        avanzado75:  { gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)', shadow: 'rgba(147,51,234,0.45)', btnColor: '#4C1D95', icon: '🚀', label: 'Avanzado (75d)' },
        advanced75:  { gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)', shadow: 'rgba(147,51,234,0.45)', btnColor: '#4C1D95', icon: '🚀', label: 'Avanzado (75d)' },
        avanzado90:  { gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)', shadow: 'rgba(147,51,234,0.45)', btnColor: '#4C1D95', icon: '⚡', label: 'Avanzado (90d)' },
        advanced90:  { gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)', shadow: 'rgba(147,51,234,0.45)', btnColor: '#4C1D95', icon: '⚡', label: 'Avanzado (90d)' },
    };
    const t = typeThemes[rawType] || typeThemes.avanzado30;
    if (mission.icon) t.icon = mission.icon;
    const missionTitle = mission.title || mission.mission_title || 'MISIÓN FLASH';
    const badgeText = (mission.badge && mission.badge.trim() !== '')
        ? mission.badge
        : `${t.icon} ${mission.mission_title || 'MISIÓN FLASH'} · OFERTA LIMITADA`;
    
    let defaultBenefitText = '';
    if (rawType.includes('30')) {
        defaultBenefitText = 'Piggy acelerado con <strong>30 días ahorrados</strong> (Inicia en 2do Mes)';
    } else if (rawType.includes('45')) {
        defaultBenefitText = 'Piggy acelerado con <strong>45 días ahorrados</strong> (Inicia en 45 días)';
    } else if (rawType.includes('60')) {
        defaultBenefitText = 'Piggy cuántico con <strong>60 días ahorrados</strong> (Inicia en 3er Mes)';
    } else if (rawType.includes('75')) {
        defaultBenefitText = 'Piggy cuántico con <strong>75 días ahorrados</strong> (69 días restantes)';
    } else if (rawType.includes('90')) {
        defaultBenefitText = 'Piggy cuántico con <strong>90 días ahorrados</strong> (54 días restantes)';
    } else if (rawType === 'dorado' || rawType === 'gold') {
        defaultBenefitText = `Piggy exclusivo <strong>Dorado</strong> con <strong>+2% en Margen Comercial</strong>`;
    } else if (rawType === 'premium') {
        defaultBenefitText = `Piggy exclusivo <strong>Premium</strong> con <strong>+3% en Margen Comercial</strong>`;
    } else {
        defaultBenefitText = `Piggy exclusivo <strong>${t.label}</strong> con <strong>+1% en Margen Comercial</strong>`;
    }

    const benefitText = (mission.description && mission.description.trim() !== '') ? mission.description : defaultBenefitText;

    const remaining = mission.remainingMs || 0;
    const hours     = String(Math.floor(remaining / 3600000)).padStart(2, '0');
    const mins      = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
    const secs      = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner"
                data-mission="flash-${mission.id}"
                data-cta="open_flash_modal"
                data-flash-id="${mission.id}"
                style="
                    background: ${t.gradient};
                    border-radius: 16px; padding: 20px 24px; color: white;
                    position: relative; overflow: hidden; cursor: pointer;
                    box-shadow: 0 8px 25px -5px ${t.shadow};
                ">

                <!-- Flash badge -->
                <div style="background:rgba(255,255,255,0.18); display:inline-flex; align-items:center; gap:6px;
                    padding:3px 12px; border-radius:20px; font-size:0.65rem; font-weight:700;
                    letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">
                    ${badgeText}
                </div>

                <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">${mission.title || '¡Oferta Especial de Granja!'}</div>
                <div style="font-size:0.82rem; opacity:0.92;">${benefitText}</div>

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
                            ${hours}h ${mins}m ${secs}s
                        </div>
                    </div>
                </div>

                <div style="margin-top:14px;">
                    <span style="background:white; color:${t.btnColor}; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                        Ver Oferta ${t.icon}
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
    const rawType = (mission.piggy_type || 'plus').toLowerCase();
    const typeThemes = {
        plus:     { gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', shadow: 'rgba(14,165,233,0.45)', btnColor: '#0284c7', icon: '🌟' },
        silver:   { gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', shadow: 'rgba(14,165,233,0.45)', btnColor: '#0284c7', icon: '🌟' },
        dorado:   { gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)', shadow: 'rgba(234,179,8,0.45)',  btnColor: '#92400e', icon: '🥇' },
        gold:     { gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)', shadow: 'rgba(234,179,8,0.45)',  btnColor: '#92400e', icon: '🥇' },
        premium:  { gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)', shadow: 'rgba(236,72,153,0.45)',  btnColor: '#9d174d', icon: '💎' },
        avanzado: { gradient: 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #7E22CE 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#7E22CE', icon: '⚡' },
        advanced: { gradient: 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #7E22CE 100%)', shadow: 'rgba(139,92,246,0.45)', btnColor: '#7E22CE', icon: '⚡' },
    };
    const t        = typeThemes[rawType] || typeThemes.plus;
    const roiPct   = `+${((mission.extra_roi_bonus || 0) * 100).toFixed(0)}%`;
    const remaining = mission.remainingMs || 0;
    const hours    = String(Math.floor(remaining / 3600000)).padStart(2, '0');
    const mins     = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
    const secs     = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

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
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="background:white; border-radius:50%; padding:2px;"><polyline points="20 6 9 17 4 12"/></svg>
                    CICLO COMPLETADO
                </div>

                <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">¡Oferta Exclusiva!</div>
                <div style="font-size:0.82rem; opacity:0.92;">Obtén un <strong>${mission.piggy_label}</strong> con <strong>${roiPct} adicional de beneficio por canal de venta</strong>.</div>

                <!-- Countdown -->
                <div style="background:rgba(0,0,0,0.2); border-radius:10px;
                    padding:8px 14px; margin-top:10px; display:inline-flex;
                    align-items:center; gap:8px;">
                    <div>
                        <div style="font-size:0.6rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Tiempo restante</div>
                        <div id="cycle-banner-countdown-${mission.id}"
                            data-expires-ms="${remaining}"
                            style="font-size:1rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
                            ${hours}h ${mins}m ${secs}s
                        </div>
                    </div>
                </div>

                <div style="margin-top:14px;">
                    <span style="background:white; color:${t.btnColor}; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                        Ver Oferta
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

    // Start live countdown for Flash Mission if present
    const flashCountdownEl = document.querySelector('[id^="flash-banner-countdown-"]');
    if (flashCountdownEl) {
        let remMs = parseInt(flashCountdownEl.dataset.expiresMs, 10) || 0;
        _bannerCountdownInterval = setInterval(() => {
            remMs = Math.max(0, remMs - 1000);
            if (remMs <= 0) {
                flashCountdownEl.textContent = '¡Oferta vencida!';
                clearInterval(_bannerCountdownInterval);
                return;
            }
            const h = String(Math.floor(remMs / 3600000)).padStart(2, '0');
            const m = String(Math.floor((remMs % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((remMs % 60000) / 1000)).padStart(2, '0');
            flashCountdownEl.textContent = `${h}h ${m}m ${s}s`;
        }, 1000);
    }

    // Start live countdown for Cycle Mission if present
    const cycleCountdownEl = document.querySelector('[id^="cycle-banner-countdown-"]');
    if (cycleCountdownEl) {
        let remMs = parseInt(cycleCountdownEl.dataset.expiresMs, 10) || 0;
        _bannerCountdownInterval = setInterval(() => {
            remMs = Math.max(0, remMs - 1000);
            if (remMs <= 0) {
                cycleCountdownEl.textContent = '¡Oferta vencida!';
                clearInterval(_bannerCountdownInterval);
                return;
            }
            const h = String(Math.floor(remMs / 3600000)).padStart(2, '0');
            const m = String(Math.floor((remMs % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((remMs % 60000) / 1000)).padStart(2, '0');
            cycleCountdownEl.textContent = `${h}h ${m}m ${s}s`;
        }, 1000);
    }

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

        // ── Special CTA: open Piggy Dorado checkout modal for M5
        if (ctaUrl === 'open_buy_gold') {
            try {
                const items = await getMarketplaceItems();
                const goldPiggy = items.find(i => i.category === 'dorado' || i.category === 'gold' || i.item_name?.toLowerCase().includes('dorado') || i.item_name?.toLowerCase().includes('gold')) || items[0];
                if (goldPiggy) showCheckoutModal(goldPiggy);
                else navigateTo('mercado');
            } catch (err) {
                console.warn('Error launching dorado checkout:', err);
                navigateTo('mercado');
            }
            return;
        }

        // ── Special CTA: open Piggy Avanzado (60 días) checkout modal for M8
        if (ctaUrl === 'open_buy_advanced30') {
            try {
                const items = await getMarketplaceItems();
                const baseItem = items.find(i =>
                    i.category === 'avanzado60' ||
                    i.category === 'advanced60' ||
                    i.category === 'avanzado30' ||
                    i.category === 'advanced30' ||
                    i.category === 'avanzado' ||
                    i.category === 'advanced' ||
                    i.item_name?.toLowerCase().includes('avanzado') ||
                    i.item_name?.toLowerCase().includes('advanced')
                ) || items[0];

                if (baseItem) {
                    // Item independiente exclusivo para la Misión 8 ($1.300.000 / 60 días engorde)
                    const missionItem = {
                        ...baseItem,
                        item_name: 'Piggy Avanzado (60 días)',
                        category: 'avanzado60',
                        price: 1300000,
                        priceFormatted: '$1.300.000',
                        daysAdvanced: 60,
                        daysRemaining: 84,
                        currentMonth: 3,
                        current_month: 3,
                    };
                    showCheckoutModal(missionItem);
                } else {
                    navigateTo('mercado');
                }
            } catch (err) {
                console.warn('Error launching avanzado checkout:', err);
                navigateTo('mercado');
            }
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

        // ── Special CTA: install PWA / add to home screen
        if (ctaUrl === 'install_pwa') {
            triggerPWAInstall();
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
