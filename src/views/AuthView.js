/* ============================================
   PIGGY APP — Auth View (Screen 1)
   Registration and Login with pig mascot
   ============================================ */

import { renderIcon } from '../icons.js';
import { signUp, signIn, signInWithGoogle, sendPasswordReset, updatePassword } from '../services/authService.js';
import { validateReferralCode, linkReferral } from '../services/referralService.js';
import { renderLegalModal } from '../components/LegalModal.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/** @type {'register' | 'login'} */
let activeAuthTab = 'register';
let passwordVisible = false;
let isSubmitting = false;
let formError = null;

/**
 * Render the Auth view.
 */
export function renderAuthView() {
  const app = document.getElementById('app');
  const state = AppState.getState();

  // If in recovery flow, force tab to 'reset'
  if (state.isResettingPassword && activeAuthTab !== 'reset') {
    activeAuthTab = 'reset';
  }

  app.innerHTML = `
    <div class="auth-page page">
      <div class="auth-page__content">

        <!-- New Hero Mascot and Title (From Image) -->
        <div class="auth-hero animate-fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 32px 0 40px 0;">
          <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="width: 100%; max-width: 320px; height: auto; display: block; mix-blend-mode: multiply;" />
          <p style="color: #940856; font-size: 0.8rem; font-weight: 800; letter-spacing: 1.5px; margin-top: 8px; text-align: center;">CRIA INTELIGENTE CON RESULTADOS REALES</p>
        </div>

        <!-- Auth Tabs / Header -->
        ${(activeAuthTab === 'forgot' || activeAuthTab === 'reset') ? `
          <div style="text-align: center; margin-bottom: 24px; width: 100%; animation: fadeIn var(--transition-base) ease-out;">
            <h2 style="font-size: var(--text-xl); font-weight: var(--font-extrabold); color: var(--color-text-primary); margin: 0 0 8px 0; text-transform: none;">
              ${activeAuthTab === 'forgot' ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
            </h2>
            <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin: 0; line-height: 1.4;">
              ${activeAuthTab === 'forgot' 
                ? 'Ingresa tu correo electrónico para recibir un enlace de recuperación.' 
                : 'Ingresa tu nueva contraseña para acceder a tu granja.'}
            </p>
          </div>
        ` : `
          <div class="tabs auth-tabs animate-fade-in-up" id="auth-tabs">
            <button
              class="tabs__tab ${activeAuthTab === 'register' ? 'tabs__tab--active' : ''}"
              data-tab="register"
              id="tab-register"
            >
              Crear Cuenta
            </button>
            <button
              class="tabs__tab ${activeAuthTab === 'login' ? 'tabs__tab--active' : ''}"
              data-tab="login"
              id="tab-login"
            >
              Iniciar Sesión
            </button>
          </div>
        `}

        <!-- Form -->
        <form class="auth-form animate-fade-in-up" id="auth-form" novalidate>
          ${renderFormFields()}

          <!-- Status notification message -->
          <div id="auth-status-banner" style="display: none; margin-bottom: 14px; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; text-align: center; line-height: 1.4; transition: all 0.3s ease;"></div>

          <!-- Error message -->
          <div class="auth-form__error ${formError ? 'auth-form__error--visible' : ''}" id="form-error">
            ${formError || ''}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="btn btn--block btn--lg auth-submit"
            id="auth-submit"
            style="background: #fb2c74; color: white; border-radius: 30px; box-shadow: 0 8px 25px -5px rgba(251, 44, 116, 0.5); font-weight: 700; border: none; font-size: 1.1rem; padding: 14px 20px; transition: transform 0.2s, box-shadow 0.2s;"
            ${isSubmitting ? 'disabled' : ''}
          >
            ${isSubmitting ? '<span class="spinner" style="width:24px;height:24px;border-width:2px;border-color:white;border-right-color:transparent;margin-right:8px;"></span>' : ''}
            ${activeAuthTab === 'forgot' ? 'Enviar Enlace' : (activeAuthTab === 'reset' ? 'Guardar Contraseña' : (activeAuthTab === 'register' ? 'Comenzar mi granja' : 'Iniciar Sesión'))}
          </button>
        </form>

        <!-- Back to login link -->
        ${activeAuthTab === 'forgot' ? `
          <div style="text-align: center; margin-top: 16px; margin-bottom: 24px; animation: fadeIn var(--transition-base) ease-out;">
            <a href="#" id="btn-back-to-login" class="text-primary font-semibold" style="font-size: 0.85rem; text-decoration: underline; color: #fb2c74;">Volver a Iniciar Sesión</a>
          </div>
        ` : ''}

        <!-- Legal Footer -->
        ${(activeAuthTab === 'register' || activeAuthTab === 'login') ? `
          <div class="auth-legal animate-fade-in-up" style="margin-top: 8px; text-align: center; width: 100%;">
            <p class="auth-legal__text" style="font-size: 0.72rem; color: #003366; line-height: 1.2; margin: 0 auto; font-weight: 400; text-align: center; display: block; width: 100%;">
              Al ${activeAuthTab === 'register' ? 'registrarte' : 'ingresar'}, aceptas nuestros Términos y Condiciones
            </p>
          </div>
        ` : ''}

        <!-- Trust Badges -->
        <div class="auth-trust animate-fade-in" style="padding: var(--space-md) var(--space-lg) var(--space-lg);">
          <div style="display: flex; justify-content: center; margin-bottom: 8px;">
            <img src="/vallemorales_logo.png" alt="Valle Morales" style="height: 28px; width: auto; object-fit: contain;" />
          </div>
          <p class="auth-trust__label" style="white-space: nowrap; font-size: 0.68rem; letter-spacing: 1px; margin-bottom: var(--space-md);">RESPALDADO POR GRANJA VALLE MORALES</p>
          <div class="auth-trust__icons">
            ${renderIcon('heart', 'auth-trust__icon', '20')}
            ${renderIcon('shield', 'auth-trust__icon', '20')}
            ${renderIcon('verified', 'auth-trust__icon', '20')}
            ${renderIcon('bolt', 'auth-trust__icon', '20')}
          </div>
        </div>

      </div>
    </div>
  `;

  attachAuthListeners();
  return cleanupAuthView;
}

/**
 * Render form fields based on active tab.
 */
function renderFormFields() {
  const googleHeaderHTML = (activeAuthTab === 'register' || activeAuthTab === 'login') ? `
    <button
      type="button"
      id="btn-google-auth"
      style="
        width: 100%;
        background: #ffffff;
        color: #1f2937;
        border: 1px solid #e2e8f0;
        border-radius: 30px;
        padding: 12px 20px;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        margin-bottom: 16px;
        transition: all 0.2s;
      "
      onmouseover="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';"
      onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)';"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0;">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Continuar con Google</span>
    </button>

    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; width: 100%;">
      <div style="height: 1px; background: #e2e8f0; flex: 1;"></div>
      <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">o con tu correo</span>
      <div style="height: 1px; background: #e2e8f0; flex: 1;"></div>
    </div>
  ` : '';

  if (activeAuthTab === 'register') {
    return `
      ${googleHeaderHTML}

      <div class="input-group">
        <label class="input-group__label" for="field-name">Tu Nombre Completo</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('user', '', '18')}</span>
          <input
            type="text"
            class="input-wrapper__field"
            id="field-name"
            name="fullName"
            placeholder="Ej: Juan Pérez"
            autocomplete="name"
            required
          />
        </div>
      </div>

      <div class="input-group">
        <label class="input-group__label" for="field-email">Correo Electrónico</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
          <input
            type="email"
            class="input-wrapper__field"
            id="field-email"
            name="email"
            placeholder="tu@correo.com"
            autocomplete="email"
            required
          />
        </div>
      </div>

      <div class="input-group">
        <label class="input-group__label" for="field-whatsapp">WhatsApp</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('phone', '', '18')}</span>
          <input
            type="tel"
            class="input-wrapper__field"
            id="field-whatsapp"
            name="whatsapp"
            placeholder="Ej: 3001234567"
            autocomplete="tel"
            minlength="10"
            required
          />
        </div>
      </div>

      <div class="input-group">
        <label class="input-group__label" for="field-password">Contraseña</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('lock', '', '18')}</span>
          <input
            type="${passwordVisible ? 'text' : 'password'}"
            class="input-wrapper__field"
            id="field-password"
            name="password"
            placeholder="••••••••"
            autocomplete="new-password"
            required
            minlength="6"
          />
          <button type="button" class="input-wrapper__action" id="toggle-password" aria-label="Mostrar contraseña">
            ${passwordVisible ? renderIcon('eyeOff', '', '18') : renderIcon('eye', '', '18')}
          </button>
        </div>
      </div>

      <div class="input-group" style="margin-bottom: 2px;">
        <label class="input-group__label" for="field-referral">¿Tienes un código de invitación? <span style="font-weight:400; color:#9ca3af;">(opcional)</span></label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">🎁</span>
          <input
            type="text"
            class="input-wrapper__field"
            id="field-referral"
            name="referralCode"
            placeholder="Ej: JUAN123"
            autocomplete="off"
            style="text-transform: uppercase;"
          />
          <span id="referral-status" style="font-size: 14px; margin-right: 8px;"></span>
        </div>
        <div id="referral-feedback" style="font-size: 0.72rem; margin-top: 2px; font-weight: 600;"></div>
      </div>

      <!-- Consent Checkboxes -->
      <div style="margin-top: 14px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.75rem; color: #475569; cursor: pointer; line-height: 1.3;">
          <input type="checkbox" id="check-terms" style="margin-top: 2px; accent-color: #fb2c74;" required />
          <span>Acepto los <a href="#" id="link-terms" style="color: #fb2c74; font-weight: 700; text-decoration: underline;">Términos y Condiciones</a> de Piggy App.</span>
        </label>
        <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.75rem; color: #475569; cursor: pointer; line-height: 1.3;">
          <input type="checkbox" id="check-habeas" style="margin-top: 2px; accent-color: #fb2c74;" required />
          <span>Autorizo el <a href="#" id="link-habeas" style="color: #fb2c74; font-weight: 700; text-decoration: underline;">Tratamiento de Mis Datos Personales</a>.</span>
        </label>
      </div>
    `;
  }

  if (activeAuthTab === 'forgot') {
    return `
      <div class="input-group">
        <label class="input-group__label" for="field-email">Correo Electrónico</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
          <input
            type="email"
            class="input-wrapper__field"
            id="field-email"
            name="email"
            placeholder="tu@correo.com"
            autocomplete="email"
            required
          />
        </div>
      </div>
    `;
  }

  if (activeAuthTab === 'reset') {
    return `
      <div class="input-group">
        <label class="input-group__label" for="field-new-password">Nueva Contraseña</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('lock', '', '18')}</span>
          <input
            type="${passwordVisible ? 'text' : 'password'}"
            class="input-wrapper__field"
            id="field-new-password"
            name="newPassword"
            placeholder="Mínimo 6 caracteres"
            autocomplete="new-password"
            required
            minlength="6"
          />
          <button type="button" class="input-wrapper__action" id="toggle-password" aria-label="Mostrar contraseña">
            ${passwordVisible ? renderIcon('eyeOff', '', '18') : renderIcon('eye', '', '18')}
          </button>
        </div>
      </div>
    `;
  }

  // Default: Login Tab
  return `
    ${googleHeaderHTML}

    <div class="input-group">
      <label class="input-group__label" for="field-email">Correo Electrónico</label>
      <div class="input-wrapper">
        <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
        <input
          type="email"
          class="input-wrapper__field"
          id="field-email"
          name="email"
          placeholder="tu@correo.com"
          autocomplete="email"
          required
        />
      </div>
    </div>

    <div class="input-group">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <label class="input-group__label" for="field-password">Contraseña</label>
        <a href="#" class="text-primary font-semibold" id="btn-forgot-password" style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.3px;">Olvidé mi contraseña</a>
      </div>
      <div class="input-wrapper">
        <span class="input-wrapper__icon">${renderIcon('lock', '', '18')}</span>
        <input
          type="${passwordVisible ? 'text' : 'password'}"
          class="input-wrapper__field"
          id="field-password"
          name="password"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
        <button type="button" class="input-wrapper__action" id="toggle-password" aria-label="Mostrar contraseña">
          ${passwordVisible ? renderIcon('eyeOff', '', '18') : renderIcon('eye', '', '18')}
        </button>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners for the auth view.
 */
function attachAuthListeners() {
  // Google Auth Button
  document.getElementById('btn-google-auth')?.addEventListener('click', async () => {
    try {
      showStatusMessage('🔄 Conectando con Google...', '#1e3a8a', '#eff6ff', '#bfdbfe');
      const res = await signInWithGoogle();
      if (res.error) {
        showFormError(res.error);
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      showFormError('No se pudo conectar con Google. Intenta de nuevo.');
    }
  });

  // Tab switching
  const tabsContainer = document.getElementById('auth-tabs');
  tabsContainer?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;

    activeAuthTab = tab.dataset.tab;
    formError = null;
    renderAuthView();
  });

  // Password toggle
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    const passwordField = document.getElementById('field-password') || document.getElementById('field-new-password');
    if (passwordField) {
      passwordField.type = passwordVisible ? 'text' : 'password';
      const toggleBtn = document.getElementById('toggle-password');
      if (toggleBtn) {
        toggleBtn.innerHTML = passwordVisible
          ? renderIcon('eyeOff', '', '18')
          : renderIcon('eye', '', '18');
      }
    }
  });

  // Click on "Olvidé mi contraseña"
  document.getElementById('btn-forgot-password')?.addEventListener('click', (e) => {
    e.preventDefault();
    activeAuthTab = 'forgot';
    formError = null;
    renderAuthView();
  });

  // Click on "Volver a Iniciar Sesión"
  document.getElementById('btn-back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    activeAuthTab = 'login';
    formError = null;
    renderAuthView();
  });

  // Referral code live validation
  const referralField = document.getElementById('field-referral');
  let referralDebounce = null;

  // Auto-fill referral code from URL parameter (?ref=CODE)
  if (referralField) {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      referralField.value = refCode.toUpperCase();
      // Trigger validation automatically
      referralField.dispatchEvent(new Event('input'));
    }
  }

  referralField?.addEventListener('input', () => {
    clearTimeout(referralDebounce);
    const code = referralField.value.trim();
    const statusEl = document.getElementById('referral-status');
    const feedbackEl = document.getElementById('referral-feedback');

    if (!code || code.length < 4) {
      if (statusEl) statusEl.textContent = '';
      if (feedbackEl) { feedbackEl.textContent = ''; feedbackEl.style.color = ''; }
      return;
    }

    if (statusEl) statusEl.textContent = '⏳';
    referralDebounce = setTimeout(async () => {
      try {
        const result = await validateReferralCode(code);
        if (statusEl) statusEl.textContent = result.valid ? '✅' : '❌';
        if (feedbackEl) {
          feedbackEl.textContent = result.valid
            ? `Invitado por: ${result.referrerName}`
            : 'Código no encontrado';
          feedbackEl.style.color = result.valid ? '#16a34a' : '#ef4444';
        }
      } catch {
        if (statusEl) statusEl.textContent = '';
        if (feedbackEl) { feedbackEl.textContent = ''; feedbackEl.style.color = ''; }
      }
    }, 600);
  });

  // Legal Modal Triggers (Términos & Habeas Data)
  document.getElementById('link-terms')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderLegalModal('terms');
  });

  document.getElementById('link-habeas')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderLegalModal('privacy');
  });

  // Form submission
  document.getElementById('auth-form')?.addEventListener('submit', handleSubmit);

  // Enable/disable submit button dynamically based on registration checkboxes
  const checkTerms = document.getElementById('check-terms');
  const checkHabeas = document.getElementById('check-habeas');
  const submitBtn = document.getElementById('auth-submit');

  const updateSubmitState = () => {
    if (activeAuthTab === 'register' && checkTerms && checkHabeas && submitBtn) {
      const allChecked = checkTerms.checked && checkHabeas.checked;
      submitBtn.disabled = !allChecked || isSubmitting;
      submitBtn.style.opacity = allChecked ? '1' : '0.5';
    } else if (submitBtn) {
      submitBtn.disabled = isSubmitting;
      submitBtn.style.opacity = '1';
    }
  };

  checkTerms?.addEventListener('change', updateSubmitState);
  checkHabeas?.addEventListener('change', updateSubmitState);

  // Initial check
  updateSubmitState();
}

/**
 * Handle form submission.
 */
async function handleSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return;

  const form = e.target;
  const formData = new FormData(form);

  if (activeAuthTab === 'forgot') {
    const email = formData.get('email')?.trim();
    if (!email) {
      showFormError('Por favor ingresa tu correo electrónico.');
      return;
    }
    await performForgotPassword(email);
    return;
  }

  if (activeAuthTab === 'reset') {
    const newPassword = formData.get('newPassword')?.trim();
    if (!newPassword || newPassword.length < 6) {
      showFormError('Tu contraseña debe tener al menos 6 caracteres.');
      return;
    }
    await performUpdatePassword(newPassword);
    return;
  }

  const email = formData.get('email')?.trim();
  const password = formData.get('password')?.trim();

  if (!email || !password) {
    showFormError('Por favor completa todos los campos obligatorios.');
    return;
  }

  if (activeAuthTab === 'register') {
    const fullName = formData.get('fullName')?.trim();
    const whatsapp = formData.get('whatsapp')?.trim();
    const referralCode = formData.get('referralCode')?.trim().toUpperCase() || null;

    if (!fullName) {
      showFormError('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!whatsapp) {
      showFormError('Por favor ingresa tu número de celular (WhatsApp).');
      return;
    }

    const whatsappDigits = whatsapp.replace(/\D/g, '');
    if (whatsappDigits.length < 10) {
      showFormError('Por favor revisa y corrige tu número de WhatsApp. Debe tener al menos 10 dígitos.');
      return;
    }

    const termsChecked = document.getElementById('check-terms')?.checked;
    const habeasChecked = document.getElementById('check-habeas')?.checked;

    if (!termsChecked || !habeasChecked) {
      showFormError('Debes aceptar los Términos y Condiciones y la autorización de Tratamiento de Datos para continuar.');
      return;
    }

    await performSignUp({ email, password, fullName, whatsapp, referralCode });
  } else {
    // Login flow — direct
    await performSignIn({ email, password });
  }
}

/**
 * Execute the forgot password flow.
 */
async function performForgotPassword(email) {
  isSubmitting = true;
  updateSubmitButton();

  try {
    const result = await sendPasswordReset(email);

    if (result.error) {
      showFormError(translateSupabaseError(result.error));
    } else {
      formError = null;
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="auth-page page">
          <div class="auth-page__content">
            <div class="auth-hero animate-fade-in" style="display: flex; justify-content: center; margin: 32px 0 40px 0;">
              <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="width: 100%; max-width: 320px; height: auto; display: block; mix-blend-mode: multiply;" />
            </div>
            
            <div class="animate-fade-in-up" style="text-align: center; padding: 32px 24px; background: var(--color-white); border-radius: 20px; border: 1px solid var(--color-border); box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px; width: 100%; box-sizing: border-box;">
              <div style="font-size: 48px; margin-bottom: 16px;">📧</div>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 8px; text-transform: none;">¡Correo Enviado!</h2>
              <p style="font-size: 0.9rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 24px;">
                Te hemos enviado un enlace de restablecimiento a <strong>${email}</strong>. Revisa tu bandeja de entrada y spam.
              </p>
              <button id="btn-back-from-forgot-success" class="btn btn--block btn--lg" style="background: #fb2c74; color: white; border-radius: 30px;">
                Volver a Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-back-from-forgot-success')?.addEventListener('click', () => {
        activeAuthTab = 'login';
        AppState.set({ isResettingPassword: false });
        renderAuthView();
      });
    }
  } catch (err) {
    showFormError('Ocurrió un error inesperado. Intenta de nuevo.');
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}

/**
 * Execute the update password flow (recovery).
 */
async function performUpdatePassword(newPassword) {
  isSubmitting = true;
  updateSubmitButton();

  try {
    const result = await updatePassword(newPassword);

    if (result.error) {
      showFormError(translateSupabaseError(result.error));
    } else {
      AppState.set({ isResettingPassword: false });
      showStatusMessage('✅ ¡Contraseña actualizada con éxito! Ingresando a tu granja...', '#065f46', '#ecfdf5', '#a7f3d0');
      setTimeout(() => {
        navigateTo('granja');
      }, 1500);
    }
  } catch (err) {
    showFormError('No se pudo actualizar la contraseña.');
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}

/**
 * Execute sign up flow.
 */
async function performSignUp({ email, password, fullName, whatsapp, referralCode }) {
  isSubmitting = true;
  formError = null;
  updateSubmitButton();

  try {
    const result = await signUp({ email, password, fullName, whatsapp });

    if (result.error) {
      showFormError(translateSupabaseError(result.error));
    } else {
      if (referralCode) {
        try {
          await linkReferral(referralCode);
        } catch (refErr) {
          console.warn('Non-blocking referral linking error:', refErr);
        }
      }

      showStatusMessage('✅ ¡Cuenta creada exitosamente! Redirigiendo...', '#065f46', '#ecfdf5', '#a7f3d0');

      setTimeout(() => {
        navigateTo('granja');
      }, 1200);
    }
  } catch (err) {
    console.error('Registration Error:', err);
    showFormError('Ocurrió un error inesperado al registrarse. Intenta nuevamente.');
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}

/**
 * Execute sign in flow.
 */
async function performSignIn({ email, password }) {
  isSubmitting = true;
  formError = null;
  updateSubmitButton();

  try {
    const result = await signIn({ email, password });

    if (result.error) {
      showFormError(translateSupabaseError(result.error));
    } else {
      navigateTo('granja');
    }
  } catch (err) {
    console.error('Sign-in error:', err);
    showFormError('Correo o contraseña incorrectos.');
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}

/**
 * Translate Supabase error messages to friendly Spanish.
 * @param {string} errorMsg
 * @returns {string}
 */
function translateSupabaseError(errorMsg) {
  if (!errorMsg) return 'Error al procesar la solicitud.';
  const lower = errorMsg.toLowerCase();

  if (lower.includes('already registered') || lower.includes('user_already_exists')) {
    return 'Este correo ya está registrado. Intenta iniciar sesión.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (lower.includes('rate limit')) {
    return 'Demasiados intentos. Por favor espera un momento e intenta nuevamente.';
  }

  return errorMsg;
}

/**
 * Show error message in form.
 * @param {string} msg
 */
function showFormError(msg) {
  formError = msg;
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.add('auth-form__error--visible');
  }
}

/**
 * Show status banner message.
 */
function showStatusMessage(msg, color, bgColor, borderColor) {
  const banner = document.getElementById('auth-status-banner');
  if (banner) {
    banner.textContent = msg;
    banner.style.color = color;
    banner.style.backgroundColor = bgColor;
    banner.style.border = `1px solid ${borderColor}`;
    banner.style.display = 'block';
  }
}

/**
 * Update submit button state.
 */
function updateSubmitButton() {
  const btn = document.getElementById('auth-submit');
  if (!btn) return;

  btn.disabled = isSubmitting;
  btn.style.opacity = isSubmitting ? '0.7' : '1';

  if (isSubmitting) {
    btn.innerHTML = `<span class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;border-right-color:transparent;margin-right:8px;display:inline-block;vertical-align:middle;"></span> Procesando...`;
  } else {
    btn.innerHTML = activeAuthTab === 'forgot'
      ? 'Enviar Enlace'
      : (activeAuthTab === 'reset'
        ? 'Guardar Contraseña'
        : (activeAuthTab === 'register'
          ? 'Comenzar mi granja'
          : 'Iniciar Sesión'));
  }
}

/**
 * Cleanup function.
 */
function cleanupAuthView() {
  isSubmitting = false;
  formError = null;
}
