/* ============================================
   PIGGY APP — Marketplace Service
   Handles fetching marketplace items
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { formatCOP } from './mockData.js';

/**
 * Mock marketplace data for development.
 * Categories: standard, premium (+1%), silver (+2%), gold (+3%)
 */
const MOCK_MARKETPLACE_ITEMS = [
    {
        id: 1,
        item_name: 'Piggy Clásico',
        description: 'Un cerdo de raza estándar, ideal para iniciarte en el mundo de la inversión agropecuaria.',
        price: 1000000,
        extra_roi: 0,
        stock: 15,
        category: 'standard',
        current_weight: 15.0,
    },
    {
        id: 2,
        item_name: 'Piggy Premium',
        description: 'Cerdo de raza premium con alimentación especial. Genera un bono extra en tu retorno.',
        price: 1000000,
        extra_roi: 0.01,
        stock: 10,
        category: 'premium',
        current_weight: 18.0,
    },
    {
        id: 3,
        item_name: 'Piggy Silver',
        description: 'Cerdo de genética selecta con cuidados avanzados. Mayor rendimiento garantizado.',
        price: 1000000,
        extra_roi: 0.02,
        stock: 8,
        category: 'silver',
        current_weight: 22.0,
    },
    {
        id: 4,
        item_name: 'Piggy Gold',
        description: 'La joya de la granja. Genética superior, alimentación orgánica y retorno máximo.',
        price: 1000000,
        extra_roi: 0.03,
        stock: 5,
        category: 'gold',
        current_weight: 28.0,
    },
    {
        id: 5,
        item_name: 'Piggy Starter',
        description: 'Perfecto para quienes dan su primer paso. Cerdo joven listo para crecer contigo.',
        price: 1000000,
        extra_roi: 0,
        stock: 20,
        category: 'standard',
        current_weight: 12.0,
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
    return {
        ...item,
        priceFormatted: formatCOP(item.price),
        hasBonus: item.extra_roi > 0,
        bonusText: item.extra_roi > 0 ? `+${(item.extra_roi * 100).toFixed(0)}%` : null,
    };
}
