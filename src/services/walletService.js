/* ============================================
   PIGGY APP — Wallet Service
   Real accounting ledger: transactions & balances.
   Strictly adheres to Single Responsibility Principle.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';
import { MOCK_PROFILE } from './mockData.js';

/* ─── Mock State (Only for Mock Mode) ─── */

let mockBalance = null;
let mockTransactions = null;

function initMockState() {
    if (mockBalance === null) {
        const storedBal = localStorage.getItem('mock_wallet_balance');
        mockBalance = storedBal !== null ? parseFloat(storedBal) : 0;
        if (storedBal === null) localStorage.setItem('mock_wallet_balance', '0');
    }
    if (mockTransactions === null) {
        const storedTxs = localStorage.getItem('mock_wallet_transactions');
        mockTransactions = storedTxs !== null ? JSON.parse(storedTxs) : [
            { id: '1', amount: -1000000, type: 'debit', description: 'Débito: compra de Piggy', wallet_type: 'dinero', created_at: new Date().toISOString() },
            { id: '2', amount: 2230000, type: 'recharge', description: 'Recarga de Wallet aprobada', wallet_type: 'dinero', created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: '3', amount: 20000, type: 'credit', description: 'Bono de Bienvenida (aplica condiciones)', wallet_type: 'consumo', created_at: new Date(Date.now() - 172800000).toISOString() }
        ];
        if (storedTxs === null) localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
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
 * Fetch the current user's consumption bonus balance.
 * Supports both new 'consumption_balance' and legacy 'referral_balance'.
 * These are NOT withdrawable cash — they are exchanged for meat-consumption coupons.
 * @returns {number} Consumption bonus balance in COP
 */
export async function getReferralBonusBalance() {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || MOCK_PROFILE;
        const cb = Number(profile?.consumption_balance);
        return !isNaN(cb) && cb >= 0 ? cb : 20000;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return 0;

    const { data } = await client
        .from('profiles')
        .select('consumption_balance')
        .eq('id', user.id)
        .single();

    if (!data) return 0;
    const cb = Number(data.consumption_balance);
    return !isNaN(cb) && cb >= 0 ? cb : 0;
}

/** Alias for semantic clarity */
export const getConsumptionBonusBalance = getReferralBonusBalance;

/**
 * Sube un comprobante de pago al bucket 'comprobantes' de Supabase Storage.
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<string|null>} URL pública del comprobante o null si falla
 */
export async function uploadPaymentReceipt(file, userId) {
    if (!file || !userId || isUsingMockData()) return null;
    const client = getClient();
    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `receipts/${userId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await client.storage.from('comprobantes').upload(filePath, file, { cacheControl: '3600', upsert: true });
        if (uploadError) {
            console.warn('⚠️ Error subiendo comprobante a storage:', uploadError.message);
            return null;
        }
        const { data } = client.storage.from('comprobantes').getPublicUrl(filePath);
        return data?.publicUrl || null;
    } catch (e) {
        console.warn('⚠️ Excepción subiendo comprobante:', e.message);
        return null;
    }
}

/**
 * Registra una recarga manual como simulación para validación y trazabilidad.
 * Crea el registro en wallet_transactions (PENDING) y envía la solicitud formal a wallet_requests.
 * @param {Object} params
 * @returns {Promise<{success: boolean, transactionId?: string, error?: string}>}
 */
export async function submitManualRecharge({ amount, paymentMethod, reference, accountKey, receiptFile = null }) {
    if (isUsingMockData()) {
        return { success: true, transactionId: `mock-sim-${Date.now()}` };
    }
    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const methodLabels = {
        'BRE_B': 'Recarga Bre-B',
        'QR_CODE': 'Recarga Código QR',
        'WOMPI': 'Recarga Wompi',
    };
    const methodLabel = methodLabels[paymentMethod] || 'Recarga de Saldo';
    let desc = `${methodLabel} [Ref: ${reference}] — Pendiente ($ ${Number(amount).toLocaleString('es-CO')})`;
    if (accountKey) desc += ` [Llave: ${accountKey}]`;

    let receiptUrl = null;
    if (receiptFile) {
        receiptUrl = await uploadPaymentReceipt(receiptFile, user.id);
    }

    try {
        const { data: tx, error: txError } = await client.from('wallet_transactions').insert({
            user_id: user.id,
            amount: 0,
            type: 'simulation_recharge',
            description: desc,
            wallet_type: 'dinero',
            payment_method: paymentMethod,
            simulation_status: 'PENDING'
        }).select().single();

        if (txError) throw txError;

        await client.from('wallet_requests').insert({
            user_id: user.id,
            type: 'recharge',
            amount: Number(amount),
            wallet_type: 'dinero',
            status: 'pending',
            account_info: {
                payment_method: paymentMethod,
                reference: reference,
                account_key: accountKey || null,
                receipt_url: receiptUrl,
                transaction_id: tx?.id || null,
                simulation: true
            }
        });

        return { success: true, transactionId: tx?.id };
    } catch (err) {
        console.error('Error registrando recarga:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Deduct an amount from wallet balance (e.g. when buying a piggy).
 * Records debit in wallet_transactions so DB trigger updates profiles.wallet_balance.
 * @param {number} amount
 * @param {string} description
 * @returns {Promise<boolean>}
 */
export async function deductWalletBalance(amount, description = 'Débito: compra de Piggy') {
    if (isUsingMockData()) {
        initMockState();
        if (mockBalance < amount) return false;
        mockBalance -= amount;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());
        mockTransactions.unshift({
            id: `mock-${Date.now()}`,
            amount: -amount,
            type: 'debit',
            description,
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        });
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
        return true;
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return false;

    // Prefer dedicated atomic RPC
    try {
        const { data: rpcRes, error: rpcErr } = await client.rpc('deduct_wallet_balance', {
            p_amount: amount,
            p_description: description
        });
        if (!rpcErr && rpcRes?.success) {
            return true;
        }
    } catch (e) {
        console.warn('deduct_wallet_balance RPC not found or failed, using ledger insert:', e);
    }

    // Ledger insert fallback
    const { data: profile } = await client.from('profiles').select('wallet_balance').eq('id', user.id).single();
    if (!profile || profile.wallet_balance < amount) return false;

    const { error } = await client.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -amount,
        type: 'debit',
        description,
        wallet_type: 'dinero',
        payment_method: 'SALDO_AGRO',
        simulation_status: 'APPROVED'
    });

    return !error;
}

/**
 * Fetch all wallet transactions for the current user.
 * Reads directly from wallet_transactions table (the ledger).
 * @returns {Array<Object>}
 */
export async function getWalletTransactions() {
    if (isUsingMockData()) {
        initMockState();
        return mockTransactions || [];
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

    // Cache in AppState for offline / fast drawer render
    AppState.set({ wallet_transactions: data || [] });
    return data || [];
}

/**
 * Synchronous read from AppState cache for instant drawer render.
 */
export function getCachedWalletTransactions() {
    return AppState.get('wallet_transactions') || [];
}

/**
 * Request a meat-consumption redemption using referral bonus.
 * Inserts a 'processed' wallet_transaction with wallet_type: 'consumo',
 * which fires the DB trigger to deduct consumption_balance in profiles.
 * @param {number} amount
 * @param {string} meatPackName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function requestMeatRedemption(amount, meatPackName = 'Canje de Carne') {
    if (isUsingMockData()) {
        const curProfile = AppState.get('profile') || MOCK_PROFILE;
        const curBonus = curProfile.consumption_balance || curProfile.referral_balance || 20000;
        if (curBonus < amount) return { success: false, error: 'Saldo insuficiente de bonos' };
        const newBonus = curBonus - amount;
        AppState.set({ profile: { ...curProfile, consumption_balance: newBonus, referral_balance: newBonus } });
        return { success: true };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Validate balance before proceeding
    const currentBonus = await getReferralBonusBalance();
    if (currentBonus < amount) {
        return { success: false, error: 'Saldo de bonos insuficiente para este canje' };
    }

    // 1. Insert into wallet_requests as formal audit record
    const { error: reqError } = await client
        .from('wallet_requests')
        .insert({
            user_id: user.id,
            type: 'meat_redemption',
            amount,
            wallet_type: 'consumo',
            status: 'processed',
            account_info: { pack: meatPackName }
        });

    if (reqError) {
        console.warn('Error creating wallet_request record:', reqError);
    }

    // 2. Insert debit transaction into ledger — trigger updates consumption_balance in profiles
    const { error: txError } = await client
        .from('wallet_transactions')
        .insert({
            user_id: user.id,
            amount: -amount,
            type: 'debit',
            description: `Canje de Bono: ${meatPackName}`,
            wallet_type: 'consumo',
            created_by: user.id
        });

    if (txError) {
        console.error('Error inserting meat redemption transaction:', txError);
        return { success: false, error: txError.message };
    }

    // Update AppState for instantaneous reactivity
    const curProfile = AppState.get('profile') || {};
    const newBonus = Math.max(0, (curProfile.consumption_balance || currentBonus) - amount);
    AppState.set({ profile: { ...curProfile, consumption_balance: newBonus, referral_balance: newBonus } });

    return { success: true };
}

/**
 * Solicitud formal de retiro de saldo en efectivo hacia cuenta bancaria.
 * @param {Object} params
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function requestBalanceWithdrawal({ amount, bankName, accountType, accountNumber, accountHolder, nationalId, phone, notes }) {
    if (isUsingMockData()) {
        initMockState();
        if (mockBalance < amount) return { success: false, error: 'Saldo insuficiente para realizar el retiro' };
        mockBalance -= amount;
        localStorage.setItem('mock_wallet_balance', mockBalance.toString());
        mockTransactions.unshift({
            id: `mock-with-${Date.now()}`,
            amount: -amount,
            type: 'withdrawal',
            description: `Solicitud de Retiro a ${bankName} (${accountType})`,
            wallet_type: 'dinero',
            created_at: new Date().toISOString()
        });
        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));
        return { success: true };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    const curBal = await getWalletBalance();
    if (curBal < amount) return { success: false, error: 'Saldo insuficiente para realizar el retiro' };

    try {
        const { error: reqError } = await client.from('wallet_requests').insert({
            user_id: user.id,
            type: 'withdrawal',
            amount: Number(amount),
            wallet_type: 'dinero',
            status: 'pending',
            account_info: {
                bank_name: bankName,
                account_type: accountType,
                account_number: accountNumber,
                account_holder: accountHolder,
                national_id: nationalId,
                phone: phone || null,
                notes: notes || null
            }
        });

        if (reqError) throw reqError;

        const { error: txError } = await client.from('wallet_transactions').insert({
            user_id: user.id,
            amount: -Number(amount),
            type: 'withdrawal',
            description: `Retiro en proceso a ${bankName} (${accountType})`,
            wallet_type: 'dinero'
        });

        if (txError) console.warn('Error registrando transacción de retiro:', txError);

        const curProf = AppState.get('profile') || {};
        AppState.set({ profile: { ...curProf, wallet_balance: Math.max(0, curBal - amount) } });

        return { success: true };
    } catch (err) {
        console.error('Error solicitando retiro:', err);
        return { success: false, error: err.message };
    }
}
