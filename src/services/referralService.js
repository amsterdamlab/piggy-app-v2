/* ============================================
   PIGGY APP — Referral Service
   Handles referral code validation, linking,
   balance queries, and share functionality
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { formatCOP } from './mockData.js';

/* ─── Commission Tiers ─── */

const COMMISSION_TIERS = [
    { min: 0, max: 5, amount: 30000, label: '$30.000' },
    { min: 6, max: 15, amount: 50000, label: '$50.000' },
    { min: 16, max: Infinity, amount: 80000, label: '$80.000' },
];

/**
 * Get the commission tier info based on completed referral count.
 */
export function getCommissionTier(completedCount) {
    for (const tier of COMMISSION_TIERS) {
        if (completedCount >= tier.min && completedCount <= tier.max) {
            return tier;
        }
    }
    return COMMISSION_TIERS[0];
}

/* ─── Validate Referral Code ─── */

/**
 * Check if a referral code exists and return referrer info.
 * @param {string} code - The referral code to validate
 * @returns {{ valid: boolean, referrerName?: string, referrerId?: string }}
 */
export async function validateReferralCode(code) {
    if (!code || code.trim().length < 4) {
        return { valid: false };
    }

    if (isUsingMockData()) {
        return { valid: true, referrerName: 'Mock Referrer', referrerId: 'mock-ref-id' };
    }

    const client = getClient();
    const { data, error } = await client.rpc('validate_referral_code', {
        p_code: code.trim().toUpperCase(),
    });

    if (error) {
        console.error('Error validating referral code:', error);
        return { valid: false };
    }

    return {
        valid: data?.valid === true,
        referrerName: data?.referrer_name || null,
        referrerId: data?.referrer_id || null,
    };
}

/* ─── Link Referral After Signup ─── */

/**
 * Link a newly registered user to their referrer.
 * Should be called right after signUp succeeds.
 * @param {string} referredUserId - The new user's ID
 * @param {string} referralCode - The code they entered
 * @returns {{ linked: boolean, reason?: string }}
 */
export async function linkReferral(referredUserId, referralCode) {
    if (!referredUserId || !referralCode) {
        return { linked: false, reason: 'missing_data' };
    }

    if (isUsingMockData()) {
        return { linked: true };
    }

    const client = getClient();
    const { data, error } = await client.rpc('link_referral', {
        p_referred_id: referredUserId,
        p_referral_code: referralCode.trim().toUpperCase(),
    });

    if (error) {
        console.error('Error linking referral:', error);
        return { linked: false, reason: error.message };
    }

    return {
        linked: data?.linked === true,
        reason: data?.reason || null,
    };
}

/* ─── Get My Referral Code ─── */

/**
 * Fetch the current user's referral code.
 * @returns {string|null}
 */
export async function getMyReferralCode() {
    if (isUsingMockData()) {
        return 'MOCK1234';
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data } = await client
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

    return data?.referral_code || null;
}

/* ─── Get My Referral Stats ─── */

/**
 * Fetch referral stats for the current user.
 * @returns {{ balance: number, totalReferrals: number, completedReferrals: number, pendingReferrals: number, currentTier: object, referrals: Array }}
 */
export async function getMyReferralStats() {
    if (isUsingMockData()) {
        return {
            balance: 0,
            totalReferrals: 0,
            completedReferrals: 0,
            pendingReferrals: 0,
            currentTier: COMMISSION_TIERS[0],
            referrals: [],
        };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    // Fetch balance from profile
    const { data: profile } = await client
        .from('profiles')
        .select('referral_balance')
        .eq('id', user.id)
        .single();

    // Fetch referrals where I'm the referrer, join with profiles for referred name
    const { data: referrals } = await client
        .from('referrals')
        .select(`
      id,
      status,
      commission_amount,
      commission_tier,
      created_at,
      completed_at,
      referred_id,
      profiles!referred_id(full_name)
    `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

    const allReferrals = (referrals || []).map(r => ({
        ...r,
        referredName: r.profiles?.full_name || 'Usuario',
    }));
    const completedCount = allReferrals.filter(r => r.status === 'completed').length;
    const pendingCount = allReferrals.filter(r => r.status === 'pending').length;

    return {
        balance: profile?.referral_balance || 0,
        totalReferrals: allReferrals.length,
        completedReferrals: completedCount,
        pendingReferrals: pendingCount,
        currentTier: getCommissionTier(completedCount),
        referrals: allReferrals,
    };
}

/* ─── Share Referral Link ─── */

/**
 * Build a referral share message for WhatsApp.
 * @param {string} referralCode - User's referral code
 * @returns {string} WhatsApp deep link URL
 */
export function buildReferralShareLink(referralCode) {
    const appUrl = 'https://piggy-app-v2.vercel.app';
    const message = `🐷 ¡Únete a Piggy App! Invierte en cerdos reales y gana retornos.\n\n` +
        `Usa mi código de referido: *${referralCode}*\n` +
        `👉 ${appUrl}\n\n` +
        `¡Ambos ganamos cuando compres tu primer Piggy! 🎁`;

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Share referral via native share API (mobile) or fallback to WhatsApp.
 * @param {string} referralCode - User's referral code
 */
export async function shareReferralCode(referralCode) {
    const appUrl = 'https://piggy-app-v2.vercel.app';
    const shareData = {
        title: '🐷 Piggy App — Invierte en cerdos reales',
        text: `Usa mi código de referido: ${referralCode} y gana bonos al comprar tu primer Piggy.`,
        url: appUrl,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (err) {
            // User cancelled or share failed, fall through to WhatsApp
            if (err.name !== 'AbortError') {
                console.warn('Share API error:', err);
            }
        }
    }

    // Fallback: open WhatsApp share
    window.open(buildReferralShareLink(referralCode), '_blank');
}

/* ─── Format Helpers ─── */

export function formatReferralBalance(amount) {
    return formatCOP(amount || 0);
}
