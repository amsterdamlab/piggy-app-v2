/* ============================================
   PIGGY APP — Marketplace Service
   Data Layer for Marketplace Items and Direct Purchases
   ============================================ */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { MOCK_MARKETPLACE, formatCOP } from './mockData.js';
import { AppState } from '../state.js';

/**
 * Get all available marketplace items.
 * If Supabase is connected, fetches from `marketplace_items` table.
 * Otherwise, returns rich local mock items.
 */
export async function getMarketplaceItems() {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase
                .from('marketplace_items')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (error) throw error;
            if (data && data.length > 0) {
                return data.map(normalizeMarketplaceItem);
            }
        } catch (err) {
            console.warn('Could not fetch marketplace from Supabase, fallback to local data:', err);
        }
    }

    // Local fallback
    return MOCK_MARKETPLACE.map(normalizeMarketplaceItem);
}

/**
 * Get a single marketplace item by ID.
 */
export async function getMarketplaceItemById(itemId) {
    const items = await getMarketplaceItems();
    return items.find(item => item.id === itemId) || null;
}

/**
 * Normalize marketplace item object ensuring all expected properties exist.
 */
export function normalizeMarketplaceItem(item) {
    const itemName = item.item_name || item.name || item.piggy_name || 'Piggy Estandar';
    const price = Number(item.price || item.investment_amount || item.amount || item.precio || 1000000);

    // Extract days advanced
    let daysAdvanced = item.days_advanced ?? item.daysAdvanced;
    if (daysAdvanced === undefined || daysAdvanced === null) {
        const daysMatch = itemName.match(/(\d+)\s*d[ií]as/i);
        if (daysMatch) {
            daysAdvanced = Number(daysMatch[1]);
        } else {
            const monthMatch = itemName.match(/(\d+)\s*Mes(es)?/i);
            if (monthMatch) {
                daysAdvanced = (Number(monthMatch[1]) - 1) * 30;
            } else {
                daysAdvanced = 0;
            }
        }
    }

    const currentMonth = item.current_month || item.currentMonth || (daysAdvanced >= 90 ? 4 : daysAdvanced >= 60 ? 3 : daysAdvanced >= 30 ? 2 : 1);
    const daysRemaining = item.days_remaining || item.daysRemaining || Math.max(1, 144 - daysAdvanced);

    return {
        id: item.id || `item-${Math.random().toString(36).substr(2, 9)}`,
        item_name: itemName,
        name: itemName,
        description: item.description || 'Cerdo con excelente genética y rendimiento garantizado.',
        price: price,
        investment_amount: price,
        priceFormatted: formatCOP(price),
        extra_roi: Number(item.extra_roi || item.extraRoi || 0),
        stock: Number(item.stock !== undefined ? item.stock : 10),
        category: (item.category || 'estandar').toLowerCase(),
        daysAdvanced: daysAdvanced,
        daysRemaining: daysRemaining,
        currentMonth: currentMonth,
        current_weight: Number(item.current_weight || (daysAdvanced >= 90 ? 55.4 : daysAdvanced >= 60 ? 39.0 : daysAdvanced >= 30 ? 22.5 : 6.0)),
        image_url: item.image_url || null,
        is_active: item.is_active !== undefined ? item.is_active : true,
    };
}
