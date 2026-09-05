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
 * Ensures the welcome bonus ($20.000) is assigned to the user's consumption balance in DB if not set yet.
 */
export async function ensureWelcomeBonusAssigned(userId) {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        const cb = Number(profile?.consumption_balance);
        const curBal = !isNaN(cb) && cb >= 0 ? cb : 20000;
        profile.consumption_balance = curBal;
        profile.welcome_bonus_status = profile.welcome_bonus_status || 'active';
        AppState.set({ profile: { ...profile } });
        return curBal;
    }

    const client = getClient();
    const targetUserId = userId || (await client.auth.getUser()).data.user?.id;
    if (!targetUserId) return 0;

    const { data } = await client
        .from('profiles')
        .select('consumption_balance, welcome_bonus_status')
        .eq('id', targetUserId)
        .single();

    const cb = Number(data?.consumption_balance);
    const existingBalance = !isNaN(cb) && cb >= 0 ? cb : 0;

    if (!data || (existingBalance === 0 && !data.welcome_bonus_status)) {
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
            await client.from('profiles').update({
                welcome_bonus_status: 'active',
                consumption_balance: 20000
            }).eq('id', targetUserId);

            const currentProfile = AppState.get('profile');
            if (currentProfile && currentProfile.id === targetUserId) {
                AppState.set({
                    profile: {
                        ...currentProfile,
                        consumption_balance: 20000,
                        welcome_bonus_status: 'active'
                    }
                });
            }
            return 20000;
        }
    }
    return existingBalance;
}

/**
 * Automatically debits welcome bonus ($20.000) when 30-day limit expires and status is 'active'.
 */
export async function expireWelcomeBonusIfDue(userId = null) {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        if (profile.welcome_bonus_status === 'active') {
            const deduct = Math.min(Number(profile.consumption_balance) || 0, 20000);
            profile.consumption_balance = Math.max(0, (Number(profile.consumption_balance) || 0) - deduct);
            profile.welcome_bonus_status = 'expired';
            AppState.set({ profile: { ...profile } });
        }
        return;
    }

    const client = getClient();
    const targetUserId = userId || (await client.auth.getUser()).data.user?.id;
    if (!targetUserId) return;

    try {
        const { data: profile } = await client
            .from('profiles')
            .select('id, created_at, consumption_balance, welcome_bonus_status')
            .eq('id', targetUserId)
            .single();

        if (!profile || profile.welcome_bonus_status !== 'active') return;

        const regDate = profile.created_at ? new Date(profile.created_at) : new Date();
        const expiryTime = regDate.getTime() + (30 * 24 * 60 * 60 * 1000);

        if (Date.now() >= expiryTime) {
            const currentBal = Number(profile.consumption_balance) || 0;
            const deductAmount = Math.min(currentBal, 20000);
            const newBal = Math.max(0, currentBal - deductAmount);

            if (deductAmount > 0) {
                await client.from('wallet_transactions').insert({
                    user_id: targetUserId,
                    amount: -deductAmount,
                    type: 'debit',
                    description: 'Vencimiento de Bono de Bienvenida (30 días)',
                    wallet_type: 'consumo'
                });
            }

            await client.from('profiles').update({
                welcome_bonus_status: 'expired',
                consumption_balance: newBal
            }).eq('id', targetUserId);

            const cur = AppState.get('profile') || {};
            AppState.set({ profile: { ...cur, ...profile, welcome_bonus_status: 'expired', consumption_balance: newBal } });
            console.log('⏳ Welcome bonus expired automatically after 30 days.');
        }
    } catch (e) {
        console.warn('Error checking welcome bonus expiry:', e);
    }
}

/** Synchronizes active marketing campaigns and auto-expires due bonuses in DB (Single Table: user_marketing_bonuses). */
export async function syncAndExpireMarketingBonuses(userId = null) {
    if (isUsingMockData()) return;
    const client = getClient();
    const targetUserId = userId || (await client.auth.getUser()).data.user?.id;
    if (!targetUserId) return;

    try {
        const nowIso = new Date().toISOString();

        // 1. Auto-expire due user-specific bonuses
        const { data: dueBonuses } = await client
            .from('user_marketing_bonuses')
            .select('id, amount, campaign_name')
            .eq('user_id', targetUserId)\n            .eq('status', 'active')\n            .lte('expires_at', nowIso);\n\n        if (dueBonuses && dueBonuses.length > 0) {\n            for (const b of dueBonuses) {\n                const { data: prof } = await client.from('profiles').select('consumption_balance').eq('id', targetUserId).single();\n                const curBal = Number(prof?.consumption_balance) || 0;\n                const deduct = Math.min(curBal, Number(b.amount) || 0);\n\n                if (deduct > 0) {\n                    await client.from('wallet_transactions').insert({\n                        user_id: targetUserId,\n                        amount: -deduct,\n                        type: 'debit',\n                        description: `Vencimiento de Campaña: ${b.campaign_name}`,\n                        wallet_type: 'consumo'\n                    });\n                    await client.from('profiles').update({ consumption_balance: Math.max(0, curBal - deduct) }).eq('id', targetUserId);\n                }\n                await client.from('user_marketing_bonuses').update({ status: 'expired', is_active: false }).eq('id', b.id);\n            }\n        }\n\n        // 2. Check for active Global campaigns (where user_id IS NULL) and credit them if not received yet\n        const { data: globalBonuses } = await client\n            .from('user_marketing_bonuses')\n            .select('*')\n            .is('user_id', null)\n            .eq('is_active', true)\n            .eq('status', 'active')\n            .lte('starts_at', nowIso)\n            .gt('expires_at', nowIso);\n\n        if (globalBonuses && globalBonuses.length > 0) {\n            const { data: userExisting } = await client\n                .from('user_marketing_bonuses')\n                .select('campaign_name')\n                .eq('user_id', targetUserId);\n\n            const receivedNames = new Set((userExisting || []).map(x => x.campaign_name));\n            const { data: prof } = await client.from('profiles').select('consumption_balance').eq('id', targetUserId).single();\n            const curBal = Number(prof?.consumption_balance) || 0;\n\n            for (const gb of globalBonuses) {\n                if (receivedNames.has(gb.campaign_name)) continue;\n\n                const bonusAmount = Number(gb.amount) || 0;\n                const { error: insErr } = await client.from('user_marketing_bonuses').insert({\n                    user_id: targetUserId,\n                    campaign_name: gb.campaign_name,\n                    amount: bonusAmount,\n                    min_order_amount: gb.min_order_amount || 150000,\n                    starts_at: gb.starts_at,\n                    expires_at: gb.expires_at,\n                    status: 'active',\n                    is_active: true,\n                });\n\n                if (!insErr && bonusAmount > 0) {\n                    await client.from('wallet_transactions').insert({\n                        user_id: targetUserId,\n                        amount: bonusAmount,\n                        type: 'credit',\n                        description: `Bono de Campaña: ${gb.campaign_name}`,\n                        wallet_type: 'consumo'\n                    });\n                    await client.from('profiles').update({ consumption_balance: curBal + bonusAmount }).eq('id', targetUserId);\n                }\n            }\n        }\n    } catch (e) {\n        console.warn('Error in syncAndExpireMarketingBonuses:', e);\n    }\n}\n\n/**\n * Calculates active bonus status (Welcome Bonus or Active Marketing Bonus) with unified countdown info.\n * @returns {Promise<{ isExpired: boolean, daysRemaining: number, expiryDate: Date, hasWelcomeBonus: boolean, status: string, campaignName: string }>}\n */\nexport async function getWelcomeBonusExpiryInfo() {\n    const profile = AppState.get('profile') || (isUsingMockData() ? MOCK_PROFILE : null);\n    let createdAt = profile?.created_at;\n    let status = profile?.welcome_bonus_status || 'active';\n    let targetUserId = profile?.id;\n\n    if (!isUsingMockData()) {\n        try {\n            const client = getClient();\n            const { data: { user } } = await client.auth.getUser();\n            if (user) {\n                targetUserId = user.id;\n                const { data } = await client.from('profiles').select('created_at, welcome_bonus_status, consumption_balance').eq('id', user.id).single();\n                if (data) {\n                    createdAt = data.created_at || user.created_at;\n                    status = data.welcome_bonus_status || 'active';\n                }\n            }\n        } catch (e) {\n            console.warn('Could not read user profile for bonus expiry:', e);\n        }\n    }\n\n    const regDate = createdAt ? new Date(createdAt) : new Date();\n    const EXPIRY_DAYS = 30;\n    const expiryTime = regDate.getTime() + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);\n    const now = Date.now();\n    const msRemaining = expiryTime - now;\n    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));\n    let isExpired = status !== 'active' || msRemaining <= 0;\n\n    // Automatic trigger if 30 days passed and still marked active\n    if (status === 'active' && msRemaining <= 0) {\n        await expireWelcomeBonusIfDue(targetUserId);\n        status = 'expired';\n        isExpired = true;\n    }\n\n    // Check active marketing campaign bonus from user_marketing_bonuses\n    let campaignName = 'Bono Bienvenida $20.000';\n    let marketingDaysRemaining = 0;\n    let hasActiveMarketingBonus = false;\n\n    if (!isUsingMockData() && targetUserId) {\n        try {\n            await syncAndExpireMarketingBonuses(targetUserId);\n            const client = getClient();\n            const { data: activeMkt } = await client\n                .from('user_marketing_bonuses')\n                .select('expires_at, amount, campaign_name')\n                .eq('user_id', targetUserId)\n                .eq('status', 'active')\n                .eq('is_active', true)\n                .gt('expires_at', new Date().toISOString())\n                .order('expires_at', { ascending: true })\n                .limit(1)\n                .maybeSingle();\n\n            if (activeMkt) {\n                hasActiveMarketingBonus = true;\n                const mktExpiry = new Date(activeMkt.expires_at).getTime();\n                marketingDaysRemaining = Math.max(0, Math.ceil((mktExpiry - now) / (1000 * 60 * 60 * 24)));\n                campaignName = activeMkt.campaign_name || 'Bono Express';\n            }\n        } catch (e) {\n            console.warn('Error checking marketing bonus info:', e);\n        }\n    }\n\n    const currentBonus = await getReferralBonusBalance();\n    const isOverallActive = (!isExpired && daysRemaining > 0) || hasActiveMarketingBonus;\n    const effectiveDaysRemaining = hasActiveMarketingBonus ? marketingDaysRemaining : daysRemaining;\n\n    return {\n        status: isOverallActive ? 'active' : status,\n        isExpired: !isOverallActive,\n        daysRemaining: effectiveDaysRemaining,\n        expiryDate: new Date(expiryTime),\n        hasWelcomeBonus: currentBonus > 0,\n        campaignName: isOverallActive ? campaignName : 'Bono Bienvenida $20.000',\n    };\n}\n\n/* ─── Deduct Wallet Balance (Post-Purchase) ─── */\n\n/**\n * Deduct an amount from the user's wallet balance after a successful purchase.\n * This is the frontend safeguard — ideally the Supabase RPC buy_piggy should\n * handle this atomically. Until then, we call this immediately after a confirmed purchase.\n *\n * @param {number} amount - Amount in COP to deduct\n * @returns {{ success: boolean, newBalance?: number, reason?: string }}\n */\nexport async function deductWalletBalance(amount, description = 'Débito: compra de Piggy') {\n    if (isUsingMockData()) {\n        initMockState();\n        mockBalance = Math.max(0, (mockBalance || 0) - amount);\n        localStorage.setItem('mock_wallet_balance', mockBalance.toString());\n        const debitTx = { id: `sim-deb-${Date.now()}`, amount: -amount, type: 'debit', description, wallet_type: 'dinero', created_at: new Date().toISOString() };\n        if (!mockTransactions) mockTransactions = [];\n        mockTransactions.unshift(debitTx);\n        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));\n        const curProf = AppState.get('profile') || {};\n        AppState.set({ profile: { ...curProf, wallet_balance: mockBalance } });\n        return { success: true, newBalance: mockBalance };\n    }\n\n    const client = getClient();\n    if (!client) return { success: false, reason: 'no_client' };\n\n    const { data: { user } } = await client.auth.getUser();\n    if (!user) return { success: false, reason: 'not_authenticated' };\n\n    // 1. Try secure RPC deduct_wallet_balance\n    try {\n        const { data: rpcRes, error: rpcErr } = await client.rpc('deduct_wallet_balance', {\n            p_amount: amount,\n            p_description: description\n        });\n\n        if (!rpcErr && rpcRes && rpcRes.success) {\n            const curProf = AppState.get('profile') || {};\n            AppState.set({ profile: { ...curProf, wallet_balance: rpcRes.new_balance } });\n            return { success: true, newBalance: rpcRes.new_balance };\n        }\n    } catch (rpcEx) {\n        console.warn('deduct_wallet_balance RPC call failed, using fallback:', rpcEx);\n    }\n\n    // 2. Fallback: Read balance & insert debit transaction\n    const { data: profile, error: readError } = await client\n        .from('profiles')\n        .select('wallet_balance')\n        .eq('id', user.id)\n        .single();\n\n    if (readError || !profile) return { success: false, reason: 'could_not_read_balance' };\n\n    const currentBalance = Number(profile.wallet_balance) || 0;\n    if (currentBalance < amount) return { success: false, reason: 'insufficient_balance' };\n\n    const newBalance = currentBalance - amount;\n\n    const { error: txError } = await client\n        .from('wallet_transactions')\n        .insert({\n            user_id: user.id,\n            amount: -amount,\n            type: 'debit',\n            description,\n            wallet_type: 'dinero',\n            payment_method: 'SALDO_AGRO',\n            simulation_status: 'APPROVED'\n        });\n\n    if (txError) {\n        console.error('Error inserting debit transaction:', txError);\n        return { success: false, reason: txError.message };\n    }\n\n    // Explicitly update profiles.wallet_balance in case trigger didn't catch it\n    try {\n        await client.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);\n    } catch (e) {\n        console.warn('profiles.wallet_balance update handled by trigger or protected:', e);\n    }\n\n    const curProf = AppState.get('profile') || {};\n    AppState.set({ profile: { ...curProf, wallet_balance: newBalance } });\n\n    return { success: true, newBalance };\n}\n\n/**\n * Add / Refund balance to the user's wallet.\n * Inserts a credit transaction so the DB trigger updates profiles.wallet_balance.\n * @param {number} amount\n * @param {string} description\n */\nexport async function addWalletBalance(amount, description = 'Reembolso a Wallet') {\n    if (isUsingMockData()) {\n        initMockState();\n        mockBalance += amount;\n        localStorage.setItem('mock_wallet_balance', mockBalance.toString());\n\n        const creditTx = {\n            id: `sim-ref-${Date.now()}`,\n            amount: amount,\n            type: 'recharge',\n            description,\n            wallet_type: 'dinero',\n            created_at: new Date().toISOString()\n        };\n        mockTransactions.unshift(creditTx);\n        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));\n        return { success: true, newBalance: mockBalance };\n    }\n\n    const client = getClient();\n    const { data: { user } } = await client.auth.getUser();\n    if (!user) return { success: false, reason: 'not_authenticated' };\n\n    const { error: txError } = await client\n        .from('wallet_transactions')\n        .insert({\n            user_id: user.id,\n            amount: amount, // positive = credit\n            type: 'recharge',\n            description: description,\n        });\n\n    if (txError) {\n        console.error('Error inserting credit transaction:', txError);\n        return { success: false, reason: txError.message };\n    }\n\n    return { success: true };\n}\n\n/* ─── Convert Wallet Balance to Consumption Bonus ─── */\n\n/**\n * Canje de saldo por Bonos de Consumo:\n * Debits available wallet balance (dinero) and credits consumption bonus balance (consumo)\n * via wallet_transactions for full traceability without retaining funds or notifying WhatsApp.\n * @param {number} amount - Amount in COP to convert\n * @returns {Promise<{success: boolean, reason?: string}>}\n */\nexport async function convertBalanceToConsumptionBonus(amount) {\n    if (isUsingMockData()) {\n        initMockState();\n        if (mockBalance < amount) return { success: false, reason: 'insufficient_balance' };\n        mockBalance -= amount;\n        localStorage.setItem('mock_wallet_balance', mockBalance.toString());\n        const debitTx = { id: `sim-deb-${Date.now()}`, amount: -amount, type: 'debit', description: 'Canje a Bonos de Consumo (Débito saldo)', wallet_type: 'dinero', created_at: new Date().toISOString() };\n        const creditTx = { id: `sim-cred-${Date.now() + 1}`, amount: amount, type: 'credit', description: 'Bono de Consumo acreditado por canje de saldo', wallet_type: 'consumo', created_at: new Date().toISOString() };\n        mockTransactions.unshift(creditTx, debitTx);\n        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));\n        const profile = AppState.get('profile') || { ...MOCK_PROFILE };\n        profile.consumption_balance = (profile.consumption_balance || 0) + amount;\n        profile.wallet_balance = mockBalance;\n        AppState.set({ profile: { ...profile } });\n        return { success: true };\n    }\n    const client = getClient();\n    const { data: { user } } = await client.auth.getUser();\n    if (!user) return { success: false, reason: 'not_authenticated' };\n    const { data, error } = await client.rpc('convert_balance_to_consumption_bonus', { p_amount: amount });\n    if (error || !data?.success) return { success: false, reason: error?.message || data?.reason || 'No se pudo realizar el canje en base de datos.' };\n    const { data: updatedProfile } = await client.from('profiles').select('*').eq('id', user.id).single();\n    if (updatedProfile) {\n        const cur = AppState.get('profile') || {};\n        AppState.set({ profile: { ...cur, ...updatedProfile } });\n    }\n    return { success: true };\n}\n\n/* ─── Recharge Wallet (Wompi Simulation) ─── */\nexport async function rechargeWallet(amount, paymentMethod, simulationStatus, mockState = null, reference = null) {\n    const isApproved = simulationStatus === 'simulated_approved';\n    const refStr = reference ? ` [Ref: ${reference}]` : '';\n    if (isUsingMockData()) {\n        initMockState();\n        const newTransaction = {\n            id: `sim-${Date.now()}`,\n            amount: isApproved ? amount : 0,\n            type: 'simulation_recharge',\n            description: isApproved ? `Recarga Wompi${refStr || ` (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Aprobada`}` : `Recarga Wompi (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Rechazada`,\n            wallet_type: 'dinero',\n            payment_method: paymentMethod,\n            simulation_status: simulationStatus,\n            created_at: new Date().toISOString(),\n        };\n        mockTransactions.unshift(newTransaction);\n        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));\n        if (isApproved) {\n            mockBalance += amount;\n            localStorage.setItem('mock_wallet_balance', mockBalance.toString());\n        }\n        if (mockState) { mockState.balance = mockBalance; mockState.transactions = mockTransactions; }\n        return { success: isApproved, newBalance: mockBalance, transactionId: newTransaction.id, reason: isApproved ? null : 'simulated_rejected' };\n    }\n    const client = getClient();\n    const { data: { user } } = await client.auth.getUser();\n    if (!user) return { success: false, reason: 'not_authenticated' };\n    const description = isApproved ? (reference ? `Recarga Wompi [Ref: ${reference}]` : `Recarga Wompi (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Aprobada`) : `Recarga Wompi (${paymentMethod === 'tarjeta' ? 'Tarjeta de Crédito' : 'PSE'}) — Rechazada`;\n\n    // Idempotencia: Verificar si el Webhook ya insertó esta transacción por referencia\n    if (reference && isApproved) {\n        const { data: existingTx } = await client\n            .from('wallet_transactions')\n            .select('id')\n            .eq('description', description)\n            .single();\n\n        if (existingTx) {\n            const { data: profile } = await client\n                .from('profiles')\n                .select('wallet_balance')\n                .eq('id', user.id)\n                .single();\n\n            return {\n                success: true,\n                newBalance: profile?.wallet_balance || 0,\n                transactionId: existingTx.id,\n            };\n        }\n    }\n\n    // Insert transaction — the DB trigger only credits wallet if NOT rejected\n    const { data, error } = await client\n        .from('wallet_transactions')\n        .insert({\n            user_id: user.id,\n            amount: isApproved ? amount : 0,\n            type: 'simulation_recharge',\n            description,\n            wallet_type: 'dinero',\n            payment_method: paymentMethod,\n            simulation_status: simulationStatus,\n        })\n        .select('id')\n        .single();\n\n    if (error) {\n        console.error('Error inserting recharge transaction:', error);\n        return { success: false, reason: error.message };\n    }\n\n    if (!isApproved) {\n        return { success: false, reason: 'simulated_rejected', transactionId: data?.id };\n    }\n\n    // Read updated balance to return it\n    const { data: profile } = await client\n        .from('profiles')\n        .select('wallet_balance')\n        .eq('id', user.id)\n        .single();\n\n    return {\n        success: true,\n        newBalance: profile?.wallet_balance || 0,\n        transactionId: data?.id,\n    };\n}\n\n/**\n * Helper to register a wallet request in Supabase with optional RPC fallback.\n */\nasync function recordWalletRequestInDB({ userId, userName, requestType, paymentMethod, reference, amount, walletType, bankName, notes, rpcName = null, rpcArgs = null }) {\n    const client = getClient();\n    if (rpcName && rpcArgs) {\n        try {\n            const { data, error } = await client.rpc(rpcName, rpcArgs);\n            if (!error && data?.success) {\n                return { success: true, requestId: data.request_id, reference: data.reference || reference, status: 'pending' };\n            }\n        } catch (e) {\n            console.warn(`RPC ${rpcName} exception:`, e);\n        }\n    }\n\n    const { data, error } = await client\n        .from('wallet_requests')\n        .insert({\n            user_id: userId,\n            user_name: userName,\n            request_type: requestType,\n            payment_method: paymentMethod,\n            reference,\n            amount: amount || 0,\n            status: 'pending',\n            wallet_type: walletType || 'dinero',\n            bank_name: bankName,\n            notes,\n        })\n        .select('id, reference, status')\n        .single();\n\n    if (error) {\n        console.error('Error registrando solicitud en wallet_requests:', error);\n        return { success: false, reason: error.message };\n    }\n\n    return {\n        success: true,\n        requestId: data?.id,\n        reference: data?.reference || reference,\n        status: data?.status || 'pending',\n    };\n}\n\n/** Registrar una solicitud de recarga por Bre-B (Semi-automática). */\nexport async function requestBreBRecharge({ amount, reference, breBKey = '@piggygranjamoral', mockState = null }) {\n    if (isUsingMockData()) {\n        initMockState();\n        return { success: true, requestId: `req-breb-${Date.now()}`, reference, status: 'pending' };\n    }\n    const client = getClient();\n    if (!client) return { success: false, reason: 'no_supabase_client' };\n    const { data: authData } = await client.auth.getUser().catch(() => ({ data: {} }));\n    const profile = AppState.get('profile') || AppState.get('currentUser');\n    const userId = authData?.user?.id || profile?.id;\n    if (!userId) return { success: false, reason: 'not_authenticated' };\n\n    return recordWalletRequestInDB({\n        userId,\n        userName: profile?.full_name || 'Usuario',\n        requestType: 'recharge',\n        paymentMethod: 'BRE_B',\n        reference,\n        amount,\n        walletType: 'dinero',\n        bankName: 'Bancolombia',\n        notes: `Llave Bre-B: ${breBKey}`,\n        rpcName: 'create_recharge_request',\n        rpcArgs: { p_user_id: userId, p_amount: amount, p_payment_method: 'BRE_B', p_reference: reference, p_notes: `Llave Bre-B: ${breBKey}` }\n    });\n}\n\n/** Registrar una solicitud de recarga por Código QR. */\nexport async function requestQRRecharge({ amount, reference, mockState = null }) {\n    if (isUsingMockData()) {\n        initMockState();\n        return { success: true, requestId: `req-qr-${Date.now()}`, reference, status: 'pending' };\n    }\n    const client = getClient();\n    if (!client) return { success: false, reason: 'no_supabase_client' };\n    const { data: authData } = await client.auth.getUser().catch(() => ({ data: {} }));\n    const profile = AppState.get('profile') || AppState.get('currentUser');\n    const userId = authData?.user?.id || profile?.id;\n    if (!userId) return { success: false, reason: 'not_authenticated' };\n\n    return recordWalletRequestInDB({\n        userId,\n        userName: profile?.full_name || 'Usuario',\n        requestType: 'recharge',\n        paymentMethod: 'QR_CODE',\n        reference,\n        amount,\n        walletType: 'dinero',\n        bankName: 'Bancolombia',\n        notes: 'Código QR Bancolombia',\n        rpcName: 'create_recharge_request',\n        rpcArgs: { p_user_id: userId, p_amount: amount, p_payment_method: 'QR_CODE', p_reference: reference, p_notes: 'Código QR Bancolombia' }\n    });\n}\n\n/** Registrar una solicitud de canje por carne (Bonos de Consumo). */\nexport async function requestMeatRedemption({ amount, reference }) {\n    if (isUsingMockData()) return { success: true, requestId: `req-crn-${Date.now()}`, reference, status: 'pending' };\n    const client = getClient();\n    if (!client) return { success: false, reason: 'no_supabase_client' };\n    const { data: authData } = await client.auth.getUser().catch(() => ({ data: {} }));\n    const profile = AppState.get('profile') || AppState.get('currentUser');\n    const userId = authData?.user?.id || profile?.id;\n    if (!userId) return { success: false, reason: 'not_authenticated' };\n\n    return recordWalletRequestInDB({\n        userId,\n        userName: profile?.full_name || 'Usuario',\n        requestType: 'consumption',\n        paymentMethod: 'BONO',\n        reference,\n        amount,\n        walletType: 'bono_consumo',\n        notes: 'Canje de bonos por productos de carne',\n    });\n}\n\n/* ─── Bank Withdrawal with Immediate Retention (Fintech Standard) ─── */\n\n/** Request a bank withdrawal with immediate balance retention. */\nexport async function requestBankWithdrawal({ amount, bankName = '', accountType = '', breveKey = '', notes = '' }) {\n    const numAmount = Number(amount) || 0;\n    if (numAmount <= 0) return { success: false, reason: 'El monto a retirar debe ser mayor a cero' };\n    const refCode = `RET-${Math.floor(100000 + Math.random() * 900000)}`;\n\n    if (isUsingMockData()) {\n        initMockState();\n        if (mockBalance < numAmount) return { success: false, reason: 'Saldo insuficiente en tu Cuenta Agro' };\n\n        mockBalance -= numAmount;\n        localStorage.setItem('mock_wallet_balance', mockBalance.toString());\n\n        const debitTx = {\n            id: `tx-ret-${Date.now()}`,\n            user_id: 'mock-user-id',\n            amount: -numAmount,\n            type: 'debit',\n            description: `Retención por solicitud de retiro bancario (${bankName || 'Bancario'}) [Ref: ${refCode}]`,\n            wallet_type: 'dinero',\n            payment_method: 'BRE_B',\n            simulation_status: 'APPROVED',\n            created_at: new Date().toISOString(),\n        };\n\n        if (!mockTransactions) mockTransactions = [];\n        mockTransactions.unshift(debitTx);\n        localStorage.setItem('mock_wallet_transactions', JSON.stringify(mockTransactions));\n\n        const curProfile = AppState.get('profile') || { ...MOCK_PROFILE };\n        curProfile.wallet_balance = mockBalance;\n        AppState.set({ profile: { ...curProfile } });\n        return { success: true, requestId: `req-ret-${Date.now()}`, reference: refCode, newBalance: mockBalance };\n    }\n\n    const client = getClient();\n    if (!client) return { success: false, reason: 'no_supabase_client' };\n\n    let userId = null;\n    try {\n        const { data: authData } = await client.auth.getUser();\n        userId = authData?.user?.id;\n    } catch (e) {\n        console.warn('No se pudo obtener usuario de auth.getUser:', e);\n    }\n    if (!userId) {\n        const profile = AppState.get('profile') || AppState.get('currentUser');\n        userId = profile?.id;\n    }\n    if (!userId) return { success: false, reason: 'No se encontró una sesión de usuario activa' };\n\n    // 1. Validación de Saldo Disponible en DB\n    const { data: profile, error: profileErr } = await client\n        .from('profiles')\n        .select('id, wallet_balance, full_name, bank_name, bank_account_type, bank_breve_key')\n        .eq('id', userId)\n        .single();\n\n    if (profileErr || !profile) {\n        console.error('Error consultando perfil:', profileErr);\n        return { success: false, reason: 'No se pudo verificar el saldo disponible en tu cuenta' };\n    }\n\n    const currentBalance = Number(profile.wallet_balance) || 0;\n    if (currentBalance < numAmount) return { success: false, reason: 'Saldo insuficiente para realizar este retiro' };\n\n    const effectiveBank = bankName || profile.bank_name || 'Bancario';\n    const effectiveAccountType = accountType || profile.bank_account_type || 'Cuenta de Ahorros';\n    const effectiveBreveKey = breveKey || profile.bank_breve_key || '';\n    const bankDetailsStr = [effectiveBank, effectiveAccountType, effectiveBreveKey ? `Llave Bre-B: ${effectiveBreveKey}` : ''].filter(Boolean).join(' - ');\n    const userName = profile.full_name || 'Usuario';\n    const finalNotes = notes || `Retiro bancario a cuenta ${bankDetailsStr}`;\n    const txDescription = `Retención por solicitud de retiro bancario (${effectiveBank}) [Ref: ${refCode}]`;\n    const newBalance = Math.max(0, currentBalance - numAmount);\n\n    // 2. Insertar en wallet_requests para que quede registrada la solicitud de retiro\n    let requestId = `req-ret-${Date.now()}`;\n    const { data: reqData, error: reqError } = await client\n        .from('wallet_requests')\n        .insert({\n            user_id: userId,\n            user_name: userName,\n            request_type: 'withdrawal',\n            payment_method: 'BRE_B',\n            amount: numAmount,\n            bank_name: bankDetailsStr,\n            reference: refCode,\n            wallet_type: 'dinero',\n            status: 'pending',\n            notes: finalNotes,\n            created_at: new Date().toISOString(),\n        })\n        .select('id, reference, status')\n        .single();\n\n    if (reqError) {\n        console.error('Error registrando en wallet_requests:', reqError);\n        return { success: false, reason: 'Error al registrar solicitud: ' + reqError.message };\n    }\n\n    if (reqData?.id) {\n        requestId = reqData.id;\n    }\n\n    // 3. Registro Contable de Retención en wallet_transactions (-numAmount)\n    // Con simulation_status: 'APPROVED', el trigger handle_canonical_wallet_ledger debita automáticamente profiles.wallet_balance\n    const { data: txData, error: txError } = await client\n        .from('wallet_transactions')\n        .insert({\n            user_id: userId,\n            amount: -numAmount,\n            type: 'debit',\n            description: txDescription,\n            wallet_type: 'dinero',\n            payment_method: 'TRANSFERENCIA',\n            simulation_status: 'APPROVED',\n            created_at: new Date().toISOString(),\n        })\n        .select('id')\n        .single();\n\n    if (txError) {\n        console.warn('Advertencia insertando transacción contable:', txError);\n    }\n\n    // 4. Actualizar AppState en tiempo real\n    const currentAppStateProfile = AppState.get('profile') || {};\n    AppState.set({\n        profile: {\n            ...currentAppStateProfile,\n            ...profile,\n            wallet_balance: newBalance,\n        }\n    });\n\n    return { success: true, requestId, reference: refCode, newBalance };\n}\n\n/* ─── Create Wallet Request (Backwards-Compatible Wrapper) ─── */\n\n/** Submit a withdrawal or consumption request. */\nexport async function createWalletRequest(requestType, amount, bankName = null) {\n    if (requestType === 'withdrawal') return requestBankWithdrawal({ amount, bankName });\n    if (isUsingMockData()) return { success: true, requestId: 'mock-req-id' };\n\n    const client = getClient();\n    const { data: { user } } = await client.auth.getUser();\n    if (!user) return { success: false, reason: 'not_authenticated' };\n\n    const profile = AppState.get('profile') || AppState.get('currentUser');\n    const userName = profile?.full_name || 'Usuario';\n\n    try {\n        const { data: insData, error: insError } = await client\n            .from('wallet_requests')\n            .insert({\n                user_id: user.id,\n                user_name: userName,\n                request_type: requestType,\n                amount: amount,\n                bank_name: bankName,\n                status: 'pending',\n                wallet_type: 'bono_consumo'\n            })\n            .select('id')\n            .single();\n\n        if (insError) return { success: false, reason: insError.message };\n        return { success: true, requestId: insData?.id || null };\n    } catch (e) {\n        return { success: false, reason: e.message };\n    }\n}\n\n/* ─── WhatsApp Notification ─── */\n\n/** Build and open a WhatsApp message to notify admin about a wallet request. */\nexport function notifyAdminViaWhatsApp(requestType, amount, userName, userWhatsApp, bankName, requestId, userBreveKey = null) {\n    const typeLabel = requestType === 'withdrawal' ? '💰 RETIRO' : '🥩 CONSUMO';\n    const shortId = requestId ? String(requestId).slice(-8).toUpperCase() : 'N/A';\n    let message = `🐷 *PIGGY APP — Solicitud de ${typeLabel}*\n\n` +\n        `👤 *Usuario:* ${userName}\n` +\n        `📱 *WhatsApp:* ${userWhatsApp || 'No registrado'}\n` +\n        `💵 *Monto:* ${formatCOP(amount)}\n`;\n\n    if (requestType === 'withdrawal' && bankName) {\n        message += `🏦 *Banco:* ${bankName}\n`;\n        if (userBreveKey) message += `⚡ *Llave Bre-B:* ${userBreveKey}\n`;\n    }\n    message += `🎫 *ID Solicitud:* #${shortId}\n` +\n        `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n` +\n        (requestType === 'withdrawal' ? '⚡ Acción requerida: Transferir fondos vía Bre-B al usuario y debitar saldo en la BD.' : '⚡ Acción requerida: Coordinar entrega de productos y debitar saldo en la BD.');\n\n    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');\n}\n\nimport { getWalletTransactions, getCachedWalletTransactions } from './walletTransactionsService.js';\nexport { getWalletTransactions, getCachedWalletTransactions, formatCOP };\n