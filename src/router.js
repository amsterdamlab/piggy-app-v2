/* ============================================
   PIGGY APP — Hash-based Router
   ============================================ */

import { AppState } from './state.js';
import { renderAuthView } from './views/AuthView.js';
import { renderGranjaView } from './views/GranjaView.js';
import { renderMercadoView } from './views/MercadoView.js';
import { renderAliadosView } from './views/AliadosView.js';
import { renderAdopcionView } from './views/AdopcionView.js';
import { renderPiggyGourmetView } from './views/PiggyGourmetView.js';
import { renderAdminView } from './views/AdminView.js';
import { renderProfileModal } from './views/granja/ProfileModal.js';
import { renderContractModal } from './views/granja/ContractModal.js';
import { renderCertificatesModal } from './views/granja/CertificatesModal.js';

// Route Definitions
const routes = {
    '/login': { render: renderAuthView, authRequired: false },
    '/granja': { render: renderGranjaView, authRequired: true },
    '/mercado': { render: renderMercadoView, authRequired: true },
    '/aliados': { render: renderAliadosView, authRequired: true },
    '/adopcion': { render: renderAdopcionView, authRequired: true },
    '/tienda': { render: renderPiggyGourmetView, authRequired: true },
    '/admin': { render: renderAdminView, authRequired: true, adminOnly: true },
};

let currentCleanup = null;

/**
 * Initialize hash-based router
 */
export function initRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
}

/**
 * Navigate to a specific route programmatically
 */
export function navigateTo(path) {
    if (window.location.hash !== `#${path}`) {
        window.location.hash = `#${path}`;
    } else {
        handleRouteChange();
    }
}

/**
 * Handle route changes based on current location hash
 */
export async function handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    // Cleanup previous view if needed
    if (typeof currentCleanup === 'function') {
        currentCleanup();
        currentCleanup = null;
    }

    // Default route logic
    let targetRoute = path;
    if (targetRoute === '/' || targetRoute === '') {
        targetRoute = AppState.user ? '/granja' : '/login';
    }

    // Check if route exists
    const route = routes[targetRoute];
    if (!route) {
        console.warn(`Route ${targetRoute} not found, redirecting to /granja`);
        navigateTo('/granja');
        return;
    }

    // Auth guard
    if (route.authRequired && !AppState.user) {
        console.log('Auth required, redirecting to /login');
        navigateTo('/login');
        return;
    }

    // Redirect logged-in users away from /login
    if (!route.authRequired && AppState.user && targetRoute === '/login') {
        navigateTo('/granja');
        return;
    }

    // Admin guard
    if (route.adminOnly && !AppState.profile?.is_admin) {
        console.warn('Admin route requested by non-admin, redirecting');
        navigateTo('/granja');
        return;
    }

    // Render the target view
    AppState.currentRoute = targetRoute;
    try {
        currentCleanup = route.render(params);
        handleModalDeepLinks(params);
    } catch (err) {
        console.error('Error rendering route:', err);
    }
}

/**
 * Handle modal deep links (e.g. ?modal=profile)
 */
function handleModalDeepLinks(params) {
    const modal = params.get('modal');
    if (!modal) return;

    setTimeout(() => {
        if (modal === 'profile') {
            renderProfileModal();
        } else if (modal === 'contrato') {
            const piggyId = params.get('piggyId');
            renderContractModal(piggyId);
        } else if (modal === 'certificados') {
            renderCertificatesModal();
        }
    }, 100);
}
