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
 * Get active flash missions (M8/M9) for the current user.
 * Filters: is_active=TRUE, is_purchased=FALSE, within 72h window.
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

    // Filter out expired missions and inject computed expiry info
    return (data || [])
        .map(m => {
            if (!m.activated_at) return null;
            const expiry = computeExpiry(m.activated_at, m.duration_hours || 72);
            if (expiry.expired) return null;
            return { ...m, expiresAt: expiry.expiresAt, remainingMs: expiry.remainingMs };
        })
        .filter(Boolean);
}

/**
 * Purchase a flash mission piggy (M8 or M9).
 * Creates the exclusive piggy in piggies table and marks the mission as purchased.
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

    // Verify not expired
    const expiry = computeExpiry(mission.activated_at, mission.duration_hours || 72);
    if (expiry.expired) return { success: false, error: 'La oferta ha expirado' };

    const profile = AppState.get('profile');
    const finalName = (piggyName && piggyName.trim().length >= 3)
        ? piggyName.trim()
        : mission.piggy_label;

    // Create the exclusive piggy
    const { data: newPiggy, error: piggyError } = await client
        .from('piggies')
        .insert({
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
 * Requires the user to have at least `config.min_piggies` total piggies.
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

    // Fetch the exclusive piggy config (must be enabled)
    const { data: config, error: configError } = await client
        .from('exclusive_piggy_config')
        .select('*')
        .eq('is_enabled', true)
        .maybeSingle();

    if (configError || !config) return; // M10 disabled or config missing

    // Check minimum piggies requirement
    if (piggies.length < (config.min_piggies || 3)) return;

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
 * @returns {Promise<{ success: boolean, piggy?: Object, error?: string }>}
 */
export async function buyCycleCompletionMission(missionId, piggyName) {
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

    // Create the exclusive piggy
    const { data: newPiggy, error: piggyError } = await client
        .from('piggies')
        .insert({
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
        })
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