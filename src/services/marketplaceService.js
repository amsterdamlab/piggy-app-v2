/* ============================================
   PIGGY APP — Marketplace Service
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_MARKETPLACE, formatCOP } from './mockData.js';

/**
 * Fetch all marketplace items.
 */
export async function getMarketplaceItems() {
    if (isUsingMockData()) {
        return MOCK_MARKETPLACE.map(enrichItem);
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
    return {
        ...item,
        priceFormatted: formatCOP(item.price),
        hasBonus: item.extra_roi > 0,
        bonusText: item.extra_roi > 0 ? `+${(item.extra_roi * 100).toFixed(0)}%` : null,
    };
}
