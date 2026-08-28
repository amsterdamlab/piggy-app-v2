/* ============================================
   PIGGY APP — Adopción View (Compra con Wallet)
   Flujo directo: Compra 1 Piggy por $1.000.000 COP
   usando el saldo de la Wallet del usuario.
   ============================================ */

import { navigateTo } from '../router.js';
import { getWalletBalance, deductWalletBalance, formatCOP } from '../services/walletService.js';
import { buyPiggy } from '../services/piggiesService.js';
import { completeMission } from '../services/missionsService.js';
import { openWalletDrawer } from './granja/WalletBlock.js';

const ITEM_PRICE = 1000000; // $1.000.000 COP

/**
 * Renderiza la vista de compra directa de Piggy.
 * @returns {Promise<string>}
 */
export async function renderAdopcionView() {
  const balance = await getWalletBalance();
  const hasSufficient = balance >= ITEM_PRICE;

  return `
    <div class="adopcion-view">
      <!-- Top Bar -->
      <header class="top-nav">
        <div class="top-nav__content" style="display:flex; align-items:center; gap:12px;">
          <button id="btn-back-adopcion" class="top-nav__btn" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer; padding:4px;">
            ←
          </button>
          <h1 class="top-nav__title" style="margin:0; font-size:1.15rem; font-weight:800;">Adopción Piggy</h1>
        </div>
      </header>

      <main class="main-content" style="padding: 20px 16px 80px 16px; max-width: 480px; margin: 0 auto;">

        <!-- Header Card -->
        <div class="section animate-fade-in-up" style="
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 20px;
          padding: 24px;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(16,185,129,0.35);
          margin-bottom: 20px;
        ">
          <div style="font-size: 64px; margin-bottom: 8px; line-height: 1;">🐷</div>
          <h2 style="margin: 0 0 6px 0; font-size: 1.4rem; font-weight: 900;">¡Tu Nuevo Cerdito te Espera!</h2>
          <p style="margin: 0; font-size: 0.85rem; opacity: 0.9; line-height: 1.4;">
            Asigna un nombre a tu cerdito y comienza el ciclo de engorde en tu granja digital.
          </p>
        </div>

        <!-- Form Card -->
        <div class="section animate-fade-in-up" style="
          background: var(--color-surface, white);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.06);
          border: 1px solid var(--color-border, #e5e7eb);
          margin-bottom: 16px;
        ">
          <!-- Piggy Name Input -->
          <div style="margin-bottom: 20px;">
            <label style="font-size: 0.82rem; font-weight: 700; color: #374151; display: block; margin-bottom: 8px;">
              Nombre de tu Cerdito
            </label>
            <input
              type="text"
              id="piggy-name-input"
              placeholder="Ej: Porky, Bacon, Copito..."
              autocomplete="off"
              style="
                width: 100%;
                padding: 14px 16px;
                box-sizing: border-box;
                border: 2px solid #e5e7eb;
                border-radius: 14px;
                font-size: 1rem;
                font-weight: 600;
                color: #1f2937;
                outline: none;
                text-align: center;
                transition: border-color 0.2s;
              "
              onfocus="this.style.borderColor='#10B981'"
              onblur="this.style.borderColor='#e5e7eb'"
            />
            <div id="piggy-name-error" style="color: #ef4444; font-size: 0.75rem; margin-top: 4px; display: none; text-align: center;">
              * Por favor ingresa un nombre para tu cerdito (mínimo 3 letras).
            </div>
            
            <!-- Quick Name Suggestions -->
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; justify-content: center;">
              ${['Porky', 'Bacon', 'Copito', 'Toby', 'Max', 'Gordo'].map(n => `
                <button class="name-chip" style="
                  background: #f0fdf4;
                  color: #059669;
                  border: 1px solid #bbf7d0;
                  padding: 4px 12px;
                  border-radius: 20px;
                  font-size: 0.78rem;
                  font-weight: 600;
                  cursor: pointer;
                ">${n}</button>
              `).join('')}
            </div>
          </div>

          <!-- Price Info -->
          <div style="
            background: #f8fafc;
            border-radius: 14px;
            padding: 14px 16px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
          ">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px; color: #64748b;">
              <span>Valor del Piggy</span>
              <span style="font-weight: 700; color: #1e293b;">${formatCOP(ITEM_PRICE)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px; color: #64748b;">
              <span>Cuidado y Alimentación (144 días)</span>
              <span style="font-weight: 700; color: #059669;">Incluido (0 COP)</span>
            </div>
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-weight: 800; font-size: 0.95rem; color: #059669;">
              <span>Total a Descontar</span>
              <span>${formatCOP(ITEM_PRICE)}</span>
            </div>
          </div>

          <!-- Wallet Balance -->
          <div style="
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 14px;
            color: white;
            position: relative;
            overflow: hidden;
          ">
            <div style="font-size:0.78rem; opacity:0.85; margin-bottom:4px;">Saldo disponible en tu Cuenta Agro</div>
            <div id="adopcion-balance-display" style="font-size:1.8rem; font-weight:800; letter-spacing:-0.5px;">
              ${formatCOP(balance)}
            </div>
            <div style="position:absolute; bottom:-10px; right:-10px; opacity:0.12; color:white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
          </div>

          <!-- Recharge Button -->
          <button id="adopcion-btn-recargar" style="
            width: 100%;
            background: linear-gradient(135deg, #7c3aed, #5b21b6);
            color: white;
            border: none;
            padding: 13px 20px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            display: ${hasSufficient ? 'none' : 'flex'};
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 14px;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
            transition: all 0.2s;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            Recargar mi Cuenta
          </button>

          <!-- Insufficient funds warning -->
          <div id="adopcion-insufficient-alert" style="
            display: ${hasSufficient ? 'none' : 'block'};
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 16px;
            font-size: 0.82rem;
            color: #dc2626;
            text-align: center;
          ">
            ⚠️ Saldo insuficiente en tu Cuenta Agro. Recarga saldo para continuar con la adopción.
          </div>

          <!-- Adopt Button -->
          <button id="btn-comprar-piggy" style="
            width: 100%;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-weight: 800;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(16,185,129,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: transform 0.15s, opacity 0.2s;
          ">
            <span>Comprar mi Cerdito</span>
            <span>🐷</span>
          </button>
        </div>

        <p style="text-align: center; font-size: 0.75rem; color: #9ca3af; margin: 0;">
          🔒 Transacción protegida. Al comprar, tu saldo se debita automáticamente y tu cerdito se agrega a tu granja.
        </p>

      </main>
    </div>
  `;
}

/**
 * Adjunta los event listeners de la vista de adopción.
 */
export function attachAdopcionListeners() {
  const btnBack = document.getElementById('btn-back-adopcion');
  if (btnBack) {
    btnBack.addEventListener('click', () => navigateTo('granja'));
  }

  const nameInput = document.getElementById('piggy-name-input');
  const nameError = document.getElementById('piggy-name-error');

  // Name suggestions
  document.querySelectorAll('.name-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (nameInput) {
        nameInput.value = chip.textContent.trim();
        if (nameError) nameError.style.display = 'none';
      }
    });
  });

  // Recharge button
  const btnRecargar = document.getElementById('adopcion-btn-recargar');
  if (btnRecargar) {
    btnRecargar.addEventListener('click', async () => {
      const originalText = btnRecargar.innerHTML;
      btnRecargar.innerHTML = '<span class="spinner" style="width:16px;height:16px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Cargando Wallet...';
      btnRecargar.style.pointerEvents = 'none';
      try {
        await openWalletDrawer(true);
      } catch (e) {
        console.error('Error opening wallet drawer:', e);
      } finally {
        btnRecargar.innerHTML = originalText;
        btnRecargar.style.pointerEvents = 'auto';
      }
    });
  }

  // Buy Piggy button
  const btnComprar = document.getElementById('btn-comprar-piggy');
  if (btnComprar) {
    btnComprar.addEventListener('click', async () => {
      const customName = nameInput?.value.trim() || '';

      if (customName.length < 3) {
        if (nameError) nameError.style.display = 'block';
        nameInput?.focus();
        return;
      }

      // Check balance
      btnComprar.disabled = true;
      btnComprar.style.opacity = '0.7';
      btnComprar.innerHTML = '<span class="spinner" style="width:18px;height:18px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-right:8px;"></span> Procesando Adopción...';

      try {
        // 1. Deduct from wallet
        const deductResult = await deductWalletBalance(ITEM_PRICE);
        if (!deductResult.success) {
          throw new Error(deductResult.reason === 'insufficient_balance' 
            ? 'Saldo insuficiente en tu Wallet.' 
            : 'No se pudo procesar el pago. Intenta de nuevo.');
        }

        // 2. Register new piggy in DB
        const createdPiggy = await buyPiggy(customName, ITEM_PRICE);
        if (!createdPiggy) {
          throw new Error('No se pudo registrar tu cerdito en la base de datos.');
        }

        // 3. Mark M2 (Compra tu primer cerdito) as complete if applicable
        try {
          await completeMission('m2');
        } catch (_) {}

        // 4. Success -> redirect to Granja
        alert(`¡Felicitaciones! Has adoptado a "${customName}" exitosamente.`);
        navigateTo('granja');

      } catch (error) {
        alert(error.message || 'Ocurrió un error al procesar tu adopción.');
        btnComprar.disabled = false;
        btnComprar.style.opacity = '1';
        btnComprar.innerHTML = '<span>Comprar mi Cerdito</span> <span>🐷</span>';
      }
    });
  }
}
