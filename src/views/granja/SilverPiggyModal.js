/* ============================================
   PIGGY APP — Silver Piggy Modal (M6 / Flash)
   Presents the time-limited 72h Silver Piggy
   exclusive offer with 72h countdown and custom name.
   ============================================ */

import { navigateTo } from '../../router.js';
import { getWalletBalance } from '../../services/walletService.js';
import { formatCOP } from '../../services/mockData.js';
import { deductWalletBalance } from '../../services/walletService.js';
import { buySilverPiggy } from '../../services/flashMissionsService.js';
import { openWalletDrawer } from './WalletBlock.js';

let _countdownInterval = null;

function formatCountdown(remainingMs) {
    if (remainingMs <= 0) return '00h 00m 00s';
    const hours   = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function closeSilverModal() {
    if (_countdownInterval) {
        clearInterval(_countdownInterval);
        _countdownInterval = null;
    }
    const modal = document.getElementById('silver-piggy-modal');
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
 * Show the Silver Piggy Flash Offer modal.
 * @param {Object} options
 * @param {Date|number} options.expiresAt - Expiration timestamp (72h from trigger)
 * @param {number} options.price - Purchase price (default 1,000,000 COP)
 * @param {number} options.extraRoiBonus - Extra ROI bonus (default 0.01 = +1%)
 */
export async function showSilverPiggyModal({ expiresAt = null, price = 1000000, extraRoiBonus = 0.01 } = {}) {
    closeSilverModal();

    // Default expiry: 72 hours from now if not specified
    const targetExpiry = expiresAt
        ? new Date(expiresAt).getTime()
        : Date.now() + 72 * 3600 * 1000;

    let remaining = Math.max(0, targetExpiry - Date.now());
    if (remaining <= 0) {
        console.warn('Oferta Piggy Plus expirada.');
        return;
    }

    const baseROI         = 0.115;
    const totalROI        = baseROI + extraRoiBonus;
    const projectedReturn = price * (1 + totalROI);
    const defaultNames    = ['Platino', 'Silver', 'Flash', 'Rayo', 'Sterling', 'Cometa'];
    const names = defaultNames.sort(() => 0.5 - Math.random()).slice(0, 4);

    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'silver-piggy-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100dvh;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        z-index: 99999; display: flex; align-items: flex-end; justify-content: center;
    `;

    modal.innerHTML = `
        <div class="animate-fade-in-up" style="
            background: white; border-radius: 28px 28px 0 0;
            width: 100%; max-width: 480px; max-height: 90dvh;
            overflow-y: auto; -webkit-overflow-scrolling: touch;
            padding: 0 0 calc(40px + env(safe-area-inset-bottom, 0px)) 0;
            position: relative;
        ">
            <!-- Handle -->
            <div style="width:40px; height:4px; background:#e5e7eb; border-radius:2px; margin:14px auto 6px;"></div>

            <!-- Close -->
            <button id="silver-modal-close" style="
                position:absolute; top:16px; right:16px;
                background:#f3f4f6; border:none; width:32px; height:32px;
                border-radius:50%; cursor:pointer; font-size:18px; color:#6b7280;
                display:flex; align-items:center; justify-content:center;
                line-height:1; z-index:10;
            ">&times;</button>

            <!-- Plus/Silver Header -->
            <div style="
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%);
                margin: 8px 20px 0; border-radius: 20px; padding: 24px 20px;
                color: white; text-align: center; position: relative; overflow: hidden;
                box-shadow: 0 12px 30px -5px rgba(14,165,233,0.45);
            ">
                <div style="
                    background: rgba(255,255,255,0.22); display: inline-block;
                    padding: 4px 14px; border-radius: 20px; font-size: 0.65rem;
                    font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;
                ">
                    🌟 OFERTA FLASH · PIGGY PLUS
                </div>

                <div style="font-size: 56px; margin-bottom: 8px;">🌟</div>
                <h2 style="margin: 0 0 6px; font-size: 1.5rem; font-weight: 900;">
                    Piggy Plus (+1% ROI Extra)
                </h2>
                <p style="margin: 0; font-size: 0.85rem; opacity: 0.92; line-height: 1.4;">
                    Adquiere este Piggy especial con un <strong>+1% adicional</strong> en tu margen de comercialización.
                </p>

                <!-- Countdown Box -->
                <div style="
                    background: rgba(0,0,0,0.25); border-radius: 14px;
                    padding: 12px 20px; margin-top: 16px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                ">
                    <span style="font-size: 18px;">⏳</span>
                    <div>
                        <div style="font-size:0.65rem; opacity:0.8; letter-spacing:1px; text-transform:uppercase;">
                            Oferta disponible por
                        </div>
                        <div id="silver-countdown-time" style="font-size:1.3rem; font-weight:800; font-family:monospace; letter-spacing:2px;">
                            ${formatCountdown(remaining)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div style="padding: 20px 20px 0;">

                <!-- Exclusivity Banner -->
                <div style="
                    background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px;
                    padding: 12px 16px; display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
                ">
                    <span style="font-size: 20px; flex-shrink:0;">🔒</span>
                    <div style="font-size: 0.78rem; color: #0369a1; line-height: 1.35;">
                        <strong>Oportunidad Exclusiva.</strong> Desbloqueada por tu actividad en Granja. Solo disponible durante la cuenta regresiva.
                    </div>
                </div>

                <!-- Metrics Grid -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 16px;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:14px; text-align:center;">
                        <div style="font-size:0.7rem; color:#64748b; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Inversión</div>
                        <div style="font-size:1.15rem; font-weight:900; color:#0f172a;">${formatCOP(price)}</div>
                    </div>
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:14px; text-align:center;">
                        <div style="font-size:0.7rem; color:#15803d; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Retorno Estimado</div>
                        <div style="font-size:1.15rem; font-weight:900; color:#16a34a;">${formatCOP(projectedReturn)}</div>
                        <div style="font-size:0.65rem; color:#16a34a; font-weight:700;">12.5% margen total</div>
                    </div>
                </div>

                <!-- Name Input -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size:0.8rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">
                        Ponle un nombre a tu Piggy Plus:
                    </label>
                    <input
                        type="text"
                        id="silver-custom-name"
                        placeholder="Ej: ${names[0]}"
                        maxlength="20"
                        style="
                            width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb;
                            border-radius: 12px; font-size: 0.95rem; font-weight: 600;
                            outline: none; transition: border-color 0.2s; box-sizing: border-box;
                        "
                        onfocus="this.style.borderColor='#0284c7'"
                        onblur="this.style.borderColor='#e5e7eb'"
                    />
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                        <span style="font-size:0.72rem; color:#9ca3af; align-self:center;">Sugeridos:</span>
                        ${names.map(n => `
                            <button
                                type="button"
                                class="silver-name-chip"
                                data-name="${n}"
                                style="
                                    background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px;
                                    padding:3px 10px; font-size:0.75rem; font-weight:600; color:#475569;
                                    cursor:pointer;
                                "
                            >${n}</button>
                        `).join('')}
                    </div>
                </div>

                <!-- Balance / Error Container -->
                <div id="silver-modal-error" style="
                    display:none; background:#fef2f2; border:1px solid #fecaca; color:#b91c1c;
                    border-radius:10px; padding:10px 14px; font-size:0.8rem; margin-bottom:12px;
                "></div>

                <!-- CTA -->
                <button
                    id="btn-buy-silver-piggy"
                    class="btn-shine-7s"
                    style="
                        width: 100%; padding: 16px 20px;
                        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                        color: white; border: none; border-radius: 16px; font-size: 1rem;
                        font-weight: 800; cursor: pointer; display: flex; align-items: center;
                        justify-content: center; gap: 8px; box-shadow: 0 8px 20px -4px rgba(14,165,233,0.45);
                    "
                >
                    <span>🌟</span>
                    <span>Adquirir Piggy Plus (${formatCOP(price)})</span>
                </button>

            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Live countdown
    const countdownEl = document.getElementById('silver-countdown-time');
    _countdownInterval = setInterval(() => {
        remaining -= 1000;
        if (remaining <= 0) {
            clearInterval(_countdownInterval);
            _countdownInterval = null;
            if (countdownEl) countdownEl.textContent = '¡Oferta Finalizada!';
            return;
        }
        if (countdownEl) countdownEl.textContent = formatCountdown(remaining);
    }, 1000);

    // Close handlers
    document.getElementById('silver-modal-close').addEventListener('click', closeSilverModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSilverModal();
    });

    // Chips
    const nameInput = document.getElementById('silver-custom-name');
    modal.querySelectorAll('.silver-name-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (nameInput) {
                nameInput.value = chip.dataset.name;
                nameInput.focus();
            }
        });
    });

    // Buy handler
    document.getElementById('btn-buy-silver-piggy').addEventListener('click', async () => {
        const customName = (nameInput?.value || '').trim() || names[0];
        const errEl = document.getElementById('silver-modal-error');
        errEl.style.display = 'none';

        try {
            const balance = await getWalletBalance();
            if (balance < price) {
                errEl.innerHTML = `
                    Saldo insuficiente (${formatCOP(balance)}).
                    <br/><a href="javascript:void(0)" id="silver-recharge" style="color:#b91c1c; font-weight:700; text-decoration:underline;">Recarga tu Cuenta Agro aquí</a>
                `;
                errEl.style.display = 'block';
                document.getElementById('silver-recharge')?.addEventListener('click', () => {
                    closeSilverModal();
                    openWalletDrawer();
                });
                return;
            }

            const result = await buySilverPiggy(customName, price, extraRoiBonus);
            if (!result.success) {
                errEl.textContent = result.error || 'Error al procesar la adquisición.';
                errEl.style.display = 'block';
                return;
            }

            closeSilverModal();
            navigateTo('granja');
        } catch (err) {
            console.error('Error in buySilverPiggy:', err);
            errEl.textContent = 'Ocurrió un error inesperado.';
            errEl.style.display = 'block';
        }
    });
}
