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
 * Fetch the current user's referral balance (Saldo Disponible).
 * @returns {number} The balance in COP
 */
export async function getWalletBalance() {
    if (isUsingMockData()) {
        return 0;
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

/* ─── Deduct Wallet Balance (Post-Purchase) ─── */

/**
 * Deduct an amount from the user's wallet balance after a successful purchase.
 * This is the frontend safeguard — ideally the Supabase RPC buy_piggy should
 * handle this atomically. Until then, we call this immediately after a confirmed purchase.
 *
 * IMPORTANT: This function includes a balance guard to prevent negative balances.
 * If the Supabase RPC is updated to handle deduction atomically, this function
 * should be removed to avoid double-deduction.
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

    // Read current balance first
    const { data: profile, error: readError } = await client
        .from('profiles')
        .select('referral_balance')
        .eq('id', user.id)
        .single();

    if (readError || !profile) {
        return { success: false, reason: 'could_not_read_balance' };
    }

    const currentBalance = profile.referral_balance || 0;

    // Guard: never allow negative balance
    if (currentBalance < amount) {
        return { success: false, reason: 'insufficient_balance' };
    }

    const newBalance = currentBalance - amount;

    const { error: updateError } = await client
        .from('profiles')
        .update({ referral_balance: newBalance })
        .eq('id', user.id);

    if (updateError) {
        console.error('Error deducting wallet balance:', updateError);
        return { success: false, reason: updateError.message };
    }

    return { success: true, newBalance };
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

/* ─── Format Helper ─── */

export { formatCOP };
