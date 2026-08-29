/* ============================================
   PIGGY APP — Flash Missions Service
   Handles M8/M9 (user-specific flash offers)
   and M10 (cycle completion exclusive missions)
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';

/* ─── Helpers ─────────────────────────────── */

/**
 * Check whether a flash mission has expired based on scheduled_at (expiration deadline).
 * @param {string} scheduledAt - ISO timestamp when the mission expires
 * @returns {{ expired: boolean, expiresAt: string, remainingMs: number }}
 */
function computeExpiry(scheduledAt) {
    if (!scheduledAt) {
        return { expired: false, expiresAt: null, remainingMs: 0 };
    }
    const expiresAtMs = new Date(scheduledAt).getTime();
    const remainingMs = expiresAtMs - Date.now();
    return {
        expired:   remainingMs <= 0,
        expiresAt: new Date(expiresAtMs).toISOString(),
        remainingMs: Math.max(0, remainingMs),
    };
}

/* ─── M8 / M9: User Flash Missions ────────── */

/**
 * Deactivate a flash mission by setting is_active = false in the database.
 * @param {string} missionId
 * @returns {Promise<boolean>}
 */
export async function deactivateFlashMission(missionId) {
    if (isUsingMockData() || !missionId) return false;
    try {
        const client = getClient();
        const { error } = await client
            .from('user_flash_missions')
            .update({ is_active: false })
            .eq('id', missionId);
        return !error;
    } catch (err) {
        console.warn('deactivateFlashMission error:', err);
        return false;
    }
}

/**
 * Get active flash missions for the current user.
 * Filters: is_active=TRUE, is_purchased=FALSE, and NOW() < scheduled_at.
 * Automatically sets is_active=FALSE in the DB for any records whose scheduled_at deadline has passed.
 * Orders by created_at DESC (most recent first).
 * @returns {Promise<Array>}
 */
export async function getActiveUserFlashMissions() {
    if (isUsingMockData()) return [];

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    try {
        const { data, error } = await client
            .from('user_flash_missions')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('is_purchased', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('getActiveUserFlashMissions error:', error.message);
            return [];
        }

        const now = Date.now();
        const valid = [];
        const expiredIds = [];

        for (const m of (data || [])) {
            let isExpired = false;
            let remaining = 0;

            if (m.expires_at) {
                const expMs = new Date(m.expires_at).getTime();
                remaining = expMs - now;
                if (remaining <= 0) isExpired = true;
            } else {
                const activatedAt = new Date(m.activated_at || m.created_at || now);
                const expiresAt   = new Date(activatedAt.getTime() + 72 * 3600 * 1000);
                remaining = expiresAt.getTime() - now;
                if (remaining <= 0) isExpired = true;
            }

            if (isExpired) {
                expiredIds.push(m.id);
            } else {
                valid.push({
                    ...m,
                    remainingHours: Math.ceil(remaining / 3600000),
                });
            }
        }

        // Clean up expired records in DB asynchronously
        if (expiredIds.length > 0) {
            client.from('user_flash_missions')
                .update({ is_active: false })
                .in('id', expiredIds)
                .then(() => console.log(`Deactivated ${expiredIds.length} expired flash missions`));
        }

        return valid;
    } catch (err) {
        console.warn('getActiveUserFlashMissions exception:', err);
        return [];
    }
}

/**
 * Purchase a flash mission piggy.
 * Inserts the new piggy and marks user_flash_missions as is_purchased = true.
 * @param {Object} mission - user_flash_missions record
 * @param {string} piggyName - Custom piggy name chosen by user
 * @returns {Promise<{ success: boolean, piggy?: Object, error?: string }>}
 */
export async function buyFlashMission(mission, piggyName) {
    if (isUsingMockData()) return { success: false, error: 'Mock mode' };

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Deduct balance from wallet first
    const { deductWalletBalance, addWalletBalance } = await import('./walletService.js');
    const price = parseFloat(mission.price || 1000000);
    const deducted = await deductWalletBalance(price, `Compra Piggy Flash: ${piggyName || mission.title}`);
    if (!deducted) {
        return { success: false, error: 'Saldo insuficiente en tu Cuenta Agro.' };
    }

    const profile = AppState.get('profile');

    // Default label fallback if piggyName is missing
    const defaultLabels = {
        plus: 'Piggy Plus',
        silver: 'Piggy Plus',
        dorado: 'Piggy Dorado',
        gold: 'Piggy Dorado',
        premium: 'Piggy Premium',
        avanzado30: 'Piggy Avanzado (30d)',
        advanced30: 'Piggy Avanzado (30d)',
        avanzado45: 'Piggy Avanzado (45d)',
        advanced45: 'Piggy Avanzado (45d)',
        avanzado60: 'Piggy Avanzado (60d)',
        advanced60: 'Piggy Avanzado (60d)',
        avanzado75: 'Piggy Avanzado (75d)',
        advanced75: 'Piggy Avanzado (75d)',
        avanzado90: 'Piggy Avanzado (90d)',
        advanced90: 'Piggy Avanzado (90d)',
    };
    const finalName = (piggyName && piggyName.trim().length >= 3)
        ? piggyName.trim()
        : (mission.piggy_label || defaultLabels[mission.piggy_type] || mission.title || 'Piggy Flash');

    // Calculate category, extra ROI bonus, weight and duration based on piggy_type
    const rawType = (mission.piggy_type || '').toLowerCase();
    let category = rawType;
    let extraRoiBonus = 0;
    let daysRemaining = 144;
    let weight = 15.0;

    if (rawType === 'advanced30' || rawType === 'avanzado30') {
        category = 'avanzado30';
        extraRoiBonus = 0;
        daysRemaining = 114;
        weight = 35.0;
    } else if (rawType === 'advanced45' || rawType === 'avanzado45') {
        category = 'avanzado45';
        extraRoiBonus = 0;
        daysRemaining = 99;
        weight = 45.0;
    } else if (rawType === 'advanced60' || rawType === 'avanzado60') {
        category = 'avanzado60';
        extraRoiBonus = 0;
        daysRemaining = 84;
        weight = 55.0;
    } else if (rawType === 'advanced75' || rawType === 'avanzado75') {
        category = 'avanzado75';
        extraRoiBonus = 0;
        daysRemaining = 69;
        weight = 65.0;
    } else if (rawType === 'advanced90' || rawType === 'avanzado90') {
        category = 'avanzado90';
        extraRoiBonus = 0;
        daysRemaining = 54;
        weight = 75.0;
    } else if (rawType === 'plus' || rawType === 'silver') {
        category = 'plus';
        extraRoiBonus = 0.01;
    } else if (rawType === 'dorado' || rawType === 'gold') {
        category = 'dorado';
        extraRoiBonus = 0.02;
    } else if (rawType === 'premium') {
        category = 'premium';
        extraRoiBonus = 0.03;
    }

    const endDate = new Date(Date.now() + (daysRemaining * 24 * 3600000)).toISOString();

    // Create the exclusive piggy
    const { data: newPiggy, error: piggyError } = await client
        .from('piggies')
        .insert({
            user_id:           user.id,
            name:              finalName,
            full_name:         profile?.full_name || '',
            investment_amount: mission.price || 1000000,
            status:            'engorde',
            extra_roi_bonus:   extraRoiBonus,
            category:          category,
            current_weight:    weight,
            purchase_date:     new Date().toISOString(),
            end_date:          endDate,
        })
        .select()
        .single();

    if (piggyError) {
        console.error('buyFlashMission piggy insert error:', piggyError.message);
        return { success: false, error: piggyError.message };
    }

    // Mark the mission as purchased and deactivate it
    const { error: updateError } = await client
        .from('user_flash_missions')
        .update({
            is_purchased:       true,
            is_active:          false,
            purchased_at:       new Date().toISOString(),
            purchased_piggy_id: newPiggy.id,
        })
        .eq('id', mission.id);

    if (updateError) {
        console.warn('buyFlashMission update error:', updateError.message);
    }

    // Update AppState
    const { enrichPiggyData } = await import('./piggiesService.js');
    const enriched = enrichPiggyData(newPiggy);
    const currentPiggies = AppState.get('piggies') || [];
    AppState.set({ piggies: [enriched, ...currentPiggies] });

    return { success: true, piggy: enriched };
}

/* ─── M10: Cycle Completion Missions ──────── */

/**
 * Detect piggies that have reached progress >= 100% (or daysLeft <= 0)
 * and create corresponding cycle_completion_missions records if they don't already exist.
 * Safe to call repeatedly — uses unique piggy_id logic.
 * @param {Array} piggies - Enriched piggy objects from AppState
 */
export async function detectAndCreateCycleMissions(piggies = []) {
    if (isUsingMockData() || !piggies || piggies.length === 0) return;

    const completed = piggies.filter(p => p.isComplete);
    if (completed.length === 0) return;

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    for (const piggy of completed) {
        try {
            // Check if mission record already exists for this completed piggy
            const { data: existing } = await client
                .from('cycle_completion_missions')
                .select('id')
                .eq('user_id', user.id)
                .eq('piggy_id', piggy.id)
                .maybeSingle();

            if (!existing) {
                const inv = parseFloat(piggy.investmentAmount || piggy.investment_amount || 1000000);
                const roi = parseFloat(piggy.totalRoi || 0.115);
                const returnAmount = inv * (1 + roi);
                const cycleDays = piggy.cycleDurationDays || 144;

                const expiresAt = new Date(Date.now() + (72 * 3600 * 1000)).toISOString();

                await client
                    .from('cycle_completion_missions')
                    .insert({
                        user_id:               user.id,
                        piggy_id:              piggy.id,
                        piggy_name:            piggy.name || 'Tu Piggy',
                        investment_amount:     inv,
                        return_amount:         returnAmount,
                        cycle_duration_days:   cycleDays,
                        piggy_type:            'oro_cycle',
                        piggy_label:           'Piggy Dorado Ciclo (+2% ROI)',
                        price:                 inv,
                        extra_roi_bonus:       0.02,
                        is_active:             true,
                        is_completed:          false,
                        expires_at:            expiresAt,
                    });
            }
        } catch (err) {
            console.warn('detectAndCreateCycleMissions item error:', err);
        }
    }
}

/**
 * Get active cycle completion missions for the current user.
 * Filters: is_active=TRUE and is_completed=FALSE.
 * Orders by created_at DESC (most recent first).
 * @returns {Promise<Array>}
 */
export async function getActiveCycleMissions() {
    if (isUsingMockData()) return [];

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    try {
        const { data, error } = await client
            .from('cycle_completion_missions')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('is_completed', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('getActiveCycleMissions error:', error.message);
            return [];
        }

        return data || [];
    } catch (err) {
        console.warn('getActiveCycleMissions exception:', err);
        return [];
    }
}

/**
 * Mark a cycle completion mission as completed (without buying the exclusive piggy).
 * Sets is_completed = true and is_active = false.
 * @param {string} missionId
 * @returns {Promise<boolean>}
 */
export async function completeCycleMission(missionId) {
    if (isUsingMockData() || !missionId) return false;

    try {
        const client = getClient();
        const { error } = await client
            .from('cycle_completion_missions')
            .update({
                is_completed: true,
                is_active:    false,
                completed_at: new Date().toISOString(),
            })
            .eq('id', missionId);

        return !error;
    } catch (err) {
        console.warn('completeCycleMission error:', err);
        return false;
    }
}

/**
 * Purchase the exclusive piggy from an active M10 cycle mission.
 * Creates the piggy in the DB and marks the mission as completed.
 * @param {string} missionId - ID of the cycle_completion_missions row
 * @param {string} piggyName - Custom name given by user
 * @param {string} [contractUrl] - PDF contract URL if signed
 * @param {string} [contractCode] - Transaction contract code
 * @returns {Promise<{ success: boolean, piggy?: Object, error?: string }>}
 */
export async function buyCycleCompletionMission(missionId, piggyName, contractUrl = null, contractCode = null) {
    if (isUsingMockData()) return { success: false, error: 'Mock mode' };

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Fetch the mission record
    const { data: mission, error: mError } = await client
        .from('cycle_completion_missions')
        .select('*')
        .eq('id', missionId)
        .eq('user_id', user.id)
        .single();

    if (mError || !mission) return { success: false, error: 'Misión no encontrada' };
    if (mission.is_completed) return { success: false, error: 'Ya fue completada' };

    // Verify not expired
    if (new Date(mission.expires_at).getTime() < Date.now()) {
        return { success: false, error: 'La oferta ha expirado' };
    }

    const profile = AppState.get('profile');
    const finalName = (piggyName && piggyName.trim().length >= 3)
        ? piggyName.trim()
        : mission.piggy_label;

    const insertPayload = {
        user_id:           user.id,
        name:              finalName,
        full_name:         profile?.full_name || '',
        investment_amount: mission.price || 1000000,
        status:            'engorde',
        extra_roi_bonus:   mission.extra_roi_bonus || 0,
        category:          mission.piggy_type,
        current_weight:    15.0,
        purchase_date:     new Date().toISOString(),
        end_date:          new Date(Date.now() + (143 * 24 * 3600000)).toISOString(),
    };
    if (contractUrl) insertPayload.contract_url = contractUrl;
    if (contractCode) insertPayload.contract_code = contractCode;

    // Create the exclusive piggy
    const { data: newPiggy, error: piggyError } = await client
        .from('piggies')
        .insert(insertPayload)
        .select()
        .single();

    if (piggyError) {
        console.error('buyCycleCompletionMission piggy error:', piggyError.message);
        return { success: false, error: piggyError.message };
    }

    // Mark the M10 mission as completed
    const { error: updateError } = await client
        .from('cycle_completion_missions')
        .update({
            is_completed:       true,
            purchased_piggy_id: newPiggy.id,
            purchased_at:       new Date().toISOString(),
        })
        .eq('id', missionId);

    if (updateError) console.warn('buyCycleCompletionMission update error:', updateError.message);

    return { success: true, piggy: newPiggy };
}

/**
 * Buy Silver/Plus Piggy helper for SilverPiggyModal.
 */
export async function buySilverPiggy(piggyName, price = 1000000, extraRoiBonus = 0.01) {
    return buyFlashMission({
        piggy_type: 'silver',
        price,
        extra_roi_bonus: extraRoiBonus,
        title: 'Piggy Plus',
    }, piggyName);
}
