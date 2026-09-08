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
  } else if (rawError instanceof Error) {
    text = rawError.message || rawError.name || '';
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

  // 1. Email Sending Limits & SMTP Rate Limits (Supabase Email Rate Limit)
  if (
    lower.includes('confirmation email') ||
    lower.includes('sending confirmation') ||
    lower.includes('email rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('email_send_rate_limit') ||
    lower.includes('smtp')
  ) {
    return 'El servidor de Supabase alcanzó el límite de envío de correos de verificación por hora. Por favor espera unos minutos para volver a intentar.';
  }

  // 2. Cooldown (60 seconds security wait)
  if (
    lower.includes('60 seconds') ||
    lower.includes('security purposes') ||
    lower.includes('once every') ||
    lower.includes('over_request_rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('too_many_requests') ||
    lower.includes('rate_limit') ||
    lower.includes('rate limit') ||
    lower.includes('cooldown') ||
    (rawError && typeof rawError === 'object' && rawError.status === 429)
  ) {
    return 'Por seguridad del servidor, debes esperar 60 segundos antes de volver a solicitar un registro.';
  }

  // 3. User already registered / already exists (ONLY when explicitly reported)
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

  // 4. Password requirements
  if (
    lower.includes('at least 6') ||
    lower.includes('weak_password') ||
    lower.includes('password should be') ||
    lower.includes('short password') ||
    lower.includes('6 characters')
  ) {
    return 'Tu contraseña debe tener al menos 6 caracteres.';
  }

  // 5. Invalid credentials (login)
  if (
    lower.includes('invalid login') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid credentials') ||
    lower.includes('wrong password')
  ) {
    return 'Correo o contraseña incorrectos. Por favor verifica tus datos.';
  }

  // 6. Email not confirmed
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o carpeta de spam.';
  }

  // 7. Invalid email format
  if (
    lower.includes('invalid email') ||
    lower.includes('unable to validate email') ||
    lower.includes('email address is invalid') ||
    lower.includes('invalid format')
  ) {
    return 'El correo electrónico ingresado no tiene un formato válido.';
  }

  // 8. Database or Server error
  if (
    lower.includes('database error') ||
    lower.includes('saving new user') ||
    lower.includes('unexpected_failure') ||
    lower.includes('internal_server_error')
  ) {
    return 'No pudimos registrar tu usuario en el servidor en este momento. Por favor intenta nuevamente en unos segundos.';
  }

  // 9. Signups disabled
  if (lower.includes('signup is not allowed') || lower.includes('signups not allowed') || lower.includes('signup_disabled')) {
    return 'El registro de nuevas cuentas no está disponible en este momento. Por favor intenta más tarde.';
  }

  // 10. Google OAuth provider
  if (lower.includes('unsupported provider') || lower.includes('provider is not enabled')) {
    return 'El inicio de sesión con Google aún no se encuentra disponible.';
  }

  // 11. User not found
  if (lower.includes('user not found') || lower.includes('no user found')) {
    return 'No encontramos una cuenta con este correo. Por favor regístrate.';
  }

  // 12. Network, ServiceWorker, & Connection Errors
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

  // Neutral Fallback: NEVER falsely claim user is already registered
  if (!text || text === '{}' || text === '[]' || text === '[object Object]') {
    return 'No se pudo procesar la solicitud en el servidor. Por favor espera un momento e intenta nuevamente.';
  }

  if (/[a-zA-Z]/.test(text) && (
    lower.includes('error') || lower.includes('failed') || lower.includes('exception') ||
    lower.includes('undefined') || lower.includes('null') || lower.includes('status') ||
    lower.includes('request') || lower.includes('response') || lower.includes('supabase') ||
    lower.includes('forbidden') || lower.includes('unauthorized') || lower.includes('bad')
  )) {
    return 'No se pudo completar el registro en este momento. Por favor espera unos momentos e intenta de nuevo.';
  }

  return text;
}
