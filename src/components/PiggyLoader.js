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
    <div class="piggy-loader" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; width: 100%; text-align: center;">
      <div style="position: relative; width: ${size}; height: ${size}; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
        <img 
          src="/piggyapp_logo1.png" 
          alt="Piggy App" 
          style="width: 100%; height: 100%; object-fit: contain; animation: float 3s ease-in-out infinite;" 
        />
        <div style="
          position: absolute; 
          width: calc(100% + ${spinnerSize}); 
          height: calc(100% + ${spinnerSize}); 
          border: 3px solid #fbcfe8; 
          border-top-color: #ec4899; 
          border-radius: 50%; 
          animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        "></div>
      </div>
      <p style="
        font-size: 0.95rem; 
        font-weight: 700; 
        color: #475569; 
        margin: 0; 
        letter-spacing: -0.01em;
      ">${message}</p>
    </div>
  `;
}
