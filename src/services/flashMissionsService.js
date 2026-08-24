/* ============================================
   PIGGY APP — Flash Missions Service
   Handles M8/M9 (user-specific flash offers)
   and M10 (cycle completion exclusive missions)
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';

/* ─── Helpers ─────────────────────────────── */

/**
 * Check whether a flash/cycle mission has expired.
 * @param {string} activatedAt - ISO timestamp of activation
 * @param {number} durationHours - Duration in hours
 * @returns {{ expired: boolean, expiresAt: string, remainingMs: number }}
 */
function computeExpiry(activatedAt, durationHours) {
    const expiresAtMs = new Date(activatedAt).getTime() + (durationHours * 3600000);
    const remainingMs = expiresAtMs - Date.now();
    return {
        expired:   remainingMs <= 0,
        expiresAt: new Date(expiresAtMs).toISOString(),
        remainingMs: Math.max(0, remainingMs),
    };
}

/* ─── M8 / M9: User Flash Missions ────────── */

/**
 * Get active flash missions for the current user.
 * Filters: is_active=TRUE, is_purchased=FALSE, within duration window, and scheduled_at <= NOW().
 * Orders by activated_at DESC (most recent first).
 * @returns {Promise<Array>}
 */
export async function getActiveUserFlashMissions() {
    if (isUsingMockData()) return [];

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data, error } = await client
        .from('user_flash_missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_purchased', false)
        .order('activated_at', { ascending: false });

    if (error) {
        console.warn('getActiveUserFlashMissions error:', error.message);
        return [];
    }

    const nowMs = Date.now();

    // Filter out scheduled future missions, expired missions, and inject computed expiry info
    return (data || [])
        .map(m => {
            // Check scheduled_at: if it exists and is in the future, hide it for now
            if (m.scheduled_at) {
                const scheduledMs = new Date(m.scheduled_at).getTime();
                if (scheduledMs > nowMs) return null;
            }

            const activationTime = m.activated_at || m.scheduled_at || m.created_at;
            if (!activationTime) return null;

            const expiry = computeExpiry(activationTime, m.duration_hours || 72);
            if (expiry.expired) return null;

            return { ...m, expiresAt: expiry.expiresAt, remainingMs: expiry.remainingMs };
        })
        .filter(Boolean);
}

/**
 * Purchase a flash mission piggy.
 * Creates the exclusive piggy in piggies table and marks the mission as purchased.
 * Supports advanced30 (saves 30 days) and advanced60 (saves 60 days).
 * @param {string} missionId - ID of the user_flash_missions row
 * @param {string} piggyName - Custom name given by user
 * @returns {Promise<{ success: boolean, piggy?: Object, error?: string }>}
 */
export async function buyFlashMission(missionId, piggyName) {
    if (isUsingMockData()) return { success: false, error: 'Mock mode' };

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Fetch the mission record
    const { data: mission, error: mError } = await client
        .from('user_flash_missions')
        .select('*')
        .eq('id', missionId)
        .eq('user_id', user.id)
        .single();

    if (mError || !mission) return { success: false, error: 'Misión no encontrada' };
    if (mission.is_purchased) return { success: false, error: 'Ya fue comprada' };

    // Verify not expired and scheduled_at has passed
    if (mission.scheduled_at && new Date(mission.scheduled_at).getTime() > Date.now()) {
        return { success: false, error: 'Esta misión aún no está disponible' };
    }

    const activationTime = mission.activated_at || mission.scheduled_at || mission.created_at;
    const expiry = computeExpiry(activationTime, mission.duration_hours || 72);
    if (expiry.expired) return { success: false, error: 'La oferta ha expirado' };

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
        : (defaultLabels[mission.piggy_type] || mission.title || 'Piggy Flash');

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

    // Mark the mission as purchased
    const { error: updateError } = await client
        .from('user_flash_missions')
        .update({
            is_purchased:       true,
            purchased_at:       new Date().toISOString(),
            purchased_piggy_id: newPiggy.id,
        })
        .eq('id', missionId);

    if (updateError) console.warn('buyFlashMission update error:', updateError.message);

    return { success: true, piggy: newPiggy };
}

/* ─── M10: Cycle Completion Missions ──────── */

/**
 * Detect completed piggies and auto-create M10 missions for them.
 * Evaluates user's total piggies against tiered exclusive_piggy_config rows.
 * Selects highest tier matching user's piggy count (e.g. 1 -> Plus, 2 -> Dorado, >=3 -> Premium).
 * The UNIQUE(piggy_id) DB constraint prevents duplicate M10 missions.
 * Safe to call on every dashboard load — inserts are idempotent.
 * @param {Array} piggies - Enriched array from getUserPiggies()
 * @returns {Promise<void>}
 */
export async function detectAndCreateCycleMissions(piggies) {
    if (isUsingMockData()) return;
    if (!piggies || piggies.length === 0) return;

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    // Fetch the exclusive piggy configs (all enabled rows, ordered by min_piggies DESC)
    const { data: configs, error: configError } = await client
        .from('exclusive_piggy_config')
        .select('*')
        .eq('is_enabled', true)
        .order('min_piggies', { ascending: false });

    if (configError || !configs || configs.length === 0) return; // M10 disabled or config missing

    const userPiggyCount = piggies.length;
    // Find highest tier matching user's piggy count (e.g. >= 3 -> Tier 3, >= 2 -> Tier 2, >= 1 -> Tier 1)
    const config = configs.find(c => userPiggyCount >= (c.min_piggies || 1));
    if (!config) return;

    // Only process piggies that completed their cycle
    const completedPiggies = piggies.filter(p => p.isComplete);
    if (completedPiggies.length === 0) return;

    const expiresAt = new Date(Date.now() + ((config.duration_hours || 48) * 3600000)).toISOString();

    for (const piggy of completedPiggies) {
        // UNIQUE(piggy_id) will reject duplicates — we catch those silently
        const { error } = await client
            .from('cycle_completion_missions')
            .insert({
                user_id:         user.id,
                piggy_id:        piggy.id,
                piggy_type:      config.piggy_type,
                piggy_label:     config.piggy_label,
                extra_roi_bonus: config.extra_roi_bonus,
                price:           config.price || 1000000,
                expires_at:      expiresAt,
            });

        if (error && !error.message?.includes('unique') && !error.code?.includes('23505')) {
            console.warn(`detectAndCreateCycleMissions insert error for piggy ${piggy.id}:`, error.message);
        }
    }
}

/**
 * Get active M10 cycle completion missions for the current user.
 * Returns missions that are NOT completed and have NOT expired yet.
 * Ordered by expires_at ASC (most urgent first).
 * @returns {Promise<Array>}
 */
export async function getActiveCycleMissions() {
    if (isUsingMockData()) return [];

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data, error } = await client
        .from('cycle_completion_missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

    if (error) {
        console.warn('getActiveCycleMissions error:', error.message);
        return [];
    }

    return (data || []).map(m => ({
        ...m,
        remainingMs: Math.max(0, new Date(m.expires_at).getTime() - Date.now()),
    }));
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
