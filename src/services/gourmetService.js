/* ============================================
   PIGGY APP — Gourmet Service
   Manages Piggy Gourmet offers from database.
   Falls back to local defaults when using mock data.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';

const WHATSAPP_PHONE = '573154870448';

/* ─── Default Offers (Fallback / Mock Mode) ─── */

const DEFAULT_OFFERS = [
    {
        id: 'cerdo-entero-especial',
        name: 'Cerdo entero disponible',
        description: 'Compra cerdo en etapa final de engorde o en canal entero o despostado con precios exclusivos de granja por ser parte de Piggy App.',
        original_price: null,
        price: 950000,
        tag: '✨ Exclusivo Granja',
        emoji: '🐷',
        is_active: true,
        sort_order: 0,
    },
    {
        id: 'combo-parrilla',
        name: 'Combo Parrillero Familiar',
        description: '3kg Costilla de cerdo + 2kg Chorizo artesanal + 1kg Chicharrón',
        original_price: 185000,
        price: 149000,
        tag: '🔥 Más vendido',
        emoji: '🥩',
        is_active: true,
        sort_order: 1,
    },
    {
        id: 'combo-premium',
        name: 'Combo Premium Mixto',
        description: '2kg Lomo de cerdo + 2kg Pechuga de pollo + 1.5kg Carne de res molida',
        original_price: 210000,
        price: 178000,
        tag: '⭐ Premium',
        emoji: '🍖',
        is_active: true,
        sort_order: 2,
    },
    {
        id: 'combo-semanal',
        name: 'Combo Semanal Hogar',
        description: '2kg Pernil de cerdo + 2kg Muslo de pollo + 1kg Carne para guisar',
        original_price: 160000,
        price: 135000,
        tag: '💰 Ahorra más',
        emoji: '🐔',
        is_active: true,
        sort_order: 3,
    },
];

/* ─── Public API ─── */

/**
 * Fetch all active gourmet offers from DB (or fallback).
 * Returns offers sorted by `sort_order`.
 */
export async function getGourmetOffers() {
    const specialOffer = {
        id: 'cerdo-entero-especial',
        name: 'Cerdo entero disponible',
        description: 'Compra cerdo en etapa final de engorde o en canal entero o despostado con precios exclusivos de granja por ser parte de Piggy App.',
        original_price: null,
        price: 950000,
        tag: '✨ Exclusivo Granja',
        emoji: '🐷',
        is_active: true,
        sort_order: 0,
    };

    let baseOffers = [];
    if (isUsingMockData()) {
        baseOffers = DEFAULT_OFFERS.filter(o => o.is_active);
    } else {
        try {
            const client = getClient();
            const { data, error } = await client
                .from('gourmet_offers')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            baseOffers = data && data.length > 0 ? data : DEFAULT_OFFERS.filter(o => o.is_active);
        } catch (err) {
            console.warn('🐷 GourmetService: Error fetching offers, using defaults', err);
            baseOffers = DEFAULT_OFFERS.filter(o => o.is_active);
        }
    }

    // Filter out our special offer if it already exists in baseOffers (to prevent duplicates if it's in the DB)
    const hasSpecialInDb = baseOffers.some(o => o.id === specialOffer.id || o.name === specialOffer.name);
    if (hasSpecialInDb) {
        return baseOffers;
    } else {
        return [specialOffer, ...baseOffers.filter(o => o.id !== specialOffer.id)];
    }
}

/**
 * Fetch ALL gourmet offers (including inactive) for admin.
 */
export async function getAllGourmetOffers() {
    if (isUsingMockData()) {
        return [...DEFAULT_OFFERS];
    }

    try {
        const client = getClient();
        const { data, error } = await client
            .from('gourmet_offers')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data || DEFAULT_OFFERS;
    } catch (err) {
        console.warn('🐷 GourmetService: Error fetching all offers', err);
        return DEFAULT_OFFERS;
    }
}

/**
 * Create a new gourmet offer.
 */
export async function createGourmetOffer(offerData) {
    if (isUsingMockData()) {
        const newOffer = { ...offerData, id: `offer-${Date.now()}` };
        DEFAULT_OFFERS.push(newOffer);
        return newOffer;
    }

    const client = getClient();
    const { data, error } = await client
        .from('gourmet_offers')
        .insert(offerData)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Update an existing gourmet offer by ID.
 */
export async function updateGourmetOffer(offerId, updates) {
    if (isUsingMockData()) {
        const index = DEFAULT_OFFERS.findIndex(o => o.id === offerId);
        if (index === -1) throw new Error('Offer not found');
        DEFAULT_OFFERS[index] = { ...DEFAULT_OFFERS[index], ...updates };
        return DEFAULT_OFFERS[index];
    }

    const client = getClient();
    const { data, error } = await client
        .from('gourmet_offers')
        .update(updates)
        .eq('id', offerId)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

/**
 * Toggle the `is_active` status of an offer.
 */
export async function toggleGourmetOffer(offerId, isActive) {
    return updateGourmetOffer(offerId, { is_active: isActive });
}

/**
 * Delete a gourmet offer.
 */
export async function deleteGourmetOffer(offerId) {
    if (isUsingMockData()) {
        const index = DEFAULT_OFFERS.findIndex(o => o.id === offerId);
        if (index !== -1) DEFAULT_OFFERS.splice(index, 1);
        return true;
    }

    const client = getClient();
    const { error } = await client
        .from('gourmet_offers')
        .delete()
        .eq('id', offerId);

    if (error) throw new Error(error.message);
    return true;
}

/* ─── Helpers ─── */

/**
 * Format COP currency for gourmet prices.
 */
export function formatGourmetPrice(value) {
    return '$' + value.toLocaleString('es-CO');
}

/**
 * Build WhatsApp purchase link for a gourmet offer.
 */
export function buildGourmetWhatsAppLink(offer) {
    const profile = AppState.get('profile');
    const userName = profile?.full_name || 'Usuario';
    const message = encodeURIComponent(
        `¡Hola equipo Piggy! 🐷 Soy ${userName}.\n\nQuiero pedir el *${offer.name}* por ${formatGourmetPrice(offer.price)}.\n\n${offer.description}\n\n¡Gracias!`
    );
    return `https://wa.me/${WHATSAPP_PHONE}?text=${message}`;
}
