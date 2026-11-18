# 🐷 Requerimientos y Especificaciones Técnicas — Piggy App

> **Estado:** Documento actualizado y alineado el **18 de Noviembre de 2026** con el Manual de Marca V5 (`MANUAL_DE_MARCA_V5.md`), `PRODUCT.md`, `SYSTEM_BLUEPRINT.md` y el código en producción de `PIGGY APP`.

**Piggy App** (*"Tu granja de engorde en tu celular."*) es una plataforma de **agro-comercio digital** operada tecnológicamente por **Valle Piggy S.A.S.** (NIT `902097746-4`) y respaldada productiva y comercialmente por **Granja Villa Morales del Valle S.A.S.** (NIT `900.860.384-7`). Permite a los participantes adquirir cerdos reales en etapa de ceba tecnificada y seguir su crecimiento desde el celular hasta la liquidación en dinero o carne magra fresca. **No constituye una entidad financiera ni un producto de captación.**

---

## 1. Arquitectura del Stack

* **Frontend & Lógica de Interfaz:** Vanilla JavaScript (ES Modules) + Vite 6 + SPA Hash Router (PWA Mobile-First).
* **Backend, Auth y Base de Datos:** Supabase (PostgreSQL 15 + GoTrue Auth + RLS + Triggers + Storage).
* **Recaudo y Liquidación:** Pasarela **Wompi** (recargas y compras) + **Llaves Bre-B** (transferencias de liquidación en máx. 72 horas) + entregas directas de carne fresca en Cali y alrededores (máx. 48 horas).
* **Contratos Digitales:** `pdf-lib` + canvas de firma autógrafa (Contrato Marco Tripartito de 28 cláusulas con código único `PGY-TX-...`).
* **Despliegue:** GitHub (`amsterdamlab/piggy-app-v2`) vía MCP → Vercel CI/CD.

---

## 2. Requerimientos Funcionales (RF)

| ID | Requerimiento | Descripción Vigente |
| :--- | :--- | :--- |
| **RF-01** | Registro con WhatsApp | Captura de Nombre completo, Email, Contraseña, WhatsApp (`+57`), código de Embajador opcional y creación automática del perfil con bono de bienvenida de `$20.000` en Saldo Granja. |
| **RF-02** | Validación Legal Obligatoria | Modal persistente (`LegalModal`) hasta aceptar Términos, Condiciones y Autorización de Tratamiento de Datos Personales (Ley 1581 de 2012). |
| **RF-03** | Gestión de Compra Productiva | Compra de Piggies desde `$1.000.000` mediante Cuenta Agro (recarga vía Wompi o Bre-B), emisión inmediata de contrato comercial en PDF firmado y descuento atómico de inventario (`buy_piggy`). |
| **RF-04** | Cálculo Dinámico de Beneficio Comercial Proyectado | Escala base según Piggies activos: `1 Piggy → 8%`, `2 Piggies → 9%`, `3+ Piggies → 10%`. Bonificaciones adicionales por categoría específica: **Plus (`+1%`)**, **Dorado (`+2%`)**, **Premium (`+3%`)** (rango proyectado total: **`8%` al `13%`**). |
| **RF-05** | Dashboard de Granja y Curva de Peso | Seguimiento del ciclo oficial de **20 semanas / 144 días (4 meses con 3 semanas)**, con evolución biológica desde **`~6 kg`** (destete) hasta un tope máximo de **`110 kg`** en pie, 3 etapas visuales de fotos y 10 sub-etapas zootécnicas. |
| **RF-06** | Mercado de Categorías y Avanzados | Catálogo con categorías **Estándar** (`80–90 kg`), **Plus** (`+1%`, `80–90 kg`), **Dorado** (`+2%`, `90–100 kg`), **Premium** (`+3%`, `100–110 kg`) y **Avanzado** (`15–90 días` de avance previo: `avanzado30/45/60/75/90`, `80–90 kg`). |
| **RF-07** | Liquidación al Día 144 y Doble Saldo | Separación estricta entre **Saldo en Efectivo** (`wallet_balance`, retirable vía Bre-B en máx. 72 h o redimible en carne fresca máx. 48 h en Cali y alrededores) y **Saldo Granja** (`consumption_balance`, no retirable). Libertad total al cierre: 100% dinero, 100% carne, mixto o recompra. |
| **RF-08** | Gamificación, Misiones y Plan de Embajadores | Misiones permanentes (M1–M9), de ciclo (M10) y Misiones Flash. Plan de Embajadores con liquidación automática en la primera compra del referido: **Bronce (`0–5` → `$20.000`)**, **Plata (`6–15` → `$30.000`)**, **Oro (`16+` → `$50.000`)**. |
| **RF-09** | Red de Aliados y Piggy Gourmet | Directorio de aliados comerciales y tienda de cortes magros de cerdo con redención de bonos y saldo. |

---

## 3. Requerimientos No Funcionales (RNF)

* **Seguridad y Cumplimiento:** Cifrado SSL, autenticación JWT vía Supabase Auth, Row Level Security (RLS) en todas las tablas y cumplimiento de la Ley 1581 de 2012 (Habeas Data).
* **Integridad Contable (Veeduría):** El libro mayor `wallet_transactions` es inmutable; ningún saldo en `profiles` puede alterarse sin su registro auditable 1:1.
* **Usabilidad y Marca V5:** Diseño Mobile-First (`480px` max-width), paleta oficial V5 (`#8A0B52`, `#E91E63`, `#FF4B8B`, `#FF85B3`, `#FFF0F5`, `#FFFFFF`, `#5E0738`, `#2B0519`, `#6E4A5E`), tipografías `Outfit` + `Inter`, iconos SVG `2px` sin emojis en UI, y formato de moneda sin sigla `COP` (`$1.000.000`).
* **Lenguaje Comercial Estricto:** Se prohíbe el uso de terminología financiera o de promesa fija (*inversión, rentabilidad, ROI, ahorro, capital, fintech, bancos, garantizado*). Todo resultado económico es **proyectado**.

---

## 4. Estructura Base de Tablas en Supabase (Referencia)

> Los nombres de columnas conservan su identificador técnico histórico en PostgreSQL por compatibilidad con producción.

```sql
-- 1. PERFILES (Extensión de auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  whatsapp TEXT UNIQUE,
  cedula TEXT,
  terms_accepted BOOLEAN DEFAULT FALSE,
  habeas_data_accepted BOOLEAN DEFAULT FALSE,
  wallet_balance NUMERIC DEFAULT 0,       -- Saldo en Efectivo
  consumption_balance NUMERIC DEFAULT 0,  -- Saldo Granja (Bono bienvenida $20.000)
  referral_code VARCHAR(10) UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  bank_name TEXT,
  bank_account_type TEXT,
  bank_breve_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. PIGGIES (Activos Agroproductivos)
CREATE TABLE public.piggies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'engorde' CHECK (status IN ('engorde', 'completado', 'liquidado')),
  category TEXT DEFAULT 'estandar',       -- estandar, plus, dorado, premium, avanzado30..90
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '144 days'),
  fixed_end_date TIMESTAMPTZ,
  investment_amount NUMERIC DEFAULT 1000000, -- Valor de compra ($1.000.000)
  extra_roi_bonus NUMERIC DEFAULT 0,         -- +0.01 Plus, +0.02 Dorado, +0.03 Premium
  current_weight NUMERIC DEFAULT 6.0,        -- Peso inicial destete ~6.0 kg
  final_weight NUMERIC DEFAULT 85.0,         -- Tope estricto 110.0 kg
  contract_url TEXT,
  contract_code TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MARKETPLACE (Inventario de Cerditos)
CREATE TABLE public.marketplace (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 1000000,
  category public.piggy_category_enum DEFAULT 'estandar',
  extra_roi NUMERIC DEFAULT 0,
  days_advanced INTEGER DEFAULT 0,
  days_remaining INTEGER DEFAULT 144,
  current_weight NUMERIC DEFAULT 6.0,
  stock INTEGER DEFAULT 10,
  image_url TEXT
);

-- 4. LIBRO MAYOR INMUTABLE (wallet_transactions)
-- 5. REFERIDOS / EMBAJADORES (referrals)
-- 6. ALIADOS (allies), MISIONES (missions / user_flash_missions) Y GOURMET (piggy_gourmet_orders)
```

---

## 5. Fórmulas y Lógica Operativa Clave

* **Beneficio comercial proyectado por unidad:**
  `Total_Proyectado = Valor_Compra + (Valor_Compra * (Beneficio_Base + Extra_Categoría))`
  * `Beneficio_Base`: `8%` (1 Piggy), `9%` (2 Piggies), `10%` (3+ Piggies).
  * `Extra_Categoría`: `+1%` (Plus, `80–90 kg`), `+2%` (Dorado, `90–100 kg`), `+3%` (Premium, `100–110 kg`).
* **Peso objetivo por categoría (tope absoluto `110 kg`):**
  * Estándar / Avanzado / Plus: `80–90 kg`
  * Dorado: `90–100 kg`
  * Premium: `100–110 kg`
* **Comisiones de Embajadores (en primera compra del referido):**
  * `0–5` referidos: `$20.000` (Bronce)
  * `6–15` referidos: `$30.000` (Plata)
  * `16+` referidos: `$50.000` (Oro)
* **Respaldo contractual (Contrato Marco Tripartito):** Reserva operativa del `25%` de animales por lote, reserva de contingencia del `5%`, retracto legal en `5` días hábiles y retención del `30%` por desistimiento voluntario extemporáneo.
