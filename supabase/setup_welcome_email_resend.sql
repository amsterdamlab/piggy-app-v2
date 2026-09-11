-- ==============================================================================
-- PIGGY APP — ENVÍO AUTOMÁTICO DE CORREO DE BIENVENIDA (RESEND API + PG_NET)
-- 100% Gratis en Supabase Hobby. No requiere confirmación de correo para entrar.
-- ==============================================================================

-- 1. Habilitar la extensión pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Configuración de API Key y Remitente
CREATE TABLE IF NOT EXISTS public.app_email_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.app_email_config ENABLE ROW LEVEL SECURITY;

-- ⚠️ REEMPLAZA 'TU_API_KEY_DE_RESEND' CON TU CLAVE REAL DE RESEND
INSERT INTO public.app_email_config (key, value)
VALUES 
  ('resend_api_key', 'TU_API_KEY_DE_RESEND'),
  ('sender_email', 'Piggy App <onboarding@resend.dev>')
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

  IF v_resend_api_key IS NULL OR v_resend_api_key = '' OR v_resend_api_key = 'TU_API_KEY_DE_RESEND' THEN
    RETURN NEW;
  END IF;

  -- Extraer datos del nuevo usuario
  v_user_name := COALESCE(NEW.full_name, 'Agroinversionista');
  v_user_email := NEW.email;

  -- Obtener el código de referidos real directamente de la base de datos
  SELECT referral_code INTO v_referral_code FROM public.profiles WHERE id = NEW.id;
  IF v_referral_code IS NULL OR v_referral_code = '' THEN
    v_referral_code := COALESCE(NEW.referral_code, 'PIGGY' || substring(replace(NEW.id::text, '-', '') from 1 for 6));
  END IF;

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RETURN NEW;
  END IF;

  -- Plantilla HTML Perfeccionada con CDN de GitHub y Textos Solicitados
  v_html_body := '<!DOCTYPE html>'
    || '<html lang="es">'
    || '<head>'
    || '<meta charset="UTF-8">'
    || '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    || '<title>¡Bienvenido a Piggy App!</title>'
    || '<style>'
    || 'body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }'
    || '.container { max-width: 580px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }'
    || '.header { background-color: #ffffff; padding: 35px 20px 20px; text-align: center; border-bottom: 1px solid #f1f5f9; }'
    || '.slogan { font-size: 12px; font-weight: 800; color: #880e4f; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0 0; }'
    || '.content { padding: 30px 25px; color: #334155; }'
    || '.greeting { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }'
    || '.intro-p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 18px; }'
    || '.card-bonus { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 14px; padding: 18px; margin: 20px 0; text-align: center; }'
    || '.card-referral { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 1px solid #e9d5ff; border-radius: 14px; padding: 18px; margin: 20px 0; text-align: center; }'
    || '.code-box { background: #ffffff; border: 2px dashed #e91e63; border-radius: 8px; display: inline-block; padding: 8px 18px; font-size: 20px; font-weight: 800; color: #e91e63; letter-spacing: 2px; margin-top: 8px; }'
    || '.step-box { background: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 10px; border-left: 4px solid #e91e63; }'
    || '.btn-primary { display: block; background-color: #e91e63 !important; color: #ffffff !important; text-decoration: none; font-size: 17px; font-weight: 700; text-align: center; padding: 15px 25px; border-radius: 12px; margin: 30px 0 15px; box-shadow: 0 4px 15px rgba(233,30,99,0.35); }'
    || '.footer { background-color: #f8fafc; padding: 22px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; }'
    || '</style>'
    || '</head>'
    || '<body>'
    || '<div class="container">'
    || '<div class="header">'
    || '<img src="https://raw.githubusercontent.com/amsterdamlab/piggy-app-v2/main/public/piggyapp_logo1.png" alt="Piggy" width="190" style="display:block; margin:0 auto; max-width:190px; width:190px; height:auto; border:0; outline:none; text-decoration:none;" />'
    || '<div class="slogan">CRIA INTELIGENTE CON RESULTADOS REALES</div>'
    || '</div>'
    || '<div class="content">'
    || '<div class="greeting">¡Hola, ' || v_user_name || '! 👋</div>'
    || '<p class="intro-p">'
    || 'Te damos la más cordial bienvenida a <strong>Piggy App</strong>. Tu cuenta ha sido creada exitosamente y ya puedes acceder a tu granja de engorde para comenzar a comprar los cerditos que quieras desde <strong>AHORA</strong>.'
    || '</p>'
    || '<div class="card-bonus">'
    || '<span style="background:#059669; color:#ffffff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:20px; text-transform:uppercase;">🎁 Bono Activo</span>'
    || '<div style="font-size:24px; font-weight:800; color:#065f46; margin:8px 0 4px;">$20.000 COP</div>'
    || '<p style="margin:0; font-size:13px; color:#047857; line-height:1.4;">'
    || 'Tienes un bono de bienvenida asignado en tu cuenta para que conozcas nuestros productos cárnicos de Granja Valle Morales.<br>'
    || '<small style="font-size:11px; color:#065f46; display:inline-block; margin-top:4px;">*Aplica solamente para la ciudad de Cali y sus alrededores.</small>'
    || '</p>'
    || '</div>'
    || '<div class="card-referral">'
    || '<span style="background:#880e4f; color:#ffffff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:20px; text-transform:uppercase;">👥 Tu Código de Invitación</span>'
    || '<p style="margin:6px 0 2px; font-size:13px; color:#4a148c;">Comparte tu código con amigos y gana bonos de consumo por cada compra:</p>'
    || '<div class="code-box">' || v_referral_code || '</div>'
    || '</div>'
    || '<h3 style="font-size:16px; color:#0f172a; margin:24px 0 14px;">¿Cómo empezar en Piggy App?</h3>'
    || '<div class="step-box"><strong>1. Explora el Mercado 🛒</strong><br><span style="font-size:13px; color:#64748b;">Selecciona el cerdito que prefieras. Revisa el peso, la edad y haz crecer tu granja.</span></div>'
    || '<div class="step-box"><strong>2. Compra y Monitorea 📊</strong><br><span style="font-size:13px; color:#64748b;">Sigue en vivo el engorde, peso diario y progreso de tus cerditos en tu granja.</span></div>'
    || '<div class="step-box"><strong>3. Recibe tus Beneficios 🐷</strong><br><span style="font-size:13px; color:#64748b;">Al culminar el ciclo de engorde, verás tu liquidación comercial en tu Cuenta Agro.</span></div>'
    || '<a href="https://piggy-app-v2.vercel.app/#/granja" class="btn-primary">Entrar a Mi Granja</a>'
    || '<p style="font-size:12px; color:#94a3b8; text-align:center; margin:15px 0 0;">No necesitas confirmar este correo. Tu acceso ya está 100% activo.</p>'
    || '</div>'
    || '<div class="footer">'
    || '<p style="margin:0 0 8px;"><strong>Piggy App Colombia</strong> · Transformando el agro con tecnología</p>'
    || '<p style="margin:0;">Si tienes preguntas o requieres asistencia, escríbenos a través de nuestro botón con la diadema en la app para que hables con un asesor.</p>'
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
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'No se pudo enviar el correo de bienvenida: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Activar Trigger en `profiles`
DROP TRIGGER IF EXISTS trg_send_welcome_email ON public.profiles;

CREATE TRIGGER trg_send_welcome_email
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_email();
