/* ============================================
   PIGGY APP — Supabase Client Wrapper
   Agnostic wrapper for Supabase integration
   ============================================ */

/**
 * Supabase wrapper. When actual credentials are provided,
 * this module exports a real Supabase client.
 * Otherwise, it falls back to mock mode.
 */

// Configuration — replace with real values when ready
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient = null;
let isMockMode = true;

/**
 * Initialize the Supabase client.
 * Returns true if real client was created, false for mock mode.
 */
export async function initSupabase() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            isMockMode = false;
            console.log('🐷 Supabase: Connected to real backend');
            return true;
        } catch (error) {
            console.warn('🐷 Supabase: Failed to initialize, using mock mode', error);
        }
    }

    console.log('🐷 Supabase: Running in mock mode (no credentials configured)');
    isMockMode = true;
    return false;
}

/**
 * Get the Supabase client (or null in mock mode).
 */
export function getClient() {
    return supabaseClient;
}

/**
 * Check if we are in mock mode.
 */
export function isUsingMockData() {
    return isMockMode;
}
