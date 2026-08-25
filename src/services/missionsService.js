/* ============================================
   PIGGY APP — Missions & Rewards Service
   Handles mission definition, completion logic,
   and daily reward countdown timers.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';
import { renderIcon } from '../components/Icons.js';

/* ─── Mission Definitions (Config) ───────────
   9 distinct mission actions that guide the user
   through the entire Piggy App funnel.
   ─────────────────────────────────────────── */

export const MISSION_DEFINITIONS = [
    {
        key: 'm1',
        title: 'Explora Tienda Gourmet',
        description: 'Conoce los cortes premium y productos de la granja.',
        reward_amount: 10000,
        reward_type: 'consumo',
        action_label: 'Ir a Tienda',
        route: 'gourmet',
        iconName: 'gift',
        requires: null,
        autoType: 'visit_gourmet',
    },
    {
        key: 'm2',
        title: 'Adopta tu 1er Piggy',
        description: 'Inicia tu ciclo de engorde y genera rendimientos.',
        reward_amount: 10000,
        reward_type: 'consumo',
        action_label: 'Adoptar Piggy',
        route: 'marketplace',
        iconName: 'piggy',
        requires: 'm1',
        autoType: 'first_piggy_bought',
    },
    {
        key: 'm3',
        title: 'Conoce el Sistema de Referidos',
        description: 'Gana comisiones invitando a tus amigos a la granja.',
        reward_amount: 10000,
        reward_type: 'consumo',
        action_label: 'Ver Referidos',
        route: 'modal:referidos',
        iconName: 'users',
        requires: 'm2',
        autoType: 'visit_referidos',
    },
    {
        key: 'm4',
        title: 'Instala la Aplicación',
        description: 'Accede más rápido instalando Piggy App en tu pantalla.',
        reward_amount: 10000,
        reward_type: 'consumo',
        action_label: 'Instalar App',
        route: 'action:install_pwa',
        iconName: 'rocket',
        requires: 'm3',
        autoType: 'pwa_installed',
    },
    {
        key: 'm5',
        title: '¡Flash! Adopta tu 2do Piggy',
        description: 'Multiplica tus ganancias antes de que el contador expire.',
        reward_amount: 20000,
        reward_type: 'consumo',
        action_label: 'Adoptar Ahora',
        route: 'marketplace',
        iconName: 'sparkles',
        requires: 'm4',
        autoType: 'second_piggy_bought',
        hasFlashTimer: true,
        flashHours: 72,
    },
    {
        key: 'm6',
        title: 'Completa tus Datos Bancarios',
        description: 'Registra tu cuenta para recibir tus retiros sin demoras.',
        reward_amount: 10000,
        reward_type: 'consumo',
        action_label: 'Completar Datos',
        route: 'perfil',
        iconName: 'card',
        requires: 'm5',
        autoType: 'profile_completed',
    },
    {
        key: 'm7',
        title: 'Visita los Restaurantes Aliados',
        description: 'Descubre dónde puedes redimir tus Bonos de Consumo.',
        reward_amount: 10000,
        reward_type: 'consumo',
        action_label: 'Ver Aliados',
        route: 'aliados',
        iconName: 'mapPin',
        requires: 'm6',
        autoType: 'visit_aliados',
    },
    {
        key: 'm8',
        title: '¡Oferta Relámpago! Adopta tu 3er Piggy',
        description: 'Consolida tu portafolio de cerdos en engorde hoy mismo.',
        reward_amount: 30000,
        reward_type: 'consumo',
        action_label: 'Ver Piggys',
        route: 'marketplace',
        iconName: 'sparkles',
        requires: 'm7',
        autoType: 'third_piggy_bought',
        hasFlashTimer: true,
        flashHours: 48,
    },
    {
        key: 'm9',
        title: 'Consigue tu Primer Referido',
        description: 'Comparte tu link y gana cuando tu invitado compre.',
        reward_amount: 20000,
        reward_type: 'consumo',
        action_label: 'Compartir Link',
        route: 'modal:referidos',
        iconName: 'share',
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

    // Profile bank data is completed if user has filled bank_name and bank_breve_key
    const isProfileComplete = Boolean(profile?.bank_name && profile?.bank_breve_key);

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

    // Pass 2: Build final mission objects using effective completion for prerequisites
    return MISSION_DEFINITIONS.map(def => {
        const dbRow = dbMap.get(def.key);
        const isCompleted = effectiveCompletionMap.get(def.key);
        const isClaimed   = dbRow?.is_claimed || false;

        let isUnlocked = false;
        if (!def.requires) {
            isUnlocked = true;
        } else {
            isUnlocked = Boolean(effectiveCompletionMap.get(def.requires));
        }

        let flashExpiresAt = null;
        if (def.hasFlashTimer) {
            const reqKey = def.requires;
            const reqRow = dbMap.get(reqKey);
            if (reqRow?.completed_at) {
                const ms = new Date(reqRow.completed_at).getTime() + (def.flashHours * 60 * 60 * 1000);
                flashExpiresAt = new Date(ms).toISOString();
            }
        }

        return {
            ...def,
            id: dbRow?.id || null,
            is_completed: isCompleted,
            is_claimed: isClaimed,
            is_unlocked: isUnlocked,
            completed_at: dbRow?.completed_at || (isCompleted ? new Date().toISOString() : null),
            claimed_at: dbRow?.claimed_at || null,
            flash_expires_at: flashExpiresAt,
        };
    });
}

/* ─── Mock Fallback Storage ────────────────── */

const MOCK_STORAGE_KEY = 'piggy_mock_user_missions';

function getMockMissions() {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveMockMissions(rows) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(rows));
}

/* ─── Service API ──────────────────────────── */

/**
 * Fetch all missions merged with user state from Supabase (or localStorage in mock mode).
 * @returns {Promise<Array>} Array of unified mission objects
 */
export async function getUserMissions() {
    const piggies = AppState.get('piggies') || [];
    const profile = AppState.get('profile') || {};
    const autoMap = buildAutoCompletionMap(piggies, profile);

    if (isUsingMockData()) {
        const mockRows = getMockMissions();
        const merged = mergeWithDefinitions(mockRows, autoMap);

        // Sync completed status back to mock storage so completed_at timestamps persist
        let updated = false;
        merged.forEach(m => {
            if (m.is_completed && !mockRows.find(r => r.mission_key === m.key)) {
                mockRows.push({
                    mission_key: m.key,
                    is_completed: true,
                    completed_at: new Date().toISOString(),
                    is_claimed: false,
                    claimed_at: null,
                });
                updated = true;
            }
        });
        if (updated) saveMockMissions(mockRows);

        return merged;
    }

    try {
        const client = getClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) return mergeWithDefinitions([], autoMap);

        const { data: dbRows, error } = await client
            .from('user_missions')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.warn('[missionsService] Error fetching user_missions:', error.message);
            return mergeWithDefinitions([], autoMap);
        }

        const merged = mergeWithDefinitions(dbRows || [], autoMap);

        // Auto-save newly completed missions in DB in the background
        const toInsert = [];
        merged.forEach(m => {
            if (m.is_completed && (!m.id || !dbRows.find(r => r.mission_key === m.key))) {
                toInsert.push({
                    user_id: user.id,
                    mission_key: m.key,
                    is_completed: true,
                    completed_at: new Date().toISOString(),
                });
            }
        });

        if (toInsert.length > 0) {
            client
                .from('user_missions')
                .upsert(toInsert, { onConflict: 'user_id,mission_key' })
                .then(({ error: upsertErr }) => {
                    if (upsertErr) console.warn('[missionsService] Auto-insert error:', upsertErr.message);
                });
        }

        return merged;
    } catch (err) {
        console.error('[missionsService] Unexpected error:', err);
        return mergeWithDefinitions([], autoMap);
    }
}

/**
 * Claim the reward for a completed and unlocked mission.
 * Credits $referral_balance (Bonos de Consumo) in profiles via DB trigger.
 * @param {string} missionKey - e.g. 'm1'
 * @returns {Promise<{ success: boolean, mission?: Object, newBalance?: number, error?: string }>}
 */
export async function claimMissionReward(missionKey) {
    const def = MISSION_DEFINITIONS.find(d => d.key === missionKey);
    if (!def) return { success: false, error: 'Misión no encontrada' };

    if (isUsingMockData()) {
        const mockRows = getMockMissions();
        let row = mockRows.find(r => r.mission_key === missionKey);
        if (!row) {
            row = { mission_key: missionKey, is_completed: true, completed_at: new Date().toISOString() };
            mockRows.push(row);
        }
        if (row.is_claimed) return { success: false, error: 'Recompensa ya reclamada' };

        row.is_claimed = true;
        row.claimed_at = new Date().toISOString();
        saveMockMissions(mockRows);

        // Update profile in AppState
        const currentProfile = AppState.get('profile') || {};
        const currentBonus = currentProfile.referral_balance || 0;
        const newBonus = currentBonus + def.reward_amount;
        AppState.set({ profile: { ...currentProfile, referral_balance: newBonus } });

        return { success: true, mission: { ...def, is_claimed: true, is_completed: true }, newBalance: newBonus };
    }

    try {
        const client = getClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { success: false, error: 'Usuario no autenticado' };

        // Atomic DB RPC claim
        const { data, error } = await client.rpc('claim_mission_reward', {
            p_mission_key: missionKey,
        });

        if (error) {
            console.error('[missionsService] RPC claim_mission_reward error:', error.message);
            return { success: false, error: error.message };
        }

        if (!data || !data.success) {
            return { success: false, error: data?.reason || 'No se pudo reclamar la recompensa' };
        }

        // Sync fresh profile to AppState
        const { data: freshProfile } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (freshProfile) {
            const cur = AppState.get('profile') || {};
            AppState.set({ profile: { ...cur, ...freshProfile } });
        }

        return {
            success: true,
            mission: { ...def, is_claimed: true, is_completed: true },
            newBalance: freshProfile?.referral_balance || 0,
        };
    } catch (err) {
        console.error('[missionsService] claimMissionReward exception:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Record a visit/action completion for a specific mission without locking the user interface.
 * Guarded by a session-level Set so it runs at most once per session per mission key.
 * @param {string} missionKey - e.g. 'm1', 'm3', 'm4', 'm7'
 */
export async function completeMissionOnVisit(missionKey) {
    if (_sessionVisitedMissions.has(missionKey)) return;
    _sessionVisitedMissions.add(missionKey);

    const visited = AppState.get('visitedSections') || {};
    const sectionMap = {
        m1: 'gourmet',
        m3: 'referidos',
        m7: 'aliados',
    };
    if (sectionMap[missionKey]) {
        AppState.set({
            visitedSections: { ...visited, [sectionMap[missionKey]]: true },
        });
    }

    if (isUsingMockData()) {
        const mockRows = getMockMissions();
        let row = mockRows.find(r => r.mission_key === missionKey);
        if (!row) {
            mockRows.push({
                mission_key: missionKey,
                is_completed: true,
                completed_at: new Date().toISOString(),
                is_claimed: false,
                claimed_at: null,
            });
            saveMockMissions(mockRows);
        }
        return;
    }

    try {
        const client = getClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;

        await client
            .from('user_missions')
            .upsert({
                user_id: user.id,
                mission_key: missionKey,
                is_completed: true,
                completed_at: new Date().toISOString(),
            }, { onConflict: 'user_id,mission_key' });
    } catch (e) {
        console.warn(`[missionsService] completeMissionOnVisit (${missionKey}) failed:`, e);
    }
}

/**
 * Check if the daily reward countdown has elapsed (stored in localStorage per user).
 * Countdown starts at 12 hours from the last claim.
 * @returns {{ ready: boolean, remainingMs: number, formattedTime: string }}
 */
export function getDailyRewardState() {
    const key = 'piggy_daily_reward_claim_ts';
    const raw = localStorage.getItem(key);
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    if (!raw) {
        return { ready: true, remainingMs: 0, formattedTime: '00:00:00' };
    }

    const lastClaim = parseInt(raw, 10);
    const elapsed = Date.now() - lastClaim;
    const remaining = TWELVE_HOURS_MS - elapsed;

    if (remaining <= 0) {
        return { ready: true, remainingMs: 0, formattedTime: '00:00:00' };
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60)).toString().padStart(2, '0');
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000).toString().padStart(2, '0');

    return {
        ready: false,
        remainingMs: remaining,
        formattedTime: `${hours}:${minutes}:${seconds}`,
    };
}

/**
 * Claim the 12h daily bonus ($5.000 COP in consumption coupons).
 * @returns {Promise<{ success: boolean, amount: number, error?: string }>}
 */
export async function claimDailyReward() {
    const state = getDailyRewardState();
    if (!state.ready) {
        return { success: false, amount: 0, error: `Disponible en ${state.formattedTime}` };
    }

    const key = 'piggy_daily_reward_claim_ts';
    localStorage.setItem(key, Date.now().toString());

    const DAILY_AMOUNT = 5000;

    if (isUsingMockData()) {
        const profile = AppState.get('profile') || {};
        const newBonus = (profile.referral_balance || 0) + DAILY_AMOUNT;
        AppState.set({ profile: { ...profile, referral_balance: newBonus } });
        return { success: true, amount: DAILY_AMOUNT };
    }

    try {
        const client = getClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { success: false, amount: 0, error: 'No autenticado' };

        // Credit to wallet_transactions (consumo)
        await client.from('wallet_transactions').insert({
            user_id: user.id,
            amount: DAILY_AMOUNT,
            type: 'credit',
            description: '🎁 Recompensa Diaria (12h)',
            wallet_type: 'consumo',
        });

        // Sync fresh profile to AppState
        const { data: freshProfile } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (freshProfile) {
            const cur = AppState.get('profile') || {};
            AppState.set({ profile: { ...cur, ...freshProfile } });
        }

        return { success: true, amount: DAILY_AMOUNT };
    } catch (e) {
        console.error('[missionsService] Error claiming daily reward:', e);
        return { success: false, amount: 0, error: e.message };
    }
}
