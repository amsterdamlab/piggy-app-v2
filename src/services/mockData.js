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
    referral_balance: 20000,
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
        current_weight: 120.0,
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
];

export const MOCK_MISSIONS = [
    {
        id: 'm1',
        title: 'Obtén tu Bono de Bienvenida',
        description: 'Visita la tienda oficial y canjea tu bono $20.000 en cortes premium.',
        reward_points: 50,
        action_url: '#/gourmet',
        action_label: 'Ir a la Tienda',
        badge: '🎁 $20.000',
        badge_type: 'bonus',
    },
    {
        id: 'm2',
        title: 'Descubre los Aceleradores',
        description: 'Explora el mercado y conoce cómo aumentar tu rentabilidad hasta +2%.',
        reward_points: 30,
        action_url: '#/mercado',
        action_label: 'Ver Mercado',
        badge: '⚡ +2% ROI',
        badge_type: 'speed',
    },
    {
        id: 'm3',
        title: 'Invita a un amigo a Piggy',
        description: 'Comparte tu código de referido y gana comisiones por cada compra.',
        reward_points: 100,
        action_url: '#/referidos',
        action_label: 'Compartir Código',
        badge: '👥 Referidos',
        badge_type: 'referral',
    },
    {
        id: 'm4',
        title: 'Descarga Piggy en tu Celular',
        description: 'Instala la app en tu pantalla de inicio para acceso rápido y notificaciones.',
        reward_points: 50,
        action_url: '#/descargar',
        action_label: 'Instalar App',
        badge: '📲 PWA',
        badge_type: 'download',
    },
    {
        id: 'm5',
        title: 'Lee tus Términos y Contrato',
        description: 'Conoce los detalles legales y condiciones de tu participación en la granja.',
        reward_points: 20,
        action_url: '#/contrato',
        action_label: 'Ver Contrato',
        badge: '📄 Legal',
        badge_type: 'legal',
    },
    {
        id: 'm6',
        title: 'Explora tu Cuenta Agro',
        description: 'Revisa tu saldo disponible, recargas y retiros en tu panel transaccional.',
        reward_points: 20,
        action_url: '#/granja',
        action_label: 'Ver Cuenta',
        badge: '💰 Wallet',
        badge_type: 'wallet',
    },
    {
        id: 'm7',
        title: 'Compra en locales aliados',
        description: 'Visita los restaurantes y carnicerías aliadas para descuentos exclusivos.',
        reward_points: 40,
        action_url: '#/aliados',
        action_label: 'Ver Aliados',
        badge: '🤝 Aliados',
        badge_type: 'ally',
    },
];

export const MOCK_ALLIES = [
    {
        id: 'ally-001',
        name: 'La Fogata Criolla',
        category: 'Restaurante',
        location: 'Cali — Av. San Joaquín # 14-22',
        address: 'Av. San Joaquín # 14-22',
        phone: '315 487 0448',
        specialty: 'Carnes a la brasa y gastronomía vallecaucana.',
        discount_info: '10% de descuento en platos a la carta presentando tu perfil de Piggy App.',
        benefit: '10% OFF en platos',
        image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        logo_url: null,
    },
    {
        id: 'ally-002',
        name: 'Carnes del Valle Gourmet',
        category: 'Carnicería',
        location: 'Cali — Calle 9 # 38-12',
        address: 'Calle 9 # 38-12',
        phone: '315 487 0448',
        specialty: 'Cortes premium madurados de res y cerdo de origen certificado.',
        discount_info: 'Punto de entrega oficial para redimir tu cerdo al finalizar el ciclo. 5% de descuento en cortes adicionales.',
        benefit: 'Punto de Entrega + 5% OFF',
        image_url: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=600&q=80',
        logo_url: null,
    },
    {
        id: 'ally-003',
        name: 'Distribuidora San Jerónimo',
        category: 'Distribuidor',
        location: 'Palmira — Cra 28 # 45-60',
        address: 'Cra 28 # 45-60',
        phone: '315 487 0448',
        specialty: 'Venta mayorista de cárnicos y embutidos artesanales.',
        discount_info: 'Precios mayoristas desde 10 kg en compras de carne de cerdo para usuarios activos.',
        benefit: 'Precio mayorista desde 10kg',
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        logo_url: null,
    },
    {
        id: 'ally-004',
        name: 'Asador El Porcino',
        category: 'Restaurante',
        location: 'Jamundí — Km 2 Vía Panamericana',
        address: 'Km 2 Vía Panamericana',
        phone: '315 487 0448',
        specialty: 'Especialistas en lechona, costillas BBQ y chicharrón crocante.',
        discount_info: '15% de descuento en consumo los fines de semana mostrando tu app.',
        benefit: '15% OFF Fines de semana',
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        logo_url: null,
    },
];

export const MOCK_NEWS = [
    {
        id: 'news-001',
        title: '¡Nueva camada de Piggies lista para adopción!',
        summary: 'Inicia un nuevo ciclo de engorde con cerdos seleccionados genéticamente de raza Landrace-York.',
        date: '2026-02-15',
        category: 'Granja',
        image_url: 'dist/assets/piggies/stage1/et1-1.jpg',
    },
    {
        id: 'news-002',
        title: 'Nuevo aliado en Cali: Carnes del Valle Gourmet',
        summary: 'Ahora puedes redimir tus productos directamente en la sede sur de Cali.',
        date: '2026-02-10',
        category: 'Aliados',
        image_url: 'dist/assets/piggies/stage2/et2-1.jpg',
    },
    {
        id: 'news-003',
        title: 'Mantenimiento preventivo en instalaciones',
        summary: 'Se completó la instalación de nuevos comederos automáticos y bebederos de nivel constante.',
        date: '2026-01-28',
        category: 'Infraestructura',
        image_url: 'dist/assets/piggies/stage3/et3-1.jpg',
    },
];

export const MOCK_NOTIFICATIONS = [
    {
        id: 'notif-001',
        title: '¡Bienvenido a Piggy App!',
        body: 'Comienza adoptando tu primer Piggy y sigue su crecimiento en tiempo real.',
        date: '2026-01-15T10:05:00Z',
        read: true,
        type: 'system',
    },
    {
        id: 'notif-002',
        title: 'Actualización de peso: Pochito',
        body: 'Pochito ha alcanzado 52.4 kg. ¡Va en excelente ritmo de crecimiento!',
        date: '2026-02-01T14:30:00Z',
        read: false,
        type: 'growth',
    },
    {
        id: 'notif-003',
        title: '¡Pochito cumplió 60 días!',
        body: 'Tu cerdo ha superado el 40% de su ciclo productivo. Revisa su estado en la Granja.',
        date: '2026-02-15T09:00:00Z',
        read: false,
        type: 'growth',
    },
    {
        id: 'notif-004',
        title: 'Oferta especial de fin de mes',
        body: 'Los Piggies con bono de aceleración tienen 5 cupos disponibles en el Mercado.',
        date: '2026-02-20T16:45:00Z',
        read: false,
        type: 'promo',
    },
];

export const MOCK_WALLET_TRANSACTIONS = [
    {
        id: 'tx-001',
        amount: -1000000,
        type: 'debit',
        description: 'Débito: compra de Piggy (Pochito)',
        wallet_type: 'dinero',
        created_at: '2026-01-15T10:00:00Z',
    },
    {
        id: 'tx-002',
        amount: 2230000,
        type: 'recharge',
        description: 'Recarga de Wallet aprobada vía PSE',
        wallet_type: 'dinero',
        created_at: '2026-01-20T15:30:00Z',
    },
    {
        id: 'tx-003',
        amount: 20000,
        type: 'credit',
        description: 'Bono de Bienvenida ($20.000 en Tienda)',
        wallet_type: 'consumo',
        created_at: '2026-01-15T10:05:00Z',
    },
];

/* ─── Format Currency ─── */
export function formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

/* ─── Format Date ─── */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}

/* ─── Days Between ─── */
export function daysBetween(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
