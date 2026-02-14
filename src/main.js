/* ============================================
   PIGGY APP — Main Entry Point
   Initializes the SPA and wires up all modules
   ============================================ */

// Styles
import './styles/global.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/granja.css';
import './styles/mercado.css';
import './styles/aliados.css';
import './styles/piggy-detail.css';

// Core
import { AppState } from './state.js';
import { registerRoute, initRouter, navigateTo } from './router.js';
import { initSupabase } from './services/supabase.js';
import { checkSession } from './services/authService.js';

// Views
import { renderAuthView } from './views/AuthView.js';
import { renderGranjaView } from './views/GranjaView.js';
import { renderMercadoView } from './views/MercadoView.js';
import { renderAliadosView } from './views/AliadosView.js';
import { renderPiggyDetailView } from './views/PiggyDetailView.js';

// Components
import { renderLegalModal, removeLegalModal } from './components/LegalModal.js';

/**
 * Boot the application.
 */
async function boot() {
    console.log('🐷 Piggy App — Booting...');

    // Show loading screen
    showLoadingScreen();

    // Initialize Supabase
    await initSupabase();

    // Register routes
    registerRoute('auth', renderAuthView);
    registerRoute('granja', renderGranjaView);
    registerRoute('mercado', renderMercadoView);
    registerRoute('aliados', renderAliadosView);
    registerRoute('piggy', renderPiggyDetailView);

    // Subscribe to state changes for legal modal
    AppState.subscribe((state, previous) => {
        if (state.showLegalModal && !previous.showLegalModal) {
            renderLegalModal();
        }
        if (!state.showLegalModal && previous.showLegalModal) {
            removeLegalModal();
        }
    });

    // Check existing session
    await checkSession();

    // Start router
    initRouter();

    console.log('🐷 Piggy App — Ready!');
}

/**
 * Show a loading screen while the app boots.
 */
function showLoadingScreen() {
    const app = document.getElementById('app');
    app.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      gap: 16px;
      color: var(--color-primary);
    ">
      <div style="font-size: 48px;">🐷</div>
      <div class="spinner"></div>
      <div style="
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        font-weight: var(--font-medium);
      ">
        Cargando Piggy App...
      </div>
    </div>
  `;
}

// Start the app
boot().catch((error) => {
    console.error('🐷 Critical boot error:', error);
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100dvh;
        gap: 16px;
        padding: 24px;
        text-align: center;
      ">
        <div style="font-size: 48px;">😢</div>
        <h2>Error al cargar la aplicación</h2>
        <p style="color: var(--color-text-muted); font-size: var(--text-sm);">
          Por favor recarga la página. Si el problema persiste, contacta soporte.
        </p>
        <button class="btn btn--primary" onclick="location.reload()">
          Recargar
        </button>
      </div>
    `;
    }
});
