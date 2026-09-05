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
import { openWalletDrawer } from './WalletBlock.js';

/** Active countdown interval */
let _cycleCountdownInterval = null;

/**
 * Format remaining milliseconds as "XXh XXm".
 */
function formatCountdown(remainingMs) {
    if (remainingMs <= 0) return '00h 00m 00s';
    const hours   = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

/**
 * Get visual theme based on piggy type.
 */
function getTypeTheme(piggyType) {
    const raw = (piggyType || 'plus').toLowerCase();
    const themes = {
        plus: {
            gradient:  'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            shadow:    'rgba(14,165,233,0.5)',
            color:     '#0284c7',
            btnGrad:   'linear-gradient(135deg, #0ea5e9, #0284c7)',
            btnShadow: 'rgba(14,165,233,0.4)',
            icon:      '🌟',
            bonusBg:   'linear-gradient(135deg, #e0f2fe, #bae6fd)',
            bonusBorder:'#7dd3fc',
            bonusColor: '#0369a1',
            badge:     'OFERTA POR CICLO COMPLETADO',
        },
        silver: {
            gradient:  'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            shadow:    'rgba(14,165,233,0.5)',
            color:     '#0284c7',
            btnGrad:   'linear-gradient(135deg, #0ea5e9, #0284c7)',
            btnShadow: 'rgba(14,165,233,0.4)',
            icon:      '🌟',
            bonusBg:   'linear-gradient(135deg, #e0f2fe, #bae6fd)',
            bonusBorder:'#7dd3fc',
            bonusColor: '#0369a1',
            badge:     'OFERTA POR CICLO COMPLETADO',
        },
        dorado: {
            gradient:  'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #ca8a04 100%)',
            shadow:    'rgba(234,179,8,0.5)',
            color:     '#92400e',
            btnGrad:   'linear-gradient(135deg, #eab308, #ca8a04)',
            btnShadow: 'rgba(234,179,8,0.4)',
            icon:      '🥇',
            bonusBg:   'linear-gradient(135deg, #fffbeb, #fef3c7)',
            bonusBorder:'#fde68a',
            bonusColor: '#92400e',
            badge:     'OFERTA POR CICLO COMPLETADO',
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
            badge:     'OFERTA POR CICLO COMPLETADO',
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
            badge:     'OFERTA POR CICLO COMPLETADO',
        },
    };
    return themes[raw] || themes['plus'];
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
        .sort(() => 0.5 - Math.random()).slice(0, 3);

    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'cycle-mission-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100dvh;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        z-index: 99999; display: flex; align-items: flex-end; justify-content: center;
    `;

    modal.innerHTML = `
        <style>
          @keyframes pulseGlow7s {
            0%, 78%, 100% {
              transform: scale(1);
              box-shadow: 0 6px 20px -4px ${theme.btnShadow};
            }
            83% {
              transform: scale(1.03);
              box-shadow: 0 12px 28px ${theme.shadow}, 0 0 20px rgba(255, 255, 255, 0.8);
            }
            88% {
              transform: scale(0.99);
              box-shadow: 0 6px 20px -4px ${theme.btnShadow};
            }
            93% {
              transform: scale(1.02);
              box-shadow: 0 10px 24px ${theme.shadow};
            }
          }
          @keyframes shineSweep7s {
            0%, 75% {
              left: -120%;
            }
            88%, 100% {
              left: 220%;
            }
          }
          .btn-pulse-glow-7s {
            position: relative !important;
            overflow: hidden !important;
            animation: pulseGlow7s 7s infinite ease-in-out !important;
          }
          .btn-pulse-glow-7s::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -120%;
            width: 60%;
            height: 200%;
            background: linear-gradient(
              90deg, 
              rgba(255, 255, 255, 0) 0%, 
              rgba(255, 255, 255, 0.55) 50%, 
              rgba(255, 255, 255, 0) 100%
            );
            transform: rotate(25deg);
            animation: shineSweep7s 7s infinite ease-in-out;
            pointer-events: none;
          }
        </style>
        <div class="animate-fade-in-up" style="
            background: white; border-radius: 28px 28px 0 0;
            width: 100%; max-width: 480px; max-height: 88dvh;
            overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 0 calc(40px + env(safe-area-inset-bottom, 0px)) 0; position: relative;
        ">
            <!-- Handle -->
            <div style="width:40px; height:4px; background:#e5e7eb; border-radius:2px; margin:12px auto 0;"></div>

            <!-- Close -->
            <button id="cycle-modal-close" style="
                position:absolute; top:14px; right:18px;
                background:none; border:none; width:28px; height:28px;
                cursor:pointer; font-size:24px; color:#6b7280;
                display:flex; align-items:center; justify-content:center;
                line-height:1; z-index:10;
            ">&times;</button>

            <!-- Premium Header -->
            <div style="
                background: ${theme.gradient};
                margin: 28px 20px 0; border-radius: 20px; padding: 28px 24px;
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
                <img src="/piggy-favicon.svg" alt="Piggy" style="width: 56px; height: 56px; margin: 0 auto 8px auto; display: block; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15));" />
                <h2 style="margin:0 0 6px; font-size:1.5rem; font-weight:900;">${mission.piggy_label}</h2>
                <p style="margin:0; font-size:0.85rem; opacity:0.92; line-height:1.4;">
                    Aprovecha esta oportunidad por tiempo limitado. Compra tu Piggy con <strong>${roiPct} adicional de margen por canal de venta</strong>.
                </p>

                <!-- Countdown -->
                <div style="
                    background: rgba(0,0,0,0.25); border-radius: 14px;
                    padding: 12px 20px; margin-top: 16px;
                    display: flex; align-items: center; justify-content: center;
                ">
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

                <!-- Name Input -->
                <div style="margin-bottom: 16px;">
                    <label style="font-size:0.8rem; font-weight:700; color:#374151; display:block; margin-bottom:8px; text-align:center;">
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
                        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                        border-radius: 16px; padding: 18px 20px; margin-bottom: 12px;
                        color: white; position: relative; overflow: hidden;
                    ">
                        <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px;">Saldo disponible en tu Wallet</div>
                        <div id="cycle-balance-display" style="font-size:1.8rem; font-weight:800; letter-spacing:-0.5px; line-height:1;">
                            <span class="spinner" style="width:20px;height:20px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
                        </div>
                        <div style="position:absolute; bottom:-10px; right:-10px; opacity:0.15; color:white;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                        </div>
                    </div>

                    <!-- Insufficient -->
                    <div id="cycle-insufficient" style="
                        background:#fef2f2; border:1px solid #fecaca; border-radius:10px;
                        padding:10px 14px; font-size:0.8rem; color:#dc2626; text-align:center;
                        margin-bottom:10px; display:none;
                    ">
                        Saldo insuficiente. Recarga tu Cuenta Agro para continuar.
                    </div>

                    <!-- Recharge Button -->
                    <button id="cycle-recharge-btn" style="
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
                        <span style="font-size:0.85rem; color:#6b7280;">Precio ${mission.piggy_label}</span>
                        <span style="font-size:1.1rem; font-weight:800; color:${theme.color};">${priceStr}</span>
                    </div>

                    <!-- Confirm Button -->
                    <button id="cycle-confirm-btn" class="btn-pulse-glow-7s" style="
                        width: 100%; background: ${theme.btnGrad};
                        color: white; border: none; padding: 14px 20px;
                        border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
                        box-shadow: 0 6px 20px -4px ${theme.btnShadow}; transition: all 0.2s;
                        opacity: 0.5; pointer-events: none;
                        display: flex; align-items: center; justify-content: center; gap: 8px;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></svg>
                        <span>Comprar mi ${mission.piggy_label}</span>
                    </button>
                </div>

                <!-- Footer -->
                <div class="checkout-footer" style="margin-top: 16px; padding-top: 12px; padding-bottom: 8px; display: flex; justify-content: center;">
                    <div class="secure-badge" style="display: flex; gap: 20px; color: #94a3b8; font-size: 0.78rem; font-weight: 600; align-items: center;">
                        <span style="display: flex; align-items: center; gap: 5px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Pagos seguros
                        </span>
                        <span style="display: flex; align-items: center; gap: 5px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Cifrado SSL
                        </span>
                    </div>
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
        
        const showRecharge = !fundsOk;
        insufficient.style.display        = showRecharge ? 'block' : 'none';
        const rechargeBtn = document.getElementById('cycle-recharge-btn');
        if (rechargeBtn) {
            rechargeBtn.style.display = showRecharge ? 'flex' : 'none';
        }

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
        remaining = Math.max(0, remaining - 1000);
        const el = document.getElementById('cycle-countdown-time');
        if (!el) { clearInterval(_cycleCountdownInterval); return; }
        if (remaining <= 0) {
            el.textContent = '¡Oferta vencida!';
            clearInterval(_cycleCountdownInterval);
        } else {
            el.textContent = formatCountdown(remaining);
        }
    }, 1000);

    // Close
    const close = () => {
        document.body.style.overflow = '';
        delete window._cycleSelectName;
        if (_cycleCountdownInterval) { clearInterval(_cycleCountdownInterval); _cycleCountdownInterval = null; }
        modal.remove();
    };

    document.getElementById('cycle-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // Recharge Wallet click
    const rechargeBtn = document.getElementById('cycle-recharge-btn');
    if (rechargeBtn) {
        rechargeBtn.addEventListener('click', async () => {
            const originalText = rechargeBtn.innerHTML;
            rechargeBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Cargando Wallet...';
            rechargeBtn.style.pointerEvents = 'none';
            try {
                await openWalletDrawer(true);
                close();
            } catch (e) {
                console.error('Error opening wallet from cycle mission:', e);
                rechargeBtn.innerHTML = originalText;
                rechargeBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // Confirm Purchase -> Navigate to Digital Contract Signing
    confirmBtn.addEventListener('click', () => {
        const customName = nameInput.value.trim();
        if (customName.length < 3) {
            nameError.style.opacity = '1';
            nameInput.focus();
            return;
        }

        if (currentBalance < price) return;

        // Structure pending marketplace item for ContratoView
        const pendingItem = {
            id: `cycle-${mission.id}`,
            name: customName,
            item_name: mission.piggy_label,
            category: mission.piggy_type,
            price: price,
            extra_roi: mission.extra_roi_bonus || 0,
            extra_roi_bonus: mission.extra_roi_bonus || 0,
            cycle_mission_id: mission.id,
            is_cycle_mission: true,
        };

        // Save pending purchase details in session
        sessionStorage.setItem('pending_piggy_name', customName);
        sessionStorage.setItem('pending_marketplace_item', JSON.stringify(pendingItem));

        close();
        navigateTo(`contrato?name=${encodeURIComponent(customName)}&price=${price}&cycleMissionId=${encodeURIComponent(mission.id)}`);
    });
}
