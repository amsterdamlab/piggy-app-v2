/* ============================================
   PIGGY APP — Missions Service (v2)
   7 missions: M1-M7 with visit-based auto-complete
   and Silver Piggy 72h countdown for M6.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';
import { MOCK_MISSIONS } from './mockData.js';

/* ─── Mission Definitions ─────────────────────
   Source of truth for mission structure (7 missions).
   Phase 2: move these to a mission_definitions table
   so admin can manage them without deploys.
   ─────────────────────────────────────────── */

const MISSION_DEFINITIONS = [
    {
        key: 'm1', sortOrder: 1,
        title: 'Obtén tu Bono de Bienvenida',
        reward: 'Encuentra tu Bono de Consumo en la Tienda',
        icon: '🎁', cta: '#/gourmet',
        autoType: 'visited_gourmet',
        requires: null,
    },
    {
        key: 'm2', sortOrder: 2,
        title: 'Compra tu primer Piggy',
        reward: 'Aprende a recargar tu billetera',
        icon: '🐷', cta: 'open_buy_piggy',
        autoType: 'first_piggy',
        requires: 'm1',
    },
    {
        key: 'm3', sortOrder: 3,
        title: 'Invita a un amigo a Piggy',
        reward: 'Conoce tu código de referido',
        icon: '📲', cta: 'open_referidos',
        autoType: 'visited_referidos',
        requires: 'm2',
    },
    {
        key: 'm4', sortOrder: 4,
        title: 'Compra tu 2do Piggy',
        reward: '+1% en Margen Comercial de tu granja',
        icon: '📈', cta: '#/mercado',
        autoType: 'second_piggy',
        requires: 'm2',
    },
    {
        key: 'm5', sortOrder: 5,
        title: 'Compra en locales aliados',
        reward: 'Conoce los descuentos exclusivos de nuestros aliados',
        icon: '🏛️', cta: '#/aliados',
        autoType: 'visited_aliados',
        requires: 'm3',
    },
    {
        key: 'm6', sortOrder: 6,
        title: 'Activa tu 3er Piggy',
        reward: '72 horas para comprar un Piggy Silver exclusivo',
        icon: '🌟', cta: 'open_silver_modal',
        autoType: 'third_piggy',
        requires: 'm4',
    },
    {
        key: 'm7', sortOrder: 7,
        title: 'Refiere y logra una compra',
        reward: 'Obtén $30.000 en tu Wallet',
        icon: '🤝', cta: 'open_referidos',
        autoType: 'first_referral_completed',
        requires: 'm4',
    },
];

/* ─── Session-level visit guard ──────────────
   Prevents redundant DB writes when the user
   visits the same section multiple times per session.
   ─────────────────────────────────────────── */
const _sessionVisitedMissions = new Set();

/* ─── Auto-completion logic ──────────────────
   Returns a map { 'm1': bool, 'm2': bool, … }
   based on real AppState data.
   ─────────────────────────────────────────── */

function buildAutoCompletionMap(piggies, profile) {
    const completedPiggies = piggies.filter(p => p.isComplete);
    const referralStats    = AppState.get('referralStats') || {};
    const completedRefs    = referralStats.completedReferrals || 0;
    const visitedSections  = AppState.get('visitedSections') || {};

    return {
        m1: visitedSections.gourmet   || false, // visited /gourmet
        m2: piggies.length >= 1,                 // bought 1st piggy
        m3: visitedSections.referidos || false, // visited referidos modal
        m4: piggies.length >= 2,                 // bought 2nd piggy
        m5: visitedSections.aliados   || false, // visited /aliados
        m6: piggies.length >= 3,                 // bought 3rd piggy (silver or regular)
        m7: completedRefs >= 1,                  // referral completed a purchase
    };
}

/* ─── Merge DB rows with definitions ─────────
   Applies locking rules, fills defaults, and
   injects silverExpiry for M6.
   ─────────────────────────────────────────── */

function mergeWithDefinitions(dbRows, autoMap) {
    const dbMap = new Map(dbRows.map(r => [r.mission_key, r]));

    return MISSION_DEFINITIONS.map(def => {
        const dbRow      = dbMap.get(def.key);
        const isCompleted = dbRow?.is_completed || autoMap[def.key] || false;

        // Lock if the required mission is not yet completed
        let isLocked = false;
        if (def.requires) {
            const reqRow  = dbMap.get(def.requires);
            const reqDone = reqRow?.is_completed || autoMap[def.requires] || false;
            if (!reqDone) isLocked = true;
        }

        // M6: compute the 72h Silver Piggy offer window from M4's completion timestamp
        let silverExpiry = null;
        if (def.key === 'm6' && !isCompleted && !isLocked) {
            const m4Row = dbMap.get('m4');
            if (m4Row?.completed_at) {
                const expiryMs = new Date(m4Row.completed_at).getTime() + (72 * 60 * 60 * 1000);
                silverExpiry = new Date(expiryMs).toISOString();
            }
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
            silverExpiry,
        };
    });
}

/* ─── Public API ──────────────────────────── */

/**
 * Fetch all missions for the current user.
 * Auto-completable missions are upserted to DB on each call.
 * Manual (visit-based) missions are updated via completeMissionOnVisit().
 * @param {Array|null} piggiesOverride - Pass loaded piggies to avoid race condition.
 * @returns {Promise<Array>}
 */
export async function getMissions(piggiesOverride = null) {
    if (isUsingMockData()) {
        return syncMissionsStatus(piggiesOverride);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    // Use passed piggies if available to avoid race condition in parallel Promise.all
    const piggies = piggiesOverride ?? AppState.get('piggies') ?? [];
    const profile = AppState.get('profile');
    const autoMap = buildAutoCompletionMap(piggies, profile);

    // Fetch existing DB rows for this user
    const { data: dbRows } = await client
        .from('missions')
        .select('mission_key, is_completed, completed_at')
        .eq('user_id', user.id);

    const dbMap = new Map((dbRows || []).map(r => [r.mission_key, r]));

    // Upsert only auto-completable missions (not visit-based ones — those use completeMissionOnVisit)
    const autoKeys = ['m2', 'm4', 'm6', 'm7']; // missions with real data triggers
    const autoRows = MISSION_DEFINITIONS
        .filter(def => autoKeys.includes(def.key))
        .map(def => {
            const existing    = dbMap.get(def.key);
            const isCompleted = autoMap[def.key] || existing?.is_completed || false;
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
                // Preserve original completion timestamp — never overwrite
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

    // Re-fetch fresh data (includes visit-based and manual completions from DB)
    const { data: freshRows } = await client
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

    return mergeWithDefinitions(freshRows || [], autoMap);
}

/**
 * Mark a mission as completed when the user visits a key section.
 * Persists to DB so it survives page reloads.
 * Uses a session-level guard to avoid redundant DB calls.
 * @param {string} missionKey - e.g. 'm1', 'm3', 'm5'
 */
export async function completeMissionOnVisit(missionKey) {
    // Session guard — only write to DB once per session per key
    if (_sessionVisitedMissions.has(missionKey)) return;
    _sessionVisitedMissions.add(missionKey);

    // Persist section visit in AppState so buildAutoCompletionMap sees it
    const visitedSections = AppState.get('visitedSections') || {};
    const sectionMap = { m1: 'gourmet', m3: 'referidos', m5: 'aliados' };
    if (sectionMap[missionKey]) {
        visitedSections[sectionMap[missionKey]] = true;
        AppState.set({ visitedSections });
    }

    if (isUsingMockData()) {
        _mockManualCompletions.add(missionKey);
        return;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    // Only write if not already completed in DB
    const { data: existing } = await client
        .from('missions')
        .select('is_completed')
        .eq('user_id', user.id)
        .eq('mission_key', missionKey)
        .maybeSingle();

    if (existing?.is_completed) return; // Already done, skip write

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

    if (error) console.warn(`completeMissionOnVisit(${missionKey}) error:`, error.message);
}

/**
 * Mark a mission as manually completed (legacy path for admin or special flows).
 * @param {string} missionKey
 */
export async function completeMissionManual(missionKey) {
    if (isUsingMockData()) {
        _mockManualCompletions.add(missionKey);
        return;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    // Skip if already completed to preserve original completed_at
    const { data: existing } = await client
        .from('missions')
        .select('is_completed')
        .eq('user_id', user.id)
        .eq('mission_key', missionKey)
        .maybeSingle();

    if (existing?.is_completed) return;

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
 * @param {Array|null} piggiesOverride
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

const _mockManualCompletions = new Set();

/**
 * Synchronous fallback used only in mock/dev mode.
 */
export function syncMissionsStatus(piggiesOverride = null) {
    const piggies = piggiesOverride ?? AppState.get('piggies') ?? [];
    const profile = AppState.get('profile');
    const autoMap = buildAutoCompletionMap(piggies, profile);

    return MISSION_DEFINITIONS.map(def => {
        const isCompleted = _mockManualCompletions.has(def.key) || autoMap[def.key] || false;

        let isLocked = false;
        if (def.requires) {
            isLocked = !(autoMap[def.requires] || _mockManualCompletions.has(def.requires));
        }

        return {
            id: def.key, title: def.title, reward: def.reward,
            icon: def.icon, cta: def.cta,
            is_completed: isCompleted, is_locked: isLocked,
            completed_at: isCompleted ? new Date().toISOString() : null,
            silverExpiry: null,
        };
    });
}

/**
 * @deprecated Use getMissions() instead.
 */
export function isMissionCompletedManual(missionKey) {
    return _mockManualCompletions.has(missionKey);
}