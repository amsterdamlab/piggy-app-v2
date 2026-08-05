/* ============================================
   PIGGY APP — Mock Data for Development
   Used when Supabase is not configured
   ============================================ */

export const MOCK_USER = {
    id: 'user-001',
    email: 'ale@correo.com',
    created_at: '2026-01-15T10:00:00Z',
};

export const MOCK_PROFILE = {
    id: 'user-001',
    full_name: 'Alejandra García',
    whatsapp: '+573001234567',
    terms_accepted: true,
    habeas_data_accepted: true,
    referral_code: 'ALE582',
    referral_balance: 30000,
    created_at: '2026-01-15T10:00:00Z',
};

export const MOCK_PIGGIES = [
    {
        id: 'pig-001',
        user_id: 'user-001',
        status: 'engorde',
        purchase_date: '2026-01-20T10:00:00Z',
        end_date: '2026-06-10T10:00:00Z',
        investment_amount: 1000000,
        extra_roi_bonus: 0,
        current_weight: 45.2,
        created_at: '2026-01-20T10:00:00Z',
        name: 'Pochito',
    },
    {
        id: 'pig-002',
        user_id: 'user-001',
        status: 'engorde',
        purchase_date: '2026-02-01T10:00:00Z',
        end_date: '2026-06-22T10:00:00Z',
        investment_amount: 1000000,
        extra_roi_bonus: 0.01,
        current_weight: 32.7,
        created_at: '2026-02-01T10:00:00Z',
        name: 'Luna',
    },
];

export const MOCK_MARKETPLACE = [
    {
        id: 'item-001',
        item_name: 'Piggy Estándar',
        description: 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.',
        price: 1000000,
        extra_roi: 0,
        stock: 50,
        image_url: null,
        category: 'standard',
    },
    {
        id: 'item-002',
        item_name: 'Piggy Premium',
        description: 'Cerdo de raza premium con alimentación especial. Bono de +1% adicional.',
        price: 1200000,
        extra_roi: 0.01,
        stock: 20,
        image_url: null,
        category: 'accelerator',
    },
    {
        id: 'item-003',
        item_name: 'Piggy Pro',
        description: 'Lote seleccionado con máxima eficiencia de conversión alimenticia. Bono de +2%.',
        price: 1500000,
        extra_roi: 0.02,
        stock: 10,
        image_url: null,
        category: 'accelerator',
    },
];

export const MOCK_TRANSACTIONS = [
    {
        id: 'tx-001',
        user_id: 'user-001',
        type: 'compra',
        amount: -1000000,
        description: 'Compra de Piggy Pochito',
        status: 'completado',
        created_at: '2026-01-20T10:00:00Z',
    },
    {
        id: 'tx-002',
        user_id: 'user-001',
        type: 'compra',
        amount: -1000000,
        description: 'Compra de Piggy Luna',
        status: 'completado',
        created_at: '2026-02-01T10:00:00Z',
    },
    {
        id: 'tx-003',
        user_id: 'user-001',
        type: 'bono_referido',
        amount: 30000,
        description: 'Bono por referido registrado (Carlos M.)',
        status: 'completado',
        created_at: '2026-02-10T14:30:00Z',
    },
];

/** 10 Growth stages over 144 days */
export const PIGGY_GROWTH_STAGES = [
    {
        stageNumber: 1,
        minPercent: 0,
        maxPercent: 4.9,
        title: 'Destete',
        icon: '🍼',
        approxDays: 'Días 0 - 7',
        description: (name) => `${name} ha ingresado a las cunas de destete tras dejar su zona de lactancia cálidamente.`
    },
    {
        stageNumber: 2,
        minPercent: 5.0,
        maxPercent: 8.9,
        title: 'Climatización Controlada',
        icon: '🌡️',
        approxDays: 'Días 8 - 13',
        description: (name) => `Estamos regulando la temperatura ambiente entre 26°C y 29°C para que ${name} se mantenga en óptimas condiciones.`
    },
    {
        stageNumber: 3,
        minPercent: 9.0,
        maxPercent: 13.9,
        title: 'Adaptación de Corral',
        icon: '🏡',
        approxDays: 'Días 14 - 20',
        description: (name) => `${name} se socializa en su nuevo espacio y reconoce los puntos de hidratación y alimentación.`
    },
    {
        stageNumber: 4,
        minPercent: 14.0,
        maxPercent: 20.9,
        title: 'Nutrición Adaptativa',
        icon: '🌾',
        approxDays: 'Días 21 - 30',
        description: (name) => `${name} recibe su alimento pre-iniciador especializado para adaptar gradualmente su sistema digestivo.`
    },
    {
        stageNumber: 5,
        minPercent: 21.0,
        maxPercent: 26.9,
        title: 'Nutrición Fortificada',
        icon: '🍲',
        approxDays: 'Días 31 - 38',
        description: (name) => `${name} avanza en su plan nutricional con alimento de transición para fortalecer su flora intestinal.`
    },
    {
        stageNumber: 6,
        minPercent: 27.0,
        maxPercent: 34.9,
        title: 'Alimento Proteico',
        icon: '🌿',
        approxDays: 'Días 39 - 50',
        description: (name) => `${name} consume alimento de inicio y completa la maduración total de su sistema digestivo.`
    },
    {
        stageNumber: 7,
        minPercent: 35.0,
        maxPercent: 61.9,
        title: 'Desarrollo Acelerado',
        icon: '🚀',
        approxDays: 'Días 51 - 89',
        description: (name) => `${name} pasa a los galpones de engorde en lote y gana peso a ritmo acelerado con 16% de proteína.`
    },
    {
        stageNumber: 8,
        minPercent: 62.0,
        maxPercent: 97.9,
        title: 'Engorde Final',
        icon: '🥩',
        approxDays: 'Días 90 - 140',
        description: (name) => `${name} se alimenta libremente al 14% de proteína en nuestra granja cubierta.`
    },
    {
        stageNumber: 9,
        minPercent: 98.0,
        maxPercent: 99.9,
        title: 'Preparación de Salida',
        icon: '💧',
        approxDays: 'Días 141 - 143',
        description: (name) => `Se retira el alimento sólido de ${name} para reducir la contaminación de la canal, manteniendo agua a libre voluntad.`
    },
    {
        stageNumber: 10,
        minPercent: 100.0,
        maxPercent: 100.0,
        title: 'Salida al Mercado',
        icon: '🚚',
        approxDays: 'Día 144',
        description: (name) => `${name} ha alcanzado su peso ideal de mercado y se prepara para ser trasladado de la granja.`
    }
];

/**
 * Get current growth stage based on progress percentage
 */
export function getPiggyGrowthStage(progressPercent, piggyName = 'Tu Piggy') {
    const p = Math.max(0, Math.min(100, progressPercent || 0));
    const stage = PIGGY_GROWTH_STAGES.find(s => p >= s.minPercent && p <= s.maxPercent)
                 || PIGGY_GROWTH_STAGES[PIGGY_GROWTH_STAGES.length - 1];

    return {
        stageNumber: stage.stageNumber,
        title: stage.title,
        icon: stage.icon,
        approxDays: stage.approxDays,
        description: stage.description(piggyName),
        minPercent: stage.minPercent,
        maxPercent: stage.maxPercent,
    };
}

/** Check if Supabase client is available */
export function isSupabaseConfigured() {
    return (
        typeof window !== 'undefined' &&
        window.__ENV__ &&
        window.__ENV__.VITE_SUPABASE_URL &&
        window.__ENV__.VITE_SUPABASE_ANON_KEY &&
        !window.__ENV__.VITE_SUPABASE_URL.includes('your-supabase')
    );
}

/** Format COP currency safely */
export function formatCOP(amount) {
    const num = Number(amount);
    if (amount === undefined || amount === null || isNaN(num)) return '$ 0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

/** Calculate days remaining from now until end_date */
export function getDaysRemaining(endDate) {
    if (!endDate) return 143;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return 143;
    const now = new Date();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Calculate progress percentage (0-100) for a piggy's cycle */
export function getProgressPercentage(purchaseDate, endDate) {
    const start = new Date(purchaseDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/** Get the base ROI percentage based on piggy count */
export function calculateBaseROI(piggyCount) {
    if (piggyCount >= 3) return 0.10;
    if (piggyCount === 2) return 0.09;
    return 0.08;
}

/** Calculate total return for a piggy */
export function calculateTotalReturn(investment, baseROI, extraROI = 0) {
    return investment + (investment * (baseROI + extraROI));
}

/** Format percentage for display */
export function formatPercentage(value) {
    return `${(value * 100).toFixed(0)}%`;
}

/** Simulate weight based on progress (6kg to 120kg over 144 days) */
export function simulateWeight(progressPercent) {
    const p = Math.max(0, Math.min(100, progressPercent || 0));
    return 6 + Math.pow(p / 100, 1.4) * 114;
}

/** Tips arrays for tips rotation */
export const PIGGY_TIPS = [
    { icon: '💡', title: '¿Sabías que?', description: 'La porcicultura representa uno de los sectores agropecuarios de mayor crecimiento en la región.', reward: 'Aprende más en la sección EduPork' },
    { icon: '🌾', title: 'Alimentación Eficiente', description: 'Nuestros cerditos reciben dieta balanceada a base de maíz y soya con alta digestibilidad.', reward: 'Crecimiento óptimo garantizado' },
    { icon: '📈', title: 'Maximiza tu Rentabilidad', description: 'Al tener 3 o más Piggys en tu granja, tu margen comercial aumenta automáticamente al 10%.', reward: '+10% Margen Comercial' },
    { icon: '🛡️', title: 'Seguridad Agro', description: 'Cada Piggy cuenta con seguro de trazabilidad y acompañamiento veterinario 24/7.', reward: 'Inversión 100% respaldada' },
    { icon: '🎁', title: 'Refiere y Gana', description: 'Comparte tu código de referido y gana $30.000 COP en bonos por cada amigo que adopte su primer Piggy.', reward: '$30.000 por cada referido' },
    { icon: '🚚', title: 'Cierre de Ciclo', description: 'Al llegar al 100% de progreso, el cerdo es trasladado y comercializado a precio de mercado.', reward: 'Retiro directo a tu cuenta' },
];
