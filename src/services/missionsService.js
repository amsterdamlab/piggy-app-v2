/* ============================================
   PIGGY APP — Missions Service
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_MISSIONS } from './mockData.js';

/**
 * Fetch user missions.
 */
export async function getUserMissions() {
    if (isUsingMockData()) {
        return [...MOCK_MISSIONS];
    }

    const client = getClient();
    const { data, error } = await client
        .from('missions')
        .select('*')
        .order('is_completed', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}

/**
 * Mark a mission as completed (mock mode simulates it).
 */
export async function completeMission(missionId) {
    if (isUsingMockData()) {
        const mission = MOCK_MISSIONS.find((m) => m.id === missionId);
        if (mission) {
            mission.is_completed = true;
            mission.completed_at = new Date().toISOString();
        }
        return { error: null };
    }

    const client = getClient();
    const { error } = await client
        .from('missions')
        .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
        })
        .eq('id', missionId);

    return { error: error?.message || null };
}
