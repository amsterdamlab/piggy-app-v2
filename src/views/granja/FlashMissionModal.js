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
            gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
            shadow:   'rgba(124,58,237,0.45)',
            color:    '#5B21B6',
            btnGrad:  'linear-gradient(135deg, #7C3AED, #6D28D9)',
            btnShadow:'rgba(124,58,237,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 45D',
            bonusIcon:'📈',
        },
        advanced45: {
            gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
            shadow:   'rgba(124,58,237,0.45)',
            color:    '#5B21B6',
            btnGrad:  'linear-gradient(135deg, #7C3AED, #6D28D9)',
            btnShadow:'rgba(124,58,237,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 45D',
            bonusIcon:'📈',
        },
        avanzado60: {
            gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #3730A3 100%)',
            shadow:   'rgba(99,102,241,0.45)',
            color:    '#3730A3',
            btnGrad:  'linear-gradient(135deg, #6366F1, #4F46E5)',
            btnShadow:'rgba(99,102,241,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 60D',
            bonusIcon:'📈',
        },
        advanced60: {
            gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #3730A3 100%)',
            shadow:   'rgba(99,102,241,0.45)',
            color:    '#3730A3',
            btnGrad:  'linear-gradient(135deg, #6366F1, #4F46E5)',
            btnShadow:'rgba(99,102,241,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 60D',
            bonusIcon:'📈',
        },
        avanzado75: {
            gradient: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 50%, #312E81 100%)',
            shadow:   'rgba(79,70,229,0.45)',
            color:    '#312E81',
            btnGrad:  'linear-gradient(135deg, #4F46E5, #4338CA)',
            btnShadow:'rgba(79,70,229,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 75D',
            bonusIcon:'📈',
        },
        advanced75: {
            gradient: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 50%, #312E81 100%)',
            shadow:   'rgba(79,70,229,0.45)',
            color:    '#312E81',
            btnGrad:  'linear-gradient(135deg, #4F46E5, #4338CA)',
            btnShadow:'rgba(79,70,229,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 75D',
            bonusIcon:'📈',
        },
        avanzado90: {
            gradient: 'linear-gradient(135deg, #4338CA 0%, #3730A3 50%, #1E1B4B 100%)',
            shadow:   'rgba(67,56,202,0.45)',
            color:    '#1E1B4B',
            btnGrad:  'linear-gradient(135deg, #4338CA, #3730A3)',
            btnShadow:'rgba(67,56,202,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 90D',
            bonusIcon:'📈',
        },
        advanced90: {
            gradient: 'linear-gradient(135deg, #4338CA 0%, #3730A3 50%, #1E1B4B 100%)',
            shadow:   'rgba(67,56,202,0.45)',
            color:    '#1E1B4B',
            btnGrad:  'linear-gradient(135deg, #4338CA, #3730A3)',
            btnShadow:'rgba(67,56,202,0.3)',
            icon:     '⚡',
            badge:    '⚡ OFERTA FLASH · AVANZADO 90D',
            bonusIcon:'📈',
        },
    };
    return themes[raw] || themes.avanzado30;
}

/**
 * Clean up interval and close modal.
 */
function closeFlashModal() {
    if (_flashCountdownInterval) {
        clearInterval(_flashCountdownInterval);
        _flashCountdownInterval = null;
    }
    const modal = document.getElementById('flash-mission-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.2s';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 200);
    }
}

/**
 * Show the Flash Mission modal.
 * @param {Object} mission - Flash mission record from Supabase
 */
export async function showFlashMissionModal(mission) {
    // Remove any existing
    closeFlashModal();

    const rawType = (mission.piggy_type || 'avanzado30').toLowerCase();
    const theme   = getTypeTheme(rawType);

    // Calculate time left from activated_at (72 hours)
    let remaining = 0;
    if (mission.expires_at) {
        remaining = Math.max(0, new Date(mission.expires_at).getTime() - Date.now());
    } else {
        const activatedAt = new Date(mission.activated_at || mission.created_at || Date.now());
        const expiresAt   = new Date(activatedAt.getTime() + 72 * 3600 * 1000);
        remaining = Math.max(0, expiresAt.getTime() - Date.now());
    }

    if (remaining <= 0) {
        console.warn('Oferta flash expirada.');
        return;
    }

    const price = parseFloat(mission.price || 1000000);
    let extraRoiBonus = parseFloat(mission.extra_roi_bonus || 0);
    if (!extraRoiBonus) {
        if (rawType === 'plus' || rawType === 'silver') extraRoiBonus = 0.01;
        else if (rawType === 'gold' || rawType === 'dorado') extraRoiBonus = 0.02;
        else if (rawType === 'premium') extraRoiBonus = 0.03;
    }

    const cycleDays = parseInt(mission.cycle_duration_days || 30);
    const baseROI   = 0.115;
    const totalROI  = baseROI + extraRoiBonus;
    const projectedReturn = price * (1 + totalROI);
    const piggyLabel = mission.piggy_name || (
        rawType === 'gold' || rawType === 'dorado' ? 'Piggy Dorado Flash' :
        rawType === 'plus' || rawType === 'silver' ? 'Piggy Plus Flash' :
        rawType === 'premium' ? 'Piggy Premium Flash' :
        `Piggy Avanzado (${cycleDays} Días)`
    );

    let defaultBenefitTitle = '';
    let defaultBenefitSub   = '';
    let defaultDescription  = '';

    if (rawType.startsWith('avanzado') || rawType.startsWith('advanced')) {
        defaultBenefitTitle = `Retorno en Solo ${cycleDays} Días`;
        defaultBenefitSub   = `Ciclo acelerado de ${cycleDays} días con el mismo 11.5% de retorno.`;
        defaultDescription  = `Un ciclo intensivo de ${cycleDays} días que maximiza tu tiempo de producción.`;
    } else {
        let extraPct = '+1%';
        if (rawType === 'gold' || rawType === 'dorado') extraPct = '+2%';
        if (rawType === 'premium') extraPct = '+3%';
        defaultBenefitTitle = `${extraPct} en Margen Comercial`;
        defaultBenefitSub   = `${extraPct} adicional sobre tu ROI base de granja.`;
        defaultDescription  = `Piggy exclusivo de oferta flash con ${extraPct} adicional en tu Margen Comercial.`;
    }

    const benefitTitle    = mission.benefit_title || defaultBenefitTitle;
    const benefitSub      = mission.benefit_description || mission.benefit_sub || defaultBenefitSub;
    const descriptionText = mission.description || defaultDescription;

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
            width: 100%; max-width: 480px; max-height: 90dvh;
            overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 0 calc(40px + env(safe-area-inset-bottom, 0px)) 0; position: relative;
        ">
            <!-- Handle -->
            <div style="width:40px; height:4px; background:#e5e7eb; border-radius:2px; margin:14px auto 6px;"></div>

            <!-- Close -->
            <button id="flash-modal-close" style="
                position:absolute; top:16px; right:16px;
                background:#f3f4f6; border:none; width:32px; height:32px;
                border-radius:50%; cursor:pointer; font-size:18px; color:#6b7280;
                display:flex; align-items:center; justify-content:center;
                line-height:1; z-index:10;
            ">&times;</button>

            <!-- Premium Header -->
            <div style="
                background: ${theme.gradient};
                margin: 8px 20px 0; border-radius: 20px; padding: 24px 20px;
                color: white; text-align: center; position: relative; overflow: hidden;
                box-shadow: 0 12px 30px -5px ${theme.shadow};
            ">
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

                <!-- Decorative circles -->
                <div style="position:absolute; top:-30px; right:-30px; width:120px; height:120px;
                    background:rgba(255,255,255,0.08); border-radius:50%; pointer-events:none;"></div>
                <div style="position:absolute; bottom:-40px; left:-20px; width:100px; height:100px;
                    background:rgba(255,255,255,0.06); border-radius:50%; pointer-events:none;"></div>
            </div>

            <!-- Content Area -->
            <div style="padding: 20px 20px 0;">

                <!-- Exclusivity Banner -->
                <div style="
                    background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px;
                    padding: 12px 16px; display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
                ">
                    <span style="font-size:20px; flex-shrink:0;">🔒</span>
                    <div style="font-size:0.78rem; color:#92400e; line-height:1.35;">
                        <strong>Oferta Única y Personalizada.</strong> Asignada exclusivamente a tu cuenta. Solo puedes activar una unidad por periodo flash.
                    </div>
                </div>

                <!-- Key Metrics Grid -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 16px;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px; text-align:center;">
                        <div style="font-size:0.7rem; color:#64748b; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Inversión</div>
                        <div style="font-size:1.15rem; font-weight:900; color:#0f172a;">${formatCOP(price)}</div>
                    </div>
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:14px; text-align:center;">
                        <div style="font-size:0.7rem; color:#15803d; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Retorno Estimado</div>
                        <div style="font-size:1.15rem; font-weight:900; color:#16a34a;">${formatCOP(projectedReturn)}</div>
                        <div style="font-size:0.65rem; color:#16a34a; font-weight:700;">${(totalROI * 100).toFixed(1)}% margen total</div>
                    </div>
                </div>

                <!-- Benefits List -->
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px; margin-bottom: 16px;">
                    <div style="font-size:0.75rem; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">
                        Beneficios Exclusivos
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; align-items:flex-start; gap:10px;">
                            <span style="font-size:16px; flex-shrink:0; margin-top:1px;">${theme.bonusIcon}</span>
                            <div>
                                <div style="font-size:0.85rem; font-weight:700; color:#0f172a;">
                                    ${benefitTitle}
                                </div>
                                <div style="font-size:0.75rem; color:#64748b;">
                                    ${benefitSub}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:flex-start; gap:10px;">
                            <span style="font-size:16px; flex-shrink:0; margin-top:1px;">⏱️</span>
                            <div>
                                <div style="font-size:0.85rem; font-weight:700; color:#0f172a;">Ciclo de ${cycleDays} Días</div>
                                <div style="font-size:0.75rem; color:#64748b;">Producción y seguimiento en tiempo real desde tu Granja.</div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:flex-start; gap:10px;">
                            <span style="font-size:16px; flex-shrink:0; margin-top:1px;">🛡️</span>
                            <div>
                                <div style="font-size:0.85rem; font-weight:700; color:#0f172a;">Garantía Valle Morales</div>
                                <div style="font-size:0.75rem; color:#64748b;">Cuidado profesional, alimentación balanceada y retorno automático.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Custom Name Section -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size:0.8rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">
                        Ponle un nombre a tu Oferta Única:
                    </label>
                    <div style="position:relative; margin-bottom:8px;">
                        <input
                            type="text"
                            id="flash-custom-name"
                            placeholder="Ej: ${names[0]}"
                            maxlength="20"
                            style="
                                width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb;
                                border-radius: 12px; font-size: 0.95rem; font-weight: 600;
                                outline: none; transition: border-color 0.2s; box-sizing: border-box;
                            "
                            onfocus="this.style.borderColor='${theme.color}'"
                            onblur="this.style.borderColor='#e5e7eb'"
                        />
                    </div>
                    <!-- Quick Name Chips -->
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <span style="font-size:0.72rem; color:#9ca3af; align-self:center;">Sugeridos:</span>
                        ${names.map(n => `
                            <button
                                type="button"
                                class="flash-name-chip"
                                data-name="${n}"
                                style="
                                    background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px;
                                    padding:3px 10px; font-size:0.75rem; font-weight:600; color:#475569;
                                    cursor:pointer; transition:all 0.15s;
                                "
                                onmouseover="this.style.background='#e2e8f0'"
                                onmouseout="this.style.background='#f1f5f9'"
                            >${n}</button>
                        `).join('')}
                    </div>
                </div>

                <!-- Balance / Account Agro Indicator -->
                <div id="flash-wallet-indicator" style="
                    background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;
                    padding:10px 14px; display:flex; align-items:center; justify-content:space-between;
                    margin-bottom:14px; font-size:0.8rem;
                ">
                    <span style="color:#64748b;">Saldo en Cuenta Agro:</span>
                    <span id="flash-modal-balance" style="font-weight:800; color:#0f172a;">Cargando...</span>
                </div>

                <!-- Error Container -->
                <div id="flash-modal-error" style="
                    display:none; background:#fef2f2; border:1px solid #fecaca; color:#b91c1c;
                    border-radius:10px; padding:10px 14px; font-size:0.8rem; margin-bottom:12px;
                "></div>

                <!-- CTA Button -->
                <button
                    id="btn-buy-flash-piggy"
                    class="btn-shine-7s"
                    style="
                        width: 100%; padding: 16px 20px; background: ${theme.btnGrad};
                        color: white; border: none; border-radius: 16px; font-size: 1rem;
                        font-weight: 800; cursor: pointer; display: flex; align-items: center;
                        justify-content: center; gap: 8px; box-shadow: 0 8px 20px -4px ${theme.btnShadow};
                        transition: transform 0.15s;
                    "
                    onmouseover="this.style.transform='translateY(-1px)'"
                    onmouseout="this.style.transform='translateY(0)'"
                >
                    <span>⚡</span>
                    <span>Adquirir por ${formatCOP(price)}</span>
                </button>

                <p style="text-align:center; font-size:0.72rem; color:#9ca3af; margin:10px 0 0;">
                    El cobro se realizará de tu saldo disponible en Cuenta Agro.
                </p>

            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Live countdown update
    const countdownEl = document.getElementById('flash-countdown-time');
    _flashCountdownInterval = setInterval(() => {
        remaining -= 1000;
        if (remaining <= 0) {
            clearInterval(_flashCountdownInterval);
            _flashCountdownInterval = null;
            if (countdownEl) countdownEl.textContent = '¡Oferta Finalizada!';
            const buyBtn = document.getElementById('btn-buy-flash-piggy');
            if (buyBtn) {
                buyBtn.disabled = true;
                buyBtn.style.opacity = '0.5';
                buyBtn.style.cursor = 'not-allowed';
            }
            return;
        }
        if (countdownEl) {
            countdownEl.textContent = formatCountdown(remaining);
        }
    }, 1000);

    // Close handlers
    document.getElementById('flash-modal-close').addEventListener('click', closeFlashModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeFlashModal();
    });

    // Name chips
    const nameInput = document.getElementById('flash-custom-name');
    modal.querySelectorAll('.flash-name-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (nameInput) {
                nameInput.value = chip.dataset.name;
                nameInput.focus();
            }
        });
    });

    // Load wallet balance
    let currentBalance = 0;
    try {
        currentBalance = await getWalletBalance();
        const balEl = document.getElementById('flash-modal-balance');
        if (balEl) balEl.textContent = formatCOP(currentBalance);
    } catch {
        const balEl = document.getElementById('flash-modal-balance');
        if (balEl) balEl.textContent = 'Error al consultar';
    }

    // Purchase handler
    const buyBtn = document.getElementById('btn-buy-flash-piggy');
    const errEl  = document.getElementById('flash-modal-error');

    buyBtn.addEventListener('click', async () => {
        const customName = (nameInput?.value || '').trim() || names[0];
        errEl.style.display = 'none';

        // Check funds
        if (currentBalance < price) {
            errEl.innerHTML = `
                Saldo insuficiente (${formatCOP(currentBalance)}). Necesitas ${formatCOP(price)}.
                <br/><a href="javascript:void(0)" id="flash-recharge-link" style="color:#b91c1c; font-weight:700; text-decoration:underline;">Recarga tu Cuenta Agro aquí</a>
            `;
            errEl.style.display = 'block';

            document.getElementById('flash-recharge-link')?.addEventListener('click', () => {
                closeFlashModal();
                openWalletDrawer();
            });
            return;
        }

        // Disable button while processing
        buyBtn.disabled = true;
        buyBtn.innerHTML = `<span>⏳</span><span>Procesando adquisición...</span>`;
        buyBtn.style.opacity = '0.8';

        try {
            const result = await buyFlashMission(mission, customName);
            if (!result.success) {
                errEl.textContent = result.error || 'No se pudo completar la adquisición. Intenta de nuevo.';
                errEl.style.display = 'block';
                buyBtn.disabled = false;
                buyBtn.innerHTML = `<span>⚡</span><span>Adquirir por ${formatCOP(price)}</span>`;
                buyBtn.style.opacity = '1';
                return;
            }

            // Success animation
            modal.querySelector('.animate-fade-in-up').innerHTML = `
                <div style="padding: 40px 24px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 12px; animation: bounce 0.6s ease;">🎉</div>
                    <h2 style="font-size: 1.6rem; font-weight: 900; color: #0f172a; margin: 0 0 8px;">
                        ¡${customName} ya está en tu Granja!
                    </h2>
                    <p style="color: #64748b; font-size: 0.9rem; line-height: 1.4; margin: 0 0 24px;">
                        Has adquirido tu <strong>${piggyLabel}</strong> con éxito. Comenzará su ciclo de producción hoy mismo.
                    </p>
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:16px; padding:16px; margin-bottom:24px; text-align:left;">
                        <div style="font-size:0.75rem; font-weight:700; color:#15803d; text-transform:uppercase; margin-bottom:6px;">Detalles de la Operación</div>
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#374151; margin-bottom:4px;">
                            <span>Inversión:</span>
                            <strong>${formatCOP(price)}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#374151; margin-bottom:4px;">
                            <span>Duración:</span>
                            <strong>${cycleDays} días</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#16a34a;">
                            <span>Retorno Total Estimado:</span>
                            <strong>${formatCOP(projectedReturn)}</strong>
                        </div>
                    </div>
                    <button
                        id="btn-flash-success-ok"
                        style="
                            width: 100%; padding: 15px; background: ${theme.btnGrad};
                            color: white; border: none; border-radius: 14px; font-size: 1rem;
                            font-weight: 800; cursor: pointer; box-shadow: 0 6px 16px ${theme.btnShadow};
                        "
                    >
                        Ver mi Granja
                    </button>
                </div>
            `;

            document.getElementById('btn-flash-success-ok')?.addEventListener('click', () => {
                closeFlashModal();
                if (result.piggy?.id) {
                    window.location.hash = `#/piggy/${result.piggy.id}`;
                } else {
                    navigateTo('granja');
                }
            });

        } catch (err) {
            console.error('Error in buyFlashMission:', err);
            errEl.textContent = 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
            errEl.style.display = 'block';
            buyBtn.disabled = false;
            buyBtn.innerHTML = `<span>⚡</span><span>Adquirir por ${formatCOP(price)}</span>`;
            buyBtn.style.opacity = '1';
        }
    });
}
