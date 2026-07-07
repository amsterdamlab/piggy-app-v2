/* ============================================
   PIGGY APP — Wallet Service
   Handles wallet balance, withdrawal and
   consumption requests
   ============================================ */

import { getClient } from '../config/supabase.js';
import { AppState } from '../state/AppState.js';

/* ─── Mock Profile for Offline / Fallback ─── */
const MOCK_PROFILE = {
    id: 'mock-user-123',
    full_name: 'Granjero Demo',
    phone: '3001234567',
    wallet_balance: 0,
    referral_balance: 30000,
    referral_code: 'DEMO10',
    total_trees: 0
};

const MOCK_TRANSACTIONS = [
    {
        id: 'tx-1',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        type: 'credit',
        amount: 30000,
        description: 'Bono de bienvenida agro-digital',
        wallet_type: 'consumo'
    }
];

const MOCK_REQUESTS = [];

/* ─── Fetch Wallet Overview ─── */

/**
 * Get current wallet balance, referral balance and recent transactions.
 * Uses Supabase profiles + wallet_transactions table.
 * Falls back to local/mock state when offline.
 */
export async function getWalletOverview() {
    const client = getClient();
    if (!client) {
        return getOfflineOverview();
    }

    try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError || !user) {
            return getOfflineOverview();
        }

        // Fetch profile balances
        const { data: profileData, error: profError } = await client
            .from('profiles')
            .select('wallet_balance, referral_balance, id, full_name')
            .eq('id', user.id)
            .single();

        // Fetch transactions (limit to recent 50)
        const { data: txData, error: txError } = await client
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        const walletBalance = profileData?.wallet_balance || 0;
        const referralBalance = profileData?.referral_balance || 0;
        const transactions = txData || [];

        // Update local app state
        const currentProfile = AppState.get('profile') || {};
        AppState.set({
            profile: {
                ...currentProfile,
                ...profileData,
                wallet_balance: walletBalance,
                referral_balance: referralBalance
            }
        });

        return {
            success: true,
            walletBalance,
            referralBalance,
            transactions,
            offline: false
        };
    } catch (err) {
        console.warn('⚠️ getWalletOverview offline fallback:', err.message);
        return getOfflineOverview();
    }
}

function getOfflineOverview() {
    const profile = AppState.get('profile') || MOCK_PROFILE;
    return {
        success: true,
        walletBalance: profile.wallet_balance || 0,
        referralBalance: profile.referral_balance || 0,
        transactions: MOCK_TRANSACTIONS,
        offline: true
    };
}

/* ─── Ensure Welcome Bonus Assigned ─── */
/**
 * Automatically assigns $30,000 consumption bonus (referral_balance) to a new profile if they don't have it.
 * Calls Supabase update directly to trigger DB sync if needed.
 */
export async function ensureWelcomeBonusAssigned(userId) {
    if (!getClient()) {
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        if (profile && !profile.referral_balance) {
            profile.referral_balance = 30000;
            AppState.set({ profile: { ...profile } });
        }
        return 30000;
    }

    const client = getClient();
    const targetUserId = userId || (await client.auth.getUser()).data.user?.id;
    if (!targetUserId) return 0;

    const { data } = await client
        .from('profiles')
        .select('referral_balance')
        .eq('id', targetUserId)
        .single();

    if (!data || !data.referral_balance || data.referral_balance === 0) {
        const { error } = await client
            .from('wallet_transactions')
            .insert({
                user_id: targetUserId,
                amount: 30000,
                type: 'credit',
                description: 'Bono de Bienvenida ($30.000 en Tienda)',
                wallet_type: 'consumo'
            });

        if (!error) {
            console.log('🐷 Welcome consumption bonus ($30.000) assigned via transaction in DB!');
            const currentProfile = AppState.get('profile');
            if (currentProfile && currentProfile.id === targetUserId) {
                AppState.set({ profile: { ...currentProfile, referral_balance: 30000 } });
            }
            return 30000;
        }
    }
    return data?.referral_balance || 0;
}

/* ─── Deduct Wallet Balance (Post-Purchase) ─── */

/**
 * Deduct an amount from the user's wallet balance after a successful purchase.
 * This is the frontend safeguard — ideally the Supabase RPC buy_piggy should
 * handle this atomically. Until then, we call this immediately after a confirmed purchase.
 *
 * @param {number} amount - Amount in COP to deduct
 * @returns {{ success: boolean, newBalance?: number, reason?: string }}
 */
export async function deductWalletBalance(amount) {
    if (!amount || amount <= 0) return { success: true };

    const client = getClient();
    if (!client) {
        // Offline: deduct from in-memory profile
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        const current = profile.wallet_balance || 0;
        if (current < amount) return { success: false, reason: 'insufficient_funds' };
        profile.wallet_balance = current - amount;
        AppState.set({ profile: { ...profile } });
        return { success: true, newBalance: profile.wallet_balance, offline: true };
    }

    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { success: false, reason: 'not_authenticated' };

        // Insert debit transaction in DB — trigger handles balance update
        const { error: txError } = await client
            .from('wallet_transactions')
            .insert({
                user_id: user.id,
                amount: -amount,
                type: 'debit',
                description: 'Compra de Piggy — Débito Automático',
                wallet_type: 'dinero'
            });

        if (txError) {
            console.warn('⚠️ DB debit transaction failed, falling back to profile update:', txError.message);
            // Fallback: direct update if tx table is locked or restricted
            const { data: profile } = await client
                .from('profiles')
                .select('wallet_balance')
                .eq('id', user.id)
                .single();
            const current = profile?.wallet_balance || 0;
            if (current < amount) return { success: false, reason: 'insufficient_funds' };
            await client.from('profiles').update({ wallet_balance: current - amount }).eq('id', user.id);
        }

        // Re-fetch updated profile to return exact new balance
        const { data: newProf } = await client
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();

        const newBal = newProf?.wallet_balance || 0;
        const currentProfile = AppState.get('profile') || {};
        AppState.set({ profile: { ...currentProfile, wallet_balance: newBal } });

        return { success: true, newBalance: newBal };
    } catch (err) {
        console.error('❌ deductWalletBalance error:', err);
        return { success: false, reason: err.message };
    }
}

/* ─── Submit Withdrawal Request ─── */

/**
 * Creates a withdrawal request.
 * Inserts into `wallet_requests` table or falls back to local simulation.
 *
 * @param {Object} params
 * @param {number} params.amount - Amount in COP
 * @param {string} params.bank - Bank name or "Nequi" / "Daviplata"
 * @param {string} params.accountType - "Ahorros" or "Corriente"
 * @param {string} params.accountNumber - Bank account / phone number
 * @param {string} params.holderName - Account holder name
 * @param {string} params.holderId - Document ID (CC/NIT)
 */
export async function requestWithdrawal({ amount, bank, accountType, accountNumber, holderName, holderId }) {
    if (!amount || amount < 50000) {
        return { success: false, reason: 'El monto mínimo de retiro es $50.000 COP.' };
    }

    const client = getClient();
    if (!client) {
        return simulateOfflineWithdrawal(amount, bank, accountNumber);
    }

    try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError || !user) {
            return { success: false, reason: 'Debes iniciar sesión para solicitar un retiro.' };
        }

        // Check sufficient balance
        const { data: profile, error: profError } = await client
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();

        const currentBalance = profile?.wallet_balance || 0;
        if (currentBalance < amount) {
            return { success: false, reason: `Saldo insuficiente. Tienes $${currentBalance.toLocaleString('es-CO')} disponible.` };
        }

        // Try calling the smart create_wallet_request DB function (escrow + validation)
        try {
            const { data: rpcResult, error: rpcError } = await client.rpc('create_wallet_request', {
                p_user_id: user.id,
                p_type: 'withdrawal',
                p_amount: amount,
                p_bank: `${bank} - ${accountType} - ${accountNumber} (${holderName}, ID: ${holderId})`
            });

            if (!rpcError && rpcResult) {
                if (rpcResult.success === false) {
                    return { success: false, reason: rpcResult.reason || 'No se pudo crear la solicitud de retiro.' };
                }
                return { success: true, requestId: rpcResult.request_id, newBalance: currentBalance - amount };
            }
        } catch (rpcEx) {
            console.warn('⚠️ create_wallet_request RPC not available, falling back to manual insert:', rpcEx.message);
        }

        // Fallback: manual insert if RPC is missing
        const { data: reqData, error: reqError } = await client
            .from('wallet_requests')
            .insert({
                user_id: user.id,
                request_type: 'withdrawal',
                amount: amount,
                bank_name: `${bank} - ${accountType} - ${accountNumber} (${holderName}, ID: ${holderId})`,
                status: 'pending',
                wallet_type: 'dinero'
            })
            .select()
            .single();

        if (reqError) {
            console.error('❌ Withdrawal insert failed:', reqError);
            return { success: false, reason: 'Error al procesar la solicitud en el servidor: ' + reqError.message };
        }

        // Deduct balance immediately
        await deductWalletBalance(amount);

        // Record pending transaction
        await client
            .from('wallet_transactions')
            .insert({
                user_id: user.id,
                amount: -amount,
                type: 'debit',
                description: `Retiro solicitado en proceso — ${bank} (${accountNumber.slice(-4)})`,
                wallet_type: 'dinero'
            });

        return { success: true, requestId: reqData.id, newBalance: currentBalance - amount };
    } catch (err) {
        console.error('❌ requestWithdrawal error:', err);
        return { success: false, reason: err.message };
    }
}

function simulateOfflineWithdrawal(amount, bank, accountNumber) {
    const profile = AppState.get('profile') || { ...MOCK_PROFILE };
    if ((profile.wallet_balance || 0) < amount) {
        return { success: false, reason: 'Saldo insuficiente en modo demo.' };
    }
    profile.wallet_balance -= amount;
    AppState.set({ profile: { ...profile } });

    const simTx = {
        id: 'tx-' + Date.now(),
        created_at: new Date().toISOString(),
        type: 'debit',
        amount: -amount,
        description: `Retiro demo en proceso — ${bank} (*${accountNumber.slice(-4)})`,
        wallet_type: 'dinero'
    };
    MOCK_TRANSACTIONS.unshift(simTx);

    return { success: true, requestId: 'demo-req-' + Date.now(), newBalance: profile.wallet_balance, offline: true };
}

/* ─── Convert Balance to Consumption Bonus ─── */

/**
 * Automatically converts money balance (wallet_balance) into consumption bonuses (referral_balance).
 * Executes atomically in DB without routing to WhatsApp or retaining money.
 *
 * @param {number} amount - Amount in COP to convert
 * @returns {{ success: boolean, newWalletBalance?: number, newReferralBalance?: number, reason?: string }}
 */
export async function convertBalanceToConsumptionBonus(amount) {
    if (!amount || amount < 10000) {
        return { success: false, reason: 'El monto mínimo para convertir a bonos es $10.000 COP.' };
    }

    const client = getClient();
    if (!client) {
        // Offline / demo simulation
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        const currentWallet = profile.wallet_balance || 0;
        const currentReferral = profile.referral_balance || 0;

        if (currentWallet < amount) {
            return { success: false, reason: 'Saldo insuficiente en tu Cuenta Agro disponible para realizar el canje.' };
        }

        profile.wallet_balance = currentWallet - amount;
        profile.referral_balance = currentReferral + amount;
        AppState.set({ profile: { ...profile } });

        const simDebit = {
            id: 'tx-debit-' + Date.now(),
            created_at: new Date().toISOString(),
            type: 'debit',
            amount: -amount,
            description: 'Canje a Bonos de Consumo (Débito saldo)',
            wallet_type: 'dinero'
        };
        const simCredit = {
            id: 'tx-credit-' + Date.now(),
            created_at: new Date().toISOString(),
            type: 'credit',
            amount: amount,
            description: 'Bono de Consumo acreditado por canje de saldo',
            wallet_type: 'consumo'
        };
        MOCK_TRANSACTIONS.unshift(simCredit, simDebit);

        return {
            success: true,
            newWalletBalance: profile.wallet_balance,
            newReferralBalance: profile.referral_balance,
            offline: true
        };
    }

    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return { success: false, reason: 'not_authenticated' };

        // Ejecutamos el procedimiento RPC en base de datos de forma atómica y con autorización Veeduría
        const { data: rpcResult, error: rpcError } = await client.rpc('convert_balance_to_consumption_bonus', {
            p_amount: amount
        });

        if (rpcError || (rpcResult && rpcResult.success === false)) {
            const errReason = rpcResult?.reason || rpcError?.message || 'Error al ejecutar el canje en la base de datos.';
            return { success: false, reason: errReason };
        }

        // Re-fetch updated profile to return exact new balances
        const { data: newProf, error: profError } = await client
            .from('profiles')
            .select('wallet_balance, referral_balance')
            .eq('id', user.id)
            .single();

        const newWalletBalance = newProf?.wallet_balance || 0;
        const newReferralBalance = newProf?.referral_balance || 0;

        const currentProfile = AppState.get('profile') || {};
        AppState.set({
            profile: {
                ...currentProfile,
                wallet_balance: newWalletBalance,
                referral_balance: newReferralBalance
            }
        });

        return {
            success: true,
            newWalletBalance,
            newReferralBalance
        };
    } catch (err) {
        console.error('❌ convertBalanceToConsumptionBonus error:', err);
        return { success: false, reason: err.message };
    }
}

/* ─── Fetch Withdrawal History ─── */

/**
 * Get user's withdrawal requests history from `wallet_requests`.
 */
export async function getWithdrawalHistory() {
    const client = getClient();
    if (!client) {
        return { success: true, requests: MOCK_REQUESTS, offline: true };
    }

    try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError || !user) {
            return { success: true, requests: MOCK_REQUESTS, offline: true };
        }

        const { data, error } = await client
            .from('wallet_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('⚠️ getWithdrawalHistory error:', error.message);
            return { success: true, requests: MOCK_REQUESTS, offline: true };
        }

        return { success: true, requests: data || [] };
    } catch (err) {
        console.warn('⚠️ getWithdrawalHistory fallback:', err.message);
        return { success: true, requests: MOCK_REQUESTS, offline: true };
    }
}

/* ─── Helper: Format COP Currency ─── */
export function formatCOP(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0';
    return '$' + Math.round(amount).toLocaleString('es-CO');
}

/* ─── Helper: Status Badge Info ─── */
export function getStatusBadge(status) {
    switch (status) {
        case 'pending':
            return { label: 'En Proceso', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '⏳' };
        case 'processed':
        case 'approved':
            return { label: 'Completado', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅' };
        case 'rejected':
            return { label: 'Rechazado', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '❌' };
        default:
            return { label: status || 'Desconocido', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: '⚪' };
    }
}
