/* ============================================
   PIGGY APP — Wallet Transactions Service
   Complete Ledger for Purchases, Bonuses,
   Redemptions & Top-ups.
   ============================================ */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { AppState } from '../state.js';
import { formatCOP } from './mockData.js';

const STORAGE_KEY_TRANSACTIONS = 'piggy_wallet_transactions_ledger';

/** Transaction Types */
export const TRANSACTION_TYPES = {
    RECHARGE: 'recharge',         // Recarga de cuenta PSE / Tarjeta / Transferencia
    PURCHASE: 'purchase',         // Compra de Piggy con Wallet
    BONUS_WELCOME: 'bonus_welcome', // Bono de Bienvenida ($20.000)
    BONUS_FLASH: 'bonus_flash',   // Bono de Misión Flash
    BONUS_REFERRAL: 'bonus_referral', // Bono por referir amigo ($20.000 / $40.000)
    GOURMET_REDEMPTION: 'gourmet_redemption', // Canje o pedido de carne con Wallet
    ROI_PAYOUT: 'roi_payout',     // Liquidación o retorno de ciclo
};

/**
 * Initial Default Transactions (Mock Ledger)
 */
const DEFAULT_MOCK_TRANSACTIONS = [
    {
        id: 'tx-001',
        type: TRANSACTION_TYPES.BONUS_WELCOME,
        title: 'Bono de Bienvenida Activado',
        description: 'Bono de consumo inicial para tu cuenta Piggy.',
        amount: 20000,
        direction: 'in', // 'in' = crédito (+), 'out' = débito (-)
        status: 'completed',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'tx-002',
        type: TRANSACTION_TYPES.RECHARGE,
        title: 'Recarga de Saldo Wallet',
        description: 'Recarga exitosa aprobada por Tesorería.',
        amount: 1000000,
        direction: 'in',
        status: 'completed',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'tx-003',
        type: TRANSACTION_TYPES.PURCHASE,
        title: 'Compra de Piggy Pochito',
        description: 'Débito automático para compra de Piggy Estándar.',
        amount: 1000000,
        direction: 'out',
        status: 'completed',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    }
];

/**
 * Get all wallet transactions for the current user.
 */
export async function getWalletTransactions() {
    if (isSupabaseConfigured() && AppState.user?.id) {
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('user_id', AppState.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data && data.length > 0) {
                return data;
            }
        } catch (err) {
            console.warn('Could not fetch wallet transactions from Supabase, using local ledger:', err);
        }
    }

    // Local Storage Ledger Fallback
    try {
        const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading transactions from localStorage:', e);
    }

    // Initialize with default mock ledger
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(DEFAULT_MOCK_TRANSACTIONS));
    return DEFAULT_MOCK_TRANSACTIONS;
}

/**
 * Record a new wallet transaction.
 */
export async function recordWalletTransaction({
    type,
    title,
    description = '',
    amount,
    direction = 'in',
    status = 'completed',
    metadata = {}
}) {
    const newTx = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: AppState.user?.id || 'local-user',
        type,
        title,
        description,
        amount: Number(amount),
        direction,
        status,
        metadata,
        created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && AppState.user?.id) {
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .insert(newTx)
                .select()
                .single();

            if (!error && data) {
                return data;
            }
        } catch (err) {
            console.warn('Could not save transaction to Supabase, saving to local ledger:', err);
        }
    }

    // Save to Local Ledger
    try {
        const currentList = await getWalletTransactions();
        const updatedList = [newTx, ...currentList];
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updatedList));
    } catch (e) {
        console.error('Error saving transaction locally:', e);
    }

    return newTx;
}

/**
 * Format transaction date nicely (e.g., "12 Feb, 3:45 PM")
 */
export function formatTransactionDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Get visual icon & badge info for transaction type
 */
export function getTransactionDisplayMeta(tx) {
    const isCredit = tx.direction === 'in';
    const amountPrefix = isCredit ? '+' : '-';
    const amountColor = isCredit ? '#10b981' : '#dc2626';

    let icon = '💳';
    let bgIcon = '#f1f5f9';

    switch (tx.type) {
        case TRANSACTION_TYPES.RECHARGE:
            icon = '💰';
            bgIcon = '#f0fdf4';
            break;
        case TRANSACTION_TYPES.PURCHASE:
            icon = '🐷';
            bgIcon = '#fdf2f8';
            break;
        case TRANSACTION_TYPES.BONUS_WELCOME:
            icon = '🎉';
            bgIcon = '#fef3c7';
            break;
        case TRANSACTION_TYPES.BONUS_FLASH:
            icon = '⚡';
            bgIcon = '#fef3c7';
            break;
        case TRANSACTION_TYPES.BONUS_REFERRAL:
            icon = '🎁';
            bgIcon = '#f3e8ff';
            break;
        case TRANSACTION_TYPES.GOURMET_REDEMPTION:
            icon = '🥩';
            bgIcon = '#fff1f2';
            break;
        case TRANSACTION_TYPES.ROI_PAYOUT:
            icon = '📈';
            bgIcon = '#ecfdf5';
            break;
        default:
            icon = isCredit ? '📥' : '📤';
            bgIcon = '#f8fafc';
    }

    return {
        icon,
        bgIcon,
        amountText: `${amountPrefix}${formatCOP(tx.amount)}`,
        amountColor,
    };
}
