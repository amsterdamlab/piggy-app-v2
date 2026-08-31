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
    {\n        id: 'pig-001',
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
        specialty: 'Asados al Carbón',
        location: 'Medellín, Antioquia',
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        description: 'Especialistas en costillas BBQ y bondiola a la parrilla con sabor criollo.',
        benefit: '2x1 en Costillas BBQ los jueves',
        phone: '315 987 6543',
        address: 'Cra 43A # 1-50, El Poblado',
        discount_info: '2x1 en costillas BBQ los jueves',
    },
    {
        id: 'ally-003',
        name: 'Gourmet Pork & Co.',
        category: 'Tienda Gourmet',
        specialty: 'Embutidos Artesanales',
        location: 'Bogotá, Cundinamarca',
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        description: 'Chorizos santarrosanos, jamones curados y tocineta ahumada artesanalmente.',
        benefit: '10% de descuento en compras > $80.000',
        phone: '320 456 7890',
        address: 'Calle 85 # 12-30, Zona T',
        discount_info: '10% de descuento en compras mayores a $80.000',
    },
];

export const MOCK_TIPS = [
    {
        id: 'tip-001',
        title: 'Nutrición porcícola balanceada',
        category: 'nutricion',
        category_label: 'Nutrición',
        read_time: '3 min',
        source: 'Dr. Jaime Restrepo, Zootecnista',
        summary: 'Una dieta rica en aminoácidos y cereales seleccionados optimiza la conversión alimenticia y asegura carne magra.',
        content: 'La alimentación durante la etapa de engorde representa hasta el 70% de los costos de producción. En Granjas Moral utilizamos raciones formuladas a base de maíz amarillo, torta de soya y premezclas vitamínicas que garantizan una ganancia de peso diaria superior a 750 gramos, con excelente conformación de canal.',
        image_url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
        action_url: '#/tienda',
        action_label: 'Ver Productos Relacionados',
    },
    {
        id: 'tip-002',
        title: 'Bienestar animal y su impacto en la canal',
        category: 'manejo',
        category_label: 'Manejo',
        read_time: '4 min',
        source: 'Dra. Camila Torres, MVZ',
        summary: 'Espacio adecuado, ventilación constante y agua fresca reducen el estrés y mejoran la terneza de la carne.',
        content: 'Los cerdos criados en ambientes confortables con densidad adecuada presentan menores niveles de cortisol, lo que se traduce directamente en carne con mejor retención de agua, color óptimo y pH adecuado para maduración.',
        image_url: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80',
        action_url: '#/mercado',
        action_label: 'Explorar Cerdos',
    },
    {
        id: 'tip-003',
        title: 'Plan vacunal y bioseguridad en granja',
        category: 'sanidad',
        category_label: 'Sanidad',
        read_time: '2 min',
        source: 'Equipo Veterinario Piggy App',
        summary: 'La prevención es la clave: protocolos estrictos de desinfección y vacunación garantizan animales 100% sanos.',
        content: 'Nuestro esquema sanitario incluye vacunación contra Micoplasma, Circovirus y Peste Porcina Clásica, monitoreado por el ICA. Esto asegura que tu Piggy crezca libre de enfermedades.',
        image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
        action_url: null,
        action_label: null,
    },
];

export const MOCK_FEED = [
    {
        id: 'feed-001',
        tag: 'Tecnología',
        tag_color: 'primary',
        date: 'Hace 2 horas',
        title: 'Nuevo sistema de monitoreo biométrico en Granjas Moral',
        content: 'Implementamos básculas ópticas con IA que pesan a los cerdos sin contacto físico, reduciendo el estrés en un 95% y mejorando la precisión del seguimiento.',
        action_url: '#/tips',
        action_label: 'Leer Más',
        image_url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'feed-002',
        tag: 'Mercado',
        tag_color: 'gold',
        date: 'Ayer',
        title: 'El consumo de carne de cerdo en Colombia subió 8.2% este trimestre',
        content: 'Porkcolombia reporta cifras récord. La demanda de cortes premium sigue creciendo, beneficiando la rentabilidad de las preventas porcícolas.',
        action_url: '#/mercado',
        action_label: 'Ver Mercado',
        image_url: null,
    },
    {
        id: 'feed-003',
        tag: 'Comunidad',
        tag_color: 'green',
        date: 'Hace 3 días',
        title: '¡Ya somos más de 200 criadores digitales!',
        content: 'Gracias a la confianza de nuestros usuarios, hemos alcanzado un hito importante. La comunidad de Piggy App sigue creciendo con fuerza en todo el país.',
        action_url: '#/aliados',
        action_label: 'Ver Aliados',
        image_url: null,
    },
];

export const MOCK_GOURMET = [
    {
        id: 'gourmet-001',
        title: 'Costillas San Luis con Glaseado de Maracuyá',
        category: 'recetas',
        category_label: 'Recetas de la Granja',
        cook_time: '45 min',
        difficulty: 'Media',
        chef: 'Chef Mateo Arango',
        summary: 'Un corte jugoso con un toque tropical ácido-dulce perfecto para lucirte.',
        ingredients: [
            '1 kg de Costillas San Luis (de tu Piggy)',
            '2 maracuyás frescos (pulpa)',
            '3 cucharadas de panela rallada',
            '2 dientes de ajo picados',
            '1 rama de romero fresco',
            'Sal marina y pimienta al gusto',
        ],
        steps: [
            'Sazona las costillas con sal, pimienta y ajo.',
            'Hornea a 160°C tapado con aluminio durante 35 minutos.',
            'En una sartén, reduce la pulpa de maracuyá con la panela hasta espesar.',
            'Destapa las costillas, baña con el glaseado y dora 10 minutos a 200°C.',
        ],
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        pairing: 'Cerveza artesanal rubia o vino tinto joven.',
    },
    {
        id: 'gourmet-002',
        title: 'Bondiola a la Mostaza Antigua y Cerveza Negra',
        category: 'recetas',
        category_label: 'Recetas de la Granja',
        cook_time: '60 min',
        difficulty: 'Fácil',
        chef: 'Chef Valentina Restrepo',
        summary: 'Carne tierna y jugosa que se deshace con el tenedor.',
        ingredients: [
            '800g de Bondiola en medallones',
            '1 botella de cerveza negra',
            '2 cucharadas de mostaza dijon o antigua',
            '1 cebolla cabezona en julianas',
            'Aceite de oliva, sal y pimienta',
        ],
        steps: [
            'Sella los medallones de bondiola en una sartén caliente 3 min por lado.',
            'Retira la carne y en la misma sartén sofríe la cebolla.',
            'Agrega la mostaza y la cerveza negra, raspando los jugos del fondo.',
            'Regresa los medallones, tapa y cocina a fuego bajo 45 minutos.',
        ],
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        pairing: 'Puré de papa criolla y ensalada verde.',
    },
    {
        id: 'gourmet-003',
        title: 'Punta de Anca de Cerdo en Costra de Hierbas',
        category: 'cortes',
        category_label: 'Guía de Cortes',
        cook_time: '25 min',
        difficulty: 'Fácil',
        chef: 'Parrillero Pepe Morales',
        summary: 'Aprende a preparar el corte estrella a la parrilla como un profesional.',
        ingredients: [
            '1 Punta de Anca de cerdo (aprox 700g)',
            'Tomillo, orégano y romero frescos picados',
            'Sal gruesa parrillera',
            'Aceite vegetal',
        ],
        steps: [
            'Haz cortes en rombo sobre la capa de grasa sin llegar a la carne.',
            'Sazona generosamente con sal gruesa y las hierbas.',
            'Coloca a fuego medio-indirecto del lado de la grasa 15 min.',
            'Voltea y cocina 10 min más hasta alcanzar 65°C internos.',
        ],
        image_url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
        pairing: 'Chimichurri casero y yuca al vapor.',
    },
];

export const MOCK_MISSIONS = [
    {
        id: 'm1',
        title: 'Completa tu registro y acepta t&eacute;rminos',
        reward: 'Desbloquea tu Granja',
        is_completed: true,
        icon: '&#9989;',
        cta: null
    },
    {
        id: 'm2',
        title: 'Adquiere tu primer Piggy',
        reward: 'Inicia tu ciclo de engorde',
        is_completed: true,
        icon: '&#128055;',
        cta: '#/mercado'
    },
    {
        id: 'm3',
        title: 'Visita la secci&oacute;n de Tips de Cuidado',
        reward: 'Aprende sobre nutrici&oacute;n y manejo',
        is_completed: false,
        icon: '&#128218;',
        cta: '#/tips'
    },
    {
        id: 'm4',
        title: 'Explora los Aliados Gastron&oacute;micos',
        reward: 'Descubre descuentos exclusivos',
        is_completed: false,
        icon: '&#127869;&#65039;',
        cta: '#/aliados'
    },
    {
        id: 'm5',
        title: 'Invita a un amigo a unirse a la app',
        reward: 'Gana un bono cuando adquiera su Piggy',
        is_completed: false,
        icon: '&#128101;',
        cta: null
    }
];

export const MOCK_FLASH_MISSIONS = [
    {
        id: 'm6',
        title: 'Aprende c&oacute;mo se alimenta tu Piggy',
        reward: 'Desbloquea Tip de Oro (12h)',
        is_completed: false,
        icon: '&#127806;',
        cta: '#/tips'
    },
    {
        id: 'm7',
        title: 'Prueba la calculadora de engorde',
        reward: 'Calcula tus ingresos en segundos',
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
            stage: 1,
            title: 'Recién Nacido y Lactancia',
            badge: 'Fase Inicial (0-5%)',
            icon: '🍼',
            image: 'assets/piggies/stage1/et1-1.jpg',
            description: `${piggyName} inicia su vida con leche materna y cuidados intensivos en maternidad climatizada.`,
            statusText: 'Lactancia y primeros cuidados en ambiente controlado',
            nextMilestone: 'Inicio de alimento preiniciador en días próximos'
        };
    } else if (p < 10.0) {
        return {
            stage: 2,
            title: 'Pre-Iniciador y Destete',
            badge: 'Destete Temprano (5-10%)',
            icon: '🌾',
            image: 'assets/piggies/stage1/et1-2.jpg',
            description: `Transición nutricional con papillas de alta digestibilidad. ${piggyName} desarrolla su flora intestinal.`,
            statusText: 'Desarrollo digestivo y adaptación a raciones sólidas',
            nextMilestone: 'Consolidación de dieta sólida en precebos'
        };
    } else if (p < 20.0) {
        return {
            stage: 3,
            title: 'Iniciador y Precebos',
            badge: 'Precebos (10-20%)',
            icon: '🌱',
            image: 'assets/piggies/stage1/et1-3.jpg',
            description: `${piggyName} corre activo en corrales amplios con raciones ricas en proteína y minerales.`,
            statusText: 'Crecimiento de estructura ósea y masa muscular inicial',
            nextMilestone: 'Paso a corrales de crecimiento continuo'
        };
    } else if (p < 30.0) {
        return {
            stage: 4,
            title: 'Crecimiento Temprano',
            badge: 'Crecimiento I (20-30%)',
            icon: '⚡',
            image: 'assets/piggies/stage1/et1-4.jpg',
            description: `Apetito vigoroso y ganancia acelerada. ${piggyName} fortalece su sistema inmune y tono muscular.`,
            statusText: 'Desarrollo muscular activo con balance nutricional óptimo',
            nextMilestone: 'Inicio de la fase de engorde intermedio'
        };
    } else if (p < 45.0) {
        return {
            stage: 5,
            title: 'Desarrollo Intermedio',
            badge: 'Crecimiento II (30-45%)',
            icon: '🐖',
            image: 'assets/piggies/stage2/et2-1.jpg',
            description: `Estructura corporal robusta. Dieta optimizada con cereales seleccionados y monitoreo veterinario.`,
            statusText: 'Conformación armónica y óptima conversión alimenticia',
            nextMilestone: 'Entrada en fase de engorde avanzado'
        };
    } else if (p < 60.0) {
        return {
            stage: 6,
            title: 'Engorde Progresivo',
            badge: 'Engorde I (45-60%)',
            icon: '💪',
            image: 'assets/piggies/stage2/et2-2.jpg',
            description: `${piggyName} supera la mitad del ciclo. Excelente balance entre masa magra y energía sostenida.`,
            statusText: 'Ganancia diaria superior a 750g con monitoreo biométrico',
            nextMilestone: 'Desarrollo de los cortes de mayor valor comercial'
        };
    } else if (p < 75.0) {
        return {
            stage: 7,
            title: 'Engorde Avanzado',
            badge: 'Engorde II (60-75%)',
            icon: '🔥',
            image: 'assets/piggies/stage2/et2-3.jpg',
            description: `Desarrollo pleno de lomos y jamones. ${piggyName} exhibe el vigor característico de Granjas Moral.`,
            statusText: 'Desarrollo muscular pleno en lomo, costilla y pierna',
            nextMilestone: 'Afinamiento de dieta para marmoleo óptimo'
        };
    } else if (p < 90.0) {
        return {
            stage: 8,
            title: 'Finalización Temprana',
            badge: 'Finalización I (75-90%)',
            icon: '⭐',
            image: 'assets/piggies/stage3/et3-1.jpg',
            description: `Ajuste de raciones para calidad de carne premium. ${piggyName} entra en la recta final de maduración.`,
            statusText: 'Marmoleo intramuscular y perfil de ácidos grasos balanceado',
            nextMilestone: 'Preparación para el peso comercial objetivo'
        };
    } else if (p < 100.0) {
        return {
            stage: 9,
            title: 'Maduración Final',
            badge: 'Cosecha Inminente (90-99%)',
            icon: '🏆',
            image: 'assets/piggies/stage3/et3-2.jpg',
            description: `${piggyName} ha alcanzado su peso ideal de mercado. La cosecha técnica se aproxima en pocos días.`,
            statusText: 'Peso comercial completo listo para procesamiento técnico',
            nextMilestone: 'Cierre de ciclo y liquidación de rendimientos'
        };
    } else {
        return {
            stage: 10,
            title: 'Ciclo Completado',
            badge: '¡Cosechado! (100%)',
            icon: '🎉',
            image: 'assets/piggies/stage3/et3-3.jpg',
            description: `¡Felicitaciones! El ciclo de ${piggyName} finalizó exitosamente con la más alta calificación de canal.`,
            statusText: 'Canal clasificada con máxima puntuación de rendimiento',
            nextMilestone: 'Fondos disponibles en tu Wallet o redimibles en Tienda'
        };
    }
}
