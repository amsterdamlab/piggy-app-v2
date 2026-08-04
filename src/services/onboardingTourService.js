/* ============================================
   PIGGY APP — Onboarding Tour Service
   Manages onboarding state and persistence in
   localStorage & Supabase profiles table.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';

const LOCAL_STORAGE_KEY = 'piggy_onboarding_completed';

/**
 * Check if the current user should see the onboarding tour.
 * Strict check: returns false if tour was already completed in localStorage or DB.
 * @returns {Promise<boolean>}
 */
export async function shouldShowOnboardingTour() {
    // 1. LocalStorage check first (prevents re-triggering on page refresh)
    if (localStorage.getItem(LOCAL_STORAGE_KEY) === 'true') {
        return false;
    }

    // 2. Check profile in AppState
    const profile = AppState.get('profile');
    if (profile && profile.has_completed_onboarding === true) {
        localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
        return false;
    }

    if (isUsingMockData()) {
        return false; // In mock mode, only start via explicit button
    }

    try {
        const client = getClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) return false;

        const { data } = await client
            .from('profiles')
            .select('has_completed_onboarding')
            .eq('id', user.id)
            .maybeSingle();

        if (data && data.has_completed_onboarding === true) {
            localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
            return false;
        }
    } catch (err) {
        console.warn('Error checking onboarding status:', err);
    }

    // If never completed, show once
    return true;
}

/**
 * Mark the onboarding tour as completed in both localStorage and Supabase DB.
 */
export async function markOnboardingTourAsCompleted() {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');

    // Update local AppState profile
    const profile = AppState.get('profile') || {};
    profile.has_completed_onboarding = true;
    AppState.set({ profile });

    if (isUsingMockData()) return;

    try {
        const client = getClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;

        await client
            .from('profiles')
            .update({ has_completed_onboarding: true })
            .eq('id', user.id);
    } catch (err) {
        console.warn('Error marking onboarding as completed in DB:', err);
    }
}
