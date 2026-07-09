/* ============================================
   PIGGY APP — Support / Contact Modal
   Customer service modal accessible from Granja
   ============================================ */

/**
 * SVG headset icon (line/stroke style) for reuse in buttons and modal.
 * Matches the stroke-based aesthetic of the bottom nav icons.
 */
export const HEADSET_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z"/>
  <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"/>
</svg>`;

/** WhatsApp support number */
const SUPPORT_PHONE = '573154870448';

/**
 * Build a WhatsApp link with a given message.
 * @param {string} message - Pre-filled message text
 * @returns {string} Full wa.me URL
 */
function buildWhatsAppLink(message) {
  return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
}

/**
 * Show the support / contact modal.
 * Design mirrors the user's reference image: headset icon, title,
 * two action rows, and entity footer.
 */
export function showSupportModal() {
  // Remove existing
  const existing = document.getElementById('support-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'support-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in" style="position: relative; max-width:420px; max-height:90vh; overflow-y:auto; padding: 32px 24px 24px;">
      <div class="modal__handle"></div>
      <button class="bonus-close" id="support-modal-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer; z-index:3;">&times;</button>

      <!-- Headset Icon (large, colored) -->
      <div style="text-align:center; margin-bottom:24px;">
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto;
          color: #3b5998;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="80" height="80">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z"/>
            <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"/>
          </svg>
        </div>
      </div>

      <!-- Title -->
      <h3 style="margin:0 0 10px 0; font-size:1.45rem; font-weight:800; color:#111827; text-align:center;">
        ¿Necesitas ayuda?
      </h3>

      <!-- Subtitle -->
      <p style="margin:0 0 28px 0; font-size:0.88rem; color:#6b7280; text-align:center; line-height:1.5;">
        Clara responde al instante — dudas, transferencias, estado de tu cuenta y más.
      </p>

      <!-- Action Rows -->
      <div style="
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        overflow: hidden;
        margin-bottom: 28px;
      ">
        <!-- Row 1: Habla con Clara IA -->
        <button id="btn-support-talk" style="
          width: 100%;
          background: white;
          border: none;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background 0.15s;
          font-family: inherit;
        " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
          <span style="font-size:0.95rem; font-weight:600; color:#111827;">Habla con Clara IA</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <!-- Divider -->
        <div style="height:1px; background:#f3f4f6; margin:0 16px;"></div>

        <!-- Row 2: ¿Qué puede hacer Clara? -->
        <button id="btn-support-info" style="
          width: 100%;
          background: white;
          border: none;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background 0.15s;
          font-family: inherit;
        " onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
          <span style="font-size:0.95rem; font-weight:600; color:#111827;">¿Qué puede hacer Clara?</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <!-- Entity Footer -->
      <p style="margin:0; font-size:0.72rem; color:#9ca3af; text-align:center; line-height:1.4;">
        Nuestro centro de atención está operado bajo la entidad <strong style="color:#6b7280;">Granja Valle Morales SAS</strong>
      </p>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const close = () => modal.remove();
  document.getElementById('support-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Action: Habla con Clara IA → WhatsApp
  document.getElementById('btn-support-talk')?.addEventListener('click', () => {
    const link = buildWhatsAppLink('Hola Clara \ud83d\udc4b, necesito ayuda con mi cuenta en Piggy App.');
    window.open(link, '_blank');
  });

  // Action: ¿Qué puede hacer Clara? → WhatsApp
  document.getElementById('btn-support-info')?.addEventListener('click', () => {
    const link = buildWhatsAppLink('Hola Clara, \u00bfqu\u00e9 servicios puedes ofrecerme en Piggy App?');
    window.open(link, '_blank');
  });
}
