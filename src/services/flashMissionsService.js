/* ============================================
   PIGGY APP — Flash Missions Engine Service
   Manages dynamic countdowns, notifications, and
   unlocks for limited-time flash missions.
   ============================================ */

import { AppState } from '../state.js';
import { formatCOP } from './mockData.js';
import { addWalletBalance } from './walletService.js';

const STORAGE_KEY_ACTIVE = 'piggy_flash_mission_active';
const STORAGE_KEY_LAST_TRIGGER = 'piggy_flash_last_trigger';
const STORAGE_KEY_COMPLETED = 'piggy_flash_completed_ids';

/** Available Flash Missions Catalogue */
export const FLASH_MISSIONS_CATALOGUE = [
    {
        id: 'flash_recarga_express',
        title: '⚡ Recarga Express (24 Horas)',
        badge: 'OFERTA FLASH',
        description: 'Recarga tu Wallet con $50.000 o más en las próximas 24 horas y recibe un 5% de bono directo en saldo.',
        reward_text: '+5% Saldo Adicional en tu Wallet',
        reward_type: 'wallet_bonus_percent',
        reward_value: 0.05,
        target_action: 'recharge',
        target_amount: 50000,
        duration_hours: 24,
        icon: '⚡',
        accent_color: '#f59e0b',
        bg_gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border_color: '#f59e0b',
        cta_text: 'Recargar Cuenta Ahora',
        cta_route: '#/granja?open_wallet=true',
    },
    {
        id: 'flash_compra_doble',
        title: '🐷 Doble Margen en tu Próximo Piggy',
        badge: 'TIEMPO LIMITADO',
        description: 'Adquiere cualquier Piggy del Mercado en las próximas 48 horas y obtén +1% adicional de retorno comercial.',
        reward_text: '+1% Margen Comercial Extra',
        reward_type: 'piggy_roi_bonus',
        reward_value: 0.01,
        target_action: 'buy_piggy',
        target_amount: 1,
        duration_hours: 48,
        icon: '🔥',
        accent_color: '#ec4899',
        bg_gradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
        border_color: '#ec4899',
        cta_text: 'Ir al Mercado',
        cta_route: '#/mercado',
    },
    {
        id: 'flash_combo_gourmet',
        title: '🥩 Combo Asado con Domicilio Gratis',
        badge: 'SUPER DESCUENTO',
        description: 'Pide el Combo Parrillero o Familiar en Piggy Gourmet hoy y llévate envío prioritario gratis a Cali.',
        reward_text: 'Envío Gratis + 10% Descuento Adicional',
        reward_type: 'gourmet_discount',
        reward_value: 15000,
        target_action: 'buy_gourmet',
        target_amount: 1,
        duration_hours: 36,
        icon: '🥩',
        accent_color: '#10b981',
        bg_gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        border_color: '#10b981',
        cta_text: 'Ver Cortes en Piggy Gourmet',
        cta_route: '#/tienda',
    },
    {
        id: 'flash_referido_oro',
        title: '📲 Doble Recompensa por Referido',
        badge: 'ESPECIAL FIN DE SEMANA',
        description: 'Invita a un amigo que active su primer Piggy y recibe $40.000 (en vez de $20.000) directo en tu Wallet.',
        reward_text: '$40.000 COP en tu Wallet por Referido',
        reward_type: 'referral_bonus_double',
        reward_value: 40000,
        target_action: 'refer_friend',
        target_amount: 1,
        duration_hours: 48,
        icon: '🎁',
        accent_color: '#8b5cf6',
        bg_gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        border_color: '#8b5cf6',
        cta_text: 'Compartir mi Enlace',
        cta_route: '#/granja?open_referrals=true',
    }
];

let tickerInterval = null;

/**
 * Initialize the Flash Missions Ticker
 * Runs every 60s to check expiration and launch new offers dynamically.
 */
export function initFlashMissionsTicker() {
    if (tickerInterval) clearInterval(tickerInterval);

    // Initial check
    checkAndMaintainActiveMission();

    // Set recurring timer
    tickerInterval = setInterval(() => {
        checkAndMaintainActiveMission();
    }, 60 * 1000);
}

/**
 * Check if there is an active flash mission, check its expiry, or activate a new one.
 */
export function checkAndMaintainActiveMission() {
    const active = getActiveFlashMission();

    if (active) {
        const now = Date.now();
        if (now >= active.expires_at) {
            // Mission expired! Mark as inactive
            localStorage.removeItem(STORAGE_KEY_ACTIVE);
            console.log('⏰ Misión Flash expirada:', active.title);
            notifyFlashStateChange();
        }
        return active;
    }

    // No active mission: check if we should trigger one
    const lastTrigger = Number(localStorage.getItem(STORAGE_KEY_LAST_TRIGGER)) || 0;
    const now = Date.now();
    const hoursSinceLast = (now - lastTrigger) / (1000 * 60 * 60);

    // Trigger a new mission if > 6 hours have passed since last one
    if (hoursSinceLast >= 6 || lastTrigger === 0) {
        return triggerNewRandomFlashMission();
    }

    return null;
}

/**
 * Trigger a new random flash mission from catalogue
 */
export function triggerNewRandomFlashMission() {
    const completedIds = getCompletedFlashMissionIds();
    const available = FLASH_MISSIONS_CATALOGUE.filter(m => !completedIds.includes(m.id));

    const pool = available.length > 0 ? available : FLASH_MISSIONS_CATALOGUE;
    const selected = pool[Math.floor(Math.random() * pool.length)];

    const now = Date.now();
    const expiresAt = now + (selected.duration_hours * 60 * 60 * 1000);

    const activeRecord = {
        ...selected,
        started_at: now,
        expires_at: expiresAt,
        progress: 0,
        is_completed: false,
    };

    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeRecord));
    localStorage.setItem(STORAGE_KEY_LAST_TRIGGER, String(now));

    console.log('🔥 Nueva Misión Flash Activada:', selected.title, `(Duración: ${selected.duration_hours}h)`);
    notifyFlashStateChange();

    return activeRecord;
}

/**
 * Get the currently active flash mission, or null if none/expired.
 */
export function getActiveFlashMission() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
        if (!raw) return null;
        const record = JSON.parse(raw);
        if (Date.now() >= record.expires_at) {
            localStorage.removeItem(STORAGE_KEY_ACTIVE);
            return null;
        }
        return record;
    } catch {
        return null;
    }
}

/**
 * Get completed flash mission IDs
 */
function getCompletedFlashMissionIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_COMPLETED);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Format remaining time string: "23h 45m" or "45m 12s"
 */
export function formatFlashCountdown(expiresAt) {
    const diff = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Notify DOM components of flash state change
 */
function notifyFlashStateChange() {
    window.dispatchEvent(new CustomEvent('piggy:flash_mission_changed'));
}

/**
 * Complete an active flash mission if criteria met
 */
export async function tryCompleteFlashMission(actionType, actionValue = 1) {
    const active = getActiveFlashMission();
    if (!active || active.is_completed) return false;

    if (active.target_action === actionType) {
        active.is_completed = true;
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(active));

        // Save to completed history
        const completedIds = getCompletedFlashMissionIds();
        if (!completedIds.includes(active.id)) {
            completedIds.push(active.id);
            localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(completedIds));
        }

        // Apply instant reward if wallet bonus
        if (active.reward_type === 'wallet_bonus_percent' && actionValue > 0) {
            const bonusAmount = Math.round(actionValue * active.reward_value);
            if (bonusAmount > 0) {
                await addWalletBalance(bonusAmount, `Bono Misión Flash: ${active.title}`);
            }
        }

        notifyFlashStateChange();
        showFlashCompletionCelebration(active);
        return true;
    }

    return false;
}

/**
 * Show a full celebration modal when user completes a Flash Mission
 */
export function showFlashCompletionCelebration(mission) {
    const existing = document.getElementById('flash-celebration-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'flash-celebration-modal';
    modal.className = 'animate-scale-in';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(15, 23, 42, 0.75)';
    modal.style.backdropFilter = 'blur(6px)';
    modal.style.zIndex = '99999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '16px';

    modal.innerHTML = `
        <div style="background: white; border-radius: 24px; padding: 28px 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);">
            <div style="font-size: 3rem; margin-bottom: 8px; animation: bounce 1s infinite alternate;">🎉⚡</div>
            <h2 style="font-size: 1.4rem; font-weight: 850; color: #0f172a; margin: 0 0 6px 0;">¡Misión Flash Completada!</h2>
            <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 16px 0;">${mission.title}</p>
            
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 16px; padding: 14px; margin-bottom: 20px;">
                <div style="font-size: 0.8rem; color: #166534; font-weight: 700; text-transform: uppercase;">Recompensa Desbloqueada</div>
                <div style="font-size: 1.1rem; font-weight: 850; color: #15803d; margin-top: 4px;">${mission.reward_text}</div>
            </div>

            <button id="btn-close-flash-celebration" style="
                width: 100%;
                background: linear-gradient(135deg, #ec4899, #db2777);
                color: white;
                border: none;
                padding: 14px;
                border-radius: 14px;
                font-size: 1rem;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(236, 72, 153, 0.4);
            ">
                ¡Genial, gracias!
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-close-flash-celebration')?.addEventListener('click', () => {
        modal.remove();
    });
}
