-- ==============================================================================
-- PIGGY APP — ENVÍO AUTOMÁTICO DE CORREO DE BIENVENIDA (RESEND API + PG_NET)
-- 100% Gratis en Supabase Hobby. No requiere confirmación de correo para entrar.
-- ==============================================================================

-- 1. Habilitar la extensión pg_net (Incluida gratis en Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Crear tabla de configuración para guardar la API Key de forma segura
CREATE TABLE IF NOT EXISTS public.app_email_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Habilitar RLS para que solo administradores o service_role lean la clave
ALTER TABLE public.app_email_config ENABLE ROW LEVEL SECURITY;

-- ⚠️ REEMPLAZA 'TU_API_KEY_DE_RESEND' CON TU CLAVE REAL DE RESEND (ej: re_123456789...)
INSERT INTO public.app_email_config (key, value)
VALUES 
  ('resend_api_key', 'TU_API_KEY_DE_RESEND'),
  ('sender_email', 'Piggy App <onboarding@resend.dev>') -- O tu correo verificado ej: hola@tudominio.com
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

-- 3. Función PL/pgSQL para disparar el correo de bienvenida HTML
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  v_resend_api_key TEXT;
  v_sender_email TEXT;
  v_user_name TEXT;
  v_user_email TEXT;
  v_referral_code TEXT;
  v_html_body TEXT;
  v_payload JSONB;
BEGIN
  -- Obtener credenciales
  SELECT value INTO v_resend_api_key FROM public.app_email_config WHERE key = 'resend_api_key';
  SELECT value INTO v_sender_email FROM public.app_email_config WHERE key = 'sender_email';

  -- Si no está configurada la API key, salir limpiamente sin fallar
  IF v_resend_api_key IS NULL OR v_resend_api_key = '' OR v_resend_api_key = 'TU_API_KEY_DE_RESEND' THEN
    RETURN NEW;
  END IF;

  -- Extraer datos del nuevo usuario
  v_user_name := COALESCE(NEW.full_name, 'Agroinversionista');
  v_user_email := NEW.email;
  v_referral_code := COALESCE(NEW.referral_code, 'PIGGY' || substring(replace(NEW.id::text, '-', '') from 1 for 6));

  -- Si no hay correo válido, salir
  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN NEW;
  END IF;

  -- Construir la plantilla HTML Premium de Piggy App
  v_html_body := '<!DOCTYPE html>'
    || '<html lang="es">'
    || '<head>'
    || '<meta charset="UTF-8">'
    || '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    || '<title>¡Bienvenido a Piggy App!</title>'
    || '<style>'
    || 'body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }'
    || '.container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }'
    || '.header { background: linear-gradient(135deg, #ff6b8b 0%, #ff8e53 100%); padding: 35px 20px; text-align: center; color: #ffffff; }'
    || '.logo-badge { background: #ffffff; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); line-height: 64px; }'
    || '.content { padding: 30px 25px; color: #334155; }'
    || '.greeting { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }'
    || '.card-bonus { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 14px; padding: 18px; margin: 20px 0; text-align: center; }'
    || '.card-referral { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 1px solid #e9d5ff; border-radius: 14px; padding: 18px; margin: 20px 0; text-align: center; }'
    || '.code-box { background: #ffffff; border: 2px dashed #9333ea; border-radius: 8px; display: inline-block; padding: 8px 18px; font-size: 20px; font-weight: 800; color: #7e22ce; letter-spacing: 2px; margin-top: 8px; }'
    || '.step-box { background: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 10px; border-left: 4px solid #ff6b8b; }'
    || '.btn-primary { display: block; background: linear-gradient(135deg, #ff6b8b 0%, #ff8e53 100%); color: #ffffff !important; text-decoration: none; font-size: 17px; font-weight: 700; text-align: center; padding: 15px 25px; border-radius: 12px; margin: 30px 0 15px; box-shadow: 0 4px 15px rgba(255,107,139,0.35); }'
    || '.footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }'
    || '</style>'
    || '</head>'
    || '<body>'
    || '<div class="container">'
    || '<div class="header">'
    || '<div class="logo-badge">🐷</div>'
    || '<h1 style="margin:0; font-size:26px; font-weight:800; letter-spacing:-0.5px;">PIGGY APP</h1>'
    || '<p style="margin:6px 0 0; font-size:15px; opacity:0.95;">Tu Granja Digital Agroproductiva</p>'
    || '</div>'
    || '<div class="content">'
    || '<div class="greeting">¡Hola, ' || v_user_name || '! 👋</div>'
    || '<p style="font-size:15px; line-height:1.6; color:#475569; margin:0 0 18px;">'
    || 'Te damos la más cordial bienvenida a <strong>Piggy App</strong>. Tu cuenta ha sido creada exitosamente y ya puedes acceder a tu granja para comenzar a rentabilizar activos reales del campo colombiano.'
    || '</p>'
    || '<div class="card-bonus">'
    || '<span style="background:#059669; color:#ffffff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:20px; text-transform:uppercase;">🎁 Bono Activo</span>'
    || '<div style="font-size:24px; font-weight:800; color:#065f46; margin:8px 0 4px;">$20.000 COP</div>'
    || '<p style="margin:0; font-size:13px; color:#047857;">Tienes un bono de bienvenida asignado en tu cuenta para tu primera compra de cerditos.</p>'
    || '</div>'
    || '<div class="card-referral">'
    || '<span style="background:#7e22ce; color:#ffffff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:20px; text-transform:uppercase;">👥 Tu Código de Invitación</span>'
    || '<p style="margin:6px 0 2px; font-size:13px; color:#6b21a8;">Comparte tu código con amigos y gana comisiones por cada compra:</p>'
    || '<div class="code-box">' || v_referral_code || '</div>'
    || '</div>'
    || '<h3 style="font-size:16px; color:#0f172a; margin:22px 0 12px;">¿Cómo empezar en Piggy App?</h3>'
    || '<div class="step-box"><strong>1. Explora el Mercado 🛒</strong><br><span style="font-size:13px; color:#64748b;">Selecciona el lote o cerdito que prefieras según la rentabilidad y días de ciclo.</span></div>'
    || '<div class="step-box"><strong>2. Adopta y Monitorea 📊</strong><br><span style="font-size:13px; color:#64748b;">Sigue en vivo el engorde, peso diario y progreso de tus cerditos en tu granja.</span></div>'
    || '<div class="step-box"><strong>3. Recibe tus Ganancias 💰</strong><br><span style="font-size:13px; color:#64748b;">Al culminar el ciclo de engorde, retira tu capital más la rentabilidad a tu cuenta bancaria.</span></div>'
    || '<a href="https://piggy-app-v2.vercel.app/#/granja" class="btn-primary">🌱 Entrar a Mi Granja Ahora</a>'
    || '<p style="font-size:12px; color:#94a3b8; text-align:center; margin:15px 0 0;">No necesitas confirmar este correo. Tu acceso ya está 100% activo.</p>'
    || '</div>'
    || '<div class="footer">'
    || '<p style="margin:0 0 6px;"><strong>Piggy App Colombia</strong> · Transformando el agro con tecnología</p>'
    || '<p style="margin:0;">Si tienes preguntas o requieres asistencia, escríbenos a través de nuestro botón oficial de WhatsApp en la app.</p>'
    || '</div>'
    || '</div>'
    || '</body>'
    || '</html>';

  -- Armar payload JSON para la API de Resend
  v_payload := jsonb_build_object(
    'from', v_sender_email,
    'to', jsonb_build_array(v_user_email),
    'subject', '🐷 ¡Bienvenido a Piggy App! Tu bono de $20.000 está activo 🎁',
    'html', v_html_body
  );

  -- Disparar petición HTTP POST asíncrona a Resend mediante pg_net
  PERFORM extensions.http_post(
    'https://api.resend.com/emails',
    v_payload::text,
    'application/json',
    ARRAY[
      extensions.http_header('Authorization', 'Bearer ' || v_resend_api_key),
      extensions.http_header('Content-Type', 'application/json')
    ]
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En caso de error de red, no bloquear el registro del usuario
  RAISE WARNING 'No se pudo enviar el correo de bienvenida: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el Trigger en `profiles` para que se ejecute en cada nuevo registro
DROP TRIGGER IF EXISTS trg_send_welcome_email ON public.profiles;

CREATE TRIGGER trg_send_welcome_email
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_email();
