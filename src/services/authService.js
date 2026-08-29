/* ============================================
   PIGGY APP — Auth Service
   Handles authentication and profile management
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { MOCK_USER, MOCK_PROFILE } from './mockData.js';
import { AppState } from '../state.js';
import { generateMockReferralCode } from './referralService.js';
import { expireWelcomeBonusIfDue, syncAndExpireMarketingBonuses } from './walletService.js';

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
            welcome_bonus_status: 'active',
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
            consumption_balance: 20000,
            welcome_bonus_status: 'active',
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
 * Sign up with email and password.
 * Terms are already accepted before calling this function.
 */
export async function signUp({ email, password, fullName, whatsapp }, onProgress = () => {}) {
    if (isUsingMockData()) {
        onProgress('⚙️ Modo demo detectado. Configurando usuario simulado...');
        mockLoggedIn = true;
        mockProfile = {
            ...MOCK_PROFILE,
            full_name: fullName,
            whatsapp,
            email,
            terms_accepted: true,
            habeas_data_accepted: true,
            referral_code: generateMockReferralCode(fullName),
            consumption_balance: 20000,
            welcome_bonus_status: 'active',
        };
        AppState.set({
            currentUser: { ...MOCK_USER, email },
            profile: { ...mockProfile },
            isAuthenticated: true,
        });
        return { user: MOCK_USER, error: null };
    }

    onProgress('🔑 Enviando datos al servidor de seguridad Supabase...');
    const client = getClient();
    const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                whatsapp: whatsapp
            }
        }
    });

    if (error) return { user: null, error: error.message };

    // Create profile with terms already accepted
    if (data.user) {
        onProgress('📝 Creando tu perfil en la base de datos de usuarios...');
        const profile = {
            id: data.user.id,
            full_name: fullName,
            email,
            whatsapp,
            terms_accepted: true,
            habeas_data_accepted: true,
            consumption_balance: 20000,
            welcome_bonus_status: 'active',
        };

        const { error: profileError } = await client.from('profiles').upsert(profile);

        if (profileError) {
            console.warn('🐷 Profile upsert error:', profileError.message);
        }

        onProgress('🎁 Asignando bono de bienvenida y configurando tu sesión...');
        // Update AppState immediately
        AppState.set({
            currentUser: data.user,
            profile: { ...profile },
            isAuthenticated: true,
        });
    }

    return { user: data.user, error: null };
}

/**
 * Sign in with email and password.
 */
export async function signIn({ email, password }, onProgress = () => {}) {
    if (isUsingMockData()) {
        onProgress('⚙️ Modo demo detectado. Iniciando sesión simulada...');
        mockLoggedIn = true;
        mockProfile = { ...MOCK_PROFILE, terms_accepted: true, habeas_data_accepted: true };
        AppState.set({
            currentUser: { ...MOCK_USER, email },
            profile: { ...mockProfile },
            isAuthenticated: true,
        });
        return { user: MOCK_USER, error: null };
    }

    onProgress('🔑 Verificando tu correo y contraseña con el sistema de seguridad...');
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) return { user: null, error: error.message };

    onProgress('👤 Descargando información de tu perfil y tu granja...');
    // Resilient profile load: autorrecupera si el usuario no tiene perfil
    const profile = await ensureProfileExists(client, data.user);

    // Auto-expirar bono si ya pasaron 7 días (no bloqueante para UX rápida)
    if (data.user) {
        expireWelcomeBonusIfDue(data.user.id).catch(e => console.warn('Welcome bonus check:', e));
        syncAndExpireMarketingBonuses(data.user.id).catch(e => console.warn('Marketing bonus check:', e));
    }

    onProgress('✨ ¡Listo! Abriendo tu granja...');
    AppState.set({
        currentUser: data.user,
        profile,
        isAuthenticated: true,
        showLegalModal: profile && !profile.terms_accepted,
    });

    return { user: data.user, error: null };
}

/**
 * Sign out current user.
 */
export async function signOut() {
    if (isUsingMockData()) {
        mockLoggedIn = false;
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
        piggies: [],
    });

    return { error: error?.message || null };
}

/**
 * Get current user profile from DB.
 */
export async function getProfile() {
    if (isUsingMockData()) {
        return mockLoggedIn ? { ...mockProfile } : null;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    return await ensureProfileExists(client, user);
}

/**
 * Accept terms and habeas data (for existing users who haven't accepted).
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

export const acceptLegalTerms = acceptTerms;

export function hasAcceptedTerms() {
    const profile = AppState.get('profile') || mockProfile;
    return !!(profile?.terms_accepted && profile?.habeas_data_accepted);
}

/**
 * Check current session on app load.
 */
export async function checkSession() {
    if (isUsingMockData()) {
        const storedBal = parseFloat(localStorage.getItem('mock_wallet_balance') || '2000000');
        AppState.set({
            currentUser: { ...MOCK_USER },
            profile: { ...MOCK_PROFILE, wallet_balance: storedBal },
            isAuthenticated: true,
            authLoading: false,
        });
        return;
    }

    try {
        const client = getClient();
        const { data: { session } } = await client.auth.getSession();

        if (session?.user) {
            // Run background expirations non-blocking so session resolves instantly
            expireWelcomeBonusIfDue(session.user.id).catch(e => console.warn('Welcome bonus check:', e));
            syncAndExpireMarketingBonuses(session.user.id).catch(e => console.warn('Marketing bonus check:', e));

            const profile = await getProfile().catch(e => {
                console.warn('Profile fetch warning in checkSession:', e);
                return {
                    id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
                    email: session.user.email,
                    terms_accepted: true,
                    habeas_data_accepted: true,
                };
            });

            const isGoogleUser = session.user.app_metadata?.provider === 'google';
            const needsWhatsApp = isGoogleUser && !profile?.whatsapp;

            AppState.set({
                currentUser: session.user,
                profile,
                isAuthenticated: true,
                authLoading: false,
                showLegalModal: profile && !profile.terms_accepted,
                showWhatsAppModal: needsWhatsApp,
            });
        } else {
            AppState.set({
                currentUser: null,
                profile: null,
                isAuthenticated: false,
                authLoading: false,
            });
        }
    } catch (err) {
        console.warn('Session check error, defaulting to unauthenticated:', err);
        AppState.set({
            currentUser: null,
            profile: null,
            isAuthenticated: false,
            authLoading: false,
        });
    }

    // Escuchar cambios de estado (recuperación de contraseña y login via OAuth redirect)
    const client = getClient();
    client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            console.log('🐷 PASSWORD_RECOVERY event caught!');
            AppState.set({ isResettingPassword: true });
        }

        // Detectar cuando el usuario regresa del redirect de Google OAuth
        if (event === 'SIGNED_IN' && session?.user) {
            const isGoogleUser = session.user.app_metadata?.provider === 'google';
            if (isGoogleUser) {
                const profile = await getProfile();
                const needsWhatsApp = !profile?.whatsapp;
                AppState.set({
                    currentUser: session.user,
                    profile,
                    isAuthenticated: true,
                    showWhatsAppModal: needsWhatsApp,
                });
            }
        }
    });
}

/**
 * Send password reset email.
 */
export async function sendPasswordReset(email) {
    if (isUsingMockData()) {
        return { error: null };
    }

    const client = getClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });

    return { error: error?.message || null };
}

/**
 * Update password (used after clicking recovery link).
 */
export async function updatePassword(newPassword) {
    if (isUsingMockData()) {
        return { error: null };
    }

    const client = getClient();
    const { error } = await client.auth.updateUser({
        password: newPassword
    });

    return { error: error?.message || null };
}

/**
 * Update WhatsApp for Google OAuth users who registered without a phone number.
 */
export async function updateGoogleUserWhatsApp(whatsapp) {
    if (isUsingMockData()) {
        mockProfile.whatsapp = whatsapp;
        AppState.set({
            profile: { ...mockProfile },
            showWhatsAppModal: false,
        });
        return { error: null };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { error: 'No authenticated user' };

    const { error } = await client.from('profiles')
        .update({ whatsapp })
        .eq('id', user.id);

    if (!error) {
        const profile = await getProfile();
        AppState.set({ profile, showWhatsAppModal: false });
    }

    return { error: error?.message || null };
}
