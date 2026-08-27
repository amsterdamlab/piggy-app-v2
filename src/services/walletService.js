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
                { id: '3', amount: 20000, type: 'credit', description: 'Bono de Bienvenida (aplica condiciones)', wallet_type: 'consumo', created_at: new Date(Date.now() - 172800000).toISOString() }
            ];
            localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
        }
    }

    // Guaranteed Option A refund ($2.000.000 COP) check
    const isRefundApplied = localStorage.getItem('mock_refund_applied_v3') === 'true';
    if (!isRefundApplied) {
        mockBalance = (mockBalance || 0) + 2000000;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());

        const refundTx = {
            id: `refund-${Date.now()}`,
            amount: 2000000,
            type: 'recharge',
            description: 'Reembolso por compra de Piggys no completada (Opción A)',
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        };
        if (!mockTransactions) mockTransactions = [];
        mockTransactions.unshift(refundTx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
        localStorage.setItem('mock_refund_applied_v3', 'true');

        // Force AppState profile update
        const curProfile = AppState.get('profile') || {};
        AppState.set({ profile: { ...curProfile, wallet_balance: mockBalance } });
    }
}

/**
 * Execute Option A refund in Supabase DB if pending.
 */
export async function executeOptionARefundIfPending(userId) {
    if (isUsingMockData() || !userId) return;
    if (sessionStorage.getItem(`opt_a_refund_${userId}`)) return;

    const client = getClient();
    try {
        const { data: existing } = await client
            .from('wallet_transactions')
            .select('id')
            .eq('user_id', userId)
            .ilike('description', '%Reembolso por compra de Piggys%')
            .limit(1);

        if (!existing || existing.length === 0) {
            await client.from('wallet_transactions').insert({
                user_id: userId,
                amount: 2000000,
                type: 'credit',
                description: 'Reembolso por compra de Piggys no completada (Opción A)',
            });
            console.log('✅ Reembolso de $2.000.000 COP acreditado exitosamente en DB.');
        }
        sessionStorage.setItem(`opt_a_refund_${userId}`, 'done');
    } catch (e) {
        console.warn('Error applying Option A refund in DB:', e);
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

    await executeOptionARefundIfPending(user.id);

    const { data } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

    return data?.wallet_balance || 0;
}

/**
 * Fetch the current user's consumption bonus balance.
 * Supports both new 'consumption_balance' and legacy 'referral_balance'.
 * These are NOT withdrawable cash — they are exchanged for meat-consumption coupons.
 * @returns {number} Consumption bonus balance in COP
 */
export async function getReferralBonusBalance() {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || MOCK_PROFILE;
        const cb = Number(profile?.consumption_balance) || 0;
        const rb = Number(profile?.referral_balance) || 0;
        return cb > 0 ? cb : (rb > 0 ? rb : 20000);
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return 0;

    const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!data) return 0;
    const cb = Number(data.consumption_balance) || 0;
    const rb = Number(data.referral_balance) || 0;
    return cb > 0 ? cb : rb;
}

/** Alias for semantic clarity */
export const getConsumptionBonusBalance = getReferralBonusBalance;

/**
 * Ensures the welcome bonus ($20.000) is assigned to the user's consumption balance in DB if not set yet.
 */
export async function ensureWelcomeBonusAssigned(userId) {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        const cb = Number(profile?.consumption_balance) || 0;
        const rb = Number(profile?.referral_balance) || 0;
        const curBal = cb > 0 ? cb : rb;
        if (!curBal) {
            profile.consumption_balance = 20000;
            profile.referral_balance = 20000;
            AppState.set({ profile: { ...profile } });
        }
        return curBal || 20000;
    }

    const client = getClient();
    const targetUserId = userId || (await client.auth.getUser()).data.user?.id;
    if (!targetUserId) return 0;

    const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

    const cb = Number(data?.consumption_balance) || 0;
    const rb = Number(data?.referral_balance) || 0;
    const existingBalance = cb > 0 ? cb : rb;

    if (!data || existingBalance === 0) {
        const { error } = await client
            .from('wallet_transactions')
            .insert({
                user_id: targetUserId,
                amount: 20000,
                type: 'credit',
                description: 'Bono de Bienvenida ($20.000 en Tienda)',
                wallet_type: 'consumo'
            });

        if (!error) {
            console.log('🎁 Welcome consumption bonus ($20.000) assigned via transaction in DB!');
            const currentProfile = AppState.get('profile');
            if (currentProfile && currentProfile.id === targetUserId) {
                AppState.set({
                    profile: {
                        ...currentProfile,
                        consumption_balance: 20000,
                        referral_balance: 20000
                    }
                });
            }
            return 20000;
        }
    }
    return existingBalance;
}

/**
 * Calculates the Welcome Bonus expiration status based on user's registration date (created_at).
 * Validity is exactly 30 calendar days from the creation of the account.
 * @returns {Promise<{ isExpired: boolean, daysRemaining: number, expiryDate: Date, hasWelcomeBonus: boolean }>}
 */
export async function getWelcomeBonusExpiryInfo() {
    const profile = AppState.get('profile') || (isUsingMockData() ? MOCK_PROFILE : null);
    let createdAt = profile?.created_at;

    if (!createdAt && !isUsingMockData()) {
        try {
            const client = getClient();
            const { data: { user } } = await client.auth.getUser();
            if (user) {
                const { data } = await client.from('profiles').select('created_at').eq('id', user.id).single();
                createdAt = data?.created_at || user.created_at;
            }
        } catch (e) {
            console.warn('Could not read user registration date for bonus expiry:', e);
        }
    }

    const regDate = createdAt ? new Date(createdAt) : new Date();
    const EXPIRY_DAYS = 30;
    const expiryTime = regDate.getTime() + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const now = Date.now();
    const msRemaining = expiryTime - now;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = msRemaining <= 0;

    const currentBonus = await getReferralBonusBalance();

    return {
        isExpired,
        daysRemaining,
        expiryDate: new Date(expiryTime),
        hasWelcomeBonus: currentBonus > 0,
    };
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

/**
 * Add / Refund balance to the user's wallet.
 * Inserts a credit transaction so the DB trigger updates profiles.wallet_balance.
 * @param {number} amount
 * @param {string} description
 */
export async function addWalletBalance(amount, description = 'Reembolso a Wallet') {
    if (isUsingMockData()) {
        initMockState();
        mockBalance += amount;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());

        const creditTx = {
            id: `sim-ref-${Date.now()}`,
            amount: amount,
            type: 'recharge',
            description,
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        };
        mockTransactions.unshift(creditTx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
        return { success: true, newBalance: mockBalance };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const { error: txError } = await client
        .from('wallet_transactions')
        .insert({
            user_id: user.id,
            amount: amount, // positive = credit
            type: 'recharge',
            description: description,
        });

    if (txError) {
        console.error('Error inserting credit transaction:', txError);
        return { success: false, reason: txError.message };
    }

    return { success: true };
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

/**
 * Helper to register a wallet request in Supabase with optional RPC fallback.
 */
async function recordWalletRequestInDB({ userId, userName, requestType, paymentMethod, reference, amount, walletType, bankName, notes, rpcName = null, rpcArgs = null }) {
    const client = getClient();
    if (rpcName && rpcArgs) {
        try {
            const { data, error } = await client.rpc(rpcName, rpcArgs);
            if (!error && data?.success) {
                return { success: true, requestId: data.request_id, reference: data.reference || reference, status: 'pending' };
            }
        } catch (e) {
            console.warn(`RPC ${rpcName} exception:`, e);
        }
    }

    const { data, error } = await client
        .from('wallet_requests')
        .insert({
            user_id: userId,
            user_name: userName,
            request_type: requestType,
            payment_method: paymentMethod,
            reference,
            amount: amount || 0,
            status: 'pending',
            wallet_type: walletType || 'dinero',
            bank_name: bankName,
            notes,
        })
        .select('id, reference, status')
        .single();

    if (error) {
        console.error('Error registrando solicitud en wallet_requests:', error);
        return { success: false, reason: error.message };
    }

    return {
        success: true,
        requestId: data?.id,
        reference: data?.reference || reference,
        status: data?.status || 'pending',
    };
}

/**
 * Registrar una solicitud de recarga por Bre-B (Semi-automática).
 */
export async function requestBreBRecharge({ amount, reference, breBKey = '@piggygranjamoral', mockState = null }) {
    if (isUsingMockData()) {
        initMockState();
        return { success: true, requestId: `req-breb-${Date.now()}`, reference, status: 'pending' };
    }

    const client = getClient();
    if (!client) return { success: false, reason: 'no_supabase_client' };

    const { data: authData } = await client.auth.getUser().catch(() => ({ data: {} }));
    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userId = authData?.user?.id || profile?.id;
    if (!userId) return { success: false, reason: 'not_authenticated' };

    return recordWalletRequestInDB({
        userId,
        userName: profile?.full_name || 'Usuario',
        requestType: 'recharge',
        paymentMethod: 'BRE_B',
        reference,
        amount,
        walletType: 'dinero',
        bankName: 'Bancolombia',
        notes: `Llave Bre-B: ${breBKey}`,
        rpcName: 'create_recharge_request',
        rpcArgs: { p_user_id: userId, p_amount: amount, p_payment_method: 'BRE_B', p_reference: reference, p_notes: `Llave Bre-B: ${breBKey}` }
    });
}

/**
 * Registrar una solicitud de recarga por Código QR.
 */
export async function requestQRRecharge({ amount, reference, mockState = null }) {
    if (isUsingMockData()) {
        initMockState();
        return { success: true, requestId: `req-qr-${Date.now()}`, reference, status: 'pending' };
    }

    const client = getClient();
    if (!client) return { success: false, reason: 'no_supabase_client' };

    const { data: authData } = await client.auth.getUser().catch(() => ({ data: {} }));
    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userId = authData?.user?.id || profile?.id;
    if (!userId) return { success: false, reason: 'not_authenticated' };

    return recordWalletRequestInDB({
        userId,
        userName: profile?.full_name || 'Usuario',
        requestType: 'recharge',
        paymentMethod: 'QR_CODE',
        reference,
        amount,
        walletType: 'dinero',
        bankName: 'Bancolombia',
        notes: 'Código QR Bancolombia',
        rpcName: 'create_recharge_request',
        rpcArgs: { p_user_id: userId, p_amount: amount, p_payment_method: 'QR_CODE', p_reference: reference, p_notes: 'Código QR Bancolombia' }
    });
}

/**
 * Registrar una solicitud de canje por carne (Bonos de Consumo).
 */
export async function requestMeatRedemption({ amount, reference }) {
    if (isUsingMockData()) {
        return { success: true, requestId: `req-crn-${Date.now()}`, reference, status: 'pending' };
    }

    const client = getClient();
    if (!client) return { success: false, reason: 'no_supabase_client' };

    const { data: authData } = await client.auth.getUser().catch(() => ({ data: {} }));
    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userId = authData?.user?.id || profile?.id;
    if (!userId) return { success: false, reason: 'not_authenticated' };

    return recordWalletRequestInDB({
        userId,
        userName: profile?.full_name || 'Usuario',
        requestType: 'consumption',
        paymentMethod: 'BONO',
        reference,
        amount,
        walletType: 'bono_consumo',
        notes: 'Canje de bonos por productos de carne',
    });
}

/* ─── Bank Withdrawal with Immediate Retention (Fintech Standard) ─── */

/**
 * Request a bank withdrawal with immediate balance retention.
 * @param {Object} params
 * @returns {Promise<{ success: boolean, requestId?: string, reference?: string, newBalance?: number, reason?: string }>}
 */
export async function requestBankWithdrawal({ amount, bankName = '', accountType = '', breveKey = '', notes = '' }) {
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
        return { success: false, reason: 'El monto a retirar debe ser mayor a cero' };
    }

    const refCode = `RET-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isUsingMockData()) {
        initMockState();
        if (mockBalance < numAmount) {
            return { success: false, reason: 'Saldo insuficiente en tu Cuenta Agro' };
        }

        mockBalance -= numAmount;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());

        const bankLabel = bankName || 'Bancario';
        const debitTx = {
            id: `tx-ret-${Date.now()}`,
            user_id: 'mock-user-id',
            amount: -numAmount,
            type: 'debit',
            description: `Retención por solicitud de retiro bancario (${bankLabel}) [Ref: ${refCode}]`,
            wallet_type: 'dinero',
            payment_method: 'TRANSFERENCIA',
            simulation_status: 'PENDING',
            created_at: new Date().toISOString(),
        };

        if (!mockTransactions) mockTransactions = [];
        mockTransactions.unshift(debitTx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));

        const curProfile = AppState.get('profile') || { ...MOCK_PROFILE };
        curProfile.wallet_balance = mockBalance;
        AppState.set({ profile: { ...curProfile } });

        return {
            success: true,
            requestId: `req-ret-${Date.now()}`,
            reference: refCode,
            newBalance: mockBalance,
        };
    }

    const client = getClient();
    if (!client) return { success: false, reason: 'no_supabase_client' };

    let userId = null;
    try {
        const { data: authData } = await client.auth.getUser();
        userId = authData?.user?.id;
    } catch (e) {
        console.warn('No se pudo obtener usuario de auth.getUser:', e);
    }

    if (!userId) {
        const profile = AppState.get('profile') || AppState.get('currentUser');
        userId = profile?.id;
    }

    if (!userId) return { success: false, reason: 'not_authenticated' };

    // 1. Validación de Saldo Disponible en DB
    const { data: profile, error: profileErr } = await client
        .from('profiles')
        .select('id, wallet_balance, full_name, bank_name, bank_account_type, bank_breve_key')
        .eq('id', userId)
        .single();

    if (profileErr || !profile) {
        return { success: false, reason: 'No se pudo verificar el saldo disponible en tu cuenta' };
    }

    const currentBalance = Number(profile.wallet_balance) || 0;
    if (currentBalance < numAmount) {
        return { success: false, reason: 'Saldo insuficiente para realizar este retiro' };
    }

    const effectiveBank = bankName || profile.bank_name || 'Bancario';
    const effectiveAccountType = accountType || profile.bank_account_type || 'Ahorros';
    const effectiveBreveKey = breveKey || profile.bank_breve_key || '';
    const bankDetailsStr = [effectiveBank, effectiveAccountType, effectiveBreveKey ? `Llave Bre-B: ${effectiveBreveKey}` : ''].filter(Boolean).join(' - ');
    const userName = profile.full_name || 'Usuario';
    const finalNotes = notes || `Retiro bancario a cuenta ${bankDetailsStr}`;
    const txDescription = `Retención por solicitud de retiro bancario (${effectiveBank}) [Ref: ${refCode}]`;
    const newBalance = Math.max(0, currentBalance - numAmount);

    // 2. Registro Contable de Retención en wallet_transactions (-numAmount)
    const { data: txData, error: txError } = await client
        .from('wallet_transactions')
        .insert({
            user_id: userId,
            amount: -numAmount,
            type: 'debit',
            description: txDescription,
            wallet_type: 'dinero',
            payment_method: 'TRANSFERENCIA',
            simulation_status: 'PENDING',
            created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (txError) {
        console.error('Error insertando débito de retención en wallet_transactions:', txError);
        return { success: false, reason: 'Error contable al registrar la retención: ' + txError.message };
    }

    // 3. Retención / Débito Inmediato en profiles.wallet_balance
    const { error: balError } = await client
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

    if (balError) {
        console.warn('Advertencia actualizando profiles.wallet_balance directamente:', balError);
    }

    // 4. Creación de la Solicitud en wallet_requests
    let requestId = txData?.id || null;
    try {
        const { data: reqData, error: reqError } = await client
            .from('wallet_requests')
            .insert({
                user_id: userId,
                user_name: userName,
                request_type: 'withdrawal',
                amount: numAmount,
                bank_name: bankDetailsStr,
                reference: refCode,
                wallet_type: 'dinero',
                status: 'pending',
                notes: finalNotes,
                created_at: new Date().toISOString(),
            })
            .select('id, reference, status')
            .single();

        if (reqError) {
            console.warn('Error insertando en wallet_requests (retención ya aplicada):', reqError);
        } else if (reqData?.id) {
            requestId = reqData.id;
        }
    } catch (e) {
        console.warn('Excepción al crear registro en wallet_requests:', e);
    }

    // 5. Actualizar AppState en tiempo real
    const currentAppStateProfile = AppState.get('profile') || {};
    AppState.set({
        profile: {
            ...currentAppStateProfile,
            ...profile,
            wallet_balance: newBalance,
        }
    });

    return {
        success: true,
        requestId,
        reference: refCode,
        newBalance,
    };
}

/* ─── Create Wallet Request (Backwards-Compatible Wrapper) ─── */

/**
 * Submit a withdrawal or consumption request.
 * @param {'withdrawal' | 'consumption'} requestType
 * @param {number} amount - Amount in COP
 * @param {string|null} bankName - Bank name (only for withdrawals)
 * @returns {{ success: boolean, requestId?: string, reference?: string, newBalance?: number, reason?: string }}
 */
export async function createWalletRequest(requestType, amount, bankName = null) {
    if (requestType === 'withdrawal') {
        return requestBankWithdrawal({ amount, bankName });
    }

    if (isUsingMockData()) {
        return { success: true, requestId: 'mock-req-id' };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userName = profile?.full_name || 'Usuario';

    try {
        const { data: insData, error: insError } = await client
            .from('wallet_requests')
            .insert({
                user_id: user.id,
                user_name: userName,
                request_type: requestType,
                amount: amount,
                bank_name: bankName,
                status: 'pending',
                wallet_type: 'bono_consumo'
            })
            .select('id')
            .single();

        if (insError) {
            return { success: false, reason: insError.message };
        }

        return { success: true, requestId: insData?.id || null };
    } catch (e) {
        return { success: false, reason: e.message };
    }
}

/* ─── WhatsApp Notification ─── */

/**
 * Build and open a WhatsApp message to notify admin about a wallet request.
 */
export function notifyAdminViaWhatsApp(requestType, amount, userName, userWhatsApp, bankName, requestId, userBreveKey = null) {
    const typeLabel = requestType === 'withdrawal' ? '💰 RETIRO' : '🥩 CONSUMO';
    const shortId = requestId ? requestId.slice(-8).toUpperCase() : 'N/A';

    let message = `🐷 *PIGGY APP — Solicitud de ${typeLabel}*\n\n`;
    message += `👤 *Usuario:* ${userName}\n`;
    message += `📱 *WhatsApp:* ${userWhatsApp || 'No registrado'}\n`;
    message += `💵 *Monto:* ${formatCOP(amount)}\n`;

    if (requestType === 'withdrawal' && bankName) {
        message += `🏦 *Banco:* ${bankName}\n`;
        if (userBreveKey) {
            message += `⚡ *Llave Bre-B:* ${userBreveKey}\n`;
        }
    }

    message += `🎫 *ID Solicitud:* #${shortId}\n`;
    message += `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n`;

    if (requestType === 'withdrawal') {
        message += `⚡ Acción requerida: Transferir fondos vía Bre-B al usuario y debitar saldo en la BD.`;
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
