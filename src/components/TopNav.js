/* ============================================
   PIGGY APP — Top Navigation Component
   Universal header with logout functionality
   NOTE: TopNav is now hidden — controls moved
   to GranjaView greeting action bar.
   ============================================ */

import { renderIcon } from '../icons.js';
import { signOut } from '../services/authService.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/**
 * Render the TopNav component.
 * Now hidden — the greeting in GranjaView handles all actions.
 * We keep the function signature intact to avoid breaking the
 * AppState subscriber in main.js.
 */
export function renderTopNav() {
    const headerRoot = document.getElementById('header-root');
    if (!headerRoot) return;

    // Clear any previous content — we no longer render a visible nav
    headerRoot.innerHTML = '';
}

/**
 * Remove TopNav from DOM.
 */
export function removeTopNav() {
    const topNav = document.getElementById('top-nav');
    if (topNav) {
        topNav.remove();
    }
    // Also clear the header root to be thorough
    const headerRoot = document.getElementById('header-root');
    if (headerRoot) {
        headerRoot.innerHTML = '';
    }
}
