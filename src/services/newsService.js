/* ============================================
   PIGGY APP — News Service
   Handles fetching the billboard active slides
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';

const MOCK_SLIDES = [
    {
        id: 'mock-slide-1',
        image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
        action_url: '#/gourmet',
        sort_order: 1
    },
    {
        id: 'mock-slide-2',
        image_url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&q=80',
        action_url: '#/mercado',
        sort_order: 2
    },
    {
        id: 'mock-slide-3',
        image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
        action_url: 'https://images.unsplash.com',
        sort_order: 3
    }
];

/**
 * Fetch all active news billboard slides.
 * Ordered by sort_order ASC.
 * @returns {Promise<Array<{id: string, image_url: string, action_url: string|null, sort_order: number}>>}
 */
export async function getActiveNewsSlides() {
    if (isUsingMockData()) {
        return MOCK_SLIDES;
    }

    const client = getClient();
    if (!client) {
        return MOCK_SLIDES;
    }

    try {
        const { data, error } = await client
            .from('news_billboard')
            .select('id, image_url, action_url, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.warn('⚠️ getActiveNewsSlides database read error, falling back to mock slides:', error.message);
            return MOCK_SLIDES;
        }

        return data && data.length > 0 ? data : MOCK_SLIDES;
    } catch (err) {
        console.warn('⚠️ getActiveNewsSlides error:', err);
        return MOCK_SLIDES;
    }
}
