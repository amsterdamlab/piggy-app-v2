/* ============================================
   PIGGY APP — Wallet Transactions Service
   Multi-table traceability and synchronization
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { AppState } from '../state.js';

/* ─── In-Memory & Persistent Caching ─── */
let inMemoryTxsCache = {};

function getLocalCachedTransactions(userId) {
    if (!userId) return null;
    if (inMemoryTxsCache[userId] && inMemoryTxsCache[userId].length > 0) {
        return inMemoryTxsCache[userId];
    }
    try {
        const stored = localStorage.getItem(`cached_wallet_txs_${userId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                inMemoryTxsCache[userId] = parsed;
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Error reading cached transactions from localStorage:', e);
    }
    return null;
}

function saveLocalCachedTransactions(userId, transactions) {
    if (!userId || !Array.isArray(transactions)) return;
    inMemoryTxsCache[userId] = transactions;
    try {
        localStorage.setItem(`cached_wallet_txs_${userId}`, JSON.stringify(transactions));
    } catch (e) {
        console.warn('Error saving transactions to localStorage:', e);
    }
}

/**
 * Synchronously get the best known transactions for a user (useful for instant render).
 */
export function getCachedWalletTransactions(userId = null) {
    const targetUserId = userId || AppState.get('profile')?.id || AppState.get('currentUser')?.id;
    if (!targetUserId) return [];
    return getLocalCachedTransactions(targetUserId) || [];
}

/* ─── Mock Transactions ─── */
let mockTransactions = null;

function initMockTransactions() {
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

/**
 * Fetch all wallet transactions for the current user with complete DB traceability.
 * Aggregates:
 * 1. Primary `wallet_transactions` table
 * 2. Supplementary `wallet_requests` (recharges, withdrawals, meat redemption)
 * 3. Supplementary `piggies` purchases
 * 4. Welcome bonus / Marketing campaigns
 * Includes persistent caching to guarantee transactions never disappear on intermittent network/auth lag.
 */
export async function getWalletTransactions() {
    if (isUsingMockData()) {
        initMockTransactions();
        return mockTransactions;
    }

    const client = getClient();
    if (!client) {
        const cached = getCachedWalletTransactions();
        return cached.length > 0 ? cached : [];
    }

    // 1. Resilient User ID resolution (Auth user -> Auth session -> AppState)
    let userId = null;
    try {
        const { data: authData } = await client.auth.getUser().catch(() => ({ data: {} }));
        userId = authData?.user?.id;
        if (!userId) {
            const { data: sessionData } = await client.auth.getSession().catch(() => ({ data: {} }));
            userId = sessionData?.session?.user?.id;
        }
    } catch (e) {
        console.warn('Warning getting auth user for transactions:', e);
    }

    if (!userId) {
        const profile = AppState.get('profile') || AppState.get('currentUser');
        userId = profile?.id;
    }

    if (!userId) {
        return getCachedWalletTransactions() || [];
    }

    const cachedTxs = getLocalCachedTransactions(userId) || [];

    try {
        // 2. Fetch primary wallet_transactions table
        const { data: dbTxs, error: txsError } = await client
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (txsError) {
            console.warn('⚠️ Supabase error reading wallet_transactions:', txsError.message);
        }

        let combined = Array.isArray(dbTxs) ? [...dbTxs] : [...cachedTxs];

        // 3. Fetch wallet_requests (recharges / withdrawals) to ensure traceability even if pending/processed
        try {
            const { data: reqData } = await client
                .from('wallet_requests')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (reqData && reqData.length > 0) {
                for (const req of reqData) {
                    const isAlreadyIncluded = combined.some(t => 
                        (t.description && req.id && t.description.includes(String(req.id).slice(-6))) ||
                        (t.description && req.reference && t.description.includes(req.reference)) ||
                        (Math.abs(Number(t.amount)) === Math.abs(Number(req.amount)) && Math.abs(new Date(t.created_at) - new Date(req.created_at)) < 60000)
                    );

                    if (!isAlreadyIncluded) {
                        const isRecharge = req.request_type === 'recharge' || req.request_type === 'recarga';
                        const isWithdrawal = req.request_type === 'withdrawal' || req.request_type === 'retiro';
                        const isMeat = req.request_type === 'meat_redemption' || req.request_type === 'consumption' || req.wallet_type === 'bono_consumo';
                        
                        const statusLabel = req.status === 'completed' || req.status === 'approved' ? '' : (req.status === 'pending' ? ' (Pendiente)' : ' (Rechazado)');
                        let desc = req.description || (isRecharge ? `Recarga de Wallet${statusLabel}` : isWithdrawal ? `Solicitud de Retiro${statusLabel}` : `Bono de Consumo en Carne${statusLabel}`);
                        
                        combined.push({
                            id: `req-${req.id}`,
                            amount: isRecharge ? Number(req.amount) : -Number(req.amount),
                            type: isRecharge ? 'credit' : 'debit',
                            description: desc,
                            wallet_type: isMeat ? 'consumo' : 'dinero',
                            created_at: req.created_at || new Date().toISOString()
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Error fetching supplementary wallet_requests:', e);
        }

        // 4. Fetch piggies table to display purchases if not yet written to wallet_transactions
        try {
            const { data: piggiesData } = await client
                .from('piggies')
                .select('id, name, investment_amount, purchase_date, created_at, contract_code')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (piggiesData && piggiesData.length > 0) {
                for (const pig of piggiesData) {
                    const pigAmount = Number(pig.investment_amount) || 1000000;
                    const pigDate = pig.purchase_date || pig.created_at;
                    const isAlreadyIncluded = combined.some(t => 
                        (t.description && (t.description.includes(pig.name || '') || (pig.contract_code && t.description.includes(pig.contract_code)))) ||
                        (Number(t.amount) === -pigAmount && Math.abs(new Date(t.created_at) - new Date(pigDate)) < 120000)
                    );

                    if (!isAlreadyIncluded) {
                        combined.push({
                            id: `pig-${pig.id}`,
                            amount: -pigAmount,
                            type: 'debit',
                            description: `Débito: compra de Piggy \"${pig.name || 'Piggy'}\"`,
                            wallet_type: 'dinero',
                            created_at: pigDate || new Date().toISOString()
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Error fetching supplementary piggies purchases:', e);
        }

        // 5. Ensure Welcome Bonus is visible if profile has active consumption balance
        try {
            const { data: profile } = await client
                .from('profiles')
                .select('consumption_balance, welcome_bonus_status, created_at')
                .eq('id', userId)
                .single();

            const hasWelcomeTx = combined.some(t => t.description && t.description.toLowerCase().includes('bienvenida'));
            if (!hasWelcomeTx && (profile?.welcome_bonus_status === 'active' || (Number(profile?.consumption_balance) || 0) >= 20000)) {
                combined.push({
                    id: `wb-${userId}`,
                    amount: 20000,
                    type: 'credit',
                    description: 'Bono de Bienvenida ($20.000 en Tienda)',
                    wallet_type: 'consumo',
                    created_at: profile?.created_at || new Date().toISOString()
                });
            }
        } catch (e) {
            console.warn('Error checking welcome bonus in transactions:', e);
        }

        // Sort all combined transactions by date descending
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Update caches if we have valid results
        if (combined.length > 0) {
            saveLocalCachedTransactions(userId, combined);
        } else if (cachedTxs.length > 0) {
            // Fallback to cache if remote returned 0 unexpectedly
            combined = cachedTxs;
        }

        return combined;
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        return cachedTxs.length > 0 ? cachedTxs : [];
    }
}
