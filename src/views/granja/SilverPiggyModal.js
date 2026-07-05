/* ============================================
   PIGGY APP — Silver Piggy Modal (Mission 6)
   Shows a time-limited 72h exclusive Silver Piggy
   offer. Triggered from MissionsBlock when M6 is
   active and within the 72-hour window.
   ============================================ */

import { renderIcon } from '../../icons.js';
import { navigateTo } from '../../router.js';
import { AppState } from '../../state.js';
import { buyMarketplaceItem } from '../../services/piggiesService.js';
import { getWalletBalance, formatCOP, deductWalletBalance } from '../../services/walletService.js';

/** Silver Piggy offer definition — precio igual al estándar pero con +1% ROI */
const SILVER_PIGGY_ITEM = {
    id: 'silver-m6-exclusive',
    item_name: 'Piggy Silver',
    description: 'Oferta exclusiva de misión. Un Piggy especial de raza Silver con bonificación adicional en tu Margen Comercial.',
    price: 1000000,         // mismo precio que el estándar
    extra_roi: 0.01,        // +1% extra sobre el ROI base de la granja
    category: 'silver',
    currentMonth: 1,
    current_month: 1,
    stock: 1,               // oferta única por usuario
    current_weight: 15.0,
    priceFormatted: '$1.000.000',
    hasBonus: true,
    bonusText: '+1%',
};

/** Active countdown interval — cleaned up on modal close */
let _countdownInterval = null;

/**
 * Calculate remaining milliseconds from now until silverExpiry.
 * @param {string} silverExpiry - ISO date string (m4.completed_at + 72h)
 * @returns {{ ms: number, hours: number, minutes: number, expired: boolean }}
 */
function getRemainingTime(silverExpiry) {
    const ms = new Date(silverExpiry).getTime() - Date.now();
    if (ms <= 0) return { ms: 0, hours: 0, minutes: 0, expired: true };
    const hours   = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return { ms, hours, minutes, expired: false };
}

/**
 * Show the Silver Piggy exclusive-offer modal.
 * @param {string} silverExpiry - ISO string for the 72h expiry timestamp
 */
export function showSilverPiggyModal(silverExpiry) {
    // Safety check — should not show if expired (banner handles this)
    const timeData = getRemainingTime(silverExpiry);
    if (timeData.expired) {
        navigateTo('mercado');
        return;
    }

    // Remove existing
    const existing = document.getElementById('silver-piggy-modal');
    if (existing) existing.remove();
    if (_countdownInterval) clearInterval(_countdownInterval);

    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'silver-piggy-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100dvh;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        z-index: 99999; display: flex; align-items: flex-end;
        justify-content: center;
    `;

    const suggestedNames = ['Platino', 'Silver', 'Luna', 'Perla', 'Astro', 'Cristal', 'Nieve', 'Stela'];
    const shuffled = suggestedNames.sort(() => 0.5 - Math.random()).slice(0, 4);

    modal.innerHTML = `
        <div class="animate-fade-in-up" style="
            background: white; border-radius: 28px 28px 0 0;
            width: 100%; max-width: 480px; max-height: 88dvh;
            overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 0 calc(40px + env(safe-area-inset-bottom, 0px)) 0; position: relative;
        ">
            <!-- Handle -->
            <div style="width:40px; height:4px; background:#e5e7eb; border-radius:2px; margin: 12px auto 0;"></div>

            <!-- Close Button -->
            <button id="silver-modal-close" style="
                position:absolute; top:12px; right:16px;
                background:#f3f4f6; border:none; width:32px; height:32px;
                border-radius:50%; cursor:pointer; font-size:18px; color:#6b7280;
                display:flex; align-items:center; justify-content:center;
            ">&times;</button>

            <!-- Premium Silver Header -->
            <div style="
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
                margin: 20px 20px 0; border-radius: 20px; padding: 28px 24px;
                color: white; text-align: center; position: relative; overflow: hidden;
                box-shadow: 0 12px 30px -5px rgba(139,92,246,0.5);
            ">
                <!-- Decorative BG -->
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; opacity:0.07;
                    background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ctext x=%220%22 y=%2240%22 font-size=%2230%22%3E🌟%3C/text%3E%3C/svg%3E');
                    pointer-events:none;">
                </div>

                <!-- Badge -->
                <div style="background:rgba(255,255,255,0.2); display:inline-block; padding:4px 14px;
                    border-radius:20px; font-size:0.65rem; font-weight:700; letter-spacing:1.5px;
                    text-transform:uppercase; margin-bottom:12px;">
                    ⭐ OFERTA EXCLUSIVA · MISIÓN 6
                </div>

                <!-- Icon + Title -->
                <div style="font-size:56px; margin-bottom:8px;">🌟</div>
                <h2 style="margin:0 0 6px; font-size:1.5rem; font-weight:900;">Piggy Silver</h2>
                <p style="margin:0; font-size:0.85rem; opacity:0.9; line-height:1.4;">
                    Tu recompensa especial por llegar hasta aquí.<br>
                    <strong>+1% adicional</strong> en tu Margen Comercial.
                </p>

                <!-- Countdown -->
                <div id="silver-countdown-wrapper" style="
                    background: rgba(0,0,0,0.25); border-radius: 14px;
                    padding: 12px 20px; margin-top: 16px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                ">
                    <span style="font-size:18px;">⏳</span>
                    <div>
                        <div style="font-size:0.65rem; opacity:0.8; text-align:center; letter-spacing:1px; text-transform:uppercase;">Oferta disponible por</div>
                        <div id="silver-countdown-time" style="font-size:1.3rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
                            ${String(timeData.hours).padStart(2,'0')}h ${String(timeData.minutes).padStart(2,'0')}m
                        </div>
                    </div>
                </div>

                <!-- Big decoration -->
                <div style="position:absolute; bottom:-20px; right:-10px; font-size:80px; opacity:0.12; transform:rotate(-15deg);">🐷</div>
            </div>

            <!-- Body -->
            <div style="padding: 20px 20px 0;">

                <!-- Benefit pill -->
                <div style="
                    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                    border: 1px solid #a7f3d0; border-radius: 12px;
                    padding: 10px 16px; margin-bottom: 20px;
                    display: flex; align-items: center; gap: 10px;
                ">
                    <span style="font-size:22px;">📈</span>
                    <div>
                        <div style="font-weight:700; color:#065f46; font-size:0.85rem;">Beneficio exclusivo incluido</div>
                        <div style="font-size:0.75rem; color:#047857;">+1% adicional sobre tu ROI base de granja.</div>
                    </div>
                </div>

                <!-- Name Input -->
                <div style="margin-bottom: 16px;">
                    <label style="font-size:0.8rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">
                        Ponle un nombre a tu Piggy Silver
                    </label>
                    <input type="text" id="silver-piggy-name"
                        placeholder="Nombre del Piggy Silver..."
                        autocomplete="off"
                        style="
                            width: 100%; padding: 14px 16px; box-sizing: border-box;
                            border: 2px solid #e0e7ff; border-radius: 14px;
                            font-size: 1rem; font-weight: 600; color: #1f2937;
                            outline: none; text-align: center; transition: all 0.2s;
                        "
                        onfocus="this.style.borderColor='#6366f1'; this.style.boxShadow='0 0 0 4px rgba(99,102,241,0.1)';"
                        onblur="this.style.borderColor='#e0e7ff'; this.style.boxShadow='none';"
                    />
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; justify-content:center;">
                        ${shuffled.map(n => `
                            <button onclick="window._silverSelectName('${n}')" style="
                                background:#f5f3ff; color:#6d28d9; border:1px solid #ede9fe;
                                padding:6px 14px; border-radius:20px; font-size:0.82rem;
                                font-weight:600; cursor:pointer; transition:transform 0.1s;
                            ">${n}</button>
                        `).join('')}
                    </div>
                    <div id="silver-name-error" style="opacity:0; color:#6366f1; font-size:0.75rem; text-align:center; margin-top:8px;">
                        * Escribe al menos 3 caracteres
                    </div>
                </div>

                <!-- Wallet / Purchase Section -->
                <div id="silver-wallet-section" style="opacity:0.5; pointer-events:none; transition:opacity 0.3s;">
                    <!-- Balance -->
                    <div id="silver-balance-card" style="
                        background: linear-gradient(135deg, #6366f1, #4f46e5);
                        border-radius: 14px; padding: 16px 20px; margin-bottom: 12px;
                        color: white; display: flex; align-items: center; justify-content: space-between;
                    ">
                        <div>
                            <div style="font-size:0.72rem; opacity:0.8; margin-bottom:2px;">Saldo en tu Wallet</div>
                            <div id="silver-balance-display" style="font-size:1.5rem; font-weight:800;">
                                <span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>
                            </div>
                        </div>
                        <div style="font-size:40px; opacity:0.3;">💰</div>
                    </div>

                    <!-- Insufficient funds notice -->
                    <div id="silver-insufficient" style="
                        background:#fef2f2; border:1px solid #fecaca; border-radius:10px;
                        padding:10px 14px; font-size:0.8rem; color:#dc2626; text-align:center;
                        margin-bottom:10px; display:none;
                    ">
                        Saldo insuficiente. Recarga tu Wallet para continuar.
                    </div>

                    <!-- Price Row -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 4px; margin-bottom:12px;">
                        <span style="font-size:0.85rem; color:#6b7280;">Precio Piggy Silver</span>
                        <span style="font-size:1.1rem; font-weight:800; color:#6366f1;">${SILVER_PIGGY_ITEM.priceFormatted}</span>
                    </div>

                    <!-- Confirm Button -->
                    <button id="silver-confirm-btn" style="
                        width: 100%; background: linear-gradient(135deg, #6366f1, #4f46e5);
                        color: white; border: none; padding: 15px;
                        border-radius: 14px; font-weight: 700; font-size: 1rem; cursor: pointer;
                        box-shadow: 0 6px 20px -4px rgba(99,102,241,0.4); transition: all 0.2s;
                        opacity: 0.5; pointer-events: none; display: flex;
                        align-items: center; justify-content: center; gap: 8px;
                    ">
                        🌟 Comprar mi Piggy Silver
                    </button>
                </div>

                <!-- Footer security -->
                <div style="text-align:center; margin-top:16px; color:#9ca3af; font-size:0.72rem;">
                    🔒 Transacción segura · Cifrado SSL
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // ── Logic ────────────────────────────────────────────────
    const nameInput     = document.getElementById('silver-piggy-name');
    const walletSection = document.getElementById('silver-wallet-section');
    const balanceDisplay= document.getElementById('silver-balance-display');
    const insufficient  = document.getElementById('silver-insufficient');
    const confirmBtn    = document.getElementById('silver-confirm-btn');
    const nameError     = document.getElementById('silver-name-error');
    let currentBalance  = 0;

    // Load balance
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
        const fundsOk = currentBalance >= SILVER_PIGGY_ITEM.price;

        walletSection.style.opacity     = nameOk ? '1'    : '0.5';
        walletSection.style.pointerEvents = nameOk ? 'auto' : 'none';
        insufficient.style.display      = (nameOk && !fundsOk) ? 'block' : 'none';

        const canBuy = nameOk && fundsOk;
        confirmBtn.style.opacity       = canBuy ? '1'    : '0.5';
        confirmBtn.style.pointerEvents = canBuy ? 'auto' : 'none';

        nameError.style.opacity = (nameVal.length > 0 && !nameOk) ? '1' : '0';
        nameInput.style.borderColor = nameOk ? '#6366f1' : (nameVal.length > 0 ? '#e0e0e0' : '#e0e7ff');
    };

    nameInput.addEventListener('input', () => updateState(nameInput.value.trim()));

    window._silverSelectName = (name) => {
        nameInput.value = name;
        updateState(name);
        nameInput.focus();
    };

    // Countdown in modal
    _countdownInterval = setInterval(() => {
        const t = getRemainingTime(silverExpiry);
        const el = document.getElementById('silver-countdown-time');
        if (el) {
            if (t.expired) {
                el.textContent = '¡Oferta vencida!';
                clearInterval(_countdownInterval);
            } else {
                el.textContent = `${String(t.hours).padStart(2,'0')}h ${String(t.minutes).padStart(2,'0')}m`;
            }
        } else {
            clearInterval(_countdownInterval);
        }
    }, 30000); // update every 30s

    // Close
    const close = () => {
        document.body.style.overflow = '';
        delete window._silverSelectName;
        if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
        modal.remove();
    };

    document.getElementById('silver-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // Confirm Purchase
    confirmBtn.addEventListener('click', async () => {
        const customName = nameInput.value.trim();
        if (customName.length < 3 || currentBalance < SILVER_PIGGY_ITEM.price) return;

        confirmBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Procesando...';
        confirmBtn.style.pointerEvents = 'none';

        try {
            // ── CRÍTICO: Descontar wallet PRIMERO antes de crear el piggy ──
            const deductResult = await deductWalletBalance(SILVER_PIGGY_ITEM.price);
            if (!deductResult.success) {
                throw new Error(
                    deductResult.reason === 'insufficient_balance'
                        ? 'Saldo insuficiente en tu Wallet.'
                        : 'No se pudo procesar el pago. Intenta de nuevo.'
                );
            }

            // Wallet descontada ✅ — ahora crear el piggy
            await buyMarketplaceItem(SILVER_PIGGY_ITEM, customName);

            close();
            navigateTo('granja');
        } catch (error) {
            console.error('Silver piggy purchase error:', error);
            alert('Error en la transacción: ' + error.message);
            confirmBtn.innerHTML = '🌟 Comprar mi Piggy Silver';
            confirmBtn.style.pointerEvents = 'auto';
        }
    });
}
