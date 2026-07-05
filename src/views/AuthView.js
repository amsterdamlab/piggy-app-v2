/* ============================================
   PIGGY APP — Auth View (Screen 1)
   Registration and Login with pig mascot
   ============================================ */

import { renderIcon } from '../icons.js';
import { signUp, signIn, sendPasswordReset, updatePassword } from '../services/authService.js';
import { validateReferralCode, linkReferral } from '../services/referralService.js';
import { renderLegalModal } from '../components/LegalModal.js';
import { navigateTo } from '../router.js';
import { AppState } from '../state.js';

/** @type {'register' | 'login' | 'forgot' | 'reset'} */
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
        <div class="auth-hero animate-fade-in" style="display: flex; justify-content: center; margin: 32px 0 40px 0;">
          <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="width: 100%; max-width: 320px; height: auto; display: block; mix-blend-mode: multiply;" />
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
          <div class="auth-legal animate-fade-in-up" style="margin-top: 8px; text-align: center;">
            <p class="auth-legal__text" style="font-size: 0.75rem; color: #003366; line-height: 1.2; margin: 0; font-weight: 400;">
              Al ${activeAuthTab === 'register' ? 'registrarte' : 'ingresar'}, aceptas nuestros<br/>
              Términos y Condiciones
            </p>
          </div>
        ` : ''}

        <!-- Trust Badges -->
        <div class="auth-trust animate-fade-in" style="padding: var(--space-md) var(--space-lg) var(--space-lg);">
          <div style="display: flex; justify-content: center; margin-bottom: 8px;">
            <img src="/vallemorales_logo.png" alt="Valle Morales" style="height: 24px; width: auto; object-fit: contain;" />
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
  if (activeAuthTab === 'register') {
    return `
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
            placeholder="+57 300 123 4567"
            autocomplete="tel"
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

      <div class="input-group" style="margin-bottom: 8px;">
        <label class="input-group__label" for="field-referral">¿Tienes un código de invitación? <span style="font-weight:400; color:#9ca3af;">(opcional)</span></label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">🎁</span>
          <input
            type="text"
            class="input-wrapper__field"
            id="field-referral"
            name="referralCode"
            placeholder="Ej: RAFA1B2"
            autocomplete="off"
            style="text-transform: uppercase;"
          />
          <span id="referral-status" style="font-size:16px; flex-shrink:0; padding-right:8px;"></span>
        </div>
        <div id="referral-feedback" style="font-size:0.75rem; margin-top:2px;"></div>
      </div>
      <!-- Checkboxes de Términos y Tratamiento de Datos -->
      <div class="auth-checkboxes" style="margin-top: 0; display: flex; flex-direction: column; gap: 10px; text-align: left;">
        <label class="checkbox" for="check-terms" style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.85rem; color: #4b5563; line-height: 1.4;">
          <input type="checkbox" id="check-terms" name="acceptTerms" required style="margin-top: 3px; width: 16px; height: 16px; accent-color: #fb2c74;" />
          <span>
            He leído y acepto los <a href="terminos-y-condiciones.html" target="_blank" class="text-primary font-semibold" style="text-decoration: underline; color: #fb2c74; font-weight: 700;">Términos y Condiciones</a> de Piggy App.
          </span>
        </label>

        <label class="checkbox" for="check-habeas" style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.85rem; color: #4b5563; line-height: 1.4;">
          <input type="checkbox" id="check-habeas" name="acceptHabeas" required style="margin-top: 3px; width: 16px; height: 16px; accent-color: #fb2c74;" />
          <span>
            Autorizo el <a href="tratamiento-de-datos.html" target="_blank" class="text-primary font-semibold" style="text-decoration: underline; color: #fb2c74; font-weight: 700;">Tratamiento de Datos Personales</a> (Habeas Data).
          </span>
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
              <button id="btn-success-back" class="btn btn--primary btn--block" style="border-radius: 30px; font-weight: bold; background: #fb2c74; border: none; padding: 12px; color: white;">
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('btn-success-back')?.addEventListener('click', () => {
        activeAuthTab = 'login';
        renderAuthView();
      });
    }
  } catch (error) {
    console.error('🐷 ForgotPassword error:', error);
    showFormError('Ha ocurrido un error. Inténtalo de nuevo.');
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
      const app = document.getElementById('app');
      app.innerHTML = `
        <div class="auth-page page">
          <div class="auth-page__content">
            <div class="auth-hero animate-fade-in" style="display: flex; justify-content: center; margin: 32px 0 40px 0;">
              <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="width: 100%; max-width: 320px; height: auto; display: block; mix-blend-mode: multiply;" />
            </div>
            
            <div class="animate-fade-in-up" style="text-align: center; padding: 32px 24px; background: var(--color-white); border-radius: 20px; border: 1px solid var(--color-border); box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px; width: 100%; box-sizing: border-box;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 8px; text-transform: none;">¡Contraseña Guardada!</h2>
              <p style="font-size: 0.9rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 24px;">
                Tu contraseña ha sido actualizada exitosamente. Ya puedes acceder a todas las funciones de tu Cuenta Agro.
              </p>
              <button id="btn-success-farm" class="btn btn--primary btn--block" style="border-radius: 30px; font-weight: bold; background: #fb2c74; border: none; padding: 12px; color: white;">
                Ingresar a Mi Granja
              </button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('btn-success-farm')?.addEventListener('click', () => {
        navigateTo('granja');
      });
    }
  } catch (error) {
    console.error('🐷 UpdatePassword error:', error);
    showFormError('Ha ocurrido un error. Inténtalo de nuevo.');
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}

/**
 * Update submit button loading state without full re-render.
 */
function updateSubmitButton() {
  const btn = document.getElementById('auth-submit');
  if (!btn) return;

  btn.disabled = isSubmitting;
  if (isSubmitting) {
    btn.innerHTML = '<span class="spinner" style="width:24px;height:24px;border-width:2px;border-color:white;border-right-color:transparent;"></span>';
  } else {
    btn.innerHTML = `
      ${activeAuthTab === 'forgot' ? 'Enviar Enlace' : (activeAuthTab === 'reset' ? 'Guardar Contraseña' : (activeAuthTab === 'register' ? 'Comenzar mi granja' : 'Iniciar Sesión'))}
    `;
  }
}

/**
 * Cleanup when leaving the auth view.
 */
function cleanupAuthView() {
  passwordVisible = false;
  isSubmitting = false;
  formError = null;
}
