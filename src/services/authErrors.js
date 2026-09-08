/* ============================================
   PIGGY APP — Auth Error Translator
   Maps Supabase and network auth errors to friendly Spanish messages
   ============================================ */

/**
 * Translate common Supabase and network error messages to friendly, actionable Spanish.
 * @param {any} rawError
 * @returns {string}
 */
export function translateSupabaseError(rawError) {
  if (!rawError) {
    return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
  }

  let text = '';
  if (typeof rawError === 'string') {
    text = rawError.trim();
  } else if (typeof rawError === 'object') {
    text = rawError.message ||
           rawError.error_description ||
           rawError.msg ||
           rawError.description ||
           rawError.error?.message ||
           (typeof rawError.error === 'string' ? rawError.error : '') ||
           rawError.details ||
           rawError.hint ||
           '';
    if (!text && Object.keys(rawError).length > 0) {
      try {
        const json = JSON.stringify(rawError);
        if (json !== '{}' && json !== '[]') {
          text = json;
        }
      } catch {
        text = '';
      }
    }
  }

  const lower = text ? text.toLowerCase() : '';

  // 1. Rate Limit & Cooldown (Supabase 60 seconds email rate limit)
  if (
    lower.includes('60 seconds') ||
    lower.includes('security purposes') ||
    lower.includes('once every') ||
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('over_request_rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('too_many_requests') ||
    lower.includes('rate_limit') ||
    lower.includes('cooldown') ||
    (rawError && typeof rawError === 'object' && rawError.status === 429)
  ) {
    return 'Por seguridad del servidor, debes esperar 60 segundos antes de volver a solicitar un registro con este correo. O si ya te registraste, pulsa "Iniciar Sesión".';
  }

  // 2. User already registered / already exists
  if (
    lower.includes('already registered') ||
    lower.includes('user_already_exists') ||
    lower.includes('already exists') ||
    lower.includes('duplicate key') ||
    lower.includes('identity_already_exists') ||
    lower.includes('email_exists') ||
    lower.includes('email address already exists') ||
    lower.includes('user with this email')
  ) {
    return 'Este correo ya se encuentra registrado. Ve a "Iniciar Sesión" para ingresar o usa la opción "Olvidé mi contraseña".';
  }

  // 3. Password requirements
  if (
    lower.includes('at least 6') ||
    lower.includes('weak_password') ||
    lower.includes('password should be') ||
    lower.includes('short password') ||
    lower.includes('6 characters')
  ) {
    return 'Tu contraseña debe tener al menos 6 caracteres.';
  }

  // 4. Invalid credentials (login)
  if (
    lower.includes('invalid login') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid credentials') ||
    lower.includes('wrong password')
  ) {
    return 'Correo o contraseña incorrectos. Por favor verifica tus datos.';
  }

  // 5. Email not confirmed
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o carpeta de spam.';
  }

  // 6. Invalid email format
  if (
    lower.includes('invalid email') ||
    lower.includes('unable to validate email') ||
    lower.includes('email address is invalid') ||
    lower.includes('invalid format')
  ) {
    return 'El correo electrónico ingresado no tiene un formato válido.';
  }

  // 7. Database or Server error
  if (
    lower.includes('database error') ||
    lower.includes('saving new user') ||
    lower.includes('unexpected_failure') ||
    lower.includes('internal_server_error')
  ) {
    return 'No pudimos registrar tu usuario en el servidor en este momento. Por favor intenta nuevamente en unos segundos.';
  }

  // 8. Signups disabled
  if (lower.includes('signup is not allowed') || lower.includes('signups not allowed') || lower.includes('signup_disabled')) {
    return 'El registro de nuevas cuentas no está disponible en este momento. Por favor intenta más tarde.';
  }

  // 9. Google OAuth provider
  if (lower.includes('unsupported provider') || lower.includes('provider is not enabled')) {
    return 'El inicio de sesión con Google aún no se encuentra disponible.';
  }

  // 10. User not found
  if (lower.includes('user not found') || lower.includes('no user found')) {
    return 'No encontramos una cuenta con este correo. Por favor regístrate.';
  }

  // 11. Network, ServiceWorker, & Connection Errors
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('fetchevent') ||
    lower.includes('respondwith') ||
    lower.includes('returned response is null') ||
    lower.includes('returned response is undefined') ||
    lower.includes('networkerror') ||
    lower.includes('aborterror') ||
    lower.includes('load failed') ||
    lower.includes('connection refused') ||
    lower.includes('timeout')
  ) {
    return 'Error de conexión con el servidor. Por favor verifica tu internet e inténtalo nuevamente.';
  }

  // Fallback for empty or unrecognized error strings
  if (!text || text === '{}' || text === '[]' || text === '[object Object]') {
    return 'No pudimos procesar el registro con estos datos. Si ya te habías registrado con este correo, intenta "Iniciar Sesión" o espera un momento.';
  }

  // If text contains unhandled technical English, provide a clean friendly fallback
  if (/[a-zA-Z]/.test(text) && (
    lower.includes('error') || lower.includes('failed') || lower.includes('exception') ||
    lower.includes('undefined') || lower.includes('null') || lower.includes('status') ||
    lower.includes('request') || lower.includes('response') || lower.includes('supabase') ||
    lower.includes('forbidden') || lower.includes('unauthorized') || lower.includes('bad')
  )) {
    return 'No se pudo completar el registro. Si ya habías intentado con este correo, intenta "Iniciar Sesión" o espera un minuto para reintentar.';
  }

  return text;
}
