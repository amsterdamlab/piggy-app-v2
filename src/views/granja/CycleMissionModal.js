/* ============================================
   PIGGY APP — Cycle Mission Modal (M10)
   Shows a time-limited 48h exclusive piggy
   offer triggered when a piggy completes its
   cycle and the user has ≥3 piggies.
   ============================================ */

import { navigateTo } from '../../router.js';
import { getWalletBalance } from '../../services/walletService.js';
import { formatCOP } from '../../services/mockData.js';
import { deductWalletBalance } from '../../services/walletService.js';
import { buyCycleCompletionMission } from '../../services/flashMissionsService.js';

/** Active countdown interval */
let _cycleCountdownInterval = null;

/**
 * Format remaining milliseconds as "XXh XXm".
 */
function formatCountdown(remainingMs) {
    if (remainingMs <= 0) return '00h 00m';
    const hours   = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Get visual theme based on piggy type.
 */
function getTypeTheme(piggyType) {
    const themes = {
        silver: {
            gradient:  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
            shadow:    'rgba(139,92,246,0.5)',
            color:     '#6d28d9',
            btnGrad:   'linear-gradient(135deg, #6366f1, #4f46e5)',
            btnShadow: 'rgba(99,102,241,0.4)',
            icon:      '🌟',
            bonusBg:   'linear-gradient(135deg, #ede9fe, #ddd6fe)',
            bonusBorder:'#c4b5fd',
            bonusColor: '#5b21b6',
            badge:     '🌟 OFERTA POR CICLO · MISIÓN EXCLUSIVA',
        },
        gold: {
            gradient:  'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)',
            shadow:    'rgba(234,179,8,0.5)',
            color:     '#92400e',
            btnGrad:   'linear-gradient(135deg, #eab308, #ca8a04)',
            btnShadow: 'rgba(234,179,8,0.4)',
            icon:      '🥇',
            bonusBg:   'linear-gradient(135deg, #fffbeb, #fef3c7)',
            bonusBorder:'#fde68a',
            bonusColor: '#92400e',
            badge:     '🥇 OFERTA POR CICLO · MISIÓN EXCLUSIVA',
        },
        premium: {
            gradient:  'linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)',
            shadow:    'rgba(236,72,153,0.5)',
            color:     '#be185d',
            btnGrad:   'linear-gradient(135deg, #ec4899, #db2777)',
            btnShadow: 'rgba(236,72,153,0.4)',
            icon:      '💎',
            bonusBg:   'linear-gradient(135deg, #fdf2f8, #fce7f3)',
            bonusBorder:'#fbcfe8',
            bonusColor: '#9d174d',
            badge:     '💎 OFERTA POR CICLO · MISIÓN EXCLUSIVA',
        },
    };
    return themes[piggyType] || themes['silver'];
}

/**
 * Show the Cycle Completion Mission purchase modal (M10).
 * @param {Object} mission - Active cycle_completion_missions record with remainingMs
 */
export function showCycleMissionModal(mission) {
    // Remove existing modal
    const existing = document.getElementById('cycle-mission-modal');
    if (existing) existing.remove();
    if (_cycleCountdownInterval) { clearInterval(_cycleCountdownInterval); _cycleCountdownInterval = null; }

    if (!mission) return;

    const theme    = getTypeTheme(mission.piggy_type);
    const roiPct   = `+${((mission.extra_roi_bonus || 0) * 100).toFixed(0)}%`;
    const priceStr = formatCOP(mission.price || 1000000);
    let   remaining = mission.remainingMs || 0;

    const suggestedNames = {
        silver:  ['Platino', 'Luna', 'Perla', 'Astro', 'Cristal', 'Nieve', 'Zafiro', 'Cielo'],
        gold:    ['Midas', 'Oro', 'Crown', 'Rex', 'Luxe', 'Dorado', 'Kaiser', 'Royal'],
        premium: ['Diamante', 'Luxor', 'Elite', 'Apex', 'Prime', 'Titan', 'Legend', 'Crown'],
    };
    const names = (suggestedNames[mission.piggy_type] || suggestedNames.silver)
        .sort(() => 0.5 - Math.random()).slice(0, 4);

    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'cycle-mission-modal';
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
            <button id="cycle-modal-close" style="
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

                <!-- Alert chip -->
                <div style="background:rgba(0,0,0,0.15); display:inline-flex; align-items:center; gap:6px;
                    padding:4px 12px; border-radius:20px; font-size:0.72rem; font-weight:600;
                    margin-bottom:12px; margin-left:8px;">
                    🎉 ¡Tu Piggy completó su ciclo!
                </div>

                <!-- Icon + Name -->
                <div style="font-size:56px; margin-bottom:8px;">${theme.icon}</div>
                <h2 style="margin:0 0 6px; font-size:1.5rem; font-weight:900;">${mission.piggy_label}</h2>
                <p style="margin:0; font-size:0.85rem; opacity:0.92; line-height:1.4;">
                    Tu recompensa por completar el ciclo.<br>
                    <strong>${roiPct} adicional</strong> en tu Margen Comercial.
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
                        <div id="cycle-countdown-time" style="font-size:1.3rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
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
                    background: ${theme.bonusBg};
                    border: 1px solid ${theme.bonusBorder}; border-radius: 12px;
                    padding: 10px 16px; margin-bottom: 20px;
                    display: flex; align-items: center; gap: 10px;
                ">
                    <span style="font-size:22px;">📈</span>
                    <div>
                        <div style="font-weight:700; color:${theme.bonusColor}; font-size:0.85rem;">Beneficio exclusivo incluido</div>
                        <div style="font-size:0.75rem; color:${theme.bonusColor}; opacity:0.8;">${roiPct} adicional sobre tu ROI base de granja.</div>
                    </div>
                </div>

                <!-- Name Input -->
                <div style="margin-bottom: 16px;">
                    <label style="font-size:0.8rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">
                        Ponle un nombre a tu ${mission.piggy_label}
                    </label>
                    <input type="text" id="cycle-piggy-name"
                        placeholder="Nombre del piggy exclusivo..."
                        autocomplete="off"
                        style="
                            width: 100%; padding: 14px 16px; box-sizing: border-box;
                            border: 2px solid #e5e7eb; border-radius: 14px;
                            font-size: 1rem; font-weight: 600; color: #1f2937;
                            outline: none; text-align: center; transition: all 0.2s;
                        "
                        onfocus="this.style.borderColor='${theme.color}'; this.style.boxShadow='0 0 0 4px rgba(99,102,241,0.1)';"
                        onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';"
                    />
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; justify-content:center;">
                        ${names.map(n => `
                            <button onclick="window._cycleSelectName('${n}')" style="
                                background:#f5f3ff; color:#5b21b6; border:1px solid #ede9fe;
                                padding:6px 14px; border-radius:20px; font-size:0.82rem;
                                font-weight:600; cursor:pointer; transition:transform 0.1s;
                            ">${n}</button>
                        `).join('')}
                    </div>
                    <div id="cycle-name-error" style="opacity:0; color:#6366f1; font-size:0.75rem; text-align:center; margin-top:8px;">
                        * Escribe al menos 3 caracteres
                    </div>
                </div>

                <!-- Wallet Section -->
                <div id="cycle-wallet-section" style="opacity:0.5; pointer-events:none; transition:opacity 0.3s;">

                    <!-- Balance -->
                    <div style="
                        background: ${theme.gradient};
                        border-radius: 14px; padding: 16px 20px; margin-bottom: 12px;
                        color: white; display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <div style="font-size:0.72rem; opacity:0.85; margin-bottom:2px;">Saldo en tu Wallet</div>
                            <div id="cycle-balance-display" style="font-size:1.5rem; font-weight:800;">
                                <span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
                            </div>
                        </div>
                        <div style="font-size:40px; opacity:0.3;">💰</div>
                    </div>

                    <!-- Insufficient -->
                    <div id="cycle-insufficient" style="
                        background:#fef2f2; border:1px solid #fecaca; border-radius:10px;
                        padding:10px 14px; font-size:0.8rem; color:#dc2626; text-align:center;
                        margin-bottom:10px; display:none;
                    ">
                        Saldo insuficiente. Recarga tu Wallet para continuar.
                    </div>

                    <!-- Price Row -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 4px; margin-bottom:12px;">
                        <span style="font-size:0.85rem; color:#6b7280;">Precio ${mission.piggy_label}</span>
                        <span style="font-size:1.1rem; font-weight:800; color:${theme.color};">${priceStr}</span>
                    </div>

                    <!-- Confirm Button -->
                    <button id="cycle-confirm-btn" style="
                        width: 100%; background: ${theme.btnGrad};
                        color: white; border: none; padding: 15px;
                        border-radius: 14px; font-weight: 700; font-size: 1rem; cursor: pointer;
                        box-shadow: 0 6px 20px -4px ${theme.btnShadow}; transition: all 0.2s;
                        opacity: 0.5; pointer-events: none;
                        display: flex; align-items: center; justify-content: center; gap: 8px;
                    ">
                        ${theme.icon} Comprar mi ${mission.piggy_label}
                    </button>
                </div>

                <!-- Footer -->
                <div style="text-align:center; margin-top:16px; color:#9ca3af; font-size:0.72rem;">
                    🔒 Transacción segura · Recompensa exclusiva de ciclo completado
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // ── Logic ──────────────────────────────────────────────────────
    const nameInput     = document.getElementById('cycle-piggy-name');
    const walletSection = document.getElementById('cycle-wallet-section');
    const balanceDisplay= document.getElementById('cycle-balance-display');
    const insufficient  = document.getElementById('cycle-insufficient');
    const confirmBtn    = document.getElementById('cycle-confirm-btn');
    const nameError     = document.getElementById('cycle-name-error');
    let currentBalance  = 0;
    const price         = mission.price || 1000000;

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
        insufficient.style.display        = (nameOk && !fundsOk) ? 'block' : 'none';

        const canBuy = nameOk && fundsOk;
        confirmBtn.style.opacity       = canBuy ? '1'    : '0.5';
        confirmBtn.style.pointerEvents = canBuy ? 'auto' : 'none';
        nameError.style.opacity = (nameVal.length > 0 && !nameOk) ? '1' : '0';
    };

    nameInput.addEventListener('input', () => updateState(nameInput.value.trim()));

    window._cycleSelectName = (name) => {
        nameInput.value = name;
        updateState(name);
        nameInput.focus();
    };

    // Live countdown
    _cycleCountdownInterval = setInterval(() => {
        remaining = Math.max(0, remaining - 30000);
        const el = document.getElementById('cycle-countdown-time');
        if (!el) { clearInterval(_cycleCountdownInterval); return; }
        if (remaining <= 0) {
            el.textContent = '¡Oferta vencida!';
            clearInterval(_cycleCountdownInterval);
        } else {
            el.textContent = formatCountdown(remaining);
        }
    }, 30000);

    // Close
    const close = () => {
        document.body.style.overflow = '';
        delete window._cycleSelectName;
        if (_cycleCountdownInterval) { clearInterval(_cycleCountdownInterval); _cycleCountdownInterval = null; }
        modal.remove();
    };

    document.getElementById('cycle-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

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
            const result = await buyCycleCompletionMission(mission.id, customName);
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
            console.error('Cycle mission purchase error:', error);
            alert('Error en la transacción: ' + error.message);
            confirmBtn.innerHTML = `${theme.icon} Comprar mi ${mission.piggy_label}`;
            confirmBtn.style.pointerEvents = 'auto';
        }
    });
}
