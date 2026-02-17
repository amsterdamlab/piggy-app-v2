# Piggy App — Guía de Despliegue en Vercel

Esta aplicación está diseñada para desplegarse fácilmente en Vercel y conectarse directamente a tu base de datos Supabase, sin necesidad de ejecutar nada en tu computador local.

## 🚀 Pasos para Desplegar

1. **Sube este código a GitHub** (Ya realizado).
2. **Importa el proyecto en Vercel**:
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard).
   - Haz clic en "Add New" > "Project".
   - Selecciona el repositorio `piggy-app-v2`.
   - Haz clic en "Import".

## 🔗 Configurar la Conexión con Supabase

Para que la app funcione en la nube, debes configurar las **Variables de Entorno** en Vercel. Estas son las "llaves" de acceso a tu base de datos.

1. En la configuración del proyecto en Vercel, ve a **Settings** > **Environment Variables**.
2. Añade las siguientes variables (copia los valores de tu archivo `.env` local o de tu panel de Supabase):

   - **Nombre:** `VITE_SUPABASE_URL`
     - **Valor:** `https://elhsvitbqzivgajccify.supabase.co`

   - **Nombre:** `VITE_SUPABASE_ANON_KEY`
     - **Valor:** `sb_publishable_GsffdyFVoy0M5t_4WfzZvA_KdpDr1HD` (o la clave completa si esta es parcial)

3. Haz clic en **Save**.
4. Si ya habías desplegado, ve a **Deployments** y haz clic en **Redeploy** para que los cambios surtan efecto.

## 🗄️ Configuración de Base de Datos

Para que la app deje de usar "Datos de Prueba" y use tu base de datos real, debes ejecutar los scripts SQL que hemos preparado:

1. Ve al **SQL Editor** en tu [Dashboard de Supabase](https://supabase.com/dashboard).
2. Abre el archivo `supabase/migrations/20260216000000_initial_schema.sql` de este repositorio en GitHub, copia el contenido y ejecútalo en Supabase.
3. (Opcional) Para tener datos iniciales, ejecuta también el contenido de `supabase/seed.sql`.

## 🛠️ Comandos (Solo informativo)

- `Build Command`: `npm run build` (Vercel lo detecta automáticamente).
- `Output Directory`: `dist` (Vercel lo detecta automáticamente).
- `Install Command`: `npm install` (Vercel lo detecta automáticamente).

## 📂 Estructura del Proyecto

- `src/services/supabase.js`: Maneja la conexión. Si las variables de entorno están presentes, se conecta a Supabase. Si no, usa datos de prueba (Mock Data).
- `src/state.js`: Gestiona el estado de la aplicación.
- `src/views/`: Contiene las pantallas (Login, Granja, Mercado).

---
*Desarrollado con ❤️ por Antigravity*