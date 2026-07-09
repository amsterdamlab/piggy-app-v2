/**
 * Reusable loading component with logo, spinner, and message.
 * 
 * @param {string} message - Message to display below loader.
 * @param {object} options - Custom style options.
 * @returns {string} HTML string for the loader.
 */
export function renderPiggyLoader(message = 'Cargando...', options = {}) {
  const size = options.size || '80px';
  const spinnerSize = options.spinnerSize || '30px';
  return `
    <div class="loading-container piggy-loader" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 40px 20px;
      width: 100%;
    ">
      <img src="/piggy-loading-logo.png" style="
        width: ${size};
        height: ${size};
        object-fit: contain;
        animation: pulse-logo 2s infinite ease-in-out;
      " alt="Piggy Logo" onerror="this.onerror=null; this.src='pig2.jpg';" />
      <div class="spinner" style="width: ${spinnerSize}; height: ${spinnerSize};"></div>
      <span style="
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        font-weight: 500;
      ">${message}</span>
    </div>
  `;
}
