/* ============================================
   PIGGY APP — Flash Mission Modal (M8 / M9)
   Shows a time-limited 72h exclusive piggy
   offer (Advanced or Gold), activated per user
   manually from Supabase.
   ============================================ */

import { navigateTo } from '../../router.js';
import { getWalletBalance } from '../../services/walletService.js';
import { formatCOP } from '../../services/mockData.js';
import { deductWalletBalance } from '../../services/walletService.js';
import { buyFlashMission, deactivateFlashMission } from '../../services/flashMissionsService.js';
import { openWalletDrawer } from './WalletBlock.js';

/** Active countdown interval — cleaned up on modal close */
let _flashCountdownInterval = null;

/**
 * Format remaining milliseconds as "XXh XXm".
 * @param {number} remainingMs
 * @returns {string}
 */
function formatCountdown(remainingMs) {
    if (remainingMs <= 0) return '00h 00m 00s';
    const hours   = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Get gradient colors and icons based on piggy type.
 */
function getTypeTheme(piggyType) {
    const raw = (piggyType || 'avanzado30').toLowerCase();
    const themes = {
        plus: {
            gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            shadow:   'rgba(14,165,233,0.45)',
            color:    '#0284c7',
            btnGrad:  'linear-gradient(135deg, #0ea5e9, #0284c7)',
            btnShadow:'rgba(14,165,233,0.3)',
            icon:     '🌟',
            badge:    '🌟 OFERTA FLASH · PLUS',
            bonusIcon:'⭐',
        },
        silver: {
            gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            shadow:   'rgba(14,165,233,0.45)',
            color:    '#0284c7',
            btnGrad:  'linear-gradient(135deg, #0ea5e9, #0284c7)',
            btnShadow:'rgba(14,165,233,0.3)',
            icon:     '🌟',
            badge:    '🌟 OFERTA FLASH · PLUS',
            bonusIcon:'⭐',
        },
        dorado: {
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)',
            shadow:   'rgba(234,179,8,0.5)',
            color:    '#ca8a04',
            btnGrad:  'linear-gradient(135deg, #eab308, #ca8a04)',
            btnShadow:'rgba(234,179,8,0.4)',
            icon:     '🥇',
            badge:    '🥇 OFERTA FLASH · DORADO',
            bonusIcon:'🏆',
        },
        gold: {
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)',
            shadow:   'rgba(234,179,8,0.5)',
            color:    '#ca8a04',
            btnGrad:  'linear-gradient(135deg, #eab308, #ca8a04)',
            btnShadow:'rgba(234,179,8,0.4)',
            icon:     '🥇',
            badge:    '🥇 OFERTA FLASH · DORADO',
            bonusIcon:'🏆',
        },
        premium: {
            gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)',
            shadow:   'rgba(236,72,153,0.45)',
            color:    '#db2777',
            btnGrad:  'linear-gradient(135deg, #ec4899, #db2777)',
            btnShadow:'rgba(236,72,153,0.3)',
            icon:     '💎',
            badge:    '💎 OFERTA FLASH · PREMIUM',
            bonusIcon:'💎',
        },
        avanzado30: {
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)',
            shadow:   'rgba(139,92,246,0.45)',
            color:    '#6B21A8',
            btnGrad:  'linear-gradient(135deg, #8B5CF6, #7E22CE)',
            btnShadow:'rgba(139,92,246,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 30D',
            bonusIcon:'📈',
        },
        advanced30: {
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)',
            shadow:   'rgba(139,92,246,0.45)',
            color:    '#6B21A8',
            btnGrad:  'linear-gradient(135deg, #8B5CF6, #7E22CE)',
            btnShadow:'rgba(139,92,246,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 30D',
            bonusIcon:'📈',
        },
        avanzado45: {
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)',
            shadow:   'rgba(139,92,246,0.45)',
            color:    '#6B21A8',
            btnGrad:  'linear-gradient(135deg, #8B5CF6, #7E22CE)',
            btnShadow:'rgba(139,92,246,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 45D',
            bonusIcon:'📈',
        },
        advanced45: {
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7E22CE 50%, #6B21A8 100%)',
            shadow:   'rgba(139,92,246,0.45)',
            color:    '#6B21A8',
            btnGrad:  'linear-gradient(135deg, #8B5CF6, #7E22CE)',
            btnShadow:'rgba(139,92,246,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 45D',
            bonusIcon:'📈',
        },
        avanzado60: {
            gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)',
            shadow:   'rgba(147,51,234,0.45)',
            color:    '#4C1D95',
            btnGrad:  'linear-gradient(135deg, #9333EA, #6D28D9)',
            btnShadow:'rgba(147,51,234,0.3)',
            icon:     '🚀',
            badge:    '🚀 OFERTA FLASH · AVANZADO 60D',
            bonusIcon:'🚀',
        },
        advanced60: {
            gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)',
            shadow:   'rgba(147,51,234,0.45)',
            color:    '#4C1D95',
            btnGrad:  'linear-gradient(135deg, #9333EA, #6D28D9)',
            btnShadow:'rgba(147,51,234,0.3)',
            icon:     '🚀',
            badge:    '🚀 OFERTA FLASH · AVANZADO 60D',
            bonusIcon:'🚀',
        },
        avanzado75: {
            gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)',
            shadow:   'rgba(147,51,234,0.45)',
            color:    '#4C1D95',
            btnGrad:  'linear-gradient(135deg, #9333EA, #6D28D9)',
            btnShadow:'rgba(147,51,234,0.3)',
            icon:     '🚀',
            badge:    '🚀 OFERTA FLASH · AVANZADO 75D',
            bonusIcon:'🚀',
        },
        advanced75: {
            gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)',
            shadow:   'rgba(147,51,234,0.45)',
            color:    '#4C1D95',
            btnGrad:  'linear-gradient(135deg, #9333EA, #6D28D9)',
            btnShadow:'rgba(147,51,234,0.3)',
            icon:     '🚀',
            badge:    '🚀 OFERTA FLASH · AVANZADO 75D',
            bonusIcon:'🚀',
        },
        avanzado90: {
            gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)',
            shadow:   'rgba(147,51,234,0.45)',
            color:    '#4C1D95',
            btnGrad:  'linear-gradient(135deg, #9333EA, #6D28D9)',
            btnShadow:'rgba(147,51,234,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 90D',
            bonusIcon:'⚡',
        },
        advanced90: {
            gradient: 'linear-gradient(135deg, #9333EA 0%, #6D28D9 50%, #4C1D95 100%)',
            shadow:   'rgba(147,51,234,0.45)',
            color:    '#4C1D95',
            btnGrad:  'linear-gradient(135deg, #9333EA, #6D28D9)',
            btnShadow:'rgba(147,51,234,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 90D',
            bonusIcon:'⚡',
        },
    };
    return themes[raw] || themes['avanzado30'];
}

/**
 * Show the Flash Mission purchase modal (M8 or M9).
 * @param {Object} mission - Active flash mission record with expiresAt, remainingMs, etc.
 */
export function showFlashMissionModal(mission) {
    // Remove existing modal if any
    const existing = document.getElementById('flash-mission-modal');
    if (existing) existing.remove();
    if (_flashCountdownInterval) { clearInterval(_flashCountdownInterval); _flashCountdownInterval = null; }

    if (!mission) return;

    const theme = getTypeTheme(mission.piggy_type);
    if (mission.icon) {
        theme.icon = mission.icon;
    }
    if (mission.badge) {
        theme.badge = mission.badge;
    } else if (mission.mission_title) {
        theme.badge = `${theme.icon} ${mission.mission_title}`;
    }

    const expiresAtMs = mission.scheduled_at
        ? new Date(mission.scheduled_at).getTime()
        : (Date.now() + (mission.remainingMs || 0));
    let remaining = Math.max(0, expiresAtMs - Date.now());
    let currentBalance = 0;

    const defaultPrice = (mission.piggy_type === 'advanced60' || mission.piggy_type === 'advanced30') ? 1300000 : 1000000;
    const price        = mission.price || defaultPrice;
    const priceStr     = formatCOP(price);

    const piggyLabels = {
        silver:     'Piggy Silver',
        gold:       'Piggy Gold',
        dorado:     'Piggy Dorado',
        premium:    'Piggy Premium',
        plus:       'Piggy Plus',
        advanced30: 'Piggy Advanced (30d)',
        avanzado30: 'Piggy Avanzado (30d)',
        advanced45: 'Piggy Advanced (45d)',
        avanzado45: 'Piggy Avanzado (45d)',
        advanced60: 'Piggy Advanced (60d)',
        avanzado60: 'Piggy Avanzado (60d)',
        advanced75: 'Piggy Advanced (75d)',
        avanzado75: 'Piggy Avanzado (75d)',
        advanced90: 'Piggy Advanced (90d)',
        avanzado90: 'Piggy Avanzado (90d)',
    };
    const rawType = (mission.piggy_type || 'avanzado30').toLowerCase();
    const piggyLabel = (mission.piggy_label && mission.piggy_label.trim() !== '')
        ? mission.piggy_label.trim()
        : (mission.title && !mission.title.toLowerCase().includes('misión') && !mission.title.toLowerCase().includes('acelera') ? mission.title : (piggyLabels[rawType] || 'Piggy Flash'));

    // DB Texts or smart fallbacks
    let defaultBenefitTitle = '';
    let defaultBenefitSub   = '';
    let defaultDescription  = '';

    if (rawType.includes('30')) {
        defaultBenefitTitle = 'Reducción de 30 días de espera';
        defaultBenefitSub   = 'Inicia tu cerdito en el 2do mes ahorrando tiempo.';
        defaultDescription  = 'Piggy acelerado con 30 días de crecimiento incluidos.';
    } else if (rawType.includes('45')) {
        defaultBenefitTitle = 'Reducción de 45 días de espera';
        defaultBenefitSub   = 'Inicia tu cerdito en el día 45 ahorrando tiempo.';
        defaultDescription  = 'Piggy acelerado con 45 días de crecimiento incluidos.';
    } else if (rawType.includes('60')) {
        defaultBenefitTitle = 'Reducción de 60 días de espera';
        defaultBenefitSub   = 'Inicia tu cerdito en el 3er mes ahorrando tiempo.';
        defaultDescription  = 'Piggy acelerado con 60 días de crecimiento incluidos.';
    } else if (rawType.includes('75')) {
        defaultBenefitTitle = 'Reducción de 75 días de espera';
        defaultBenefitSub   = 'Inicia tu cerdito ahorrando 75 días de tiempo.';
        defaultDescription  = 'Piggy cuántico con 75 días de crecimiento incluidos.';
    } else if (rawType.includes('90')) {
        defaultBenefitTitle = 'Reducción de 90 días de espera';
        defaultBenefitSub   = 'Inicia tu cerdito ahorrando 90 días de tiempo.';
        defaultDescription  = 'Piggy cuántico con 90 días de crecimiento incluidos.';
    } else if (rawType === 'dorado' || rawType === 'gold') {
        defaultBenefitTitle = '+2% en Margen Comercial';
        defaultBenefitSub   = '+2% adicional sobre tu ROI base de granja.';
        defaultDescription  = 'Piggy exclusivo Dorado con +2% adicional en tu Margen Comercial.';
    } else if (rawType === 'premium') {
        defaultBenefitTitle = '+3% en Margen Comercial';
        defaultBenefitSub   = '+3% adicional sobre tu ROI base de granja.';
        defaultDescription  = 'Piggy exclusivo Premium con +3% adicional en tu Margen Comercial.';
    } else {
        defaultBenefitTitle = '+1% en Margen Comercial';
        defaultBenefitSub   = '+1% adicional sobre tu ROI base de granja.';
        defaultDescription  = 'Piggy exclusivo Plus con +1% adicional en tu Margen Comercial.';
    }

    const benefitTitle    = (mission.benefit_title && mission.benefit_title.trim() !== '') ? mission.benefit_title : defaultBenefitTitle;
    const benefitSub      = (mission.benefit_description && mission.benefit_description.trim() !== '') ? mission.benefit_description : (mission.benefit_sub || defaultBenefitSub);
    const descriptionText = (mission.description && mission.description.trim() !== '') ? mission.description : defaultDescription;

    const suggestedNames = {
        advanced30: ['Rayo', 'Thunder', 'Bolt', 'Flash', 'Nova', 'Turbo', 'Storm', 'Ace'],
        advanced45: ['Rayo', 'Thunder', 'Bolt', 'Flash', 'Nova', 'Turbo', 'Storm', 'Ace'],
        advanced60: ['Rayo', 'Thunder', 'Bolt', 'Flash', 'Nova', 'Turbo', 'Storm', 'Ace'],
        advanced75: ['Rayo', 'Thunder', 'Bolt', 'Flash', 'Nova', 'Turbo', 'Storm', 'Ace'],
        advanced90: ['Rayo', 'Thunder', 'Bolt', 'Flash', 'Nova', 'Turbo', 'Storm', 'Ace'],
        plus:       ['Midas', 'Oro', 'Crown', 'Rex', 'Luxe', 'Dorado', 'Kaiser', 'Royal'],
        silver:     ['Midas', 'Oro', 'Crown', 'Rex', 'Luxe', 'Dorado', 'Kaiser', 'Royal'],
        gold:       ['Midas', 'Oro', 'Crown', 'Rex', 'Luxe', 'Dorado', 'Kaiser', 'Royal'],
        dorado:     ['Midas', 'Oro', 'Crown', 'Rex', 'Luxe', 'Dorado', 'Kaiser', 'Royal'],
        premium:    ['Midas', 'Oro', 'Crown', 'Rex', 'Luxe', 'Dorado', 'Kaiser', 'Royal'],
    };
    const names = (suggestedNames[rawType] || suggestedNames.advanced30)
        .sort(() => 0.5 - Math.random()).slice(0, 4);

    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'flash-mission-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100dvh;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        z-index: 99999; display: flex; align-items: flex-end; justify-content: center;
    `;

    modal.innerHTML = `
        <div class="animate-fade-in-up" style="
            background: white; border-radius: 28px 28px 0 0;
            width: 100%; max-width: 480px; max-height: 88dvh;
            overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 0 calc(40px + env(safe-area-inset-bottom, 0px)) 0; position: relative;
        ">
            <!-- Handle -->
            <div style="width:40px; height:4px; background:#e5e7eb; border-radius:2px; margin:12px auto 0;"></div>

            <!-- Close -->
            <button id="flash-modal-close" style="
                position:absolute; top:12px; right:16px;
                background:#f3f4f6; border:none; width:32px; height:32px;
                border-radius:50%; cursor:pointer; font-size:18px; color:#6b7280;
                display:flex; align-items:center; justify-content:center;
            ">&times;</button>

            <!-- Premium Header -->
            <div style="
                background: ${theme.gradient};
                margin: 20px 20px 0; border-radius: 20px; padding: 28px 24px;
                color: white; text-align: center; position: relative; overflow: hidden;
                box-shadow: 0 12px 30px -5px ${theme.shadow};
            ">
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; opacity:0.07;
                    background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%220%22 y=%2240%22 font-size=%2230%22%3E🐷%3C/text%3E%3C/svg%3E');
                    pointer-events:none;"></div>

                <!-- Badge -->
                <div style="background:rgba(255,255,255,0.22); display:inline-block; padding:4px 14px;
                    border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1.5px;
                    text-transform:uppercase; margin-bottom:12px;">
                    ${theme.badge}
                </div>

                <!-- Icon + Name -->
                <div style="font-size:56px; margin-bottom:8px;">${theme.icon}</div>
                <h2 style="margin:0 0 6px; font-size:1.5rem; font-weight:900;">${piggyLabel}</h2>
                <p style="margin:0; font-size:0.85rem; opacity:0.92; line-height:1.4;">
                    ${descriptionText}
                </p>

                <!-- Countdown -->
                <div style="
                    background: rgba(0,0,0,0.25); border-radius: 14px;
                    padding: 12px 20px; margin-top: 16px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                ">
                    <span style="font-size:18px;">⏳</span>
                    <div>
                        <div style="font-size:0.65rem; opacity:0.8; text-align:center; letter-spacing:1px; text-transform:uppercase;">Oferta disponible por</div>
                        <div id="flash-countdown-time" style="font-size:1.3rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
                            ${formatCountdown(remaining)}
                        </div>
                    </div>
                </div>

                <div style="position:absolute; bottom:-20px; right:-10px; font-size:80px; opacity:0.12; transform:rotate(-15deg);">🐷</div>
            </div>

            <!-- Body -->
            <div style="padding: 20px 20px 0;">

                <!-- Benefit pill -->
                <div style="
                    background: linear-gradient(135deg, #fffbeb, #fef3c7);
                    border: 1px solid #fde68a; border-radius: 12px;
                    padding: 10px 16px; margin-bottom: 20px;
                    display: flex; align-items: center; gap: 10px;
                ">
                    <span style="font-size:22px;">${theme.bonusIcon}</span>
                    <div>
                        <div style="font-weight:700; color:#92400e; font-size:0.85rem;">${benefitTitle}</div>
                        <div style="font-size:0.75rem; color:#b45309;">${benefitSub}</div>
                    </div>
                </div>

                <!-- Name Input -->
                <div style="margin-bottom: 16px;">
                    <label style="font-size:0.8rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">
                        Ponle un nombre a tu ${piggyLabel}
                    </label>
                    <input type="text" id="flash-piggy-name"
                        placeholder="Nombre del piggy..."
                        autocomplete="off"
                        style="
                            width: 100%; padding: 14px 16px; box-sizing: border-box;
                            border: 2px solid #fde68a; border-radius: 14px;
                            font-size: 1rem; font-weight: 600; color: #1f2937;
                            outline: none; text-align: center; transition: all 0.2s;
                        "
                        onfocus="this.style.borderColor='${theme.color}'; this.style.boxShadow='0 0 0 4px rgba(245,158,11,0.12)';"
                        onblur="this.style.borderColor='#fde68a'; this.style.boxShadow='none';"
                    />
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; justify-content:center;">
                        ${names.map(n => `
                            <button onclick="window._flashSelectName('${n}')" style="
                                background:#fffbeb; color:#92400e; border:1px solid #fde68a;
                                padding:6px 14px; border-radius:20px; font-size:0.82rem;
                                font-weight:600; cursor:pointer; transition:transform 0.1s;
                            ">${n}</button>
                        `).join('')}
                    </div>
                    <div id="flash-name-error" style="opacity:0; color:#f59e0b; font-size:0.75rem; text-align:center; margin-top:8px;">
                        * Escribe al menos 3 caracteres
                    </div>
                </div>

                <!-- Wallet / Purchase Section -->
                <div id="flash-wallet-section" style="opacity:0.5; pointer-events:none; transition:opacity 0.3s;">

                    <!-- Balance -->
                    <div style="
                        background: ${theme.gradient};
                        border-radius: 14px; padding: 16px 20px; margin-bottom: 12px;
                        color: white; display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <div style="font-size:0.72rem; opacity:0.85; margin-bottom:2px;">Saldo en tu Cuenta Agro</div>
                            <div id="flash-balance-display" style="font-size:1.5rem; font-weight:800;">
                                <span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
                            </div>
                        </div>
                        <div style="opacity:0.25; color:white; display:flex; align-items:center; justify-content:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                        </div>
                    </div>

                    <!-- Insufficient funds -->
                    <div id="flash-insufficient" style="
                        background:#fef2f2; border:1px solid #fecaca; border-radius:10px;
                        padding:10px 14px; font-size:0.8rem; color:#dc2626; text-align:center;
                        margin-bottom:10px; display:none;
                    ">
                        Saldo insuficiente. Recarga tu Cuenta Agro para continuar.
                    </div>

                    <!-- Recharge Button -->
                    <button id="flash-recharge-btn" style="
                        width: 100%;
                        background: linear-gradient(135deg, #7c3aed, #5b21b6);
                        color: white;
                        border: none;
                        padding: 14px 20px;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 0.95rem;
                        cursor: pointer;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 12px;
                        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
                        transition: all 0.2s;
                    ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                        Recargar mi Cuenta
                    </button>

                    <!-- Price Row -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 4px; margin-bottom:12px;">
                        <span style="font-size:0.85rem; color:#6b7280;">Precio ${piggyLabel}</span>
                        <span style="font-size:1.1rem; font-weight:800; color:${theme.color};">${priceStr}</span>
                    </div>

                    <!-- Confirm Button -->
                    <button id="flash-confirm-btn" style="
                        width: 100%; background: ${theme.btnGrad};
                        color: white; border: none; padding: 14px 20px;
                        border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
                        box-shadow: 0 6px 20px -4px ${theme.btnShadow}; transition: all 0.2s;
                        opacity: 0.5; pointer-events: none;
                        display: flex; align-items: center; justify-content: center; gap: 8px;
                    ">
                        ${theme.icon} Comprar ${piggyLabel}
                    </button>
                </div>

                <!-- Footer -->
                <div style="text-align:center; margin-top:16px; color:#9ca3af; font-size:0.72rem;">
                    🔒 Transacción segura · Oferta exclusiva por tiempo limitado
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // ── Logic ─────────────────────────────────────────────────────
    const nameInput     = document.getElementById('flash-piggy-name');
    const walletSection = document.getElementById('flash-wallet-section');
    const balanceDisplay= document.getElementById('flash-balance-display');
    const insufficient  = document.getElementById('flash-insufficient');
    const confirmBtn    = document.getElementById('flash-confirm-btn');
    const nameError     = document.getElementById('flash-name-error');
    // price is already calculated at function scope (line 102)

    // Load wallet balance
    getWalletBalance().then(bal => {
        currentBalance = bal;
        balanceDisplay.textContent = formatCOP(bal);
        updateState(nameInput.value.trim());
    }).catch(() => {
        balanceDisplay.textContent = '$0';
        updateState(nameInput.value.trim());
    });

    const updateState = (nameVal) => {
        const nameOk  = nameVal.length >= 3;
        const fundsOk = currentBalance >= price;

        walletSection.style.opacity       = nameOk ? '1'    : '0.5';
        walletSection.style.pointerEvents = nameOk ? 'auto' : 'none';
        
        const showRecharge = !fundsOk;
        insufficient.style.display = showRecharge ? 'block' : 'none';
        const rechargeBtn = document.getElementById('flash-recharge-btn');
        if (rechargeBtn) {
            rechargeBtn.style.display = showRecharge ? 'flex' : 'none';
        }

        const canBuy = nameOk && fundsOk;
        confirmBtn.style.opacity       = canBuy ? '1'    : '0.5';
        confirmBtn.style.pointerEvents = canBuy ? 'auto' : 'none';
        nameError.style.opacity = (nameVal.length > 0 && !nameOk) ? '1' : '0';
    };

    nameInput.addEventListener('input', () => updateState(nameInput.value.trim()));

    window._flashSelectName = (name) => {
        nameInput.value = name;
        updateState(name);
        nameInput.focus();
    };

    // Live countdown in modal (updates every second)
    _flashCountdownInterval = setInterval(() => {
        remaining = Math.max(0, expiresAtMs - Date.now());
        const el = document.getElementById('flash-countdown-time');
        if (!el) { clearInterval(_flashCountdownInterval); return; }
        if (remaining <= 0) {
            el.textContent = '¡Oferta vencida!';
            clearInterval(_flashCountdownInterval);
            deactivateFlashMission(mission.id);
            if (typeof window._refreshMissionBanner === 'function') {
                window._refreshMissionBanner();
            }
        } else {
            el.textContent = formatCountdown(remaining);
        }
    }, 1000);

    // Close handlers
    const close = () => {
        document.body.style.overflow = '';
        delete window._flashSelectName;
        if (_flashCountdownInterval) { clearInterval(_flashCountdownInterval); _flashCountdownInterval = null; }
        modal.remove();
    };

    document.getElementById('flash-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // Recharge Wallet click
    const rechargeBtn = document.getElementById('flash-recharge-btn');
    if (rechargeBtn) {
        rechargeBtn.addEventListener('click', async () => {
            const originalText = rechargeBtn.innerHTML;
            rechargeBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Cargando Wallet...';
            rechargeBtn.style.pointerEvents = 'none';
            try {
                await openWalletDrawer(true);
                close();
            } catch (e) {
                console.error('Error opening wallet from flash mission:', e);
                rechargeBtn.innerHTML = originalText;
                rechargeBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // Confirm Purchase
    confirmBtn.addEventListener('click', async () => {
        const customName = nameInput.value.trim();
        if (customName.length < 3 || currentBalance < price) return;

        confirmBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Procesando...';
        confirmBtn.style.pointerEvents = 'none';

        try {
            // ── CRÍTICO: Descontar wallet PRIMERO antes de crear el piggy ──
            const deductResult = await deductWalletBalance(price);
            if (!deductResult.success) {
                throw new Error(
                    deductResult.reason === 'insufficient_balance'
                        ? 'Saldo insuficiente en tu Wallet.'
                        : 'No se pudo procesar el pago. Intenta de nuevo.'
                );
            }

            // Wallet descontada ✅ — ahora crear el piggy
            const result = await buyFlashMission(mission.id, customName);
            if (!result.success) throw new Error(result.error || 'Error al registrar el piggy');

            close();
            // Navegar al piggy recién comprado: la URL #/piggy/{id} activa PiggyDetailView.
            // Al volver atrás, el dashboard recarga desde BD sin la misión.
            if (result.piggy && result.piggy.id) {
                window.location.hash = `#/piggy/${result.piggy.id}`;
            } else {
                navigateTo('granja');
            }
        } catch (error) {
            console.error('Flash mission purchase error:', error);
            alert('Error en la transacción: ' + error.message);
            confirmBtn.innerHTML = `${theme.icon} Comprar ${piggyLabel}`;
            confirmBtn.style.pointerEvents = 'auto';
        }
    });
}
