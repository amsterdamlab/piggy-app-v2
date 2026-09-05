/* ============================================
   PIGGY APP — Main Application Entry Point
   ============================================ */

import { initRouter, navigateTo } from './router.js';
import { AppState } from './state.js';
import { setupAuthListener } from './services/authService.js';
import { initFlashMissionsTicker } from './services/flashMissionsService.js';
import { showCategoryInfo } from './components/CategoryInfoModal.js';
import { showTermsModal } from './components/TermsModal.js';

// Expose showCategoryInfo globally so inline onclick handlers in cards can use it
window.showCategoryInfo = showCategoryInfo;
window.showTermsModal = showTermsModal;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🐷 Piggy App initializing...');

    // 1. Initialize Auth state listener
    setupAuthListener();

    // 2. Initialize Routing system
    initRouter();

    // 3. Setup Global UI Event Listeners
    setupGlobalListeners();

    // 4. Start Flash Missions Engine (dynamic interval ticker)
    initFlashMissionsTicker();

    console.log('🐷 Piggy App initialized successfully!');
});

/**
 * Setup global event delegation and UI controls
 */
function setupGlobalListeners() {
    // Global delegation for data-navigate attributes
    document.addEventListener('click', (e) => {
        const navEl = e.target.closest('[data-navigate]');
        if (navEl) {
            e.preventDefault();
            const route = navEl.getAttribute('data-navigate');
            if (route) {
                navigateTo(route);
            }
        }
    });

    // Handle back button clicks
    document.addEventListener('click', (e) => {
        const backBtn = e.target.closest('[data-action="back"]');
        if (backBtn) {
            e.preventDefault();
            window.history.back();
        }
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

/**
 * Close any active modal in the DOM
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal-backdrop, .modal, .wallet-drawer');
    modals.forEach(m => {
        m.classList.remove('modal--active', 'drawer--open');
        setTimeout(() => m.remove(), 250);
    });
}
