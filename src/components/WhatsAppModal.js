/* ============================================
   PIGGY APP — WhatsApp Onboarding Modal
   Se muestra una sola vez luego del registro
   con Google cuando no hay WhatsApp registrado.
   ============================================ */

import { getClient } from '../services/supabase.js';
import { AppState } from '../state.js';
import { renderIcon } from '../icons.js';

const MODAL_ID = 'whatsapp-onboarding-modal';

/**
 * Saves the WhatsApp number directly to the user profile in Supabase.
 */
async function saveWhatsApp(whatsapp) {
    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: 'No hay sesión activa.' };

    const { error } = await client
        .from('profiles')
        .update({ whatsapp })
        .eq('id', user.id);

    if (!error) {
        // Sync profile in AppState
        const profile = AppState.get('profile');
        AppState.set({ profile: { ...profile, whatsapp }, showWhatsAppModal: false });
    }

    return { error: error?.message || null };
}

/**
 * Render and mount the WhatsApp onboarding modal into the DOM.
 */
export function renderWhatsAppModal() {
    removeWhatsAppModal();

    const profile = AppState.get('profile');
    const firstName = profile?.full_name?.split(' ')[0] || 'amigo';

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.25s ease;
        padding: 0;
    `;

    overlay.innerHTML = `
        <div id="whatsapp-modal-card" style="
            background: white;
            border-radius: 28px 28px 0 0;
            padding: 36px 28px 40px;
            width: 100%;
            max-width: 480px;
            box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
            animation: slideUpModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            box-sizing: border-box;
        ">
            <!-- Pill handle -->
            <div style="
                width: 40px; height: 4px;
                background: #e2e8f0;
                border-radius: 99px;
                margin: 0 auto 24px;
            "></div>

            <!-- Icon + Title -->
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 10px;">
                <div style="
                    width: 52px; height: 52px;
                    background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
                    border-radius: 16px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);
                ">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                        <path fill="white" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path fill="white" d="M12 0C5.373 0 0 5.373 0 12c0 2.124.555 4.118 1.524 5.847L.057 23.492a.5.5 0 0 0 .612.612l5.677-1.461A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.87 9.87 0 0 1-5.042-1.383l-.36-.214-3.735.961.993-3.63-.234-.374A9.856 9.856 0 0 1 2.118 12C2.118 6.535 6.535 2.118 12 2.118S21.882 6.535 21.882 12 17.465 21.882 12 21.882z"/>
                    </svg>
                </div>
                <div>
                    <h2 style="margin:0; font-size: 1.15rem; font-weight: 800; color: #1f2937;">¡Un paso más, ${firstName}! 🐷</h2>
                    <p style="margin:4px 0 0; font-size: 0.82rem; color: #6b7280; line-height: 1.3;">Para mantenerte informado de tus Piggys</p>
                </div>
            </div>

            <!-- Description -->
            <p style="
                font-size: 0.88rem;
                color: #4b5563;
                line-height: 1.55;
                margin: 0 0 22px;
                padding: 14px;
                background: #f0fdf4;
                border-radius: 12px;
                border-left: 3px solid #25d366;
            ">
                Te enviaremos por WhatsApp los <strong>reportes de crecimiento</strong> de tus cerditos, notificaciones de ciclos y recibos de compra. 
            </p>

            <!-- Input -->
            <div style="margin-bottom: 10px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #374151; display: block; margin-bottom: 6px; letter-spacing: 0.3px;">
                    Tu número de WhatsApp
                </label>
                <div style="
                    display: flex;
                    align-items: center;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 14px;
                    overflow: hidden;
                    background: white;
                    transition: border-color 0.2s;
                " id="whatsapp-input-wrapper">
                    <span style="
                        padding: 0 12px;
                        font-size: 1.1rem;
                        border-right: 1px solid #e2e8f0;
                        height: 50px;
                        display: flex;
                        align-items: center;
                        background: #f9fafb;
                        color: #6b7280;
                        font-weight: 600;
                    ">🇨🇴 +57</span>
                    <input
                        type="tel"
                        id="whatsapp-modal-input"
                        placeholder="300 123 4567"
                        maxlength="14"
                        inputmode="numeric"
                        style="
                            flex: 1;
                            border: none;
                            outline: none;
                            padding: 0 14px;
                            font-size: 1rem;
                            font-weight: 600;
                            color: #1f2937;
                            height: 50px;
                            background: transparent;
                            font-family: inherit;
                        "
                    />
                </div>
                <div id="whatsapp-modal-error" style="
                    font-size: 0.75rem;
                    color: #ef4444;
                    margin-top: 5px;
                    display: none;
                    font-weight: 600;
                "></div>
            </div>

            <!-- Save button -->
            <button id="btn-save-whatsapp" style="
                width: 100%;
                background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
                color: white;
                border: none;
                border-radius: 30px;
                padding: 15px 20px;
                font-size: 1rem;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
                margin-bottom: 10px;
                letter-spacing: 0.3px;
            "
            onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 24px rgba(37,211,102,0.5)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 6px 20px rgba(37,211,102,0.4)';"
            >
                Guardar y Entrar a mi Granja 🚜
            </button>

            <!-- Skip link -->
            <button id="btn-skip-whatsapp" style="
                width: 100%;
                background: transparent;
                border: none;
                color: #9ca3af;
                font-size: 0.8rem;
                cursor: pointer;
                padding: 6px;
                font-family: inherit;
                text-decoration: underline;
                text-underline-offset: 2px;
            ">
                Omitir por ahora (puedo agregarlo después en mi perfil)
            </button>
        </div>
    `;

    // Inject animation keyframes if not already present
    if (!document.getElementById('whatsapp-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'whatsapp-modal-styles';
        style.textContent = `
            @keyframes slideUpModal {
                from { transform: translateY(100%); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
    attachWhatsAppModalListeners();

    // Auto-focus input after animation
    setTimeout(() => {
        document.getElementById('whatsapp-modal-input')?.focus();
    }, 380);
}

/**
 * Remove the WhatsApp modal from the DOM.
 */
export function removeWhatsAppModal() {
    document.getElementById(MODAL_ID)?.remove();
}

/**
 * Attach all event listeners for the WhatsApp modal.
 */
function attachWhatsAppModalListeners() {
    const input = document.getElementById('whatsapp-modal-input');
    const wrapper = document.getElementById('whatsapp-input-wrapper');
    const errorEl = document.getElementById('whatsapp-modal-error');
    const saveBtn = document.getElementById('btn-save-whatsapp');
    const skipBtn = document.getElementById('btn-skip-whatsapp');

    // Focus ring on input wrapper
    input?.addEventListener('focus', () => {
        if (wrapper) wrapper.style.borderColor = '#25d366';
    });
    input?.addEventListener('blur', () => {
        if (wrapper) wrapper.style.borderColor = '#e2e8f0';
    });

    // Only allow digits and spaces
    input?.addEventListener('input', () => {
        input.value = input.value.replace(/[^\d\s]/g, '');
    });

    // Save button
    saveBtn?.addEventListener('click', async () => {
        const raw = input?.value.trim().replace(/\s/g, '') || '';

        if (raw.length < 7) {
            if (errorEl) {
                errorEl.textContent = 'Por favor ingresa un número de WhatsApp válido.';
                errorEl.style.display = 'block';
            }
            return;
        }

        const fullNumber = `+57${raw}`;

        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <span style="display:inline-block;width:18px;height:18px;border:2px solid white;border-right-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;margin-right:8px;"></span>
            Guardando...
        `;

        const { error } = await saveWhatsApp(fullNumber);

        if (error) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar y Entrar a mi Granja 🚜';
            if (errorEl) {
                errorEl.textContent = `Error al guardar: ${error}`;
                errorEl.style.display = 'block';
            }
        } else {
            // Success: modal closes via AppState subscription in main.js
            removeWhatsAppModal();
        }
    });

    // Skip button — closes modal without saving, sets flag to false
    skipBtn?.addEventListener('click', () => {
        AppState.set({ showWhatsAppModal: false });
        removeWhatsAppModal();
    });
}
