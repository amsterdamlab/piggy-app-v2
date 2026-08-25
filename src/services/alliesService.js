/* ============================================
   PIGGY APP — Allies Service
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_ALLIES } from './mockData.js';

/**
 * Fetch all allies, optionally filtered by category.
 */
export async function getAllies(category = null) {
    if (isUsingMockData()) {
        const allies = [...MOCK_ALLIES];
        return category
            ? allies.filter((a) => a.category === category)
            : allies;
    }

    try {
        const client = getClient();
        if (!client) {
            const allies = [...MOCK_ALLIES];
            return category ? allies.filter((a) => a.category === category) : allies;
        }

        let query = client.from('allies').select('*').order('name');

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
            console.warn('Allies from DB not available or empty, using default allies:', error);
            const allies = [...MOCK_ALLIES];
            return category ? allies.filter((a) => a.category === category) : allies;
        }
        return data;
    } catch (err) {
        console.warn('Error fetching allies, using fallback:', err);
        const allies = [...MOCK_ALLIES];
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
