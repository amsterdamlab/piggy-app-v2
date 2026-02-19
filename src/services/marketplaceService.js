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
 * IMPORTANT: current_month is INDEPENDENT of category.
 * Weight IS correlated with month (more months = more weight).
 */
const MOCK_MARKETPLACE_ITEMS = [
    {
        id: 1,
        item_name: 'Manchas',
        description: 'Un cerdo con experiencia en crecimiento. Ya va avanzado en su ciclo de engorde.',
        price: 1000000,
        extra_roi: 0,
        stock: 15,
        category: 'standard',
        current_weight: 65.0,
        current_month: 3,
    },
    {
        id: 2,
        item_name: 'MC Queen',
        description: 'Cerdo veloz en su crecimiento. Alimentación balanceada y buenos resultados.',
        price: 1000000,
        extra_roi: 0.01,
        stock: 10,
        category: 'premium',
        current_weight: 45.0,
        current_month: 2,
    },
    {
        id: 3,
        item_name: 'Rosita',
        description: 'Un cerdo de raza estándar con buen progreso en su ciclo de engorde.',
        price: 1000000,
        extra_roi: 0,
        stock: 8,
        category: 'standard',
        current_weight: 45.0,
        current_month: 2,
    },
    {
        id: 4,
        item_name: 'Milu',
        description: 'Cerdo joven que acaba de iniciar su ciclo. Ideal para quienes desean acompañar todo el proceso.',
        price: 1000000,
        extra_roi: 0,
        stock: 20,
        category: 'standard',
        current_weight: 15.0,
        current_month: 1,
    },
    {
        id: 5,
        item_name: 'Lupe',
        description: 'Cerdo con buen avance en su crecimiento. Alimentación especial y cuidados avanzados.',
        price: 1000000,
        extra_roi: 0.01,
        stock: 10,
        category: 'premium',
        current_weight: 45.0,
        current_month: 2,
    },
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
    const currentMonth = item.current_month || 1;
    const daysElapsed = DAYS_PER_MONTH_ELAPSED[currentMonth] || 0;
    const daysRemaining = Math.max(0, FATTENING_CYCLE_TOTAL_DAYS - daysElapsed);

    return {
        ...item,
        currentMonth: currentMonth,
        daysRemaining,
        cycleTotalDays: FATTENING_CYCLE_TOTAL_DAYS,
        priceFormatted: formatCOP(item.price),
        hasBonus: item.extra_roi > 0,
        bonusText: item.extra_roi > 0 ? `+${(item.extra_roi * 100).toFixed(0)}%` : null,
    };
}
