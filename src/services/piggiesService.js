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
    const { data, error } = await client
        .from('piggies')
        .select('*')
        .order('purchase_date', { ascending: false });

    if (error) throw new Error(error.message);
    const piggies = (data || []).map(enrichPiggyData);

    // Auto-persist completion status for expired piggies
    await markExpiredPiggies(client, piggies);

    return piggies;
}

/**
 * Find piggies whose end_date has passed but status is still 'engorde',
 * and update them to 'completado' in the DB.
 * The DB trigger (trg_handle_piggy_completion) handles ROI calculation
 * and wallet_balance credit automatically.
 * @param {Object} client - Supabase client
 * @param {Array}  piggies - Already-enriched piggies array
 */
async function markExpiredPiggies(client, piggies) {
    const expiredIds = piggies
        .filter(p => p.isComplete && p.status !== 'completado')
        .map(p => p.id);

    if (expiredIds.length === 0) return;

    const { error } = await client
        .from('piggies')
        .update({ status: 'completado' })
        .in('id', expiredIds)
        .neq('status', 'completado'); // Safety guard: never re-trigger

    if (error) {
        console.warn('markExpiredPiggies: could not update status', error.message);
    }
}

/**
 * Get a single piggy by ID.
 */
export async function getPiggyById(piggyId) {
    if (isUsingMockData()) {
        const piggy = MOCK_PIGGIES.find((p) => p.id === piggyId);
        return piggy ? enrichPiggyData(piggy) : null;
    }

    const client = getClient();
    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('id', piggyId)
        .single();

    if (error) throw new Error(error.message);
    return data ? enrichPiggyData(data) : null;
}

/**
 * Adopt a new piggy.
 */
export async function adoptPiggy(piggyName) {
    if (isUsingMockData()) {
        const newPiggy = {
            id: `mock-${Date.now()}`,
            user_id: 'mock-user',
            name: piggyName,
            status: 'engorde',
            purchase_date: new Date().toISOString(),
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

    // 3. Disponible — kept for reference but wallet_balance from DB is the source of truth
    const disponible = availablePiggies.reduce((sum, p) => {
        if (p.final_return_amount) return sum + p.final_return_amount;
        const totalReturn = calculateTotalReturn(p.investment_amount, baseROI, p.extra_roi_bonus || 0);
        return sum + totalReturn;
    }, 0);

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
 */
export async function buyMarketplaceItem(item, customName = null) {
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
        if (item.stock > 0) item.stock--;
        return enrichPiggyData(newPiggy);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

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

    if (rpcData && rpcData.piggy_id) {
        return getPiggyById(rpcData.piggy_id);
    }

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
