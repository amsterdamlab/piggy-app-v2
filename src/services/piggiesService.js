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
 * The DB trigger `handle_piggy_completion` will automatically calculate ROI 
 * and credit the wallet.
 * @param {string} userId 
 */
export async function markExpiredPiggies(userId) {
    if (isUsingMockData()) return;

    const client = getClient();
    
    // Find piggies that are still "engorde" but end_date has passed
    const { data: expiredPiggies, error: fetchError } = await client
        .from('piggies')
        .select('id, end_date')
        .eq('user_id', userId)
        .eq('status', 'engorde')
        .lte('end_date', new Date().toISOString());

    if (fetchError) {
        console.warn('Error fetching expired piggies:', fetchError);
        return;
    }

    if (!expiredPiggies || expiredPiggies.length === 0) return;

    // Mark them as "completado"
    // Using Promise.all since we might need to update multiple
    await Promise.all(expiredPiggies.map(async (piggy) => {
        const { error: updateError } = await client
            .from('piggies')
            .update({ status: 'completado' })
            .eq('id', piggy.id);

        if (updateError) {
            console.warn(`Error updating expired piggy ${piggy.id}:`, updateError);
        } else {
            console.log(`✅ Piggy ${piggy.id} cycle completed. Trigger handled wallet credit.`);
        }
    }));
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

    return {
        ...piggy,
        progress,
        daysLeft,
        currentWeight: weight.toFixed(1),
        isComplete,
        name: piggy.name || `Piggy #${piggy.id.slice(-4)}`,
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

    // 1. Adquisición Bonos de Preventa (Active Investment)
    const adquisicionBonos = activePiggies.reduce(
        (sum, p) => sum + (p.investment_amount || 0), 0
    );

    // 2. Diferencial de Preventa (Projected Gain for Active)
    const diferencialPreventa = activePiggies.reduce((sum, p) => {
        const totalReturn = calculateTotalReturn(p.investment_amount, baseROI, p.extra_roi_bonus || 0);
        return sum + (totalReturn - p.investment_amount);
    }, 0);

    // 3. Disponible (Finished Cycles Total Value)
    const disponible = availablePiggies.reduce((sum, p) => {
        // Use stored final amount if exists, else calculate
        if (p.final_return_amount) return sum + p.final_return_amount;
        // Re-calculate return based on when it finished (using same logic)
        const totalReturn = calculateTotalReturn(p.investment_amount, baseROI, p.extra_roi_bonus || 0);
        return sum + totalReturn;
    }, 0);

    // 4. Ciclo de cierre cercano (Min days left) & Progress
    let nextCloseDays = null;
    let nextCloseProgress = 0;

    if (activePiggies.length > 0) {
        // Find piggy with minimum days left (closest to completion)
        const closestPiggy = activePiggies.reduce((prev, curr) =>
            (prev.daysLeft < curr.daysLeft) ? prev : curr
        );
        nextCloseDays = closestPiggy.daysLeft;
        nextCloseProgress = closestPiggy.progress;
    }

    return {
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
    };
}

/**
 * Buy a piggy from the marketplace.
 * The current_month of the item determines how many days remain in the cycle.
 * @param {Object} item - The marketplace item
 * @param {string|null} customName - Optional custom name for the piggy
 */
export async function buyMarketplaceItem(item, customName = null) {
    // Calculate days remaining based on current_month (matches marketplaceService logic)
    const CYCLE_TOTAL_DAYS = 143;
    const currentMonth = item.currentMonth || item.current_month || 1;
    const daysElapsed = Math.max(0, (currentMonth - 1) * 30);
    const daysRemaining = Math.max(1, CYCLE_TOTAL_DAYS - daysElapsed);
    const finalName = customName || item.item_name;

    if (isUsingMockData()) {
        const newPiggy = {
            id: `mock-${Date.now()}`,
            user_id: 'mock-user',
            name: finalName,
            status: 'engorde',
            purchase_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * daysRemaining).toISOString(),
            investment_amount: item.price,
            extra_roi_bonus: item.extra_roi || 0,
            category: item.category,
            current_weight: item.current_weight || 15.0,
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
    // Passes current_month so the DB calculates the correct end_date
    const { data: rpcData, error: rpcError } = await client.rpc('buy_piggy', {
        p_item_id: item.id,
        p_user_id: user.id,
        p_price: item.price,
        p_item_name: finalName,
        p_extra_roi: item.extra_roi || 0,
        p_category: item.category || 'standard',
        p_current_month: currentMonth,
    });

    if (rpcError) {
        console.error('Error crítico en compra (RPC):', rpcError);
        throw new Error('Lo sentimos, no pudimos procesar tu compra. Por favor, verifica tu conexión o el stock disponible e intenta de nuevo.');
    }

    // Success! Fetch the created piggy to return it
    if (rpcData && rpcData.piggy_id) {
        return getPiggyById(rpcData.piggy_id);
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

// Re-export utility functions for use in views
export { calculateBaseROI, calculateTotalReturn, formatCOP, formatPercentage, getDaysRemaining };
