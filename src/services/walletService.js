/* ============================================
   PIGGY APP — Wallet Service
   Handles wallet balance, withdrawal and
   consumption requests
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { formatCOP, MOCK_PROFILE } from './mockData.js';
import { AppState } from '../state.js';

/** Admin WhatsApp number for notifications */
const ADMIN_WHATSAPP = '573154870448';

/* ─── Mock Mode LocalStorage Persistence ─── */
let mockBalance = null;
let mockTransactions = null;

function initMockState() {
    if (mockBalance === null) {
        const storedBal = localStorage.getItem('mock_wallet_balance');
        if (storedBal !== null) {
            mockBalance = parseFloat(storedBal);
        } else {
            mockBalance = 0;
            localStorage.setItem('mock_wallet_balance', '0');
        }
    }

    if (mockTransactions === null) {
        const storedTxs = localStorage.getItem('mock_wallet_transactions');
        if (storedTxs !== null) {
            mockTransactions = JSON.parse(storedTxs);
        } else {
            mockTransactions = [
                { id: '1', amount: -1000000, type: 'debit', description: 'Débito: compra de Piggy', wallet_type: 'dinero', created_at: new Date().toISOString() },
                { id: '2', amount: 2230000, type: 'recharge', description: 'Recarga de Wallet aprobada', wallet_type: 'dinero', created_at: new Date(Date.now() - 86400000).toISOString() },
                { id: '3', amount: 30000, type: 'credit', description: 'Bono de Bienvenida (aplica condiciones)', wallet_type: 'consumo', created_at: new Date(Date.now() - 172800000).toISOString() }
            ];
            localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
        }
    }
}

/* ─── Get Wallet Balance ─── */

/**
 * Fetch the current user's real wallet balance (from completed piggy cycles + recharges).
 * Source of truth: profiles.wallet_balance, maintained by DB trigger via wallet_transactions.
 * @returns {number} Balance in COP
 */
export async function getWalletBalance() {
    if (isUsingMockData()) {
        initMockState();
        return mockBalance;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return 0;

    const { data } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

    return data?.wallet_balance || 0;
}

/**
 * Fetch the current user's consumption bonus balance (previously just referral commission).
 * These are NOT withdrawable cash — they are exchanged for meat-consumption coupons.
 * Updated automatically by triggers (e.g. Welcome Bonus) or manually by admin.
 * @returns {number} Consumption bonus balance in COP
 */
export async function getReferralBonusBalance() {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || MOCK_PROFILE;
        return profile?.referral_balance !== undefined ? profile.referral_balance : 30000;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return 0;

    const { data } = await client
        .from('profiles')
        .select('referral_balance')
        .eq('id', user.id)
        .single();

    return data?.referral_balance || 0;
}

/**
 * Ensures the welcome bonus ($30.000) is assigned to the user's referral_balance in DB if not set yet.
 */
export async function ensureWelcomeBonusAssigned(userId) {
    if (isUsingMockData()) {
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
            .from('profiles')
            .update({ referral_balance: 30000 })
            .eq('id', targetUserId);

        if (!error) {
            console.log('🐷 Welcome consumption bonus ($30.000) assigned to profile in DB!');
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
    if (isUsingMockData()) {
        return { success: true, newBalance: 0 };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    // Read current wallet_balance to validate funds
    const { data: profile, error: readError } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

    if (readError || !profile) {
        return { success: false, reason: 'could_not_read_balance' };
    }

    const currentBalance = profile.wallet_balance || 0;

    // Guard: never allow negative balance
    if (currentBalance < amount) {
        return { success: false, reason: 'insufficient_balance' };
    }

    // Insert a debit transaction — the DB trigger auto-updates wallet_balance in profiles
    const { error: txError } = await client
        .from('wallet_transactions')
        .insert({
            user_id: user.id,
            amount:  -amount,    // negative = debit
            type:    'debit',
            description: 'Débito: compra de Piggy',
        });

    if (txError) {
        console.error('Error inserting debit transaction:', txError);
        return { success: false, reason: txError.message };
    }

    return { success: true, newBalance: currentBalance - amount };
}

/* ─── Convert Wallet Balance to Consumption Bonus ─── */

/**
 * Canje de saldo por Bonos de Consumo:
 * Debits available wallet balance (dinero) and credits consumption bonus balance (consumo)
 * via wallet_transactions for full traceability without retaining funds or notifying WhatsApp.
 * @param {number} amount - Amount in COP to convert
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function convertBalanceToConsumptionBonus(amount) {
    if (isUsingMockData()) {
        initMockState();
        if (mockBalance < amount) {
            return { success: false, reason: 'insufficient_balance' };
        }
        
        mockBalance -= amount;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());

        const debitTx = {
            id: `sim-deb-${Date.now()}`,
            amount: -amount,
            type: 'debit',
            description: 'Canje a Bonos de Consumo (Débito saldo)',
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        };
        const creditTx = {
            id: `sim-cred-${Date.now() + 1}`,
            amount: amount,
            type: 'credit',
            description: 'Bono de Consumo acreditado por canje de saldo',
            wallet_type: 'consumo',
            created_at: new Date().toISOString()
        };

        mockTransactions.unshift(creditTx, debitTx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));

        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        const currentRef = profile.referral_balance || 0;
        profile.referral_balance = currentRef + amount;
        profile.wallet_balance = mockBalance;
        AppState.set({ profile: { ...profile } });

        return { success: true };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    // Ejecutamos el procedimiento RPC en base de datos de forma atómica y con autorización interna
    const { data, error } = await client.rpc('convert_balance_to_consumption_bonus', {
        p_amount: amount
    });

    if (error) {
        console.error('Error calling convert_balance_to_consumption_bonus RPC:', error);
        return { success: false, reason: error.message };
    }

    if (!data || !data.success) {
        return { success: false, reason: data?.reason || 'No se pudo realizar el canje en base de datos.' };
    }

    // Actualizar AppState con los saldos sincronizados por los triggers
    const { data: updatedProfile } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (updatedProfile) {
        const currentAppStateProfile = AppState.get('profile') || {};
        AppState.set({ profile: { ...currentAppStateProfile, ...updatedProfile } });
    }

    return { success: true };
}

/* ─── Recharge Wallet (Wompi Simulation) ─── */

/**
 * Recharge the user's wallet balance with a simulation_recharge transaction.
 * Records full traceability: payment method, simulation status, and description.
 * Supports both mock mode and real Supabase mode.
 *
 * @param {number} amount - Amount in COP to credit
 * @param {'tarjeta' | 'pse'} paymentMethod - Payment method used in the simulation
 * @param {'simulated_approved' | 'simulated_rejected'} simulationStatus - Result of the simulation
 * @param {Object} mockState - (Mock mode only) Mutable object with { balance, transactions }
 * @param {string|null} [reference=null] - Wompi transaction reference for idempotency
 * @returns {{ success: boolean, newBalance?: number, transactionId?: string, reason?: string }}
 */
export async function rechargeWallet(amount, paymentMethod, simulationStatus, mockState = null, reference = null) {
    const isApproved = simulationStatus === 'simulated_approved';
    const refStr = reference ? ` [Ref: ${reference}]` : '';

    if (isUsingMockData()) {
        initMockState();

        const newTransaction = {
            id: `sim-${Date.now()}`,
            amount: isApproved ? amount : 0,
            type: 'simulation_recharge',
            description: isApproved
                ? `Recarga Wompi${refStr || ` (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Aprobada`}`
                : `Recarga Wompi (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Rechazada`,
            wallet_type: 'dinero',
            payment_method: paymentMethod,
            simulation_status: simulationStatus,
            created_at: new Date().toISOString(),
        };

        mockTransactions.unshift(newTransaction);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));

        if (isApproved) {
            mockBalance += amount;
            localStorage.setItem('mock_wallet_balance', mockBalance.toString());
        }

        // Mutate the provided mockState reference if passed to sync with UI
        if (mockState) {
            mockState.balance = mockBalance;
            mockState.transactions = mockTransactions;
        }

        return {
            success: isApproved,
            newBalance: mockBalance,
            transactionId: newTransaction.id,
            reason: isApproved ? null : 'simulated_rejected',
        };
    }

    // Real Supabase mode
    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const description = isApproved
        ? (reference ? `Recarga Wompi [Ref: ${reference}]` : `Recarga Wompi (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Aprobada`)
        : `Recarga Wompi (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Rechazada`;

    // Idempotencia: Verificar si el Webhook ya insertó esta transacción por referencia
    if (reference && isApproved) {
        const { data: existingTx } = await client
            .from('wallet_transactions')
            .select('id')
            .eq('description', description)
            .single();

        if (existingTx) {
            const { data: profile } = await client
                .from('profiles')
                .select('wallet_balance')
                .eq('id', user.id)
                .single();

            return {
                success: true,
                newBalance: profile?.wallet_balance || 0,
                transactionId: existingTx.id,
            };
        }
    }

    // Insert transaction — the DB trigger only credits wallet if NOT rejected
    const { data, error } = await client
        .from('wallet_transactions')
        .insert({
            user_id: user.id,
            amount: isApproved ? amount : 0,
            type: 'simulation_recharge',
            description,
            wallet_type: 'dinero',
            payment_method: paymentMethod,
            simulation_status: simulationStatus,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error inserting recharge transaction:', error);
        return { success: false, reason: error.message };
    }

    if (!isApproved) {
        return { success: false, reason: 'simulated_rejected', transactionId: data?.id };
    }

    // Read updated balance to return it
    const { data: profile } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

    return {
        success: true,
        newBalance: profile?.wallet_balance || 0,
        transactionId: data?.id,
    };
}


/* ─── Create Wallet Request ─── */

/**
 * Submit a withdrawal or consumption request.
 * Stores in DB and opens WhatsApp to notify admin.
 * @param {'withdrawal' | 'consumption'} requestType
 * @param {number} amount - Amount in COP
 * @param {string|null} bankName - Bank name (only for withdrawals)
 * @returns {{ success: boolean, requestId?: string, reason?: string }}
 */
export async function createWalletRequest(requestType, amount, bankName = null) {
    if (isUsingMockData()) {
        return { success: true, requestId: 'mock-req-id' };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const { data, error } = await client.rpc('create_wallet_request', {
        p_user_id: user.id,
        p_type: requestType,
        p_amount: amount,
        p_bank: bankName,
    });

    if (error) {
        console.error('Error creating wallet request:', error);
        return { success: false, reason: error.message };
    }

    return {
        success: data?.success === true,
        requestId: data?.request_id || null,
        reason: data?.reason || null,
    };
}

/* ─── WhatsApp Notification ─── */

/**
 * Build and open a WhatsApp message to notify admin about a wallet request.
 * @param {'withdrawal' | 'consumption'} requestType
 * @param {number} amount
 * @param {string} userName
 * @param {string} userWhatsApp
 * @param {string|null} bankName
 * @param {string} requestId
 */
export function notifyAdminViaWhatsApp(requestType, amount, userName, userWhatsApp, bankName, requestId) {
    const typeLabel = requestType === 'withdrawal' ? '💰 RETIRO' : '🥩 CONSUMO';
    const shortId = requestId ? requestId.slice(-8).toUpperCase() : 'N/A';

    let message = `🐷 *PIGGY APP — Solicitud de ${typeLabel}*\n\n`;
    message += `👤 *Usuario:* ${userName}\n`;
    message += `📱 *WhatsApp:* ${userWhatsApp || 'No registrado'}\n`;
    message += `💵 *Monto:* ${formatCOP(amount)}\n`;

    if (requestType === 'withdrawal' && bankName) {
        message += `🏦 *Banco:* ${bankName}\n`;
    }

    message += `🎫 *ID Solicitud:* #${shortId}\n`;
    message += `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n`;

    if (requestType === 'withdrawal') {
        message += `⚡ Acción requerida: Transferir fondos al usuario y debitar saldo en la BD.`;
    } else {
        message += `⚡ Acción requerida: Coordinar entrega de productos y debitar saldo en la BD.`;
    }

    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

/* ─── Get Transaction History ─── */

/**
 * Fetch all wallet transactions for the current user.
 * Ordered by created_at DESC (newest first).
 * @returns {Promise<Array>} Transaction history
 */
export async function getWalletTransactions() {
    if (isUsingMockData()) {
        initMockState();
        return mockTransactions;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data, error } = await client
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching wallet transactions:', error);
        return [];
    }

    return data || [];
}

/* ─── Format Helper ─── */

export { formatCOP };
