/* ============================================
   PIGGY APP — Piggies Service
   Manages piggy CRUD and ROI calculations
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';
import { deductWalletBalance } from './walletService.js';
import { updateItemStock } from './marketplaceService.js';
import {
    MOCK_PIGGIES,
    calculateBaseROI,
    calculateTotalReturn,
    getProgressPercentage,
    getDaysRemaining,
    simulateWeight,
    getCategoryFinalWeight,
    getCategoryCycleDays,
    resolvePiggyPlanVersion,
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
    getCategoryFinalWeight,
    getCategoryCycleDays,
    resolvePiggyPlanVersion,
    getPiggyGrowthStage,
    formatCOP,
    formatPercentage,
};

/**
 * Fetch all piggies for the current user.
 * Auto-marks expired piggies as 'completado' in DB so the trigger
 * can calculate ROI and credit wallet_balance automatically.
 */
export async function getUserPiggies() {
    if (isUsingMockData()) {
        return MOCK_PIGGIES.map(enrichPiggyData);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    // 1. Sincronizar pesos y marcar cerditos vencidos en DB en segundo plano (non-blocking)
    if (user) {
        Promise.allSettled([
            client.rpc('sync_piggy_weights', { p_user_id: user.id }),
            client.rpc('mark_expired_piggies', { p_user_id: user.id })
        ]).catch(syncErr => console.warn('Sync/expired RPC error:', syncErr));
    }

    // 2. Consultar los piggies con su status y pesos actualizados
    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Error fetching piggies:', error);
        return [];
    }

    // Enrich DB data with runtime calculated fields (daysLeft, progress)
    return (data || []).map(enrichPiggyData);
}

/**
 * Identify piggies that have passed their end_date and mark them as complete.
 * Calls the secure database RPC `mark_expired_piggies` to handle status changes
 * safely and securely on the server side.
 * @param {string} userId 
 */
export async function markExpiredPiggies(userId) {
    if (isUsingMockData()) return;

    const client = getClient();
    
    const { error } = await client.rpc('mark_expired_piggies', { p_user_id: userId });

    if (error) {
        console.warn('Error marking expired piggies:', error);
    } else {
        console.log('✅ Checked and marked expired piggies successfully in DB.');
    }
}

/**
 * Get a single piggy by ID.
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export async function getPiggyById(id) {
    if (isUsingMockData()) {
        const piggy = MOCK_PIGGIES.find(p => p.id === id || p.id === Number(id));
        if (!piggy) throw new Error('Piggy not found');
        return enrichPiggyData(piggy);
    }

    const client = getClient();
    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) throw new Error('Piggy no encontrado en DB');
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
        const mockId = `mock-${Date.now()}`;
        const newPiggy = {
            id: mockId,
            user_id: 'mock-user',
            name: piggyName,
            status: 'engorde',
            purchase_date: new Date().toISOString(),
            // default 4 months (122 days) for standard V2 piggy
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 122).toISOString(),
            investment_amount: 1000000,
            extra_roi_bonus: 0,
            category: 'estandar',
            plan_version: 'v2_2026',
            cycle_days: 122,
            current_weight: 6.0,
            final_weight: getCategoryFinalWeight('estandar', mockId, 'v2_2026'),
            contract_url: contractUrl || '/contracts/contrato_base.pdf',
            image_url: defaultImageUrl,
        };
        MOCK_PIGGIES.unshift(newPiggy);
        return enrichPiggyData(newPiggy);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('User not logged in');

    // 0. Guardia de idempotencia: Evitar duplicados por doble envío en adopción
    try {
        const { data: existingRecent } = await client
            .from('piggies')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', piggyName)
            .gte('created_at', new Date(Date.now() - 10000).toISOString())
            .limit(1);

        if (existingRecent && existingRecent.length > 0) {
            console.warn('[adoptPiggy] Piggy ya adoptado recientemente, retornando registro existente.');
            return enrichPiggyData(existingRecent[0]);
        }
    } catch (idempErr) {
        console.warn('[adoptPiggy] Idempotency check warning:', idempErr);
    }

    const insertPayload = {
        user_id: user.id,
        name: piggyName,
        investment_amount: 1000000,
        status: 'engorde',
        category: 'estandar',
        plan_version: 'v2_2026',
        cycle_days: 122,
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 122).toISOString(),
        current_weight: 6.0,
        final_weight: getCategoryFinalWeight('estandar', null, 'v2_2026'),
        image_url: defaultImageUrl,
    };
    if (contractUrl) {
        insertPayload.contract_url = contractUrl;
    }

    const { data, error } = await client
        .from('piggies')
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        // If optional columns don't exist yet, retry without non-essential fields
        delete insertPayload.contract_url;
        delete insertPayload.image_url;
        delete insertPayload.final_weight;
        delete insertPayload.plan_version;
        delete insertPayload.cycle_days;
        const { data: retryData, error: retryError } = await client
            .from('piggies')
            .insert(insertPayload)
            .select()
            .single();
        if (retryError) throw new Error(retryError.message);
        return enrichPiggyData(retryData);
    }
    return enrichPiggyData(data);
}

/**
 * Create a piggy (alias for adoptPiggy).
 */
export async function createPiggy({ name, amount = 1000000, durationMonths = 3, extraRoi = 0 }) {
    return adoptPiggy(name);
}

/**
 * Buy a piggy (alias for adoptPiggy).
 */
export async function buyPiggy(piggyName, contractUrl = null) {
    return adoptPiggy(piggyName, contractUrl);
}

/**
 * Generate a stable hash number from a string (piggy ID) to pick a
 * consistent random photo (1-5) per piggy without changing on refresh.
 * @param {string} idStr
 * @returns {number} 1 to 5
 */
function getPiggyPhotoNumber(idStr) {
    let hash = 0;
    const str = String(idStr || 'default');
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (Math.abs(hash) % 5) + 1; // Returns 1, 2, 3, 4 or 5
}

/**
 * Determine the growth stage and build the image URL for a piggy.
 * Stage 1 → Month 1  (daysElapsed 0-30)   → et1-{n}.jpg
 * Stage 2 → Months 2-3 (daysElapsed 31-90) → et2-{n}.jpg
 * Stage 3 → Month 4 to end of cycle        → et3-{n}.jpg
 *
 * Each piggy keeps the same number (n = 1-5) across all stages,
 * so the same animal is visually tracked through its growth.
 * @param {string} piggyId
 * @param {number} daysElapsed
 * @param {boolean} isComplete
 * @returns {string} Image URL
 */
function getPiggyImageUrl(piggyId, daysElapsed, isComplete) {
    let stage;
    if (isComplete || daysElapsed > 90) {
        stage = 3;
    } else if (daysElapsed > 30) {
        stage = 2;
    } else {
        stage = 1;
    }
    const photoNum = getPiggyPhotoNumber(piggyId);
    return `assets/piggies/stage${stage}/et${stage}-${photoNum}.jpg`;
}

/**
 * Extract or compute the display code for a piggy:
 * - With contract: 'PGY-TX-B843WD' (from contract_code, contract_url, or hash)
 * - Without contract: '#173802' (last 6 chars of ID)
 * @param {Object} piggy
 * @returns {string}
 */
export function getPiggyDisplayCode(piggy) {
    if (!piggy) return '#000000';

    // 1. If explicit contract_code exists in record
    const explicitCode = piggy.contract_code || piggy.contractCode || piggy.contract_hash;
    if (explicitCode && typeof explicitCode === 'string' && explicitCode.trim() !== '') {
        const clean = explicitCode.trim().toUpperCase();
        if (clean.startsWith('PGY-TX-')) {
            const parts = clean.split('-');
            const lastPart = parts.length >= 4 ? parts[3] : (parts[2] || 'TX');
            return `PGY-TX-${lastPart}`;
        }
        return clean.startsWith('#') ? clean : `PGY-TX-${clean}`;
    }

    // 2. Extract from contract_url if present
    const contractUrl = piggy.contract_url || piggy.contractUrl;
    if (contractUrl && typeof contractUrl === 'string') {
        const match = contractUrl.match(/PGY-TX-([A-Z0-9]+)-([A-Z0-9]+)/i);
        if (match) {
            return `PGY-TX-${match[2].toUpperCase()}`;
        }
        const simpleMatch = contractUrl.match(/PGY-TX-([A-Z0-9]+)/i);
        if (simpleMatch) {
            return `PGY-TX-${simpleMatch[1].toUpperCase()}`;
        }
    }

    // 3. Fallback for piggies without contract: last 6 characters of ID
    const rawId = String(piggy.id || '000000').replace(/[^a-zA-Z0-9]/g, '');
    const last6 = rawId.length >= 6 ? rawId.slice(-6).toUpperCase() : rawId.padStart(6, '0').toUpperCase();
    return `#${last6}`;
}

/**
 * Enrich a piggy record with computed fields for display.
 */
function enrichPiggyData(piggy) {
    if (!piggy) return null;

    // Safely extract investment amount (supports DB column names: investment_amount, price, amount)
    const rawInvestment = piggy.investment_amount ?? piggy.price ?? piggy.amount ?? 1000000;
    const investmentAmount = Math.max(0, parseFloat(rawInvestment) || 1000000);

    // Safely extract extra ROI bonus
    const rawBonus = piggy.extra_roi_bonus ?? piggy.extra_roi ?? 0;
    const extraRoiBonus = parseFloat(rawBonus) || 0;

    // Resolve plan cohort ('v1_legacy' vs 'v2_2026')
    const planVersion = resolvePiggyPlanVersion(piggy);

    // Determine category according to plan version
    const fallbackCat = planVersion === 'v1_legacy'
        ? (extraRoiBonus >= 0.03 ? 'premium' : extraRoiBonus >= 0.02 ? 'dorado' : extraRoiBonus >= 0.01 ? 'plus' : 'estandar')
        : (extraRoiBonus >= 0.04 ? 'premium' : extraRoiBonus >= 0.02 ? 'dorado' : 'estandar');
    const rawCategory = String(piggy.category || fallbackCat).toLowerCase();

    // Dynamic cycle duration per piggy (144 for v1_legacy; 122 for v2 standard/advanced; 152 for v2 dorado/premium)
    const CYCLE_TOTAL_DAYS = getCategoryCycleDays(rawCategory, planVersion, piggy.cycle_days || piggy.cycleDays);

    // Calculate days remaining with fallback
    const endDateStr = piggy.end_date || piggy.endDate || piggy.purchase_date;
    let daysLeft = getDaysRemaining(endDateStr, CYCLE_TOTAL_DAYS);
    if (isNaN(daysLeft)) daysLeft = CYCLE_TOTAL_DAYS;

    // Calculate progress based on REVERSE logic (CYCLE_TOTAL_DAYS - daysLeft)
    const daysElapsed = Math.max(0, CYCLE_TOTAL_DAYS - daysLeft);
    let progress = Math.round((daysElapsed / CYCLE_TOTAL_DAYS) * 100);
    if (isNaN(progress)) progress = 0;
    progress = Math.min(100, Math.max(0, progress));

    // Determine target final weight (cap 110 kg for v1_legacy, 120 kg for v2_2026)
    const maxWeightCap = planVersion === 'v1_legacy' ? 110.0 : 120.0;
    const rawFinalWeight = parseFloat(piggy.final_weight);
    const finalWeight = (rawFinalWeight && !isNaN(rawFinalWeight) && rawFinalWeight > 0)
        ? Math.min(maxWeightCap, rawFinalWeight)
        : getCategoryFinalWeight(rawCategory, piggy.id, planVersion);

    const isComplete = progress >= 100 || piggy.status === 'completado' || daysLeft === 0;
    const dbWeight = parseFloat(piggy.current_weight || piggy.weight);

    let weight;
    if (isComplete) {
        weight = finalWeight;
    } else if (dbWeight && !isNaN(dbWeight) && dbWeight > 6.0 && progress === 0) {
        weight = dbWeight;
    } else {
        weight = simulateWeight(progress, finalWeight, 6.0);
    }

    // Determine current visual growth stage (1, 2 or 3)
    const stage3ThresholdDays = CYCLE_TOTAL_DAYS === 122 ? 75 : 90;
    let currentStage;
    if (isComplete || daysElapsed > stage3ThresholdDays) {
        currentStage = 3;
    } else if (daysElapsed > 30) {
        currentStage = 2;
    } else {
        currentStage = 1;
    }

    let imageUrl = piggy.image_url || piggy.imageUrl;

    if (imageUrl) {
        const match = imageUrl.match(/et\d-(\d)\.jpg/);
        if (match) {
            const photoNum = match[1];
            imageUrl = `assets/piggies/stage${currentStage}/et${currentStage}-${photoNum}.jpg`;
        }
    } else {
        const photoNum = getPiggyPhotoNumber(piggy.id || '1');
        imageUrl = `assets/piggies/stage${currentStage}/et${currentStage}-${photoNum}.jpg`;
    }

    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = '/' + imageUrl;
    }

    const piggyName = piggy.name || (piggy.id ? `Piggy #${String(piggy.id).slice(-4)}` : 'Tu Piggy');
    const growthStage = getPiggyGrowthStage(progress, piggyName);
    const displayCode = getPiggyDisplayCode(piggy);

    return {
        ...piggy,
        investment_amount: investmentAmount,
        extra_roi_bonus: extraRoiBonus,
        category: rawCategory,
        plan_version: planVersion,
        cycle_days: CYCLE_TOTAL_DAYS,
        final_weight: finalWeight,
        progress,
        daysLeft,
        currentWeight: (isNaN(weight) ? 6.0 : weight).toFixed(1),
        isComplete,
        imageUrl,
        name: piggyName,
        growthStage,
        displayCode,
        contract_code: displayCode,
    };
}

/**
 * Get summary stats for the dashboard.
 * Supports mixed cohorts: v1_legacy piggies scale on 8/9/10% while v2_2026 piggies scale on 12/13/14%
 * using the total active piggy count in the user's farm.
 */
export function getDashboardStats(piggies = []) {
    const validPiggies = (piggies || []).filter(Boolean);
    const activePiggies = validPiggies.filter((p) => p.status === 'engorde' || (!p.isComplete && p.status !== 'completado' && p.status !== 'liquidado'));
    const availablePiggies = validPiggies.filter((p) => p.status === 'completado' || p.isComplete || p.status === 'liquidado');

    const piggyCount = activePiggies.length;

    // Assign each piggy its cohort-aware baseROI based on current active piggy volume
    activePiggies.forEach((p) => {
        const pPlan = p.plan_version || resolvePiggyPlanVersion(p);
        p.baseROI = calculateBaseROI(piggyCount, pPlan);
    });
    availablePiggies.forEach((p) => {
        const pPlan = p.plan_version || resolvePiggyPlanVersion(p);
        const lockedBase = parseFloat(p.locked_base_roi);
        p.baseROI = (!isNaN(lockedBase) && lockedBase > 0)
            ? lockedBase
            : calculateBaseROI(Math.max(1, piggyCount), pPlan);
    });

    // Header display baseROI: if user only has v1_legacy active piggies, show v1_legacy rate (8/9/10%);
    // if user has any v2_2026 active piggy (or 0 active piggies), show v2_2026 rate (12/13/14%).
    const onlyLegacyActive = activePiggies.length > 0 && activePiggies.every(
        (p) => (p.plan_version || resolvePiggyPlanVersion(p)) === 'v1_legacy'
    );
    const baseROI = calculateBaseROI(piggyCount, onlyLegacyActive ? 'v1_legacy' : 'v2_2026');

    // 1. Adquisición Bonos de Preventa (Active Investment)
    const adquisicionBonos = activePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount || p.price || p.amount) || 0;
        return sum + inv;
    }, 0);

    // 2. Diferencial de Preventa (Projected Gain for Active, evaluated per piggy cohort)
    const diferencialPreventa = activePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount || p.price || p.amount) || 0;
        const extraRoi = parseFloat(p.extra_roi_bonus || p.extra_roi) || 0;
        const pBaseRoi = p.baseROI ?? calculateBaseROI(piggyCount, p.plan_version || resolvePiggyPlanVersion(p));
        const totalReturn = calculateTotalReturn(inv, pBaseRoi, extraRoi);
        const gain = totalReturn - inv;
        return sum + (isNaN(gain) ? 0 : Math.max(0, gain));
    }, 0);

    // 3. Disponible (Finished Cycles Total Value)
    const disponible = availablePiggies.reduce((sum, p) => {
        if (p.final_return_amount && !isNaN(p.final_return_amount)) {
            return sum + parseFloat(p.final_return_amount);
        }
        const inv = parseFloat(p.investment_amount || p.price || p.amount) || 0;
        const extraRoi = parseFloat(p.extra_roi_bonus || p.extra_roi) || 0;
        const pBaseRoi = p.baseROI ?? calculateBaseROI(Math.max(1, piggyCount), p.plan_version || resolvePiggyPlanVersion(p));
        const totalReturn = calculateTotalReturn(inv, pBaseRoi, extraRoi);
        return sum + (isNaN(totalReturn) ? 0 : totalReturn);
    }, 0);

    // 4. Ciclo de cierre cercano (Min days left) & Progress
    let nextCloseDays = null;
    let nextCloseProgress = 0;

    if (activePiggies.length > 0) {
        const closestPiggy = activePiggies.reduce((prev, curr) =>
            ((prev.daysLeft ?? 152) < (curr.daysLeft ?? 152)) ? prev : curr
        );
        nextCloseDays = closestPiggy.daysLeft ?? 122;
        nextCloseProgress = closestPiggy.progress ?? 0;
    }

    return {
        totalPiggies: validPiggies.length,
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
 * Buy a piggy from the marketplace.
 * Uses V2 cycle durations: 122 days for Estándar/Avanzado, 152 days for Dorado/Premium.
 * @param {Object} item - The marketplace item
 * @param {string|null} customName - Optional custom name for the piggy
 * @param {string|null} contractUrl - Optional URL of the signed contract PDF
 */
export async function buyMarketplaceItem(item, customName = null, contractUrl = null, customContractCode = null) {
    const rawCat = String(item.category || 'estandar').toLowerCase();
    const CYCLE_TOTAL_DAYS = getCategoryCycleDays(rawCat, 'v2_2026', item.cycle_days || item.cycleTotalDays);
    const currentMonth = item.currentMonth || item.current_month || 1;
    let daysRemaining = item.daysRemaining || item.days_remaining;
    if (!daysRemaining || daysRemaining <= 0) {
        const daysElapsed = item.daysAdvanced ?? item.days_advanced ?? (rawCat.includes('30') ? 30 : rawCat.includes('15') ? 15 : 0);
        daysRemaining = Math.max(1, CYCLE_TOTAL_DAYS - daysElapsed);
    }
    const finalName = customName || item.piggy_name || item.item_name || item.name || 'Tu Piggy';
    const stage = currentMonth >= 4 ? 3 : currentMonth >= 2 ? 2 : 1;
    const defaultPhotoNum = item.id ? (((Number(item.id) - 1) % 5) + 1) : 1;
    const finalImageUrl = item.image_url || item.imageUrl || `assets/piggies/stage${stage}/et${stage}-${defaultPhotoNum}.jpg`;

    const fixedEndDateStr = item.fixed_end_date || item.fixedEndDate;
    let calculatedEndDate;
    if (fixedEndDateStr && !isNaN(new Date(fixedEndDateStr).getTime())) {
        calculatedEndDate = new Date(fixedEndDateStr).toISOString();
    } else {
        calculatedEndDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * daysRemaining).toISOString();
    }

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

    const effectiveExtraRoi = rawCat === 'premium' ? 0.04 : (rawCat === 'dorado' || rawCat === 'gold') ? 0.02 : (item.extra_roi || 0);

    if (isUsingMockData()) {
        const mockId = `mock-${Date.now()}`;
        const finalWeight = parseFloat(item.final_weight) || getCategoryFinalWeight(rawCat, mockId, 'v2_2026');
        const daysElapsed = Math.max(0, CYCLE_TOTAL_DAYS - daysRemaining);
        const currentWeight = item.current_weight || (daysElapsed > 0 ? Number((6.0 + (finalWeight - 6.0) * (daysElapsed / CYCLE_TOTAL_DAYS)).toFixed(1)) : 6.0);
        const newPiggy = {
            id: mockId,
            user_id: 'mock-user',
            name: finalName,
            status: 'engorde',
            purchase_date: new Date().toISOString(),
            end_date: calculatedEndDate,
            fixed_end_date: fixedEndDateStr || null,
            investment_amount: item.price,
            extra_roi_bonus: effectiveExtraRoi,
            category: rawCat,
            plan_version: 'v2_2026',
            cycle_days: CYCLE_TOTAL_DAYS,
            current_weight: currentWeight,
            final_weight: finalWeight,
            contract_url: contractUrl || '/contracts/contrato_base.pdf',
            image_url: finalImageUrl,
            contract_code: calculatedCode || `#${mockId.slice(-6).toUpperCase()}`,
        };
        MOCK_PIGGIES.unshift(newPiggy);

        // Reduce local stock reference for immediate UI feedback
        if (item.stock > 0) item.stock--;
        await updateItemStock(item.id, 1);
        return enrichPiggyData(newPiggy);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    let rpcData = null;
    let rpcError = null;

    if (item?.id !== undefined && item?.id !== null) {
        // Attempt 1: Call buy_piggy with 9 parameters
        try {
            const res9 = await client.rpc('buy_piggy', {
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

            if (!res9.error && res9.data) {
                rpcData = res9.data;
            } else if (res9.error) {
                const errMsg = String(res9.error?.message || '').toLowerCase();
                const isSignatureMismatch = errMsg.includes('function') || errMsg.includes('schema cache') || errMsg.includes('argument') || errMsg.includes('pgrst202') || res9.error?.code === 'PGRST202';
                
                if (isSignatureMismatch) {
                    // Attempt 2: Call buy_piggy with 7 legacy parameters
                    const res7 = await client.rpc('buy_piggy', {
                        p_item_id: item.id,
                        p_user_id: user.id,
                        p_price: item.price,
                        p_item_name: finalName,
                        p_extra_roi: item.extra_roi || 0,
                        p_category: item.category || 'estandar',
                        p_current_month: currentMonth,
                    });

                    if (!res7.error && res7.data) {
                        rpcData = res7.data;
                    } else {
                        rpcError = res7.error || res9.error;
                    }
                } else {
                    rpcError = res9.error;
                }
            }
        } catch (rpcCatch) {
            console.warn('[buyMarketplaceItem] RPC buy_piggy execution error:', rpcCatch);
            rpcError = rpcCatch;
        }
    }

    // Case 1: RPC succeeded
    if (rpcData) {
        let parsedRpcData = rpcData;
        if (typeof parsedRpcData === 'string') {
            try {
                parsedRpcData = JSON.parse(parsedRpcData);
            } catch (parseErr) {
                const trimmed = parsedRpcData.trim();
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
                    parsedRpcData = { piggy_id: trimmed, success: true };
                }
            }
        }

        if (parsedRpcData?.new_balance !== undefined && parsedRpcData?.new_balance !== null) {
            const curProf = AppState.get('profile') || {};
            AppState.set({ profile: { ...curProf, wallet_balance: Number(parsedRpcData.new_balance) } });
        }

        const createdPiggyId = parsedRpcData?.piggy_id
            || parsedRpcData?.id
            || parsedRpcData?.new_piggy_id
            || parsedRpcData?.piggy?.id
            || (typeof parsedRpcData === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsedRpcData.trim()) ? parsedRpcData.trim() : null);

        if (createdPiggyId) {
            const updatePayload = {
                end_date: calculatedEndDate,
                extra_roi_bonus: effectiveExtraRoi,
                category: rawCat,
            };
            if (contractUrl) updatePayload.contract_url = contractUrl;
            if (calculatedCode) updatePayload.contract_code = calculatedCode;
            if (finalImageUrl) updatePayload.image_url = finalImageUrl;

            const finalWeight = parseFloat(item.final_weight) || getCategoryFinalWeight(rawCat, createdPiggyId, 'v2_2026');
            if (finalWeight) updatePayload.final_weight = finalWeight;

            if (Object.keys(updatePayload).length > 0) {
                try {
                    await client.from('piggies').update(updatePayload).eq('id', createdPiggyId);
                } catch (e) {
                    console.warn('[buyMarketplaceItem] No se pudo actualizar metadata en piggy creado vía RPC:', e);
                }
            }

            let createdPiggy = null;
            try {
                createdPiggy = await getPiggyById(createdPiggyId);
            } catch (fetchErr) {
                console.warn('[buyMarketplaceItem] getPiggyById warning, sintetizando objeto local enriquecido:', fetchErr);
            }

            if (createdPiggy) {
                createdPiggy.walletDeducted = true;
                return createdPiggy;
            }

            // Fallback sintético en memoria para respuesta inmediata sin reinsertar
            const synthetic = enrichPiggyData({
                id: createdPiggyId,
                user_id: user.id,
                name: finalName,
                investment_amount: item.price,
                status: 'engorde',
                extra_roi_bonus: effectiveExtraRoi,
                category: rawCat,
                plan_version: 'v2_2026',
                cycle_days: CYCLE_TOTAL_DAYS,
                current_weight: item.current_weight || 6.0,
                final_weight: finalWeight,
                purchase_date: new Date().toISOString(),
                end_date: calculatedEndDate,
                fixed_end_date: fixedEndDateStr || null,
                image_url: finalImageUrl,
                contract_url: contractUrl,
                contract_code: calculatedCode || `#${String(createdPiggyId).slice(-6).toUpperCase()}`
            });
            synthetic.walletDeducted = true;
            return synthetic;
        }

        // Si rpcData es válido pero no expuso el ID directamente, buscar el último Piggy creado en los últimos 10s
        try {
            const { data: recentPiggies } = await client
                .from('piggies')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (recentPiggies && recentPiggies.length > 0) {
                const latest = enrichPiggyData(recentPiggies[0]);
                latest.walletDeducted = true;
                return latest;
            }
        } catch (recentErr) {
            console.warn('[buyMarketplaceItem] Error consultando piggies recientes:', recentErr);
        }

        // Si el RPC se ejecutó pero no pudimos resolver el ID, no ejecutar fallback para evitar duplicados
        console.warn('[buyMarketplaceItem] RPC buy_piggy finalizó exitosamente. Evitando inserción duplicada en fallback.');
        return enrichPiggyData({
            id: `pgy-${Date.now()}`,
            user_id: user.id,
            name: finalName,
            investment_amount: item.price,
            status: 'engorde',
            extra_roi_bonus: effectiveExtraRoi,
            category: rawCat,
            plan_version: 'v2_2026',
            cycle_days: CYCLE_TOTAL_DAYS,
            current_weight: item.current_weight || 6.0,
            final_weight: parseFloat(item.final_weight) || getCategoryFinalWeight(rawCat, null, 'v2_2026'),
            purchase_date: new Date().toISOString(),
            end_date: calculatedEndDate,
            fixed_end_date: fixedEndDateStr || null,
            image_url: finalImageUrl,
            contract_url: contractUrl,
            contract_code: calculatedCode || `#${Date.now().toString().slice(-6)}`,
            walletDeducted: true
        });
    }

    // If RPC returned a specific business rule rejection, propagate it immediately
    if (rpcError) {
        const rawMsg = String(rpcError.message || '');
        if (rawMsg.includes('Saldo insuficiente')) {
            throw new Error('Saldo insuficiente en tu Cuenta Agro para realizar esta compra.');
        }
        if (rawMsg.includes('stock') || rawMsg.includes('Stock')) {
            throw new Error('El Piggy seleccionado ya no cuenta con stock disponible.');
        }
        if (rawMsg.includes('Suplantación') || rawMsg.includes('autenticado')) {
            throw new Error('Error de autenticación al procesar la compra. Por favor inicia sesión nuevamente.');
        }
        console.warn('buy_piggy RPC no completó la operación, ejecutando fallback transaccional seguro:', rpcError);
    }

    // Case 2: Direct Transactional Fallback (Solo si RPC no existía o falló completamente)
    console.log('[buyMarketplaceItem] Ejecutando compra mediante fallback transaccional directo...');

    // 0. Guardia de idempotencia: Verificar si ya existe un Piggy con el mismo nombre y usuario creado en los últimos 10 segundos
    try {
        const { data: existingRecent } = await client
            .from('piggies')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', finalName)
            .gte('created_at', new Date(Date.now() - 10000).toISOString())
            .limit(1);

        if (existingRecent && existingRecent.length > 0) {
            console.warn('[buyMarketplaceItem] Piggy ya registrado recientemente en DB, evitando inserción duplicada en fallback.');
            const existing = enrichPiggyData(existingRecent[0]);
            existing.walletDeducted = true;
            return existing;
        }
    } catch (idempErr) {
        console.warn('[buyMarketplaceItem] Idempotency check warning:', idempErr);
    }

    // 1. Validate user balance
    const { data: profileData, error: profError } = await client
        .from('profiles')
        .select('wallet_balance, full_name')
        .eq('id', user.id)
        .single();

    if (profError || !profileData) {
        throw new Error('No se pudo verificar el saldo de tu cuenta. Por favor verifica tu conexión.');
    }

    const currentBal = Number(profileData.wallet_balance) || 0;
    if (currentBal < item.price) {
        throw new Error(`Saldo insuficiente en tu Cuenta Agro para comprar este Piggy (${formatCOP(item.price)}). Tu saldo actual es ${formatCOP(currentBal)}.`);
    }

    // 2. Compute parameters
    const finalWeight = parseFloat(item.final_weight) || getCategoryFinalWeight(rawCat, null, 'v2_2026');
    const daysElapsed = Math.max(0, CYCLE_TOTAL_DAYS - daysRemaining);
    const fallbackCode = calculatedCode || `#${Date.now().toString().slice(-6)}`;

    // 3. Insert into piggies
    const insertPayload = {
        user_id: user.id,
        name: finalName,
        investment_amount: item.price,
        status: 'engorde',
        extra_roi_bonus: effectiveExtraRoi,
        category: rawCat,
        plan_version: 'v2_2026',
        cycle_days: CYCLE_TOTAL_DAYS,
        current_weight: item.current_weight || (daysElapsed > 0 ? Number((6.0 + (finalWeight - 6.0) * (daysElapsed / CYCLE_TOTAL_DAYS)).toFixed(1)) : 6.0),
        final_weight: finalWeight,
        purchase_date: new Date().toISOString(),
        end_date: calculatedEndDate,
        fixed_end_date: fixedEndDateStr || null,
        image_url: finalImageUrl,
        contract_url: contractUrl,
        contract_code: fallbackCode
    };

    let newPiggyRecord = null;
    const { data: newPiggyData, error: insertError } = await client
        .from('piggies')
        .insert(insertPayload)
        .select()
        .single();

    if (insertError) {
        console.warn('Error insertando piggy con todos los campos en fallback, reintentando con campos esenciales:', insertError);
        delete insertPayload.contract_code;
        delete insertPayload.final_weight;
        delete insertPayload.fixed_end_date;
        delete insertPayload.plan_version;
        delete insertPayload.cycle_days;
        const { data: retryData, error: retryErr } = await client
            .from('piggies')
            .insert(insertPayload)
            .select()
            .single();

        if (retryErr) {
            throw new Error(`Error al registrar el Piggy: ${retryErr.message || 'Error de base de datos'}`);
        }
        newPiggyRecord = retryData;
    } else {
        newPiggyRecord = newPiggyData;
    }

    // 4. Decrement marketplace stock reliably
    if (item?.id !== undefined && item?.id !== null) {
        try {
            await updateItemStock(item.id, 1);
            if (item.stock !== undefined && item.stock > 0) {
                item.stock = Math.max(0, item.stock - 1);
            }
        } catch (mErr) {
            console.warn('[buyMarketplaceItem] No se pudo actualizar stock en marketplace:', mErr);
        }
    }

    // 5. Deduct wallet balance cleanly
    const deductRes = await deductWalletBalance(item.price, `Débito: compra de Piggy "${finalName}"`);
    if (!deductRes.success) {
        console.warn('[buyMarketplaceItem] Deduct wallet balance warning:', deductRes.reason);
    }

    const enriched = enrichPiggyData(newPiggyRecord);
    if (enriched) enriched.walletDeducted = true;
    return enriched;
}