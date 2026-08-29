/* ============================================
   PIGGY APP — Cycle Mission Modal (M7)
   Shows the completed cycle liquidation modal
   with real financial return, profit, and
   exclusive Flash reinvestment opportunity.
   ============================================ */

import { navigateTo } from '../../router.js';
import { formatCOP } from '../../services/mockData.js';
import { completeCycleMission } from '../../services/flashMissionsService.js';

/**
 * Show the Cycle Completion Mission modal.
 * @param {Object} mission - cycle_completion_missions record
 */
export async function showCycleMissionModal(mission) {
    const existing = document.getElementById('cycle-mission-modal');
    if (existing) existing.remove();

    const invAmount  = parseFloat(mission.investment_amount || 1000000);
    const returnAmt  = parseFloat(mission.return_amount || 1115000);
    const profit     = returnAmt - invAmount;
    const piggyName  = mission.piggy_name || 'Tu Piggy';
    const cycleDays  = mission.cycle_duration_days || 90;

    document.body.style.overflow = 'hidden';

    const modal = document.createElement('div');
    modal.id = 'cycle-mission-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100dvh;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
        z-index: 99999; display: flex; align-items: flex-end; justify-content: center;
    `;

    modal.innerHTML = `
        <div class="animate-fade-in-up" style="
            background: white; border-radius: 28px 28px 0 0;
            width: 100%; max-width: 480px; max-height: 92dvh;
            overflow-y: auto; -webkit-overflow-scrolling: touch;
            padding: 0 0 calc(40px + env(safe-area-inset-bottom, 0px)) 0;
            position: relative;
        ">
            <!-- Handle -->
            <div style="width:40px; height:4px; background:#e5e7eb; border-radius:2px; margin:14px auto 6px;"></div>

            <!-- Close -->
            <button id="cycle-modal-close" style="
                position:absolute; top:16px; right:16px;
                background:#f3f4f6; border:none; width:32px; height:32px;
                border-radius:50%; cursor:pointer; font-size:18px; color:#6b7280;
                display:flex; align-items:center; justify-content:center;
                line-height:1; z-index:10;
            ">&times;</button>

            <!-- Celebration Header -->
            <div style="
                background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
                margin: 8px 20px 0; border-radius: 20px; padding: 26px 20px;
                color: white; text-align: center; position: relative; overflow: hidden;
                box-shadow: 0 12px 30px -5px rgba(16,185,129,0.45);
            ">
                <!-- Badge -->
                <div style="
                    background: rgba(255,255,255,0.25); display: inline-block;
                    padding: 4px 14px; border-radius: 20px; font-size: 0.68rem;
                    font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;
                ">
                    🎉 ¡CICLO COMPLETADO!
                </div>

                <div style="font-size: 56px; margin-bottom: 8px; animation: bounce 0.6s ease;">🏆</div>
                <h2 style="margin: 0 0 6px; font-size: 1.55rem; font-weight: 900;">
                    ${piggyName} completó su ciclo
                </h2>
                <p style="margin: 0; font-size: 0.85rem; opacity: 0.93; line-height: 1.4;">
                    Tu Piggy alcanzó el peso comercial ideal tras <strong>${cycleDays} días</strong> de crianza profesional en Granja Valle Morales.
                </p>

                <!-- Liquidated Cash Card -->
                <div style="
                    background: rgba(0,0,0,0.22); border-radius: 16px;
                    padding: 16px 20px; margin-top: 18px; text-align: center;
                ">
                    <div style="font-size:0.7rem; opacity:0.85; text-transform:uppercase; letter-spacing:1px;">
                        Saldo Abonado a tu Cuenta Agro
                    </div>
                    <div style="font-size: 2rem; font-weight: 900; letter-spacing: -0.5px; margin-top: 2px;">
                        ${formatCOP(returnAmt)}
                    </div>
                    <div style="font-size: 0.78rem; opacity: 0.9; margin-top: 2px;">
                        Ganancia neta: <strong>+${formatCOP(profit)}</strong>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div style="padding: 20px 20px 0;">

                <!-- Financial Breakdown -->
                <div style="
                    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;
                    padding: 16px; margin-bottom: 16px;
                ">
                    <div style="font-size:0.75rem; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">
                        Resumen de Liquidación
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">
                        <div style="display:flex; justify-content:space-between; color:#64748b;">
                            <span>Inversión Inicial:</span>
                            <span style="font-weight:700; color:#0f172a;">${formatCOP(invAmount)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:#64748b;">
                            <span>Margen de Ganancia:</span>
                            <span style="font-weight:700; color:#16a34a;">+${formatCOP(profit)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; color:#64748b;">
                            <span>Días en Granja:</span>
                            <span style="font-weight:700; color:#0f172a;">${cycleDays} días</span>
                        </div>
                        <div style="height:1px; background:#e2e8f0; margin:4px 0;"></div>
                        <div style="display:flex; justify-content:space-between; color:#0f172a; font-weight:800; font-size:0.95rem;">
                            <span>Total Liquidado:</span>
                            <span style="color:#16a34a;">${formatCOP(returnAmt)}</span>
                        </div>
                    </div>
                </div>

                <!-- Next Step Recommendation -->
                <div style="
                    background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px;
                    padding: 16px; margin-bottom: 20px;
                ">
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                        <span style="font-size:24px; flex-shrink:0;">⚡</span>
                        <div>
                            <div style="font-size:0.85rem; font-weight:800; color:#92400e; margin-bottom:4px;">
                                ¡No detengas el crecimiento de tu Granja!
                            </div>
                            <div style="font-size:0.75rem; color:#78350f; line-height:1.4;">
                                Tienes saldo disponible en tu Cuenta Agro. Adquiere un nuevo Piggy hoy y mantén tu producción activa generando beneficios.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CTAs -->
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button
                        id="btn-cycle-adopt-new"
                        class="btn-shine-7s"
                        style="
                            width: 100%; padding: 16px; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
                            color: white; border: none; border-radius: 16px; font-size: 1rem;
                            font-weight: 800; cursor: pointer; display: flex; align-items: center;
                            justify-content: center; gap: 8px; box-shadow: 0 8px 20px -4px rgba(236,72,153,0.45);
                        "
                    >
                        <span>🐷</span>
                        <span>Adquirir Nuevo Piggy</span>
                    </button>

                    <button
                        id="btn-cycle-view-wallet"
                        style="
                            width: 100%; padding: 14px; background: #f1f5f9;
                            color: #334155; border: 1px solid #e2e8f0; border-radius: 14px;
                            font-size: 0.9rem; font-weight: 700; cursor: pointer;
                        "
                    >
                        Ver mi Saldo en Granja
                    </button>
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);

    function closeModal() {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.2s';
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 200);
    }

    // Close handlers
    document.getElementById('cycle-modal-close').addEventListener('click', async () => {
        await completeCycleMission(mission.id);
        closeModal();
    });

    modal.addEventListener('click', async (e) => {
        if (e.target === modal) {
            await completeCycleMission(mission.id);
            closeModal();
        }
    });

    document.getElementById('btn-cycle-adopt-new').addEventListener('click', async () => {
        await completeCycleMission(mission.id);
        closeModal();
        navigateTo('mercado');
    });

    document.getElementById('btn-cycle-view-wallet').addEventListener('click', async () => {
        await completeCycleMission(mission.id);
        closeModal();
        navigateTo('granja');
    });
}
