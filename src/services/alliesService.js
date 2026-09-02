/* ============================================
   PIGGY APP — Allies Service
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_ALLIES } from './mockData.js';

/**
 * Fetch all allies, optionally filtered by category.
 */
export async function getAllies(category = null) {
        const sortAllies = (list) => {
            return [...list].sort((a, b) => {
                const orderA = a.display_order != null && a.display_order !== '' ? Number(a.display_order) : Infinity;
                const orderB = b.display_order != null && b.display_order !== '' ? Number(b.display_order) : Infinity;
                if (orderA !== orderB) return orderA - orderB;
                return (a.name || '').localeCompare(b.name || '');
            });
        };

        if (isUsingMockData()) {
            const allies = sortAllies(MOCK_ALLIES);
            return category
                ? allies.filter((a) => a.category === category)
                : allies;
        }

        try {
            const client = getClient();
            if (!client) {
                const allies = sortAllies(MOCK_ALLIES);
                return category ? allies.filter((a) => a.category === category) : allies;
            }

            let query = client
                .from('allies')
                .select('*')
                .order('display_order', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            if (error || !data || data.length === 0) {
                console.warn('Allies from DB not available or empty, using default allies:', error);
                const allies = sortAllies(MOCK_ALLIES);
                return category ? allies.filter((a) => a.category === category) : allies;
            }
            return data;
        } catch (err) {
            console.warn('Error fetching allies, using fallback:', err);
            const allies = sortAllies(MOCK_ALLIES);
            return category ? allies.filter((a) => a.category === category) : allies;
        }
}

/**
 * Get unique categories from allies.
 */
export async function getAllyCategories() {
    const allies = await getAllies();
    const categories = [...new Set(allies.map((a) => a.category))];
    return categories.filter(Boolean);
}
