# 🐷 PIGGY APP v2 — SYSTEM BLUEPRINT & MANUAL MAESTRO DE ARQUITECTURA

> **Propósito del Documento:** Este archivo es la **fuente de verdad técnica permanente** de `PIGGY APP`. Cualquier agente de IA, desarrollador o arquitecto de sistemas **DEBE LEER ESTE ARCHIVO** (junto con el Manual de Marca V5 y `PRODUCT.md` del Cerebro Central) antes de realizar refactorizaciones o introducir cambios, garantizando la integridad de la base de datos, el respeto a las reglas de negocio (*Chesterton's Fence*) y la coherencia comercial.

---

## 🏛️ 1. Visión General y Stack Tecnológico

**Piggy App** es una plataforma de **agro-comercio digital** (*"Tu granja de engorde en tu celular."*) que conecta a participantes comerciales con el ciclo real de ceba porcina tecnificada. **No es una entidad financiera ni un producto de captación.**

* **Operador Productivo y Comercializadora:** **Granja Villa Morales del Valle S.A.S.** (NIT `900.860.384-7`)
* **Operadora Tecnológica de la Plataforma:** **Valle Piggy S.A.S.** (NIT `902097746-4`, Cali)

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES Modules) + SPA Hash Router | Rendimiento ligero y compatibilidad móvil total (PWA) |
| **Estilos & Marca** | CSS3 Modular con Tokens de Marca V5 (`src/styles/`) | Diseño visual atómico, responsivo y paleta oficial del logo |
| **Backend & DB** | Supabase (PostgreSQL 15 + PostgREST + Auth + RLS) | Persistencia, seguridad por políticas y disparadores SQL |
| **Pagos y Retiros** | Wompi API (recaudo) + Llaves Bre-B (transferencias directas) | Recaudo comercial y desembolso en máx. 72 horas |
| **Contratos** | `pdf-lib` + canvas para firma autógrafa digital | Contrato Marco Tripartito (28 cláusulas) en PDF descargable |
| **Despliegue** | GitHub (`amsterdamlab/piggy-app-v2`) vía MCP → Vercel CI/CD | Despliegue continuo en producción |

---

## 🗄️ 2. Modelo de Datos y Fuentes de Verdad (Single Source of Truth)

> **Nota de nomenclatura:** Las tablas y columnas de PostgreSQL conservan sus nombres técnicos históricos en código (`wallet_balance`, `investment_amount`, `extra_roi_bonus`, etc.) por compatibilidad de esquema, pero en toda interfaz, copy, contrato y documentación externa se expresan exclusivamente con la terminología comercial oficial.

### A. Tabla `public.profiles` (Extensión de `auth.users`)
* **`id`** `UUID` (PK, FK `auth.users.id`): Identificador único del participante.
* **`full_name`** `TEXT`: Nombre completo del participante.
* **`email`** `TEXT`: Correo electrónico vinculado a la cuenta.
* **`whatsapp`** `TEXT`: Teléfono celular verificado para contacto y alertas.
* **`cedula`** `TEXT`: Documento de identidad (usado en contratos comerciales oficiales).
* **`bank_name`**, **`bank_account_type`**, **`bank_breve_key`** `TEXT`: Datos de cuenta comercial / llave Bre-B para desembolsos.
* **`referral_code`** `VARCHAR(10)`: Código único de Embajador (ej. `HOM952`), generado automáticamente por trigger.
* **`referred_by`** `UUID` (FK `profiles.id`): ID del Embajador que lo invitó.
* **`wallet_balance`** `NUMERIC`: **Saldo en Efectivo** (`$`). **Gestionado exclusivamente por triggers del libro mayor.**
* **`consumption_balance`** `NUMERIC`: **Saldo Granja** (`$`) para bonos de bienvenida y compras internas.
* **`welcome_bonus_status`** `TEXT` (`active`, `consumed`, `expired`): Estado del bono de bienvenida de `$20.000`.
* **`terms_accepted`**, **`habeas_data_accepted`** `BOOLEAN`: Consentimiento legal y autorización Ley 1581 de 2012.

### B. Tabla `public.referrals` (Plan de Embajadores)
* **`id`** `UUID` (PK): ID del registro de referido.
* **`referrer_id`** `UUID` (FK `profiles.id`): Embajador que compartió su código.
* **`referred_id`** `UUID` (FK `profiles.id`): Nuevo participante registrado.
* **`status`** `TEXT` (`pending`, `completed`, `expired`): Pasa a `completed` en la **primera compra productiva** de un Piggy del referido.
* **`commission_amount`** `NUMERIC`: Comisión liquidada según nivel del Embajador (`$20.000` / `$30.000` / `$50.000`).
* **`commission_tier`** `TEXT` (`tier_1` Bronce, `tier_2` Plata, `tier_3` Oro).
* **`completed_at`** `TIMESTAMP`: Momento de liquidación de la comisión.

### C. Tabla `public.wallet_transactions` (Libro Mayor Inmutable)
* **`id`** `UUID` (PK): ID del asiento contable.
* **`user_id`** `UUID` (FK `profiles.id`): Titular de la cuenta.
* **`amount`** `NUMERIC`: Monto monetario (`$`).
* **`type`** `TEXT` (`credit`, `debit`): Naturaleza del movimiento.
* **`description`** `TEXT`: Concepto auditable (ej. `"Comisión de Referido: Primera compra de ..."`).
* **`wallet_type`** `TEXT` (`dinero` → Saldo en Efectivo, `consumo` → Saldo Granja).

### D. Tabla `public.piggies` (Activos Agroproductivos en Granja)
* **`id`** `UUID` (PK): Identificador único del cerdito.
* **`user_id`** `UUID` (FK `profiles.id`): Titular del activo.
* **`status`** `TEXT` (`engorde`, `completado`, `liquidado`): Estado del ciclo de **20 semanas / 144 días (4 meses con 3 semanas)**.
* **`purchase_date`**, **`end_date`**, **`fixed_end_date`** `TIMESTAMP`: Fechas de inicio y cosecha del ciclo.
* **`investment_amount`** `NUMERIC`: Valor de compra del Piggy (desde `$1.000.000`).
* **`extra_roi_bonus`** `NUMERIC`: Puntos adicionales proyectados de la categoría (`0.01` Plus, `0.02` Dorado, `0.03` Premium).
* **`category`** `TEXT`: `estandar`, `plus`, `dorado`, `premium`, `avanzado30`, `avanzado45`, `avanzado60`, `avanzado75`, `avanzado90`.
* **`current_weight`**, **`final_weight`** `NUMERIC`: Evolución biológica desde **`~6 kg`** (destete) hasta un tope estricto de **`110 kg`** en pie según categoría.
* **`contract_url`**, **`contract_code`** `TEXT`: PDF firmado y código único de propiedad (`PGY-TX-...`).
* **`image_url`** `TEXT`: Fotografía de la etapa visual actual (`stage1` / `stage2` / `stage3`).

---

## ⚡ 3. Disparadores y Triggers Críticos de Base de Datos

> ⚠️ **REGLA DE ORO:** Nunca eliminar ni modificar estos triggers sin analizar antes sus dependencias cruzadas (*Chesterton's Fence*).

1. **`trg_generate_referral_code` (en `public.profiles`):**
   * *Momento:* `BEFORE INSERT OR UPDATE` cuando `referral_code IS NULL`.
   * *Lógica:* Extrae las 3 primeras letras del nombre (en mayúsculas, sin tildes) y concatena 3 dígitos aleatorios sin colisiones.
2. **`on_auth_user_created` (en `auth.users`):**
   * *Momento:* `AFTER INSERT ON auth.users`.
   * *Lógica:* Inserta la fila correspondiente en `public.profiles` con su bono de bienvenida de `$20.000` en Saldo Granja.
3. **`trg_prevent_manual_balance_update` y Veeduría Contable Inmutable:**
   * *Lógica:* Impide alterar `wallet_balance` o `consumption_balance` manualmente sin su asiento 1:1 en `wallet_transactions`. Ninguna vista puede ocultar movimientos históricos.
4. **`trg_handle_piggy_insert_referral` (en `public.piggies`):**
   * *Momento:* `AFTER INSERT ON public.piggies`.
   * *Lógica:* Evalúa automáticamente `process_referral_on_purchase` para acreditar la comisión del Embajador en la primera compra del referido.
5. **`sync_piggy_weights` y `mark_expired_piggies` (RPCs):**
   * *Lógica:* Recalculan pesos biológicos (`6 kg` → `final_weight`, tope `110 kg` en `144 días`) y marcan como `completado` los cerditos que alcanzan su `end_date`.

---

## 💼 4. Reglas de Negocio Inmutables (Alineadas a Manual V5 y `PRODUCT.md`)

1. **Ciclo Productivo y Escala de Beneficio Comercial Proyectado:**
   * **Valor base de compra:** Desde `$1.000.000` por cerdito en destete (`~6 kg`).
   * **Duración oficial:** **20 semanas / 144 días (4 meses con 3 semanas)** hasta máximo **`110 kg`** en pie.
   * **Beneficio comercial base proyectado** (según cantidad de Piggies activos):
     * **1 Piggy activo:** `8%` (`$1.080.000` proyectado por unidad base).
     * **2 Piggies activos:** `9%` (`$1.090.000` proyectado por unidad base).
     * **3 o más Piggies activos:** `10%` (`$1.100.000` proyectado por unidad base).
   * **Categorías de Cerditos** (el porcentaje adicional aplica **exclusivamente al cerdito específico**; beneficio comercial proyectado total **del 8% al 13%**):
     * **Estándar:** `80–90 kg` (`+0%`, ciclo completo de 144 días).
     * **Plus:** `80–90 kg` (**`+1%`** adicional).
     * **Dorado:** `90–100 kg` (**`+2%`** adicional).
     * **Premium:** `100–110 kg` (**`+3%`** adicional, tope máximo `110 kg`).
     * **Avanzado:** `80–90 kg` (`+0%`, lotes con **15 a 90 días de avance previo**: `avanzado30`, `avanzado45`, `avanzado60`, `avanzado75`, `avanzado90`).
2. **Sistema de Doble Saldo Comercial y Liquidación (Día 144):**
   * **Saldo en Efectivo (`wallet_balance`):** Valor de liquidación de cosechas y recargas confirmadas vía Wompi/Bre-B. **100% transferible** a llave **Bre-B** (SLA máx. **72 horas** hábiles) o redimible en **carne fresca** (SLA máx. **48 horas**, exclusivo Cali y alrededores), o reinvertible en nuevos Piggies (libertad total: 100% dinero, 100% carne, mixto o recompra).
   * **Saldo Granja (`consumption_balance`):** Bono de bienvenida (`$20.000`), comisiones de Embajadores y promociones. **No retirable en efectivo**; redimible en compras internas o productos de aliados/Piggy Gourmet.
3. **Plan de Embajadores (Liquidación en Primera Compra del Referido):**
   * **Bono para el referido:** `$20.000` en Saldo Granja.
   * **Bronce (`0–5` referidos completados):** `$20.000` por compra efectiva.
   * **Plata (`6–15` referidos completados):** `$30.000` por compra efectiva.
   * **Oro (`16+` referidos completados):** `$50.000` por compra efectiva.
4. **Respaldo Legal y Mitigación Operativa (Contrato Marco Tripartito):**
   * Suscrito entre **Granja Villa Morales del Valle S.A.S.**, **Valle Piggy S.A.S.** y el participante, con firma autógrafa digitalizada en PDF y código único de propiedad.
   * **Cláusula 16:** Reserva operativa del **25%** de animales en cada lote para reposiciones trazables y reserva interna de contingencia del **5%**.
   * **Cláusula 17:** Derecho de retracto dentro de **5 días hábiles**; desistimiento voluntario extemporáneo devuelve el **70%** y retiene **30%** por costos operativos.
   * Todo resultado económico se comunica siempre como **proyectado** (nunca garantizado).

---

## 🚨 5. Protocolo de Emergencia ante Fallos en Producción (3 Pasos)

```
[Paso 1: Detener Impacto] ──▶ [Paso 2: Diagnóstico Seguro] ──▶ [Paso 3: Parche Atómico]
 (Instant Rollback Vercel)     (Scripts Read-Only en BD)      (Build + Push vía MCP)
```

### Paso 1: Rollback Instantáneo en Vercel (10 segundos)
* Entrar a [Vercel Dashboard](https://vercel.com) → Proyecto `piggy-app-v2` → **Deployments**.
* Seleccionar el despliegue estable anterior → `...` → **"Promote to Production" / "Instant Rollback"**.

### Paso 2: Diagnóstico no destructivo en Base de Datos (2 minutos)
* **Regla estricta:** Nunca ejecutar `UPDATE` o `DELETE` masivos sin auditoría previa.
* Ejecutar consultas `SELECT` para verificar el estado real de `profiles`, `piggies`, `referrals` y `wallet_transactions`.

### Paso 3: Corrección atómica, compilación y despliegue (5 minutos)
* Implementar el parche respetando Separación de Responsabilidades y tokens de marca V5.
* Ejecutar `npm run build` en local para validar compilación limpia con Vite.
* Desplegar **exclusivamente vía GitHub MCP** hacia `amsterdamlab/piggy-app-v2` (rama `main`). Para archivos > 1.000 líneas, entregar paso a paso manual.

---

*Documento alineado y certificado el 18 de Noviembre de 2026 con `MANUAL_DE_MARCA_V5.md`, `PRODUCT.md` y el código vigente de Piggy App v2.*
