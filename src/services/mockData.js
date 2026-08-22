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
    referral_balance: 20000,
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
        image_url: 'assets/piggies/stage2/et2-1.jpg',
        contract_code: '#PIG001',
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
        image_url: 'assets/piggies/stage1/et1-2.jpg',
        contract_code: 'PGY-TX-B843WD',
        contract_url: 'https://elhsvitbqzivgajccify.supabase.co/storage/v1/object/public/contracts/contratos/3349c043-bd00-4937-a831-6b5e6bb91738/contrato_1787196691238_PGY-TX-RK52-B843WD.pdf',
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
        discount_info: '15% de descuento en cortes premium',
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
        discount_info: '2x1 los jueves en platos de cerdo',
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
        discount_info: '10% en platos con cerdo',
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
        discount_info: 'Entrega gratuita en Medellín',
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
        reward: 'Obt&eacute;n $30.000 en tu Wallet',
        is_completed: false,
        icon: '&#129309;',
        cta: null
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
