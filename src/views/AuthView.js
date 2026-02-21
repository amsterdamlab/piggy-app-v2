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

        <!-- Logo -->
        <div class="auth-logo animate-fade-in">
          <div class="auth-logo__image">
            <img src="pig1.png" alt="Piggy Logo" />
          </div>
          <h1 class="auth-logo__title">PIGGY</h1>
          <p class="auth-logo__tagline">Tu granja digital de cerdos</p>
        </div>

        <!-- Form Card -->
        <div class="auth-card animate-scale-in">
          <div class="auth-tabs" id="auth-tabs">
            <button class="auth-tabs__item ${activeAuthTab === 'register' ? 'auth-tabs__item--active' : ''}" data-tab="register">
              Registro
            </button>
            <button class="auth-tabs__item ${activeAuthTab === 'login' ? 'auth-tabs__item--active' : ''}" data-tab="login">
              Ingresar
            </button>
          </div>

          <form id="auth-form" class="auth-form">
            ${formError ? `<div class="auth-form__error animate-shake">${formError}</div>` : ''}
            
            ${activeAuthTab === 'register' ? renderRegisterFields() : renderLoginFields()}

            <button type="submit" class="btn btn--primary btn--block btn--large mt-lg" id="btn-auth-submit" ${isSubmitting ? 'disabled' : ''}>
              ${isSubmitting ? '<span class="spinner spinner--white"></span> Procesando...' : (activeAuthTab === 'register' ? 'Comenzar mi granja' : 'Entrar a mi granja')}
            </button>
          </form>

          ${activeAuthTab === 'register' ? `
            <p class="auth-card__footer">
              Al registrarte, aceptas nuestros <button type="button" class="btn-link" id="btn-terms">Términos y Condiciones</button>
            </p>
          ` : ''}
        </div>

      </div>
    </div>
  `;

  attachAuthListeners();
}

/**
 * Render registration specific fields.
 */
function renderRegisterFields() {
  return `
    <div class="auth-form__fields animate-fade-in">
      <div class="input-group">
        <label class="input-group__label" for="field-name">Nombre Completo</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('user', '', '18')}</span>
          <input
            type="text"
            class="input-wrapper__field"
            id="field-name"
            name="fullName"
            placeholder="Juan Pérez"
            autocomplete="name"
            required
          />
        </div>
      </div>

      <div class="input-group">
        <label class="input-group__label" for="field-email">Correo electrónico</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
          <input
            type="email"
            class="input-wrapper__field"
            id="field-email"
            name="email"
            placeholder="tu@ejemplo.com"
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
    </div>
  `;
}

/**
 * Render login specific fields.
 */
function renderLoginFields() {
  return `
    <div class="auth-form__fields animate-fade-in">
      <div class="input-group">
        <label class="input-group__label" for="field-email">Correo electrónico</label>
        <div class="input-wrapper">
          <span class="input-wrapper__icon">${renderIcon('mail', '', '18')}</span>
          <input
            type="email"
            class="input-wrapper__field"
            id="field-email"
            name="email"
            placeholder="tu@ejemplo.com"
            autocomplete="email"
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
            autocomplete="current-password"
            required
          />
          <button type="button" class="input-wrapper__action" id="toggle-password" aria-label="Mostrar contraseña">
            ${passwordVisible ? renderIcon('eyeOff', '', '18') : renderIcon('eye', '', '18')}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to auth view elements.
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
          : renderIcon(' eye', '', '18');
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

    if (!code) {
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

  // Terms modal
  document.getElementById('btn-terms')?.addEventListener('click', () => {
    renderLegalModal();
  });
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

  setSubmitting(true);
  formError = null;

  try {
    if (activeAuthTab === 'register') {
      const fullName = formData.get('fullName')?.trim();
      const whatsapp = formData.get('whatsapp')?.trim();
      const refCodeInput = formData.get('referralCode')?.trim();

      if (!fullName || !whatsapp) {
        throw new Error('Por favor completa todos los campos.');
      }

      const { data, error } = await signUp(email, password, { fullName, whatsapp });
      if (error) throw error;

      // If registered successfully, try to link referral
      if (data?.user && refCodeInput) {
        try {
          // Verify if code is valid first (extra safety)
          const val = await validateReferralCode(refCodeInput);
          if (val.valid) {
            await linkReferral(data.user.id, refCodeInput);
            console.log('Referral linked successfully');
          }
        } catch (refErr) {
          console.error('Non-critical: Referral linking failed:', refErr);
        }
      }

      // Proceed to app
      navigateTo('granja');
    } else {
      const { error } = await signIn(email, password);
      if (error) throw error;
      navigateTo('granja');
    }
  } catch (err) {
    console.error('Auth error:', err);
    showFormError(err.message || 'Ocurrió un error inesperado.');
    setSubmitting(false);
  }
}

/**
 * Update submitting state and re-render.
 */
function setSubmitting(value) {
  isSubmitting = value;
  const btn = document.getElementById('btn-auth-submit');
  if (btn) {
    btn.disabled = value;
    btn.innerHTML = value 
      ? '<span class="spinner spinner--white"></span> Procesando...' 
      : (activeAuthTab === 'register' ? 'Comenzar mi granja' : 'Entrar a mi granja');
  }
}

/**
 * Show form error.
 */
function showFormError(msg) {
  formError = msg;
  renderAuthView();
}
