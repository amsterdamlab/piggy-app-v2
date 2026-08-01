/* ============================================
   PIGGY APP — Descargar / Install View
   Public standalone landing page to install PWA via WhatsApp link
   ============================================ */

import { triggerPWAInstall } from '../services/pwaService.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/**
 * Render the standalone installation landing view without any scrolling.
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
                min-height: 100dvh;
                max-height: 100dvh;
                height: 100dvh;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 16px 20px;
                overflow: hidden;
            }

            .pwa-install-btn {
                position: relative;
                overflow: hidden;
                background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
                color: white;
                font-size: 1.05rem;
                font-weight: 800;
                padding: 12px 20px;
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

        <div class="page profile-page animate-fade-in pwa-download-page">
            <div style="width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center;">
                <!-- Centered Logo Principal -->
                <div style="text-align: center; margin-bottom: 12px;">
                    <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="max-width: 145px; height: auto; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='/pig2.jpg';" />
                </div>

                <!-- Main Hero Card -->
                <div class="profile-data-card" style="width: 100%; text-align: center; padding: 20px 16px 16px; margin-bottom: 12px; box-shadow: 0 12px 32px -8px rgba(0,0,0,0.08); border-radius: 20px;">
                    <div style="background: rgba(236, 72, 153, 0.1); color: #db2777; display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px;">
                        📱 APLICACIÓN OFICIAL PWA
                    </div>

                    <p style="font-size: 0.84rem; color: #64748b; line-height: 1.4; margin: 0 0 14px 0;">
                        Accede a tu granja en 1 segundo directamente desde la pantalla de inicio de tu celular.
                    </p>

                    <!-- Pink Button "Descargar" with 7s Synchronized Animation -->
                    <button id="btn-install-landing-action" class="pwa-install-btn">
                        <span class="pwa-install-btn__shine"></span>
                        <span>Descargar</span>
                    </button>

                    <!-- Bold light-gray text directly under button -->
                    <div style="font-size: 0.8rem; font-weight: 700; color: #94a3b8; margin-top: 8px;">
                        Rápida, liviana y 100% segura.
                    </div>
                </div>

                <!-- Secondary Link -->
                <div style="text-align: center; margin-bottom: 10px;">
                    <button id="btn-go-to-app-secondary" style="
                        background: transparent;
                        border: none;
                        color: #64748b;
                        font-size: 0.8rem;
                        font-weight: 700;
                        text-decoration: underline;
                        cursor: pointer;
                    ">
                        ¿Ya la tienes instalada o prefieres usar la web? Ir a la App →
                    </button>
                </div>

                <!-- Footer Identidad Valle Morales -->
                <div class="profile-footer" style="padding-top: 0; margin-top: 0; width: 100%;">
                    <div style="text-align: center;">
                        <div class="profile-footer__label" style="white-space: nowrap; font-size: 0.65rem; letter-spacing: 0.5px;">
                            RESPALDADO POR GRANJA VALLE MORALES
                        </div>
                        <img src="/vallemorales_logo.png" alt="Valle Morales" class="profile-footer__valle-logo" style="margin: 4px auto; max-height: 24px;" onerror="this.style.display='none'" />
                    </div>

                    <!-- Derechos Reservados en 1 sola línea -->
                    <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 2px; font-weight: 500; text-align: center; white-space: nowrap;">
                        © Todos los derechos reservados Piggy App. 2026
                    </div>
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
