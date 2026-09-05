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
    const raw = window.location.hash.slice(2) || 'auth';
    const noQuery = raw.split('?')[0];
    return noQuery.split('/')[0];
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

    // Auth and Descargar pages are always accessible
    if (route === 'descargar') {
        return true;
    }

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
 * Smoothly scroll viewport and page containers to top.
 */
export function scrollToTop(smooth = true) {
    const behavior = smooth ? 'smooth' : 'auto';

    // 1. Primary window scroll
    try {
        window.scrollTo({ top: 0, left: 0, behavior });
    } catch (e) {
        window.scrollTo(0, 0);
    }

    // 2. Element fallbacks
    if (!smooth) {
        if (document.scrollingElement) {
            document.scrollingElement.scrollTop = 0;
        }
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }

    // 3. Scroll any inner container that has active scroll
    const scrollContainers = document.querySelectorAll(
        '#ui-shell, #app, .page, .page__content, .granja-page, .mercado-page, .aliados-page, .gourmet-page, .profile-page, .section'
    );
    scrollContainers.forEach((el) => {
        if (el && el.scrollTop > 0) {
            try {
                if (typeof el.scrollTo === 'function') {
                    el.scrollTo({ top: 0, left: 0, behavior });
                } else {
                    el.scrollTop = 0;
                }
            } catch (e) {
                el.scrollTop = 0;
            }
        }
    });
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

    // Reset scroll on view change
    scrollToTop(false);

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

    // Scroll to top when tapping the current active bottom-nav tab without reloading
    const handleNavClick = (e) => {
        const navLink = e.target.closest('.bottom-nav__item, [data-nav-tab]');
        if (!navLink) return;

        const href = navLink.getAttribute('href') || '';
        const targetRoute = href.replace(/^#\/?/, '').split('?')[0].split('/')[0].toLowerCase();
        const currentRoute = getCurrentRoute().toLowerCase();
        const isActive = navLink.classList.contains('bottom-nav__item--active') || (targetRoute && targetRoute === currentRoute);

        if (isActive) {
            e.preventDefault();
            e.stopPropagation();
            scrollToTop(true);
        }
    };

    document.addEventListener('click', handleNavClick, { capture: true });

    // Handle initial route
    handleRouteChange();
}
