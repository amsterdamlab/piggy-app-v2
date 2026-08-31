/* ============================================
   PIGGY APP — Piggies Service
   Handles piggy lifecycle, marketplace and farm data
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import {
    MOCK_PIGGIES,
    MOCK_MARKETPLACE,
    getDaysRemaining,
    getProgressPercentage,
    calculateBaseROI,
    calculateTotalReturn,
    formatCOP,
    formatPercentage,
    simulateWeight,
    getPiggyGrowthStage,
} from './mockData.js';
import { generateContractPDF } from './contractService.js';
import { AppState } from '../state.js';
import { deductWalletBalance, getWalletBalance } from './walletService.js';

// Local storage keys for persistence in mock mode
const STORAGE_KEY_PIGGIES = 'piggy_app_user_piggies';
const STORAGE_KEY_MARKET = 'piggy_app_marketplace';

/* Helper to initialize mock data in localStorage if not present */
function getStoredMockPiggies() {
    const stored = localStorage.getItem(STORAGE_KEY_PIGGIES);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            // fallback
        }
    }
    localStorage.setItem(STORAGE_KEY_PIGGIES, JSON.stringify(MOCK_PIGGIES));
    return MOCK_PIGGIES;
}

function saveStoredMockPiggies(piggies) {
    localStorage.setItem(STORAGE_KEY_PIGGIES, JSON.stringify(piggies));
}

function getStoredMockMarket() {
    const stored = localStorage.getItem(STORAGE_KEY_MARKET);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            // fallback
        }
    }
    localStorage.setItem(STORAGE_KEY_MARKET, JSON.stringify(MOCK_MARKETPLACE));
    return MOCK_MARKETPLACE;
}

function saveStoredMockMarket(items) {
    localStorage.setItem(STORAGE_KEY_MARKET, JSON.stringify(items));
}

/**
 * Determine a stable mock category and image for a piggy based on its purchase date / stage.
 * Used when image_url is missing from Supabase rows.
 */
function resolveFallbackPiggyImage(piggy) {
    if (piggy.image_url) return piggy.image_url;

    const progress = getProgressPercentage(piggy.purchase_date, piggy.end_date);
    const stageInfo = getPiggyGrowthStage(progress, piggy.name || 'Tu Piggy');
    return stageInfo.image;
}

/**
 * Determine display category for a piggy.
 * Maps category field or falls back to 'estandar'.
 */
function resolvePiggyCategory(piggy) {
    if (piggy.category) return piggy.category;
    const bonus = parseFloat(piggy.extra_roi_bonus) || 0;
    if (bonus >= 0.03) return 'premium';
    if (bonus >= 0.02) return 'dorado';
    if (bonus >= 0.01) return 'plus';
    return 'estandar';
}

/**
 * Get category human-readable display info.
 */
export function getCategoryBadge(category) {
    const cat = (category || 'estandar').toLowerCase();
    switch (cat) {
        case 'premium':
            return { label: 'Piggy Premium', color: '#8b5cf6', bonusText: '+3% Extra', icon: '👑' };
        case 'dorado':
            return { label: 'Piggy Dorado', color: '#f59e0b', bonusText: '+2% Extra', icon: '⭐' };
        case 'plus':
            return { label: 'Piggy Plus', color: '#3b82f6', bonusText: '+1% Extra', icon: '⚡' };
        default:
            return { label: 'Piggy Estándar', color: '#10b981', bonusText: 'Base', icon: '🌱' };
    }
}

/**
 * Enriches raw piggy data with calculated fields:
 * - daysLeft, progress, currentWeight, growthStage
 * - totalReturn, returnGain, formatted values
 * - fallback image and category
 */
export function enrichPiggyData(piggy, piggyCount = 1) {
    const daysLeft = getDaysRemaining(piggy.end_date);
    const progress = getProgressPercentage(piggy.purchase_date, piggy.end_date);
    const isComplete = progress >= 100 || piggy.status === 'completado' || daysLeft === 0;

    // Use current_weight from DB if available, otherwise simulate based on 10 stages
    const currentWeight = (piggy.current_weight !== null && piggy.current_weight !== undefined)
        ? parseFloat(piggy.current_weight)
        : simulateWeight(progress);

    const growthStage = getPiggyGrowthStage(progress, piggy.name || 'Tu Piggy');
    const category = resolvePiggyCategory(piggy);
    const categoryBadge = getCategoryBadge(category);
    const imageUrl = resolveFallbackPiggyImage(piggy);

    // Financial calculations
    const investment = parseFloat(piggy.investment_amount) || 0;
    const baseROI = calculateBaseROI(piggyCount);
    const extraROI = parseFloat(piggy.extra_roi_bonus) || 0;
    const totalROI = baseROI + extraROI;
    const totalReturn = calculateTotalReturn(investment, baseROI, extraROI);
    const returnGain = totalReturn - investment;

    // Final return amount (from DB if completed, or calculated)
    const finalReturn = piggy.final_return_amount
        ? parseFloat(piggy.final_return_amount)
        : totalReturn;

    return {
        ...piggy,
        category,
        categoryBadge,
        image_url: imageUrl,
        daysLeft,
        progress,
        isComplete,
        currentWeight: Math.round(currentWeight * 10) / 10,
        growthStage,
        baseROI,
        baseROIPercent: formatPercentage(baseROI),
        extraROI,
        extraROIPercent: formatPercentage(extraROI),
        totalROI,
        totalROIPercent: formatPercentage(totalROI),
        investmentFormatted: formatCOP(investment),
        totalReturn,
        totalReturnFormatted: formatCOP(totalReturn),
        returnGain,
        returnGainFormatted: formatCOP(returnGain),
        finalReturnFormatted: formatCOP(finalReturn),
        // Fallback contract code
        contractCodeDisplay: piggy.contract_code || `#PGY-${(piggy.id || '000').slice(-6).toUpperCase()}`,
        // Contract URL from Supabase storage or null
        contractUrl: piggy.contract_url || null,
    };
}

/**
 * Fetch all piggies belonging to the current authenticated user.
 * Returns an array of enriched piggy objects.
 */
export async function getUserPiggies() {
    if (isUsingMockData()) {
        const mockList = getStoredMockPiggies();
        const activeCount = mockList.filter((p) => p.status === 'engorde').length;
        return mockList.map((p) => enrichPiggyData(p, activeCount));
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) return [];

    const { data, error } = await client
        .from('piggies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('🐷 Error fetching user piggies:', error.message);
        return [];
    }

    const activeCount = (data || []).filter((p) => p.status === 'engorde').length;
    return (data || []).map((p) => enrichPiggyData(p, activeCount));
}

/**
 * Fetch marketplace items with available stock.
 */
export async function getMarketplaceItems() {
    if (isUsingMockData()) {
        const items = getStoredMockMarket();
        return items.filter((item) => item.stock > 0);
    }

    const client = getClient();
    const { data, error } = await client
        .from('marketplace')
        .select('*')
        .gt('stock', 0)
        .order('price', { ascending: true });

    if (error) {
        console.error('🐷 Error fetching marketplace items:', error.message);
        return [];
    }

    return data || [];
}

/**
 * Generate a randomized pig name.
 */
const PIGGY_NAMES = [
    'Pochito', 'Luna', 'Rocky', 'Bacon', 'Pepito',
    'Trompita', 'Rosita', 'Manchas', 'Gordo', 'Copito',
    'Chanchito', 'Canela', 'Titan', 'Simba', 'Lola',
    'Pumba', 'Bruno', 'Maya', 'Toby', 'Milo'
];

export function getRandomPiggyName() {
    return PIGGY_NAMES[Math.floor(Math.random() * PIGGY_NAMES.length)];
}

/**
 * Assign a default local image asset based on the item category.
 */
function getDefaultImageForCategory(category) {
    const cat = (category || 'estandar').toLowerCase();
    switch (cat) {
        case 'premium': return 'assets/piggies/stage3/et3-1.jpg';
        case 'dorado': return 'assets/piggies/stage2/et2-3.jpg';
        case 'plus': return 'assets/piggies/stage1/et1-4.jpg';
        default: return 'assets/piggies/stage1/et1-1.jpg';
    }
}

/**
 * Helper to upload contract PDF to Supabase Storage.
 * Path format: /contratos/{user_id}/contrato_{timestamp}_{tx_code}.pdf
 */
async function uploadContractToStorage(client, userId, pdfBlob, txCode) {
    try {
        const timestamp = Date.now();
        const safeCode = (txCode || 'TX').replace(/[^a-zA-Z0-9_-]/g, '');
        const filePath = `contratos/${userId}/contrato_${timestamp}_${safeCode}.pdf`;

        const { data, error } = await client.storage
            .from('contracts')
            .upload(filePath, pdfBlob, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (error) {
            console.warn('⚠️ Could not upload contract PDF to Storage:', error.message);
            return null;
        }

        // Get public URL
        const { data: urlData } = client.storage
            .from('contracts')
            .getPublicUrl(filePath);

        return urlData?.publicUrl || null;
    } catch (e) {
        console.warn('⚠️ Exception uploading contract to Storage:', e);
        return null;
    }
}

/**
 * Buy a piggy from the marketplace.
 * The current_month of the item determines how many days remain in the cycle.
 */
export async function buyPiggy(marketplaceItemId, options = {}) {
    const piggyName = options.customName || getRandomPiggyName();
    const NOW_MS = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const TOTAL_CYCLE_DAYS = 144;

    if (isUsingMockData()) {
        const market = getStoredMockMarket();
        const itemIndex = market.findIndex((i) => i.id === marketplaceItemId);

        if (itemIndex === -1) {
            return { piggy: null, error: 'Piggy no encontrado en el mercado' };
        }

        const item = market[itemIndex];
        if (item.stock <= 0) {
            return { piggy: null, error: 'No hay unidades disponibles de este Piggy' };
        }

        // Verify balance if paying with SALDO_AGRO
        if (options.paymentMethod === 'SALDO_AGRO') {
            const currentBal = await getWalletBalance();
            if (currentBal < item.price) {
                return { piggy: null, error: 'Saldo insuficiente en tu Cuenta Agro para completar la compra' };
            }
            await deductWalletBalance(item.price, `Débito: compra de Piggy "${piggyName}"`);
        }

        // Calculate cycle duration based on item current_month
        const currentMonth = item.current_month || 1;
        const elapsedDays = Math.round(((currentMonth - 1) / 5) * TOTAL_CYCLE_DAYS);
        const remainingDays = TOTAL_CYCLE_DAYS - elapsedDays;

        const purchaseDate = new Date(NOW_MS - elapsedDays * DAY_MS).toISOString();
        const endDate = new Date(NOW_MS + remainingDays * DAY_MS).toISOString();
        const initialWeight = simulateWeight(Math.round((elapsedDays / TOTAL_CYCLE_DAYS) * 100));

        // Generate contract code
        const txCode = `PGY-TX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Decrement stock
        market[itemIndex].stock -= 1;
        saveStoredMockMarket(market);

        const newPiggy = {
            id: `pig-${Date.now()}`,
            user_id: 'user-001',
            status: 'engorde',
            purchase_date: purchaseDate,
            end_date: endDate,
            investment_amount: item.price,
            extra_roi_bonus: item.extra_roi || 0,
            current_weight: Math.round(initialWeight * 10) / 10,
            created_at: new Date().toISOString(),
            name: piggyName,
            category: item.category || 'estandar',
            image_url: item.image_url || getDefaultImageForCategory(item.category),
            contract_code: txCode,
            contract_url: null,
        };

        const existingPiggies = getStoredMockPiggies();
        const updatedPiggies = [newPiggy, ...existingPiggies];
        saveStoredMockPiggies(updatedPiggies);

        return { piggy: enrichPiggyData(newPiggy, updatedPiggies.length), error: null };
    }

    const client = getClient();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        return { piggy: null, error: 'Debes iniciar sesión para comprar un Piggy' };
    }

    // 1. Fetch item from marketplace table
    const { data: item, error: itemError } = await client
        .from('marketplace')
        .select('*')
        .eq('id', marketplaceItemId)
        .single();

    if (itemError || !item) {
        return { piggy: null, error: 'Piggy no encontrado en el mercado' };
    }

    if (item.stock <= 0) {
        return { piggy: null, error: 'No hay unidades disponibles de este Piggy' };
    }

    // 2. Pre-verify balance if paying with SALDO_AGRO
    if (options.paymentMethod === 'SALDO_AGRO') {
        const currentBal = await getWalletBalance();
        if (currentBal < item.price) {
            return { piggy: null, error: 'Saldo insuficiente en tu Cuenta Agro para completar la compra' };
        }
    }

    // 3. Calculate dates based on current_month
    const currentMonth = item.current_month || 1;
    const elapsedDays = Math.round(((currentMonth - 1) / 5) * TOTAL_CYCLE_DAYS);
    const remainingDays = TOTAL_CYCLE_DAYS - elapsedDays;

    const purchaseDate = new Date(NOW_MS - elapsedDays * DAY_MS).toISOString();
    const endDate = new Date(NOW_MS + remainingDays * DAY_MS).toISOString();
    const initialWeight = simulateWeight(Math.round((elapsedDays / TOTAL_CYCLE_DAYS) * 100));

    // 4. Generate transaction / contract code
    const txCode = `PGY-TX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 5. Build PDF Contract with buyer info
    let contractUrl = null;
    try {
        const profile = AppState.get('profile') || {};
        const pdfBlob = await generateContractPDF({
            piggyName,
            category: item.category || 'estandar',
            categoryName: (item.item_name || 'Piggy').replace(/^Piggy\s*/i, ''),
            investmentAmount: item.price,
            baseROI: 0.12,
            extraROI: item.extra_roi || 0,
            transactionCode: txCode,
            contractCode: txCode,
            buyerName: profile.full_name || options.fullName || user.user_metadata?.full_name || 'Inversionista Piggy',
            buyerEmail: user.email || '',
            buyerPhone: profile.whatsapp || options.whatsapp || user.user_metadata?.whatsapp || '',
            purchaseDate: new Date(),
            endDate: new Date(endDate),
            currentWeight: initialWeight,
            estimatedReturn: item.price * (1 + 0.12 + (item.extra_roi || 0)),
        });

        if (pdfBlob) {
            contractUrl = await uploadContractToStorage(client, user.id, pdfBlob, txCode);
        }
    } catch (contractErr) {
        console.warn('⚠️ Could not generate contract PDF before insert:', contractErr);
    }

    // 6. Insert piggy record with contract_url and category
    const imageUrl = item.image_url || getDefaultImageForCategory(item.category);
    const { data: newPiggy, error: insertError } = await client
        .from('piggies')
        .insert({
            user_id: user.id,
            status: 'engorde',
            purchase_date: purchaseDate,
            end_date: endDate,
            investment_amount: item.price,
            extra_roi_bonus: item.extra_roi || 0,
            current_weight: Math.round(initialWeight * 10) / 10,
            name: piggyName,
            category: item.category || 'estandar',
            image_url: imageUrl,
            contract_code: txCode,
            contract_url: contractUrl,
        })
        .select()
        .single();

    if (insertError) {
        console.error('🐷 Error creating piggy:', insertError.message);
        return { piggy: null, error: insertError.message };
    }

    // 7. Atomically deduct wallet balance if paying with SALDO_AGRO
    if (options.paymentMethod === 'SALDO_AGRO') {
        const deductResult = await deductWalletBalance(item.price, `Débito: compra de Piggy "${piggyName}"`);
        if (!deductResult.success) {
            console.warn('⚠️ Warning: Wallet deduction returned non-success:', deductResult.reason);
        }
    }

    // 8. Decrement marketplace stock
    await client
        .from('marketplace')
        .update({ stock: Math.max(0, item.stock - 1) })
        .eq('id', marketplaceItemId);

    return { piggy: enrichPiggyData(newPiggy), error: null };
}

/**
 * Calculate dashboard summary statistics from an array of piggies.
 */
export function getDashboardStats(piggies = []) {
    const validPiggies = (piggies || []).filter(Boolean);
    const activePiggies = validPiggies.filter((p) => p.status === 'engorde' || (!p.isComplete && p.status !== 'completado' && p.status !== 'liquidado'));
    const availablePiggies = validPiggies.filter((p) => p.status === 'completado' || p.isComplete || p.status === 'liquidado');

    const piggyCount = activePiggies.length;
    const baseROI = calculateBaseROI(piggyCount);

    // 1. Adquisición Bonos de Preventa (Active Investment)
    const adquisicionBonos = activePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount || p.price || p.amount) || 0;
        return sum + inv;
    }, 0);

    // 2. Diferencial de Preventa (Projected Gain for Active)
    const diferencialPreventa = activePiggies.reduce((sum, p) => {
        const inv = parseFloat(p.investment_amount || p.price || p.amount) || 0;
        const extraRoi = parseFloat(p.extra_roi_bonus || p.extra_roi) || 0;
        const totalReturn = calculateTotalReturn(inv, baseROI, extraRoi);
        const gain = totalReturn - inv;
        return sum + (isNaN(gain) ? 0 : Math.max(0, gain));
    }, 0);

    // 3. Disponible (Finished Cycles Total Value)
    const disponible = availablePiggies.reduce((sum, p) => {
        if (p.final_return_amount && !isNaN(p.final_return_amount)) {
            return sum + parseFloat(p.final_return_amount);
        }
        const inv = parseFloat(p.investment_amount || p.price || p.amount) || 0;
        const extraRoi = parseFloat(p.extra_roi_bonus || p.extra_roi) || 0;
        const totalReturn = calculateTotalReturn(inv, baseROI, extraRoi);
        return sum + (isNaN(totalReturn) ? 0 : totalReturn);
    }, 0);

    // 4. Ciclo de cierre cercano (Min days left) & Progress
    let nextCloseDays = null;
    let nextCloseProgress = 0;

    if (activePiggies.length > 0) {
        const closestPiggy = activePiggies.reduce((prev, curr) =>
            ((prev.daysLeft ?? 144) < (curr.daysLeft ?? 144)) ? prev : curr
        );
        nextCloseDays = closestPiggy.daysLeft ?? 144;
        nextCloseProgress = closestPiggy.progress ?? 0;
    }

    return {
        totalPiggies: validPiggies.length,
        activeCount: piggyCount,
        finishedCount: availablePiggies.length,
        adquisicionBonos,
        adquisicionBonosFormatted: formatCOP(adquisicionBonos),
        diferencialPreventa,
        diferencialPreventaFormatted: formatCOP(diferencialPreventa),
        disponible,
        disponibleFormatted: formatCOP(disponible),
        nextCloseDays,
        nextCloseProgress,
        baseROI,
        baseROIFormatted: formatPercentage(baseROI),
        margenComercialFormatted: formatCOP(diferencialPreventa),
        pagoFinalFormatted: formatCOP(adquisicionBonos + diferencialPreventa),
    };
}
