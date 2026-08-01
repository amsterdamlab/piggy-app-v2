/* ============================================
   PIGGY APP — Profile View (Mi Perfil)
   User profile management & Supabase sync
   ============================================ */

import { renderIcon } from '../icons.js';
import { getProfile, updateUserProfile, getUserInitials, signOut } from '../services/authService.js';
import { AppState } from '../state.js';
import { navigateTo } from '../router.js';
import { showSupportModal } from './granja/SupportModal.js';
import { showReferralModal } from './granja/ReferralsModal.js';
import { generateMockReferralCode } from '../services/referralService.js';

// Colombian Banks list
const COLOMBIAN_BANKS = [
    'Bancolombia',
    'Nequi',
    'Daviplata',
    'Banco de Bogotá',
    'BBVA Colombia',
    'Banco Falabella',
    'Lulo Bank',
    'RappiPay / Davivienda',
    'Movii',
    'Davivienda',
    'Banco Itaú',
    'Scotiabank Colpatria',
    'Banco Popular',
    'Banco de Occidente',
    'Banco AV Villas',
    'Caja Social',
    'Otro'
];

const ACCOUNT_TYPES = [
    'Cuenta de Ahorros',
    'Cuenta Corriente',
    'Monedero Digital (Nequi/Daviplata/RappiPay)'
];

let currentActiveSubscreen = null; // 'datos' | 'legal' | null

/**
 * Render the Profile View.
 */
export function renderProfileView() {
    const app = document.getElementById('app');
    const state = AppState.getState();
    const profile = state.profile || {};

    const fullName = profile.full_name || 'Usuario Piggy';
    const initials = getUserInitials(fullName);
    const initialsClass = initials.length > 1 ? 'profile-avatar-circle--double' : 'profile-avatar-circle--single';
    const referralCode = profile.referral_code || generateMockReferralCode(fullName);

    app.innerHTML = `
        <div class="page profile-page animate-fade-in">
            <!-- Header with Back Arrow -->
            <div class="profile-header">
                <button class="profile-header__back" id="btn-profile-back" aria-label="Volver a Mi Granja" title="Volver a Mi Granja">
                    ${renderIcon('arrowLeft', '', '22')}
                </button>
                <h1 class="profile-header__title">Mi Perfil</h1>
            </div>

            <!-- User Card -->
            <div class="profile-user-card">
                <div class="profile-avatar-wrapper">
                    <div class="profile-avatar-circle ${initialsClass}">
                        ${initials}
                    </div>
                    <span class="profile-avatar-online" title="Usuario Activo"></span>
                </div>
                <h2 class="profile-user-name">${fullName}</h2>
                
                <!-- Copyable Referral Code Tag with line copy icon on right -->
                <button class="profile-referral-tag" id="btn-copy-ref-profile" title="Copiar código de invitación">
                    <span>${referralCode}</span>
                    <span style="display:inline-flex; align-items:center; color:#b80049;">${renderIcon('copy', '', '16')}</span>
                </button>
                <div id="copy-ref-toast" style="font-size: 0.75rem; color: #16a34a; margin-top: 4px; display: none; font-weight: 700;">
                    ¡Código copiado al portapapeles! 📋
                </div>
            </div>

            <!-- Banner Promocional Referidos -->
            <div class="profile-banner-referral">
                <p class="profile-banner-referral__text">
                    Gana Bonos de Consumo por <strong>$30.000</strong> invitando a tus amigos a registrarse y usar PIGGY APP.
                </p>
                <button class="profile-banner-referral__btn" id="btn-profile-invite-banner">
                    Invitar amigos →
                </button>
            </div>

            <!-- Card Menu Container (Icons in #b80049) -->
            <div class="profile-menu-card">
                <!-- 1. Datos Personales -->
                <button class="profile-menu-item" id="btn-menu-datos">
                    <div class="profile-menu-item__left">
                        <span class="profile-menu-item__icon">${renderIcon('user', '', '22')}</span>
                        <span class="profile-menu-item__text">Datos personales</span>
                    </div>
                    <span class="profile-menu-item__chevron">${renderIcon('chevronRight', '', '20')}</span>
                </button>

                <!-- 2. Invitar Amigos (Caja de regalo en líneas) -->
                <button class="profile-menu-item" id="btn-menu-invitar">
                    <div class="profile-menu-item__left">
                        <span class="profile-menu-item__icon">${renderIcon('giftBox', '', '22')}</span>
                        <span class="profile-menu-item__text">Invitar amigos</span>
                    </div>
                    <span class="profile-menu-item__chevron">${renderIcon('chevronRight', '', '20')}</span>
                </button>

                <!-- 3. Centro de Ayuda (Diadema de soporte en líneas) -->
                <button class="profile-menu-item" id="btn-menu-ayuda">
                    <div class="profile-menu-item__left">
                        <span class="profile-menu-item__icon">${renderIcon('headset', '', '22')}</span>
                        <span class="profile-menu-item__text">Centro de ayuda</span>
                    </div>
                    <span class="profile-menu-item__chevron">${renderIcon('chevronRight', '', '20')}</span>
                </button>

                <!-- 4. Términos y Condiciones (Hoja / Documento en líneas) -->
                <button class="profile-menu-item" id="btn-menu-terminos">
                    <div class="profile-menu-item__left">
                        <span class="profile-menu-item__icon">${renderIcon('documentText', '', '22')}</span>
                        <span class="profile-menu-item__text">Términos y condiciones</span>
                    </div>
                    <span class="profile-menu-item__chevron">${renderIcon('chevronRight', '', '20')}</span>
                </button>

                <!-- 5. Cerrar Sesión -->
                <button class="profile-menu-item" id="btn-menu-logout">
                    <div class="profile-menu-item__left">
                        <span class="profile-menu-item__icon">${renderIcon('logout', '', '22')}</span>
                        <span class="profile-menu-item__text" style="color: #ef4444;">Cerrar sesión</span>
                    </div>
                    <span class="profile-menu-item__chevron">${renderIcon('chevronRight', '', '20')}</span>
                </button>
            </div>

            <!-- Footer Institucional -->
            <div class="profile-footer">
                <div>
                    <div class="profile-footer__label">RESPALDADO POR GRANJA VALLE MORALES</div>
                    <img src="/vallemorales_logo.png" alt="Valle Morales" class="profile-footer__valle-logo" onerror="this.style.display='none'" />
                </div>

                <!-- Insignia Superintendencia -->
                <div class="profile-footer__vigilado-badge">
                    <span class="profile-footer__vigilado-title">VIGILADO</span>
                    <span class="profile-footer__vigilado-sub">Superintendencia de Industria y Comercio de Colombia</span>
                </div>
            </div>
        </div>

        <!-- Dynamic Subscreens (Datos Personales & Legal) -->
        <div id="profile-subscreen-container"></div>
    `;

    attachProfileViewListeners(profile);
}

/**
 * Attach listeners for Profile View.
 */
function attachProfileViewListeners(profile) {
    // Back button to Granja
    document.getElementById('btn-profile-back')?.addEventListener('click', () => {
        navigateTo('granja');
    });

    // Copy referral code
    document.getElementById('btn-copy-ref-profile')?.addEventListener('click', () => {
        const referralCode = profile.referral_code || generateMockReferralCode(profile.full_name || 'Usuario');
        navigator.clipboard.writeText(referralCode).then(() => {
            const toast = document.getElementById('copy-ref-toast');
            if (toast) {
                toast.style.display = 'block';
                setTimeout(() => { toast.style.display = 'none'; }, 2500);
            }
        });
    });

    // Banner invite button -> Opens referral modal directly without leaving profile
    document.getElementById('btn-profile-invite-banner')?.addEventListener('click', () => {
        showReferralModal();
    });

    // Menu: Datos Personales
    document.getElementById('btn-menu-datos')?.addEventListener('click', () => {
        openDatosPersonalesSubscreen(profile);
    });

    // Menu: Invitar amigos -> Opens referral modal directly without leaving profile
    document.getElementById('btn-menu-invitar')?.addEventListener('click', () => {
        showReferralModal();
    });

    // Menu: Centro de ayuda -> Opens support modal
    document.getElementById('btn-menu-ayuda')?.addEventListener('click', () => {
        showSupportModal();
    });

    // Menu: Términos y condiciones
    document.getElementById('btn-menu-terminos')?.addEventListener('click', () => {
        openLegalSubscreen();
    });

    // Menu: Cerrar sesión
    document.getElementById('btn-menu-logout')?.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            await signOut();
            navigateTo('auth');
        }
    });
}

/**
 * Render and open "Datos Personales" subscreen with bank accounts details.
 */
function openDatosPersonalesSubscreen(profile) {
    currentActiveSubscreen = 'datos';
    const container = document.getElementById('profile-subscreen-container');
    if (!container) return;

    const bankOptionsHTML = COLOMBIAN_BANKS.map(b => 
        `<option value="${b}" ${profile.bank_name === b ? 'selected' : ''}>${b}</option>`
    ).join('');

    const accountTypeOptionsHTML = ACCOUNT_TYPES.map(t =>
        `<option value="${t}" ${profile.bank_account_type === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    container.innerHTML = `
        <div class="profile-subscreen">
            <!-- Subscreen Header with Back Arrow -->
            <div class="profile-header">
                <button class="profile-header__back" id="btn-subscreen-back" aria-label="Volver" title="Volver">
                    ${renderIcon('arrowLeft', '', '22')}
                </button>
                <h1 class="profile-header__title">Datos Personales</h1>
            </div>

            <form id="form-datos-personales" style="padding-bottom: 40px;">
                <!-- Status Banner -->
                <div id="datos-status-banner" style="display:none; margin:16px 20px 0; padding:12px 16px; border-radius:12px; font-size:0.85rem; font-weight:700; text-align:center;"></div>

                <!-- Section 1: Personal Info -->
                <div class="profile-data-card">
                    <div class="profile-data-header">
                        <span class="profile-data-title">
                            <span style="color:#b80049;">${renderIcon('user', '', '20')}</span>
                            Información de Perfil
                        </span>
                    </div>

                    <div class="input-group" style="margin-bottom: 16px;">
                        <label class="input-group__label">Nombre Completo</label>
                        <div class="input-wrapper">
                            <span class="input-wrapper__icon">${renderIcon('user', '', '18')}</span>
                            <input
                                type="text"
                                class="input-wrapper__field"
                                id="field-edit-name"
                                name="fullName"
                                value="${profile.full_name || ''}"
                                placeholder="Ej: Juan Pérez"
                                required
                            />
                        </div>
                    </div>

                    <div class="input-group" style="margin-bottom: 16px;">
                        <label class="input-group__label">Correo Electrónico</label>
                        <div class="input-wrapper" style="background:#f8fafc; opacity:0.8;">
                            <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
                            <input
                                type="email"
                                class="input-wrapper__field"
                                value="${profile.email || ''}"
                                disabled
                                style="cursor:not-allowed;"
                            />
                        </div>
                        <span style="font-size:0.7rem; color:#94a3b8; margin-top:2px; display:block;">El correo está vinculado a tu cuenta.</span>
                    </div>

                    <div class="input-group">
                        <label class="input-group__label">WhatsApp / Celular</label>
                        <div class="input-wrapper">
                            <span class="input-wrapper__icon">${renderIcon('phone', '', '18')}</span>
                            <input
                                type="tel"
                                class="input-wrapper__field"
                                id="field-edit-whatsapp"
                                name="whatsapp"
                                value="${profile.whatsapp || ''}"
                                placeholder="+57 300 123 4567"
                                required
                            />
                        </div>
                    </div>
                </div>

                <!-- Section 2: Bank Info for Payouts -->
                <div class="profile-data-card">
                    <div class="profile-data-header">
                        <span class="profile-data-title">
                            <span style="color:#b80049;">${renderIcon('card', '', '20')}</span>
                            Cuenta para Transferencias de Comisiones
                        </span>
                    </div>
                    <p style="font-size:0.8rem; color:#64748b; line-height:1.4; margin:0 0 16px 0;">
                        Ingresa los datos de tu cuenta bancaria o monedero digital donde deseas recibir tus retiros y comisiones.
                    </p>

                    <div class="input-group" style="margin-bottom: 16px;">
                        <label class="input-group__label" for="field-edit-bank">Banco o Monedero Digital</label>
                        <div class="input-wrapper">
                            <span class="input-wrapper__icon">🏦</span>
                            <select class="input-wrapper__field" id="field-edit-bank" name="bankName" style="background:transparent;">
                                <option value="">-- Selecciona tu banco --</option>
                                ${bankOptionsHTML}
                            </select>
                        </div>
                    </div>

                    <div class="input-group" style="margin-bottom: 16px;">
                        <label class="input-group__label" for="field-edit-account-type">Tipo de Cuenta</label>
                        <div class="input-wrapper">
                            <span class="input-wrapper__icon">💳</span>
                            <select class="input-wrapper__field" id="field-edit-account-type" name="bankAccountType" style="background:transparent;">
                                <option value="">-- Selecciona el tipo --</option>
                                ${accountTypeOptionsHTML}
                            </select>
                        </div>
                    </div>

                    <div class="input-group" style="margin-bottom: 16px;">
                        <label class="input-group__label" for="field-edit-account-number">Número de Cuenta o Celular Nequi/Daviplata</label>
                        <div class="input-wrapper">
                            <span class="input-wrapper__icon">🔢</span>
                            <input
                                type="text"
                                class="input-wrapper__field"
                                id="field-edit-account-number"
                                name="bankAccountNumber"
                                value="${profile.bank_account_number || ''}"
                                placeholder="Ej: 3001234567 o 123456789"
                                autocomplete="off"
                            />
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="input-group__label" for="field-edit-breve-key">Llave BREVE (Interoperabilidad Rápida)</label>
                        <div class="input-wrapper">
                            <span class="input-wrapper__icon">⚡</span>
                            <input
                                type="text"
                                class="input-wrapper__field"
                                id="field-edit-breve-key"
                                name="bankBreveKey"
                                value="${profile.bank_breve_key || ''}"
                                placeholder="Ej: Celular, Cédula o Alías BREVE"
                                autocomplete="off"
                            />
                        </div>
                        <span style="font-size:0.72rem; color:#94a3b8; margin-top:4px; display:block;">Opcional: Si utilizas el sistema Breve para transferencias inmediatas.</span>
                    </div>
                </div>

                <!-- Save Button -->
                <div style="padding: 0 20px;">
                    <button
                        type="submit"
                        class="btn btn--block btn--lg"
                        id="btn-save-profile-data"
                        style="
                            background: #b80049;
                            color: white;
                            border-radius: 30px;
                            font-weight: 800;
                            font-size: 1rem;
                            padding: 16px;
                            box-shadow: 0 8px 24px -4px rgba(184, 0, 73, 0.4);
                            border: none;
                            cursor: pointer;
                        "
                    >
                        Guardar Cambios y Sincronizar 💾
                    </button>
                </div>
            </form>
        </div>
    `;

    // Listeners for Datos Personales subscreen
    document.getElementById('btn-subscreen-back')?.addEventListener('click', closeSubscreen);

    document.getElementById('form-datos-personales')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-save-profile-data');

        const fullNameVal = document.getElementById('field-edit-name')?.value.trim();
        const whatsappVal = document.getElementById('field-edit-whatsapp')?.value.trim();
        const bankNameVal = document.getElementById('field-edit-bank')?.value;
        const bankTypeVal = document.getElementById('field-edit-account-type')?.value;
        const bankAccVal = document.getElementById('field-edit-account-number')?.value.trim();
        const bankBreveVal = document.getElementById('field-edit-breve-key')?.value.trim();

        if (!fullNameVal) {
            showSubscreenStatus('Por favor ingresa tu nombre completo.', '#ef4444', '#fef2f2', '#fecaca');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Guardando en Supabase... ⏳';

        const updates = {
            full_name: fullNameVal,
            whatsapp: whatsappVal,
            bank_name: bankNameVal,
            bank_account_type: bankTypeVal,
            bank_account_number: bankAccVal,
            bank_breve_key: bankBreveVal
        };

        const { error } = await updateUserProfile(updates);

        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Guardar Cambios y Sincronizar 💾';

        if (error) {
            showSubscreenStatus(`Error al guardar: ${error}`, '#ef4444', '#fef2f2', '#fecaca');
        } else {
            showSubscreenStatus('✅ ¡Información guardada y sincronizada exitosamente con Supabase!', '#16a34a', '#f0fdf4', '#bbf7d0');
            setTimeout(() => {
                closeSubscreen();
                renderProfileView(); // Re-render main profile view with updated data
            }, 1200);
        }
    });
}

/**
 * Open "Términos y Condiciones" subscreen.
 */
function openLegalSubscreen() {
    currentActiveSubscreen = 'legal';
    const container = document.getElementById('profile-subscreen-container');
    if (!container) return;

    container.innerHTML = `
        <div class="profile-subscreen">
            <!-- Header with Back Arrow -->
            <div class="profile-header">
                <button class="profile-header__back" id="btn-subscreen-back" aria-label="Volver" title="Volver">
                    ${renderIcon('arrowLeft', '', '22')}
                </button>
                <h1 class="profile-header__title">Términos y Condiciones</h1>
            </div>

            <div style="padding: 24px 20px;">
                <div class="profile-data-card" style="margin:0 0 20px 0;">
                    <!-- Line Document Icon in #b80049 -->
                    <div style="text-align: center; margin-bottom: 14px; color: #b80049;">
                        ${renderIcon('documentText', '', '44')}
                    </div>
                    <h3 style="font-size: 1.1rem; font-weight: 800; color: #0f172a; text-align: center; margin: 0 0 8px 0;">
                        Contratos y Políticas de Piggy App
                    </h3>
                    <p style="font-size: 0.88rem; color: #64748b; text-align: center; line-height: 1.5; margin: 0 0 20px 0;">
                        Consulta de forma transparente nuestras condiciones de uso y la política de tratamiento de tus datos personales.
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <a href="terminos-y-condiciones.html" target="_blank" class="btn btn--block" style="
                            background: #f8fafc;
                            color: #1e293b;
                            border: 1px solid #cbd5e1;
                            border-radius: 14px;
                            font-weight: 700;
                            font-size: 0.84rem;
                            line-height: 1.35;
                            padding: 14px 16px;
                            text-decoration: none;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            gap: 10px;
                            white-space: normal;
                            text-align: left;
                        ">
                            <span style="flex:1;">Ver Términos y Condiciones completos de la plataforma</span>
                            <span style="font-size:16px; flex-shrink:0;">↗</span>
                        </a>

                        <a href="tratamiento-de-datos.html" target="_blank" class="btn btn--block" style="
                            background: #f8fafc;
                            color: #1e293b;
                            border: 1px solid #cbd5e1;
                            border-radius: 14px;
                            font-weight: 700;
                            font-size: 0.84rem;
                            line-height: 1.35;
                            padding: 14px 16px;
                            text-decoration: none;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            gap: 10px;
                            white-space: normal;
                            text-align: left;
                        ">
                            <span style="flex:1;">Ver Política de Tratamiento de Datos Personales (Habeas Data)</span>
                            <span style="font-size:16px; flex-shrink:0;">↗</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-subscreen-back')?.addEventListener('click', closeSubscreen);
}

/**
 * Helper to close subscreen.
 */
function closeSubscreen() {
    currentActiveSubscreen = null;
    const container = document.getElementById('profile-subscreen-container');
    if (container) container.innerHTML = '';
}

/**
 * Display status message in subscreen.
 */
function showSubscreenStatus(msg, color, bgColor, borderColor) {
    const banner = document.getElementById('datos-status-banner');
    if (banner) {
        banner.textContent = msg;
        banner.style.color = color;
        banner.style.backgroundColor = bgColor;
        banner.style.border = `1px solid ${borderColor}`;
        banner.style.display = 'block';
    }
}
