Este es el documento técnico estructural para el desarrollo de Piggy App en Antigravity. Como especialista en automatizaciones, verás que la integración con Supabase facilitará enormemente la gestión de estados y la lógica de rentabilidad variable.
________________________________________
Documento de Especificaciones Técnicas: Piggy App
Piggy App es una plataforma de "Agro-Fintech" que permite a los usuarios participar en el ciclo de engorde porcino de manera digital, obteniendo beneficios económicos o productos físicos al finalizar el proceso.
1. Arquitectura del Stack
•	Frontend & Logic: Antigravity (No-code/Low-code builder).
•	Backend & Auth: Supabase (PostgreSQL + GoTrue for Auth).
•	Pagos: Integración vía Webhook/API (Recomendado: Wompi o ePayco por el mercado colombiano).
________________________________________
2. Modelado de Base de Datos (Supabase)
Para manejar la rentabilidad variable y el inventario, propongo las siguientes tablas principales:
Tabla	Campos Clave	Descripción
profiles	id, full_name, habeas_data_accepted, terms_accepted	Extensión de la tabla auth.users.
piggies	id, user_id, status (engorde/finalizado), purchase_date, base_roi	Registro de cada cerdo comprado.
marketplace_items	id, type, extra_roi, price, stock	Piggies especiales con bonos de +1% o +2%.
missions	id, user_id, description, points, completed	Registro de gamificación para acelerar crecimiento.
________________________________________
3. Flujo de Usuario y Lógica de Pantallas
Fase 1: Onboarding y Legal
1.	Registro: Formulario estándar (Email/Password).
2.	Bloqueo Legal (Popup): * Al detectar que terms_accepted es false en la base de datos, Antigravity debe desplegar un modal persistente.
o	Componentes: Checkbox de Términos y Condiciones + Checkbox de Autorización de Tratamiento de Datos (Habeas Data).
o	Validación: El botón "Continuar" solo se habilita si ambos checks están activos. Al dar clic, se hace un UPDATE en Supabase a la tabla profiles.
Fase 2: El Menú Principal
•	Granja (Dashboard): * Visualización de los cerdos activos.
o	Barra de progreso del "Ciclo de Engorde" (4 meses y 3 semanas).
o	Cálculo en tiempo real de la rentabilidad proyectada basada en la cantidad de Piggies:
	$1 Piggy \rightarrow 8\%$
	$2 Piggies \rightarrow 9\%$
	$3+ Piggies \rightarrow 10\%$
•	Mercado (Marketplace): * Compra de nuevos Piggies.
o	Sección de "Aceleradores": Piggies exclusivos que suman un (+1%) o (+2%) adicional al margen final de ese activo específico.
•	Aliados: * Directorio de empresas asociadas, puntos de entrega de carne premium y beneficios adicionales por ser parte de la comunidad.
________________________________________
4. Lógica de Rentabilidad y Liquidación
Para asegurar que el sistema escale correctamente, la lógica de liquidación debe seguir este flujo en el backend (o vía funciones de Antigravity):
Fórmula de Liquidación:
$Total = Inversión + (Inversión \times (ROI\_Base + ROI\_Extra))$
•	ROI_Base: Determinado por el conteo total de piggies activos en la cuenta del usuario.
•	ROI_Extra: Atributo específico si el Piggy fue adquirido en el Marketplace con bono.
Opciones de Cierre de Ciclo:
Al finalizar las 19 semanas (4 meses, 3 semanas), el sistema habilita dos botones:
1.	Monetizar: Dispara un proceso de transferencia bancaria (Capital + Rentabilidad).
2.	Consumo: Genera un código QR de canje para reclamar los cortes de carne en la red de Aliados.
________________________________________
5. Gamificación (Engagement)
Para "acelerar" el crecimiento visual en la app, se implementará un sistema de misiones:
•	Misión Diaria: Entrar a la app a "alimentar" al Piggy.
•	Misión Social: Compartir el progreso en Instagram/WhatsApp.
•	Referidos: Por cada referido que compre un Piggy, el usuario recibe un pequeño bono de aceleración o puntos para el Marketplace.
________________________________________

Este es el anexo técnico detallado para el desarrollo de Piggy App. He integrado el campo de WhatsApp como eje central para las automatizaciones de notificaciones y he estructurado los requerimientos siguiendo estándares de documentación de software profesional.
________________________________________
Documentación Técnica de Desarrollo: Piggy App
1. Requerimientos Funcionales (RF)
Los requerimientos funcionales definen los servicios que el sistema debe proporcionar.
ID	Requerimiento	Descripción
RF-01	Registro con WhatsApp	El sistema debe capturar Nombre, Email, Password y WhatsApp (Formato internacional +57).
RF-02	Validación Legal Obligatoria	Bloqueo de acceso mediante Popup hasta que el usuario acepte Términos y Habeas Data.
RF-03	Gestión de Compra	Integración de pasarela de pagos para el recaudo de $1.000.000 COP por unidad.
RF-04	Cálculo de Rentabilidad Dinámica	El sistema debe ajustar el % de retorno (8%, 9%, 10%) automáticamente según el conteo de Piggies activos.
RF-05	Dashboard de Monitoreo (Granja)	Visualización de progreso (días transcurridos vs. meta) y estado de salud/peso simulado.
RF-06	Marketplace de Aceleradores	Interfaz para comprar activos con bonos de rentabilidad extra (+1% / +2%).
RF-07	Módulo de Liquidación	Al cumplirse las 19 semanas, permitir al usuario elegir entre transferencia bancaria o redención en producto físico.
RF-08	Sistema de Misiones	Lógica de "check-in" diario o referidos para actualizar el estado del Piggy en la base de datos.
________________________________________
2. Requerimientos No Funcionales (RNF)
Definen las propiedades y restricciones del sistema.
•	Seguridad y Privacidad: * Cifrado de datos en reposo y tránsito mediante SSL.
o	Autenticación de dos factores (opcional) gestionada por Supabase Auth.
o	Cumplimiento estricto de la Ley 1581 de 2012 (Habeas Data Colombia).
•	Disponibilidad: El sistema debe garantizar un uptime del 99.9% al estar alojado en infraestructuras cloud (Supabase/Vercel).
•	Escalabilidad: La arquitectura debe soportar el incremento de usuarios concurrentes sin degradar el rendimiento de las consultas a la base de datos.
•	Usabilidad: Diseño Mobile-First optimizado para visualización en dispositivos móviles (PWA).
•	Integridad de Datos: Uso de triggers en base de datos para asegurar que la rentabilidad no pueda ser alterada manualmente por el frontend.
________________________________________
3. Arquitectura Técnica Detallada
La solución se basa en una arquitectura de Desacoplamiento Total, donde el frontend es puramente visual y la lógica crítica reside en el servidor.
A. Capa de Presentación (Frontend - Antigravity)
•	Framework: Basado en React/Vue (según el motor interno de Antigravity).
•	Estado Global: Gestión de la sesión del usuario y persistencia de los checks legales.
•	Componentes Clave:
o	AuthGuard: Verifica si el usuario aceptó términos antes de mostrar el menú.
o	RentabilityEngine: Componente visual que recalcula el retorno basado en count(piggies).
B. Capa de Datos y Lógica (Backend - Supabase)
•	Autenticación: Supabase Auth gestionará los tokens JWT. El campo de WhatsApp se almacenará en la tabla public.profiles.
•	Base de Datos: PostgreSQL.
o	Row Level Security (RLS): Los usuarios solo pueden ver sus propios Piggies.
o	RPC Functions: Funciones del lado del servidor para procesar la liquidación final, evitando manipulaciones externas.
•	Storage: Para almacenar los contratos digitales firmados o imágenes del Marketplace.
C. Capa de Integración (Automatización y Notificaciones)
Como especialista en automatizaciones, aquí es donde la app cobra vida:
1.	WhatsApp Gateway: Integración con API (Meta Business, Twilio o similares).
2.	Webhooks de Pago: Al confirmar el pago de $1M COP, la pasarela envía un webhook a una Edge Function de Supabase para crear el registro en la tabla piggies e iniciar el cronómetro de 19 semanas.
3.	Cron Jobs (Automatización de Notificaciones):
o	Día 1: Mensaje de bienvenida y "Nacimiento" del Piggy.
o	Semana 10: Update de peso y recordatorio de misiones.
o	Semana 19: Notificación push/WhatsApp para elección de liquidación.
________________________________________
4. Flujo de Datos de Registro (Detalle Técnico)
1.	Input: Usuario ingresa datos + WhatsApp.
2.	Auth Trigger: Supabase crea el usuario en auth.users.
3.	Profile Trigger: Una función interna inserta automáticamente en public.profiles el registro con habeas_data = false.
4.	UI Logic: Antigravity detecta el estado false y despliega el Popup.
5.	Legal Confirmation: El usuario acepta $\rightarrow$ Se actualiza el perfil $\rightarrow$ El AuthGuard libera el acceso a "Granja, Mercado, Aliados".
________________________________________

Aquí tienes la estructura SQL lista para ser ejecutada en el SQL Editor de Supabase. He diseñado estas tablas pensando en tu perfil de automatización: incluyen los campos necesarios para disparar webhooks y manejar la lógica de rentabilidad variable de forma eficiente.
________________________________________
Arquitectura de Base de Datos: Piggy App
Ejecuta este script para crear las tablas, las relaciones y las políticas de seguridad (RLS).
SQL
-- 1. TABLA DE PERFILES (Extensión de Auth.Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  whatsapp TEXT UNIQUE,
  terms_accepted BOOLEAN DEFAULT FALSE,
  habeas_data_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA DE PIGGIES (Activos de los usuarios)
CREATE TABLE public.piggies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'engorde' CHECK (status IN ('engorde', 'completado', 'liquidado')),
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '4 months 3 weeks'),
  investment_amount NUMERIC DEFAULT 1000000, -- $1.000.000 COP
  extra_roi_bonus NUMERIC DEFAULT 0, -- Para los aceleradores (+1%, +2%)
  current_weight NUMERIC DEFAULT 15.0, -- Peso inicial estimado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE MARKETPLACE (Aceleradores y cerdos especiales)
CREATE TABLE public.marketplace (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  extra_roi NUMERIC DEFAULT 0, -- Ejemplo: 0.01 para +1%
  stock INTEGER DEFAULT 10,
  image_url TEXT
);

-- 4. TABLA DE ALIADOS
CREATE TABLE public.allies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT, -- Restaurante, Carnicería, Distribuidor
  location TEXT, -- Ciudad (Cali, etc.)
  logo_url TEXT,
  discount_info TEXT
);

-- 5. TABLA DE MISIONES (Gamificación)
CREATE TABLE public.missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_name TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE
);
________________________________________
Seguridad y Privacidad (RLS)
Es vital activar la seguridad para que un usuario no pueda ver los cerdos de otro.
SQL
-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piggies ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios solo ven sus propios datos
CREATE POLICY "Usuarios pueden ver su propio perfil" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden ver sus propios cerdos" 
ON public.piggies FOR SELECT USING (auth.uid() = user_id);
________________________________________
Puntos Clave de esta Estructura
•	Lógica de Rentabilidad: No guardamos el "8%, 9% o 10%" de forma estática. En Antigravity, deberás hacer una consulta COUNT a la tabla piggies donde user_id sea el del usuario actual.
o	Si count == 1 $\rightarrow$ 8%
o	Si count == 2 $\rightarrow$ 9%
o	Si count >= 3 $\rightarrow$ 10%
•	Aceleradores: El campo extra_roi_bonus en la tabla piggies se suma al porcentaje base anterior. Si el usuario compró un acelerador de +1% en el mercado, su rentabilidad final será Base + 0.01.
•	WhatsApp: He configurado el campo como UNIQUE para evitar duplicados y facilitar tus automatizaciones de notificaciones.
