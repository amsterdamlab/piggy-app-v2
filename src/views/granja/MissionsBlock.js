/* ============================================
   PIGGY APP — Missions Block (v2)
   Granja section module: renders the top priority
   active mission (M1-M7) as a high-visibility card,
   and coordinates modals for M5, M6, etc.
   ============================================ */

import { renderIcon } from '../../icons.js';
import { navigateTo } from '../../router.js';
import { formatCOP } from '../../services/mockData.js';
import { showSilverPiggyModal } from './SilverPiggyModal.js';
import { showFlashMissionModal } from './FlashMissionModal.js';
import { showCycleMissionModal } from './CycleMissionModal.js';
import { getActiveMissions } from '../../services/missionsService.js';
import {
    getActiveUserFlashMissions,
    getActiveCycleMissions,
} from '../../services/flashMissionsService.js';

/**
 * Render the Priority Mission Banner for Granja dashboard.
 * Priority hierarchy:
 *  1. Active Flash Mission (M8 / M9 - Gold/Advanced assigned to user)
 *  2. Completed Cycle Mission (M7 - Piggy cycle reached 100%)
 *  3. Standard pending mission with lowest sortOrder (M1 - M7)
 *  4. All completed state
 *
 * @param {Array} flashMissions - User's active flash missions from DB
 * @param {Array} cycleMissions - User's active cycle completion missions
 * @param {Array} activeMissions - Uncompleted standard missions
 * @param {number} piggyCount - Number of user piggies
 * @returns {string} HTML markup for the priority banner
 */
export function renderPriorityMissionBanner(flashMissions = [], cycleMissions = [], activeMissions = [], piggyCount = 0) {
    // ── Priority 1: Active Flash Mission (Manual Supabase campaign) ───────────
    if (flashMissions.length > 0) {
        const fm = flashMissions[0];
        return renderFlashMissionCard(fm);
    }

    // ── Priority 2: Cycle Completion Mission (Piggy finished cycle) ──────────
    if (cycleMissions.length > 0) {
        const cm = cycleMissions[0];
        return renderCycleCompletionCard(cm);
    }

    // ── Priority 3: Next Uncompleted Standard Mission (M1-M7) ────────────────
    if (activeMissions.length > 0) {
        const next = activeMissions[0];
        return renderStandardMissionCard(next);
    }

    // ── Priority 4: All Missions Completed ──────────────────────────────────
    return `
        <div class="section animate-fade-in-up" id="misiones-section" style="animation-delay: 0.25s;">
            <div class="card" style="
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 1px solid #bbf7d0; border-radius: 20px; padding: 20px; text-align: center;
            ">
                <div style="font-size: 36px; margin-bottom: 8px;">🌟</div>
                <div style="font-weight: 800; color: #166534; font-size: 1rem; margin-bottom: 4px;">
                    ¡Granja al Máximo Nivel!
                </div>
                <div style="font-size: 0.8rem; color: #15803d; line-height: 1.4;">
                    Has completado todas las misiones activas. Disfruta de tus beneficios y mantén tu producción al día.
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Flash Mission priority banner card.
 */
function renderFlashMissionCard(fm) {
    const rawType = (fm.piggy_type || 'avanzado30').toLowerCase();
    const cycleDays = fm.cycle_duration_days || 30;
    const price = parseFloat(fm.price || 1000000);

    let gradient = 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 60%, #4c1d95 100%)';
    let shadowColor = 'rgba(109,40,217,0.35)';
    let icon = '⚡';
    let badgeText = `⚡ OFERTA FLASH · ${cycleDays} DÍAS`;
    let label = fm.piggy_name || `Piggy Avanzado (${cycleDays}d)`;

    if (rawType === 'gold' || rawType === 'dorado') {
        gradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)';
        shadowColor = 'rgba(217,119,6,0.35)';
        icon = '🥇';
        badgeText = '🥇 OFERTA FLASH · DORADO';
        label = fm.piggy_name || 'Piggy Dorado Flash (+2% ROI)';
    } else if (rawType === 'plus' || rawType === 'silver') {
        gradient = 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 60%, #0369a1 100%)';
        shadowColor = 'rgba(2,132,199,0.35)';
        icon = '🌟';
        badgeText = '🌟 OFERTA FLASH · PLUS';
        label = fm.piggy_name || 'Piggy Plus Flash (+1% ROI)';
    } else if (rawType === 'premium') {
        gradient = 'linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)';
        shadowColor = 'rgba(219,39,119,0.35)';
        icon = '💎';
        badgeText = '💎 OFERTA FLASH · PREMIUM';
        label = fm.piggy_name || 'Piggy Premium Flash (+3% ROI)';
    }

    return `
        <div class="section animate-fade-in-up" id="misiones-section" style="animation-delay: 0.25s;">
            <div class="section__header">
                <h3 class="section__title">Misión Prioritaria</h3>
                <span style="font-size:0.75rem; font-weight:800; color:#7c3aed; background:#f5f3ff; padding:3px 9px; border-radius:9999px;">
                    Exclusiva
                </span>
            </div>

            <div id="btn-open-flash-mission" class="card card--interactive btn-shine-7s" style="
                background: ${gradient}; color: white; border: none; border-radius: 20px;
                padding: 18px 20px; box-shadow: 0 10px 25px -5px ${shadowColor};
                cursor: pointer; position: relative; overflow: hidden;
            ">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="
                        width: 52px; height: 52px; border-radius: 16px;
                        background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
                        display: flex; align-items: center; justify-content: center;
                        font-size: 28px; flex-shrink: 0;
                    ">
                        ${icon}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            font-size: 0.65rem; font-weight: 800; letter-spacing: 1px;
                            text-transform: uppercase; opacity: 0.9; margin-bottom: 2px;
                        ">
                            ${badgeText}
                        </div>
                        <div style="font-weight: 900; font-size: 1.05rem; line-height: 1.2; margin-bottom: 3px;">
                            ${label}
                        </div>
                        <div style="font-size: 0.78rem; opacity: 0.92;">
                            ${fm.description || `Inversión ${formatCOP(price)} · Retorno garantizado`}
                        </div>
                    </div>
                    <div style="font-size: 20px; opacity: 0.8; flex-shrink: 0;">→</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Cycle Completion priority banner card.
 */
function renderCycleCompletionCard(cm) {
    const returnAmt = parseFloat(cm.return_amount || 1115000);
    const piggyName = cm.piggy_name || 'Tu Piggy';

    return `
        <div class="section animate-fade-in-up" id="misiones-section" style="animation-delay: 0.25s;">
            <div class="section__header">
                <h3 class="section__title">Misión Prioritaria</h3>
                <span style="font-size:0.75rem; font-weight:800; color:#059669; background:#ecfdf5; padding:3px 9px; border-radius:9999px;">
                    ¡Completada!
                </span>
            </div>

            <div id="btn-open-cycle-mission" class="card card--interactive btn-shine-7s" style="
                background: linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%);
                color: white; border: none; border-radius: 20px; padding: 18px 20px;
                box-shadow: 0 10px 25px -5px rgba(16,185,129,0.4);
                cursor: pointer; position: relative; overflow: hidden;
            ">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="
                        width: 52px; height: 52px; border-radius: 16px;
                        background: rgba(255,255,255,0.22); backdrop-filter: blur(4px);
                        display: flex; align-items: center; justify-content: center;
                        font-size: 28px; flex-shrink: 0;
                    ">
                        🏆
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="
                            font-size: 0.65rem; font-weight: 800; letter-spacing: 1px;
                            text-transform: uppercase; opacity: 0.9; margin-bottom: 2px;
                        ">
                            🎉 ¡CICLO COMPLETADO!
                        </div>
                        <div style="font-weight: 900; font-size: 1.05rem; line-height: 1.2; margin-bottom: 3px;">
                            ${piggyName} alcanzó peso final
                        </div>
                        <div style="font-size: 0.78rem; opacity: 0.92;">
                            Liquidación: <strong>${formatCOP(returnAmt)}</strong> abonados a tu Cuenta Agro
                        </div>
                    </div>
                    <div style="font-size: 20px; opacity: 0.8; flex-shrink: 0;">→</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Standard Mission priority banner card.
 */
function renderStandardMissionCard(m) {
    const timerBadge = m.hasFlashTimer && m.flashRemainingHours
        ? `<span style="background:#fef2f2; color:#dc2626; font-size:0.68rem; font-weight:800; padding:2px 7px; border-radius:9999px;">⏳ ${m.flashRemainingHours}h restantes</span>`
        : '';

    return `
        <div class="section animate-fade-in-up" id="misiones-section" style="animation-delay: 0.25s;">
            <div class="section__header">
                <h3 class="section__title">Misiones de Granja</h3>
                <span style="font-size:0.75rem; font-weight:700; color:#ec4899; cursor:pointer;" id="btn-ver-todas-misiones">
                    Misión ${m.missionNumber || 1} de 7
                </span>
            </div>

            <div class="card card--interactive" id="btn-mission-cta" data-cta="${m.cta || ''}" data-key="${m.key}" style="
                background: white; border: 1px solid #fce7f3; border-radius: 20px;
                padding: 16px 18px; box-shadow: 0 4px 15px rgba(236,72,153,0.06);
                cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="
                        width: 48px; height: 48px; border-radius: 14px;
                        background: #fdf2f8; border: 1px solid #fce7f3;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 24px; flex-shrink: 0;
                    ">
                        ${m.icon || '🎯'}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                            <span style="font-size:0.68rem; font-weight:800; color:#ec4899; text-transform:uppercase; letter-spacing:0.5px;">
                                Misión ${m.missionNumber || 1}
                            </span>
                            ${timerBadge}
                        </div>
                        <div style="font-weight: 800; font-size: 0.98rem; color: #0f172a; line-height: 1.25; margin-bottom: 2px;">
                            ${m.title}
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b; line-height: 1.3;">
                            🎁 ${m.reward}
                        </div>
                    </div>
                    <div style="font-size: 16px; color: #ec4899; flex-shrink: 0;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach listeners for mission cards and banner.
 */
export function attachMissionListeners() {
    // Flash mission card click
    document.getElementById('btn-open-flash-mission')?.addEventListener('click', () => {
        const fm = (window._activeFlashMissions || [])[0];
        if (fm) showFlashMissionModal(fm);
    });

    // Cycle mission card click
    document.getElementById('btn-open-cycle-mission')?.addEventListener('click', () => {
        const cm = (window._activeCycleMissions || [])[0];
        if (cm) showCycleMissionModal(cm);
    });

    // Standard mission CTA click
    document.getElementById('btn-mission-cta')?.addEventListener('click', (e) => {
        const card = e.currentTarget;
        const cta = card.dataset.cta;
        const key = card.dataset.key;

        if (key === 'm5' || cta === 'open_buy_gold') {
            const fm = (window._activeFlashMissions || []).find(m => m.piggy_type === 'gold' || m.piggy_type === 'dorado');
            if (fm) {
                showFlashMissionModal(fm);
            } else {
                navigateTo('mercado');
            }
            return;
        }

        if (cta === 'open_referidos' || key === 'm3') {
            const { showReferralModal } = require ? require('./ReferralsModal.js') : {};
            // If already loaded in GranjaView, trigger click on greeting referrals
            document.getElementById('btn-greeting-referrals')?.click();
            return;
        }

        if (cta && cta.startsWith('#/')) {
            navigateTo(cta.replace('#/', ''));
        }
    });
}
