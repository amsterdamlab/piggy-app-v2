/* ============================================
   PIGGY APP — Piggies Service
   Manages piggy CRUD and ROI calculations
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_PIGGIES } from './mockData.js';
export {
    calculateBaseROI,
    calculateTotalReturn,
    getProgressPercentage,
    getDaysRemaining,
    simulateWeight,
    getPiggyGrowthStage,
    formatCOP,
    formatPercentage,
} from './mockData.js';

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
export async function adoptPiggy(piggyName) {
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
        };
        MOCK_PIGGIES.unshift(newPiggy);
        return enrichPiggyData(newPiggy);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('User not logged in');

    const { data, error } = await client
        .from('piggies')
        .insert({
            user_id: user.id,
            name: piggyName,
            investment_amount: 1000000,
            status: 'engorde',
            current_weight: 15.0,
            // purchase_date and end_date calculate automatically in DB default or trigger, 
            // but let's rely on default for purchase_date. 
            // end_date default is 4mo3wk from now in schema.
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return enrichPiggyData(data);
}

/**
 * Create a piggy (alias for adoptPiggy).
 */
export async function createPiggy({ name, amount = 1000000, durationMonths = 3, extraRoi = 0 }) {
    return adoptPiggy(name);
}

/**
 * Buy a piggy or booster item from marketplace.
 * Uses secure Supabase RPC `buy_marketplace_item` to process payment,
 * check wallet balance, verify stock, and create the piggy atomically.
 */
export async function buyMarketplaceItem(item, selectedPiggyId = null) {
    if (isUsingMockData()) {
        if (item.category === 'booster' && selectedPiggyId) {
            const piggy = MOCK_PIGGIES.find(p => p.id === selectedPiggyId);
            if (piggy) piggy.extra_roi_bonus = (piggy.extra_roi_bonus || 0) + item.extra_roi;
            return { success: true, message: `Acelerador aplicado a ${piggy?.name}` };
        }
        return createPiggy({
            name: `${item.item_name} #${MOCK_PIGGIES.length + 1}`,
            amount: item.price,
            durationMonths: 3,
            extraRoi: item.extra_roi,
        });
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await client.rpc('buy_marketplace_item', {
        p_item_id: item.id,
        p_target_piggy_id: selectedPiggyId,
    });

    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.message || 'Error en la compra');

    return data;
}

/**
 * Generate a consistent photo number (1 to 5) for a given piggy ID.
 * Avoids pure random changes on every render while keeping variety.
 */
function getPiggyPhotoNumber(piggyId) {
    let hash = 0;
    const str = String(piggyId || 'default');
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (Math.abs(hash) % 5) + 1;
}

/**
 * Helper to generate image path based on growth stage (1, 2, or 3)
 */
function getPiggyImageForStage(piggyId, daysElapsed) {
    let stage = 1;
    if (daysElapsed > 90) {
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
 * Enrich a piggy record with computed fields for display.
 */
function enrichPiggyData(piggy) {
    // Fixed cycle duration in days (4 months 3 weeks)
    const CYCLE_TOTAL_DAYS = 143;

    // Calculate days remaining
    const daysLeft = getDaysRemaining(piggy.end_date);

    // Calculate progress based on REVERSE logic (143 - daysLeft)
    // This allows piggies bought at "Month 3" to show correct 60% progress immediately
    const daysElapsed = Math.max(0, CYCLE_TOTAL_DAYS - daysLeft);
    const progress = Math.min(100, Math.max(0, Math.round((daysElapsed / CYCLE_TOTAL_DAYS) * 100)));

    // Use DB weight if it exists and is meaningful (>15), otherwise simulate it from progress
    const dbWeight = parseFloat(piggy.current_weight);
    const weight = (dbWeight && dbWeight > 15)
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

    let imageUrl = piggy.image_url;

    if (imageUrl) {
        if (!imageUrl.startsWith('http')) {
            // If it's a standard pattern like 'assets/piggies/stageX/etX-Y.jpg',
            // we dynamically update the stage X to match the actual current growth stage!
            // This ensures the piggy GROWING works automatically while keeping the photo number Y!
            const match = imageUrl.match(/assets\/piggies\/stage\d\/et\d-(\d)\.jpg/);
            if (match) {
                const photoNum = match[1];
                imageUrl = `assets/piggies/stage${currentStage}/et${currentStage}-${photoNum}.jpg`;
            }
        }
    } else {
        // Fallback in case image_url is empty in DB
        const photoNum = getPiggyPhotoNumber(piggy.id);
        imageUrl = `assets/piggies/stage${currentStage}/et${currentStage}-${photoNum}.jpg`;
    }

    // Ensure it uses local absolute paths (/assets/piggies/...) to load directly from Vercel/localhost
    // This resolves rate-limiting and loading latency errors from GitHub Raw
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = '/' + imageUrl;
    }

    console.log("🐷 [enrichPiggyData] Piggy:", {
        id: piggy.id,
        name: piggy.name,
        db_image_url: piggy.image_url,
        final_imageUrl: imageUrl,
        daysElapsed,
        currentStage,
        isComplete
    });

    const piggyName = piggy.name || `Piggy #${piggy.id.slice(-4)}`;
    const growthStage = getPiggyGrowthStage(progress, piggyName);

    return {
        ...piggy,
        progress,
        daysLeft,
        currentWeight: weight.toFixed(1),
        isComplete,
        imageUrl,
        name: piggyName,
        growthStage,
    };
}

/**
 * Get summary stats for the dashboard.
 */
export async function getDashboardStats(piggies) {
    const activePiggies = piggies.filter((p) => !p.isComplete);
    const availablePiggies = piggies.filter((p) => p.isComplete);

    const piggyCount = activePiggies.length;
    // Calculate global ROI based on total active count
    const baseROI = calculateBaseROI(piggyCount);

    const totalInvestment = activePiggies.reduce((sum, p) => sum + p.investment_amount, 0);

    // Dynamic total return: sum of (investment * (baseROI + extra_roi_bonus)) for each active piggy
    const totalProjectedReturn = activePiggies.reduce((sum, p) => {
        const itemROI = baseROI + (p.extra_roi_bonus || 0);
        return sum + (p.investment_amount * (1 + itemROI));
    }, 0);

    const totalEstimatedGain = totalProjectedReturn - totalInvestment;

    const baseROIFormatted = formatPercentage(baseROI);

    return {
        totalPiggies: piggies.length,
        activeCount: activePiggies.length,
        availableCount: availablePiggies.length,
        totalInvestment,
        totalInvestmentFormatted: formatCOP(totalInvestment),
        totalProjectedReturn,
        totalProjectedReturnFormatted: formatCOP(totalProjectedReturn),
        totalEstimatedGain,
        totalEstimatedGainFormatted: formatCOP(totalEstimatedGain),
        baseROI,
        baseROIFormatted,
        adquisicionBonosFormatted: formatCOP(totalInvestment),
        margenComercialFormatted: formatCOP(totalEstimatedGain),
        pagoFinalFormatted: formatCOP(totalProjectedReturn),
    };
}
