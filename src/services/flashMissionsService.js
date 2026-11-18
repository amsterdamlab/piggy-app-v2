/* ============================================
   PIGGY APP — Flash Missions Service
   Handles M8/M9 (user-specific flash offers)
   and M10 (cycle completion exclusive missions)
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';

/* ─── Helpers ─────────────────────────────── */

/**
 * Check whether a flash mission is scheduled for the future or expired.
 * @param {string|null} expiresAt - ISO timestamp when the mission expires
 * @param {string|null} scheduledAt - ISO timestamp when the mission is scheduled to start
 * @param {string|null} [createdAt] - ISO timestamp when the record was created
 * @returns {{ isScheduled: boolean, expired: boolean, expiresAt: string|null, remainingMs: number|null }}
 */
function computeExpiry(expiresAt, scheduledAt = null, createdAt = null) {
    const now = Date.now();

    // Check if scheduled in the future
    if (scheduledAt) {
        const scheduledAtMs = new Date(scheduledAt).getTime();
        if (scheduledAtMs > now) {
            return {
                isScheduled: true,
                expired: false,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                remainingMs: null,
            };
        }
    }

    // If no expiration deadline is set, calculate fallback window (72h from scheduled_at or created_at)
    let effectiveExpiresAt = expiresAt;
    if (!effectiveExpiresAt) {
        const baseDate = scheduledAt || createdAt;
        if (baseDate) {
            const baseMs = new Date(baseDate).getTime();
            const fallbackMaxAgeMs = 72 * 60 * 60 * 1000; // 72 hours max window for flash offers
            effectiveExpiresAt = new Date(baseMs + fallbackMaxAgeMs).toISOString();
        }
    }

    if (!effectiveExpiresAt) {
        return {
            isScheduled: false,
            expired: false,
            expiresAt: null,
            remainingMs: null,
        };
    }

    const expiresAtMs = new Date(effectiveExpiresAt).getTime();
    const remainingMs = expiresAtMs - now;
    return {
        isScheduled: false,
        expired: remainingMs <= 0,
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
 * Filters: is_active=TRUE, is_purchased=FALSE, NOW() >= scheduled_at, and NOW() < expires_at.
 * Automatically sets is_active=FALSE in the DB for any records whose expires_at deadline has passed.
 * Orders by created_at DESC (most recent first).
 * @returns {Promise<Array>}
 */
export async function getActiveUserFlashMissions() {
    if (isUsingMockData()) return [];

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    // Trigger RPC to clean up expired/purchased records in DB if available
    try {
        client.rpc('expire_outdated_flash_missions').then(() => {}).catch(() => {});
    } catch (_) {}

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

    const expiredIds = [];
    const activeList = [];
    const discontinuedFlashTypes = new Set([
        'plus', 'silver', 'plata',
        'avanzado45', 'advanced45',
        'avanzado60', 'advanced60',
        'avanzado75', 'advanced75',
        'avanzado90', 'advanced90',
    ]);

    // Evaluate scheduled_at (start) and expires_at (expiration deadline)
    for (const m of (data || [])) {
        const rawType = String(m.piggy_type || '').toLowerCase().trim();
        if (discontinuedFlashTypes.has(rawType)) {
            expiredIds.push(m.id);
            continue;
        }

        const expiry = computeExpiry(m.expires_at, m.scheduled_at, m.created_at);

        // 1. If scheduled for a future date/time, do not display yet
        if (expiry.isScheduled) {
            continue;
        }

        // 2. If expiration deadline passed, queue for deactivation and do not display
        if (expiry.expired) {
            expiredIds.push(m.id);
            continue;
        }

        // 3. Active mission ready for display
        activeList.push({
            ...m,
            expiresAt: expiry.expiresAt,
            remainingMs: expiry.remainingMs,
        });
    }

    // Auto-update expired records to is_active = FALSE in Supabase DB
    if (expiredIds.length > 0) {
        client
            .from('user_flash_missions')
            .update({ is_active: false })
            .in('id', expiredIds)
            .then(({ error: updErr }) => {
                if (updErr) console.warn('Error deactivating expired flash missions in DB:', updErr.message);
            })
            .catch(() => {});
    }

    return activeList;
}

/**
 * Purchase a flash mission piggy.
 * Creates the exclusive piggy in piggies table and marks the mission as purchased.
 * Supports advanced30 (saves 30 days) and advanced60 (saves 60 days).
 * @param {string} missionId - ID of the user_flash_missions row
 * @param {string} piggyName - Custom name given by user
 * @returns {Promise<{ success: boolean, piggy?: Object, error?: string }>}
 */
export async function buyFlashMission(missionId, piggyName, contractUrl = null, contractCode = null) {
    if (isUsingMockData()) {
        const mockPiggy = {
            id: `mock-flash-${Date.now()}`,
            user_id: 'mock-user',
            name: piggyName || 'Piggy Flash',
            status: 'engorde',
            purchase_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 144).toISOString(),
            investment_amount: 1000000,
            extra_roi_bonus: 0.01,
            category: 'plus',
            current_weight: 15.0,
            contract_url: contractUrl || '/contracts/contrato_base.pdf',
            contract_code: contractCode || '#MOCK-FLASH'
        };
        return { success: true, piggy: mockPiggy, walletDeducted: false };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // 1. Intentar Compra Atómica Transaccional en Base de Datos (PostgreSQL RPC)
    try {
        const { data: rpcRes, error: rpcErr } = await client.rpc('buy_flash_mission_atomic', {
            p_mission_id: missionId,
            p_custom_name: piggyName || '',
            p_contract_url: contractUrl,
            p_contract_code: contractCode
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
            if (rpcRes.new_balance !== undefined && rpcRes.new_balance !== null) {
                const curProf = AppState.get('profile') || {};
                AppState.set({ profile: { ...curProf, wallet_balance: Number(rpcRes.new_balance) } });
            }
            return { success: true, piggy: rpcRes.piggy, walletDeducted: true };
        }

        if (rpcRes && !rpcRes.success) {
            return { success: false, error: rpcRes.error || 'Error al procesar la compra flash' };
        }
    } catch (rpcEx) {
        console.warn('buy_flash_mission_atomic RPC failed, using fallback:', rpcEx);
    }

    // 2. Fallback de cliente si la RPC aún no ha sido instalada
    // Fetch the mission record
    const { data: mission, error: mError } = await client
        .from('user_flash_missions')
        .select('*')
        .eq('id', missionId)
        .eq('user_id', user.id)
        .single();

    if (mError || !mission) return { success: false, error: 'Misión no encontrada' };
    if (mission.is_purchased) return { success: false, error: 'Ya fue comprada' };

    // Verify scheduled_at (not future) and expires_at (not expired)
    const expiry = computeExpiry(mission.expires_at, mission.scheduled_at, mission.created_at);
    if (expiry.isScheduled) {
        return { success: false, error: 'Esta oferta aún no está disponible' };
    }
    if (expiry.expired) {
        return { success: false, error: 'La oferta ha expirado' };
    }

    const profile = AppState.get('profile');

    // Default label fallback if piggyName is missing
    const defaultLabels = {
        dorado: 'Piggy Dorado',
        gold: 'Piggy Dorado',
        premium: 'Piggy Premium',
        avanzado15: 'Piggy Avanzado (15d)',
        advanced15: 'Piggy Avanzado (15d)',
        avanzado30: 'Piggy Avanzado (30d)',
        advanced30: 'Piggy Avanzado (30d)',
    };
    const finalName = (piggyName && piggyName.trim().length >= 3)
        ? piggyName.trim()
        : (mission.piggy_label || defaultLabels[mission.piggy_type] || mission.title || 'Piggy Flash');

    // Calculate category, extra ROI bonus, weight and duration based on piggy_type (V2 rules)
    const rawType = (mission.piggy_type || '').toLowerCase();
    let category = rawType;
    let extraRoiBonus = 0;
    let cycleDays = 122;
    let daysRemaining = 122;
    let weight = 6.0;

    if (rawType === 'advanced15' || rawType === 'avanzado15') {
        category = 'avanzado15';
        extraRoiBonus = 0;
        cycleDays = 122;
        daysRemaining = 107;
        weight = 15.4;
    } else if (rawType === 'advanced30' || rawType === 'avanzado30' || rawType === 'avanzado' || rawType === 'advanced') {
        category = 'avanzado30';
        extraRoiBonus = 0;
        cycleDays = 122;
        daysRemaining = 92;
        weight = 24.8;
    } else if (rawType === 'dorado' || rawType === 'gold') {
        category = 'dorado';
        extraRoiBonus = 0.02;
        cycleDays = 152;
        daysRemaining = 152;
        weight = 6.0;
    } else if (rawType === 'premium') {
        category = 'premium';
        extraRoiBonus = 0.04;
        cycleDays = 152;
        daysRemaining = 152;
        weight = 6.0;
    }

    const endDate = new Date(Date.now() + (daysRemaining * 24 * 3600000)).toISOString();

    // 0. Guardia de idempotencia: Verificar si ya existe un piggy creado recientemente para esta misión o usuario
    try {
        const { data: existingRecent } = await client
            .from('piggies')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', finalName)
            .gte('created_at', new Date(Date.now() - 10000).toISOString())
            .limit(1);

        if (existingRecent && existingRecent.length > 0) {
            console.warn('[buyFlashMission] Piggy ya creado recientemente, vinculando misión y retornando existente.');
            await client
                .from('user_flash_missions')
                .update({
                    is_purchased: true,
                    is_active: false,
                    purchased_at: new Date().toISOString(),
                    purchased_piggy_id: existingRecent[0].id,
                })
                .eq('id', missionId);
            return { success: true, piggy: existingRecent[0] };
        }
    } catch (idempErr) {
        console.warn('[buyFlashMission] Idempotency check warning:', idempErr);
    }

    // Create the exclusive piggy
    const insertPayload = {
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
    };
    if (contractUrl) insertPayload.contract_url = contractUrl;
    if (contractCode) insertPayload.contract_code = contractCode;

    const { data: newPiggy, error: piggyError } = await client
        .from('piggies')
        .insert(insertPayload)
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
        .eq('id', missionId);

    if (updateError) console.warn('buyFlashMission update error:', updateError.message);

    return { success: true, piggy: newPiggy };
}

/**
 * @deprecated Legacy wrapper for buying silver piggy in M6 / flash missions
 */
export async function buySilverPiggy(customName, price = 1000000, extraRoiBonus = 0.01) {
    return buyFlashMission('silver', customName);
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

    // Fast-path: if no piggies completed their cycle, skip immediately (0ms, 0 DB queries)
    const completedPiggies = piggies.filter(p => p.isComplete);
    if (completedPiggies.length === 0) return;

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    // Fetch the exclusive piggy configs (all enabled rows, ordered by min_piggies DESC)
    const { data: configs, error: configError } = await client
        .from('exclusive_piggy_config')
        .select('*')
        .or('is_enabled.is.null,is_enabled.eq.true')
        .order('min_piggies', { ascending: false });

    if (configError || !configs || configs.length === 0) return; // M10 disabled or config missing

    // Contamos ÚNICAMENTE los piggies ACTIVOS que le quedan al usuario en la granja
    const activePiggies = piggies.filter(p => !p.isComplete && p.status === 'engorde');
    const activeCount = activePiggies.length;
    // Si al usuario no le queda ningún cerdo activo (completó su único cerdo), se evalúa con base 1
    const effectivePiggyCount = Math.max(1, activeCount);

    // Propuesta 1 aprobada:
    // - 1 o 2 Piggies -> Piggy Dorado (+2%, 152 días, 48h)
    // - 3 o más Piggies -> Piggy Premium (+4%, 152 días, 48h)
    const rawConfig = configs.find(c => effectivePiggyCount >= (Number(c.min_piggies) || 1)) || configs[configs.length - 1];
    const isPremiumTier = effectivePiggyCount >= 3 || String(rawConfig?.piggy_type || '').toLowerCase() === 'premium';
    const targetType = isPremiumTier ? 'premium' : 'dorado';
    const targetLabel = isPremiumTier ? 'Piggy Premium' : 'Piggy Dorado';
    const targetExtraRoi = isPremiumTier ? 0.04 : 0.02;
    const durationHours = rawConfig?.duration_hours || 48;
    const targetPrice = rawConfig?.price || 1000000;

    const expiresAt = new Date(Date.now() + (durationHours * 3600000)).toISOString();

    // Batch insert completed piggies
    const inserts = completedPiggies.map(piggy => ({
        user_id:         user.id,
        piggy_id:        piggy.id,
        piggy_type:      targetType,
        piggy_label:     targetLabel,
        extra_roi_bonus: targetExtraRoi,
        price:           targetPrice,
        expires_at:      expiresAt,
    }));

    try {
        await client
            .from('cycle_completion_missions')
            .upsert(inserts, { onConflict: 'piggy_id', ignoreDuplicates: true });
    } catch (err) {
        console.warn('detectAndCreateCycleMissions error:', err);
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

    return (data || []).map(m => {
        const rawT = String(m.piggy_type || '').toLowerCase();
        const isPrem = rawT === 'premium';
        const normalizedType = isPrem ? 'premium' : 'dorado';
        const normalizedLabel = isPrem ? 'Piggy Premium' : 'Piggy Dorado';
        const normalizedBonus = isPrem ? 0.04 : 0.02;
        return {
            ...m,
            piggy_type: normalizedType,
            piggy_label: normalizedLabel,
            extra_roi_bonus: normalizedBonus,
            remainingMs: Math.max(0, new Date(m.expires_at).getTime() - Date.now()),
        };
    });
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

    // 1. Intentar Compra Atómica Transaccional en Base de Datos (PostgreSQL RPC)
    try {
        const { data: rpcRes, error: rpcErr } = await client.rpc('buy_cycle_mission_atomic', {
            p_mission_id: missionId,
            p_custom_name: piggyName || '',
            p_contract_url: contractUrl,
            p_contract_code: contractCode
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
            if (rpcRes.new_balance !== undefined && rpcRes.new_balance !== null) {
                const curProf = AppState.get('profile') || {};
                AppState.set({ profile: { ...curProf, wallet_balance: Number(rpcRes.new_balance) } });
            }
            return { success: true, piggy: rpcRes.piggy, walletDeducted: true };
        }

        if (rpcRes && !rpcRes.success) {
            return { success: false, error: rpcRes.error || 'Error al procesar la compra de ciclo' };
        }
    } catch (rpcEx) {
        console.warn('buy_cycle_mission_atomic RPC failed, using fallback:', rpcEx);
    }

    // 2. Fallback de cliente si la RPC aún no ha sido instalada
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

    const isPremCycle = String(mission.piggy_type || '').toLowerCase() === 'premium';
    const cycleCategory = isPremCycle ? 'premium' : 'dorado';
    const cycleExtraRoi = isPremCycle ? 0.04 : 0.02;

    const insertPayload = {
        user_id:           user.id,
        name:              finalName,
        full_name:         profile?.full_name || '',
        investment_amount: mission.price || 1000000,
        status:            'engorde',
        extra_roi_bonus:   cycleExtraRoi,
        category:          cycleCategory,
        current_weight:    6.0,
        purchase_date:     new Date().toISOString(),
        end_date:          new Date(Date.now() + (152 * 24 * 3600000)).toISOString(),
    };
    if (contractUrl) insertPayload.contract_url = contractUrl;
    if (contractCode) insertPayload.contract_code = contractCode;

    // 0. Guardia de idempotencia: Verificar si ya existe un piggy creado recientemente para esta misión o usuario
    try {
        const { data: existingRecent } = await client
            .from('piggies')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', finalName)
            .gte('created_at', new Date(Date.now() - 10000).toISOString())
            .limit(1);

        if (existingRecent && existingRecent.length > 0) {
            console.warn('[buyCycleCompletionMission] Piggy ya creado recientemente, marcando misión y retornando existente.');
            await client
                .from('cycle_completion_missions')
                .update({
                    is_completed: true,
                    purchased_piggy_id: existingRecent[0].id,
                    purchased_at: new Date().toISOString(),
                })
                .eq('id', missionId);
            return { success: true, piggy: existingRecent[0] };
        }
    } catch (idempErr) {
        console.warn('[buyCycleCompletionMission] Idempotency check warning:', idempErr);
    }

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
 * @deprecated Legacy wrapper alias for buyCycleCompletionMission
 */
export async function completeCycleMission(missionId, piggyName, contractUrl = null, contractCode = null) {
    return buyCycleCompletionMission(missionId, piggyName, contractUrl, contractCode);
}