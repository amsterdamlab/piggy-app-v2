/* ============================================
   PIGGY APP — Lightweight Floating Toast System
   Displays smooth, non-intrusive status alerts.
   ============================================ */

/**
 * Show a floating toast notification.
 * @param {string} message - Text to display
 * @param {Object} [options]
 * @param {'success' | 'error' | 'info'} [options.type='success']
 * @param {number} [options.duration=3500] - Duration in ms
 */
export function showToast(message, { type = 'success', duration = 3500 } = {}) {
    // Remove existing toast if any
    const existing = document.getElementById('piggy-global-toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'piggy-global-toast';
    toast.style.position = 'fixed';
    toast.style.top = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    toast.style.zIndex = '9999999';
    toast.style.maxWidth = '90vw';
    toast.style.width = 'max-content';
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '9999px';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.boxShadow = '0 10px 30px -5px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.webkitBackdropFilter = 'blur(10px)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.pointerEvents = 'none';

    let bg = 'rgba(15, 23, 42, 0.92)';
    let textColor = '#f8fafc';
    let iconSvg = '';

    if (type === 'success') {
        iconSvg = `
            <div style="width:22px; height:22px; border-radius:50%; background:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        `;
    } else if (type === 'error') {
        iconSvg = `
            <div style="width:22px; height:22px; border-radius:50%; background:#ef4444; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>
        `;
    } else {
        iconSvg = `
            <div style="width:22px; height:22px; border-radius:50%; background:#3b82f6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            </div>
        `;
    }

    toast.style.background = bg;
    toast.innerHTML = `
        ${iconSvg}
        <span style="font-size:0.86rem; font-weight:700; color:${textColor}; line-height:1.3;">${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Auto dismiss
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 350);
    }, duration);
}
