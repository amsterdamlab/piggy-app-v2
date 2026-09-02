/* ==========================================================================
   PIGGY APP — Gourmet Service
   Manages Piggy Gourmet offers from database.
   Falls back to local defaults when using mock data.
   ========================================================================== */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';

const WHATSAPP_PHONE = '573154870448';

/* ─── Default Offers (Fallback / Mock Mode with Real Image URLs) ─── */

const DEFAULT_OFFERS = [
    {
        id: 'cerdo-entero-especial',
        name: 'Cerdo entero disponible',
        description: 'Compra cerdo en etapa final de engorde o en canal entero o despostado con precios exclusivos de granja por ser parte de Piggy App.',
        original_price: null,
        price: 950000,
        tag: '✨ Exclusivo Granja',
        emoji: '🐷',
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        is_active: true,
        sort_order: 1,
    },
    {
        id: 'combo-parrilla',
        name: 'Combo Parrillero Familiar',
        description: '- 3kg Costilla de cerdo\n- 2kg Chorizo artesanal\n- 1kg Chicharrón',
        original_price: 185000,
        price: 149000,
        tag: '🔥 Más vendido',
        emoji: '🥩',
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        is_active: true,
        sort_order: 2,
    },
    {
        id: 'combo-premium',
        name: 'Combo Premium Mixto',
        description: '- 2kg Lomo de cerdo\n- 2kg Pechuga de pollo\n- 1.5kg Carne de res molida',
        original_price: 210000,
        price: 178000,
        tag: '⭐ Premium',
        emoji: '🍖',
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        is_active: true,
        sort_order: 3,
    },
    {
        id: 'combo-semanal',
        name: 'Combo Semanal Hogar',
        description: '- 2kg Pernil de cerdo\n- 2kg Muslo de pollo\n- 1kg Carne para guisar',
        original_price: 160000,
        price: 135000,
        tag: '💰 Ahorra más',
        emoji: '🐔',
        image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80',
        is_active: true,
        sort_order: 4,
    },
];

/* ─── Public API ─── */

/**
 * Fetch all active gourmet offers from DB (or fallback).
 * Returns offers sorted by `sort_order`.
 */
export async function getGourmetOffers() {
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
            console.warn(' 🐷 GourmetService: Error fetching offers, using defaults', err);
            baseOffers = DEFAULT_OFFERS.filter(o => o.is_active);
        }
    }
    return baseOffers;
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
        console.warn(' 🐷 GourmetService: Error fetching all offers', err);
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
 * Format COP currency strictly as $150.000 without COP suffix.
 */
export function formatGourmetPrice(value) {
    const num = Math.round(Number(value) || 0);
    return '$' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Build structured WhatsApp purchase link with payment methods breakdown.
 */
export function buildGourmetCheckoutWhatsAppLink({ offer, appliedSaldo = 0, appliedBonus = 0, cashDue = 0, deliveryAddress = '' } = {}) {
    const profile = AppState.get('profile');
    const userName = profile?.full_name || 'Usuario';
    const userPhone = profile?.whatsapp || profile?.phone_number || '';
    const refId = 'PGY-CMB-' + Math.floor(100000 + Math.random() * 900000);

    let msg = `🥩 *PIGGY APP — Pedido de Carne en Granja Valle Morales*\n\n` +
        `👤 *Cliente:* ${userName}\n` +
        (userPhone ? `📱 *Teléfono:* ${userPhone}\n` : '') +
        `🎫 *Referencia:* #${refId}\n` +
        `📦 *Combo:* ${offer.name}\n` +
        `💵 *Subtotal:* ${formatGourmetPrice(offer.price)}\n\n` +
        `💳 *DESGLOSE DE PAGO:*\n`;

    if (appliedBonus > 0) {
        msg += `• *Bono de Consumo aplicado:* ${formatGourmetPrice(appliedBonus)}\n`;
    }
    if (appliedSaldo > 0) {
        msg += `• *Saldo Cuenta Agro utilizado:* ${formatGourmetPrice(appliedSaldo)}\n`;
    }
    if (cashDue > 0) {
        msg += `• *Total a pagar contra entrega:* ${formatGourmetPrice(cashDue)} (Efectivo / Transferencia)\n`;
    } else {
        msg += `• *Total a pagar contra entrega:* $0 (Cubierto al 100%)\n`;
    }

    msg += `\n¡Hola! He generado este pedido desde la Tienda de Piggy App. Por favor confírmenme la disponibilidad y tiempo de entrega. ¡Muchas gracias!`;

    return {
        url: `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`,
        refId
    };
}

/**
 * Build WhatsApp link for customized meat orders.
 */
export function buildCustomOrderWhatsAppLink() {
    const profile = AppState.get('profile');
    const userName = profile?.full_name || 'Usuario';
    const msg = `¡Hola! 👋 Mi nombre es *${userName}*, vengo de *Piggy App* y deseo cotizar un *pedido personalizado* de cortes premium y productos cárnicos directamente de *Granja Valle Morales*. ¿Me podrían asesorar por favor?`;
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
}
