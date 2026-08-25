/**
 * Reusable vertical loading component with Piggy logo, spinner, and name.
 * 
 * @param {string} message - Message to display below loader.
 * @returns {string} HTML string for the loader.
 */
export function renderPiggyLoader(message = 'Cargando...') {
  return `
    <div class="piggy-loader animate-fade-in" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px 20px;
      width: 100%;
      text-align: center;
      gap: 12px;
    ">
      <div style="
        width: 72px;
        height: 72px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img 
          src="/piggy-loading-logo.png" 
          alt="Piggy Logo" 
          style="
            width: 100%;
            height: 100%;
            object-fit: contain;
            animation: pulse-logo 2s infinite ease-in-out;
          "
          onerror="this.onerror=null; this.src='/piggyapp_logo1.png';"
        />
      </div>
      <div class="spinner" style="width: 28px; height: 28px; border-width: 2.5px;"></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
        <span style="font-size: 1.1rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Piggy</span>
        <span style="font-size: 0.82rem; font-weight: 600; color: #64748b;">${message}</span>
      </div>
    </div>
  `;
}
