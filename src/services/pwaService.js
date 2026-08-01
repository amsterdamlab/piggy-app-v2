/* ============================================
   PIGGY APP — PWA Installation Service
   Cross-platform PWA installation helper
   ============================================ */

import { AppState } from '../state.js';
import { completeMissionOnVisit } from './missionsService.js';

let deferredPrompt = null;

/**
 * Initialize PWA install prompt listener.
 */
export function initPWAListener() {
    // Register Service Worker for PWA installability
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('🐷 Service Worker registrado:', reg.scope))
            .catch(err => console.warn('Service Worker err:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        AppState.set({ canInstallPWA: true });
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        localStorage.setItem('piggy_pwa_installed', 'true');
        completeMissionOnVisit('m4').catch(err => console.warn('m4 complete err:', err));
    });
}

/**
 * Prompt PWA installation or show guided modal for iOS / non-supported browsers.
 */
export async function triggerPWAInstall() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            localStorage.setItem('piggy_pwa_installed', 'true');
            await completeMissionOnVisit('m4');
            if (window._refreshMissionBanner) window._refreshMissionBanner();
        }
        deferredPrompt = null;
    } else {
        // Show simple installation modal / guidance for iOS & supported browsers
        showPWAInstructionsModal();
    }
}

/**
 * Show clean modal guide for adding Piggy App to home screen.
 */
function showPWAInstructionsModal() {
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const existingModal = document.getElementById('pwa-install-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.className = 'modal-backdrop animate-fade-in';
    modal.innerHTML = `
        <div class="modal-card animate-scale-up" style="max-width: 380px; text-align: center; padding: 24px; background: white; border-radius: 20px;">
            <div style="font-size: 48px; margin-bottom: 12px;">📱</div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
                Agrega Piggy App a tu Celular
            </h3>
            <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin-bottom: 18px;">
                ${isiOS 
                    ? 'Para agregar el acceso directo en tu iPhone/iPad, presiona el botón <strong>Compartir</strong> ( ⎋ ) en Safari y selecciona <strong>"Agregar a Inicio"</strong>.' 
                    : 'Para agregar el acceso directo a tu pantalla de inicio, presiona los tres puntos de tu navegador (⋮) y elige <strong>"Agregar a pantalla principal"</strong>.'}
            </p>
            <button id="btn-pwa-modal-accept" class="btn btn--block" style="
                background: #b80049; color: white; border-radius: 24px; font-weight: 800; padding: 14px; border: none; cursor: pointer; width: 100%;
            ">
                ¡Listo! Completar Misión 📱
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-pwa-modal-accept')?.addEventListener('click', async () => {
        localStorage.setItem('piggy_pwa_installed', 'true');
        await completeMissionOnVisit('m4');
        modal.remove();
        if (window._refreshMissionBanner) window._refreshMissionBanner();
    });
}
