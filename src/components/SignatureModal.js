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
            padding: 20px;
            box-sizing: border-box;
        ">
            <!-- Close Button (No background circle, top-right) -->
            <button id="btn-close-signature" style="
                position: absolute;
                top: 14px;
                right: 14px;
                background: none;
                border: none;
                cursor: pointer;
                color: #64748b;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s;
                z-index: 10;
            " onmouseover="this.style.color='#0f172a';" onmouseout="this.style.color='#64748b';">
                ${renderIcon('close', '', '20')}
            </button>

            <!-- Buyer Info with Icons (Dark Gray) -->
            <div style="
                margin-top: 8px;
                margin-bottom: 14px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 12px 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
            ">
                <div style="display: flex; align-items: center; gap: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">
                    <span style="color: #475569; display: flex; align-items: center; flex-shrink: 0;">${renderIcon('user', '', '18')}</span>
                    <span style="word-break: break-word;">${userName}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; color: #334155; font-size: 0.9rem; font-weight: 600;">
                    <span style="color: #475569; display: flex; align-items: center; flex-shrink: 0;">${renderIcon('documentText', '', '18')}</span>
                    <span style="word-break: break-word;">${userCedula}</span>
                </div>
            </div>

            <!-- Canvas Box with Clear Button inside (bottom-right) -->
            <div style="
                position: relative;
                border: 2px dashed #cbd5e1;
                border-radius: 14px;
                background: #ffffff;
                touch-action: none;
                user-select: none;
                margin-bottom: 18px;
                width: 100%;
                box-sizing: border-box;
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

                <!-- Clear Button (Trash icon only, inside bottom-right) -->
                <button type="button" id="btn-clear-canvas" title="Limpiar firma" style="
                    position: absolute;
                    bottom: 10px;
                    right: 10px;
                    background: #f1f5f9;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    z-index: 5;
                " onmouseover="this.style.background='#fee2e2'; this.style.color='#ef4444'; this.style.borderColor='#fca5a5';" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'; this.style.borderColor='#e2e8f0';">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
                <span>Aplicar Firma</span>
            </button>
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
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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
