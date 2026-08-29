# 🐷 PIGGY APP v2 — SYSTEM BLUEPRINT & MANUAL MAESTRO DE ARQUITECTURA

> **Propósito del Documento:** Este archivo es la **fuente de verdad técnica permanente** de Piggy App. Cualquier agente de IA, desarrollador o arquitecto de sistemas **DEBE LEER ESTE ARCHIVO** antes de realizar refactorizaciones o introducir cambios, garantizando la integridad de la base de datos, el respeto a las reglas de negocio (*Chesterton's Fence*) y la disponibilidad del servicio.

---

## 🏛️ 1. Visión General y Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES Modules) + SPA Router | Rendimiento ultra-ligero, compatibilidad móvil total (PWA) |
| **Estilos** | CSS3 Modular con Tokens Semánticos (`styles/`) | Diseño visual atómico, responsivo y modo app nativa |
| **Backend & DB** | Supabase (PostgreSQL 15 + PostgREST + Auth + RLS) | Persistencia reactiva, seguridad por políticas y disparadores SQL |
| **Pagos** | Wompi API (Sandbox / Producción) + Bre-B (Llaves Inmediatas) | Pasarela de pagos bancarios y transferencias directas |
| **Contratos** | `pdf-lib` + canvas para firma digital | Emisión de contratos legales vinculantes descargables |
| **Despliegue** | GitHub (`amsterdamlab/piggy-app-v2`) → Vercel CI/CD | Despliegue continuo instantáneo en producción |

---

## 🗄️ 2. Modelo de Datos y Fuentes de Verdad (Single Source of Truth)

### A. Tabla `public.profiles` (Extensión de `auth.users`)
* **`id`** `UUID` (PK, FK `auth.users.id`): Identificador único del usuario.
* **`full_name`** `TEXT`: Nombre completo del usuario.
* **`email`** `TEXT`: Correo electrónico vinculado a la cuenta.
* **`whatsapp`** `TEXT`: Teléfono celular verificado para contacto y alertas.
* **`cedula`** `TEXT`: Documento de identidad (usado en contratos oficiales).
* **`bank_name`**, **`bank_account_type`**, **`bank_breve_key`** `TEXT`: Información para transferencias de retiros.
* **`referral_code`** `VARCHAR(10)`: Código único de invitación del usuario (ej: `HOM952`). Generado automáticamente por trigger.
* **`referred_by`** `UUID` (FK `profiles.id`): ID del usuario que lo invitó (su patrocinador).
* **`wallet_balance`** `NUMERIC`: Saldo en dinero real ($COP). **Gestionado exclusivamente por triggers de transacciones.**
* **`consumption_balance`** `NUMERIC`: Saldo de bonos/marketing para compras internas ($COP).
* **`welcome_bonus_status`** `TEXT` (`active`, `consumed`, `expired`): Estado del bono de bienvenida de $20.000.
* **`terms_accepted`**, **`habeas_data_accepted`** `BOOLEAN`: Consentimiento legal de términos y tratamiento de datos.

### B. Tabla `public.referrals`
* **`id`** `UUID` (PK): ID del registro de referido.
* **`referrer_id`** `UUID` (FK `profiles.id`): Quien compartió su código.
* **`referred_id`** `UUID` (FK `profiles.id`): Usuario nuevo registrado.
* **`status`** `TEXT` (`pending`, `completed`, `expired`): Estado de la comisión. Pasa a `completed` en la **primera compra** de un Piggy del referido.
* **`commission_amount`** `NUMERIC`: Valor acreditado al patrocinador según rango.
* **`commission_tier`** `TEXT` (`tier_1`, `tier_2`, `tier_3`).
* **`completed_at`** `TIMESTAMP`: Momento de liquidación de la comisión.

### C. Tabla `public.wallet_transactions` (Trazabilidad y Auditoría)
* **`id`** `UUID` (PK): ID de la transacción.
* **`user_id`** `UUID` (FK `profiles.id`): Propietario de la cuenta.
* **`amount`** `NUMERIC`: Monto monetario ($COP).
* **`type`** `TEXT` (`credit`, `debit`): Tipo de movimiento.
* **`description`** `TEXT`: Detalle auditable (ej. "Comisión de Referido: Primera compra de Homero Simpson").
* **`wallet_type`** `TEXT` (`dinero`, `consumo`): Diferenciador de saldo real vs. saldo de consumo.

### D. Tabla `public.piggies` (Activos en Granja)
* **`id`** `UUID` (PK): Identificador del cerdo.
* **`user_id`** `UUID` (FK `profiles.id`): Propietario.
* **`status`** `TEXT` (`engorde`, `completado`, `liquidado`): Etapa del ciclo de 4 meses y 3 semanas.
* **`purchase_date`**, **`end_date`** `TIMESTAMP`: Fechas de ciclo de ceba.
* **`investment_amount`** `NUMERIC`: Monto invertido ($COP).
* **`extra_roi_bonus`** `NUMERIC`: Porcentaje adicional de rentabilidad (+1%, +2%, etc.).
* **`current_weight`** `NUMERIC`: Peso dinámico calculado (15 kg inicial a ~115 kg final).
* **`image_url`** `TEXT`: Imagen del cerdo asignado.

---

## ⚡ 3. Disparadores y Triggers Críticos de Base de Datos

> ⚠️ **REGLA DE ORO:** Nunca eliminar ni modificar estos triggers sin antes entender su dependencia cruzada.

1. **`trg_generate_referral_code` (en `public.profiles`):**
   * *Momento:* `BEFORE INSERT OR UPDATE` cuando `referral_code IS NULL`.
   * *Lógica:* Extrae las 3 primeras letras del nombre (en mayúsculas, sin tildes) y concatena 3 dígitos aleatorios (ej. `AND123`, `DIO895`, `HOM952`). Previene colisiones mediante ciclo de verificación.
2. **`on_auth_user_created` (en `auth.users`):**
   * *Momento:* `AFTER INSERT ON auth.users`.
   * *Lógica:* Garantiza que cada vez que alguien se registra por email o Google OAuth, se inserte inmediatamente su fila correspondiente en `public.profiles` con su bono de bienvenida activo.
3. **`trg_prevent_manual_balance_update` y Veeduría Estricta de Billetera:**
   * *Lógica:* Impide que llamadas manuales directas al API puedan alterar `wallet_balance` sin una transacción justificada en `wallet_transactions`.

---

## 💼 4. Reglas de Negocio Intocables

1. **Arquitectura de Billetera Dual:**
   * **Saldo Dinero (`wallet_balance`):** Fondos reales provenientes de retornos de inversión o recargas bancarias. Es **100% retirable** a cuentas bancarias / llaves Bre-B.
   * **Saldo Consumo (`consumption_balance`):** Bonos promocionales (Bienvenida $20.000, comisiones de marketing, misiones). **No es retirable directamente a banco**; se utiliza como descuento o saldo canjeable para comprar Piggies o productos de aliados.
2. **Sistema de Comisiones de Referidos:**
   * Se liquida **una única vez por cada nuevo usuario referido**, en el instante exacto en que completa su **primera compra** de un Piggy (`process_referral_on_purchase`).
   * **Rangos de Comisión:**
     * 🥉 **Bronce (0 - 5 referidos):** $20.000 COP por referido.
     * 🥈 **Plata (6 - 15 referidos):** $50.000 COP por referido.
     * 🥇 **Oro (16+ referidos):** $70.000 COP por referido.
3. **Contratos Oficiales y Legalidad:**
   * Respaldado por **Granja Villa Morales del Valle SAS**.
   * Cada compra genera un contrato en PDF con firma autógrafa digitalizada en base64, cédula del inversionista y términos contractuales vinculantes.

---

## 🚨 5. Protocolo de Emergencia ante Fallos o Bugs Graves (3 Pasos)

Si ocurre una eventualidad que afecte a producción o genere inconsistencias:

```
[Paso 1: Detener Impacto] ──▶ [Paso 2: Diagnóstico Seguro] ──▶ [Paso 3: Parche Atómico]
 (Instant Rollback Vercel)     (Scripts Read-Only en BD)      (Compilar + Push vía MCP)
```

### Paso 1: Rollback Instantáneo en Vercel (10 segundos)
* Si un despliegue rompe la aplicación en producción, entra a [Vercel Dashboard](https://vercel.com) → Proyecto `piggy-app-v2` → Pestaña **Deployments**.
* Ubica el despliegue anterior que funcionaba de forma estable.
* Haz clic en los tres puntos `...` y selecciona **"Promote to Production" / "Instant Rollback"**.
* La app vuelve al estado sano de inmediato para todos los usuarios.

### Paso 2: Diagnóstico no destructivo en Base de Datos (2 minutos)
* **Regla estricta:** Nunca hacer `UPDATE` o `DELETE` masivos a ciegas.
* Ejecutar scripts de solo lectura (`SELECT`) para auditar el estado exacto de las tablas afectadas (`profiles`, `referrals`, `wallet_transactions`).

### Paso 3: Corrección atómica, compilación y despliegue (5 minutos)
* Implementar la corrección atacando la causa raíz.
* Ejecutar `npm run build` en local para verificar que Vite compile sin errores.
* Desplegar exclusivamente vía **GitHub MCP** hacia la rama `main`.

---

## 🏷️ 6. Guía de Versionamiento y Git Tags

Para marcar hitos de versiones estables (versiones "doradas" a prueba de fallos):

* **Versión actual de referencia:** `v2.0-stable`
* Cada vez que se culmine una funcionalidad grande y se verifique al 100%, se recomienda etiquetar en Git:
  ```bash
  # Ejemplo de etiquetado de versión estable
  git tag -a v2.0-stable -m "Versión 2.0 estable: Granja, Wallet Unificada, Referidos y Contratos operativos"
  git push origin v2.0-stable
  ```

---

*Documento actualizado y certificado al 28 de Agosto de 2026 para Piggy App v2.*
