/* ============================================
   PIGGY APP — Main Application Entry Point
   Initializes router, state, and services
   ============================================ */

import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/granja.css';
import './styles/piggy-detail.css';
import './styles/mercado.css';
import './styles/adopcion.css';
import './styles/contrato.css';
import './styles/aliados.css';

import { AppState } from './state.js';
import { initSupabase } from './services/supabase.js';
import { checkSession } from './services/authService.js';
import { registerRoute, initRouter, navigateTo } from './router.js';
import { renderPiggyLoader } from './components/PiggyLoader.js';

// Views
import { renderAuthView } from './views/AuthView.js';
import { renderGranjaView } from './views/GranjaView.js';
import { renderMercadoView } from './views/MercadoView.js';
import { renderAliadosView } from './views/AliadosView.js';
import { renderPiggyDetailView } from './views/PiggyDetailView.js';
import { renderAdopcionView } from './views/AdopcionView.js';
import { renderContratoView } from './views/ContratoView.js';
import { renderPiggyGourmetView } from './views/PiggyGourmetView.js';
import { renderReferidosView } from './views/ReferidosView.js';
import { renderProfileView } from './views/ProfileView.js';
import { renderDescargarView } from './views/DescargarView.js';
import { initPWAListener } from './services/pwaService.js';

/**
 * Show loading screen while checking session.
 */
function showLoadingScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page" style="justify-content:center; align-items:center;">
      ${renderPiggyLoader('Cargando Piggy App...', { size: '90px', spinnerSize: '36px' })}
    </div>
  `;
}

/**
 * Show legal terms modal (blocking overlay).
 */
function showLegalModal() {
  // Remove existing modal if any
  const existing = document.getElementById('legal-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'legal-modal-overlay';
  overlay.className = 'legal-modal-overlay';
  overlay.innerHTML = `
    <div class="legal-modal">
      <div class="legal-modal__header">
        <span class="legal-modal__icon">📜</span>
        <h2 class="legal-modal__title">Términos y Condiciones</h2>
      </div>
      <div class="legal-modal__body">
        <p>Para continuar utilizando <strong>Piggy App</strong>, debes aceptar nuestros Términos y Condiciones y la Política de Tratamiento de Datos (Habeas Data).</p>
        <div class="legal-modal__checkboxes">
          <label class="legal-modal__checkbox-label">
            <input type="checkbox" id="legal-terms-check" />
            <span>Acepto los <a href="#terms" class="auth-form__link" target="_blank">Términos y Condiciones</a></span>
          </label>
          <label class="legal-modal__checkbox-label">
            <input type="checkbox" id="legal-data-check" />
            <span>Acepto la <a href="#privacy" class="auth-form__link" target="_blank">Política de Habeas Data</a></span>
          </label>
        </div>
      </div>
      <div class="legal-modal__footer">
        <button class="btn btn--primary" id="btn-accept-legal" disabled>
          Aceptar y Continuar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const termsCheck = document.getElementById('legal-terms-check');
  const dataCheck = document.getElementById('legal-data-check');
  const acceptBtn = document.getElementById('btn-accept-legal');

  function updateBtn() {
    acceptBtn.disabled = !(termsCheck.checked && dataCheck.checked);
  }

  termsCheck.addEventListener('change', updateBtn);
  dataCheck.addEventListener('change', updateBtn);

  acceptBtn.addEventListener('click', async () => {
    acceptBtn.disabled = true;
    acceptBtn.textContent = 'Guardando...';

    const { acceptTerms } = await import('./services/authService.js');
    await acceptTerms();

    overlay.remove();
    AppState.set({ showLegalModal: false });
  });
}

/**
 * Bootstrap the application.
 */
async function boot() {
  console.log('🐷 Piggy App — Booting...');

  // Initialize PWA install prompt listener
  initPWAListener();

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
  registerRoute('adopcion', renderAdopcionView);
  registerRoute('contrato', renderContratoView);
  registerRoute('gourmet', renderPiggyGourmetView);
  registerRoute('tienda', renderPiggyGourmetView);
  registerRoute('referidos', renderReferidosView);
  registerRoute('perfil', renderProfileView);
  registerRoute('descargar', renderDescargarView);

  // Subscribe to state changes for modals and auth
  AppState.subscribe((state, previous) => {
    if (state.showLegalModal && !previous?.showLegalModal) {
      showLegalModal();
    }
  });

  // Check existing session
  await checkSession();

  // Start router
  initRouter();

  console.log('🐷 Piggy App — Ready!');
}

// Start the application
boot();
