/* ============================================
   PIGGY APP — Auth View (Screen 1)
   Registration and Login with pig mascot
   ============================================ */

import { renderIcon } from '../icons.js';
import { signUp, signIn } from '../services/authService.js';
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

        <!-- Logo -->
        <div class="auth-logo animate-fade-in">
          <span style="font-size: 28px;">🐷</span>
          <span class="auth-logo__text">Piggy</span>
        </div>

        <!-- Mascot Image -->
        <div class="auth-mascot animate-scale-in">
          <div class="auth-mascot__circle">
            <img
              src="/src/assets/piggy-mascot.svg"
              alt="Piggy mascot"
              class="auth-mascot__img"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="auth-mascot__fallback" style="display:none;">
              <span style="font-size: 100px; line-height: 1;">🐷</span>
            </div>
          </div>
        </div>

        <!-- Headline -->
        <h1 class="auth-headline animate-fade-in-up">
          Adopta un Piggy y únete<br/>a la <span class="text-primary">economía real</span>
        </h1>

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
            class="btn btn--primary btn--block btn--lg auth-submit"
            id="auth-submit"
            ${isSubmitting ? 'disabled' : ''}
          >
            ${isSubmitting ? '<span class="spinner" style="width:24px;height:24px;border-width:2px;"></span>' : ''}
            ${activeAuthTab === 'register' ? 'Comenzar Adopción' : 'Iniciar Sesión'}
            ${!isSubmitting ? renderIcon('arrowRight', '', '20') : ''}
          </button>
        </form>

        <!-- Legal Footer -->
        <div class="auth-legal animate-fade-in-up">
          <a href="#" class="auth-legal__link text-primary font-semibold">MÁS INFORMACIÓN</a>
          <p class="auth-legal__text text-muted text-xs">
            Al continuar, aceptas nuestros términos de servicio y políticas de privacidad.
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

        if (!fullName) {
            showFormError('Por favor ingresa tu nombre completo.');
            return;
        }

        // Show terms modal BEFORE creating account
        renderLegalModal({
            onAccept: async () => {
                await performSignUp({ email, password, fullName, whatsapp });
            },
            onReject: () => {
                // User cancelled — do nothing, stay on auth
                console.log('\uD83D\uDC37 User declined terms, signup cancelled.');
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
async function performSignUp({ email, password, fullName, whatsapp }) {
    isSubmitting = true;
    updateSubmitButton();

    try {
        const result = await signUp({ email, password, fullName, whatsapp });

        if (result.error) {
            showFormError(translateSupabaseError(result.error));
        } else {
            navigateTo('granja');
        }
    } catch (error) {
        console.error('\uD83D\uDC37 SignUp error:', error);
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
        console.error('\uD83D\uDC37 SignIn error:', error);
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
        btn.innerHTML = `
      ${activeAuthTab === 'register' ? 'Comenzar Adopción' : 'Iniciar Sesión'}
      ${renderIcon('arrowRight', '', '20')}
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
