/* ============================================
   PIGGY APP — Auth Service
   Handles authentication and profile management
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_USER, MOCK_PROFILE } from './mockData.js';
import { AppState } from '../state.js';
import { generateMockReferralCode } from './referralService.js';

// Mock session control
let mockLoggedIn = false;
let mockProfile = { ...MOCK_PROFILE, terms_accepted: false, habeas_data_accepted: false };

/**
 * Helper to compute 1 or 2 initials from full name.
 * e.g. "Hermes Lemos" -> "HL", "Juan" -> "J"
 */
export function getUserInitials(name) {
    if (!name || typeof name !== 'string') return 'P';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'P';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
}

/**
 * Sign in / Sign up with Google OAuth.
 */
export async function signInWithGoogle() {
    if (isUsingMockData()) {
        mockLoggedIn = true;
        mockProfile = {
            ...MOCK_PROFILE,
            full_name: 'Usuario Google',
            email: 'google.user@example.com',
            terms_accepted: true,
            habeas_data_accepted: true,
            consumption_balance: 20000,
            referral_balance: 20000,
        };
        AppState.set({
            currentUser: { ...MOCK_USER, email: 'google.user@example.com' },
            profile: { ...mockProfile },
            isAuthenticated: true,
        });
        return { error: null };
    }

    const client = getClient();
    const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    return { error: error?.message || null };
}

/**
 * Helper de resiliencia: Verifica o crea en public.profiles el registro del usuario.
 * Resuelve el problema donde un usuario existe en auth.users (puede hacer login) pero
 * no tiene fila en public.profiles debido a fallos de RLS o triggers en el registro inicial.
 */
async function ensureProfileExists(client, user, fallbackMeta = {}) {
    if (!user) return null;
    try {
        const { data } = await client.from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (data) return data;

        console.warn('🐷 Perfil huérfano detectado en public.profiles. Sincronizando desde auth.users...');
        const newProfile = {
            id: user.id,
            full_name: fallbackMeta.full_name || user.user_metadata?.full_name || user.email,
            email: user.email,
            whatsapp: fallbackMeta.whatsapp || user.user_metadata?.whatsapp || null,
            terms_accepted: true,
            habeas_data_accepted: true,
            referral_balance: 20000,
        };

        const { data: createdProfile, error: upsertError } = await client
            .from('profiles')
            .upsert(newProfile)
            .select()
            .maybeSingle();

        if (upsertError) {
            console.warn('🐷 Error al autorrecuperar perfil huérfano:', upsertError.message);
            return newProfile;
        }
        return createdProfile || newProfile;
    } catch (e) {
        console.error('🐷 Excepción en ensureProfileExists:', e);
        return null;
    }
}

/**
 * Sign in with email and password.
 */
export async function signIn(email, password) {
    if (isUsingMockData()) {
        mockLoggedIn = true;
        mockProfile = {
            ...MOCK_PROFILE,
            email,
            terms_accepted: true,
            habeas_data_accepted: true,
        };
        AppState.set({
            currentUser: { ...MOCK_USER, email },
            profile: { ...mockProfile },
            isAuthenticated: true,
        });
        return { user: MOCK_USER, error: null };
    }

    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { user: null, error: error.message };
    }

    let profile = null;
    if (data.user) {
        profile = await ensureProfileExists(client, data.user);
    }

    AppState.set({
        currentUser: data.user,
        profile,
        isAuthenticated: !!data.user,
    });

    return { user: data.user, error: null };
}

/**
 * Sign up with email, password, full name, and WhatsApp.
 */
export async function signUp({ email, password, fullName, whatsapp, referralCode }) {
    if (isUsingMockData()) {
        mockLoggedIn = true;
        mockProfile = {
            ...MOCK_PROFILE,
            full_name: fullName,
            email,
            whatsapp,
            terms_accepted: false,
            habeas_data_accepted: false,
            referral_code: generateMockReferralCode(fullName),
            referral_balance: 20000,
        };
        AppState.set({
            currentUser: { ...MOCK_USER, email },
            profile: { ...mockProfile },
            isAuthenticated: true,
        });
        return { user: MOCK_USER, error: null };
    }

    const client = getClient();
    const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                whatsapp,
                referral_code_input: referralCode || null,
            },
        },
    });

    if (error) {
        return { user: null, error: error.message };
    }

    let profile = null;
    if (data.user) {
        profile = await ensureProfileExists(client, data.user, {
            full_name: fullName,
            whatsapp,
        });

        // Intentar vincular referido si ingresó un código al registrarse
        if (referralCode && referralCode.trim().length >= 4) {
            try {
                const { linkReferral } = await import('./referralService.js');
                await linkReferral(data.user.id, referralCode.trim());
            } catch (refErr) {
                console.warn('Error vinculando código de referido durante registro:', refErr);
            }
        }
    }

    AppState.set({
        currentUser: data.user,
        profile,
        isAuthenticated: !!data.user,
    });

    return { user: data.user, error: null };
}

/**
 * Sign out current user.
 */
export async function signOut() {
    if (isUsingMockData()) {
        mockLoggedIn = false;
        mockProfile = { ...MOCK_PROFILE, terms_accepted: false, habeas_data_accepted: false };
        AppState.set({
            currentUser: null,
            profile: null,
            isAuthenticated: false,
        });
        return { error: null };
    }

    const client = getClient();
    const { error } = await client.auth.signOut();

    AppState.set({
        currentUser: null,
        profile: null,
        isAuthenticated: false,
    });

    return { error: error ? error.message : null };
}

/**
 * Fetch the current user profile from DB.
 */
export async function getProfile() {
    if (isUsingMockData()) {
        return mockProfile;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) return null;

    const profile = await ensureProfileExists(client, user);

    if (profile) {
        AppState.set({ profile });
    }

    return profile;
}

/**
 * Update user profile (e.g., terms acceptance, name, etc.)
 */
export async function updateProfile(updates) {
    if (isUsingMockData()) {
        mockProfile = { ...mockProfile, ...updates };
        AppState.set({ profile: { ...mockProfile } });
        return { profile: mockProfile, error: null };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        return { profile: null, error: 'No authenticated user' };
    }

    const { data, error } = await client
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        return { profile: null, error: error.message };
    }

    AppState.set({ profile: data });
    return { profile: data, error: null };
}

/**
 * Accept legal terms and habeas data.
 */
export async function acceptLegalTerms() {
    return updateProfile({
        terms_accepted: true,
        habeas_data_accepted: true,
    });
}

/**
 * Check if the user has accepted terms.
 */
export async function hasAcceptedTerms() {
    if (isUsingMockData()) {
        return mockProfile.terms_accepted && mockProfile.habeas_data_accepted;
    }

    const profile = await getProfile();
    return profile?.terms_accepted && profile?.habeas_data_accepted;
}

/**
 * Initialize auth listener.
 */
export function initAuthListener(onStateChange) {
    if (isUsingMockData()) {
        AppState.set({
            currentUser: mockLoggedIn ? MOCK_USER : null,
            profile: mockLoggedIn ? mockProfile : null,
            isAuthenticated: mockLoggedIn,
        });
        if (onStateChange) onStateChange(mockLoggedIn ? MOCK_USER : null);
        return () => { };
    }

    const client = getClient();

    const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event, session) => {
            const user = session?.user || null;

            if (user) {
                const profile = await ensureProfileExists(client, user);
                AppState.set({
                    currentUser: user,
                    profile,
                    isAuthenticated: true,
                });
            } else {
                AppState.set({
                    currentUser: null,
                    profile: null,
                    isAuthenticated: false,
                });
            }

            if (onStateChange) onStateChange(user);
        }
    );

    return () => subscription.unsubscribe();
}

/**
 * Change password for authenticated user.
 */
export async function changePassword(newPassword) {
    if (isUsingMockData()) {
        return { error: null };
    }

    const client = getClient();
    const { error } = await client.auth.updateUser({
        password: newPassword
    });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Send password recovery email.
 */
export async function sendPasswordResetEmail(email) {
    if (isUsingMockData()) {
        return { error: null };
    }

    const client = getClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/recuperar-password`
    });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Delete / deactivate account for authenticated user.
 */
export async function deleteAccount() {
    if (isUsingMockData()) {
        mockLoggedIn = false;
        mockProfile = { ...MOCK_PROFILE, terms_accepted: false, habeas_data_accepted: false };
        AppState.set({
            currentUser: null,
            profile: null,
            isAuthenticated: false,
        });
        return { error: null };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        return { error: 'No authenticated user' };
    }

    const { error: reqError } = await client
        .from('wallet_requests')
        .insert({
            user_id: user.id,
            user_name: AppState.get('profile')?.full_name || user.email,
            request_type: 'account_deletion',
            notes: 'Solicitud de eliminación de cuenta por parte del usuario',
            status: 'pending'
        });

    if (reqError) {
        console.warn('Could not register account deletion request:', reqError);
    }

    await signOut();
    return { error: null };
}
