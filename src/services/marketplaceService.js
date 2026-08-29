/* ============================================
   PIGGY APP — Marketplace Service
   Handles available items, purchase reservations,
   and real-time stock sync with Supabase
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_MARKETPLACE_ITEMS } from './mockData.js';

/**
 * Fetch all available marketplace items.
 * Ordered by sort_order ascending.
 * @returns {Promise<Array>} List of marketplace products
 */
export async function getMarketplaceItems() {
    if (isUsingMockData()) {
        return MOCK_MARKETPLACE_ITEMS;
    }

    const client = getClient();
    const { data, error } = await client
        .from('marketplace_items')
        .select('*')
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.warn('Error fetching marketplace items:', error);
        return MOCK_MARKETPLACE_ITEMS;
    }

    return (data || []).map(normalizeItem);
}

/**
 * Fetch a single marketplace item by ID.
 * @param {string} id - The item ID
 * @returns {Promise<Object|null>}
 */
export async function getMarketplaceItemById(id) {
    if (isUsingMockData()) {
        return MOCK_MARKETPLACE_ITEMS.find((i) => i.id === id) || null;
    }

    const client = getClient();
    const { data, error } = await client
        .from('marketplace_items')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.warn('Error fetching marketplace item by id:', error);
        return null;
    }

    return normalizeItem(data);
}

/**
 * Update stock for an item after a purchase.
 * Decrements stock by 1 in Supabase.
 * @param {string} itemId - The item ID
 * @returns {Promise<boolean>}
 */
export async function updateItemStock(itemId) {
    if (isUsingMockData()) {
        const item = MOCK_MARKETPLACE_ITEMS.find((i) => i.id === itemId);
        if (item && item.stock > 0) {
            item.stock -= 1;
            return true;
        }
        return false;
    }

    const client = getClient();

    // Call RPC or atomic decrement
    const { data: item, error: fetchError } = await client
        .from('marketplace_items')
        .select('stock')
        .eq('id', itemId)
        .single();

    if (fetchError || !item || item.stock <= 0) return false;

    const newStock = item.stock - 1;
    const { error: updateError } = await client
        .from('marketplace_items')
        .update({
            stock: newStock,
            is_available: newStock > 0,
        })
        .eq('id', itemId);

    return !updateError;
}

/**
 * Calculate marketplace summary stats.
 * @param {Array} items - List of marketplace items
 * @returns {Object}
 */
export function getMarketplaceStats(items) {
    const totalAvailable = items.reduce((sum, i) => sum + (i.stock || 0), 0);
    const minPrice = items.length > 0 ? Math.min(...items.map((i) => i.price)) : 0;
    const maxRoi = items.length > 0 ? Math.max(...items.map((i) => i.totalRoi)) : 0.08;

    return {
        totalAvailable,
        minPrice,
        maxRoi,
        itemCount: items.length,
    };
}

/**
 * Normalize DB item record to app format.
 * Dynamically computes days_remaining, weight and stage based on current_month.
 * @param {Object} dbItem - Raw DB row
 * @returns {Object} Normalized item
 */
function normalizeItem(dbItem) {
    const CYCLE_TOTAL_DAYS = 144;
    const currentMonth = dbItem.current_month || 1;
    const daysElapsed = dbItem.days_advanced || Math.max(0, (currentMonth - 1) * 30);
    const daysRemaining = dbItem.days_remaining || Math.max(1, CYCLE_TOTAL_DAYS - daysElapsed);
    const baseROI = 0.08; // 8% base for 1 piggy
    const extraRoi = parseFloat(dbItem.extra_roi) || 0;
    const totalRoi = baseROI + extraRoi;
    const price = parseFloat(dbItem.price) || 250000;
    const projectedReturn = price * (1 + totalRoi);

    // Derive stage from current_month (1=destete, 2-3=crecimiento, 4-5=engorde)
    const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
    const defaultPhotoNum = dbItem.id ? (((Number(dbItem.id) - 1) % 5) + 1) : 1;
    const imageUrl = dbItem.image_url || `assets/piggies/stage${stage}/et${stage}-${defaultPhotoNum}.jpg`;

    // Dynamic weight calculation based on days elapsed
    const progress = Math.min(100, Math.round((daysElapsed / CYCLE_TOTAL_DAYS) * 100));
    const dynamicWeight = Math.round((6 + (120 - 6) * (progress / 100)) * 10) / 10;

    return {
        id: String(dbItem.id),
        name: dbItem.name || 'Piggy en Adopción',
        breed: dbItem.breed || 'Landrace x Pietrain',
        description: dbItem.description || '',
        price,
        currentWeight: dbItem.current_weight || dynamicWeight,
        targetWeight: dbItem.target_weight || 120.0,
        daysRemaining,
        daysElapsed,
        cycleTotalDays: CYCLE_TOTAL_DAYS,
        currentMonth,
        progress,
        stock: dbItem.stock || 0,
        isAvailable: dbItem.is_available && (dbItem.stock > 0),
        category: dbItem.category || 'estandar',
        badge: dbItem.badge || getCategoryBadge(dbItem.category),
        extraRoi,
        totalRoi,
        projectedReturn,
        projectedGain: projectedReturn - price,
        imageUrl,
        stage,
        feedType: dbItem.feed_type || 'Concentrado Especializado',
        location: dbItem.location || 'Granja Valle Morales · Galpón 2',
        insuranceIncluded: dbItem.insurance_included !== false,
        vaccinesComplete: dbItem.vaccines_complete !== false,
        sortOrder: dbItem.sort_order || 0,
        isPopular: dbItem.is_popular || false,
        isNew: dbItem.is_new || false,
        isOffer: dbItem.is_offer || false,
    };
}

/**
 * Get display badge for a category.
 */
function getCategoryBadge(category) {
    switch (category) {
        case 'dorado':
            return '🥇 Dorado';
        case 'plata':
            return '🥈 Plata';
        case 'avanzado':
            return '⚡ Avanzado';
        case 'oferta':
            return '🔥 Oferta';
        default:
            return null;
    }
}
