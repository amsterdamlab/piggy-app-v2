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
    return (data || []).map(enrichPiggyData);
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
            investment_amount: 250000,
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
    const progress = getProgressPercentage(piggy.purchase_date, piggy.end_date);
    const daysLeft = getDaysRemaining(piggy.end_date);
    const weight = simulateWeight(progress);
    const isComplete = progress >= 100 || piggy.status === 'completado';

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
    const activePiggies = piggies.filter((p) => p.status === 'engorde');
    const completedPiggies = piggies.filter((p) => p.status === 'liquidado');
    const piggyCount = activePiggies.length;
    const baseROI = calculateBaseROI(piggyCount);

    const totalInvestment = activePiggies.reduce(
        (sum, p) => sum + (p.investment_amount || 0),
        0
    );

    const walletPiggyTotal = activePiggies.reduce((sum, p) => {
        const totalReturn = calculateTotalReturn(
            p.investment_amount,
            baseROI,
            p.extra_roi_bonus || 0
        );
        return sum + totalReturn;
    }, 0) + completedPiggies.reduce((sum, p) => sum + (p.final_return_amount || 0), 0);

    return {
        activeCount: piggyCount,
        finishedCount: completedPiggies.length, // Added finished count
        totalInvestment,
        walletPiggyTotal, // Replaced projectedGain with walletPiggyTotal (Capital + Yield)
        walletPiggyTotalFormatted: formatCOP(walletPiggyTotal),
        baseROI,
        baseROIFormatted: formatPercentage(baseROI),
    };
}

// Re-export utility functions for use in views
export { calculateBaseROI, calculateTotalReturn, formatCOP, formatPercentage, getDaysRemaining };