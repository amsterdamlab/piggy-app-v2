/* ============================================
   PIGGY APP — Missions Service
   DB-first: syncs auto + manual completions
   to the `missions` table in Supabase.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';
import { MOCK_MISSIONS } from './mockData.js';

/* ─── Mission Definitions ─────────────────────
   Source of truth for mission structure.
   Phase 2: move these to a mission_definitions
   table so admin can manage them without deploys.
   ─────────────────────────────────────────── */

const MISSION_DEFINITIONS = [
    {
        key: 'm1', sortOrder: 1,
        title: 'Crea una cuenta nueva',
        reward: 'Bono consumo x $50.000',
        icon: '🎉', cta: null,
        autoType: 'account_created',
        requires: null,
    },
    {
        key: 'm2', sortOrder: 2,
        title: 'Compra tu primer Piggy',
        reward: 'Desbloquea Piggy de 3 meses',
        icon: '🐷', cta: '#/mercado',
        autoType: 'first_piggy',
        requires: null,
    },
    {
        key: 'm3', sortOrder: 3,
        title: 'Invita a un amigo a Piggy',
        reward: 'Desbloquea tu código referido',
        icon: '📲', cta: null,
        autoType: null,   // manual
        requires: null,
    },
    {
        key: 'm4', sortOrder: 4,
        title: 'Compra tu 2do Piggy',
        reward: '+1% en Margen Comercial',
        icon: '📈', cta: '#/mercado',
        autoType: 'second_piggy',
        requires: 'm2',
    },
    {
        key: 'm5', sortOrder: 5,
        title: 'Compra en locales aliados',
        reward: 'Desbloquea Piggy Silver (24h)',
        icon: '&#127980;', cta: '#/aliados',
        autoType: null,   // manual
        requires: null,
    },
    {
        key: 'm6', sortOrder: 6,
        title: 'Cierra tu primer ciclo',
        reward: 'Desbloquea Piggy Silver (24h)',
        icon: '&#128260;', cta: null,
        autoType: 'first_cycle',
        requires: null,
    },
    {
        key: 'm7', sortOrder: 7,
        title: 'Activa tu 3er Piggy',
        reward: 'Mantén 10% Margen Comercial',
        icon: '&#128048;', cta: '#/mercado',
        autoType: 'third_piggy',
        requires: 'm4',
    },
    {
        key: 'm8', sortOrder: 8,
        title: 'Compra la oferta de la semana',
        reward: 'Desbloquea Piggy Gold (24h)',
        icon: '&#128293;', cta: '#/mercado',
        autoType: null,   // manual
        requires: null,
    },
    {
        key: 'm9', sortOrder: 9,
        title: 'Refiere y logra una compra',
        reward: 'Obtén $30.000 en tu Wallet',
        icon: '&#129309;', cta: null,
        autoType: 'first_referral_completed',
        requires: null,
    },
];

/* ─── Auto-completion logic ─────────────────
   Returns a map { 'm1': true, 'm2': false, … }
   based purely on the current AppState.
   ─────────────────────────────────────────── */

function buildAutoCompletionMap(piggies, profile) {
    const completedPiggies = piggies.filter(p => p.isComplete);
    const referralStats    = AppState.get('referralStats') || {};
    const completedRefs    = referralStats.completedReferrals || 0;

    return {
        m1: !!profile,
        m2: piggies.length >= 1,
        m4: piggies.length >= 2,
        m6: completedPiggies.length >= 1,
        m7: piggies.length >= 3,
        m9: completedRefs >= 1,
    };
}

/* ─── Merge DB rows with definitions ────────
   Applies locking rules and fills defaults
   for missions not yet in the DB.
   ─────────────────────────────────────────── */

function mergeWithDefinitions(dbRows, autoMap) {
    const dbMap = new Map(dbRows.map(r => [r.mission_key, r]));

    return MISSION_DEFINITIONS.map(def => {
        const dbRow      = dbMap.get(def.key);
        const isCompleted = dbRow?.is_completed || autoMap[def.key] || false;

        // Lock if the required mission is not completed yet
        let isLocked = false;
        if (def.requires) {
            const reqRow = dbMap.get(def.requires);
            const reqDone = reqRow?.is_completed || autoMap[def.requires] || false;
            if (!reqDone) isLocked = true;
        }

        return {
            id: def.key,
            title: def.title,
            reward: def.reward,
            icon: def.icon,
            cta: def.cta,
            is_completed: isCompleted,
            is_locked: isLocked,
            completed_at: dbRow?.completed_at || null,
        };
    });
}

/* ─── Public API ─────────────────────────── */

/**
 * Fetch all missions for the current user.
 * Auto-completable missions are upserted to DB on each call.
 * Manual missions are only updated when completeMissionManual() is called.
 * @returns {Promise<Array>}
 */
export async function getMissions(piggiesOverride = null) {
    if (isUsingMockData()) {
        return syncMissionsStatus(piggiesOverride);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    // Use passed piggies if available (avoids race condition when called in parallel
    // with getUserPiggies() before AppState has been updated).
    const piggies = piggiesOverride ?? AppState.get('piggies') ?? [];
    const profile = AppState.get('profile');
    const autoMap = buildAutoCompletionMap(piggies, profile);

    // Fetch existing DB rows for this user
    const { data: dbRows } = await client
        .from('missions')
        .select('mission_key, is_completed, completed_at')
        .eq('user_id', user.id);

    const dbMap = new Map((dbRows || []).map(r => [r.mission_key, r]));

    // Upsert auto-completable missions (never overwrite manual ones)
    const autoRows = MISSION_DEFINITIONS
        .filter(def => def.autoType !== null)
        .map(def => {
            const isCompleted = autoMap[def.key] || false;
            const existing    = dbMap.get(def.key);
            return {
                user_id:      user.id,
                mission_key:  def.key,
                mission_name: def.key,
                title:        def.title,
                reward:       def.reward,
                icon:         def.icon,
                cta:          def.cta || null,
                sort_order:   def.sortOrder,
                is_completed: isCompleted,
                // Preserve original completion timestamp
                completed_at: isCompleted
                    ? (existing?.completed_at || new Date().toISOString())
                    : null,
            };
        });

    if (autoRows.length > 0) {
        const { error } = await client
            .from('missions')
            .upsert(autoRows, { onConflict: 'user_id,mission_key' });
        if (error) console.warn('getMissions upsert error:', error.message);
    }

    // Re-fetch fresh data (includes manual completions from DB)
    const { data: freshRows } = await client
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

    return mergeWithDefinitions(freshRows || [], autoMap);
}

/**
 * Mark a mission as manually completed (e.g. m3, m5, m8).
 * Persists to DB so it survives page reloads.
 * @param {string} missionKey - 'm1' through 'm9'
 */
export async function completeMissionManual(missionKey) {
    // Keep in-memory fallback for mock mode
    if (isUsingMockData()) {
        _mockManualCompletions.add(missionKey);
        return;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const def = MISSION_DEFINITIONS.find(d => d.key === missionKey);
    if (!def) return;

    const { error } = await client
        .from('missions')
        .upsert({
            user_id:      user.id,
            mission_key:  missionKey,
            mission_name: missionKey,
            title:        def.title,
            reward:       def.reward,
            icon:         def.icon,
            cta:          def.cta || null,
            sort_order:   def.sortOrder,
            is_completed: true,
            completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,mission_key' });

    if (error) console.warn('completeMissionManual error:', error.message);
}

/**
 * Get only active (not completed AND not locked) missions.
 * @returns {Promise<Array>}
 */
export async function getActiveMissions(piggiesOverride = null) {
    const missions = await getMissions(piggiesOverride);
    return missions.filter(m => !m.is_completed && !m.is_locked);
}

/**
 * Get mission progress stats.
 * @returns {Promise<{ total: number, completed: number, percent: number }>}
 */
export async function getMissionsProgress() {
    const missions = await getMissions();
    const total     = missions.length;
    const completed = missions.filter(m => m.is_completed).length;
    const percent   = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
}

/* ─── Mock / Backward-compat ─────────────── */

// In-memory set for mock mode manual completions
const _mockManualCompletions = new Set();

/**
 * Synchronous fallback used only in mock/dev mode.
 * Returns missions with auto-detected status from AppState.
 */
export function syncMissionsStatus(piggiesOverride = null) {
    const piggies = piggiesOverride ?? AppState.get('piggies') ?? [];
    const profile = AppState.get('profile');
    const autoMap = buildAutoCompletionMap(piggies, profile);

    return MOCK_MISSIONS.map(mission => {
        let isCompleted = _mockManualCompletions.has(mission.id)
            || autoMap[mission.id]
            || false;

        let isLocked = false;
        const def = MISSION_DEFINITIONS.find(d => d.key === mission.id);
        if (def?.requires) {
            isLocked = !(autoMap[def.requires] || _mockManualCompletions.has(def.requires));
        }

        return { ...mission, is_completed: isCompleted, is_locked: isLocked };
    });
}

/**
 * @deprecated Use getMissions() instead.
 * Kept for any callers that still use the sync version.
 */
export function isMissionCompletedManual(missionKey) {
    return _mockManualCompletions.has(missionKey);
}
