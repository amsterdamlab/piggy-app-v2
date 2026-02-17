/* ============================================
   PIGGY APP — Top Navigation Component
   Universal header with logout functionality
   ============================================ */

import { renderIcon } from '../icons.js';
import { signOut } from '../services/authService.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/**
 * Render the TopNav component.
 * It inserts itself into the app container if not present.
 */
export function renderTopNav() {
    const headerRoot = document.getElementById('header-root');
    if (!headerRoot) return;

    // Check if TopNav already exists
    let topNav = document.getElementById('top-nav');

    if (!topNav) {
        topNav = document.createElement('div');
        topNav.id = 'top-nav';
        topNav.className = 'top-nav animate-fade-in';
        headerRoot.appendChild(topNav);
    }

    const isAuthenticated = AppState.get('isAuthenticated');

    if (!isAuthenticated) {
        topNav.style.display = 'none';
        return;
    }

    topNav.style.display = 'flex';
    topNav.innerHTML = `
        <div class="top-nav__content">
            <div class="top-nav__logo" onclick="location.hash='#/granja'">
                <span class="top-nav__logo-icon">🐷</span>
                <span class="top-nav__logo-text">Piggy</span>
            </div>
            <button class="top-nav__logout" id="global-logout" aria-label="Cerrar sesión">
                ${renderIcon('logout', '', '20')}
            </button>
        </div>
    `;

    // Attach listener
    document.getElementById('global-logout')?.addEventListener('click', async () => {
        if (confirm('¿Cerrar sesión?')) {
            await signOut();
            navigateTo('auth');
        }
    });
}

/**
 * Remove TopNav from DOM.
 */
export function removeTopNav() {
    const topNav = document.getElementById('top-nav');
    if (topNav) {
        topNav.remove();
    }
}