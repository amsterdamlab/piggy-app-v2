/* ==========================================================================
   PIGGY APP — Main Application Entry Point
   Initializes Supabase, Router, State, Bottom Navigation & Global UI.
   ========================================================================== */

import './styles/tokens.css';
import './styles/components.css';
import './styles/global.css';
import './styles/layout.css';

import { initSupabase } from './services/supabase.js';
import { initAuth, onAuthStateChange } from './services/authService.js';
import { AppState } from './state.js';
import { initRouter, navigateTo } from './router.js';
import { renderBottomNav, updateActiveTab } from './components/BottomNav.js';
import { renderHeader } from './components/Header.js';
import { showToast } from './components/Toast.js';

// Global error handler for uncaught promises (e.g. mock failures)
window.addEventListener('unhandledrejection', (event) => {
  console.warn('⚠️ Unhandled Promise Rejection:', event.reason);
  // Prevent default browser crash behavior if it's a known non-critical error
  if (event.reason?.message?.includes('mock') || event.reason?.message?.includes('network')) {
    event.preventDefault();
  }
});

/**
 * Bootstrap the entire application.
 */
async function boot() {
  console.log('🐷 Piggy App initializing...');

  // 1. Initialize Supabase client
  try {
    initSupabase();
  } catch (error) {
    console.warn('⚠️ Supabase init warning (continuing with offline/mock fallback):', error.message);
  }

  // 2. Setup state listeners for reactive UI updates
  setupStateSubscriptions();

  // 3. Render persistent shell (Header + Nav)
  renderHeader();
  renderBottomNav();

  // Show loading screen
  showLoadingScreen();

  // 4. Initialize Auth (fetches session + profile)
  try {
    await initAuth();
  } catch (error) {
    console.warn('⚠️ Auth init fallback:', error.message);
    AppState.set({ authLoading: false });
  }

  // 5. Listen for auth changes (login, logout, token refresh)
  onAuthStateChange((event, session) => {
    console.log('🔄 Auth state event:', event);

    if (event === 'SIGNED_OUT') {
      navigateTo('login');
      showToast('Sesión cerrada correctamente', 'info');
    }
  });

  // 6. Initialize Router (handles deep linking & initial route)
  initRouter();

  // 7. Register Service Worker for PWA (if supported)
  registerServiceWorker();

  console.log('🚀 Piggy App ready!');
}

/**
 * Subscribe to state changes to update the UI reactively.
 */
function setupStateSubscriptions() {
  // Update bottom nav active state on route changes
  AppState.subscribe('currentRoute', (route) => {
    updateActiveTab(route);
  });

  // Re-render header when user profile changes
  AppState.subscribe('profile', () => {
    renderHeader();
  });

  // Listen for global toasts
  AppState.subscribe('toast', (toast) => {
    if (toast) {
      showToast(toast.message, toast.type, toast.duration);
    }
  });
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
      <img src="/piggy-loading-logo.png" style="
        width: 120px;
        height: 120px;
        object-fit: contain;
        animation: pulse-logo 2s infinite ease-in-out;
        margin-bottom: 8px;
      " alt="Piggy App" onerror="this.onerror=null; this.src='pig2.jpg';" />
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
        color: var(--color-primary);
        text-align: center;
        padding: 24px;
      ">
        <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text);">
          Algo no salió como esperábamos
        </h2>
        <p style="color: var(--color-text-muted); max-width: 360px;">
          Por favor recarga la página para intentar nuevamente.
        </p>
        <button class="btn btn--primary" onclick="window.location.reload()">
          Recargar App
        </button>
      </div>
    `;
  }
});

/**
 * Register the PWA Service Worker for offline capabilities and caching.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('📦 ServiceWorker registered:', reg.scope))
        .catch((err) => console.warn('⚠️ ServiceWorker registration failed:', err));
    });
  }
}
