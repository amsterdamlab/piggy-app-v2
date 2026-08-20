/* ============================================
   PIGGY APP — Signature Modal Component
   Responsive HTML5 Canvas for touch & mouse signatures
   ============================================ */

import { renderIcon } from '../icons.js';

/**
 * Open the Signature Pad Modal.
 * @param {Object} options
 * @param {string} options.userName - Name to display
 * @param {string} options.userCedula - ID to display
 * @param {Function} options.onConfirm - Callback with signature PNG data URL
 * @param {Function} [options.onCancel] - Callback when user cancels
 */
export function openSignatureModal({ userName, userCedula, onConfirm, onCancel }) {
    const existing = document.getElementById('signature-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'signature-modal';
    modal.className = 'modal-overlay animate-fade-in';
    modal.style.zIndex = '10000';

    modal.innerHTML = `
        <div class="modal signature-modal-card animate-scale-in" style="
            max-width: 480px;
            width: 92%;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            position: relative;
        ">
            <!-- Top Close Button Bar -->
            <div style="
                padding: 16px 18px 0 18px;
                display: flex;
                align-items: center;
                justify-content: flex-end;
            ">
                <button id="btn-close-signature" style="
                    background: #f1f5f9;
                    border: none;
                    cursor: pointer;
                    color: #64748b;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#e2e8f0'; this.style.color='#0f172a';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b';">
                    ${renderIcon('close', '', '18')}
                </button>
            </div>

            <!-- Body -->
            <div style="padding: 10px 20px 20px 20px;">
                
                <!-- Buyer Info -->
                <div style="
                    font-size: 0.88rem;
                    color: #1e293b;
                    margin-bottom: 14px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 12px 16px;
                    line-height: 1.5;
                ">
                    <div><strong>Comprador:</strong> ${userName}</div>
                    <div style="margin-top:2px;"><strong>C.C.:</strong> ${userCedula}</div>
                </div>

                <!-- Canvas Box -->
                <div style="
                    position: relative;
                    border: 2px dashed #cbd5e1;
                    border-radius: 14px;
                    background: #ffffff;
                    touch-action: none;
                    user-select: none;
                    margin-bottom: 12px;
                ">
                    <canvas id="signature-canvas" style="
                        width: 100%;
                        height: 180px;
                        display: block;
                        cursor: crosshair;
                        border-radius: 12px;
                    "></canvas>
                    
                    <div id="canvas-placeholder" style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: #94a3b8;
                        font-size: 0.85rem;
                        pointer-events: none;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <span>🖊️</span> Dibuja aquí con tu dedo o mouse
                    </div>
                </div>

                <!-- Canvas Actions -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px;">
                    <span style="font-size:0.75rem; color:#94a3b8;">Línea base para firma electrónica</span>
                    <button type="button" id="btn-clear-canvas" style="
                        background: #f1f5f9;
                        color: #475569;
                        border: none;
                        padding: 6px 14px;
                        border-radius: 8px;
                        font-size: 0.78rem;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        transition: all 0.2s;
                    ">
                        🗑️ Limpiar
                    </button>
                </div>

                <!-- Confirm Button -->
                <button type="button" id="btn-accept-signature" style="
                    width: 100%;
                    background: linear-gradient(135deg, #10B981, #059669);
                    color: white;
                    border: none;
                    padding: 14px 20px;
                    border-radius: 12px;
                    font-weight: 800;
                    font-size: 0.95rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
                    transition: all 0.2s;
                ">
                    ✓ Aceptar y Aplicar Firma
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const canvas = document.getElementById('signature-canvas');
    const placeholder = document.getElementById('canvas-placeholder');
    const clearBtn = document.getElementById('btn-clear-canvas');
    const closeBtn = document.getElementById('btn-close-signature');
    const acceptBtn = document.getElementById('btn-accept-signature');

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;

    // Resize canvas to its real display size
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#111827';
    }

    // Initialize resolution
    setTimeout(resizeCanvas, 50);

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        hasDrawn = true;
        if (placeholder) placeholder.style.display = 'none';
        const coords = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const coords = getCoords(e);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }

    function stopDrawing(e) {
        if (isDrawing) {
            e?.preventDefault();
            isDrawing = false;
            ctx.closePath();
        }
    }

    // Touch events for mobile
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });

    // Mouse events for desktop
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Clear
    clearBtn.addEventListener('click', () => {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        hasDrawn = false;
        if (placeholder) placeholder.style.display = 'flex';
    });

    // Close
    const close = () => {
        modal.remove();
        if (onCancel) onCancel();
    };

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    // Accept
    acceptBtn.addEventListener('click', () => {
        if (!hasDrawn) {
            alert('Por favor dibuja tu firma en el recuadro antes de continuar.');
            return;
        }

        // Export as PNG
        const signatureDataUrl = canvas.toDataURL('image/png');
        modal.remove();
        if (onConfirm) onConfirm(signatureDataUrl);
    });
}
