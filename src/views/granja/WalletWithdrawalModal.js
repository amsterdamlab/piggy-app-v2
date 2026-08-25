/* ==========================================================================
   PIGGY APP — Wallet Withdrawal Modal & Success Receipt
   Modular subcomponent containing withdrawal flows (money & consumption).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { createWalletRequest, notifyAdminViaWhatsApp, convertBalanceToConsumptionBonus } from '../../services/walletService.js';
import { getProfile } from '../../services/authService.js';
import { openWalletDrawer } from './WalletDrawerModal.js';
import { navigateTo } from '../../router.js';

/**
 * Unified "Retirar mi Saldo" modal — multi-step flow.
 * Step 1: Choose type (Dinero o Consumo)
 * Step 2a (Dinero): Verify profile bank details + amount -> WhatsApp
 * Step 2b (Consumo): Enter amount -> "Canjear a Bonos de Consumo" -> Instant credit
 */
export async function showRetiroSaldoModal(availableAmount) {
  const existing = document.getElementById('retiro-modal');
  if (existing) existing.remove();

  document.body.style.overflow = 'hidden';

  // Fetch fresh profile from Supabase to guarantee 100% sync with DB
  let profile = AppState.get('profile') || {};
  try {
    const fresh = await getProfile();
    if (fresh) {
      profile = fresh;
      AppState.set({ profile: fresh });
    }
  } catch (e) {
    console.warn('No se pudo refrescar el perfil en retiro:', e);
  }

  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const userPhone = profile?.whatsapp || profile?.phone_number || '';
  const minAmount = 10000;

  const modal = document.createElement('div');
  modal.id = 'retiro-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  // Persistent white container
  const container = document.createElement('div');
  container.className = 'animate-scale-in';
  container.style.width = '100%';
  container.style.maxWidth = '520px';
  container.style.height = '100dvh';
  container.style.maxHeight = '100dvh';
  container.style.background = 'white';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.overflow = 'hidden';
  container.style.position = 'relative';
  container.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5)';

  modal.appendChild(container);
  document.body.appendChild(modal);

  const safeRemove = (returnToDrawer = true) => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
    if (returnToDrawer) {
      openWalletDrawer();
    }
  };

  modal.addEventListener('click', (e) => { if (e.target === modal) safeRemove(true); });

  /* ─────────────────────────────────────────
     STEP 1 — Destino del Retiro (Dinero / Consumo)
  ───────────────────────────────────────── */
  const renderStep1 = () => `
      <!-- Sticky Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; padding:18px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; justify-content:center; color:#be1260; flex-shrink:0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 6 9 C 3 9 2 8 2 6 C 2 3 6 2 12 2 C 18 2 22 3 22 6 C 22 8 21 9 18 9" />
              <rect x="6" y="8" width="12" height="12" rx="2" />
              <path d="M 12 11 v 6" />
              <path d="M 9.5 14.5 l 2.5 2.5 l 2.5 -2.5" />
            </svg>
          </div>
          <div>
            <div style="font-weight:850; font-size:1.35rem; color:#0f172a; line-height:1.2; letter-spacing:-0.02em;">Retirar mi saldo</div>
            <div style="font-size:0.85rem; color:#059669; font-weight:700; margin-top:2px;">Disponible: ${formatCOP(availableAmount)}</div>
          </div>
        </div>
        <button id="retiro-close" style="background:transparent; border:none; padding:4px 8px; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:20px 20px 40px 20px; display:flex; flex-direction:column; gap:16px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        <div style="font-size:0.88rem; font-weight:600; color:#475569; margin:0 0 2px;">Selecciona el destino de tu retiro:</div>
        
        <!-- 1. BOTÓN: Dinero en Cuenta -->
        <button id="retiro-tipo-dinero" style="
          background: #fdf2f5; border: 1px solid #ffe4e6;
          color: #0f172a; padding: 22px 20px; border-radius: 18px;
          font-weight: 700; font-size: 1rem; cursor: pointer;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
        " onmouseover="this.style.background='#fce7ed'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fdf2f5'; this.style.transform='translateY(0)';">
          <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:white; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #ffe4e6; margin-top:2px; color:#be1260;">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"/>
              <path d="M3 10h18"/>
              <path d="M5 6l7-3 7 3"/>
              <path d="M4 10v11"/>
              <path d="M20 10v11"/>
              <path d="M8 14v4"/>
              <path d="M12 14v4"/>
              <path d="M16 14v4"/>
            </svg>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span style="font-size:1.08rem; font-weight:850; color:#0f172a; letter-spacing:-0.01em; line-height:1.25;">Dinero en cuenta</span>
              <span style="background:white; color:#be1260; border:1px solid #fbcfe8; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">TRANSFERENCIA</span>
            </div>
            <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Transferencia bancaria a tu cuenta personal registrada.</div>
          </div>
        </button>

        <!-- 2. BOTÓN: Bonos de Consumo -->
        <button id="retiro-tipo-consumo" style="
          background: #fdf2f5; border: 1px solid #ffe4e6;
          color: #0f172a; padding: 22px 20px; border-radius: 18px;
          font-weight: 700; font-size: 1rem; cursor: pointer;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          text-align: left; transition: all 0.2s; width: 100%; box-sizing: border-box; flex-shrink: 0;
        " onmouseover="this.style.background='#fce7ed'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#fdf2f5'; this.style.transform='translateY(0)';">
          <div style="width:52px; height:52px; min-width:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:white; padding:4px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #ffe4e6; margin-top:2px; color:#be1260;">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              <path d="M13 5v2"/>
              <path d="M13 17v2"/>
              <path d="M13 11v2"/>
            </svg>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span style="font-size:1.08rem; font-weight:850; color:#0f172a; letter-spacing:-0.01em; line-height:1.25;">Bonos de Consumo</span>
              <span style="background:white; color:#be1260; border:1px solid #fbcfe8; border-radius:6px; padding:3px 8px; font-size:0.7rem; font-weight:800; letter-spacing:0.4px;">CANJE INMEDIATO</span>
            </div>
            <div style="font-size:0.86rem; color:#475569; font-weight:500; line-height:1.4;">Canjear por cortes gourmet y productos cárnicos en Tienda.</div>
          </div>
        </button>
      </div>

      <!-- Footer Info -->
      <div style="padding:16px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
        <p style="font-size:0.72rem; color:#94a3b8; margin:0 0 6px 0; display:flex; align-items:center; justify-content:center; gap:5px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Retiros y transacciones seguras respaldadas por Piggy App</span>
        </p>
      </div>
  `;

  /* ─────────────────────────────────────────
     STEP 2A — Retiro de Dinero (Transferencia Bancaria)
  ───────────────────────────────────────── */
  const renderStep2Dinero = () => {
    const curProfile = AppState.get('profile') || profile || {};
    const userBank = curProfile.bank_name || '';
    const userAccount = curProfile.bank_account_number || curProfile.bank_breve_key || '';
    const userAccountType = curProfile.bank_account_type || 'Cuenta de Ahorros';
    const userCedula = curProfile.cedula || curProfile.document_id || '';
    const hasBankData = Boolean(userBank || userAccount);

    return `
      <!-- Header Limpio: Volver arriba a la izq y cerrar a la der -->
      <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <button id="retiro-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
            ← Volver
          </button>
          <button id="retiro-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
        </div>
        
        <div>
          <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Retiro de Dinero</h2>
          <div style="font-size:0.85rem; color:#059669; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
        </div>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:18px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        
        <!-- Input Monto a Retirar -->
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">Monto a retirar (min. $10.000)</label>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="retiro-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 70px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#be1260';" onblur="this.style.borderColor='#e2e8f0';" />
            <button type="button" id="btn-todo-retiro" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:#fdf2f5; border:1px solid #ffe4e6; color:#be1260; font-weight:800; cursor:pointer; padding:6px 12px; border-radius:10px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="retiro-amount-error" style="font-size:0.75rem; color:#dc2626; margin-top:6px; display:none; font-weight:600;"></div>
        </div>

        <!-- Recuadro Banco Destino -->
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">Banco de destino</label>
          ${hasBankData ? `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:38px; height:38px; border-radius:10px; background:white; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#be1260; flex-shrink:0;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v4"/><path d="M12 14v4"/><path d="M16 14v4"/></svg>
                  </div>
                  <div>
                    <div style="font-size:0.95rem; font-weight:800; color:#0f172a;">${userBank || 'Cuenta Registrada'}</div>
                    <div style="font-size:0.78rem; color:#64748b;">${userAccountType} • <strong>${userAccount || 'Registrada'}</strong></div>
                  </div>
                </div>
                <button type="button" id="btn-goto-profile-edit" style="background:none; border:none; color:#be1260; font-size:0.78rem; font-weight:700; text-decoration:underline; cursor:pointer; padding:4px;">Cambiar</button>
              </div>
              <div style="font-size:0.78rem; color:#64748b; padding-top:8px; border-top:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between;">
                <span>Cédula / Documento: <strong style="color:#0f172a;">${userCedula || 'No registrada'}</strong></span>
                <span style="color:#059669; font-weight:700; font-size:0.72rem;">✓ Cuenta Vinculada</span>
              </div>
            </div>
          ` : `
            <div style="background:#fff1f2; border:1px solid #ffe4e6; border-radius:16px; padding:18px; text-align:left;">
              <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:10px;">
                <div style="width:36px; height:36px; border-radius:10px; background:white; border:1px solid #fecdd3; display:flex; align-items:center; justify-content:center; color:#be1260; flex-shrink:0;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <div style="font-size:0.9rem; font-weight:800; color:#9f1239;">Aún no tienes banco registrado</div>
                  <div style="font-size:0.78rem; color:#be1260; margin-top:2px; line-height:1.4;">Para transferir tu dinero necesitamos tu número de cuenta y documento de identidad.</div>
                </div>
              </div>
              <button type="button" id="btn-goto-profile-setup" style="background:none; border:none; color:#be1260; font-weight:800; font-size:0.84rem; text-decoration:underline; cursor:pointer; padding:0; display:inline-flex; align-items:center; gap:4px;">
                Actualizar mis datos en Mi Perfil →
              </button>
            </div>
          `}
        </div>

        <!-- Botón Solicitar Retiro (Estilo WhatsApp Bre-B en líneas) -->
        <button id="retiro-confirm-dinero" style="
          width: 100%; background: #22c55e; color: white; border: none;
          padding: 16px 20px; border-radius: 14px; font-weight: 800; font-size: 1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 10px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35); transition: all 0.2s; margin-top:4px;
        " onmouseover="this.style.background='#16a34a'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#22c55e'; this.style.transform='translateY(0)';">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
            <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
          </svg>
          Solicitar Retiro
        </button>

        <!-- Candado de Seguridad en Líneas -->
        <p style="text-align:center; font-size:0.75rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:6px; line-height:1.4;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Nuestro equipo procesará el retiro en tu cuenta personal en máximo 48 horas hábiles.</span>
        </p>
      </div>
    `;
  };

  /* ─────────────────────────────────────────
     STEP 2B — Bonos de Consumo (Canje Inmediato)
     Colores alineados con Cuenta Agro: #fff1f2, #ffe4e6, #be1260, #9f1239
  ───────────────────────────────────────── */
  const renderStep2Consumo = () => `
      <!-- Header Limpio: Volver arriba a la izq y cerrar a la der -->
      <div style="padding:20px 20px 14px 20px; background:white; border-bottom:1px solid #f1f5f9; flex-shrink:0; z-index:10;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <button id="retiro-back" style="background:none; border:none; padding:0; font-size:0.9rem; font-weight:600; color:#64748b; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
            ← Volver
          </button>
          <button id="retiro-close" style="background:transparent; border:none; padding:0; font-size:22px; font-weight:700; color:#94a3b8; cursor:pointer; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">✕</button>
        </div>
        
        <div>
          <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Bonos de Consumo</h2>
          <div style="font-size:0.85rem; color:#be1260; font-weight:700;">Disponible: ${formatCOP(availableAmount)}</div>
        </div>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:24px 20px; display:flex; flex-direction:column; gap:18px; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        <div>
          <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:8px;">¿Cuánto saldo deseas canjear en bonos?</label>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="consumo-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 70px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#be1260';" onblur="this.style.borderColor='#e2e8f0';" />
            <button type="button" id="btn-todo-consumo" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:#fff1f2; border:1px solid #ffe4e6; color:#be1260; font-weight:800; cursor:pointer; padding:6px 12px; border-radius:10px; font-size:0.78rem;">Todo</button>
          </div>
          <div id="consumo-amount-error" style="font-size:0.75rem; color:#dc2626; margin-top:6px; display:none; font-weight:600;"></div>
        </div>

        <!-- Botón Canjear a Bonos de Consumo -->
        <button id="retiro-confirm-consumo" style="
          width:100%; margin-top:4px; background:#be1260; color:white; border:none;
          padding:16px 20px; border-radius:14px; font-weight:800; font-size:1rem;
          cursor:pointer; box-shadow:0 4px 14px rgba(190, 18, 96, 0.25); transition:all 0.2s;
        " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)';" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
          Canjear a Bonos de Consumo
        </button>

        <!-- Rayo en SVG de líneas y texto en gris -->
        <p style="text-align:center; font-size:0.75rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:6px; line-height:1.4;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span>El saldo se debitará y pasará a tu disponibilidad de Bonos de Consumo.</span>
        </p>
      </div>
  `;

  const attachClose = (onBack) => {
    document.getElementById('retiro-close')?.addEventListener('click', () => safeRemove(true));
    if (onBack) document.getElementById('retiro-back')?.addEventListener('click', onBack);
  };

  const goToStep1 = () => {
    container.innerHTML = renderStep1();
    attachClose(null);
    document.getElementById('retiro-tipo-dinero')?.addEventListener('click', goToStep2Dinero);
    document.getElementById('retiro-tipo-consumo')?.addEventListener('click', goToStep2Consumo);
  };

  const goToStep2Dinero = () => {
    container.innerHTML = renderStep2Dinero();
    attachClose(goToStep1);

    // Links a Mi Perfil (subscreen datos)
    const handleGotoProfile = () => {
      safeRemove(false);
      navigateTo('perfil');
      setTimeout(() => {
        window.location.hash = '#/perfil?subscreen=datos';
      }, 50);
    };

    document.getElementById('btn-goto-profile-setup')?.addEventListener('click', handleGotoProfile);
    document.getElementById('btn-goto-profile-edit')?.addEventListener('click', handleGotoProfile);

    // Setup the "Todo" button dynamically
    document.getElementById('btn-todo-retiro')?.addEventListener('click', () => {
      const input = document.getElementById('retiro-amount');
      if (input) {
        input.value = availableAmount;
        input.dispatchEvent(new Event('input'));
      }
    });

    document.getElementById('retiro-confirm-dinero')?.addEventListener('click', async () => {
      const curProfile = AppState.get('profile') || profile || {};
      const userBank = curProfile.bank_name || '';
      const userAccount = curProfile.bank_account_number || curProfile.bank_breve_key || '';
      const errDiv = document.getElementById('retiro-amount-error');
      const amount = parseFloat(document.getElementById('retiro-amount')?.value || 0);

      if (!amount || amount < minAmount) {
        errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount);
        errDiv.style.display = 'block';
        return;
      }
      if (amount > availableAmount) {
        errDiv.textContent = 'El monto supera tu saldo disponible';
        errDiv.style.display = 'block';
        return;
      }
      if (!userBank && !userAccount) {
        errDiv.textContent = 'Por favor registra tu cuenta bancaria en Mi Perfil para continuar.';
        errDiv.style.display = 'block';
        return;
      }
      
      const btn = document.getElementById('retiro-confirm-dinero');
      btn.innerText = 'Procesando...';
      btn.disabled = true;

      errDiv.style.display = 'none';
      
      const res = await createWalletRequest('withdrawal', amount, userBank || 'Banco Registrado');
      if (!res.success) {
        errDiv.textContent = res.reason || 'Error al procesar la solicitud'; 
        errDiv.style.display = 'block';
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
            <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
          </svg>
          Solicitar Retiro
        `;
        btn.disabled = false;
        return;
      }

      notifyAdminViaWhatsApp('withdrawal', amount, userName, userPhone, userBank || 'Banco Registrado', res.requestId);
      showWalletRequestSuccess('withdrawal', amount, userBank || 'Banco Registrado', res.requestId);
      safeRemove(false);
    });
  };

  const goToStep2Consumo = () => {
    container.innerHTML = renderStep2Consumo();
    attachClose(goToStep1);

    // Setup the "Todo" button dynamically
    document.getElementById('btn-todo-consumo')?.addEventListener('click', () => {
      const input = document.getElementById('consumo-amount');
      if (input) {
        input.value = availableAmount;
        input.dispatchEvent(new Event('input'));
      }
    });

    document.getElementById('retiro-confirm-consumo')?.addEventListener('click', async () => {
      const errDiv = document.getElementById('consumo-amount-error');
      const amount = parseFloat(document.getElementById('consumo-amount')?.value || 0);
      if (!amount || amount < minAmount) {
        errDiv.textContent = 'El monto mínimo es ' + formatCOP(minAmount);
        errDiv.style.display = 'block';
        return;
      }
      if (amount > availableAmount) {
        errDiv.textContent = 'El monto supera tu saldo disponible';
        errDiv.style.display = 'block';
        return;
      }
      
      const btn = document.getElementById('retiro-confirm-consumo');
      btn.innerText = 'Procesando...';
      btn.disabled = true;

      errDiv.style.display = 'none';
      
      const res = await convertBalanceToConsumptionBonus(amount);
      if (!res.success) {
        errDiv.textContent = res.reason || 'Error al procesar el canje'; 
        errDiv.style.display = 'block';
        btn.innerText = 'Canjear a Bonos de Consumo';
        btn.disabled = false;
        return;
      }

      showConsumptionConversionSuccess(amount);
      safeRemove(false);
    });
  };

  goToStep1();
}

/**
 * Show success confirmation after wallet request.
 */
export function showWalletRequestSuccess(requestType, amount, bank, requestId) {
  const isWithdrawal = requestType === 'withdrawal';
  const shortId = requestId ? requestId.slice(-8).toUpperCase() : Date.now().toString().slice(-6);
  const typeLabel = isWithdrawal ? 'Retiro' : 'Consumo';

  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  modal.innerHTML = `
    <div class="animate-scale-in text-center" style="width:100%; max-width:480px; background:white; border-radius:24px; padding:32px 24px; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <button id="wallet-success-close-x" style="background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; position:absolute; right:20px; top:20px; font-size:18px; font-weight:700; cursor:pointer; color:#334155; display:flex; align-items:center; justify-content:center;">✕</button>
      <div style="width:68px; height:68px; background:${isWithdrawal ? '#d1fae5' : '#fff1f2'}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
          <span style="font-size:32px;">${isWithdrawal ? '✅' : '🥩'}</span>
      </div>
      <h3 style="margin:0 0 8px; font-size:1.3rem; font-weight:900; color:#0f172a;">Solicitud de ${typeLabel} Recibida</h3>
      <p style="color:#64748b; font-size:0.92rem; margin:0 0 20px; line-height:1.5;">
        Tu solicitud de <strong>${typeLabel.toLowerCase()}</strong> por <strong style="color:#059669;">${formatCOP(amount)}</strong>${isWithdrawal && bank ? ` a <strong>${bank}</strong>` : ''} ha sido registrada exitosamente.
      </p>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:16px; margin-bottom:20px; text-align:left; font-size:0.88rem;">
          <div style="margin-bottom:6px; display:flex; justify-content:space-between;"><strong>Comprobante:</strong> <span style="font-family:monospace; font-weight:800;">#${typeLabel.toUpperCase().slice(0, 3)}-${shortId}</span></div>
          <div style="margin-bottom:6px; display:flex; justify-content:space-between;"><strong>Fecha:</strong> <span>${new Date().toLocaleDateString('es-CO')}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Estado:</strong> <span style="background:#fef3c7; color:#d97706; font-weight:800; padding:2px 8px; border-radius:6px; font-size:0.75rem;">Pendiente</span></div>
      </div>

      <p style="color:#94a3b8; font-size:0.78rem; margin:0 0 24px; line-height:1.4;">
        ${isWithdrawal
      ? 'Nuestro equipo procesará tu retiro en un plazo máximo de 48 horas hábiles. Te confirmaremos vía WhatsApp.'
      : 'Nuestro equipo se comunicará contigo por WhatsApp para coordinar la entrega de tus productos agro.'}
      </p>

      <button id="wallet-success-close" style="width:100%; background:linear-gradient(135deg, #10B981, #059669); border:none; color:white; padding:16px; border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35);">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
  };
  document.getElementById('wallet-success-close').addEventListener('click', closeModal);
  document.getElementById('wallet-success-close-x').addEventListener('click', closeModal);
}

/**
 * Show success receipt after automatic conversion to consumption bonus.
 * Color palette unified with Cuenta Agro Bonos de Consumo (#fff1f2, #ffe4e6, #be1260, #9f1239).
 */
export function showConsumptionConversionSuccess(amount) {
  document.body.style.overflow = 'hidden';

  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100dvh';
  modal.style.background = 'rgba(15, 23, 42, 0.6)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '99999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '0';

  modal.innerHTML = `
    <div class="animate-scale-in text-center" style="width:100%; max-width:480px; background:white; border-radius:24px; padding:32px 24px; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
      <button id="consumo-success-close-x" style="background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; position:absolute; right:20px; top:20px; font-size:18px; font-weight:700; cursor:pointer; color:#334155; display:flex; align-items:center; justify-content:center;">✕</button>
      <div style="width:68px; height:68px; background:#fff1f2; border:1px solid #ffe4e6; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; color:#be1260;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
          <path d="M13 5v2"/>
          <path d="M13 17v2"/>
          <path d="M13 11v2"/>
        </svg>
      </div>
      <h3 style="margin:0 0 8px; font-size:1.35rem; font-weight:850; color:#0f172a; letter-spacing:-0.02em;">¡Canje Exitoso!</h3>
      <p style="color:#64748b; font-size:0.92rem; margin:0 0 20px; line-height:1.5;">
        Has canjeado <strong style="color:#be1260;">${formatCOP(amount)}</strong> de tu saldo disponible por <strong>Bonos de Consumo</strong>.
      </p>

      <div style="background:#fff1f2; border:1px solid #ffe4e6; padding:16px; border-radius:16px; margin-bottom:20px; text-align:left; font-size:0.88rem; color:#9f1239;">
          <div style="margin-bottom:6px; display:flex; justify-content:space-between;"><strong>Débito Saldo:</strong> <span style="font-weight:800;">-${formatCOP(amount)}</span></div>
          <div style="display:flex; justify-content:space-between;"><strong>Crédito Bonos:</strong> <span style="font-weight:800; color:#be1260;">+${formatCOP(amount)}</span></div>
      </div>

      <p style="color:#94a3b8; font-size:0.78rem; margin:0 0 24px; line-height:1.4;">
        Tus movimientos han quedado registrados automáticamente en el historial de transacciones para tu completa trazabilidad.
      </p>

      <button id="consumo-success-close" style="
        width:100%; background:#be1260; border:none; color:white; padding:16px;
        border-radius:14px; font-weight:800; font-size:1rem; cursor:pointer;
        box-shadow:0 4px 14px rgba(190, 18, 96, 0.35); transition:all 0.2s;
      " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)';" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    if (!document.querySelector('#wallet-drawer-modal, #wallet-recharge-modal, #retiro-modal')) {
      document.body.style.overflow = '';
    }
    window.location.reload();
  };
  document.getElementById('consumo-success-close').addEventListener('click', closeModal);
  document.getElementById('consumo-success-close-x').addEventListener('click', closeModal);
}
