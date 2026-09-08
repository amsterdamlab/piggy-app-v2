/* ============================================
   PIGGY APP — Auth View (Screen 1)
   Registration and Login with pig mascot
   ============================================ */

import { renderIcon } from '../icons.js';
import { signUp, signIn, signInWithGoogle, sendPasswordReset, updatePassword } from '../services/authService.js';
import { translateSupabaseError } from '../services/authErrors.js';
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
            style="margin-top: 20px; background: #fb2c74; color: white; border-radius: 30px; box-shadow: 0 8px 25px -5px rgba(251, 44, 116, 0.5); font-weight: 700; border: none; font-size: 1.1rem; padding: 14px 20px; transition: transform 0.2s, box-shadow 0.2s;"
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
        <div class="auth-trust animate-fade-in">
          <div style="display: flex; justify-content: center; margin-bottom: 8px;">
            <img src="/vallemorales_logo.png" alt="Granja Villa Morales del Valle SAS" style="height: 45px; width: auto; object-fit: contain; max-width: 100%;" />
          </div>
          <p class="auth-trust__label">RESPALDADO POR<br>GRANJA VILLA MORALES DEL VALLE SAS</p>
          <div class="auth-trust__icons">
            ${renderIcon('bolt', 'auth-trust__icon', '20')}
            ${renderIcon('shield', 'auth-trust__icon', '20')}
            ${renderIcon('verified', 'auth-trust__icon', '20')}
          </div>
          <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 14px; font-weight: 500; text-align: center;">
            © Todos los derechos reservados Piggy App. 2026
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
    <button type="button" id="btn-google-auth" style="width:100%; background:#ffffff; color:#1f2937; border:1px solid #e2e8f0; border-radius:30px; padding:12px 20px; font-size:0.95rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-bottom:16px; transition:all 0.2s;">
      <svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0;">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <span>Continuar con Google</span>
    </button>
    <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:20px; width:100%;">
      <div style="height:1px; background:#e2e8f0; flex:1;"></div>
      <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">o con tu correo</span>
      <div style="height:1px; background:#e2e8f0; flex:1;"></div>
    </div>
  ` : '';

  if (activeAuthTab === 'register') {
    return `
      ${googleHeaderHTML}
      <div class="input-group">
        <label class="input-group__label" for="field-name">Tu Nombre Completo</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('user', '', '18')}</span>
          <input type="text" class="input-wrapper__field" id="field-name" name="fullName" placeholder="Ej: Juan Pérez" autocomplete="name" required />
        </div>
      </div>
      <div class="input-group">
        <label class="input-group__label" for="field-email">Correo Electrónico</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
          <input type="email" class="input-wrapper__field" id="field-email" name="email" placeholder="tu@correo.com" autocomplete="email" required />
        </div>
      </div>
      <div class="input-group">
        <label class="input-group__label" for="field-whatsapp">WhatsApp</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('phone', '', '18')}</span>
          <input type="tel" class="input-wrapper__field" id="field-whatsapp" name="whatsapp" placeholder="Ej: 3001234567" autocomplete="tel" minlength="10" required />
        </div>
      </div>
      <div class="input-group">
        <label class="input-group__label" for="field-password">Contraseña</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('lock', '', '18')}</span>
          <input type="${passwordVisible ? 'text' : 'password'}" class="input-wrapper__field" id="field-password" name="password" placeholder="••••••••" autocomplete="new-password" required minlength="6" />
          <button type="button" class="input-wrapper__action" id="toggle-password" aria-label="Mostrar contraseña">
            ${passwordVisible ? renderIcon('eyeOff', '', '18') : renderIcon('eye', '', '18')}
          </button>
        </div>
      </div>
      <div class="input-group" style="margin-bottom: 2px;">
        <label class="input-group__label" for="field-referral">¿Tienes un código de invitación? <span style="font-weight:400; color:#9ca3af;">(opcional)</span></label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('giftBox', '', '18')}</span>
          <input type="text" class="input-wrapper__field" id="field-referral" name="referralCode" placeholder="Ej: RAFA1B2" autocomplete="off" style="text-transform: uppercase;" />
          <span id="referral-status" style="font-size:16px; flex-shrink:0; padding-right:8px;"></span>
        </div>
        <div id="referral-feedback" style="font-size:0.75rem; margin-top:2px;"></div>
      </div>
      <div class="auth-checkboxes" style="margin-top: 18px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 10px; text-align: left;">
        <label class="checkbox" for="check-terms" style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.85rem; color: #4b5563; line-height: 1.4;">
          <input type="checkbox" id="check-terms" name="acceptTerms" required style="margin-top: 3px; width: 16px; height: 16px; accent-color: #fb2c74;" />
          <span>He leído y acepto los <a href="terminos-y-condiciones.html" target="_blank" class="text-primary font-semibold" style="text-decoration: underline; color: #fb2c74; font-weight: 700;">Términos y Condiciones</a> de Piggy App.</span>
        </label>
        <label class="checkbox" for="check-habeas" style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.85rem; color: #4b5563; line-height: 1.4;">
          <input type="checkbox" id="check-habeas" name="acceptHabeas" required style="margin-top: 3px; width: 16px; height: 16px; accent-color: #fb2c74;" />
          <span>Autorizo el <a href="tratamiento-de-datos.html" target="_blank" class="text-primary font-semibold" style="text-decoration: underline; color: #fb2c74; font-weight: 700;">Tratamiento de Datos Personales</a> (Habeas Data).</span>
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
          <input type="email" class="input-wrapper__field" id="field-email" name="email" placeholder="tu@correo.com" autocomplete="email" required />
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
          <input type="${passwordVisible ? 'text' : 'password'}" class="input-wrapper__field" id="field-new-password" name="newPassword" placeholder="Mínimo 6 caracteres" required minlength="6" />
          <button type="button" class="input-wrapper__action" id="toggle-password" aria-label="Mostrar contraseña">
            ${passwordVisible ? renderIcon('eyeOff', '', '18') : renderIcon('eye', '', '18')}
          </button>
        </div>
      </div>
    `;
  }

  return `
    ${googleHeaderHTML}
    <div class="input-group">
      <label class="input-group__label" for="field-email">Correo Electrónico</label>
      <div class="input-wrapper">
        <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
        <input type="email" class="input-wrapper__field" id="field-email" name="email" placeholder="tu@correo.com" autocomplete="email" required />
      </div>
    </div>
    <div class="input-group">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <label class="input-group__label" for="field-password">Contraseña</label>
        <a href="#" class="text-primary font-semibold" id="btn-forgot-password" style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.3px;">Olvidé mi contraseña</a>
      </div>
      <div class="input-wrapper">
        <span class="input-wrapper__icon">${renderIcon('lock', '', '18')}</span>
        <input type="${passwordVisible ? 'text' : 'password'}" class="input-wrapper__field" id="field-password" name="password" placeholder="••••••••" autocomplete="current-password" required />
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
    clearFieldErrors();
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
    clearFieldErrors();
    renderAuthView();
  });

  // Click on "Volver a Iniciar Sesión"
  document.getElementById('btn-back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    activeAuthTab = 'login';
    clearFieldErrors();
    renderAuthView();
  });

  // Referral code live validation
  const referralField = document.getElementById('field-referral');
  let referralDebounce = null;

  const performReferralValidation = async (code) => {
    const statusEl = document.getElementById('referral-status');
    const feedbackEl = document.getElementById('referral-feedback');

    if (!code || code.length < 4) {
      if (statusEl) statusEl.textContent = '';
      if (feedbackEl) { feedbackEl.textContent = ''; feedbackEl.style.color = ''; }
      return;
    }

    if (statusEl) statusEl.textContent = '⏳';
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
  };

  if (referralField) {
    // 1. Listen for manual input
    referralField.addEventListener('input', () => {
      clearTimeout(referralDebounce);
      const code = referralField.value.trim().toUpperCase();
      referralDebounce = setTimeout(() => {
        performReferralValidation(code);
      }, 500);
    });

    // 2. Auto-fill and immediately validate if arriving via referral link (?ref=CODE)
    let refCode = null;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ref')) {
      refCode = urlParams.get('ref');
    } else if (window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      if (hashParams.get('ref')) {
        refCode = hashParams.get('ref');
      }
    }

    if (!refCode) {
      try {
        refCode = sessionStorage.getItem('pending_referral_code');
      } catch (e) {}
    }

    if (refCode) {
      const cleanRef = refCode.trim().toUpperCase();
      try {
        sessionStorage.setItem('pending_referral_code', cleanRef);
      } catch (e) {}
      referralField.value = cleanRef;
      performReferralValidation(cleanRef);
    }
  }

  // Auto-clear field error and general banner when user types or interacts with fields
  const authForm = document.getElementById('auth-form');
  authForm?.addEventListener('input', (e) => {
    const target = e.target;
    if (target) {
      const wrapper = target.closest('.input-wrapper');
      if (wrapper) {
        wrapper.classList.remove('input-wrapper--error');
      }
      if (target.type === 'checkbox') {
        document.querySelector('.auth-checkboxes--error')?.classList.remove('auth-checkboxes--error');
      }
    }

    // If no more fields have red errors, clear the bottom error message
    const remainingErrors = authForm.querySelectorAll('.input-wrapper--error, .auth-checkboxes--error');
    if (remainingErrors.length === 0 && formError) {
      formError = null;
      const errorEl = document.getElementById('form-error');
      if (errorEl) {
        errorEl.innerHTML = '';
        errorEl.classList.remove('auth-form__error--visible');
      }
    }
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
      if (allChecked) {
        document.querySelector('.auth-checkboxes--error')?.classList.remove('auth-checkboxes--error');
      }
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
      showFormError('Por favor ingresa tu correo electrónico.', null, ['field-email']);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFormError('Por favor ingresa un correo electrónico válido.', null, ['field-email']);
      return;
    }
    await performForgotPassword(email);
    return;
  }

  if (activeAuthTab === 'reset') {
    const newPassword = formData.get('newPassword')?.trim();
    if (!newPassword || newPassword.length < 6) {
      showFormError('Tu contraseña debe tener al menos 6 caracteres.', null, ['field-new-password']);
      return;
    }
    await performUpdatePassword(newPassword);
    return;
  }

  const email = formData.get('email')?.trim();
  const password = formData.get('password')?.trim();

  if (activeAuthTab === 'register') {
    const fullName = formData.get('fullName')?.trim();
    const whatsapp = formData.get('whatsapp')?.trim();
    const referralCode = formData.get('referralCode')?.trim().toUpperCase() || null;

    if (!fullName) {
      showFormError('Por favor ingresa tu nombre completo.', null, ['field-name']);
      return;
    }

    if (!email) {
      showFormError('Por favor ingresa tu correo electrónico.', null, ['field-email']);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFormError('Por favor ingresa un correo electrónico válido.', null, ['field-email']);
      return;
    }

    if (!whatsapp) {
      showFormError('Por favor ingresa tu número de celular (WhatsApp).', null, ['field-whatsapp']);
      return;
    }

    const whatsappDigits = whatsapp.replace(/\D/g, '');
    if (whatsappDigits.length < 10) {
      showFormError('Por favor revisa y corrige tu número de WhatsApp. Debe tener al menos 10 dígitos.', null, ['field-whatsapp']);
      return;
    }

    if (!password) {
      showFormError('Por favor ingresa tu contraseña.', null, ['field-password']);
      return;
    }

    if (password.length < 6) {
      showFormError('Tu contraseña debe tener al menos 6 caracteres.', null, ['field-password']);
      return;
    }

    const termsChecked = document.getElementById('check-terms')?.checked;
    const habeasChecked = document.getElementById('check-habeas')?.checked;

    if (!termsChecked || !habeasChecked) {
      showFormError('Debes aceptar los Términos y Condiciones y la autorización de Tratamiento de Datos para continuar.', null, ['check-terms', 'check-habeas']);
      return;
    }

    await performSignUp({ email, password, fullName, whatsapp, referralCode });
  } else {
    // Login flow
    if (!email) {
      showFormError('Por favor ingresa tu correo electrónico.', null, ['field-email']);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFormError('Por favor ingresa un correo electrónico válido.', null, ['field-email']);
      return;
    }

    if (!password) {
      showFormError('Por favor ingresa tu contraseña.', null, ['field-password']);
      return;
    }

    await performSignIn({ email, password });
  }
}

/**
 * Helper to render full-screen feedback cards (Email sent, Password saved, Confirm email).
 */
function renderAuthMessageScreen({ emoji, title, messageHtml, buttonText, onButtonClick }) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-page page">
      <div class="auth-page__content">
        <div class="auth-hero animate-fade-in" style="display: flex; justify-content: center; margin: 32px 0 40px 0;">
          <img src="/piggyapp_logo1.png" alt="Piggy App Logo" style="width: 100%; max-width: 320px; height: auto; display: block; mix-blend-mode: multiply;" />
        </div>
        <div class="animate-fade-in-up" style="text-align: center; padding: 32px 24px; background: var(--color-white); border-radius: 20px; border: 1px solid var(--color-border); box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px; width: 100%; box-sizing: border-box;">
          <div style="font-size: 48px; margin-bottom: 16px;">${emoji}</div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 8px; text-transform: none;">${title}</h2>
          <p style="font-size: 0.9rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 24px;">${messageHtml}</p>
          <button id="btn-feedback-action" class="btn btn--primary btn--block" style="border-radius: 30px; font-weight: bold; background: #fb2c74; border: none; padding: 12px; color: white;">
            ${buttonText}
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btn-feedback-action')?.addEventListener('click', onButtonClick);
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
      renderAuthMessageScreen({
        emoji: '📧',
        title: '¡Correo Enviado!',
        messageHtml: `Te hemos enviado un enlace de restablecimiento a <strong>${email}</strong>. Revisa tu bandeja de entrada y spam.`,
        buttonText: 'Volver al Inicio',
        onButtonClick: () => { activeAuthTab = 'login'; renderAuthView(); }
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
      renderAuthMessageScreen({
        emoji: '🎉',
        title: '¡Contraseña Guardada!',
        messageHtml: 'Tu contraseña ha sido actualizada exitosamente. Ya puedes acceder a todas las funciones de tu Cuenta Agro.',
        buttonText: 'Ingresar a Mi Granja',
        onButtonClick: () => { navigateTo('granja'); }
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
 * Execute the signup after terms are accepted.
 */
async function performSignUp({ email, password, fullName, whatsapp, referralCode }) {
  isSubmitting = true;
  updateSubmitButton('Creando cuenta...');
  showStatusMessage('🔄 Iniciando creación de tu cuenta agro y verificando datos...', '#1e3a8a', '#eff6ff', '#bfdbfe');

  try {
    const result = await signUp({ email, password, fullName, whatsapp }, (msg) => {
      showStatusMessage(msg, '#1e3a8a', '#eff6ff', '#bfdbfe');
    });

    if (result.error) {
      hideStatusMessage();
      showFormError(translateSupabaseError(result.error), result.error);
      return;
    }

    // Link referral if code was provided
    if (referralCode && result.user?.id) {
      showStatusMessage('🎁 Vinculando código de invitación con tu referente...', '#6b21a8', '#faf5ff', '#e9d5ff');
      updateSubmitButton('Vinculando invitación...');
      try {
        const linkResult = await linkReferral(result.user.id, referralCode);
        if (linkResult.linked) {
          console.log('🐷 Referral linked successfully');
        } else {
          console.warn('🐷 Referral link skipped:', linkResult.reason);
        }
      } catch (refErr) {
        console.warn('🐷 Referral linking error (non-blocking):', refErr);
      }
    }

    // If confirmation email is required by Supabase
    if (result.requiresConfirmation) {
      hideStatusMessage();
      renderAuthMessageScreen({
        emoji: '📧',
        title: '¡Confirma tu Correo!',
        messageHtml: `Te hemos enviado un enlace a <strong>${email}</strong> para activar tu Cuenta Agro. Revisa tu bandeja de entrada y spam.`,
        buttonText: 'Ir a Iniciar Sesión',
        onButtonClick: () => { activeAuthTab = 'login'; renderAuthView(); }
      });
      return;
    }

    showStatusMessage('✅ ¡Cuenta creada con éxito! Redirigiendo a tu granja...', '#065f46', '#ecfdf5', '#a7f3d0');
    updateSubmitButton('Iniciando sesión...');
    setTimeout(() => navigateTo('granja'), 600);
  } catch (error) {
    console.error('🐷 SignUp error:', error);
    hideStatusMessage();
    showFormError(translateSupabaseError(error), error);
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
  updateSubmitButton('Verificando credenciales...');
  showStatusMessage('🔄 Conectando con el servidor de seguridad para validar tu acceso...', '#1e3a8a', '#eff6ff', '#bfdbfe');

  try {
    const result = await signIn({ email, password }, (msg) => {
      showStatusMessage(msg, '#1e3a8a', '#eff6ff', '#bfdbfe');
    });

    if (result.error) {
      hideStatusMessage();
      showFormError(translateSupabaseError(result.error), result.error);
    } else {
      showStatusMessage('✅ ¡Credenciales validadas con éxito! Redirigiendo a tu granja...', '#065f46', '#ecfdf5', '#a7f3d0');
      updateSubmitButton('Iniciando sesión...');
      setTimeout(() => navigateTo('granja'), 600);
    }
  } catch (error) {
    console.error('🐷 SignIn error:', error);
    hideStatusMessage();
    showFormError(translateSupabaseError(error), error);
  } finally {
    isSubmitting = false;
    updateSubmitButton();
  }
}



/**
 * Show status message during login / signup.
 */
function showStatusMessage(message, color = '#1e3a8a', bgColor = '#eff6ff', borderColor = '#bfdbfe') {
  const banner = document.getElementById('auth-status-banner');
  if (banner) {
    banner.textContent = message;
    banner.style.color = color;
    banner.style.backgroundColor = bgColor;
    banner.style.border = `1px solid ${borderColor}`;
    banner.style.display = 'block';
  }
}

/**
 * Hide status message.
 */
function hideStatusMessage() {
  const banner = document.getElementById('auth-status-banner');
  if (banner) {
    banner.style.display = 'none';
  }
}

/**
 * Clear all field error highlights and general form error.
 */
function clearFieldErrors() {
  formError = null;
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.innerHTML = '';
    errorEl.classList.remove('auth-form__error--visible');
  }
  document.querySelectorAll('.input-wrapper--error').forEach(el => el.classList.remove('input-wrapper--error'));
  document.querySelector('.auth-checkboxes--error')?.classList.remove('auth-checkboxes--error');
}

/**
 * Highlight invalid field wrappers with a red border and subtle shake animation.
 */
function highlightInvalidFields(fieldIds = []) {
  document.querySelectorAll('.input-wrapper--error').forEach(el => el.classList.remove('input-wrapper--error'));
  document.querySelector('.auth-checkboxes--error')?.classList.remove('auth-checkboxes--error');

  let firstEl = null;
  fieldIds.forEach((id) => {
    if (id === 'check-terms' || id === 'check-habeas') {
      const cbContainer = document.querySelector('.auth-checkboxes');
      if (cbContainer) cbContainer.classList.add('auth-checkboxes--error');
      if (!firstEl) firstEl = document.getElementById(id);
    } else {
      const field = document.getElementById(id);
      if (field) {
        field.closest('.input-wrapper')?.classList.add('input-wrapper--error');
        if (!firstEl) firstEl = field;
      }
    }
  });

  if (firstEl) {
    firstEl.focus();
    firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Show form error with a clean, friendly UI and highlight erroneous fields in red.
 */
function showFormError(message, rawError = null, invalidFieldIds = []) {
  hideStatusMessage();
  if (rawError) console.warn('🐷 Auth Error Detail:', rawError);

  const safeMessage = (message && typeof message === 'string' && message !== '{}' && message !== '[object Object]')
    ? message
    : 'Ha ocurrido un error al procesar tu solicitud. Intenta nuevamente.';

  formError = safeMessage;
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 4px 0;">
        <span style="font-size: 1.05rem; flex-shrink: 0;">⚠️</span>
        <span style="font-weight: 600; font-size: 0.85rem; color: #b91c1c; line-height: 1.35;">${safeMessage}</span>
      </div>
    `;
    errorEl.classList.add('auth-form__error--visible');
  }

  // Auto-detect field IDs if not explicitly passed
  let fieldsToHighlight = Array.isArray(invalidFieldIds) && invalidFieldIds.length > 0 ? [...invalidFieldIds] : [];
  if (fieldsToHighlight.length === 0 && safeMessage) {
    const lower = safeMessage.toLowerCase();
    if (lower.includes('ingresa tu nombre') || lower.includes('nombre completo')) {
      fieldsToHighlight.push('field-name');
    }
    if (
      lower.includes('ingresa tu correo') ||
      lower.includes('correo electrónico válido') ||
      lower.includes('correo ya se encuentra registrado') ||
      lower.includes('correo inválido') ||
      lower.includes('invalid email') ||
      lower.includes('already registered')
    ) {
      fieldsToHighlight.push('field-email');
    }
    if (lower.includes('número de whatsapp') || lower.includes('número de celular') || lower.includes('corrige tu número')) {
      fieldsToHighlight.push('field-whatsapp');
    }
    if (lower.includes('tu contraseña') || lower.includes('6 caracteres') || lower.includes('contraseña incorrecta')) {
      fieldsToHighlight.push(activeAuthTab === 'reset' ? 'field-new-password' : 'field-password');
    }
    if (lower.includes('términos y condiciones') || lower.includes('tratamiento de datos')) {
      fieldsToHighlight.push('check-terms', 'check-habeas');
    }
  }

  if (fieldsToHighlight.length > 0) {
    highlightInvalidFields(fieldsToHighlight);
  }
}

/**
 * Update submit button loading state with custom progress message.
 */
function updateSubmitButton(customText = null) {
  const btn = document.getElementById('auth-submit');
  if (!btn) return;

  btn.disabled = isSubmitting;
  if (isSubmitting) {
    const text = customText || 'Cargando...';
    btn.innerHTML = `
      <span class="spinner" style="width:20px;height:20px;border-width:2px;border-color:white;border-right-color:transparent;margin-right:8px;vertical-align:middle;display:inline-block;"></span>
      <span style="vertical-align:middle;">${text}</span>
    `;
  } else {
    btn.innerHTML = `
      ${activeAuthTab === 'forgot' ? 'Enviar Enlace' : (activeAuthTab === 'reset' ? 'Guardar Contraseña' : (activeAuthTab === 'register' ? 'Comenzar mi granja' : 'Iniciar Sesión'))}
    `;
    if (activeAuthTab === 'register') {
      const checkTerms = document.getElementById('check-terms');
      const checkHabeas = document.getElementById('check-habeas');
      if (checkTerms && checkHabeas) {
        const allChecked = checkTerms.checked && checkHabeas.checked;
        btn.disabled = !allChecked;
        btn.style.opacity = allChecked ? '1' : '0.5';
      }
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

/**
 * Cleanup when leaving the auth view.
 */
function cleanupAuthView() {
  passwordVisible = false;
  isSubmitting = false;
  clearFieldErrors();
}
