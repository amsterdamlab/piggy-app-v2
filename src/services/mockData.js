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
        item_name: 'Piggy Elite',
        description: 'Cerdo élite con genética superior y cuidado personalizado. Bono de +2% adicional.',
        price: 1500000,
        extra_roi: 0.02,
        stock: 10,
        image_url: null,
        category: 'accelerator',
    },
    {
        id: 'item-004',
        item_name: 'Acelerador Nutricional',
        description: 'Suplemento premium que mejora el crecimiento. +1% al cerdo seleccionado.',
        price: 150000,
        extra_roi: 0.01,
        stock: 100,
        image_url: null,
        category: 'booster',
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
    },
];

export const MOCK_MISSIONS = [
    {
        id: 'm1',
        title: 'Crea una cuenta nueva',
        reward: 'Bono consumo x $50.000',
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
        icon: '🏪',
        cta: '#/aliados'
    },
    {
        id: 'm6',
        title: 'Cierra tu primer ciclo',
        reward: 'Desbloquea Piggy Silver (24h)',
        is_completed: false,
        icon: '🏁',
        cta: null
    },
    {
        id: 'm7',
        title: 'Activa tu 3er Piggy',
        reward: 'Mantén 10% Margen Comercial',
        is_completed: false,
        icon: '💎',
        cta: '#/mercado'
    },
    {
        id: 'm8',
        title: 'Compra la oferta de la semana',
        reward: 'Desbloquea Piggy Gold (24h)',
        is_completed: false,
        icon: '🥩',
        cta: '#/mercado'
    },
    {
        id: 'm9',
        title: 'Refiere y logra una compra',
        reward: 'Obtén $30.000 en tu Wallet',
        is_completed: false,
        icon: '🤝',
        cta: null
    }
];

/** Investment amount formatted as COP */
export function formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/** Calculate days remaining from now until end_date */
export function getDaysRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
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

/** Simulate weight based on progress */
export function simulateWeight(progressPercent) {
    const minWeight = 15;
    const maxWeight = 110;
    return minWeight + ((maxWeight - minWeight) * progressPercent / 100);
}
