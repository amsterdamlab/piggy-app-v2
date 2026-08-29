/* ============================================
   PIGGY APP — Piggies Service
   Handles fetching, managing, and creating piggies.
   Syncs weights, days elapsed, and automatic cycle completion.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_PIGGIES } from './mockData.js';
import { AppState } from '../state.js';
import { completeMissionOnPurchase } from './missionsService.js';
import { calculateProjectedReturn } from './mockData.js';
import { deductWalletBalance, addWalletBalance } from './walletService.js';

/** Weight configuration constants */
const INITIAL_WEIGHT_KG = 25.0;
const FINAL_WEIGHT_KG = 110.0;
const TOTAL_CYCLE_DAYS = 90;

/** Default image for custom named piggies */
const DEFAULT_PIGGY_IMAGE = 'pig2.jpg';

/**
 * Fallback mapping of ID to image for initial mock data
 */
const PIGGY_IMAGE_MAP = {
    '1': 'pig1.jpg',
    '2': 'pig2.jpg',
    '3': 'pig3.jpg',
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

    // 1. Sincronizar pesos en Supabase según los días reales transcurridos
    try {
        await client.rpc('sync_piggy_weights', { p_user_id: user.id });
    } catch (e) {
        console.warn('RPC sync_piggy_weights error/missing:', e.message);
    }

    // 2. Marcar cerdos que alcanzaron su cycle_duration_days como 'completado'
    //    El trigger 'on_piggy_completed' se activará automáticamente y abonará a wallet_balance
    try {
        await client.rpc('mark_expired_piggies', { p_user_id: user.id });
    } catch (e) {
        console.warn('RPC mark_expired_piggies error/missing:', e.message);
    }

    // 3. Consultar los piggies ya sincronizados
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
 * Fetch a single piggy by ID.
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
        console.warn('Error fetching piggy by id:', error);
        return null;
    }

    return enrichPiggyData(data);
}

/**
 * Calculate dashboard summary statistics.
 */
export async function getDashboardStats(piggies) {
    const activePiggies = piggies.filter((p) => !p.isComplete);
    const completedPiggies = piggies.filter((p) => p.isComplete);

    // Sum total investment
    const totalInvested = activePiggies.reduce((sum, p) => sum + (p.investmentAmount || 0), 0);

    // Sum projected return
    const totalProjected = activePiggies.reduce((sum, p) => sum + (p.projectedReturn || 0), 0);

    // Average progress
    const avgProgress = activePiggies.length > 0
        ? Math.round(activePiggies.reduce((sum, p) => sum + p.progress, 0) / activePiggies.length)
        : 0;

    // Total weight
    const totalWeight = activePiggies.reduce((sum, p) => sum + (p.currentWeight || 0), 0);

    return {
        activeCount: activePiggies.length,
        completedCount: completedPiggies.length,
        totalInvested,
        totalProjected,
        totalGain: totalProjected - totalInvested,
        avgProgress,
        totalWeight: Math.round(totalWeight * 10) / 10,
        baseROI: 0.115, // 11.5%
    };
}

/**
 * Format weight helper (e.g. 52.4 -> "52.4")
 */
export function formatWeight(weight) {
    if (weight === null || weight === undefined) return '0.0';
    return Number(weight).toFixed(1);
}

/**
 * Determine growth phase name based on current weight in kg.
 */
export function getGrowthPhaseName(weight) {
    const w = Number(weight) || 0;
    if (w < 40) return 'Iniciación';
    if (w < 70) return 'Crecimiento';
    if (w < 100) return 'Desarrollo';
    return 'Finalización';
}

/**
 * Determine growth phase description based on current weight in kg.
 */
export function getGrowthPhaseDescription(weight) {
    const w = Number(weight) || 0;
    if (w < 40) return 'Fase de adaptación y desarrollo inicial del lechón.';
    if (w < 70) return 'Crecimiento muscular acelerado con dieta balanceada.';
    if (w < 100) return 'Ganancia óptima de peso y masa corporal.';
    return 'Etapa final previa a la venta con peso comercial alcanzado.';
}

/**
 * Calculate dynamic fields for a piggy based on real calendar days elapsed.
 * Formula: weight = initial_weight + (final_weight - initial_weight) * (days_elapsed / cycle_days)
 */
export function enrichPiggyData(dbPiggy) {
    const initialWeight = parseFloat(dbPiggy.initial_weight) || INITIAL_WEIGHT_KG;
    const targetWeight  = parseFloat(dbPiggy.target_weight)  || FINAL_WEIGHT_KG;
    const cycleDays     = parseInt(dbPiggy.cycle_duration_days) || TOTAL_CYCLE_DAYS;
    const invAmount     = parseFloat(dbPiggy.investment_amount) || 1000000;
    const extraRoi      = parseFloat(dbPiggy.extra_roi_bonus) || 0;
    const baseROI       = 0.115;
    const totalROI      = baseROI + extraRoi;

    // Days elapsed calculation based on purchase/created date
    const startDate = new Date(dbPiggy.purchase_date || dbPiggy.created_at || Date.now());
    const now = new Date();
    const msElapsed = Math.max(0, now.getTime() - startDate.getTime());
    const realDaysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));

    // Cap days elapsed at cycle duration
    const daysElapsed = Math.min(realDaysElapsed, cycleDays);
    const daysLeft = Math.max(0, cycleDays - daysElapsed);

    // Calculate dynamic weight (linear interpolation)
    const weightGainTotal = targetWeight - initialWeight;
    const calculatedWeight = initialWeight + (weightGainTotal * (daysElapsed / cycleDays));
    const currentWeight = Math.min(targetWeight, Math.round(calculatedWeight * 10) / 10);

    // Progress percentage
    const progress = Math.min(100, Math.round((daysElapsed / cycleDays) * 100));

    // Completion status
    const isComplete = dbPiggy.status === 'completado' || daysLeft === 0;

    // Projected return
    const projectedReturn = invAmount * (1 + totalROI);

    return {
        id: dbPiggy.id,
        name: dbPiggy.name || 'Mi Piggy',
        tag: dbPiggy.tag || `PG-${dbPiggy.id ? String(dbPiggy.id).slice(0, 4).toUpperCase() : '001'}`,
        initialWeight,
        targetWeight,
        currentWeight,
        daysElapsed,
        daysLeft,
        progress,
        cycleDurationDays: cycleDays,
        investmentAmount: invAmount,
        projectedReturn,
        extraRoiBonus: extraRoi,
        totalRoi: totalROI,
        status: isComplete ? 'completado' : (dbPiggy.status || 'activo'),
        isComplete,
        imageUrl: dbPiggy.image_url || PIGGY_IMAGE_MAP[dbPiggy.id] || DEFAULT_PIGGY_IMAGE,
        breed: dbPiggy.breed || 'Landrace x Pietrain',
        location: dbPiggy.location || 'Granja Valle Morales · Galpón 3',
        healthStatus: dbPiggy.health_status || 'Excelente',
        purchaseDate: dbPiggy.purchase_date || dbPiggy.created_at,
        estimatedCompletion: calculateCompletionDate(startDate, cycleDays),
        weightGain: Math.max(0, Math.round((currentWeight - initialWeight) * 10) / 10),
        weightRemaining: Math.max(0, Math.round((targetWeight - currentWeight) * 10) / 10),
        feedType: dbPiggy.feed_type || 'Concentrado Premium + Suplemento Vitamínico',
        phase: getGrowthPhaseName(currentWeight),
        phaseDescription: getGrowthPhaseDescription(currentWeight),
        createdAt: dbPiggy.created_at,
    };
}

/**
 * Calculate completion date based on start date and cycle days.
 */
function calculateCompletionDate(startDate, cycleDays) {
    const d = new Date(startDate.getTime());
    d.setDate(d.getDate() + cycleDays);
    return d.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Buy a marketplace item directly using available wallet funds.
 * Deducts wallet_balance atomically in Supabase, creates a new piggy in the DB,
 * and tracks the transaction.
 *
 * @param {Object} item - Marketplace product object
 * @param {string} customName - Name chosen by the user
 * @param {number} extraRoiBonus - Optional extra ROI percentage bonus (e.g. 0.02 for +2%)
 * @returns {Promise<{success: boolean, error?: string, piggy?: Object}>}
 */
export async function buyMarketplaceItem(item, customName, extraRoiBonus = 0) {
    const price = parseFloat(item.price) || 1000000;
    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        return { success: false, error: 'Usuario no autenticado.' };
    }

    if (isUsingMockData()) {
        const deducted = await deductWalletBalance(price, `Compra: Piggy ${customName} (${item.title})`);
        if (!deducted) {
            return { success: false, error: 'Saldo insuficiente en tu Cuenta Agro.' };
        }

        const newPiggy = {
            id: `piggy-${Date.now()}`,
            name: customName,
            user_id: user.id,
            breed: item.title,
            initial_weight: item.weight || INITIAL_WEIGHT_KG,
            target_weight: FINAL_WEIGHT_KG,
            current_weight: item.weight || INITIAL_WEIGHT_KG,
            cycle_duration_days: item.cycleDays || TOTAL_CYCLE_DAYS,
            investment_amount: price,
            extra_roi_bonus: extraRoiBonus,
            status: 'activo',
            image_url: item.imageUrl || DEFAULT_PIGGY_IMAGE,
            location: 'Granja Valle Morales · Galpón 3',
            health_status: 'Excelente',
            purchase_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        MOCK_PIGGIES.unshift(newPiggy);
        await completeMissionOnPurchase();

        const currentPiggies = AppState.get('piggies') || [];
        AppState.set({ piggies: [enrichPiggyData(newPiggy), ...currentPiggies] });

        return { success: true, piggy: enrichPiggyData(newPiggy) };
    }

    // 1. Deduct wallet balance atomically via RPC or walletService
    const deducted = await deductWalletBalance(price, `Compra: Piggy ${customName} (${item.title})`);
    if (!deducted) {
        return { success: false, error: 'Saldo insuficiente en tu Cuenta Agro.' };
    }

    // 2. Insert new piggy into Supabase
    const piggyRecord = {
        user_id: user.id,
        name: customName,
        breed: item.title,
        initial_weight: item.weight || INITIAL_WEIGHT_KG,
        target_weight: FINAL_WEIGHT_KG,
        current_weight: item.weight || INITIAL_WEIGHT_KG,
        cycle_duration_days: item.cycleDays || TOTAL_CYCLE_DAYS,
        investment_amount: price,
        extra_roi_bonus: extraRoiBonus,
        status: 'activo',
        image_url: item.imageUrl || DEFAULT_PIGGY_IMAGE,
        location: 'Granja Valle Morales · Galpón 3',
        health_status: 'Excelente',
        purchase_date: new Date().toISOString(),
    };

    const { data, error } = await client
        .from('piggies')
        .insert(piggyRecord)
        .select()
        .single();

    if (error) {
        console.error('Error inserting piggy in Supabase:', error);
        // Refund wallet balance if insertion failed
        await addWalletBalance(price, `Reembolso por fallo en compra: ${item.title}`);
        return { success: false, error: 'Hubo un error al registrar el Piggy. Tu saldo fue reembolsado.' };
    }

    // 3. Mark adoption mission M2 as completed
    await completeMissionOnPurchase();

    // 4. Update AppState with the newly purchased piggy
    const enriched = enrichPiggyData(data);
    const currentPiggies = AppState.get('piggies') || [];
    AppState.set({ piggies: [enriched, ...currentPiggies] });

    return { success: true, piggy: enriched };
}

/**
 * Buy a piggy adopting it (for AdopcionView and direct flows).
 */
export async function buyPiggy({ name, breed, cycleDurationDays, investmentAmount, initialWeight, targetWeight, imageUrl, location, extraRoiBonus = 0 }) {
    const price = parseFloat(investmentAmount) || 1000000;
    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        return { success: false, error: 'Usuario no autenticado.' };
    }

    if (isUsingMockData()) {
        const deducted = await deductWalletBalance(price, `Compra: Piggy ${name} (${breed})`);
        if (!deducted) {
            return { success: false, error: 'Saldo insuficiente en tu Cuenta Agro.' };
        }

        const newPiggy = {
            id: `piggy-${Date.now()}`,
            name,
            user_id: user.id,
            breed,
            initial_weight: initialWeight || INITIAL_WEIGHT_KG,
            target_weight: targetWeight || FINAL_WEIGHT_KG,
            current_weight: initialWeight || INITIAL_WEIGHT_KG,
            cycle_duration_days: cycleDurationDays || TOTAL_CYCLE_DAYS,
            investment_amount: price,
            extra_roi_bonus: extraRoiBonus,
            status: 'activo',
            image_url: imageUrl || DEFAULT_PIGGY_IMAGE,
            location: location || 'Granja Valle Morales · Galpón 3',
            health_status: 'Excelente',
            purchase_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        MOCK_PIGGIES.unshift(newPiggy);
        await completeMissionOnPurchase();

        const currentPiggies = AppState.get('piggies') || [];
        AppState.set({ piggies: [enrichPiggyData(newPiggy), ...currentPiggies] });

        return { success: true, piggy: enrichPiggyData(newPiggy) };
    }

    // 1. Deduct wallet balance
    const deducted = await deductWalletBalance(price, `Compra: Piggy ${name} (${breed})`);
    if (!deducted) {
        return { success: false, error: 'Saldo insuficiente en tu Cuenta Agro.' };
    }

    // 2. Insert new piggy into Supabase
    const piggyRecord = {
        user_id: user.id,
        name,
        breed,
        initial_weight: initialWeight || INITIAL_WEIGHT_KG,
        target_weight: targetWeight || FINAL_WEIGHT_KG,
        current_weight: initialWeight || INITIAL_WEIGHT_KG,
        cycle_duration_days: cycleDurationDays || TOTAL_CYCLE_DAYS,
        investment_amount: price,
        extra_roi_bonus: extraRoiBonus,
        status: 'activo',
        image_url: imageUrl || DEFAULT_PIGGY_IMAGE,
        location: location || 'Granja Valle Morales · Galpón 3',
        health_status: 'Excelente',
        purchase_date: new Date().toISOString(),
    };

    const { data, error } = await client
        .from('piggies')
        .insert(piggyRecord)
        .select()
        .single();

    if (error) {
        console.error('Error inserting piggy in Supabase:', error);
        await addWalletBalance(price, `Reembolso por fallo en compra: ${breed}`);
        return { success: false, error: 'Hubo un error al registrar el Piggy. Tu saldo fue reembolsado.' };
    }

    // 3. Mark adoption mission M2 as completed
    await completeMissionOnPurchase();

    // 4. Update AppState
    const enriched = enrichPiggyData(data);
    const currentPiggies = AppState.get('piggies') || [];
    AppState.set({ piggies: [enriched, ...currentPiggies] });

    return { success: true, piggy: enriched };
}
