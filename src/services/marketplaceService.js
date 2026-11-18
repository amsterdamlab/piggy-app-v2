/* ============================================
   PIGGY APP — Marketplace Service
   Handles fetching marketplace items
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { formatCOP, getCategoryCycleDays } from './mockData.js';

/**
 * Default cycle durations in days under V2 rules:
 * - Estándar & Avanzado (15d / 30d): 122 days (4 months)
 * - Dorado & Premium: 152 days (5 months)
 */
const STANDARD_CYCLE_DAYS = 122;
const EXTENDED_CYCLE_DAYS = 152;

/**
 * Categories discontinued from the active marketplace catalog:
 * - Piggy Plus ('plus', 'silver')
 * - Advanced > 30 days ('avanzado45', 'avanzado60', 'avanzado75', 'avanzado90')
 */
const DISCONTINUED_CATEGORIES = new Set([
    'plus', 'silver', 'plata',
    'avanzado45', 'advanced45',
    'avanzado60', 'advanced60',
    'avanzado75', 'advanced75',
    'avanzado90', 'advanced90',
]);

/**
 * Category metadata definitions for cycle days, extra benefit, days advanced and initial weights.
 */
const CATEGORY_MAP = {
    estandar:   { label: 'Estandar', extraRoi: 0.00, daysAdvanced: 0,  cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 6.0 },
    standard:   { label: 'Estandar', extraRoi: 0.00, daysAdvanced: 0,  cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 6.0 },
    avanzado15: { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 15, cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 15.4 },
    advanced15: { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 15, cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 15.4 },
    avanzado30: { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 24.8 },
    advanced30: { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 24.8 },
    avanzado:   { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 24.8 },
    advanced:   { label: 'Avanzado', extraRoi: 0.00, daysAdvanced: 30, cycleDays: STANDARD_CYCLE_DAYS, defaultWeight: 24.8 },
    dorado:     { label: 'Dorado',   extraRoi: 0.02, daysAdvanced: 0,  cycleDays: EXTENDED_CYCLE_DAYS, defaultWeight: 6.0 },
    gold:       { label: 'Dorado',   extraRoi: 0.02, daysAdvanced: 0,  cycleDays: EXTENDED_CYCLE_DAYS, defaultWeight: 6.0 },
    premium:    { label: 'Premium',  extraRoi: 0.04, daysAdvanced: 0,  cycleDays: EXTENDED_CYCLE_DAYS, defaultWeight: 6.0 },
};

/**
 * Mock marketplace data for development.
 */
const MOCK_MARKETPLACE_ITEMS = [
    {
        id: 1,
        item_name: 'Piggy Estandar',
        description: 'Comienza tu camino en el agro. Un cerdo de raza clásica en ciclo de 4 meses (122 días).',
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
        item_name: 'Piggy Avanzado (15 días)',
        description: 'Cerdo en etapa de engorde con 15 días de avance (107 días restantes).',
        price: 1000000,
        extra_roi: 0.00,
        stock: 18,
        category: 'avanzado15',
        days_advanced: 15,
        current_weight: 15.4,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-2.jpg',
    },
    {
        id: 3,
        item_name: 'Piggy Avanzado (30 días)',
        description: 'Cerdo en etapa de engorde avanzada. Ahorra 30 días de espera (92 días restantes).',
        price: 1000000,
        extra_roi: 0.00,
        stock: 15,
        category: 'avanzado30',
        days_advanced: 30,
        current_weight: 24.8,
        current_month: 2,
        image_url: 'assets/piggies/stage2/et2-1.jpg',
    },
    {
        id: 5,
        item_name: 'Piggy Dorado',
        description: 'Comercializado en empresas, colegios y hospitales con un +2% de beneficio comercial adicional (ciclo de 5 meses).',
        price: 1200000,
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
        description: 'Comercializado en cadenas de restaurantes y hospedajes premium con un +4% de beneficio comercial adicional (ciclo de 5 meses).',
        price: 1000000,
        extra_roi: 0.04,
        stock: 8,
        category: 'premium',
        days_advanced: 0,
        current_weight: 6.0,
        current_month: 1,
        image_url: 'assets/piggies/stage1/et1-4.jpg',
    }
];

/**
 * Check if an item belongs to a discontinued category (Plus or Avanzado > 30d).
 */
function isDiscontinuedItem(item) {
    if (!item) return true;
    const rawCat = String(item.category || '').toLowerCase().trim();
    if (DISCONTINUED_CATEGORIES.has(rawCat)) return true;

    const name = String(item.piggy_name || item.item_name || item.name || '').toLowerCase();
    if (name.includes('plus') || name.includes('silver')) return true;

    const daysMatch = name.match(/(\d+)\s*d[ií]as/i);
    if (daysMatch && Number(daysMatch[1]) > 30) return true;

    const daysAdv = Number(item.days_advanced ?? item.daysAdvanced ?? 0);
    if (daysAdv > 30) return true;

    return false;
}

/**
 * Fetch all active marketplace items (excluding discontinued Plus and Avanzado > 30d).
 */
export async function getMarketplaceItems() {
    if (isUsingMockData()) {
        return MOCK_MARKETPLACE_ITEMS
            .filter(i => (i.stock ?? 1) > 0 && !isDiscontinuedItem(i))
            .map(enrichItem);
    }

    const client = getClient();
    const { data, error } = await client
        .from('marketplace')
        .select('*')
        .gt('stock', 0)
        .order('price', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || [])
        .filter(item => !isDiscontinuedItem(item))
        .map(enrichItem);
}

/**
 * Resolves the month (1-5) of a marketplace item using all available metadata.
 */
function resolveItemMonth(item, cycleTotalDays = STANDARD_CYCLE_DAYS) {
    if (item.fixed_end_date || item.fixedEndDate) {
        const targetDate = new Date(item.fixed_end_date || item.fixedEndDate);
        if (!isNaN(targetDate.getTime())) {
            const now = new Date();
            const diffDays = Math.max(1, Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)));
            const daysAdv = Math.max(0, cycleTotalDays - diffDays);
            if (daysAdv >= 30) return 2;
            return 1;
        }
    }

    const name = String(item.piggy_name || item.item_name || item.name || '');
    const daysMatch = name.match(/(\d+)\s*d[ií]as/i);
    if (daysMatch) {
        const d = Number(daysMatch[1]);
        if (d >= 30) return 2;
        return 1;
    }

    const daysAdv = Number(item.days_advanced ?? item.daysAdvanced ?? 0);
    if (daysAdv >= 30) return 2;
    if (daysAdv >= 15) return 1;

    if (item.current_month && Number(item.current_month) > 0) return Math.min(2, Number(item.current_month));
    if (item.currentMonth && Number(item.currentMonth) > 0) return Math.min(2, Number(item.currentMonth));

    return 1;
}

/**
 * Enrich a marketplace item with display fields and unified V2 days calculations.
 */
function enrichItem(item) {
    const itemName = item.piggy_name || item.item_name || item.name || 'Piggy';
    let rawCat = (item.category || '').toLowerCase().trim();

    // Detect advanced 15d vs 30d from name or days_advanced if category is generic
    const daysMatch = itemName.match(/(\d+)\s*d[ií]as/i);
    const parsedDaysFromName = daysMatch ? Number(daysMatch[1]) : null;
    const rawDaysAdv = Number(item.days_advanced ?? item.daysAdvanced ?? parsedDaysFromName ?? 0);

    if (!rawCat || rawCat === 'estandar' || rawCat === 'standard' || rawCat === 'avanzado' || rawCat === 'advanced') {
        if (rawDaysAdv >= 20) {
            rawCat = 'avanzado30';
        } else if (rawDaysAdv > 0) {
            rawCat = 'avanzado15';
        } else if (rawCat === 'avanzado' || rawCat === 'advanced') {
            rawCat = 'avanzado30';
        } else {
            rawCat = 'estandar';
        }
    }

    const cycleTotalDays = getCategoryCycleDays(rawCat, 'v2_2026', item.cycle_days || item.cycleDays);
    const currentMonth = resolveItemMonth(item, cycleTotalDays);

    const catMeta = CATEGORY_MAP[rawCat] || {
        label: item.category || 'Estandar',
        extraRoi: 0,
        daysAdvanced: rawDaysAdv > 0 ? Math.min(30, rawDaysAdv) : 0,
        cycleDays: cycleTotalDays,
        defaultWeight: 6.0,
    };

    // Calculate days advanced (strictly capped at 30 days so minimum cycle wait is >= 3 months / 92 days)
    let daysAdvanced = catMeta.daysAdvanced;
    if (rawCat.includes('15')) {
        daysAdvanced = 15;
    } else if (rawCat.includes('30')) {
        daysAdvanced = 30;
    } else if (rawDaysAdv > 0 && rawDaysAdv <= 30) {
        daysAdvanced = rawDaysAdv;
    }

    let daysRemaining = Math.max(1, cycleTotalDays - daysAdvanced);

    // Dynamic real-time calculation if fixed_end_date is configured
    const fixedEndDateStr = item.fixed_end_date || item.fixedEndDate;
    if (fixedEndDateStr) {
        const targetDate = new Date(fixedEndDateStr);
        if (!isNaN(targetDate.getTime())) {
            const now = new Date();
            daysRemaining = Math.max(1, Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24)));
            daysAdvanced = Math.max(0, cycleTotalDays - daysRemaining);
        }
    }

    // Extra ROI (enforce +4% for Premium and +2% for Dorado under V2 rules)
    let extraRoi = catMeta.extraRoi;
    if (rawCat === 'premium') {
        extraRoi = 0.04;
    } else if (rawCat === 'dorado' || rawCat === 'gold') {
        extraRoi = 0.02;
    } else if (item.extra_roi !== undefined && item.extra_roi !== null) {
        extraRoi = Number(item.extra_roi);
    }

    // Price extraction with multi-column support
    const rawPrice = item.price ?? item.investment_amount ?? item.amount ?? item.precio ?? 1000000;
    const price = Number(rawPrice) || 1000000;

    // Weight calculation based on 122d / 152d curve (6.0 kg -> 82.5 kg midpoint for standard/advanced)
    let currentWeight = catMeta.defaultWeight;
    if (daysAdvanced > 0) {
        currentWeight = Number((6.0 + (82.5 - 6.0) * (daysAdvanced / cycleTotalDays)).toFixed(1));
    } else if (item.current_weight !== undefined && item.current_weight !== null && Number(item.current_weight) > 0) {
        currentWeight = Number(item.current_weight);
    }

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
        fixed_end_date: fixedEndDateStr || null,
        cycleTotalDays: cycleTotalDays,
        cycle_days: cycleTotalDays,
        plan_version: 'v2_2026',
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
    if (isUsingMockData()) {
        const mockItem = MOCK_MARKETPLACE_ITEMS.find(m => String(m.id) === String(itemId));
        if (mockItem) {
            mockItem.stock = Math.max(0, (mockItem.stock || 0) - quantity);
            return true;
        }
        return true;
    }
    try {
        const client = getClient();

        // 1. Try secure RPC with standard signature (p_item_id, p_qty)
        const { error: rpcErr } = await client.rpc('decrement_marketplace_stock', {
            p_item_id: String(itemId),
            p_qty: quantity
        });

        if (!rpcErr) {
            return true;
        }

        // 2. Fallback: try legacy parameter names (item_id, qty)
        const { error: altRpcErr } = await client.rpc('decrement_marketplace_stock', {
            item_id: String(itemId),
            qty: quantity
        });

        if (!altRpcErr) {
            return true;
        }

        // 3. Fallback: direct table update
        const { data: mItem, error: fetchErr } = await client
            .from('marketplace')
            .select('stock')
            .eq('id', itemId)
            .single();

        if (!fetchErr && mItem && mItem.stock > 0) {
            const newStock = Math.max(0, mItem.stock - quantity);
            const { error: updateErr } = await client
                .from('marketplace')
                .update({ stock: newStock })
                .eq('id', itemId);

            return !updateErr;
        }

        return false;
    } catch (err) {
        console.warn('[updateItemStock] Error actualizando stock del mercado:', err);
        return false;
    }
}
