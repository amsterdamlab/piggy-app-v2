/**
 * Reusable loading component with standard clean spinner and message.
 * 
 * @param {string} message - Message to display below loader.
 * @returns {string} HTML string for the loader.
 */
export function renderPiggyLoader(message = 'Cargando...') {
  return `
    <div class="loading-container">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>
  `;
}
