/* ============================================
   PIGGY APP — Auth Service
   Handles authentication and profile management
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_USER, MOCK_PROFILE } from './mockData.js';
import { AppState } from '../state.js';

// Mock session control
let mockLoggedIn = false;
let mockProfile = { ...MOCK_PROFILE, terms_accepted: false, habeas_data_accepted: false };

/**
 * Sign up with email and password.
 */
export async function signUp({ email, password, fullName, whatsapp }) {
    if (isUsingMockData()) {
        mockLoggedIn = true;
        mockProfile = {
            ...MOCK_PROFILE,
            full_name: fullName,
            whatsapp,
            email,
            terms_accepted: false,
            habeas_data_accepted: false,
        };
        AppState.set({
            currentUser: { ...MOCK_USER, email },
            profile: { ...mockProfile },
            isAuthenticated: true,
            showLegalModal: true,
        });
        return { user: MOCK_USER, error: null };
    }

    const client = getClient();
    const { data, error } = await client.auth.signUp({ email, password });

    if (error) return { user: null, error: error.message };

    // Create profile
    if (data.user) {
        await client.from('profiles').insert({
            id: data.user.id,
            full_name: fullName,
            whatsapp,
            terms_accepted: false,
            habeas_data_accepted: false,
        });
    }

    return { user: data.user, error: null };
}

/**
 * Sign in with email and password.
 */
export async function signIn({ email, password }) {
    if (isUsingMockData()) {
        mockLoggedIn = true;
        mockProfile = { ...MOCK_PROFILE, terms_accepted: true, habeas_data_accepted: true };
        AppState.set({
            currentUser: { ...MOCK_USER, email },
            profile: { ...mockProfile },
            isAuthenticated: true,
        });
        return { user: MOCK_USER, error: null };
    }

    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) return { user: null, error: error.message };

    return { user: data.user, error: null };
}

/**
 * Sign out.
 */
export async function signOut() {
    if (isUsingMockData()) {
        mockLoggedIn = false;
        AppState.reset();
        return;
    }

    const client = getClient();
    await client.auth.signOut();
    AppState.reset();
}

/**
 * Fetch user profile.
 */
export async function getProfile() {
    if (isUsingMockData()) {
        return mockLoggedIn ? { ...mockProfile } : null;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data } = await client.from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return data;
}

/**
 * Accept terms and habeas data.
 */
export async function acceptTerms() {
    if (isUsingMockData()) {
        mockProfile.terms_accepted = true;
        mockProfile.habeas_data_accepted = true;
        AppState.set({
            profile: { ...mockProfile },
            showLegalModal: false,
        });
        return { error: null };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    const { error } = await client.from('profiles')
        .update({ terms_accepted: true, habeas_data_accepted: true })
        .eq('id', user.id);

    if (!error) {
        const profile = await getProfile();
        AppState.set({ profile, showLegalModal: false });
    }

    return { error: error?.message || null };
}

/**
 * Check current session on app load.
 */
export async function checkSession() {
    if (isUsingMockData()) {
        AppState.set({ authLoading: false });
        return;
    }

    const client = getClient();
    const { data: { session } } = await client.auth.getSession();

    if (session?.user) {
        const profile = await getProfile();
        AppState.set({
            currentUser: session.user,
            profile,
            isAuthenticated: true,
            authLoading: false,
            showLegalModal: profile && !profile.terms_accepted,
        });
    } else {
        AppState.set({ authLoading: false });
    }
}
