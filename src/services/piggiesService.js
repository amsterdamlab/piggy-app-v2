/* ============================================
   PIGGY APP — Piggies Service
   Manages user piggies, growth stages, ROI calculation,
   and Marketplace purchases.
   ============================================ */

import { getClient } from '../supabase.js';
import {
    MOCK_PIGGIES,
    isUsingMockData,
    calculateBaseROI,
    calculateTotalReturn,
    getProgressPercentage,
    getDaysRemaining,
    simulateWeight,
    getPiggyGrowthStage,
    formatCOP,
    formatPercentage,
} from './mockData.js';

// Photo counters per stage for deterministic assignment
const STAGE_PHOTO_COUNTS = { 1: 5, 2: 5, 3: 4 };

/**
 * Deterministic photo index helper based on piggy ID
 */
function getPiggyPhotoNumber(id) {
    const numericHash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (numericHash % 4) + 1;
}

/**
 * Fetch all piggies for the current user.
 * Auto-marks expired piggies as 'completado' in DB so the trigger
 * can calculate ROI and credit wallet_balance automatically.
 */
export async function getUserPiggies() {
    if (isUsingMockData()) {
        return MOCK_PIGGIES.map(enrichPiggyData).filter(Boolean);
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
    return (data || []).map(enrichPiggyData).filter(Boolean);
}

/**
 * Identify piggies that have passed their end_date and mark them as complete.
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
        })
        .select()
        .single();

    if (error) throw error;
    return enrichPiggyData(data);
}

/**
 * Create a piggy directly (Legacy support)
 */
export async function createPiggy(data) {
    return adoptPiggy(data.name || 'Nuevo Piggy');
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
        if (!imageUrl.startsWith('http')) {
            const match = imageUrl.match(/assets\/piggies\/stage\d\/et\d-(\d)\.jpg/);
            if (match) {
                const photoNum = match[1];
                imageUrl = `assets/piggies/stage${currentStage}/et${currentStage}-${photoNum}.jpg`;
            }
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
