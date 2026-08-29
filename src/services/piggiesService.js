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
 * Enrich DB piggy object with calculated fields.
 * Calculates dynamic days elapsed, remaining days, weight and progress
 * based on real calendar days elapsed since purchase.
 *
 * @param {Object} p - Raw DB piggy record
 * @returns {Object} Enriched piggy object
 */
export function enrichPiggyData(p) {
    const cycleTotalDays = parseInt(p.cycle_duration_days) || 144;
    const inv = parseFloat(p.investment_amount) || 1000000;
    const extraRoi = parseFloat(p.extra_roi_bonus) || 0;
    const baseROI = 0.115;
    const totalROI = baseROI + extraRoi;

    // Calcular días transcurridos reales desde la compra
    const startDate = new Date(p.purchase_date || p.created_at || Date.now());
    const now = new Date();
    const msElapsed = Math.max(0, now.getTime() - startDate.getTime());
    const realDaysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));

    // Días transcurridos con tope en la duración del ciclo
    const daysElapsed = Math.min(realDaysElapsed, cycleTotalDays);
    const daysLeft = Math.max(0, cycleTotalDays - daysElapsed);

    // Progreso porcentual del ciclo (0 a 100)
    const progress = Math.min(100, Math.round((daysElapsed / cycleTotalDays) * 100));

    // Peso dinámico interpolado linealmente (de initial_weight a target_weight)
    const initialWeight = parseFloat(p.initial_weight) || 25.0;
    const targetWeight = parseFloat(p.target_weight) || 110.0;
    const weightGainTotal = targetWeight - initialWeight;
    const calculatedWeight = initialWeight + (weightGainTotal * (daysElapsed / cycleTotalDays));
    const currentWeight = Math.min(targetWeight, Math.round(calculatedWeight * 10) / 10);

    // Estado de completitud: por estado en DB o por días restantes = 0
    const isComplete = p.status === 'completado' || daysLeft === 0;

    // Retorno proyectado
    const projectedReturn = inv * (1 + totalROI);

    // Determinar etapa de crecimiento
    const stageInfo = getPiggyGrowthStage(progress, p.name || 'Tu Piggy');

    return {
        ...p,
        id: p.id,
        name: p.name || 'Mi Piggy',
        tag: p.tag || `PG-${String(p.id).slice(0, 4).toUpperCase()}`,
        status: isComplete ? 'completado' : (p.status || 'engorde'),
        isComplete,
        currentWeight,
        initialWeight,
        targetWeight,
        weightGain: Math.max(0, Math.round((currentWeight - initialWeight) * 10) / 10),
        weightRemaining: Math.max(0, Math.round((targetWeight - currentWeight) * 10) / 10),
        daysElapsed,
        daysLeft,
        progress,
        cycleDurationDays: cycleTotalDays,
        investmentAmount: inv,
        projectedReturn,
        extraRoiBonus: extraRoi,
        totalRoi: totalROI,
        stageNumber: stageInfo.stageNumber,
        stageName: stageInfo.stageName,
        stageIcon: stageInfo.icon,
        stageBadgeBg: stageInfo.badgeBg,
        stageBadgeColor: stageInfo.badgeColor,
        stageDescription: stageInfo.description,
        imageUrl: p.image_url || 'pig2.jpg',
        location: p.location || 'Granja Valle Morales · Galpón 3',
        healthStatus: p.health_status || 'Excelente',
        feedType: p.feed_type || 'Concentrado Premium + Suplemento Vitamínico',
        purchaseDate: p.purchase_date || p.created_at,
        createdAt: p.created_at,
    };
}

/**
 * Format weight in kilograms helper.
 */
export function formatWeight(weight) {
    const num = Number(weight);
    if (isNaN(num) || num <= 0) return '25.0 kg';
    return `${num.toFixed(1)} kg`;
}

/**
 * Get Growth Phase Name based on weight.
 */
export function getGrowthPhaseName(weight) {
    const w = Number(weight) || 0;
    if (w < 40) return 'Iniciación';
    if (w < 70) return 'Crecimiento';
    if (w < 100) return 'Desarrollo';
    return 'Finalización';
}

/**
 * Get Growth Phase Description based on weight.
 */
export function getGrowthPhaseDescription(weight) {
    const w = Number(weight) || 0;
    if (w < 40) return 'Fase de adaptación y desarrollo inicial del lechón.';
    if (w < 70) return 'Crecimiento muscular acelerado con dieta balanceada.';
    if (w < 100) return 'Ganancia óptima de peso y masa corporal.';
    return 'Etapa final previa a la venta con peso comercial alcanzado.';
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
 * Calculate dashboard summary statistics.
 * Multi-Piggy Margin:
 *   1-2 Piggies  → 11.5% Base ROI (standard)
 *   3-4 Piggies  → +1% Extra Margin (+1% bonus)
 *   5+ Piggies   → +2% Extra Margin (+2% bonus)
 */
export async function getDashboardStats(piggies = []) {
    const validPiggies = Array.isArray(piggies) ? piggies : [];
    const availablePiggies = validPiggies.filter((p) => p.status === 'disponible' || p.status === 'completado');
    const activePiggies = validPiggies.filter((p) => p.status !== 'disponible' && p.status !== 'completado');
    const piggyCount = activePiggies.length;

    let baseROI = 0.115; // 11.5%

    // Calculate total investment (active piggies)
    const adquisicionBonos = activePiggies.reduce((sum, p) => sum + (parseFloat(p.investment_amount) || 1000000), 0);

    // Calculate total gains (active piggies with their respective individual extra_roi_bonus)
    const diferencialPreventa = activePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount) || 1000000;
        const extra = parseFloat(p.extra_roi_bonus) || 0;
        return sum + (inv * (baseROI + extra));
    }, 0);

    // Calculate total available for finished/sold piggies
    const disponible = availablePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount) || 1000000;
        const extra = parseFloat(p.extra_roi_bonus) || 0;
        return sum + (inv * (1 + baseROI + extra));
    }, 0);

    // Find the piggy with closest end date
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
 * Buy a piggy adopting it (for AdopcionView and direct flows).
 */
export async function buyPiggy({ name, breed, cycleDurationDays, investmentAmount, initialWeight, targetWeight, imageUrl, location, extraRoiBonus = 0 }) {
    const price = parseFloat(investmentAmount) || 1000000;
    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        return { success: false, error: 'Usuario no autenticado.' };
    }

    // 1. Deduct wallet balance
    const { deductWalletBalance, addWalletBalance } = await import('./walletService.js');
    const { completeMissionOnPurchase } = await import('./missionsService.js');

    const deducted = await deductWalletBalance(price, `Compra: Piggy ${name} (${breed})`);
    if (!deducted) {
        return { success: false, error: 'Saldo insuficiente en tu Cuenta Agro.' };
    }

    if (isUsingMockData()) {
        const newPiggy = {
            id: `piggy-${Date.now()}`,
            name,
            user_id: user.id,
            breed,
            initial_weight: initialWeight || 25.0,
            target_weight: targetWeight || 110.0,
            current_weight: initialWeight || 25.0,
            cycle_duration_days: cycleDurationDays || 144,
            investment_amount: price,
            extra_roi_bonus: extraRoiBonus,
            status: 'activo',
            image_url: imageUrl || 'pig2.jpg',
            location: location || 'Granja Valle Morales · Galpón 3',
            health_status: 'Excelente',
            purchase_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        MOCK_PIGGIES.unshift(newPiggy);
        await completeMissionOnPurchase();

        const { AppState } = await import('../state.js');
        const currentPiggies = AppState.get('piggies') || [];
        AppState.set({ piggies: [enrichPiggyData(newPiggy), ...currentPiggies] });

        return { success: true, piggy: enrichPiggyData(newPiggy) };
    }

    // 2. Insert new piggy into Supabase
    const piggyRecord = {
        user_id: user.id,
        name,
        breed,
        initial_weight: initialWeight || 25.0,
        target_weight: targetWeight || 110.0,
        current_weight: initialWeight || 25.0,
        cycle_duration_days: cycleDurationDays || 144,
        investment_amount: price,
        extra_roi_bonus: extraRoiBonus,
        status: 'activo',
        image_url: imageUrl || 'pig2.jpg',
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
    const { AppState } = await import('../state.js');
    const currentPiggies = AppState.get('piggies') || [];
    AppState.set({ piggies: [enriched, ...currentPiggies] });

    return { success: true, piggy: enriched };
}

/**
 * Buy a piggy from the marketplace.
 */
export async function buyMarketplaceItem(item, customName = null, contractUrl = null, customContractCode = null) {
    return buyPiggy({
        name: customName || item.title || item.name || 'Mi Piggy',
        breed: item.title || item.name || 'Landrace',
        cycleDurationDays: item.cycleDays || item.cycle_duration_days || 144,
        investmentAmount: item.price || 1000000,
        initialWeight: item.weight || item.initial_weight || 25.0,
        targetWeight: item.target_weight || 110.0,
        imageUrl: item.imageUrl || item.image_url || 'pig2.jpg',
        location: item.location || 'Granja Valle Morales · Galpón 3',
        extraRoiBonus: item.extra_roi || item.extraRoiBonus || 0,
    });
}
