/* ============================================
   PIGGY APP — Missions Service (v2)
   7 missions: M1-M7 with visit-based auto-complete
   and Silver Piggy 72h countdown for M6.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';
import { MOCK_MISSIONS } from './mockData.js';
import { ensureWelcomeBonusAssigned } from './walletService.js';

/* ─── Mission Definitions ─────────────────────
   Source of truth for mission structure (7 missions).
   Phase 2: move these to a mission_definitions table
   so admin can manage them without deploys.
   ─────────────────────────────────────────── */

const MISSION_DEFINITIONS = [
    {
        key: 'm1', sortOrder: 1,
        title: 'Obtén tu Bono de Bienvenida',
        reward: 'Bono de consumo por valor de $20.000 en Tienda',
        icon: '🎁', cta: '#/gourmet',
        autoType: 'visited_gourmet',
        requires: null,
    },
    {
        key: 'm2', sortOrder: 2,
        title: 'Compra tu primer Piggy',
        reward: 'Aprende a recargar tu billetera',
        icon: '🐷', cta: '#/mercado',
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
        title: 'Descarga Piggy en tu Celular',
        reward: 'Crea el acceso directo a Piggy App en la pantalla de tu celular',
        icon: '📱', cta: 'install_pwa',
        autoType: 'installed_pwa',
        requires: 'm3',
    },
    {
        key: 'm5', sortOrder: 5,
        title: 'Compra tu 2do Piggy (Dorado)',
        reward: 'Aprovecha esta oportunidad de tener en tu granja un piggy especial con extra de comisión. (Por tiempo limitado)',
        icon: '🏆', cta: 'open_buy_gold',
        autoType: 'second_piggy',
        requires: 'm4',
        hasFlashTimer: true,
    },
    {
        key: 'm6', sortOrder: 6,
        title: 'Añade tus Datos Bancarios',
        reward: 'Para recibir tus ganancias directamente en tu cuenta',
        icon: '💳', cta: '#/perfil',
        autoType: 'bank_details',
        requires: 'm5',
    },
    {
        key: 'm7', sortOrder: 7,
        title: 'Conoce a Nuestros Aliados',
        reward: 'Descubre los aliados donde puedes redimir tus ganancias y bonos',
        icon: '🤝', cta: '#/aliados',
        autoType: 'visited_aliados',
        requires: 'm6',
    },
];

/* ─── Session State for Manual Completions ──── */
const _sessionVisitedMissions = new Set();
const _mockManualCompletions = new Set();

/* ─── Helpers ─────────────────────────────── */

/**
 * Check which auto-completable missions are fulfilled based on real app data.
 * Pure function — no DB side-effects.
 * @param {Array} piggies
 * @param {Object|null} profile
 * @returns {Object} map of missionKey -> boolean
 */
function buildAutoCompletionMap(piggies = [], profile = null) {
    const visited = AppState.get('visitedSections') || {};
    return {
        // M1: Visited Gourmet / Tienda section
        m1: !!visited.gourmet,

        // M2: Has at least 1 piggy
        m2: piggies.length >= 1,

        // M3: Visited Referidos section
        m3: !!visited.referidos,

        // M4: PWA installed or visit descargar section
        m4: AppState.get('pwaInstalled') === true || !!visited.descargar,

        // M5: Has at least 2 piggies
        m5: piggies.length >= 2,

        // M6: Bank details filled in profile OR visited Profile section
        m6: !!(profile?.bank_name && profile?.bank_account_number) || !!visited.datos,

        // M7: Visited Aliados section
        m7: !!visited.aliados,

        // M8 (Flash Mission): Has at least 3 piggies
        m8: piggies.length >= 3,

        // M9 (Flash Mission): Has at least 4 piggies
        m9: piggies.length >= 4,
    };
}

/**
 * Merge a mission definition with its DB state and runtime auto-completion.
 * @param {Object} def - Mission definition
 * @param {Object|null} dbRow - Supabase missions table row
 * @param {Object} autoMap - Map of auto-completion results
 * @param {Map} allDbMap - Map of all mission rows by key (for requires check)
 * @returns {Object} enriched mission object
 */
function enrichMission(def, dbRow, autoMap, allDbMap) {
    const isCompleted = autoMap[def.key] || dbRow?.is_completed || false;
    const completedAt = dbRow?.completed_at || null;

    // Check prerequisites
    let isUnlocked = true;
    if (def.requires) {
        const requiredRow = allDbMap.get(def.requires);
        const requiredAuto = autoMap[def.requires];
        isUnlocked = requiredAuto || requiredRow?.is_completed || false;
    }

    // Dynamic Flash Countdown (72h after M4 completion for M5)
    let flashRemainingHours = null;
    let flashExpired = false;

    if (def.hasFlashTimer && isUnlocked && !isCompleted) {
        const m4Row = allDbMap.get('m4');
        if (m4Row?.completed_at) {
            const m4CompletedTime = new Date(m4Row.completed_at).getTime();
            const expiryTime = m4CompletedTime + (72 * 60 * 60 * 1000);
            const remainingMs = expiryTime - Date.now();

            if (remainingMs <= 0) {
                flashExpired = true;
            } else {
                flashRemainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
            }
        }
    }

    return {
        id: def.key,
        key: def.key,
        missionNumber: def.sortOrder,
        title: def.title,
        description: def.reward,
        reward: def.reward,
        icon: def.icon,
        cta: def.cta,
        sortOrder: def.sortOrder,
        isCompleted,
        completedAt,
        isUnlocked,
        requires: def.requires,
        hasFlashTimer: def.hasFlashTimer || false,
        flashRemainingHours,
        flashExpired,
    };
}

/* ─── Mock Fallback ────────────────────────── */

function syncMissionsStatus(piggiesOverride = null) {
    const piggies = piggiesOverride ?? AppState.get('piggies') ?? [];
    const profile = AppState.get('profile');
    const autoMap = buildAutoCompletionMap(piggies, profile);

    // Apply manual mock completions
    _mockManualCompletions.forEach(key => { autoMap[key] = true; });

    const allDbMap = new Map();
    // Build mock DB map
    MISSION_DEFINITIONS.forEach(def => {
        if (autoMap[def.key]) {
            allDbMap.set(def.key, { is_completed: true, completed_at: new Date().toISOString() });
        }
    });

    const enriched = MISSION_DEFINITIONS.map(def => {
        const dbRow = allDbMap.get(def.key) || null;
        return enrichMission(def, dbRow, autoMap, allDbMap);
    });

    AppState.set({ missions: enriched });
    return enriched;
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

    // Upsert auto-completable and timer-expired missions
    const autoKeys = ['m2', 'm4', 'm5', 'm6', 'm8', 'm9']; // missions with real data/state triggers
    const autoRows = MISSION_DEFINITIONS
        .filter(def => autoKeys.includes(def.key))
        .map(def => {
            const existing    = dbMap.get(def.key);
            let isCompleted   = autoMap[def.key] || existing?.is_completed || false;

            // Check flash timer expiry for M5 and M8 when saving autoRows to DB
            if ((def.key === 'm5' || def.key === 'm8') && !isCompleted && def.requires) {
                const reqRow = dbMap.get(def.requires);
                if (reqRow?.completed_at) {
                    const windowHours = def.key === 'm8' ? 48 : 72;
                    const expiryMs = new Date(reqRow.completed_at).getTime() + (windowHours * 60 * 60 * 1000);
                    if (Date.now() > expiryMs) {
                        isCompleted = true;
                    }
                }
            }

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
                completed_at: isCompleted ? (existing?.completed_at || new Date().toISOString()) : null,
            };
        });

    if (autoRows.length > 0) {
        const { error: upsertError } = await client
            .from('missions')
            .upsert(autoRows, { onConflict: 'user_id,mission_key' });
        if (upsertError) console.warn('Missions auto-upsert error:', upsertError.message);
    }

    // Re-fetch updated rows to have complete picture
    const { data: updatedRows } = await client
        .from('missions')
        .select('*')
        .eq('user_id', user.id);

    const updatedDbMap = new Map((updatedRows || []).map(r => [r.mission_key, r]));

    const enriched = MISSION_DEFINITIONS.map(def => {
        const dbRow = updatedDbMap.get(def.key) || null;
        return enrichMission(def, dbRow, autoMap, updatedDbMap);
    });

    AppState.set({ missions: enriched });
    return enriched;
}

/**
 * Mark a visit-based mission as completed (e.g. M1 on visiting Tienda, M3 on visiting Referidos).
 * Writes to Supabase and updates AppState.
 * Safe to call multiple times — guarded per session.
 * @param {string} missionKey - e.g. 'm1', 'm3', 'm7'
 */
export async function completeMissionOnVisit(missionKey) {
    // Si el usuario completa M1 (Tienda/Gourmet), asegurar que tenga su bono de bienvenida en profiles
    if (missionKey === 'm1') {
        ensureWelcomeBonusAssigned().catch(e => console.warn('Error asegurando bono M1:', e));
    }

    // Persist section visit in AppState immediately so buildAutoCompletionMap always sees it
    const visitedSections = AppState.get('visitedSections') || {};
    const sectionMap = { m1: 'gourmet', m3: 'referidos', m6: 'datos', m7: 'aliados' };
    if (sectionMap[missionKey]) {
        if (!visitedSections[sectionMap[missionKey]]) {
            visitedSections[sectionMap[missionKey]] = true;
            AppState.set({ visitedSections });
        }
    }

    // Session guard — only write to DB once per session per key
    if (_sessionVisitedMissions.has(missionKey)) return;
    _sessionVisitedMissions.add(missionKey);

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

    await client
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
}

/**
 * Get the next pending (active) mission to display on the Granja dashboard banner.
 * Priority: lowest sortOrder among uncompleted missions.
 * @param {Array|null} piggiesOverride
 * @returns {Promise<Object|null>}
 */
export async function getActiveMissions(piggiesOverride = null) {
    const all = await getMissions(piggiesOverride);
    const active = all.filter(m => !m.isCompleted);
    return active;
}

/**
 * Calculate mission progress summary.
 * @param {Array|null} piggiesOverride
 * @returns {Promise<{completed: number, total: number, percent: number}>}
 */
export async function getMissionsProgress(piggiesOverride = null) {
    const all = await getMissions(piggiesOverride);
    const completed = all.filter(m => m.isCompleted).length;
    const total = all.length;
    return {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
}
