/* ============================================
   PIGGY APP — Auth View (Screen 1)
   Registration and Login with pig mascot
   ============================================ */

import { renderIcon } from '../icons.js';
import { signUp, signIn } from '../services/authService.js';
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

  app.innerHTML = `
    <div class="auth-page page">
      <div class="auth-page__content">

        <!-- New Hero Mascot and Title (From Image) -->
        <div class="auth-hero animate-fade-in" style="display: flex; justify-content: center; margin: 32px 0 40px 0;">
          <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="max-width: 100%; height: auto; display: block;" />
        </div>

        <!-- Auth Tabs -->
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
            ${activeAuthTab === 'register' ? 'Comenzar mi granja' : 'Iniciar Sesión'}
          </button>
        </form>

        <!-- Legal Footer -->
        <div class="auth-legal animate-fade-in-up" style="margin-top: 24px; text-align: left; padding-left: 10px;">
          <p class="auth-legal__text" style="font-size: 0.9rem; color: #003366; line-height: 1.5; margin: 0; font-weight: 400;">
            Al ${activeAuthTab === 'register' ? 'registrarte' : 'ingresar'}, aceptas nuestros<br/>
            Términos y Condiciones
          </p>
        </div>

        <!-- Trust Badges -->
        <div class="auth-trust animate-fade-in">
          <p class="auth-trust__label">RESPALDADO POR TECNOLOGÍA DE PUNTA</p>
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

      <div class="input-group">
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
        <div id="referral-feedback" style="font-size:0.75rem; margin-top:4px; min-height:18px;"></div>
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
        <a href="#" class="text-primary font-semibold" style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.3px;">Olvidé mi contraseña</a>
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
    const passwordField = document.getElementById('field-password');
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
            ? \`Invitado por: \${result.referrerName}\`
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
}

/**
 * Handle form submission.
 */
async function handleSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return;

  const form = e.target;
  const formData = new FormData(form);

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

    // Show terms modal BEFORE creating account
    renderLegalModal({
      onAccept: async () => {
        await performSignUp({ email, password, fullName, whatsapp, referralCode });
      },
      onReject: () => {
        // User cancelled — do nothing, stay on auth
        console.log('🐷 User declined terms, signup cancelled.');
      },
    });
  } else {
    // Login flow — direct
    await performSignIn({ email, password });
  }
}

/**
 * Execute the signup after terms are accepted.
 */
async function performSignUp({ email, password, fullName, whatsapp, referralCode }) {
  isSubmitting = true;
  updateSubmitButton();

  try {
    const result = await signUp({ email, password, fullName, whatsapp });

    if (result.error) {
      showFormError(translateSupabaseError(result.error));
      return;
    }

    // Link referral if code was provided
    if (referralCode && result.user?.id) {
      try {
        const linkResult = await linkReferral(result.user.id, referralCode);
        if (linkResult.linked) {
          console.log('🐷 Referral linked successfully');
        } else {
          console.warn('🐷 Referral link skipped:', linkResult.reason);
        }
      } catch (refErr) {
        // Don't block signup if referral linking fails
        console.warn('🐷 Referral linking error (non-blocking):', refErr);
      }
    }

    navigateTo('granja');
  } catch (error) {
    console.error('🐷 SignUp error:', error);
    showFormError('Ha ocurrido un error. Inténtalo de nuevo.');
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}

/**
 * Execute the sign in.
 */
async function performSignIn({ email, password }) {
  isSubmitting = true;
  updateSubmitButton();

  try {
    const result = await signIn({ email, password });

    if (result.error) {
      showFormError(translateSupabaseError(result.error));
    } else {
      navigateTo('granja');
    }
  } catch (error) {
    console.error('🐷 SignIn error:', error);
    showFormError('Ha ocurrido un error. Inténtalo de nuevo.');
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}

/**
 * Translate common Supabase error messages to Spanish.
 */
function translateSupabaseError(errorMessage) {
  const translations = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'User already registered': 'Este correo ya está registrado. Intenta iniciar sesión.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Email not confirmed': 'Revisa tu correo para confirmar tu cuenta.',
    'Signup is not allowed for this instance': 'El registro no está disponible en este momento.',
  };

  return translations[errorMessage] || errorMessage;
}

/**
 * Show form error.
 */
function showFormError(message) {
  formError = message;
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('auth-form__error--visible');
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
    btn.innerHTML = '<span class="spinner" style="width:24px;height:24px;border-width:2px;"></span>';
  } else {
    btn.innerHTML = \`
      \${activeAuthTab === 'register' ? 'Comenzar Adopción' : 'Iniciar Sesión'}
      \${renderIcon('arrowRight', '', '20')}
    \`;
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
