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
    consumption_balance: 20000,
    welcome_bonus_status: 'active',
    created_at: '2026-01-15T10:00:00Z',
};

const NOW_MS = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

export const MOCK_PIGGIES = [
    {
        id: 'pig-001',
        user_id: 'user-001',
        status: 'engorde',
        purchase_date: new Date(NOW_MS - 60 * DAY_MS).toISOString(),
        end_date: new Date(NOW_MS + 84 * DAY_MS).toISOString(),
        investment_amount: 1000000,
        extra_roi_bonus: 0,
        current_weight: 39.0,
        final_weight: 86.4,
        category: 'estandar',
        created_at: new Date(NOW_MS - 60 * DAY_MS).toISOString(),
        name: 'Pochito',
        image_url: 'assets/piggies/stage2/et2-1.jpg',
        contract_code: '#PIG001',
    },
    {
        id: 'pig-002',
        user_id: 'user-001',
        status: 'engorde',
        purchase_date: new Date(NOW_MS - 95 * DAY_MS).toISOString(),
        end_date: new Date(NOW_MS + 49 * DAY_MS).toISOString(),
        investment_amount: 1000000,
        extra_roi_bonus: 0.01,
        current_weight: 65.5,
        final_weight: 96.2,
        category: 'plus',
        created_at: new Date(NOW_MS - 95 * DAY_MS).toISOString(),
        name: 'Luna',
        image_url: 'assets/piggies/stage2/et2-3.jpg',
        contract_code: 'PGY-TX-B843WD',
        contract_url: 'https://elhsvitbqzivgajccify.supabase.co/storage/v1/object/public/contracts/contratos/3349c043-bd00-4937-a831-6b5e6bb91738/contrato_1787196691238_PGY-TX-RK52-B843WD.pdf',
    },
    {
        id: 'pig-003',
        user_id: 'user-001',
        status: 'completado',
        purchase_date: new Date(NOW_MS - 150 * DAY_MS).toISOString(),
        end_date: new Date(NOW_MS - 6 * DAY_MS).toISOString(),
        investment_amount: 1000000,
        extra_roi_bonus: 0.02,
        current_weight: 104.5,
        final_weight: 104.5,
        category: 'dorado',
        created_at: new Date(NOW_MS - 150 * DAY_MS).toISOString(),
        name: 'Rocky',
        image_url: 'assets/piggies/stage3/et3-1.jpg',
        contract_code: 'PGY-TX-RCK991',
    },
];

export const MOCK_MARKETPLACE = [
    {
        id: 'item-001',
        item_name: 'Piggy Estandar',
        description: 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.',
        price: 1000000,
        extra_roi: 0,
        stock: 50,
        current_weight: 6.0,
        image_url: null,
        category: 'estandar',
    },
    {
        id: 'item-002',
        item_name: 'Piggy Plus',
        description: 'Cerdo con comercialización en mercado plus. Bono de +1% adicional.',
        price: 1000000,
        extra_roi: 0.01,
        stock: 20,
        current_weight: 6.0,
        image_url: null,
        category: 'plus',
    },
    {
        id: 'item-003',
        item_name: 'Piggy Dorado',
        description: 'Cerdo con comercialización plus premium. Bono de +2% adicional.',
        price: 1000000,
        extra_roi: 0.02,
        stock: 10,
        current_weight: 6.0,
        image_url: null,
        category: 'dorado',
    },
    {
        id: 'item-004',
        item_name: 'Piggy Premium',
        description: 'Cerdo con comercialización exclusiva. Bono de +3% adicional.',
        price: 1000000,
        extra_roi: 0.03,
        stock: 10,
        current_weight: 6.0,
        image_url: null,
        category: 'premium',
    },
];

export const MOCK_ALLIES = [
    {
        id: 'ally-001',
        name: 'Carnes Don Julio',
        category: 'Carnicería',
        specialty: 'Cortes Premium',
        location: 'Cali, Valle del Cauca',
        image_url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
        description: 'Cortes selectos madurados y frescos para tus asados de fin de semana.',
        benefit: '15% de descuento en Punta de Anca',
        phone: '310 123 4567',
        address: 'Av. Pasoancho # 50-20',
        display_order: 1,
    },
    {
        id: 'ally-002',
        name: 'La Parrilla de Pepe',
        category: 'Restaurante',
        specialty: 'Parrilla & Barril',
        location: 'Cali, Valle del Cauca',
        image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
        description: 'Expertos en cocción lenta al barril. Chicharrón ahumado inigualable.',
        benefit: '2x1 los jueves en platos de cerdo',
        phone: '315 987 6543',
        address: 'Granada Calle 9 # 12-45',
        display_order: 2,
    },
    {
        id: 'ally-003',
        name: 'El Fogón de la Abuela',
        category: 'Restaurante',
        specialty: 'Comida Típica',
        location: 'Cali, Valle del Cauca',
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        description: 'Sabor tradicional con ingredientes del campo directo a tu mesa.',
        benefit: 'Postre gratis por consumo > $50k',
        phone: '312 456 7890',
        address: 'San Antonio Cra 4 # 2-10',
        display_order: 3,
    },
    {
        id: 'ally-004',
        name: 'SuperCarnes Express',
        category: 'Distribuidor',
        specialty: 'Venta al Por Mayor',
        location: 'Medellín, Antioquia',
        image_url: 'https://images.unsplash.com/photo-1615937651188-4b92cd38052e?auto=format&fit=crop&w=800&q=80',
        description: 'Abastecemos tu negocio con la mejor carne de cerdo de la región.',
        benefit: 'Envío gratis en pedidos mayoristas',
        phone: '300 555 1234',
        address: 'Centro, Calle 50 # 40-20',
        display_order: null,
    },
    {
        id: 'ally-005',
        name: 'Huellitas Felices',
        category: 'Petshop',
        specialty: 'Alimentos y Spa',
        location: 'Bogotá, Cundinamarca',
        image_url: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80',
        description: 'Todo para consentir a tu peludo. Baño, peluquería y juguetes.',
        benefit: '10% en Baño y Peluquería',
        phone: '312 456 7890',
        address: 'Av. Principal # 45-12',
        display_order: null,
    },
    {
        id: 'ally-006',
        name: 'El Barbero',
        category: 'Barbería',
        specialty: 'Cortes Clásicos',
        location: 'Cali, Valle del Cauca',
        image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
        description: 'Estilo y tradición. Afeitado con toalla caliente y los mejores cortes.',
        benefit: '2x1 en corte de cabello y barba',
        phone: '315 789 1234',
        address: 'Calle 10 # 20-30',
        display_order: null,
    }
];

export const MOCK_MISSIONS = [
    {
        id: 'm1',
        title: 'Crea una cuenta nueva',
        reward: 'Bono de consumo por valor de $20.000',
        is_completed: true,
        icon: '🎉',
        cta: null
    },
    {
        id: 'm2',
        title: 'Compra tu primer Piggy',
        reward: 'Desbloquea Piggy de 3 meses',
        is_completed: true, // Simulado completado para ver progreso
        icon: '🐷',
        cta: '#/mercado'
    },
    {
        id: 'm3',
        title: 'Invita a un amigo a Piggy',
        reward: 'Desbloquea tu código referido',
        is_completed: false,
        icon: '📲',
        cta: 'https://wa.me/?text=Hola!%20Te%20invito%20a%20ser%20parte%20de%20Piggy%20y%20ganar%20con%20cerdos%20digitales.%20Unete%20aqui:%20piggy.app'
    },
    {
        id: 'm4',
        title: 'Compra tu 2do Piggy',
        reward: '+1% en Margen Comercial',
        is_completed: false,
        icon: '📈',
        cta: '#/mercado'
    },
    {
        id: 'm5',
        title: 'Compra en locales aliados',
        reward: 'Desbloquea Piggy Silver (24h)',
        is_completed: false,
        icon: '&#127980;',
        cta: '#/aliados'
    },
    {
        id: 'm6',
        title: 'Cierra tu primer ciclo',
        reward: 'Desbloquea Piggy Silver (24h)',
        is_completed: false,
        icon: '&#128260;',
        cta: null
    },
    {
        id: 'm7',
        title: 'Activa tu 3er Piggy',
        reward: 'Mant&eacute;n 10% Margen Comercial',
        is_completed: false,
        icon: '&#128048;',
        cta: '#/mercado'
    },
    {
        id: 'm8',
        title: 'Compra la oferta de la semana',
        reward: 'Desbloquea Piggy Gold (24h)',
        is_completed: false,
        icon: '&#128293;',
        cta: '#/mercado'
    },
    {
        id: 'm9',
        title: 'Refiere y logra una compra',
        reward: 'Obt&eacute;n $20.000 en tu Wallet',
        is_completed: false,
        icon: '&#129309;',
        cta: null
    }
];

export const MOCK_MARKETING_BONUSES = [
    {
        id: 'promo-001',
        campaign_name: 'Oferta Express Fin de Semana',
        description: 'Bono especial para redimir en cortes de carne en la Tienda.',
        amount: 30000,
        min_order_amount: 150000,
        starts_at: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
        expires_at: new Date(NOW_MS + 5 * DAY_MS).toISOString(),
        target_audience: 'all',
        is_active: true,
    }
];

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
    const num = Number(value);
    if (value === undefined || value === null || isNaN(num)) return '12%';
    return `${(num * 100).toFixed(0)}%`;
}

/**
 * Returns a target final weight within the defined category range:
 * - Estándar / Avanzados: 80.0 kg - 90.0 kg
 * - Plus: 90.1 kg - 100.0 kg
 * - Dorado: 100.1 kg - 110.0 kg
 * - Premium: 110.1 kg - 120.0 kg
 * If a seedId is provided, returns a stable deterministic value.
 */
export function getCategoryFinalWeight(category, seedId = null) {
    const cat = String(category || 'estandar').toLowerCase();
    let min = 80.0;
    let max = 90.0;

    if (cat.includes('premium')) {
        min = 110.1;
        max = 120.0;
    } else if (cat.includes('dorado') || cat.includes('gold')) {
        min = 100.1;
        max = 110.0;
    } else if (cat.includes('plus') || cat.includes('silver')) {
        min = 90.1;
        max = 100.0;
    }

    if (seedId) {
        let hash = 0;
        const str = String(seedId);
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const ratio = (Math.abs(hash) % 1000) / 1000;
        return Number((min + (max - min) * ratio).toFixed(1));
    }

    return Number((min + Math.random() * (max - min)).toFixed(1));
}

/** Simulate weight based on progress (6kg to target final weight over 144 days) */
export function simulateWeight(progressPercent, targetFinalWeight = 85.0, minWeight = 6.0) {
    const maxWeight = Number(targetFinalWeight) || 85.0;
    const minW = Number(minWeight) || 6.0;
    const p = Math.min(100, Math.max(0, Number(progressPercent) || 0));
    return minW + ((maxWeight - minW) * p / 100);
}

/**
 * 10 Growth Stages breakdown for 144-day farm cycle.
 * Descriptions are concise (max 3 lines) and free of explicit weight numbers.
 */
export function getPiggyGrowthStage(progressPercent, piggyName = 'Tu Piggy') {
    const p = Math.min(100, Math.max(0, Number(progressPercent) || 0));

    if (p < 5.0) {
        return {
            stageNumber: 1,
            stageName: 'Destete',
            icon: '🍼',
            badgeBg: '#fef3c7',
            badgeColor: '#b45309',
            description: `${piggyName} ha ingresado a las cunas de destete tras dejar su zona de lactancia calidamente.`
        };
    }
    if (p < 9.0) {
        return {
            stageNumber: 2,
            stageName: 'Climatización Controlada',
            icon: '🌡️',
            badgeBg: '#e0f2fe',
            badgeColor: '#0369a1',
            description: `Estamos regulando la temperatura ambiente entre 26°C y 29°C para que ${piggyName} se mantenga en óptimas condiciones.`
        };
    }
    if (p < 14.0) {
        return {
            stageNumber: 3,
            stageName: 'Adaptación de Corral',
            icon: '🏡',
            badgeBg: '#fdf4ff',
            badgeColor: '#c026d3',
            description: `${piggyName} se socializa en su nuevo espacio y reconoce los puntos de hidratación y alimentación.`
        };
    }
    if (p < 21.0) {
        return {
            stageNumber: 4,
            stageName: 'Nutrición Adaptativa',
            icon: '🌾',
            badgeBg: '#f0fdf4',
            badgeColor: '#15803d',
            description: `${piggyName} recibe su alimento pre-iniciador especializado para adaptar gradualmente su sistema digestivo.`
        };
    }
    if (p < 27.0) {
        return {
            stageNumber: 5,
            stageName: 'Nutrición Fortificada',
            icon: '🍲',
            badgeBg: '#fdf4ff',
            badgeColor: '#a21caf',
            description: `${piggyName} avanza en su plan nutricional con alimento de transición para fortalecer su flora intestinal.`
        };
    }
    if (p < 35.0) {
        return {
            stageNumber: 6,
            stageName: 'Alimento Proteico',
            icon: '🌿',
            badgeBg: '#ecfdf5',
            badgeColor: '#047857',
            description: `${piggyName} consume alimento de inicio y completa la maduración total de su sistema digestivo.`
        };
    }
    if (p < 62.0) {
        return {
            stageNumber: 7,
            stageName: 'Desarrollo Acelerado',
            icon: '🚀',
            badgeBg: '#eff6ff',
            badgeColor: '#1d4ed8',
            description: `${piggyName} pasa a los galpones de engorde en lote y gana peso a ritmo acelerado con 16% de proteína.`
        };
    }
    if (p < 98.0) {
        return {
            stageNumber: 8,
            stageName: 'Engorde Final',
            icon: '🥩',
            badgeBg: '#fff1f2',
            badgeColor: '#be123c',
            description: `${piggyName} se alimenta libremente al 14% de proteína en nuestra granja cubierta.`
        };
    }
    if (p < 100.0) {
        return {
            stageNumber: 9,
            stageName: 'Preparación de Salida',
            icon: '💧',
            badgeBg: '#fefce8',
            badgeColor: '#a16207',
            description: `Se retira el alimento sólido de ${piggyName} para reducir la contaminación de la canal, manteniendo agua a libre voluntad.`
        };
    }
    return {
        stageNumber: 10,
        stageName: 'Salida al Mercado',
        icon: '🚚',
        badgeBg: '#f0fdf4',
        badgeColor: '#16a34a',
        description: `${piggyName} ha alcanzado su peso ideal de mercado y se prepara para ser trasladado de la granja.`
    };
}

/**
 * Format weight in kilograms.
 */
export function formatWeight(weight) {
    const num = Number(weight);
    if (isNaN(num) || num <= 0) return '15.0 kg';
    return `${num.toFixed(1)} kg`;
}

/**
 * Get Growth Phase Name by month number.
 */
export function getGrowthPhaseName(monthNumber) {
    const phases = {
        1: 'Iniciación / Destete',
        2: 'Crecimiento y Adaptación',
        3: 'Desarrollo Muscular',
        4: 'Engorde Acelerado',
        5: 'Finalización de Engorde',
    };
    return phases[monthNumber] || 'Crecimiento Inicial';
}
