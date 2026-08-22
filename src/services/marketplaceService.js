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
    estandar:    { label: 'Estandar', extraRoi: 0.00, daysAdvanced: 0,  defaultWeight: 15.0 },
    standard:    { label: 'Estandar', extraRoi: 0.00, daysAdvanced: 0,  defaultWeight: 15.0 },
    plus:        { label: 'Plus',     extraRoi: 0.01, daysAdvanced: 0,  defaultWeight: 15.0 },
    silver:      { label: 'Plus',     extraRoi: 0.01, daysAdvanced: 0,  defaultWeight: 15.0 },
    dorado:      { label: 'Dorado',   extraRoi: 0.02, daysAdvanced: 0,  defaultWeight: 15.0 },
    gold:        { label: 'Dorado',   extraRoi: 0.02, daysAdvanced: 0,  defaultWeight: 15.0 },
    premium:     { label: 'Premium',  extraRoi: 0.03, daysAdvanced: 0,  defaultWeight: 15.0 },
    avanzado30:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 35.0 },
    advanced30:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 35.0 },
    avanzado45:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 45, defaultWeight: 45.0 },
    advanced45:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 45, defaultWeight: 45.0 },
    avanzado60:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 60, defaultWeight: 55.0 },
    advanced60:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 60, defaultWeight: 55.0 },
    avanzado75:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 75, defaultWeight: 65.0 },
    advanced75:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 75, defaultWeight: 65.0 },
    avanzado90:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 90, defaultWeight: 75.0 },
    advanced90:  { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 90, defaultWeight: 75.0 },
    avanzado:    { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 35.0 },
    advanced:    { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, defaultWeight: 35.0 },
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
        current_weight: 15.0,
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
        current_weight: 35.0,
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
        current_weight: 55.0,
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
        current_weight: 15.0,
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
        current_weight: 15.0,
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
        current_weight: 15.0,
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
 * Enrich a marketplace item with display fields and unified days calculations.
 */
function enrichItem(item) {
    const rawCat = (item.category || 'estandar').toLowerCase();
    const catMeta = CATEGORY_MAP[rawCat] || { label: item.category, extraRoi: 0, daysAdvanced: 0, defaultWeight: 15.0 };

    // Calculate days advanced and days remaining accurately
    let daysAdvanced = item.days_advanced !== undefined && item.days_advanced !== null
        ? Number(item.days_advanced)
        : catMeta.daysAdvanced;

    // Fallback based on current_month if days_advanced is 0 but current_month > 1
    if (daysAdvanced === 0 && item.current_month && item.current_month > 1) {
        daysAdvanced = DAYS_PER_MONTH_ELAPSED[item.current_month] || ((item.current_month - 1) * 30);
    }

    let daysRemaining = item.days_remaining !== undefined && item.days_remaining !== null && item.days_remaining > 0
        ? Number(item.days_remaining)
        : Math.max(1, FATTENING_CYCLE_TOTAL_DAYS - daysAdvanced);

    // Dynamic current month for stage visualization
    const currentMonth = item.current_month || (daysAdvanced >= 120 ? 5 : daysAdvanced >= 90 ? 4 : daysAdvanced >= 60 ? 3 : daysAdvanced >= 30 ? 2 : 1);

    // Extra ROI
    const extraRoi = item.extra_roi !== undefined && item.extra_roi !== null
        ? Number(item.extra_roi)
        : catMeta.extraRoi;

    // Price
    const price = item.price ?? 1000000;

    // Weight
    const currentWeight = item.current_weight || catMeta.defaultWeight || Math.round(15.0 + (daysAdvanced / FATTENING_CYCLE_TOTAL_DAYS) * 95.0);

    // Deterministic image URL
    const defaultPhotoMap = {
        1: 'assets/piggies/stage1/et1-1.jpg',
        2: 'assets/piggies/stage2/et2-1.jpg',
        3: 'assets/piggies/stage2/et2-2.jpg',
        4: 'assets/piggies/stage1/et1-2.jpg',
        5: 'assets/piggies/stage1/et1-3.jpg',
        6: 'assets/piggies/stage1/et1-4.jpg',
    };
    const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
    const fallbackPhotoNum = item.id ? (((Number(item.id) - 1) % 5) + 1) : 1;
    const resolvedImageUrl = item.image_url || defaultPhotoMap[item.id] || `assets/piggies/stage${stage}/et${stage}-${fallbackPhotoNum}.jpg`;

    // Name (supports both piggy_name and item_name columns)
    const piggyName = item.piggy_name || item.item_name || item.name || 'Piggy';

    return {
        ...item,
        item_name: piggyName,
        piggy_name: piggyName,
        name: piggyName,
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
