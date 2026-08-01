/* ============================================
   PIGGY APP — Descargar / Install View
   Public standalone landing page to install PWA via WhatsApp link
   ============================================ */

import { triggerPWAInstall } from '../services/pwaService.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/**
 * Render the standalone installation landing view with pink buy-style shine+pulse CTA button.
 */
export function renderDescargarView() {
    const app = document.getElementById('app');
    const state = AppState.getState();
    const targetRoute = state.isAuthenticated ? 'granja' : 'auth';

    app.innerHTML = `
        <style>
            @keyframes pwaBtnPulse {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 8px 25px -4px rgba(236, 72, 153, 0.5);
                }
                50% {
                    transform: scale(1.03);
                    box-shadow: 0 14px 35px -2px rgba(219, 39, 119, 0.75);
                }
            }

            @keyframes pwaBtnShine {
                0% { left: -100%; }
                25%, 100% { left: 200%; }
            }

            .pwa-install-btn {
                position: relative;
                overflow: hidden;
                background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
                color: white;
                font-size: 1.15rem;
                font-weight: 800;
                padding: 18px 24px;
                border-radius: 30px;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                animation: pwaBtnPulse 2.5s infinite ease-in-out;
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
                animation: pwaBtnShine 3s infinite ease-in-out;
                pointer-events: none;
            }
        </style>

        <div class="page profile-page animate-fade-in" style="min-height: 100dvh; display: flex; flex-direction: column; justify-content: space-between; padding: 24px 20px 32px;">
            <div>
                <!-- Centered Logo Principal -->
                <div style="text-align: center; margin-top: 16px; margin-bottom: 24px;">
                    <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='/pig2.jpg';" />
                </div>

                <!-- Main Hero Card -->
                <div class="profile-data-card" style="text-align: center; padding: 32px 20px 24px; margin-bottom: 20px; box-shadow: 0 12px 32px -8px rgba(0,0,0,0.08); border-radius: 24px;">
                    <div style="background: rgba(236, 72, 153, 0.1); color: #db2777; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 14px;">
                        📱 APLICACIÓN OFICIAL PWA
                    </div>

                    <h1 style="font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; line-height: 1.3;">
                        Instala Piggy App en tu Celular
                    </h1>

                    <p style="font-size: 0.88rem; color: #64748b; line-height: 1.5; margin: 0 0 26px 0;">
                        Accede a tu granja en 1 segundo directamente desde la pantalla de inicio de tu celular.
                    </p>

                    <!-- Pink Purchase Style Button with Shine + Pulse -->
                    <button id="btn-install-landing-action" class="pwa-install-btn">
                        <span class="pwa-install-btn__shine"></span>
                        <span>Agregar App</span>
                        <span style="font-size: 22px;">📱</span>
                    </button>

                    <!-- Bold light-gray text directly under button -->
                    <div style="font-size: 0.84rem; font-weight: 700; color: #94a3b8; margin-top: 14px;">
                        Rápida, liviana y 100% segura.
                    </div>
                </div>
            </div>

            <!-- Bottom Section & Institutional Footer -->
            <div>
                <div style="text-align: center; margin-bottom: 24px;">
                    <button id="btn-go-to-app-secondary" style="
                        background: transparent;
                        border: none;
                        color: #64748b;
                        font-size: 0.84rem;
                        font-weight: 700;
                        text-decoration: underline;
                        cursor: pointer;
                    ">
                        ¿Ya la tienes instalada o prefieres usar la web? Ir a la App →
                    </button>
                </div>

                <!-- Footer Identidad Valle Morales + Superintendencia -->
                <div class="profile-footer" style="padding-top: 10px; margin-top: 0;">
                    <div style="text-align: center;">
                        <div class="profile-footer__label">RESPALDADO POR GRANJA VALLE MORALES</div>
                        <img src="/vallemorales_logo.png" alt="Valle Morales" class="profile-footer__valle-logo" style="margin: 8px auto;" onerror="this.style.display='none'" />
                    </div>

                    <!-- Insignia Superintendencia -->
                    <div class="profile-footer__vigilado-badge" style="margin-top: 10px;">
                        <span class="profile-footer__vigilado-title">VIGILADO</span>
                        <span class="profile-footer__vigilado-sub">Superintendencia de Industria y Comercio de Colombia</span>
                    </div>

                    <!-- Derechos Reservados -->
                    <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 8px; font-weight: 500; text-align: center;">
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
