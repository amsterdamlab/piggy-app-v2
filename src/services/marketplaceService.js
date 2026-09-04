/* ============================================
   PIGGY APP — Marketplace Service
   Handles fetching marketplace items
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { formatCOP } from './mockData.js';

/**
 * Total fattening cycle in days (144 days ~ 4.8 months).
 */
const FATTENING_CYCLE_TOTAL_DAYS = 144;

/**
 * Approximate days elapsed per month of the fattening cycle.
 */
const DAYS_PER_MONTH_ELAPSED = {
    1: 0,
    2: 30,
    3: 60,
    4: 90,
    5: 120,
};

/**
 * Category metadata definitions for days, ROI and display labels.
 */
const CATEGORY_MAP = {
    estandar:    { label: 'Estandar', extraRoi: 0.00, daysAdvanced: 0,  defaultWeight: 6.0 },
    standard:    { label: 'Estandar', extraRoi: 0.00, daysAdvanced: 0,  defaultWeight: 6.0 },
    plus:        { label: 'Plus',     extraRoi: 0.01, daysAdvanced: 0,  defaultWeight: 6.0 },
    silver:      { label: 'Plus',     extraRoi: 0.01, daysAdvanced: 0,  defaultWeight: 6.0 },
    dorado:      { label: 'Dorado',   extraRoi: 0.02, daysAdvanced: 0,  defaultWeight: 6.0 },
    gold:        { label: 'Dorado',   extraRoi: 0.02, daysAdvanced: 0,  defaultWeight: 6.0 },
    premium:     { label: 'Premium',  extraRoi: 0.03, daysAdvanced: 0,  defaultWeight: 6.0 },
    avanzado30:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 22.5 },
    advanced30:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 22.5 },
    avanzado45:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 45, defaultWeight: 30.7 },
    advanced45:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 45, defaultWeight: 30.7 },
    avanzado60:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 60, defaultWeight: 39.0 },
    advanced60:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 60, defaultWeight: 39.0 },
    avanzado75:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 75, defaultWeight: 47.1 },
    advanced75:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 75, defaultWeight: 47.1 },
    avanzado90:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 90, defaultWeight: 55.4 },
    advanced90:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 90, defaultWeight: 55.4 },
    avanzado:    { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 22.5 },
    advanced:    { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 22.5 },
};

/**
 * Mock marketplace data for development.
 */
const MOCK_MARKETPLACE_ITEMS = [
    {
        id: 1,
        item_name: 'Piggy Estandar',
        description: 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.',
        price: 1000000,
        extra_roi: 0.00,
        stock: 25,
        category: 'estandar',
        days_advanced: 0,
        current_weight: 6.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-1.jpg',
    },
    {
        id: 2,
        item_name: 'Piggy Avanzado (30 días)',
        description: 'Cerdo en etapa de engorde avanzada. Ahorra 30 días de espera.',
        price: 1000000,
        extra_roi: 0.00,
        stock: 15,
        category: 'avanzado30',
        days_advanced: 30,
        current_weight: 22.5,
        current_month: 2,
        image_url: 'assets/piggies/stage2/et2-1.jpg',
    },
    {
        id: 3,
        item_name: 'Piggy Avanzado (60 días)',
        description: 'Cerdo con avance de 60 días en su ciclo de engorde.',
        price: 1000000,
        extra_roi: 0.00,
        stock: 10,
        category: 'avanzado60',
        days_advanced: 60,
        current_weight: 39.0,
        current_month: 3,
        image_url: 'assets/piggies/stage2/et2-2.jpg',
    },
    {
        id: 4,
        item_name: 'Piggy Plus',
        description: 'Comercializado en un mercado plus con un +1% de margen comercial adicional.',
        price: 1000000,
        extra_roi: 0.01,
        stock: 20,
        category: 'plus',
        days_advanced: 0,
        current_weight: 6.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-2.jpg',
    },
    {
        id: 5,
        item_name: 'Piggy Dorado',
        description: 'Comercializado en un mercado plus premium con un +2% de margen comercial adicional.',
        price: 1000000,
        extra_roi: 0.02,
        stock: 12,
        category: 'dorado',
        days_advanced: 0,
        current_weight: 6.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-3.jpg',
    },
    {
        id: 6,
        item_name: 'Piggy Premium',
        description: 'Comercializado en un mercado plus exclusivo con un +3% de margen comercial adicional.',
        price: 1000000,
        extra_roi: 0.03,
        stock: 8,
        category: 'premium',
        days_advanced: 0,
        current_weight: 6.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-4.jpg',
    }
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
 * Resolves the month (1-5) of a marketplace item using all available metadata.
 */
function resolveItemMonth(item) {
    if (item.current_month && Number(item.current_month) > 0) return Number(item.current_month);
    if (item.currentMonth && Number(item.currentMonth) > 0) return Number(item.currentMonth);

    const name = String(item.piggy_name || item.item_name || item.name || '');
    const monthMatch = name.match(/(\d+)\s*Mes(es)?/i);
    if (monthMatch) return Number(monthMatch[1]);

    const daysMatch = name.match(/(\d+)\s*d[ií]as/i);
    if (daysMatch) {
        const d = Number(daysMatch[1]);
        if (d >= 90) return 4;
        if (d >= 60) return 3;
        if (d >= 30) return 2;
    }

    const daysAdv = Number(item.days_advanced ?? item.daysAdvanced ?? 0);
    if (daysAdv >= 120) return 5;
    if (daysAdv >= 90) return 4;
    if (daysAdv >= 60) return 3;
    if (daysAdv >= 30) return 2;

    const weight = Number(item.current_weight ?? item.weight ?? 0);
    if (weight >= 90) return 4;
    if (weight >= 55) return 3;
    if (weight >= 30) return 2;

    return 1;
}

/**
 * Enrich a marketplace item with display fields and unified days calculations.
 */
function enrichItem(item) {
    const itemName = item.piggy_name || item.item_name || item.name || 'Piggy';
    const currentMonth = resolveItemMonth(item);

    let rawCat = (item.category || '').toLowerCase();
    if (!rawCat || rawCat === 'estandar' || rawCat === 'standard') {
        if (currentMonth > 1) {
            rawCat = currentMonth >= 4 ? 'avanzado90' : currentMonth === 3 ? 'avanzado60' : 'avanzado30';
        } else {
            rawCat = 'estandar';
        }
    }

    const catMeta = CATEGORY_MAP[rawCat] || { label: item.category || 'Estandar', extraRoi: 0, daysAdvanced: (currentMonth - 1) * 30, defaultWeight: 6.0 };

    // Calculate days advanced and days remaining accurately
    let daysAdvanced = item.days_advanced !== undefined && item.days_advanced !== null && Number(item.days_advanced) > 0
        ? Number(item.days_advanced)
        : (currentMonth > 1 ? (currentMonth - 1) * 30 : catMeta.daysAdvanced);

    let daysRemaining = item.days_remaining !== undefined && item.days_remaining !== null && Number(item.days_remaining) > 0
        ? Number(item.days_remaining)
        : Math.max(1, FATTENING_CYCLE_TOTAL_DAYS - daysAdvanced);

    // Extra ROI
    const extraRoi = item.extra_roi !== undefined && item.extra_roi !== null
        ? Number(item.extra_roi)
        : catMeta.extraRoi;

    // Price extraction with multi-column support
    const rawPrice = item.price ?? item.investment_amount ?? item.amount ?? item.precio ?? 1000000;
    const price = Number(rawPrice) || 1000000;

    // Weight
    const currentWeight = (item.current_weight !== undefined && item.current_weight !== null)
        ? Number(item.current_weight)
        : (catMeta.defaultWeight ?? (daysAdvanced > 0 ? Number((6.0 + (85.0 - 6.0) * (daysAdvanced / 144)).toFixed(1)) : 6.0));

    // Deterministic image URL based on stage
    const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
    const fallbackPhotoNum = item.id ? (((Number(item.id) - 1) % 5) + 1) : 1;
    const resolvedImageUrl = item.image_url || `assets/piggies/stage${stage}/et${stage}-${fallbackPhotoNum}.jpg`;

    return {
        ...item,
        item_name: itemName,
        piggy_name: itemName,
        name: itemName,
        price: price,
        category: rawCat,
        categoryLabel: catMeta.label,
        daysAdvanced,
        daysRemaining,
        currentMonth,
        current_weight: currentWeight,
        extra_roi: extraRoi,
        cycleTotalDays: FATTENING_CYCLE_TOTAL_DAYS,
        priceFormatted: formatCOP(price),
        hasBonus: extraRoi > 0,
        bonusText: extraRoi > 0 ? `+${(extraRoi * 100).toFixed(0)}%` : null,
        image_url: resolvedImageUrl,
    };
}

/**
 * Get marketplace inventory statistics.
 */
export async function getMarketplaceStats() {
    try {
        const items = await getMarketplaceItems();
        const totalAvailable = items.reduce((acc, item) => acc + (item.stock || 0), 0);
        const categories = new Set(items.map(i => i.category));
        return {
            totalAvailable,
            categoriesCount: categories.size,
        };
    } catch (e) {
        return { totalAvailable: 0, categoriesCount: 0 };
    }
}

/**
 * Update stock for a marketplace item.
 */
export async function updateItemStock(itemId, quantity = 1) {
    if (isUsingMockData()) return true;
    try {
        const client = getClient();
        const { error } = await client.rpc('decrement_marketplace_stock', { item_id: itemId, qty: quantity });
        return !error;
    } catch {
        return false;
    }
}
