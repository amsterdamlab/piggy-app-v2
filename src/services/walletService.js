/* ============================================
   PIGGY APP — Wallet Service
   Handles wallet balance, withdrawal and
   consumption requests
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { formatCOP } from './mockData.js';

/** Admin WhatsApp number for notifications */
const ADMIN_WHATSAPP = '573154870448';

/* ─── Get Wallet Balance ─── */

/**
 * Fetch the current user's real wallet balance (from completed piggy cycles + recharges).
 * Source of truth: profiles.wallet_balance, maintained by DB trigger via wallet_transactions.
 * @returns {number} Balance in COP
 */
export async function getWalletBalance() {
    if (isUsingMockData()) return 0;

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
    if (isUsingMockData()) return 0;

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
        return [
            { id: '1', amount: -1000000, type: 'debit', description: 'Débito: compra de Piggy', wallet_type: 'dinero', created_at: new Date().toISOString() },
            { id: '2', amount: 2230000, type: 'recharge', description: 'Recarga de Wallet aprobada', wallet_type: 'dinero', created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: '3', amount: 30000, type: 'credit', description: 'Bono de Bienvenida (aplica condiciones)', wallet_type: 'consumo', created_at: new Date(Date.now() - 172800000).toISOString() }
        ];
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
