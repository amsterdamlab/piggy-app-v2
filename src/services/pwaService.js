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
 * Limpia el CacheStorage del navegador y fuerza la actualizacion del Service Worker.
 * Se ejecuta en segundo plano de forma no-bloqueante sin tocar credenciales ni sesiones.
 */
export async function clearAppCache() {
    try {
        if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(
                cacheKeys.map(key => {
                    console.log('🐷 Limpiando cache obsoleta:', key);
                    return caches.delete(key);
                })
            );
        }

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
                await reg.update().catch(err => console.warn('SW update err:', err));
            }
        }
        console.log('🐷 Cache y Service Worker sincronizados con éxito.');
    } catch (e) {
        console.warn('🐷 Limpieza de cache omitida silenciosamente:', e);
    }
}

/**
 * Prompt PWA installation or show guided modal for iOS.
 */
export async function triggerPWAInstall() {
    // 1. If already opened as PWA Standalone app, complete M4 immediately
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        localStorage.setItem('piggy_pwa_installed', 'true');
        await completeMissionOnVisit('m4');
        if (window._refreshMissionBanner) window._refreshMissionBanner();
        return;
    }

    // Detect iOS
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isiOS) {
        // Show iOS guided pop-up modal with screenshot reminder and auto-complete on close
        showIOSPWAInstructionsModal();
    } else {
        // Android / Chromium native install prompt
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    localStorage.setItem('piggy_pwa_installed', 'true');
                    await completeMissionOnVisit('m4');
                    if (window._refreshMissionBanner) window._refreshMissionBanner();
                }
                deferredPrompt = null;
            } catch (e) {
                console.warn('Native PWA prompt error:', e);
                showAndroidFallbackModal();
            }
        } else {
            showAndroidFallbackModal();
        }
    }
}

/**
 * Show iOS pop-up modal guide.
 * Closing this modal completes Mission 4 automatically.
 */
function showIOSPWAInstructionsModal() {
    const existingModal = document.getElementById('pwa-install-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.className = 'modal-backdrop animate-fade-in';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100dvh;
        background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;
        box-sizing: border-box;
    `;

    modal.innerHTML = `
        <div class="animate-scale-up" style="
            background: white; border-radius: 24px; width: 100%; max-width: 380px;
            padding: 24px 20px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            position: relative; overflow: hidden;
        ">
            <!-- Close cross top-right -->
            <button id="btn-pwa-modal-close" style="
                position: absolute; top: 12px; right: 14px; background: #f1f5f9; border: none;
                width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; color: #64748b;
                cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700;
            ">&times;</button>

            <!-- Line-art Mobile Icon (No circular background) -->
            <div style="display: flex; justify-content: center; margin: 6px auto 14px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#b80049" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="20" x="5" y="2" rx="3" ry="3"/>
                    <path d="M12 18h.01"/>
                </svg>
            </div>

            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.01em;">
                Instalar Piggy App en tu iPhone
            </h3>

            <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 18px 0;">
                Sigue estos pasos para tener tu granja Piggy a la mano.
            </p>

            <!-- Steps Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: left; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="background: #b80049; color: white; width: 28px; height: 28px; border-radius: 50%; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
                    <div style="font-size: 0.85rem; color: #334155; font-weight: 600;">
                        Presiona el botón <strong style="color:#b80049;">Compartir</strong> <span style="font-size: 1.1rem; vertical-align: middle;">⎋</span> abajo en Safari.
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: #b80049; color: white; width: 28px; height: 28px; border-radius: 50%; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
                    <div style="font-size: 0.85rem; color: #334155; font-weight: 600;">
                        Desliza y selecciona <strong style="color:#0f172a;">"Agregar a Inicio"</strong> ( ➕ ).
                    </div>
                </div>
            </div>

            <!-- Notice / Hint Text -->
            <div style="font-size: 0.78rem; color: #b80049; font-weight: 600; background: #fff5f8; border: 1px dashed #fbcfe8; border-radius: 12px; padding: 10px 12px; margin-bottom: 18px; line-height: 1.4;">
                📸 Haz captura de pantalla de estos pasos para que lo puedas hacer en cualquier momento.
            </div>

            <!-- Complete Button -->
            <button id="btn-pwa-modal-accept" style="
                width: 100%; background: linear-gradient(135deg, #b80049, #880036);
                color: white; border-radius: 14px; font-weight: 800; font-size: 0.95rem;
                padding: 14px 20px; border: none; cursor: pointer;
                box-shadow: 0 6px 20px -4px rgba(184,0,73,0.4); transition: transform 0.15s, opacity 0.15s;
            ">
                ¡Listo! Completar Misión
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    let isCompleted = false;
    const finishMission = async () => {
        if (isCompleted) return;
        isCompleted = true;
        localStorage.setItem('piggy_pwa_installed', 'true');
        await completeMissionOnVisit('m4');
        modal.remove();
        if (window._refreshMissionBanner) window._refreshMissionBanner();
    };

    document.getElementById('btn-pwa-modal-accept')?.addEventListener('click', finishMission);
    document.getElementById('btn-pwa-modal-close')?.addEventListener('click', finishMission);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) finishMission();
    });
}

/**
 * Show Android fallback modal if deferredPrompt is not present.
 */
function showAndroidFallbackModal() {
    const existingModal = document.getElementById('pwa-install-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.className = 'modal-backdrop animate-fade-in';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100dvh;
        background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;
        box-sizing: border-box;
    `;

    modal.innerHTML = `
        <div class="animate-scale-up" style="
            background: white; border-radius: 24px; width: 100%; max-width: 380px;
            padding: 24px 20px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            position: relative; overflow: hidden;
        ">
            <button id="btn-pwa-modal-close" style="
                position: absolute; top: 12px; right: 14px; background: #f1f5f9; border: none;
                width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; color: #64748b;
                cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700;
            ">&times;</button>

            <!-- Line-art Mobile Icon (No circular background) -->
            <div style="display: flex; justify-content: center; margin: 6px auto 14px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#b80049" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="20" x="5" y="2" rx="3" ry="3"/>
                    <path d="M12 18h.01"/>
                </svg>
            </div>

            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">
                Agregar Piggy App a tu Pantalla
            </h3>

            <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 0 0 16px 0;">
                Para instalar el acceso directo en tu Android, toca los 3 puntos <strong style="color:#b80049;">(⋮)</strong> arriba en tu navegador y selecciona <strong style="color:#0f172a;">"Agregar a inicio"</strong> o "Instalar aplicación".
            </p>

            <button id="btn-pwa-modal-accept" style="
                width: 100%; background: linear-gradient(135deg, #b80049, #880036);
                color: white; border-radius: 14px; font-weight: 800; font-size: 0.95rem;
                padding: 14px 20px; border: none; cursor: pointer;
                box-shadow: 0 6px 20px -4px rgba(184,0,73,0.4);
            ">
                ¡Listo! Completar Misión
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const finishMission = async () => {
        localStorage.setItem('piggy_pwa_installed', 'true');
        await completeMissionOnVisit('m4');
        modal.remove();
        if (window._refreshMissionBanner) window._refreshMissionBanner();
    };

    document.getElementById('btn-pwa-modal-accept')?.addEventListener('click', finishMission);
    document.getElementById('btn-pwa-modal-close')?.addEventListener('click', finishMission);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) finishMission();
    });
}
