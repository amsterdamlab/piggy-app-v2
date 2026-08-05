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

    // Auto-apply Option A refund ($2.000.000 COP) for orphan debits
    if (localStorage.getItem('mock_refund_option_a_v1') !== 'true') {
        mockBalance += 2000000;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());

        const refundTx = {
            id: `refund-${Date.now()}`,
            amount: 2000000,
            type: 'recharge',
            description: 'Reembolso por compra de Piggys no completada (Opción A)',
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        };
        mockTransactions.unshift(refundTx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
        localStorage.setItem('mock_refund_option_a_v1', 'true');
    }
}

/**
 * Execute Option A refund in Supabase DB if pending.
 */
export async function executeOptionARefundIfPending(userId) {
    if (isUsingMockData() || !userId) return;
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
                type: 'recharge',
                description: 'Reembolso por compra de Piggys no completada (Opción A)',
            });
            console.log('✅ Reembolso de $2.000.000 COP acreditado exitosamente en DB.');
        }
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
        if (!profile.referral_balance) {
            profile.referral_balance = 30000;
            AppState.set({ profile });
        }
        return 30000;
    }

    const client = getClient();
    const { data: profile } = await client
        .from('profiles')
        .select('referral_balance')
        .eq('id', userId)
        .single();

    if (!profile || profile.referral_balance === 0 || profile.referral_balance === null) {
        const { error } = await client
            .from('profiles')
            .update({ referral_balance: 30000 })
            .eq('id', userId);
        if (error) console.warn('Error assigning welcome bonus:', error);
        return 30000;
    }

    return profile.referral_balance;
}

/* ─── Deduct Wallet Balance ─── */

/**
 * Deduct wallet balance safely when user buys a piggy.
 * Source of truth: inserts a 'debit' record into wallet_transactions,
 * which automatically decrements profiles.wallet_balance via database trigger.
 * @param {number} amount - Amount in COP to deduct
 * @returns {Promise<{success: boolean, reason?: string, newBalance?: number}>}
 */
export async function deductWalletBalance(amount) {
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
            description: 'Débito: compra de Piggy',
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        };
        mockTransactions.unshift(debitTx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));

        return { success: true, newBalance: mockBalance };
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
        mockTransactions.unshift(debitTx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));

        // Credit referral balance
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        profile.referral_balance = (profile.referral_balance || 0) + amount;
        AppState.set({ profile });

        return { success: true };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    // RPC converts balance atomically in DB
    const { data, error } = await client.rpc('convert_balance_to_consumption_bonus', {
        p_user_id: user.id,
        p_amount: amount,
    });

    if (error) {
        console.error('Error in convert_balance_to_consumption_bonus RPC:', error);
        return { success: false, reason: error.message };
    }

    return { success: true };
}

/* ─── Get Transactions ─── */

/**
 * Fetch all wallet transactions for the current user.
 * @returns {Promise<Array>} Array of transaction objects
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
        console.warn('Error fetching wallet transactions:', error);
        return [];
    }

    return data || [];
}

/* ─── Request Withdrawal ─── */

/**
 * Request a withdrawal from wallet_balance.
 * Validates balance, inserts debit transaction in wallet_transactions
 * (which updates wallet_balance via DB trigger), inserts withdrawal_requests record,
 * and notifies admin via WhatsApp.
 * @param {number} amount - Amount to withdraw in COP
 * @param {Object} bankDetails - Bank account details
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function requestWithdrawal(amount, bankDetails) {
    if (isUsingMockData()) {
        initMockState();
        if (mockBalance < amount) {
            return { success: false, reason: 'insufficient_balance' };
        }
        mockBalance -= amount;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());

        const tx = {
            id: `sim-wth-${Date.now()}`,
            amount: -amount,
            type: 'withdrawal',
            description: `Solicitud de Retiro: ${bankDetails.bank_name || 'Banco'} (${bankDetails.account_number || ''})`,
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        };
        mockTransactions.unshift(tx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));

        // WhatsApp notification URL
        const profile = AppState.get('profile') || MOCK_PROFILE;
        const text = encodeURIComponent(
            `*NUEVA SOLICITUD DE RETIRO*\n` +
            `Monto: ${formatCOP(amount)}\n` +
            `Usuario: ${profile.full_name || 'Usuario'}\n` +
            `Banco: ${bankDetails.bank_name}\n` +
            `Tipo: ${bankDetails.account_type}\n` +
            `Número: ${bankDetails.account_number}\n` +
            `Titular: ${bankDetails.holder_name} (ID: ${bankDetails.holder_id || 'N/A'})`
        );
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');

        return { success: true };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    // Validate balance first
    const currentBalance = await getWalletBalance();
    if (currentBalance < amount) {
        return { success: false, reason: 'insufficient_balance' };
    }

    // Call RPC request_withdrawal
    const { data: rpcData, error: rpcError } = await client.rpc('request_withdrawal', {
        p_user_id:        user.id,
        p_amount:         amount,
        p_bank_name:      bankDetails.bank_name,
        p_account_type:   bankDetails.account_type,
        p_account_number: bankDetails.account_number,
        p_holder_name:    bankDetails.holder_name,
        p_holder_id:      bankDetails.holder_id || '',
    });

    if (rpcError) {
        console.error('RPC request_withdrawal error:', rpcError);
        return { success: false, reason: rpcError.message };
    }

    // Fetch user profile for WhatsApp message
    const { data: profile } = await client
        .from('profiles')
        .select('full_name, whatsapp')
        .eq('id', user.id)
        .single();

    // Send WhatsApp notification to Admin
    const text = encodeURIComponent(
        `*SOLICITUD DE RETIRO DE SALDO*\n\n` +
        `👤 *Usuario:* ${profile?.full_name || user.email}\n` +
        `📱 *Contacto:* ${profile?.whatsapp || 'N/A'}\n` +
        `💵 *Monto a Retirar:* ${formatCOP(amount)}\n\n` +
        `🏦 *DATOS BANCARIOS:*\n` +
        `- Banco: ${bankDetails.bank_name}\n` +
        `- Tipo de Cuenta: ${bankDetails.account_type}\n` +
        `- No. Cuenta: ${bankDetails.account_number}\n` +
        `- Titular: ${bankDetails.holder_name}\n` +
        `- Cédula/ID: ${bankDetails.holder_id || 'N/A'}\n\n` +
        `Por favor procesar la transferencia.`
    );

    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');

    return { success: true };
}

/* ─── Redeem Consumption Bonus Coupon ─── */

/**
 * Solicitud de canje de Bono de Consumo por Cupón de Carne:
 * Generates coupon code, debits referral_balance, records transaction in DB,
 * and notifies admin via WhatsApp.
 * @param {number} amount - Bonus amount to redeem (min 30.000 COP)
 * @returns {Promise<{success: boolean, couponCode?: string, reason?: string}>}
 */
export async function redeemConsumptionBonusCoupon(amount) {
    const MIN_AMOUNT = 30000;
    if (amount < MIN_AMOUNT) {
        return { success: false, reason: 'amount_too_low' };
    }

    // Generate readable coupon code
    const randomHex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
    const couponCode = `PIGGY-CARNE-${randomHex}`;

    if (isUsingMockData()) {
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        const currentBonus = profile.referral_balance || 30000;
        if (currentBonus < amount) {
            return { success: false, reason: 'insufficient_bonus_balance' };
        }

        profile.referral_balance = currentBonus - amount;
        AppState.set({ profile });

        const tx = {
            id: `sim-cdn-${Date.now()}`,
            amount: -amount,
            type: 'debit',
            description: `Canje de Bono por Cupón de Carne (${couponCode})`,
            wallet_type: 'consumo',
            created_at: new Date().toISOString()
        };
        initMockState();
        mockTransactions.unshift(tx);
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));

        // WhatsApp notification
        const text = encodeURIComponent(
            `*SOLICITUD DE CANJE DE BONO DE CONSUMO*\n\n` +
            `🎟️ *Código de Cupón:* \`${couponCode}\`\n` +
            `👤 *Usuario:* ${profile.full_name || 'Usuario'}\n` +
            `📱 *Contacto:* ${profile.whatsapp || 'N/A'}\n` +
            `🍖 *Valor Canjeado:* ${formatCOP(amount)}\n\n` +
            `Deseo aplicar este cupón en mi próxima compra de carne.`
        );
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');

        return { success: true, couponCode };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    // RPC redeem_consumption_bonus
    const { data, error } = await client.rpc('redeem_consumption_bonus', {
        p_user_id:     user.id,
        p_amount:      amount,
        p_coupon_code: couponCode,
    });

    if (error) {
        console.error('RPC redeem_consumption_bonus error:', error);
        return { success: false, reason: error.message };
    }

    const { data: profile } = await client
        .from('profiles')
        .select('full_name, whatsapp')
        .eq('id', user.id)
        .single();

    const text = encodeURIComponent(
        `*SOLICITUD DE CANJE DE BONO DE CONSUMO*\n\n` +
        `🎟️ *Código de Cupón:* \`${couponCode}\`\n` +
        `👤 *Usuario:* ${profile?.full_name || user.email}\n` +
        `📱 *Contacto:* ${profile?.whatsapp || 'N/A'}\n` +
        `🍖 *Valor Canjeado:* ${formatCOP(amount)}\n\n` +
        `Deseo aplicar este cupón en mi próxima compra de carne.`
    );

    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${text}`, '_blank');

    return { success: true, couponCode };
}
