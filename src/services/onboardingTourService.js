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
 * Prioritizes Supabase user profile so new accounts created on the same
 * browser always see the tour automatically.
 * @returns {Promise<boolean>}
 */
export async function shouldShowOnboardingTour() {
    const profile = AppState.get('profile');

    // 1. If profile is loaded and explicitly completed in DB -> skip tour
    if (profile && profile.has_completed_onboarding === true) {
        localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
        return false;
    }

    // 2. If profile is loaded and NOT completed (brand new account) -> show tour
    if (profile && (profile.has_completed_onboarding === false || profile.has_completed_onboarding == null)) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return true;
    }

    if (isUsingMockData()) {
        return localStorage.getItem(LOCAL_STORAGE_KEY) !== 'true';
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
        } else {
            // New user account! Clear stale browser localStorage and show tour
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return true;
        }
    } catch (err) {
        console.warn('Error checking onboarding status:', err);
    }

    return localStorage.getItem(LOCAL_STORAGE_KEY) !== 'true';
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
