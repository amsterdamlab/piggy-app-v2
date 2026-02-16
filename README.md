# Piggy App — Guía de Despliegue en Vercel

Esta aplicación está diseñada para desplegarse en Vercel y conectarse directamente a Supabase sin necesidad de ejecución local.

## 🚀 Despliegue en 3 Pasos

1. **GitHub**: El código ya está en `amsterdamlab/piggy-app-v2`.
2. **Vercel**: Importa este repositorio desde tu dashboard.
3. **Variables**: Configura la conexión en Vercel.

## 🔗 Configuración de Variables (Environment Variables)

Para que la app funcione online, ve a **Settings > Environment Variables** en tu proyecto de Vercel y añade:

| Variable | Valor A Copiar |
|---|---|
| `VITE_SUPABASE_URL` | `https://elhsvitbqzivgajccify.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_GsffdyFVoy0M5t_4WfzZvA_KdpDr1HD` |

*(Nota: Si tienes una clave distinta en tu dashboard de Supabase, úsala. Esta es la que estaba configurada localmente).*

## 📂 Arquitectura Cloud
- **Frontend**: Vite (Optimizado para Vercel)
- **Backend**: Supabase
- **Localhost**: Desactivado (Para evitar errores de `npx/node`)

---
*Desarrollado con ❤️ por Antigravity*
