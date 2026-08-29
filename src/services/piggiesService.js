/* ============================================
   PIGGY APP — Piggies Service
   Manages piggy CRUD and ROI calculations
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import {
    MOCK_PIGGIES,
    calculateBaseROI,
    calculateTotalReturn,
    getProgressPercentage,
    getDaysRemaining,
    simulateWeight,
    getPiggyGrowthStage,
    formatCOP,
    formatPercentage,
} from './mockData.js';

export {
    calculateBaseROI,
    calculateTotalReturn,
    getProgressPercentage,
    getDaysRemaining,
    simulateWeight,
    getPiggyGrowthStage,
    formatCOP,
    formatPercentage,
};

/**
 * Fetch all piggies for the current user.
 * Ordered by purchase_date ascending.
 * @returns {Promise<Array>} List of user's piggies
 */
export async function getUserPiggies() {
    if (isUsingMockData()) {
        return MOCK_PIGGIES.map(enrichPiggyData);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) return [];

    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: true });

    if (error) {
        console.error('Error fetching piggies:', error);
        return [];
    }

    return (data || []).map(enrichPiggyData);
}

/**
 * Fetch a single piggy by ID.
 * @param {string} id - The piggy ID
 * @returns {Promise<Object|null>} The piggy or null
 */
export async function getPiggyById(id) {
    if (isUsingMockData()) {
        const found = MOCK_PIGGIES.find((p) => p.id === id);
        return found ? enrichPiggyData(found) : null;
    }

    const client = getClient();
    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching piggy by id:', error);
        return null;
    }

    return enrichPiggyData(data);
}

/**
 * Create a new piggy for the user (Testing / Admin purpose).
 * Note: Use buyMarketplaceItem for real purchases.
 * @param {string} piggyName 
 * @returns {Promise<Object>}
 */
export async function adoptPiggy(piggyName, contractUrl = null) {
    const defaultImageUrl = 'assets/piggies/stage1/et1-1.jpg';
    if (isUsingMockData()) {
        const newPiggy = {
            id: `mock-${Date.now()}`,
            user_id: 'mock-user',
            name: piggyName,
            status: 'engorde',
            purchase_date: new Date().toISOString(),
            // default ~4mo 3wk
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString(),
            investment_amount: 250000,
            extra_roi_bonus: 0,
            current_weight: 15.0,
            contract_url: contractUrl || '/contracts/contrato_base.pdf',
            image_url: defaultImageUrl,
        };
        MOCK_PIGGIES.unshift(newPiggy);
        return enrichPiggyData(newPiggy);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await client
        .from('piggies')
        .insert({
            user_id: user.id,
            name: piggyName,
            status: 'engorde',
            purchase_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString(),
            investment_amount: 250000,
            extra_roi_bonus: 0,
            current_weight: 15.0,
            contract_url: contractUrl || '/contracts/contrato_base.pdf',
            image_url: defaultImageUrl,
        })
        .select()
        .single();

    if (error || !data) throw new Error('No se pudo registrar el Piggy en la base de datos');
    return enrichPiggyData(data);
}

/**
 * Buy a piggy from the marketplace.
 * The current_month of the item determines how many days remain in the cycle.
 * @param {Object} item - The marketplace item
 * @param {string|null} customName - Optional custom name for the piggy
 * @param {string|null} contractUrl - Optional URL of the signed contract PDF
 */
export async function buyMarketplaceItem(item, customName = null, contractUrl = null, customContractCode = null) {
    // Calculate days remaining based on daysRemaining, daysAdvanced, or current_month
    const CYCLE_TOTAL_DAYS = 144;
    const currentMonth = item.currentMonth || item.current_month || 1;
    let daysRemaining = item.daysRemaining || item.days_remaining;
    if (!daysRemaining || daysRemaining <= 0) {
        const daysElapsed = item.daysAdvanced || item.days_advanced || Math.max(0, (currentMonth - 1) * 30);
        daysRemaining = Math.max(1, CYCLE_TOTAL_DAYS - daysElapsed);
    }
    const finalName = customName || item.piggy_name || item.item_name || item.name || 'Tu Piggy';
    const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
    const defaultPhotoNum = item.id ? (((Number(item.id) - 1) % 5) + 1) : 1;
    const finalImageUrl = item.image_url || item.imageUrl || `assets/piggies/stage${stage}/et${stage}-${defaultPhotoNum}.jpg`;

    let calculatedCode = customContractCode;
    if (!calculatedCode && contractUrl) {
        const match = contractUrl.match(/PGY-TX-([A-Z0-9]+)-([A-Z0-9]+)/i);
        if (match) {
            calculatedCode = `PGY-TX-${match[2].toUpperCase()}`;
        } else {
            const simpleMatch = contractUrl.match(/PGY-TX-([A-Z0-9]+)/i);
            calculatedCode = simpleMatch ? `PGY-TX-${simpleMatch[1].toUpperCase()}` : null;
        }
    }

    if (isUsingMockData()) {
        const mockId = `mock-${Date.now()}`;
        const newPiggy = {
            id: mockId,
            user_id: 'mock-user',
            name: finalName,
            status: 'engorde',
            purchase_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * daysRemaining).toISOString(),
            investment_amount: item.price,
            extra_roi_bonus: item.extra_roi || 0,
            category: item.category || 'estandar',
            current_weight: item.current_weight || 15.0,
            contract_url: contractUrl || '/contracts/contrato_base.pdf',
            image_url: finalImageUrl,
            contract_code: calculatedCode || `#${mockId.slice(-6).toUpperCase()}`,
        };
        MOCK_PIGGIES.unshift(newPiggy);

        // Reduce local stock reference for immediate UI feedback
        if (item.stock > 0) item.stock--;
        return enrichPiggyData(newPiggy);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Call Database Function (RPC)
    // Passes current_month, contractUrl, and contractCode so the DB calculates the correct end_date and persists the contract code atomically
    const { data: rpcData, error: rpcError } = await client.rpc('buy_piggy', {
        p_item_id: item.id,
        p_user_id: user.id,
        p_price: item.price,
        p_item_name: finalName,
        p_extra_roi: item.extra_roi || 0,
        p_category: item.category || 'estandar',
        p_current_month: currentMonth,
        p_contract_url: contractUrl,
        p_contract_code: calculatedCode,
    });

    if (rpcError) {
        console.error('Error crítico en compra (RPC):', rpcError);
        throw new Error('Lo sentimos, no pudimos procesar tu compra. Por favor, verifica tu conexión o el stock disponible e intenta de nuevo.');
    }

    // If contractUrl, contractCode or finalImageUrl provided, update them on the created piggy
    const createdPiggyId = rpcData?.piggy_id;
    if (createdPiggyId) {
        const updatePayload = {};
        if (contractUrl) updatePayload.contract_url = contractUrl;
        if (calculatedCode) updatePayload.contract_code = calculatedCode;
        if (finalImageUrl) updatePayload.image_url = finalImageUrl;

        if (Object.keys(updatePayload).length > 0) {
            try {
                await client.from('piggies').update(updatePayload).eq('id', createdPiggyId);
            } catch (e) {
                console.warn('No se pudo actualizar contract_url / contract_code / image_url en piggy recién creado:', e);
            }
        }
    }

    // Success! Fetch the created piggy to return it
    if (createdPiggyId) {
        return getPiggyById(createdPiggyId);
    }

    // Fallback just for fetching data, not for logic
    const { data: latest } = await client
        .from('piggies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    return enrichPiggyData(latest);
}

/**
 * Enrich a raw DB piggy record with calculated display properties.
 * Maps current weight dynamically to the exact Stage (1-10) using getPiggyGrowthStage().
 * @param {Object} p - Raw piggy from Supabase
 * @returns {Object} Enriched piggy
 */
export function enrichPiggyData(p) {
    const daysLeft = getDaysRemaining(p.end_date);
    const progress = getProgressPercentage(p.purchase_date, p.end_date);
    const currentWeight = Number(p.current_weight) || simulateWeight(progress);
    const isComplete = p.status === 'disponible' || progress >= 100 || daysLeft <= 0;
    const stageInfo = getPiggyGrowthStage(progress, p.name || 'Tu Piggy');

    return {
        ...p,
        name: p.name || 'Tu Piggy',
        daysLeft,
        progress,
        currentWeight: Math.round(currentWeight * 10) / 10,
        weightGain: Math.max(0, Math.round((currentWeight - 6) * 10) / 10),
        weightRemaining: Math.max(0, Math.round((120 - currentWeight) * 10) / 10),
        isComplete,
        stageNumber: stageInfo.stageNumber,
        stageName: stageInfo.stageName,
        stageIcon: stageInfo.icon,
        stageBadgeBg: stageInfo.badgeBg,
        stageBadgeColor: stageInfo.badgeColor,
        stageDescription: stageInfo.description,
        contractCode: p.contract_code || `#PIG${String(p.id).slice(-4).toUpperCase()}`,
        imageUrl: p.image_url || 'assets/piggies/stage1/et1-1.jpg',
    };
}

/**
 * Calculate dashboard summary statistics.
 * Multi-Piggy Margin:
 *   1 Piggy   → 8% Base ROI (80.000 / 1.000.000)
 *   2 Piggies → 9% Base ROI (+1% margin, 90.000 c/u)
 *   3+ Piggies → 10% Base ROI (+2% margin, 100.000 c/u)
 *
 * @param {Array} piggies - List of user's piggies
 * @returns {Object} Summary stats
 */
export async function getDashboardStats(piggies) {
    const activePiggies = piggies.filter((p) => p.status !== 'disponible' && !p.isComplete);
    const availablePiggies = piggies.filter((p) => p.status === 'disponible' || p.isComplete);
    const piggyCount = activePiggies.length;
    const baseROI = calculateBaseROI(piggyCount);

    // Sum total invested (active piggies)
    const adquisicionBonos = activePiggies.reduce((sum, p) => sum + (p.investment_amount || 0), 0);

    // Sum commercial margin for active piggies with individual extra_roi_bonus
    const diferencialPreventa = activePiggies.reduce((sum, p) => {
        const extraROI = p.extra_roi_bonus || 0;
        return sum + (p.investment_amount * (baseROI + extraROI));
    }, 0);

    // Sum available balance for completed piggies
    const disponible = availablePiggies.reduce((sum, p) => {
        const extraROI = p.extra_roi_bonus || 0;
        return sum + calculateTotalReturn(p.investment_amount || 0, baseROI, extraROI);
    }, 0);

    // Closest closing piggy
    let nextCloseDays = 0;
    let nextCloseProgress = 0;
    if (activePiggies.length > 0) {
        const closestPiggy = activePiggies.reduce((prev, curr) =>
            (prev.daysLeft < curr.daysLeft) ? prev : curr
        );
        nextCloseDays = closestPiggy.daysLeft;
        nextCloseProgress = closestPiggy.progress;
    }

    return {
        totalPiggies: piggies.length,
        activeCount: piggyCount,
        finishedCount: availablePiggies.length,
        adquisicionBonos,
        adquisicionBonosFormatted: formatCOP(adquisicionBonos),
        diferencialPreventa,
        diferencialPreventaFormatted: formatCOP(diferencialPreventa),
        disponible,
        disponibleFormatted: formatCOP(disponible),
        nextCloseDays,
        nextCloseProgress,
        baseROI,
        baseROIFormatted: formatPercentage(baseROI),
        margenComercialFormatted: formatCOP(diferencialPreventa),
        pagoFinalFormatted: formatCOP(adquisicionBonos + diferencialPreventa),
    };
}

/**
 * Sell a finished piggy and credit return to available balance.
 * @param {string} piggyId - The piggy ID
 * @returns {Promise<Object>} Updated piggy and transaction info
 */
export async function sellPiggy(piggyId) {
    if (isUsingMockData()) {
        const piggy = MOCK_PIGGIES.find((p) => p.id === piggyId);
        if (!piggy) throw new Error('Piggy no encontrado');
        piggy.status = 'disponible';
        return { success: true, piggy: enrichPiggyData(piggy) };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Call Supabase Database Function to sell piggy atomically
    const { data, error } = await client.rpc('sell_piggy', {
        p_piggy_id: piggyId,
        p_user_id: user.id,
    });

    if (error) {
        console.error('Error selling piggy:', error);
        throw new Error(error.message);
    }

    return data;
}

/**
 * Re-invest return from a sold piggy into a new cycle.
 * @param {string} piggyId - The piggy ID to liquidate
 * @param {string} newBreed - Breed for the new piggy
 * @returns {Promise<Object>} New piggy data
 */
export async function reinvestPiggy(piggyId, newBreed = 'Landrace x Pietrain') {
    if (isUsingMockData()) {
        const piggy = MOCK_PIGGIES.find((p) => p.id === piggyId);
        if (!piggy) throw new Error('Piggy no encontrado');
        piggy.status = 'engorde';
        piggy.purchase_date = new Date().toISOString();
        piggy.end_date = new Date(Date.now() + 1000 * 60 * 60 * 24 * 144).toISOString();
        piggy.breed = newBreed;
        return { success: true, piggy: enrichPiggyData(piggy) };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await client.rpc('reinvest_piggy', {
        p_piggy_id: piggyId,
        p_user_id: user.id,
        p_new_breed: newBreed,
    });

    if (error) {
        console.error('Error reinvesting piggy:', error);
        throw new Error(error.message);
    }

    return data;
}
