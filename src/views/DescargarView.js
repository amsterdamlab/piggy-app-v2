/* ============================================
   PIGGY APP — Descargar / Install View
   Public standalone landing page to install PWA via WhatsApp link
   ============================================ */

import { renderIcon } from '../icons.js';
import { triggerPWAInstall } from '../services/pwaService.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/**
 * Render the standalone installation landing view.
 */
export function renderDescargarView() {
    const app = document.getElementById('app');
    const state = AppState.getState();
    const targetRoute = state.isAuthenticated ? 'granja' : 'auth';

    app.innerHTML = `
        <div class="page profile-page animate-fade-in" style="min-height: 100dvh; display: flex; flex-direction: column; justify-content: space-between; padding: 24px 20px 40px;">
            <div>
                <!-- Top Brand Header -->
                <div style="text-align: center; margin-top: 20px; margin-bottom: 24px;">
                    <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="max-width: 170px; height: auto;" onerror="this.onerror=null; this.src='/pig2.jpg';" />
                    <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 8px;">
                        GRANJA VALLE MORALES
                    </div>
                </div>

                <!-- Main Hero Card -->
                <div class="profile-data-card" style="text-align: center; padding: 28px 20px; margin-bottom: 20px; box-shadow: 0 12px 32px -8px rgba(0,0,0,0.08); border-radius: 24px;">
                    <div style="background: rgba(184, 0, 73, 0.08); color: #b80049; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 14px;">
                        📱 APLICACIÓN OFICIAL PWA
                    </div>

                    <h1 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; line-height: 1.3;">
                        Instala Piggy App en tu Celular
                    </h1>

                    <p style="font-size: 0.88rem; color: #64748b; line-height: 1.5; margin: 0 0 24px 0;">
                        Accede a tu granja en 1 segundo directamente desde la pantalla de inicio de tu celular. Rápida, liviana y 100% segura.
                    </p>

                    <!-- Main Installation Action Button -->
                    <button id="btn-install-landing-action" class="btn btn--block btn--lg" style="
                        background: #b80049;
                        color: white;
                        font-size: 1.05rem;
                        font-weight: 800;
                        padding: 16px 20px;
                        border-radius: 30px;
                        box-shadow: 0 10px 25px -4px rgba(184, 0, 73, 0.45);
                        border: none;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        width: 100%;
                    ">
                        <span>Instalar Piggy App en mi Celular</span>
                        <span style="font-size: 20px;">📱</span>
                    </button>
                </div>

                <!-- Features Highlight List -->
                <div class="profile-data-card" style="padding: 20px; border-radius: 20px;">
                    <h3 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 14px 0;">
                        Beneficios de tener la App instalada:
                    </h3>

                    <div style="display: flex; flex-direction: column; gap: 14px; text-align: left;">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <div style="background: #fef2f2; color: #b80049; padding: 8px; border-radius: 12px; font-size: 18px; flex-shrink: 0;">
                                ⚡
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b;">Ultrarrápida y Ligera</div>
                                <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">Pesa menos de 5 MB. No consume espacio ni llena la memoria de tu celular.</div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <div style="background: #f0fdf4; color: #16a34a; padding: 8px; border-radius: 12px; font-size: 18px; flex-shrink: 0;">
                                🔒
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b;">Acceso Seguro a tu Granja</div>
                                <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">Monitorea tus piggies y comisiones sin volver a escribir enlaces.</div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <div style="background: #eff6ff; color: #2563eb; padding: 8px; border-radius: 12px; font-size: 18px; flex-shrink: 0;">
                                📲
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 0.88rem; color: #1e293b;">Experiencia Nativa a Pantalla Completa</div>
                                <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">Abre sin barras de navegador como una app nativa oficial.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer secondary link to App / Auth -->
            <div style="text-align: center; margin-top: 24px;">
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

                <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 14px; font-weight: 500;">
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
