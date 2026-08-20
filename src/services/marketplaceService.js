/* ============================================
   PIGGY APP — Marketplace Service
   Handles fetching marketplace items
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { formatCOP } from './mockData.js';

/**
 * Total fattening cycle in days (~4 months 3 weeks = 143 days).
 * This matches the DB default: NOW() + INTERVAL '4 months 3 weeks'.
 */
const FATTENING_CYCLE_TOTAL_DAYS = 143;

/**
 * Approximate days elapsed per month of the fattening cycle.
 * Month 1 ≈ 0-30 days, Month 2 ≈ 31-60, Month 3 ≈ 61-90, Month 4 ≈ 91-120, Month 5 ≈ 121-143.
 */
const DAYS_PER_MONTH_ELAPSED = {
    1: 0,
    2: 30,
    3: 60,
    4: 90,
    5: 120,
};

/**
 * Mock marketplace data for development.
 * current_month: which month of the fattening cycle the piggy is in (1-5).
 * Categories: standard, premium (+1%), silver (+2%), gold (+3%)
 */
const MOCK_MARKETPLACE_ITEMS = [
    {
        id: 1,
        item_name: 'Piggy Estándar',
        description: 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.',
        price: 1000000,
        extra_roi: 0.00,
        stock: 25,
        category: 'standard',
        current_weight: 15.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-1.jpg',
    },
    {
        id: 2,
        item_name: 'Piggy Advanced (Mes 2)',
        description: 'Cerdo en etapa de engorde avanzada. Compra al mismo precio de siempre pero ahorra tiempo.',
        price: 1000000,
        extra_roi: 0.00,
        stock: 15,
        category: 'advanced',
        current_weight: 45.0,
        current_month: 2,
        image_url: 'assets/piggies/stage2/et2-1.jpg',
    },
    {
        id: 3,
        item_name: 'Piggy Advanced (Mes 3)',
        description: 'Cerdo con máximo periodo de avance en su ciclo de engorde (3 meses).',
        price: 1000000,
        extra_roi: 0.00,
        stock: 10,
        category: 'advanced',
        current_weight: 65.0,
        current_month: 3,
        image_url: 'assets/piggies/stage2/et2-2.jpg',
    },
    {
        id: 4,
        item_name: 'Piggy Silver',
        description: 'Comercializado en un mercado plus con un +1% de margen comercial adicional.',
        price: 1000000,
        extra_roi: 0.01,
        stock: 20,
        category: 'silver',
        current_weight: 15.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-2.jpg',
    },
    {
        id: 5,
        item_name: 'Piggy Gold',
        description: 'Comercializado en un mercado plus premium con un +2% de margen comercial adicional.',
        price: 1000000,
        extra_roi: 0.02,
        stock: 12,
        category: 'gold',
        current_weight: 15.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-3.jpg',
    },
    {
        id: 6,
        item_name: 'Piggy Premium',
        description: 'Comercializado en un mercado plus exclusivo con un +3% de margen comercial adicional.',
        price: 1000000,
        extra_roi: 0.03,
        stock: 8,
        category: 'premium',
        current_weight: 15.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-4.jpg',
    }
];

/**
 * Fetch all marketplace items.
 */
export async function getMarketplaceItems() {
    if (isUsingMockData()) {
        return MOCK_MARKETPLACE_ITEMS.map(enrichItem);
    }

    const client = getClient();
    const { data, error } = await client
        .from('marketplace')
        .select('*')
        .gt('stock', 0)
        .order('price', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(enrichItem);
}

/**
 * Enrich a marketplace item with display fields.
 */
function enrichItem(item) {
    // Clamp to 1-5: the fattening cycle is ~143 days (~5 months max)
    const currentMonth = Math.min(5, Math.max(1, item.current_month || 1));
    const daysElapsed = DAYS_PER_MONTH_ELAPSED[currentMonth] || 0;
    const daysRemaining = Math.max(0, FATTENING_CYCLE_TOTAL_DAYS - daysElapsed);

    // Usa el precio configurado en la tabla marketplace de Supabase (con fallback si estuviera vacío)
    const defaultFallback = (item.category === 'advanced60' || item.category === 'advanced30' || (item.category === 'advanced' && currentMonth === 3)) ? 1300000 : 1000000;
    const price = item.price ?? defaultFallback;

    // Stable, deterministic image URL based on item configuration / id / month
    const defaultPhotoMap = {
        1: 'assets/piggies/stage1/et1-1.jpg',
        2: 'assets/piggies/stage2/et2-1.jpg',
        3: 'assets/piggies/stage2/et2-2.jpg',
        4: 'assets/piggies/stage1/et1-2.jpg',
        5: 'assets/piggies/stage1/et1-3.jpg',
        6: 'assets/piggies/stage1/et1-4.jpg',
    };
    const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
    const fallbackPhotoNum = item.id ? (((Number(item.id) - 1) % 5) + 1) : 1;
    const resolvedImageUrl = item.image_url || defaultPhotoMap[item.id] || `assets/piggies/stage${stage}/et${stage}-${fallbackPhotoNum}.jpg`;

    return {
        ...item,
        price: price,
        currentMonth: currentMonth,
        daysRemaining,
        cycleTotalDays: FATTENING_CYCLE_TOTAL_DAYS,
        priceFormatted: formatCOP(price),
        hasBonus: item.extra_roi > 0,
        bonusText: item.extra_roi > 0 ? `+${(item.extra_roi * 100).toFixed(0)}%` : null,
        image_url: resolvedImageUrl,
    };
}
