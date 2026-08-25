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
 * Fetch the current user's consumption bonus balance (previously just referral commission).
 * These are NOT withdrawable cash — they are exchanged for meat-consumption coupons.
 * Updated automatically by triggers (e.g. Welcome Bonus) or manually by admin.
 * @returns {number} Consumption bonus balance in COP
 */
export async function getReferralBonusBalance() {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || MOCK_PROFILE;
        return profile?.referral_balance !== undefined ? profile.referral_balance : 20000;
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
 * Ensures the welcome bonus ($20.000) is assigned to the user's referral_balance in DB if not set yet.
 */
export async function ensureWelcomeBonusAssigned(userId) {
    if (isUsingMockData()) {
        const profile = AppState.get('profile') || { ...MOCK_PROFILE };
        if (profile && !profile.referral_balance) {
            profile.referral_balance = 20000;
            AppState.set({ profile: { ...profile } });
        }
        return 20000;
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
                amount: 20000,
                type: 'credit',
                description: 'Bono de Bienvenida ($20.000 en Tienda)',
                wallet_type: 'consumo'
            });

        if (!error) {
            console.log('🎁 Welcome consumption bonus ($20.000) assigned via transaction in DB!');
            const currentProfile = AppState.get('profile');
            if (currentProfile && currentProfile.id === targetUserId) {
                AppState.set({ profile: { ...currentProfile, referral_balance: 20000 } });
            }
            return 20000;
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
            .maybeSingle();

        if (existingTx) {
            console.log('ℹ️ Transacción de recarga ya registrada previamente (Idempotencia).');
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

    // Insertar en wallet_transactions (el trigger update_wallet_balance_on_transaction actualiza profiles.wallet_balance)
    const { data: txData, error: txError } = await client
        .from('wallet_transactions')
        .insert({
            user_id: user.id,
            amount: isApproved ? amount : 0,
            type: 'recharge',
            description,
            wallet_type: 'dinero',
        })
        .select('id')
        .single();

    if (txError) {
        console.error('Error inserting recharge transaction:', txError);
        return { success: false, reason: txError.message };
    }

    // Consultar el saldo actualizado en profiles
    const { data: updatedProfile, error: profileError } = await client
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.warn('Could not read updated balance from profiles:', profileError);
    }

    const newBalance = updatedProfile?.wallet_balance ?? 0;

    // Sincronizar en AppState
    const currentAppStateProfile = AppState.get('profile') || {};
    AppState.set({
        profile: { ...currentAppStateProfile, wallet_balance: newBalance }
    });

    return {
        success: isApproved,
        newBalance,
        transactionId: txData?.id,
        reason: isApproved ? null : 'simulated_rejected',
    };
}

/* ─── Manual Bank Recharge Requests (Bre-B & QR) ─── */

/**
 * Register a Bre-B recharge request in wallet_requests and upload voucher to storage.
 * @param {number} amount - Amount in COP
 * @param {string} senderPhone - User's Bre-B / Daviplata phone number
 * @param {File} voucherFile - Uploaded payment receipt image
 * @returns {Promise<{ success: boolean, requestId?: string, reason?: string }>}
 */
export async function submitBreveRechargeRequest(amount, senderPhone, voucherFile) {
    if (isUsingMockData()) {
        const mockReq = {
            id: `mock-breve-${Date.now()}`,
            amount,
            notes: `Recarga Bre-B desde teléfono: ${senderPhone}`,
            voucher_url: 'https://via.placeholder.com/400x600?text=Comprobante+Bre-B',
            created_at: new Date().toISOString()
        };
        return { success: true, requestId: mockReq.id };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userName = profile?.full_name || 'Usuario';

    let voucherUrl = null;

    // 1. Subir comprobante a bucket 'comprobantes'
    if (voucherFile) {
        try {
            const fileExt = voucherFile.name.split('.').pop();
            const fileName = `breve_${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `recharges/${fileName}`;

            const { error: uploadError } = await client.storage
                .from('comprobantes')
                .upload(filePath, voucherFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.warn('No se pudo subir el archivo al storage bucket comprobantes:', uploadError);
            } else {
                const { data: { publicUrl } } = client.storage
                    .from('comprobantes')
                    .getPublicUrl(filePath);
                voucherUrl = publicUrl;
            }
        } catch (storageEx) {
            console.warn('Excepción al subir comprobante:', storageEx);
        }
    }

    // 2. Registrar en wallet_requests con user_name
    const { data, error } = await client
        .from('wallet_requests')
        .insert({
            user_id: user.id,
            user_name: userName,
            request_type: 'recharge',
            amount: amount,
            status: 'pending',
            wallet_type: 'dinero',
            bank_name: 'Bre-B',
            notes: `Teléfono origen: ${senderPhone || 'No especificado'}${voucherUrl ? ` | Comprobante: ${voucherUrl}` : ''}`
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error registrando solicitud Bre-B en wallet_requests:', error);
        return { success: false, reason: error.message };
    }

    return {
        success: true,
        requestId: data?.id,
        voucherUrl
    };
}

/**
 * Register a QR Bancolombia recharge request in wallet_requests and upload voucher.
 * @param {number} amount - Amount in COP
 * @param {string} senderAccount - Bancolombia sender account/reference info
 * @param {File} voucherFile - Uploaded payment receipt image
 * @returns {Promise<{ success: boolean, requestId?: string, reason?: string }>}
 */
export async function submitQRRechargeRequest(amount, senderAccount, voucherFile) {
    if (isUsingMockData()) {
        const mockReq = {
            id: `mock-qr-${Date.now()}`,
            amount,
            notes: `Recarga QR Bancolombia desde cuenta: ${senderAccount}`,
            voucher_url: 'https://via.placeholder.com/400x600?text=Comprobante+QR+Bancolombia',
            created_at: new Date().toISOString()
        };
        return { success: true, requestId: mockReq.id };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userName = profile?.full_name || 'Usuario';

    let voucherUrl = null;

    // 1. Subir comprobante a bucket 'comprobantes'
    if (voucherFile) {
        try {
            const fileExt = voucherFile.name.split('.').pop();
            const fileName = `qr_${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `recharges/${fileName}`;

            const { error: uploadError } = await client.storage
                .from('comprobantes')
                .upload(filePath, voucherFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.warn('No se pudo subir el comprobante QR al bucket:', uploadError);
            } else {
                const { data: { publicUrl } } = client.storage
                    .from('comprobantes')
                    .getPublicUrl(filePath);
                voucherUrl = publicUrl;
            }
        } catch (storageEx) {
            console.warn('Excepción al subir comprobante QR:', storageEx);
        }
    }

    // 2. Registrar en wallet_requests con user_name
    const { data, error } = await client
        .from('wallet_requests')
        .insert({
            user_id: user.id,
            user_name: userName,
            request_type: 'recharge',
            amount: amount,
            status: 'pending',
            wallet_type: 'dinero',
            bank_name: 'Bancolombia QR',
            notes: `Cuenta/Referencia origen: ${senderAccount || 'No especificada'}${voucherUrl ? ` | Comprobante: ${voucherUrl}` : ''}`
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error registrando solicitud QR en wallet_requests:', error);
        return { success: false, reason: error.message };
    }

    return {
        success: true,
        requestId: data?.id,
        voucherUrl
    };
}

/**
 * Notificar solicitud de recarga manual (Bre-B / QR) a WhatsApp de administración con enlace al comprobante
 */
export function notifyRechargeViaWhatsApp(method, amount, userName, userPhone, senderInfo, voucherUrl, requestId) {
    const isBreve = method === 'breve';
    const methodLabel = isBreve ? '⚡ Llave Bre-B (Daviplata / Bancolombia / Nequi)' : '📱 QR Bancolombia';
    const shortId = requestId ? requestId.slice(-8).toUpperCase() : 'N/A';

    let message = `🐷 *PIGGY APP — Notificación de Recarga Manual*\n\n`;
    message += `👤 *Usuario:* ${userName}\n`;
    message += `📱 *WhatsApp:* ${userPhone || 'No registrado'}\n`;
    message += `💵 *Monto:* ${formatCOP(amount)}\n`;
    message += `🏦 *Método de Pago:* ${methodLabel}\n`;
    message += `📝 *Detalle Origen:* ${senderInfo || 'No especificado'}\n`;
    message += `🎫 *ID Solicitud:* #${shortId}\n`;
    message += `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n`;

    if (voucherUrl) {
        message += `📎 *Comprobante Adjunto:* ${voucherUrl}\n\n`;
    }

    message += `⚡ Acción requerida: Verificar abono en la cuenta bancaria y aprobar la recarga en la base de datos de Piggy App.`;

    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

/**
 * Register a QR recharge intent in wallet_requests.
 * Stores in Supabase with status 'pending' and generates a reference code.
 * @param {number} amount - Amount in COP
 * @param {string} reference - Unique reference code for tracking (e.g. 'QR-123456')
 * @returns {Promise<{ success: boolean, requestId?: string, reference?: string, status?: string, reason?: string }>}
 */
export async function createQRRechargeRequest(amount, reference) {
    if (isUsingMockData()) {
        return {
            success: true,
            requestId: `mock-qr-${Date.now()}`,
            reference: reference || `QR-${Date.now()}`,
            status: 'pending'
        };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { success: false, reason: 'not_authenticated' };

    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userName = profile?.full_name || 'Usuario';

    const { data, error } = await client
        .from('wallet_requests')
        .insert({
            user_id: user.id,
            user_name: userName,
            request_type: 'recharge',
            amount: amount,
            status: 'pending',
            wallet_type: 'dinero',
            bank_name: 'Bancolombia',
            notes: 'Código QR Bancolombia'
        })
        .select('id, reference, status')
        .single();

    if (error) {
        console.error('Error registrando solicitud QR en wallet_requests:', error);
        return { success: false, reason: error.message };
    }

    console.log('✅ Solicitud QR registrada exitosamente en wallet_requests:', data);
    return {
        success: true,
        requestId: data?.id,
        reference: data?.reference || reference,
        status: data?.status || 'pending'
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

    const profile = AppState.get('profile') || AppState.get('currentUser');
    const userName = profile?.full_name || 'Usuario';

    // 1. Intentar registrar a través de RPC
    try {
        const { data, error } = await client.rpc('create_wallet_request', {
            p_user_id: user.id,
            p_type: requestType,
            p_amount: amount,
            p_bank: bankName,
        });

        if (!error && data?.success === true) {
            return {
                success: true,
                requestId: data?.request_id || null,
            };
        }
        if (error) {
            console.warn('RPC create_wallet_request falló, intentando inserción directa:', error);
        }
    } catch (rpcErr) {
        console.warn('Excepción en RPC create_wallet_request:', rpcErr);
    }

    // 2. Inserción directa en tabla wallet_requests como respaldo seguro
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
                wallet_type: requestType === 'withdrawal' ? 'dinero' : 'bono_consumo'
            })
            .select('id')
            .single();

        if (insError) {
            console.error('Error en inserción directa de wallet_requests:', insError);
            return { success: false, reason: insError.message };
        }

        return {
            success: true,
            requestId: insData?.id || null
        };
    } catch (e) {
        return { success: false, reason: e.message };
    }
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
 * @param {string|null} userBreveKey
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
