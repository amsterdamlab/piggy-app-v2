/**
 * Reusable vertical loading component with Piggy logo, spinner, and message.
 * Matches the original boot screen design.
 * 
 * @param {string} message - Message to display below loader.
 * @returns {string} HTML string for the loader.
 */
export function renderPiggyLoader(message = 'Cargando...') {
  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 16px;
      color: var(--color-primary);
      width: 100%;
    ">
      <img src="/piggy-loading-logo.png" style="
        width: 100px;
        height: 100px;
        object-fit: contain;
        animation: pulse-logo 2s infinite ease-in-out;
        margin-bottom: 4px;
      " alt="Piggy App" onerror="this.onerror=null; this.src='/pig2.jpg';" />
      <div class="spinner"></div>
      <div style="
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        font-weight: var(--font-medium);
      ">
        ${message}
      </div>
    </div>
  `;
}
