/* ==========================================================================
   PIGGY APP — Wallet Withdrawal Modal & Success Receipt
   Modular subcomponent containing sliding withdrawal flows (money & consumption).
   ========================================================================== */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';
import { createWalletRequest, notifyAdminViaWhatsApp, convertBalanceToConsumptionBonus } from '../../services/walletService.js';
import { getProfile } from '../../services/authService.js';
import { openWalletDrawer } from './WalletDrawerModal.js';
import { navigateTo } from '../../router.js';

/**
 * Open Wallet Withdrawal flow as a sliding subscreen inside the parent container.
 * Zero DOM destruction, zero flickering, native transitions.
 *
 * @param {HTMLElement} mountContainer - The element inside which the subscreen is mounted
 * @param {number} availableAmount - The user's available wallet balance
 * @param {Function} onUpdated - Callback when balance changes
 * @param {Function} onCloseAll - Callback to close the entire wallet drawer
 */
export async function openWalletWithdrawalSubscreen(mountContainer, availableAmount, onUpdated = null, onCloseAll = null) {
  if (!mountContainer) return;
  mountContainer.innerHTML = '';

  const subscreen = document.createElement('div');
  subscreen.className = 'wallet-subscreen';
  subscreen.style.pointerEvents = 'auto';
  mountContainer.appendChild(subscreen);

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

  const closeSubscreen = () => {
    subscreen.remove();
  };

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
          <div style="font-size:0.85rem; color:#059669; font-weight:700;">Saldo disponible: ${formatCOP(availableAmount)}</div>
        </div>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;">
        
        <!-- Recuadro Banco Destino -->
        <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:16px; padding:16px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">
              Banco Destino Registrado
            </span>
            <span style="background:#ecfdf5; color:#059669; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:6px;">
              ${hasBankData ? 'VINCULADO' : 'PENDIENTE'}
            </span>
          </div>

          ${hasBankData ? `
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:1rem; font-weight:850; color:#0f172a;">${userBank || 'Banco Registrado'}</span>
                <span style="font-size:0.8rem; font-weight:700; color:#64748b;">${userAccountType}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:#334155;">
                <span><strong>No. Cuenta / Llave:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-weight:700; color:#0f172a;">${userAccount || 'No registrada'}</code></span>
              </div>
              ${userCedula ? `
              <div style="font-size:0.82rem; color:#64748b;">
                <strong>C.C:</strong> ${userCedula}
              </div>
              ` : ''}
              <div style="margin-top:6px; padding-top:8px; border-top:1px dashed #cbd5e1; text-align:right;">
                <button id="btn-goto-profile-edit" style="background:none; border:none; color:#be1260; font-size:0.75rem; font-weight:700; cursor:pointer; padding:0; text-decoration:underline;">
                  Cambiar o editar cuenta en Mi Perfil
                </button>
              </div>
            </div>
          ` : `
            <div style="text-align:center; padding:10px 0;">
              <p style="font-size:0.85rem; color:#64748b; margin:0 0 10px 0;">Aún no tienes una cuenta bancaria registrada en tu perfil.</p>
              <button id="btn-goto-profile-setup" style="
                background: #fdf2f5; color: #be1260; border: 1.5px solid #fbcfe8;
                padding: 10px 18px; border-radius: 12px; font-weight: 800; font-size: 0.82rem;
                cursor: pointer; transition: all 0.2s;
              " onmouseover="this.style.background='#fce7ed'" onmouseout="this.style.background='#fdf2f5'">
                Actualizar mis datos en Mi Perfil →
              </button>
            </div>
          `}
        </div>

        <!-- Monto a Retirar -->
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label style="font-size:0.78rem; font-weight:700; color:#475569;">¿Cuánto deseas retirar?</label>
            <button id="btn-todo-retiro" style="background:none; border:none; font-size:0.78rem; font-weight:800; color:#059669; cursor:pointer; padding:0; text-decoration:underline;">
              Retirar Todo (${formatCOP(availableAmount)})
            </button>
          </div>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="retiro-amount" placeholder="Ej: 500000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 16px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#be1260';" onblur="this.style.borderColor='#e2e8f0';" />
          </div>
          <div id="retiro-amount-error" style="color:#dc2626; font-size:0.75rem; font-weight:600; margin-top:6px; display:none;"></div>
          <div style="font-size:0.72rem; color:#64748b; margin-top:6px;">Monto mínimo de retiro: <strong>${formatCOP(minAmount)}</strong>.</div>
        </div>

        <!-- BOTÓN SOLICITAR RETIRO -->
        <div style="margin-bottom:20px;">
          <button id="retiro-confirm-dinero" style="
            width: 100%;
            background: #22c55e;
            color: white;
            border: none;
            padding: 16px 20px;
            border-radius: 9999px;
            font-weight: 850;
            font-size: 1.05rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
            transition: all 0.2s;
          " onmouseover="this.style.background='#16a34a'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#22c55e'; this.style.transform='translateY(0)';">
            <svg xmlns="http://www.w3.org/2000/svg" width="33" height="33" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.11-.059-.264-.087-.585-.205-1.002-.387-1.748-.763-2.888-2.535-2.977-2.653-.088-.118-.711-.947-.711-1.808 0-.861.451-1.285.613-1.46.162-.176.353-.22.471-.22.118 0 .235.001.338.006.109.006.255-.041.397.3.147.354.5 1.22.544 1.308.044.088.073.191.015.308-.059.118-.088.191-.176.294-.088.103-.186.23-.265.309-.089.088-.182.184-.078.361.103.176.459.757.985 1.226.678.605 1.25.792 1.427.88.176.089.279.074.382-.044.103-.118.441-.515.559-.691.118-.176.235-.147.397-.088.162.059 1.03.485 1.206.573.176.088.294.133.338.206.044.074.044.426-.1 1.031zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.957-1.399C8.423 21.492 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.637 0-3.153-.497-4.422-1.353l-.317-.213-2.937.828.846-2.859-.232-.345C4.015 14.922 3.5 13.513 3.5 12c0-4.687 3.813-8.5 8.5-8.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z"/>
            </svg>
            Solicitar Retiro
          </button>
        </div>

        <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:14px; padding:14px 16px; font-size:0.8rem; color:#065f46; line-height:1.45;">
          ⏱️ <strong>Tiempos de abono:</strong> Tu solicitud será revisada y abonada a tu cuenta en un plazo habitual de 1 a 24 horas hábiles.
        </div>
      </div>

      <div style="padding:14px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
        <p style="font-size:0.72rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:5px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Transferencias bancarias seguras respaldadas por Piggy App</span>
        </p>
      </div>
    `;
  };

  /* ─────────────────────────────────────────
     STEP 2B — Canje a Bonos de Consumo
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
          <h2 style="margin:0 0 4px 0; font-size:1.45rem; font-weight:800; color:#0f172a; letter-spacing:-0.02em;">Canje a Bonos</h2>
          <div style="font-size:0.85rem; color:#059669; font-weight:700;">Saldo disponible: ${formatCOP(availableAmount)}</div>
        </div>
      </div>

      <!-- Scrollable Body Content -->
      <div style="flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch;">
        
        <!-- Info Canje -->
        <div style="background:#fff1f2; border:1px solid #ffe4e6; border-radius:16px; padding:16px; margin-bottom:18px; display:flex; gap:12px; align-items:flex-start;">
          <div style="color:#be1260; flex-shrink:0; margin-top:2px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
              <path d="M13 5v2"/>
              <path d="M13 17v2"/>
              <path d="M13 11v2"/>
            </svg>
          </div>
          <div style="font-size:0.85rem; color:#9f1239; line-height:1.4;">
            El saldo que transfieras se convertirá en <strong>Bonos de Consumo</strong> disponibles de inmediato para compras de carne y productos de granja.
          </div>
        </div>

        <!-- Monto a Canjear -->
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label style="font-size:0.78rem; font-weight:700; color:#475569;">Monto a convertir</label>
            <button id="btn-todo-consumo" style="background:none; border:none; font-size:0.78rem; font-weight:800; color:#059669; cursor:pointer; padding:0; text-decoration:underline;">
              Canjear Todo (${formatCOP(availableAmount)})
            </button>
          </div>
          <div style="position:relative;">
            <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-weight:800; color:#9ca3af; font-size:1rem;">$</span>
            <input type="number" id="consumo-amount" placeholder="Ej: 100000" min="${minAmount}" max="${availableAmount}"
              style="width:100%; padding:14px 16px 14px 30px; border:2px solid #e2e8f0; border-radius:14px; font-size:1rem; font-weight:700; color:#0f172a; outline:none; box-sizing:border-box; transition:border 0.2s;"
              onfocus="this.style.borderColor='#be1260';" onblur="this.style.borderColor='#e2e8f0';" />
          </div>
          <div id="consumo-amount-error" style="color:#dc2626; font-size:0.75rem; font-weight:600; margin-top:6px; display:none;"></div>
        </div>

        <!-- BOTÓN CANJEAR -->
        <button id="retiro-confirm-consumo" style="
          width: 100%;
          background: #be1260;
          color: white;
          border: none;
          padding: 16px 20px;
          border-radius: 14px;
          font-weight: 850;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 14px rgba(190, 18, 96, 0.35);
          transition: all 0.2s;
        " onmouseover="this.style.opacity='0.95'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
          Canjear a Bonos de Consumo
        </button>
      </div>

      <div style="padding:14px 20px; text-align:center; border-top:1px solid #f1f5f9; flex-shrink:0;">
        <p style="text-align:center; font-size:0.75rem; color:#94a3b8; margin:0; display:flex; align-items:center; justify-content:center; gap:6px; line-height:1.4;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span>El saldo se debitará y pasará a tu disponibilidad de Bonos de Consumo.</span>
        </p>
      </div>
  `;

  const attachClose = (onBack) => {
    document.getElementById('retiro-close')?.addEventListener('click', closeSubscreen);
    if (onBack) document.getElementById('retiro-back')?.addEventListener('click', onBack);
  };

  const goToStep1 = () => {
    subscreen.innerHTML = renderStep1();
    attachClose(null);
    document.getElementById('retiro-tipo-dinero')?.addEventListener('click', goToStep2Dinero);
    document.getElementById('retiro-tipo-consumo')?.addEventListener('click', goToStep2Consumo);
  };

  const goToStep2Dinero = () => {
    subscreen.innerHTML = renderStep2Dinero();
    attachClose(goToStep1);

    // Links a Mi Perfil (subscreen datos)
    const handleGotoProfile = () => {
      closeSubscreen();
      if (onCloseAll) {
        onCloseAll();
      } else {
        const d = document.getElementById('wallet-drawer-modal');
        if (d) d.remove();
      }
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
      closeSubscreen();
      showWalletRequestSuccess('withdrawal', amount, userBank || 'Banco Registrado', res.requestId, onUpdated);
    });
  };

  const goToStep2Consumo = () => {
    subscreen.innerHTML = renderStep2Consumo();
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

      closeSubscreen();
      showConsumptionConversionSuccess(amount, onUpdated);
    });
  };

  goToStep1();
}

/**
 * Show success confirmation after wallet request.
 */
export function showWalletRequestSuccess(requestType, amount, bank, requestId, onUpdated = null) {
  const isWithdrawal = requestType === 'withdrawal';
  const modal = document.createElement('div');
  modal.id = 'wallet-success-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(15, 23, 42, 0.7)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '999999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '20px';

  modal.innerHTML = `
    <div class="animate-scale-in" style="background:white; border-radius:24px; max-width:440px; width:100%; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); position:relative;">
      <div style="background:linear-gradient(135deg, #10B981 0%, #059669 100%); padding:28px 24px; text-align:center; color:white;">
        <div style="width:60px; height:60px; background:white; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 style="margin:0 0 4px 0; font-size:1.4rem; font-weight:800; color:white;">¡Solicitud Enviada!</h3>
        <p style="margin:0; font-size:0.85rem; opacity:0.9;">Tu solicitud de retiro fue registrada exitosamente</p>
      </div>

      <div style="padding:24px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; margin-bottom:20px; font-size:0.85rem; color:#334155;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Referencia:</span>
            <strong style="color:#0f172a; font-family:monospace;">#${requestId || 'REQ-' + Math.floor(1000 + Math.random() * 9000)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Monto:</span>
            <strong style="color:#059669; font-size:0.95rem;">${formatCOP(amount)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <span style="color:#64748b;">Destino:</span>
            <strong style="color:#0f172a;">${bank}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#64748b;">Estado:</span>
            <span style="background:#fef3c7; color:#d97706; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;">En Revisión</span>
          </div>
        </div>

        <p style="font-size:0.8rem; color:#64748b; line-height:1.4; margin:0 0 20px 0; text-align:center;">
          Hemos abierto WhatsApp para que confirmes la solicitud con administración. Tu saldo se actualizará tras la aprobación.
        </p>

        <button id="btn-close-success-modal" style="
          width:100%; background:#0f172a; color:white; border:none; padding:14px;
          border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer;
          box-shadow:0 4px 12px rgba(0,0,0,0.1); transition:all 0.2s;
        " onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'">
          Entendido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeReceipt = () => {
    modal.remove();
    if (onUpdated) {
      openWalletDrawer();
    }
  };

  document.getElementById('btn-close-success-modal')?.addEventListener('click', closeReceipt);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeReceipt(); });
}

/**
 * Show success confirmation after instant consumption bonus conversion.
 */
export function showConsumptionConversionSuccess(amount, onUpdated = null) {
  const modal = document.createElement('div');
  modal.id = 'consumption-success-modal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(15, 23, 42, 0.7)';
  modal.style.backdropFilter = 'blur(8px)';
  modal.style.webkitBackdropFilter = 'blur(8px)';
  modal.style.zIndex = '999999';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.padding = '20px';

  modal.innerHTML = `
    <div class="animate-scale-in" style="background:white; border-radius:24px; max-width:440px; width:100%; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); position:relative;">
      <div style="background:linear-gradient(135deg, #be1260 0%, #9f1239 100%); padding:28px 24px; text-align:center; color:white;">
        <div style="width:60px; height:60px; background:white; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); color:#be1260;">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            <path d="M13 5v2"/>
            <path d="M13 17v2"/>
            <path d="M13 11v2"/>
          </svg>
        </div>
        <h3 style="margin:0 0 4px 0; font-size:1.4rem; font-weight:800; color:white;">¡Canje Exitoso!</h3>
        <p style="margin:0; font-size:0.85rem; opacity:0.9;">Tus bonos ya están listos para usar</p>
      </div>

      <div style="padding:24px;">
        <div style="background:#fff1f2; border:1px solid #ffe4e6; border-radius:14px; padding:16px; margin-bottom:20px; font-size:0.85rem; color:#881337;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #fecdd3; padding-bottom:8px;">
            <span style="color:#9f1239;">Monto Canjeado:</span>
            <strong style="color:#be1260; font-size:1rem;">${formatCOP(amount)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #fecdd3; padding-bottom:8px;">
            <span style="color:#9f1239;">Destino:</span>
            <strong style="color:#881337;">Bonos de Consumo</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#9f1239;">Disponibilidad:</span>
            <span style="background:#dcfce7; color:#15803d; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;">Inmediata</span>
          </div>
        </div>

        <p style="font-size:0.8rem; color:#64748b; line-height:1.4; margin:0 0 20px 0; text-align:center;">
          Tu saldo en Bonos de Consumo se ha acreditado. Ya puedes redimirlo en productos gourmet de la tienda.
        </p>

        <button id="btn-close-consumo-success" style="
          width:100%; background:#be1260; color:white; border:none; padding:14px;
          border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer;
          box-shadow:0 4px 12px rgba(190, 18, 96, 0.2); transition:all 0.2s;
        " onmouseover="this.style.opacity='0.95'" onmouseout="this.style.opacity='1'">
          Entendido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeReceipt = () => {
    modal.remove();
    if (onUpdated) {
      openWalletDrawer();
    }
  };

  document.getElementById('btn-close-consumo-success')?.addEventListener('click', closeReceipt);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeReceipt(); });
}

/**
 * Backwards compatible standalone opener: opens wallet drawer with withdrawal subscreen pre-selected.
 */
export async function showRetiroSaldoModal(availableAmount) {
  const existingDrawer = document.getElementById('wallet-drawer-modal');
  if (existingDrawer) {
    const subContainer = document.getElementById('wallet-subscreen-container');
    if (subContainer) {
      openWalletWithdrawalSubscreen(subContainer, availableAmount);
      return;
    }
  }
  openWalletDrawer(false, true);
}
