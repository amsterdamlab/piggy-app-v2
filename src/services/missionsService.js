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
        title: 'Descubre los Restaurantes Aliados',
        reward: 'Conoce dónde redimir tus bonos',
        icon: '🍽️', cta: '#/aliados',
        autoType: 'visited_aliados',
        requires: 'm3',
    },
    {
        key: 'm5', sortOrder: 5,
        title: 'Compra tu 2do Piggy',
        reward: 'Aumenta tus ganancias en engorde',
        icon: '📈', cta: '#/mercado',
        autoType: 'second_piggy',
        requires: 'm4',
    },
    {
        key: 'm6', sortOrder: 6,
        title: 'Registra tus Datos Personales y Bancarios',
        reward: 'Desbloquea el Piggy Plata',
        icon: '🏦', cta: '#/perfil?subscreen=datos',
        autoType: 'profile_complete',
        requires: 'm5',
    },
    {
        key: 'm7', sortOrder: 7,
        title: 'Adopta el Piggy Plata',
        reward: 'Bono extra del 2% al finalizar el ciclo',
        icon: '🥈', cta: 'open_silver_modal',
        requires: 'm6',
        hasTimer: true,
        timerHours: 72,
    },
];

/* ─── Mock Mode LocalStorage Persistence ─── */
const MOCK_STORAGE_KEY = 'piggy_mock_user_missions';

function getMockMissions() {
    const stored = localStorage.getItem(MOCK_STORAGE_KEY);
    if (stored) {
        try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    return MOCK_MISSIONS;
}

function saveMockMissions(missions) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(missions));
}

/* ─── Get User Missions ─── */

/**
 * Fetch all missions with current completion state for the active user.
 * Merges static definitions with DB user_missions table (or mock data).
 * Evaluates prerequisite locks and auto-completion conditions in real time.
 *
 * @returns {Promise<Array>} Array of 7 mission objects with is_completed, is_unlocked, is_claimed, timer
 */
export async function getUserMissions() {
    const piggies = AppState.get('piggies') || [];
    const profile = AppState.get('profile') || {};
    const autoMap = buildAutoCompletionMap(piggies, profile);

    if (isUsingMockData()) {
        const mockRows = getMockMissions();
        return mergeWithDefinitions(mockRows, autoMap);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return mergeWithDefinitions([], autoMap);

    // Auto-ensure welcome bonus ($20.000) exists on profile
    await ensureWelcomeBonusAssigned(user.id);

    // Fetch existing progress from Supabase
    const { data: dbRows, error } = await client
        .from('user_missions')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.warn('Error fetching user_missions, using defaults:', error);
        return mergeWithDefinitions([], autoMap);
    }

    // Auto-insert any mission that is completed via client state but not yet saved in DB
    const merged = mergeWithDefinitions(dbRows || [], autoMap);
    for (const m of merged) {
        if (m.is_completed && !dbRows?.find(r => r.mission_key === m.key)) {
            await autoSaveCompletedMission(client, user.id, m.key);
        }
    }

    return merged;
}

/* ─── Auto-Completion Checkers ─── */

/**
 * Builds a map of { mission_key: boolean } indicating if client-side state
 * satisfies the completion condition.
 */
function buildAutoCompletionMap(piggies, profile) {
    const completedPiggies = piggies.filter(p => p.isComplete);
    const referralStats    = AppState.get('referralStats') || {};
    const completedRefs    = referralStats.completedReferrals || 0;
    const visitedSections  = AppState.get('visitedSections') || {};
    const pwaInstalled     = localStorage.getItem('piggy_pwa_installed') === 'true';

    // Profile bank data is completed if user has filled bank_name and bank_breve_key
    const isProfileComplete = Boolean(profile?.bank_name && profile?.bank_breve_key);

    return {
        m1: true,                                // M1 auto-completed (welcome bonus granted)
        m2: piggies.length >= 1,                 // bought 1st piggy
        m3: visitedSections.referidos || false, // visited referidos modal
        m4: visitedSections.aliados   || false, // visited /aliados
        m5: piggies.length >= 2,                 // bought 2nd piggy
        m6: isProfileComplete,                   // filled bank info in Mi Perfil
        m7: false,                               // silver piggy is claimed via modal
    };
}

/* ─── Merge DB Rows with Definitions ─── */

function mergeWithDefinitions(dbRows, autoMap) {
    const dbMap = new Map((dbRows || []).map(r => [r.mission_key, r]));

    return MISSION_DEFINITIONS.map(def => {
        const dbRow = dbMap.get(def.key);

        // A mission is completed if DB says so OR client auto-check is true
        const isCompleted = dbRow?.is_completed || autoMap[def.key] || false;
        const isClaimed = dbRow?.is_claimed || false;

        // Check unlock: first mission is always unlocked; others require previous mission completed
        let isUnlocked = false;
        if (!def.requires) {
            isUnlocked = true;
        } else {
            const reqRow = dbMap.get(def.requires);
            const reqAuto = autoMap[def.requires] || false;
            isUnlocked = reqRow?.is_completed || reqAuto;
        }

        // M7 timer calculation (72h from M6 completion date)
        let timerExpiresAt = null;
        if (def.hasTimer && def.key === 'm7') {
            const m6Row = dbMap.get('m6');
            if (m6Row?.completed_at) {
                const m6Date = new Date(m6Row.completed_at);
                timerExpiresAt = new Date(m6Date.getTime() + def.timerHours * 60 * 60 * 1000).toISOString();
            } else if (autoMap.m6) {
                // If M6 was just auto-completed now, start 72h countdown from now
                timerExpiresAt = new Date(Date.now() + def.timerHours * 60 * 60 * 1000).toISOString();
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
            timer_expires_at: timerExpiresAt,
        };
    });
}

/* ─── Auto-Save Completed Mission ─── */

async function autoSaveCompletedMission(client, userId, missionKey) {
    try {
        await client
            .from('user_missions')
            .upsert({
                user_id: userId,
                mission_key: missionKey,
                is_completed: true,
                completed_at: new Date().toISOString(),
            }, { onConflict: 'user_id,mission_key' });
    } catch (e) {
        console.warn(`Could not auto-save mission ${missionKey}:`, e);
    }
}

/* ─── Record Action on Visit ─── */

/**
 * Call when the user visits a section that satisfies a mission (e.g. /gourmet, /aliados, referidos modal).
 * Records completion in DB and updates AppState.
 *
 * @param {string} missionKey - e.g. 'm1', 'm3', 'm4'
 */
export async function completeMissionOnVisit(missionKey) {
    const visited = AppState.get('visitedSections') || {};
    const sectionMap = {
        m1: 'gourmet',
        m3: 'referidos',
        m4: 'aliados',
    };

    if (sectionMap[missionKey]) {
        AppState.set({
            visitedSections: { ...visited, [sectionMap[missionKey]]: true },
        });
    }

    if (isUsingMockData()) {
        const missions = getMockMissions();
        const m = missions.find(x => x.mission_key === missionKey);
        if (m) {
            m.is_completed = true;
            m.completed_at = new Date().toISOString();
            saveMockMissions(missions);
        }
        return;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    await autoSaveCompletedMission(client, user.id, missionKey);
}

/* ─── Claim Silver Piggy (M7) ─── */

/**
 * Claim the Silver Piggy reward upon completing M7.
 * Marks M7 as claimed and unlocks the special Silver Piggy badge.
 *
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
export async function claimSilverPiggy() {
    if (isUsingMockData()) {
        const missions = getMockMissions();
        const m7 = missions.find(x => x.mission_key === 'm7');
        if (m7) {
            m7.is_completed = true;
            m7.is_claimed = true;
            m7.claimed_at = new Date().toISOString();
            saveMockMissions(missions);
        }
        return { success: true };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const { error } = await client
        .from('user_missions')
        .upsert({
            user_id: user.id,
            mission_key: 'm7',
            is_completed: true,
            is_claimed: true,
            completed_at: new Date().toISOString(),
            claimed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,mission_key' });

    if (error) {
        console.error('Error claiming Silver Piggy:', error);
        return { success: false, reason: error.message };
    }

    return { success: true };
}

/* ─── Timer Helper ─── */

/**
 * Formats milliseconds remaining into HH:MM:SS string.
 * @param {string|null} expiresAt ISO date string
 * @returns {{ expired: boolean, formatted: string, totalSeconds: number }}
 */
export function getTimerState(expiresAt) {
    if (!expiresAt) return { expired: false, formatted: '72:00:00', totalSeconds: 72 * 3600 };

    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) {
        return { expired: true, formatted: '00:00:00', totalSeconds: 0 };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = n => String(n).padStart(2, '0');
    return {
        expired: false,
        formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        totalSeconds,
    };
}
