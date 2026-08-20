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

    // Sincronizar los pesos reales en base de datos antes de consultar
    if (user) {
        const { error: syncError } = await client.rpc('sync_piggy_weights', { p_user_id: user.id });
        if (syncError) console.warn('Sync weight error:', syncError);
    }

    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Error fetching piggies:', error);
        return [];
    }

    // Auto-persist completion status for expired piggies
    await markExpiredPiggies(user.id);

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
    if (!user) throw new Error('User not logged in');

    const insertPayload = {
        user_id: user.id,
        name: piggyName,
        investment_amount: 1000000,
        status: 'engorde',
        current_weight: 15.0,
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
        // If contract_url or image_url column doesn't exist yet, retry without non-essential fields
        delete insertPayload.contract_url;
        delete insertPayload.image_url;
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

    // Fixed cycle duration in days (4 months 3 weeks)
    const CYCLE_TOTAL_DAYS = 143;

    // Calculate days remaining with fallback
    const endDateStr = piggy.end_date || piggy.endDate || piggy.purchase_date;
    let daysLeft = getDaysRemaining(endDateStr);
    if (isNaN(daysLeft)) daysLeft = 143;

    // Calculate progress based on REVERSE logic (143 - daysLeft)
    // This allows piggies bought at "Month 3" to show correct 60% progress immediately
    const daysElapsed = Math.max(0, CYCLE_TOTAL_DAYS - daysLeft);
    let progress = Math.round((daysElapsed / CYCLE_TOTAL_DAYS) * 100);
    if (isNaN(progress)) progress = 0;
    progress = Math.min(100, Math.max(0, progress));

    // Use DB weight if it exists and is meaningful (>15), otherwise simulate it from progress
    const dbWeight = parseFloat(piggy.current_weight || piggy.weight);
    const weight = (dbWeight && !isNaN(dbWeight) && dbWeight > 15)
        ? dbWeight
        : simulateWeight(progress);

    const isComplete = progress >= 100 || piggy.status === 'completado' || daysLeft === 0;

    // Determine current growth stage
    let currentStage;
    if (isComplete || daysElapsed > 90) {
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
        progress,
        daysLeft,
        currentWeight: (isNaN(weight) ? 15 : weight).toFixed(1),
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
 */
export async function getDashboardStats(piggies = []) {
    const validPiggies = (piggies || []).filter(Boolean);
    const activePiggies = validPiggies.filter((p) => !p.isComplete);
    const availablePiggies = validPiggies.filter((p) => p.isComplete);

    const piggyCount = activePiggies.length;
    const baseROI = calculateBaseROI(piggyCount);

    // 1. Adquisición Bonos de Preventa (Active Investment)
    const adquisicionBonos = activePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount) || 0;
        return sum + inv;
    }, 0);

    // 2. Diferencial de Preventa (Projected Gain for Active)
    const diferencialPreventa = activePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount) || 0;
        const extraRoi = parseFloat(p.extra_roi_bonus) || 0;
        const totalReturn = calculateTotalReturn(inv, baseROI, extraRoi);
        const gain = totalReturn - inv;
        return sum + (isNaN(gain) ? 0 : Math.max(0, gain));
    }, 0);

    // 3. Disponible (Finished Cycles Total Value)
    const disponible = availablePiggies.reduce((sum, p) => {
        if (p.final_return_amount && !isNaN(p.final_return_amount)) {
            return sum + parseFloat(p.final_return_amount);
        }
        const inv = parseFloat(p.investment_amount) || 0;
        const extraRoi = parseFloat(p.extra_roi_bonus) || 0;
        const totalReturn = calculateTotalReturn(inv, baseROI, extraRoi);
        return sum + (isNaN(totalReturn) ? 0 : totalReturn);
    }, 0);

    // 4. Ciclo de cierre cercano (Min days left) & Progress
    let nextCloseDays = null;
    let nextCloseProgress = 0;

    if (activePiggies.length > 0) {
        const closestPiggy = activePiggies.reduce((prev, curr) =>
            (prev.daysLeft < curr.daysLeft) ? prev : curr
        );
        nextCloseDays = closestPiggy.daysLeft;
        nextCloseProgress = closestPiggy.progress;
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
 * The current_month of the item determines how many days remain in the cycle.
 * @param {Object} item - The marketplace item
 * @param {string|null} customName - Optional custom name for the piggy
 * @param {string|null} contractUrl - Optional URL of the signed contract PDF
 */
export async function buyMarketplaceItem(item, customName = null, contractUrl = null, customContractCode = null) {
    // Calculate days remaining based on current_month (matches marketplaceService logic)
    const CYCLE_TOTAL_DAYS = 143;
    const currentMonth = item.currentMonth || item.current_month || 1;
    const daysElapsed = Math.max(0, (currentMonth - 1) * 30);
    const daysRemaining = Math.max(1, CYCLE_TOTAL_DAYS - daysElapsed);
    const finalName = customName || item.item_name;
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
            category: item.category,
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
        p_category: item.category || 'standard',
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
