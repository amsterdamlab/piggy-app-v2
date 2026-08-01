/* ============================================
   PIGGY APP — Descargar / Install View
   Public standalone landing page to install PWA via WhatsApp link
   ============================================ */

import { triggerPWAInstall } from '../services/pwaService.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/**
 * Render the standalone installation landing view.
 * Symmetrical, evenly-spaced 100dvh flex layout with larger logo and spaced copyright.
 */
export function renderDescargarView() {
    const app = document.getElementById('app');
    const state = AppState.getState();
    const targetRoute = state.isAuthenticated ? 'granja' : 'auth';

    app.innerHTML = `
        <style>
            @keyframes pwaBtnPulse7s {
                0% {
                    transform: scale(1);
                    box-shadow: 0 8px 25px -4px rgba(236, 72, 153, 0.5);
                }
                5% {
                    transform: scale(1.03);
                    box-shadow: 0 14px 35px -2px rgba(219, 39, 119, 0.75);
                }
                10%, 100% {
                    transform: scale(1);
                    box-shadow: 0 8px 25px -4px rgba(236, 72, 153, 0.5);
                }
            }

            @keyframes pwaBtnShine7s {
                0% { left: -100%; }
                10%, 100% { left: 200%; }
            }

            .pwa-download-page {
                background: #f8fafc;
                min-height: 100dvh;
                max-height: 100dvh;
                height: 100dvh;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-evenly;
                padding: 16px 20px !important;
                overflow: hidden !important;
            }

            .pwa-install-btn {
                position: relative;
                overflow: hidden;
                background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
                color: white;
                font-size: 1.05rem;
                font-weight: 800;
                padding: 13px 20px;
                border-radius: 30px;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                animation: pwaBtnPulse7s 7s infinite ease-in-out;
                transition: transform 0.2s ease;
            }

            .pwa-install-btn:active {
                transform: scale(0.97) !important;
            }

            .pwa-install-btn__shine {
                position: absolute;
                top: 0;
                left: -100%;
                width: 50%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
                transform: skewX(-20deg);
                animation: pwaBtnShine7s 7s infinite ease-in-out;
                pointer-events: none;
            }
        </style>

        <div class="page animate-fade-in pwa-download-page">
            <!-- 1. Centered Larger Logo Principal -->
            <div style="text-align: center; width: 100%;">
                <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="max-width: 190px; height: auto; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='/pig2.jpg';" />
            </div>

            <!-- 2. Main Hero Card -->
            <div class="profile-data-card" style="width: 100%; max-width: 380px; margin: 0; text-align: center; padding: 22px 18px 18px; box-shadow: 0 12px 32px -8px rgba(0,0,0,0.06); border-radius: 22px; border: 1px solid #e2e8f0; background: white; box-sizing: border-box;">
                <div style="background: rgba(236, 72, 153, 0.1); color: #db2777; display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;">
                    📱 APLICACIÓN OFICIAL PWA
                </div>

                <p style="font-size: 0.86rem; color: #64748b; line-height: 1.45; margin: 0 0 18px 0;">
                    Accede a tu granja en 1 segundo directamente desde la pantalla de inicio de tu celular.
                </p>

                <!-- Pink Button "Descargar" with 7s Synchronized Animation -->
                <button id="btn-install-landing-action" class="pwa-install-btn">
                    <span class="pwa-install-btn__shine"></span>
                    <span>Descargar</span>
                </button>

                <!-- Bold light-gray text directly under button -->
                <div style="font-size: 0.82rem; font-weight: 700; color: #94a3b8; margin-top: 12px;">
                    Rápida, liviana y 100% segura.
                </div>
            </div>

            <!-- 3. Secondary Link -->
            <div style="text-align: center; width: 100%;">
                <button id="btn-go-to-app-secondary" style="
                    background: transparent;
                    border: none;
                    color: #64748b;
                    font-size: 0.82rem;
                    font-weight: 700;
                    text-decoration: underline;
                    cursor: pointer;
                ">
                    ¿Ya la tienes instalada o prefieres usar la web? Ir a la App →
                </button>
            </div>

            <!-- 4. Footer Identidad Valle Morales -->
            <div style="text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div style="white-space: nowrap; font-size: 0.68rem; font-weight: 800; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase;">
                    RESPALDADO POR GRANJA VALLE MORALES
                </div>

                <img src="/vallemorales_logo.png" alt="Valle Morales" style="max-height: 28px; width: auto; object-fit: contain; display: block; margin: 0 auto;" onerror="this.style.display='none'" />

                <!-- Derechos Reservados con 2 espacios adicionales hacia abajo -->
                <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 500; text-align: center; white-space: nowrap; margin-top: 14px;">
                    © Todos los derechos reservados Piggy App. 2026
                </div>
            </div>
        </div>
    `;

    // Attach click listeners
    document.getElementById('btn-install-landing-action')?.addEventListener('click', () => {
        triggerPWAInstall();
    });

    document.getElementById('btn-go-to-app-secondary')?.addEventListener('click', () => {
        navigateTo(targetRoute);
    });
}
