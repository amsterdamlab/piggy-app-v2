/* ============================================
   PIGGY APP — Authentication Views
   Clean, Single-Screen Auth with Real Validation & Terms Modal
   ============================================ */

import { renderIcon } from '../icons.js';
import { signInWithPhone, signUpWithPhone, devBypassLogin } from '../services/authService.js';
import { navigateTo } from '../router.js';
import { showTermsModal } from '../components/TermsModal.js';

let isRegisterMode = false;
let isLoading = false;
let errorMessage = '';
let successMessage = '';

/**
 * Render Authentication View
 */
export function renderAuthView() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-page animate-fade-in">
      <div class="auth-container">
        
        <!-- Header -->
        <div class="auth-header">
          <div class="auth-header__logo">🐷</div>
          <h1 class="auth-header__title">PIGGY</h1>
          <p class="auth-header__subtitle" id="auth-subtitle">
            ${isRegisterMode ? 'Crea tu cuenta y empieza a ganar' : 'Ingresa a tu granja digital'}
          </p>
        </div>

        <!-- Alert messages -->
        <div id="auth-alert-container">
          ${errorMessage ? `<div class="auth-alert auth-alert--error">${errorMessage}</div>` : ''}
          ${successMessage ? `<div class="auth-alert auth-alert--success">${successMessage}</div>` : ''}
        </div>

        <!-- Form -->
        <form class="auth-form" id="auth-form" autocomplete="on">
          
          <!-- Full Name (Register only) -->
          <div class="form-group ${isRegisterMode ? '' : 'hidden'}" id="group-name">
            <label class="form-label" for="auth-name">Nombre Completo</label>
            <input 
              type="text" 
              class="form-input" 
              id="auth-name" 
              placeholder="Ej: Alejandra García"
              autocomplete="name"
              ${isRegisterMode ? 'required' : ''}
            />
          </div>

          <!-- Email (Optional on register, identifier on login) -->
          <div class="form-group" id="group-email">
            <label class="form-label" for="auth-email">Correo Electrónico</label>
            <input 
              type="email" 
              class="form-input" 
              id="auth-email" 
              placeholder="ale@correo.com"
              autocomplete="email"
              required
            />
          </div>

          <!-- WhatsApp / Phone (Register only) -->
          <div class="form-group ${isRegisterMode ? '' : 'hidden'}" id="group-phone">
            <label class="form-label" for="auth-phone">WhatsApp</label>
            <input 
              type="tel" 
              class="form-input" 
              id="auth-phone" 
              placeholder="300 123 4567"
              autocomplete="tel"
            />
          </div>

          <!-- Referral Code (Register only) -->
          <div class="form-group ${isRegisterMode ? '' : 'hidden'}" id="group-referral">
            <label class="form-label" for="auth-referral">Código de Referido (Opcional)</label>
            <input 
              type="text" 
              class="form-input" 
              id="auth-referral" 
              placeholder="Ej: ALE582"
              autocomplete="off"
            />
          </div>

          <!-- Password -->
          <div class="form-group" id="group-password">
            <label class="form-label" for="auth-password">Contraseña</label>
            <div style="position: relative;">
              <input 
                type="password" 
                class="form-input" 
                id="auth-password" 
                placeholder="••••••••"
                autocomplete="${isRegisterMode ? 'new-password' : 'current-password'}"
                required
                minlength="6"
                style="padding-right: 40px;"
              />
              <button 
                type="button" 
                id="toggle-password" 
                style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted);"
              >
                ${renderIcon('eye', '', '18')}
              </button>
            </div>
          </div>

          <!-- Legal Checkboxes (Register only) -->
          <div class="auth-form__legal ${isRegisterMode ? '' : 'hidden'}" id="group-legal">
            <label class="checkbox-label">
              <input type="checkbox" id="auth-terms" ${isRegisterMode ? 'required' : ''} />
              <span>Acepto los <a class="auth-link" id="btn-terms" href="javascript:void(0)">Términos y Condiciones</a></span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="auth-habeas" ${isRegisterMode ? 'required' : ''} />
              <span>Acepto la <a class="auth-link" id="btn-habeas" href="javascript:void(0)">Política de Tratamiento de Datos (Habeas Data)</a></span>
            </label>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="btn btn--primary btn--full btn--lg" 
            id="auth-submit-btn"
            ${isLoading ? 'disabled' : ''}
          >
            ${isLoading ? 'Procesando...' : (isRegisterMode ? 'Crear mi Cuenta' : 'Iniciar Sesión')}
          </button>

        </form>

        <!-- Switch Mode Footer -->
        <div class="auth-footer">
          <p class="auth-switch-text">
            ${isRegisterMode ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button type="button" class="auth-switch-btn" id="auth-switch-mode">
              ${isRegisterMode ? 'Inicia Sesión' : 'Regístrate aquí'}
            </button>
          </p>
        </div>

        <!-- Dev Bypass Button (Quick test access) -->
        <div class="auth-dev-section">
          <p class="auth-dev-title">Acceso Rápido de Prueba</p>
          <button type="button" class="auth-dev-btn" id="auth-dev-bypass">
            ${renderIcon('sparkle', '', '14')}
            Entrar como Alejandra (Modo Demo)
          </button>
        </div>

      </div>
    </div>
  `;

  attachAuthListeners();

  return () => {
    errorMessage = '';
    successMessage = '';
  };
}

/**
 * Attach DOM Event Listeners for Auth
 */
function attachAuthListeners() {
  const form = document.getElementById('auth-form');
  const switchBtn = document.getElementById('auth-switch-mode');
  const devBtn = document.getElementById('auth-dev-bypass');
  const togglePassBtn = document.getElementById('toggle-password');
  const passInput = document.getElementById('auth-password');
  const btnTerms = document.getElementById('btn-terms');
  const btnHabeas = document.getElementById('btn-habeas');

  // Switch between Login / Register
  switchBtn?.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    errorMessage = '';
    successMessage = '';
    renderAuthView();
  });

  // Password visibility toggle
  togglePassBtn?.addEventListener('click', () => {
    if (passInput) {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
    }
  });

  // Terms and Conditions Modal
  btnTerms?.addEventListener('click', () => {
    showTermsModal('terms');
  });

  // Habeas Data Modal
  btnHabeas?.addEventListener('click', () => {
    showTermsModal('habeas');
  });

  // Dev bypass click
  devBtn?.addEventListener('click', async () => {
    isLoading = true;
    updateSubmitState();
    try {
      await devBypassLogin();
      navigateTo('/granja');
    } catch (err) {
      errorMessage = err.message || 'Error al iniciar modo demo';
      renderAuthView();
    } finally {
      isLoading = false;
    }
  });

  // Form Submit Handler
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage = '';
    successMessage = '';

    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) {
      errorMessage = 'Por favor completa todos los campos requeridos.';
      renderAuthAlerts();
      return;
    }

    isLoading = true;
    updateSubmitState();

    try {
      if (isRegisterMode) {
        const fullName = document.getElementById('auth-name')?.value.trim();
        const whatsapp = document.getElementById('auth-phone')?.value.trim();
        const referralCode = document.getElementById('auth-referral')?.value.trim();
        const termsAccepted = document.getElementById('auth-terms')?.checked;
        const habeasAccepted = document.getElementById('auth-habeas')?.checked;

        if (!termsAccepted || !habeasAccepted) {
          throw new Error('Debes aceptar los Términos y la Política de Datos para continuar.');
        }

        await signUpWithPhone({
          email,
          password,
          fullName,
          whatsapp,
          referralCode,
          termsAccepted,
          habeasAccepted,
        });

        successMessage = '¡Cuenta creada con éxito! Redirigiendo a tu granja...';
        renderAuthAlerts();
        setTimeout(() => navigateTo('/granja'), 1000);

      } else {
        await signInWithPhone({ email, password });
        navigateTo('/granja');
      }
    } catch (err) {
      console.error('Auth error:', err);
      errorMessage = getHumanAuthError(err.message);
      renderAuthAlerts();
    } finally {
      isLoading = false;
      updateSubmitState();
    }
  });
}

/**
 * Update submit button state while loading
 */
function updateSubmitState() {
  const btn = document.getElementById('auth-submit-btn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Procesando...' : (isRegisterMode ? 'Crear mi Cuenta' : 'Iniciar Sesión');
}

/**
 * Render alert messages in DOM
 */
function renderAuthAlerts() {
  const container = document.getElementById('auth-alert-container');
  if (!container) return;
  container.innerHTML = `
    ${errorMessage ? `<div class="auth-alert auth-alert--error">${errorMessage}</div>` : ''}
    ${successMessage ? `<div class="auth-alert auth-alert--success">${successMessage}</div>` : ''}
  `;
}

/**
 * Friendly Spanish error messages for Auth
 */
function getHumanAuthError(msg) {
  if (!msg) return 'Ocurrió un error. Intenta de nuevo.';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos. Verifica e intenta de nuevo.';
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con este correo. Inicia sesión.';
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('Email not confirmed')) return 'Por favor confirma tu correo electrónico para continuar.';
  return msg;
}
