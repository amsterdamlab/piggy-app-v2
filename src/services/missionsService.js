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
        title: 'Completa tus Datos',
        reward: 'Completa tus datos para que podamos enviarte tus comisiones al final de cada ciclo.',
        icon: '💳', cta: '#/perfil?subscreen=datos',
        autoType: 'completed_profile',
        requires: 'm5',
    },
    {
        key: 'm7', sortOrder: 7,
        title: 'Compra en locales aliados',
        reward: 'Conoce los descuentos exclusivos de nuestros aliados',
        icon: '🏛️', cta: '#/aliados',
        autoType: 'visited_aliados',
        requires: 'm6',
    },
    {
        key: 'm8', sortOrder: 8,
        title: 'Activa tu 3er Piggy (60 días de engorde)',
        reward: 'Esto no se ve todos los días. Obtén un piggy con 60 días de engorde avanzado. (Por tiempo limitado)',
        icon: '⚡', cta: 'open_buy_advanced30',
        autoType: 'third_piggy',
        requires: 'm7',
        hasFlashTimer: true,
    },
    {
        key: 'm9', sortOrder: 9,
        title: 'Refiere y logra una compra',
        reward: 'Obtén $20.000 en tu Wallet por tu primer referido efectivo',
        icon: '🤝', cta: 'open_referidos',
        autoType: 'first_referral_completed',
        requires: 'm8',
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
    const pwaInstalled     = localStorage.getItem('piggy_pwa_installed') === 'true';

    // Profile bank data is completed if user has filled bank_name and bank_account_number
    const isProfileComplete = Boolean(profile?.bank_name && profile?.bank_account_number);

    return {
        m1: visitedSections.gourmet   || false, // visited /gourmet
        m2: piggies.length >= 1,                 // bought 1st piggy
        m3: visitedSections.referidos || false, // visited referidos modal
        m4: pwaInstalled              || false, // installed PWA / accepted prompt
        m5: piggies.length >= 2,                 // bought 2nd piggy (or timer expired)
        m6: isProfileComplete         || false, // filled bank info in Mi Perfil
        m7: visitedSections.aliados   || false, // visited /aliados
        m8: piggies.length >= 3,                 // bought 3rd piggy (or timer expired)
        m9: completedRefs >= 1,                  // referral completed a purchase
    };
}

/* ─── Merge DB rows with definitions ─────────
   Applies locking rules, fills defaults, and
   injects 72h flash timers for M5 and M8.
   ─────────────────────────────────────────── */

function mergeWithDefinitions(dbRows, autoMap) {
    const dbMap = new Map(dbRows.map(r => [r.mission_key, r]));

    // Pass 1: Compute effective completion state for each mission (including flash timer expiration)
    const effectiveCompletionMap = new Map();
    MISSION_DEFINITIONS.forEach(def => {
        const dbRow = dbMap.get(def.key);
        let isCompleted = dbRow?.is_completed || autoMap[def.key] || false;

        if (def.key === 'm5' || def.key === 'm8') {
            const reqKey = def.requires;
            const reqRow = dbMap.get(reqKey);
            if (reqRow?.completed_at) {
                const windowHours = def.key === 'm8' ? 48 : 72;
                const expiryMs = new Date(reqRow.completed_at).getTime() + (windowHours * 60 * 60 * 1000);
                if (Date.now() > expiryMs) {
                    isCompleted = true;
                }
            }
        }

        effectiveCompletionMap.set(def.key, isCompleted);
    });

    // Pass 2: Build final mission objects with correct isLocked state based on effectiveCompletionMap
    return MISSION_DEFINITIONS.map(def => {
        const dbRow       = dbMap.get(def.key);
        const isCompleted = effectiveCompletionMap.get(def.key) || false;

        // Lock if the required mission is not yet completed
        let isLocked = false;
        if (def.requires) {
            const reqDone = effectiveCompletionMap.get(def.requires) || false;
            if (!reqDone) isLocked = true;
        }

        // M5 (Gold): 72h Flash timer | M8 (Advanced 30): 48h Flash timer
        let flashExpiry = null;
        if ((def.key === 'm5' || def.key === 'm8') && !isLocked) {
            const reqKey = def.requires;
            const reqRow = dbMap.get(reqKey);
            if (reqRow?.completed_at) {
                const windowHours = def.key === 'm8' ? 48 : 72;
                const expiryMs = new Date(reqRow.completed_at).getTime() + (windowHours * 60 * 60 * 1000);
                flashExpiry = new Date(expiryMs).toISOString();
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
            flashExpiry,
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
    if (missionKey === 'm1') {
        ensureWelcomeBonusAssigned().catch(err => console.warn('Error assigning welcome bonus:', err));
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
