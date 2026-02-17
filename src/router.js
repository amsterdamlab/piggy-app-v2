/* ============================================
   PIGGY APP — SPA Router
   Hash-based routing with auth guard
   ============================================ */

import { AppState } from './state.js';

const routes = {};
let currentCleanup = null;

/**
 * Register a route handler.
 * @param {string} path - Route path (e.g., 'auth', 'granja')
 * @param {Function} handler - Function that renders the view. Returns a cleanup function or null.
 */
export function registerRoute(path, handler) {
    routes[path] = handler;
}

/**
 * Navigate to a route.
 * @param {string} path - The route to navigate to
 */
export function navigateTo(path) {
    window.location.hash = `#/${path}`;
}

/**
 * Get current route from hash.
 * @returns {string} The current route path
 */
function getCurrentRoute() {
    const hash = window.location.hash.slice(2) || 'auth';
    return hash.split('/')[0];
}

/**
 * Get route parameter (e.g., piggy ID from #/piggy/123).
 * @returns {string|null} The parameter value or null
 */
export function getRouteParam() {
    const parts = window.location.hash.slice(2).split('/');
    return parts.length > 1 ? parts[1] : null;
}

/**
 * Auth guard: checks if user can access the route.
 * - Unauthenticated users → redirect to auth
 * - Users without accepted terms → show legal modal
 */
function authGuard(route) {
    const state = AppState.getState();

    // Auth page is always accessible
    if (route === 'auth') {
        // If already authenticated, redirect to granja
        if (state.isAuthenticated) {
            navigateTo('granja');
            return false;
        }
        return true;
    }

    // All other routes require authentication
    if (!state.isAuthenticated) {
        navigateTo('auth');
        return false;
    }

    // For existing users who haven't accepted terms (edge case)
    if (state.profile && !state.profile.terms_accepted) {
        AppState.set({ showLegalModal: true });
    }

    return true;
}

/**
 * Handle route changes.
 */
function handleRouteChange() {
    const route = getCurrentRoute();

    // Run auth guard
    if (!authGuard(route)) return;

    // Cleanup previous view
    if (currentCleanup) {
        currentCleanup();
        currentCleanup = null;
    }

    // Find and execute route handler
    const handler = routes[route];
    if (handler) {
        AppState.set({ currentView: route, activeTab: route });
        currentCleanup = handler() || null;
    } else {
        // Default fallback
        navigateTo('auth');
    }
}

/**
 * Initialize the router.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleRouteChange);

    // Handle initial route
    handleRouteChange();
}
