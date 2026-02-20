/* ============================================
   PIGGY APP — Piggies Service
   Handles fetching and managing user's piggies
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_PIGGIES, enrichPiggyData, MOCK_USER_PROFILE } from './mockData.js';

/**
 * Fetch all piggies for the current user.
 */
export async function getUserPiggies() {
    if (isUsingMockData()) {
        // Return mock data enriched with calculations
        return MOCK_PIGGIES.map(enrichPiggyData);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) return [];

    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching piggies:', error);
        return [];
    }

    return data.map(enrichPiggyData);
}

/**
 * Get a single piggy by ID.
 */
export async function getPiggyById(id) {
    if (isUsingMockData()) {
        const piggy = MOCK_PIGGIES.find(p => p.id === id);
        return piggy ? enrichPiggyData(piggy) : null;
    }

    const client = getClient();
    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching piggy:', error);
        return null;
    }

    return enrichPiggyData(data);
}

/**
 * Calculate Dashboard Stats
 * - Total Active Piggies
 * - Total Investment (Adquisición Bonos)
 * - Projected Value (Diferencial Preventa)
 * - Available for Withdraw (Liquidated)
 */
export function calculateBaseROI(activeCount) {
    // Base logic: 6% for 1st, +0.5% for each additional
    if (activeCount === 0) return 0;
    const base = 0.06;
    const increment = 0.005;
    // For 1 piggy: 6%
    // For 2 piggies: 6.5%
    // For 3: 7.0%, etc.
    return base + ((activeCount - 1) * increment);
}

function calculateTotalReturn(amount, baseROI, extraBonus = 0) {
    return amount * (1 + baseROI + extraBonus);
}

export function formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatPercentage(value) {
    return (value * 100).toFixed(1) + '%';
}

/**
 * Compute main stats for the dashboard
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

/**
 * Handle "Solicitar Entrega de Carne" or Withdraw
 * Actually, this just updates user balance or logs for now.
 * Real implementation would need a new table 'transactions' or 'withdrawals'.
 */
export async function requestWithdraw(amount) {
   // This would call an RPC or insert into 'withdrawals' table
   // returning success
   await new Promise(r => setTimeout(r, 1000));
   return true;
}
