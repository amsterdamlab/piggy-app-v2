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
        current_weight: 52.4,
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
        current_weight: 84.6,
        created_at: new Date(NOW_MS - 95 * DAY_MS).toISOString(),
        name: 'Tocineta',
        image_url: 'assets/piggies/stage3/et3-1.jpg',
        contract_code: '#PIG002',
    },
    {
        id: 'pig-003',
        user_id: 'user-001',
        status: 'engorde',
        purchase_date: new Date(NOW_MS - 15 * DAY_MS).toISOString(),
        end_date: new Date(NOW_MS + 129 * DAY_MS).toISOString(),
        investment_amount: 1000000,
        extra_roi_bonus: 0.02,
        current_weight: 22.1,
        created_at: new Date(NOW_MS - 15 * DAY_MS).toISOString(),
        name: 'Gordis',
        image_url: 'assets/piggies/stage1/et1-2.jpg',
        contract_code: '#PIG003',
    },
    {
        id: 'pig-004',
        user_id: 'user-001',
        status: 'disponible',
        purchase_date: new Date(NOW_MS - 150 * DAY_MS).toISOString(),
        end_date: new Date(NOW_MS - 6 * DAY_MS).toISOString(),
        investment_amount: 1000000,
        extra_roi_bonus: 0,
        current_weight: 120.0,
        created_at: new Date(NOW_MS - 150 * DAY_MS).toISOString(),
        name: 'Rosita',
        image_url: 'assets/piggies/stage3/et3-3.jpg',
        contract_code: '#PIG004',
    },
];

export const MOCK_MARKETPLACE_ITEMS = [
    {
        id: '1',
        name: 'Piggy Destete (1 Mes)',
        breed: 'Landrace x Pietrain',
        description: 'Lechón recién destetado con excelente genética y adaptación.',
        price: 250000,
        current_weight: 15.0,
        target_weight: 120.0,
        days_remaining: 144,
        days_advanced: 0,
        current_month: 1,
        stock: 5,
        is_available: true,
        category: 'estandar',
        extra_roi: 0,
        image_url: 'assets/piggies/stage1/et1-1.jpg',
        stage: 1,
        sort_order: 1,
        is_popular: true,
    },
    {
        id: '2',
        name: 'Piggy Crecimiento (2 Meses)',
        breed: 'Pietrain Puro',
        description: 'Lechón en etapa de desarrollo con ganancia de peso acelerada.',
        price: 250000,
        current_weight: 35.0,
        target_weight: 120.0,
        days_remaining: 114,
        days_advanced: 30,
        current_month: 2,
        stock: 3,
        is_available: true,
        category: 'estandar',
        extra_roi: 0,
        image_url: 'assets/piggies/stage2/et2-1.jpg',
        stage: 2,
        sort_order: 2,
        is_popular: false,
    },
    {
        id: '3',
        name: 'Piggy Desarrollo (3 Meses)',
        breed: 'Landrace Belga',
        description: 'Excelente conformación muscular, ideal para ciclo medio.',
        price: 250000,
        current_weight: 62.0,
        target_weight: 120.0,
        days_remaining: 84,
        days_advanced: 60,
        current_month: 3,
        stock: 4,
        is_available: true,
        category: 'estandar',
        extra_roi: 0,
        image_url: 'assets/piggies/stage2/et2-2.jpg',
        stage: 2,
        sort_order: 3,
        is_popular: false,
    },
    {
        id: '4',
        name: 'Piggy Engorde (4 Meses)',
        breed: 'Duroc Jersey',
        description: 'Etapa final de engorde con retorno rápido de inversión.',
        price: 250000,
        current_weight: 98.0,
        target_weight: 120.0,
        days_remaining: 54,
        days_advanced: 90,
        current_month: 4,
        stock: 2,
        is_available: true,
        category: 'avanzado',
        badge: '⚡ Retorno Rápido',
        extra_roi: 0,
        image_url: 'assets/piggies/stage3/et3-1.jpg',
        stage: 3,
        sort_order: 4,
        is_popular: true,
    },
    {
        id: '5',
        name: 'Piggy Dorado (Oferta Especial)',
        breed: 'Topigs Norsvin',
        description: 'Lote premium con bono adicional del +2% de retorno garantizado.',
        price: 250000,
        current_weight: 35.0,
        target_weight: 120.0,
        days_remaining: 114,
        days_advanced: 30,
        current_month: 2,
        stock: 1,
        is_available: true,
        category: 'dorado',
        badge: '🥇 +2% ROI Extra',
        extra_roi: 0.02,
        image_url: 'assets/piggies/stage2/et2-3.jpg',
        stage: 2,
        sort_order: 5,
        is_offer: true,
    },
];

export const MOCK_ALLIES = [
    {
        id: 'ally-001',
        name: 'La Casona Campestre',
        category: 'Restaurante',
        specialty: 'Comida Típica',
        location: 'Rozo, Palmira',
        image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        description: 'Disfruta de la mejor gastronomía vallecaucana en un ambiente campestre único. Sancocho de leña, asados y más.',
        benefit: '15% de descuento en platos fuertes',
        phone: '312 456 7890',
        address: 'Km 5 Vía Rozo, Palmira',
        discount_info: '15% de descuento en platos fuertes',
    },
    {
        id: 'ally-002',
        name: 'Finca Hotel Los Álamos',
        category: 'Turismo',
        specialty: 'Hospedaje Campestre',
        location: 'Cerrito, Valle del Cauca',
        image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        description: 'Descanso total en el corazón del Valle. Piscinas, zonas verdes y paseos a caballo.',
        benefit: '20% de descuento en estadías de fin de semana',
        phone: '315 678 1234',
        address: 'Vereda Santa Elena, Cerrito',
        discount_info: '20% de descuento en estadías de fin de semana',
    },
    {
        id: 'ally-003',
        name: 'Veterinaria El Ganadero',
        category: 'Servicios',
        specialty: 'Salud Animal',
        location: 'Palmira, Valle',
        image_url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80',
        description: 'Todo en insumos agropecuarios, medicamentos y asesoría veterinaria especializada.',
        benefit: '10% de descuento en concentrados y vitaminas',
        phone: '318 901 2345',
        address: 'Carrera 28 # 32-15, Palmira',
        discount_info: '10% de descuento en concentrados y vitaminas',
    },
    {
        id: 'ally-004',
        name: 'Gym Force Palmira',
        category: 'Fitness',
        specialty: 'Entrenamiento Funcional',
        location: 'Palmira, Valle',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
        description: 'Equipos de última generación, entrenadores certificados y planes nutricionales.',
        benefit: 'Mes gratis por compra de trimestre',
        phone: '310 234 5678',
        address: 'Calle 42 # 28-10, Palmira',
        discount_info: 'Mes gratis por compra de trimestre',
    },
    {
        id: 'ally-005',
        name: 'Pet Shop Huellitas',
        category: 'Comercio',
        specialty: 'Mascotas',
        location: 'Palmira, Valle',
        image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
        description: 'Alimentos premium, accesorios y spa para tus mascotas.',
        benefit: '10% en Baño y Peluquería',
        phone: '314 567 8901',
        address: 'Carrera 35 # 40-22, Palmira',
        discount_info: '10% en Baño y Peluquería',
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
        discount_info: '2x1 en corte de cabello y barba',
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
        reward: 'Desbloquea Piggy Gold (24h)',
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
    return `${(value * 100).toFixed(0)}%`;
}

/** Simulate weight based on progress (6kg to 120kg over 144 days) */
export function simulateWeight(progressPercent) {
    const minWeight = 6;
    const maxWeight = 120;
    const p = Math.min(100, Math.max(0, Number(progressPercent) || 0));
    return minWeight + ((maxWeight - minWeight) * p / 100);
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
            stageName: 'Destete Inicial',
            icon: '🍼',
            badgeBg: '#fdf2f8',
            badgeColor: '#db2777',
            description: `${piggyName} finaliza su etapa de lactancia y se adapta al agua potable permanente con electrolitos.`
        };
    }
    if (p < 10.0) {
        return {
            stageNumber: 2,
            stageName: 'Preiniciador',
            icon: '🥣',
            badgeBg: '#fdf2f8',
            badgeColor: '#db2777',
            description: `${piggyName} recibe papilla tibia 4 a 6 veces al día para estimular su consumo de alimento sólido.`
        };
    }
    if (p < 15.0) {
        return {
            stageNumber: 3,
            stageName: 'Iniciador Líquido',
            icon: '🥣',
            badgeBg: '#fdf2f8',
            badgeColor: '#db2777',
            description: `Transición a mezcla líquida de iniciador con agua para cuidar su digestión en desarrollo.`
        };
    }
    if (p < 20.0) {
        return {
            stageNumber: 4,
            stageName: 'Iniciador Húmedo',
            icon: '🥣',
            badgeBg: '#fdf2f8',
            badgeColor: '#db2777',
            description: `Alimento en consistencia húmeda servido en comederos limpios para asegurar una ingesta óptima.`
        };
    }
    if (p < 25.0) {
        return {
            stageNumber: 5,
            stageName: 'Alimento Seco Inicial',
            icon: '🌾',
            badgeBg: '#fefce8',
            badgeColor: '#ca8a04',
            description: `${piggyName} se alimenta con pellets secos de alta digestibilidad a libre voluntad.`
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
