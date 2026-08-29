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
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(139,92,246,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">📲 MISIÓN 3</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Invita a un amigo a Piggy</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Comparte tu código de referido y gana bonos de consumo</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#7c3aed; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Invitar Amigos →
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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(16,185,129,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">📱 MISIÓN 4</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Descarga Piggy en tu Celular</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Crea el acceso directo en tu pantalla de inicio</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#059669; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Descargar App →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">📱</div>
            </div>
        </div>
    `;
}

function renderM5Banner(mission) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="mission-banner" data-mission="m5" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #f59e0b 0%, #ca8a04 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(245,158,11,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🏆 MISIÓN 5</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Compra tu 2do Piggy (Dorado)</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Aprovecha esta oportunidad exclusiva con comisión extra</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#ca8a04; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ver Piggy Dorado →
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
            <div class="banner banner--interactive" id="mission-banner" data-mission="m6" data-cta="${mission.cta}" style="
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(14,165,233,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">💳 MISIÓN 6</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Añade tus Datos Bancarios</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Para recibir tus ganancias directamente en tu cuenta</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#0284c7; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Completar Datos →
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
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(99,102,241,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🤝 MISIÓN 7</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Conoce a Nuestros Aliados</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Descubre los aliados donde puedes redimir tus ganancias</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#4f46e5; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ver Aliados →
                        </span>
                    </div>
                </div>
                <div style="position:absolute; bottom:-15px; right:-5px; font-size:70px; opacity:0.12; transform:rotate(-15deg);">🤝</div>
            </div>
        </div>
    `;
}

function renderM8Banner(mission) {
    return renderM5Banner(mission);
}

function renderM9Banner(mission) {
    return renderM7Banner(mission);
}

function renderGenericBanner(mission) {
    return renderM1Banner(mission);
}

function renderFlashMissionBanner(fm) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="flash-mission-banner" style="
                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(124,58,237,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">⚡ OFERTA FLASH EXCLUSIVA</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">${fm.title || 'Piggy Flash Personalizado'}</div>
                    <div style="font-size:0.82rem; opacity:0.9;">${fm.description || 'Aprovecha esta oferta por tiempo limitado'}</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#6d28d9; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ver Oferta Flash →
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCycleMissionBanner(cm) {
    return `
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="banner banner--interactive" id="cycle-mission-banner" style="
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                border-radius: 16px; padding: 20px 24px; color: white;
                position: relative; overflow: hidden; cursor: pointer;
                box-shadow: 0 8px 25px -5px rgba(16,185,129,0.4);
            ">
                <div style="position:relative; z-index:2;">
                    <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:3px 12px;
                        border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1px;
                        text-transform:uppercase; margin-bottom:10px;">🎉 CICLO COMPLETADO</div>
                    <div style="font-size:1.15rem; font-weight:800; margin-bottom:4px;">Tu Piggy finalizó su etapa</div>
                    <div style="font-size:0.82rem; opacity:0.9;">Saldo acreditado en tu Cuenta Agro</div>
                    <div style="margin-top:14px;">
                        <span style="background:white; color:#059669; padding:8px 20px; border-radius:10px; font-weight:700; font-size:0.85rem; display:inline-block;">
                            Ver Liquidación →
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach listeners for mission banners.
 */
export function attachMissionListeners() {
    document.getElementById('mission-banner')?.addEventListener('click', (e) => {
        const banner = e.currentTarget;
        const cta = banner.dataset.cta;
        const mission = banner.dataset.mission;

        if (mission === 'm3' || cta === 'open_referidos') {
            showReferralModal();
            return;
        }

        if (mission === 'm4' || cta === 'install_pwa') {
            triggerPWAInstall();
            return;
        }

        if (cta && cta.startsWith('#/')) {
            navigateTo(cta.replace('#/', ''));
        }
    });

    document.getElementById('flash-mission-banner')?.addEventListener('click', () => {
        const fm = (window._activeFlashMissions || [])[0];
        if (fm) showFlashMissionModal(fm);
    });

    document.getElementById('cycle-mission-banner')?.addEventListener('click', () => {
        const cm = (window._activeCycleMissions || [])[0];
        if (cm) showCycleMissionModal(cm);
    });
}
