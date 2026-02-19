/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Matches screen2.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats, formatCOP } from '../services/piggiesService.js';
import { navigateTo } from '../router.js';
import { signOut } from '../services/authService.js';

/**
 * Render the Granja (Dashboard) view.
 */
export function renderGranjaView() {
  const app = document.getElementById('app');
  const profile = AppState.get('profile');
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario';

  app.innerHTML = buildGranjaShell(firstName);

  loadGranjaData(firstName);

  return () => {
    // cleanup
    removeBonusModal();
  };
}

/**
 * Build the shell (before data is loaded).
 */
function buildGranjaShell(firstName) {
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title">Mi Granja</h2>

        <!-- Stats Skeleton (New Wallet Look) -->
        <div class="section animate-fade-in-up">
           <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 16px; margin-bottom: 24px; color: white; position:relative; overflow:hidden;">
              <h3 style="margin:0 0 16px 0; font-size:1.1rem; opacity:0.9;">Wallet de ${firstName}</h3>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:60px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:60px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:100px; height:24px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
                  <div><span class="skeleton" style="width:80px; height:12px; background:rgba(255,255,255,0.2);"></span><div class="skeleton" style="width:40px; height:20px; background:rgba(255,255,255,0.3); margin-top:4px;"></div></div>
              </div>
              <div style="position: absolute; bottom: -10px; right: -10px; opacity: 0.15; transform: rotate(-15deg);">
                 <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>
           </div>
        </div>

        <!-- Piggies section skeleton -->
        <div class="section" id="piggies-section">
          <div class="loading-container">
            <div class="spinner"></div>
            <span>Cargando tu granja...</span>
          </div>
        </div>
      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

/**
 * Load data and update the dashboard.
 */
async function loadGranjaData(firstName) {
  try {
    const piggies = await getUserPiggies();
    const stats = await getDashboardStats(piggies);

    AppState.set({ piggies });

    const app = document.getElementById('app');
    app.innerHTML = buildGranjaFull(firstName, piggies, stats);

    attachGranjaListeners(piggies.length > 0, stats);
  } catch (error) {
    console.error('Error loading granja data:', error);
    const section = document.getElementById('piggies-section');
    if (section) {
      section.innerHTML = `
        <div class="auth-form__error auth-form__error--visible">
          Error al cargar datos. Intenta de nuevo.
        </div>
      `;
    }
  }
}

/**
 * Build the full dashboard with data.
 */
function buildGranjaFull(firstName, piggies, stats) {
  return `
    <div class="page page--with-nav granja-page">
      <div class="page__content">
        ${renderGreeting(firstName)}
        <h2 class="granja-title animate-fade-in-up">Mi Granja</h2>

        <!-- Wallet Banner (Green) -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s;">
           <div class="wallet-banner-card" style="
              background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
              color: white; 
              padding: 24px; 
              border-radius: 16px; 
              margin-bottom: 24px; 
              position: relative; 
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
           ">
              <div style="position: absolute; bottom: -15px; right: -15px; opacity: 0.15; transform: rotate(-15deg); color:white;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>

              <div style="position:relative; z-index:2;">
                 <h3 style="margin:0 0 20px 0; font-size:1.25rem; font-weight:700;">Wallet de ${firstName}</h3>
                 
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                    <!-- Adquisicion -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Adquisición Bonos de Preventa</div>
                       <div style="font-size:1rem; font-weight:600;">${stats.adquisicionBonosFormatted}</div>
                    </div>
                    <!-- Diferencial -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Diferencial de Preventa</div>
                       <div style="font-size:1rem; font-weight:600; color:#bbf7d0;">+${stats.diferencialPreventaFormatted}</div>
                    </div>
                    <!-- Disponible -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Disponible</div>
                       <div style="font-size:1.5rem; font-weight:800;">${stats.disponibleFormatted}</div>
                    </div>
                    <!-- Ciclo cierre -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Ciclo de cierre cercano</div>
                       <div style="font-size:1rem; font-weight:600;">${stats.nextCloseDays !== null ? stats.nextCloseDays + ' días' : '-'}</div>
                    </div>
                 </div>

                 ${stats.disponible > 0 ? `
                   <div style="display:flex; gap:10px; flex-wrap:wrap;">
                      <button id="btn-withdraw" style="
                         background: white; 
                         color: #059669; 
                         border: none; 
                         padding: 8px 16px; 
                         border-radius: 8px; 
                         font-weight: 600; 
                         font-size: 0.85rem; 
                         cursor: pointer;
                         flex: 1;
                         white-space: nowrap;
                         box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                      ">Convertir Bono en Efectivo</button>
                      <button id="btn-meat" style="
                         background: rgba(255,255,255,0.2); 
                         color: white; 
                         border: 1px solid rgba(255,255,255,0.4); 
                         padding: 8px 16px; 
                         border-radius: 8px; 
                         font-weight: 600; 
                         font-size: 0.85rem; 
                         cursor: pointer;
                         flex: 1;
                         white-space: nowrap;
                      ">Solicitar Entrega de Carne</button>
                   </div>
                 ` : ''}
              </div>
           </div>
        </div>

        <!-- ROI Info -->
        ${stats.activeCount > 0 ? `
          <div class="roi-info animate-fade-in-up" style="animation-delay: 0.15s;">
            ${renderIcon('trendUp', 'roi-info__icon', '16')}
            <span>Margen Comercial Estimado: <strong class="text-primary">${stats.baseROIFormatted}</strong></span>
          </div>
        ` : ''}

        <!-- Mis Cerdos -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.2s;">
          <div class="section__header">
            <h3 class="section__title">Mis Piggys</h3>
            <a href="#/mercado" class="section__link">
              Ver ofertas ${renderIcon('arrowRight', '', '14')}
            </a>
          </div>

          ${piggies.length === 0 ? renderEmptyPiggies() : renderPiggiesList(piggies, stats.baseROI)}
        </div>

        <!-- Bonus Banner -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.3s;">
          <div class="banner banner--interactive" id="bonus-banner">
            <div class="banner__badge">BONO PLUS DE BIENVENIDA</div>
            <div class="banner__title">Consigue bono de consumo por $50.000</div>
            <div class="banner__subtitle">Comprando tu primer piggy.</div>
            <div class="banner__decoration">🎁</div>
            <div class="text-xs mt-sm" style="opacity:0.7;">*Aplican términos y condiciones.</div>
          </div>
        </div>

        <!-- Missions Quick View -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.35s;">
          <div class="section__header">
            <h3 class="section__title">Misiones</h3>
          </div>
          <div class="missions-quick">
            <div class="mission-item" id="mission-feed">
              <span class="mission-item__icon">🍎</span>
              <div class="mission-item__info">
                <div class="mission-item__name">Alimenta a tu Piggy</div>
                <div class="mission-item__points">+10 pts</div>
              </div>
              <button class="btn btn--sm btn--primary mission-item__action">¡Listo!</button>
            </div>
            <div class="mission-item" id="mission-share">
              <span class="mission-item__icon">📱</span>
              <div class="mission-item__info">
                <div class="mission-item__name">Comparte tu progreso</div>
                <div class="mission-item__points">+25 pts</div>
              </div>
              <button class="btn btn--sm btn--secondary mission-item__action">Compartir</button>
            </div>
          </div>
        </div>

      </div>

      ${renderBottomNav('granja')}
    </div>
  `;
}

// ... renderGreeting remains the same ...

function renderGreeting(firstName) {
  const initial = firstName.charAt(0).toUpperCase();
  return `
    <div class="granja-greeting animate-fade-in">
      <div class="granja-greeting__avatar">
        <span class="granja-greeting__initial">${initial}</span>
        <span class="granja-greeting__online"></span>
      </div>
      <div class="granja-greeting__text">
        <span class="granja-greeting__welcome">¡Bienvenido!</span>
        <span class="granja-greeting__name">Hola, ${firstName}</span>
      </div>
    </div>
  `;
}

/**
 * Render empty piggies state matching screen2.png.
 */
function renderEmptyPiggies() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">
        <!-- <span style="font-size: 32px;">🐷</span> -->
        <img src="pig1.png" alt="Piggy" style="width:64px; height:64px; object-fit:contain;" />
      </div>
      <div class="empty-state__title">No tienes Piggys aún</div>
      <div class="empty-state__description">
        Comienza tu granja comprando tu primer piggy y empieza a generar beneficios.
      </div>
      <button class="btn btn--primary" id="btn-adopt-empty" onclick="location.hash='#/adopcion'">
        Compra un nuevo Piggy
      </button>
    </div>
  `;
}

// ... renderPiggiesList and renderPiggyCard remain the same ...

function renderPiggiesList(piggies, baseROI) {
  return `
    <div class="piggies-list">
      ${piggies.map((piggy) => renderPiggyCard(piggy, baseROI)).join('')}
    </div>
  `;
}

function renderPiggyCard(piggy, baseROI) {
  const totalROI = baseROI + (piggy.extra_roi_bonus || 0);
  const projectedReturn = piggy.investment_amount * (1 + totalROI);

  return `
    <div class="piggy-card card card--interactive" data-piggy-id="${piggy.id}">
      <div class="piggy-card__header">
        <div class="piggy-card__avatar">
          <!-- <span style="font-size: 36px;">🐷</span> -->
          <img src="pig1.png" alt="Piggy" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />
        </div>
        <div class="piggy-card__info">
          <div class="piggy-card__name">${piggy.name}</div>
          <div class="piggy-card__status">
            ${piggy.isComplete
      ? '<span class="badge badge--success">Listo para liquidar</span>'
      : `<span class="badge badge--primary">${piggy.daysLeft} días restantes</span>`
    }
          </div>
        </div>
        ${piggy.extra_roi_bonus > 0 ? `
          <span class="badge badge--warning">+${(piggy.extra_roi_bonus * 100).toFixed(0)}%</span>
        ` : ''}
      </div>

      <div class="piggy-card__progress">
        <div class="piggy-card__progress-header">
          <span class="text-sm text-muted">Progreso del ciclo</span>
          <span class="text-sm font-semibold">${piggy.progress}%</span>
        </div>
        <div class="progress">
          <div class="progress__bar" style="width: ${piggy.progress}%;"></div>
        </div>
      </div>

      <div class="piggy-card__stats grid-2">
        <div>
          <div class="text-xs text-muted">Peso actual</div>
          <div class="font-semibold">${piggy.currentWeight} kg</div>
        </div>
        <div>
          <div class="text-xs text-muted">Margen Comercial Estimado</div>
          <div class="font-semibold text-primary">${formatCOP(projectedReturn)}</div>
          ${piggy.extra_roi_bonus > 0 ? `<div class="text-xs" style="font-size:10px; color:var(--color-warning);">Incluye bono extra +${(piggy.extra_roi_bonus * 100).toFixed(0)}%</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ... renderBottomNav remains the same ...
export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Navegación principal">
      <a href="#/granja" class="bottom-nav__item ${activeTab === 'granja' ? 'bottom-nav__item--active' : ''}" id="nav-granja">
        <span class="bottom-nav__icon">${renderIcon('farm', '', '24')}</span>
        <span>Granja</span>
      </a>
      <a href="#/mercado" class="bottom-nav__item ${activeTab === 'mercado' ? 'bottom-nav__item--active' : ''}" id="nav-mercado">
        <span class="bottom-nav__icon">${renderIcon('shop', '', '24')}</span>
        <span>Mercado</span>
      </a>
      <a href="#/aliados" class="bottom-nav__item ${activeTab === 'aliados' ? 'bottom-nav__item--active' : ''}" id="nav-aliados">
        <span class="bottom-nav__icon">${renderIcon('people', '', '24')}</span>
        <span>Aliados</span>
      </a>
    </nav>
  `;
}

/**
 * Attach event listeners.
 */
function attachGranjaListeners(hasPiggies, stats) {
  // Piggy card click
  document.querySelectorAll('.piggy-card').forEach((card) => {
    card.addEventListener('click', () => {
      const piggyId = card.dataset.piggyId;
      navigateTo(`piggy/${piggyId}`);
    });
  });

  // Bonus Banner click
  document.getElementById('bonus-banner')?.addEventListener('click', () => {
    showBonusModal(hasPiggies);
  });

  // Wallet Actions
  document.getElementById('btn-withdraw')?.addEventListener('click', () => {
     showWithdrawModal(stats?.disponible || 0);
  });

  document.getElementById('btn-meat')?.addEventListener('click', () => {
     showMeatModal();
  });
}

/**
 * Show Bonus Modal
 */
function showBonusModal(hasPiggies) {
  // Remove existing
  removeBonusModal();

  const modal = document.createElement('div');
  modal.id = 'bonus-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal bonus-modal animate-scale-in">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="bonus-close-btn">${renderIcon('close', '', '24')}</button>
        
        <div class="bonus-header">
            <!-- Image removed for cleaner look -->
            <h3 class="bonus-title text-center mt-lg">BONO DE BIENVENIDA</h3>
            <p class="text-center text-primary font-bold text-lg">$50.000 PESOS EN CONSUMO DE CARNE</p>
        </div>

        <div class="bonus-content mt-md" style="flex: 2;">
            <h4 class="font-bold mb-sm">Términos y Condiciones: Bono de Bienvenida</h4>
            
            <div class="bonus-text-scroll">
                <p><strong>1. Definición del Beneficio:</strong><br/>
                PIGGY otorga un Bono de Consumo por valor de CINCUENTA MIL PESOS M/CTE ($50.000 COP) a todo usuario nuevo que complete satisfactoriamente el registro en la plataforma y realice su primera adopción de un "Piggy" (pago único de $1.000.000 COP).</p>

                <p><strong>2. Condiciones de Redención:</strong><br/>
                Para hacer efectivo el bono, el usuario deberá realizar un pedido de productos cárnicos a través de Granja Villa Morales, bajo las siguientes condiciones:</p>
                <ul>
                    <li><strong>Compra Mínima:</strong> El valor del pedido debe ser igual o superior a CIENTO CINCUENTA MIL PESOS M/CTE ($150.000 COP), sin incluir costos de envío.</li>
                    <li><strong>Aplicación del Bono:</strong> Una vez cumplido el monto mínimo, el bono de $50.000 se restará del valor total a pagar por los productos.</li>
                    <li><strong>Alcance de Productos:</strong> El beneficio es válido exclusivamente para la compra de proteína animal: Cerdo, Pollo y Res. No aplica para otros servicios o productos dentro de la plataforma.</li>
                </ul>

                <p><strong>3. Política de Envíos y Logística:</strong></p>
                <ul>
                    <li><strong>Cali:</strong> El servicio de domicilio será completamente gratuito unicamente para entregas dentro del perímetro urbano de la ciudad de Cali.</li>
                    <li><strong>Otras Ubicaciones:</strong> Para entregas en municipios aledaños (Jamundí, Palmira, Yumbo, etc.) o en el resto del territorio nacional, el USUARIO deberá asumir el 100% del costo del envío, el cual se cotizará según la ubicación y el peso del pedido.</li>
                </ul>

                <p><strong>4. Vigencia y Restricciones:</strong></p>
                <ul>
                    <li>El bono es personal, intransferible y no es canjeable por dinero en efectivo.</li>
                    <li>Solo se permite la redención de un (1) bono por usuario único y por la primera compra de activo productivo.</li>
                    <li>El bono tendrá una vigencia de 30 días calendario a partir del momento de la confirmación de la primera compra del piggy inicial.</li>
                </ul>
            </div>
        </div>

        <div class="bonus-footer mt-lg">
            <button class="btn btn--primary btn--block" id="btn-redeem-bonus">
                ${hasPiggies ? 'Redimir Bono Ahora' : '¡Redime tu bono $50.000!'}
            </button>
            ${!hasPiggies ? '<p class="text-xs text-center mt-sm text-muted">Debes tener un Piggy activo para redimir.</p>' : ''}
        </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close logic
  const close = () => modal.remove();
  document.getElementById('bonus-close-btn').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // Action logic
  document.getElementById('btn-redeem-bonus').addEventListener('click', () => {
    close();
    if (hasPiggies) {
      navigateTo('mercado');
    } else {
      // If no piggies, go to adoption to "Activate" the bonus
      navigateTo('adopcion');
    }
  });
}

function removeBonusModal() {
  const existing = document.getElementById('bonus-modal');
  if (existing) existing.remove();
}

/* =========================================
   WALLET MODALS
   ========================================= */

function showWithdrawModal(availableAmount) {
  // Remove existing
  const existing = document.getElementById('withdraw-modal');
  if (existing) existing.remove();

  const minWithdraw = 10000;
  
  const modal = document.createElement('div');
  modal.id = 'withdraw-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal animate-scale-in">
        <div class="modal__handle"></div>
        <button class="bonus-close" id="withdraw-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
        
        <h3 class="modal-title mb-md">Retiro de Fondos</h3>
        
        <div class="form-group">
            <label class="form-label">Monto a retirar</label>
            <div class="input-wrapper" style="position:relative;">
                <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#999;">$</span>
                <input type="number" id="withdraw-amount" class="form-input" style="padding-left:30px; width:100%; box-sizing:border-box;" placeholder="0" min="${minWithdraw}" max="${availableAmount}">
                <button type="button" id="btn-withdraw-all" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--color-primary); font-weight:600; cursor:pointer;">Todo</button>
            </div>
            <div class="text-xs text-muted mt-sm">Disponible: ${formatCOP(availableAmount)} • Mínimo: ${formatCOP(minWithdraw)}</div>
            <div id="withdraw-error" class="text-xs" style="color:var(--color-danger); margin-top:4px; display:none;"></div>
        </div>

        <div class="form-group">
            <label class="form-label">Banco de destino</label>
            <select id="withdraw-bank" class="form-input" style="width:100%;">
                <option value="">Selecciona un banco</option>
                <option value="nequi">Nequi</option>
                <option value="bancolombia">Bancolombia</option>
                <option value="pse">PSE / Otros Bancos</option>
            </select>
        </div>

        <div class="form-group" style="display:flex; align-items:flex-start; gap:8px;">
            <input type="checkbox" id="withdraw-terms" style="margin-top:4px;">
            <label for="withdraw-terms" class="text-sm text-muted">He leído y acepto los términos y condiciones para efectuar retiros, incluyendo el tiempo de procesamiento de 3 días hábiles.</label>
        </div>

        <button class="btn btn--primary btn--block btn--disabled" id="btn-solicitar-retiro" disabled style="width:100%; margin-top:16px;">Solicitar Retiro</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Logic
  const amountInput = document.getElementById('withdraw-amount');
  const bankInput = document.getElementById('withdraw-bank');
  const termsInput = document.getElementById('withdraw-terms');
  const submitBtn = document.getElementById('btn-solicitar-retiro');
  const errorDiv = document.getElementById('withdraw-error');

  const validate = () => {
    const amount = parseFloat(amountInput.value) || 0;
    const bank = bankInput.value;
    const terms = termsInput.checked;
    
    let valid = true;
    let errorMsg = '';

    if (amount < minWithdraw) {
        valid = false;
        if(amount > 0) errorMsg = `El monto mínimo es ${formatCOP(minWithdraw)}`;
    } else if (amount > availableAmount) {
        valid = false;
        errorMsg = 'Fondos insuficientes';
    }

    if(errorMsg) {
        errorDiv.textContent = errorMsg;
        errorDiv.style.display = 'block';
    } else {
        errorDiv.style.display = 'none';
    }

    if (valid && bank && terms) {
        submitBtn.classList.remove('btn--disabled');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    } else {
        submitBtn.classList.add('btn--disabled');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
  };

  amountInput.addEventListener('input', validate);
  bankInput.addEventListener('change', validate);
  termsInput.addEventListener('change', validate);

  // Todo Button
  document.getElementById('btn-withdraw-all').addEventListener('click', () => {
      amountInput.value = availableAmount;
      validate();
  });

  // Close
  const close = () => modal.remove();
  document.getElementById('withdraw-close-btn').addEventListener('click', close);
  
  // Submit
  submitBtn.addEventListener('click', () => {
     showWithdrawSuccess(amountInput.value, bankInput.options[bankInput.selectedIndex].text);
     close();
  });
}

function showWithdrawSuccess(amount, bank) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
        <div class="modal animate-scale-in text-center">
             <button class="bonus-close" id="success-close-x" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
            <div style="width:60px; height:60px; background:var(--color-success-light); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
                ${renderIcon('check', '', '32')}
            </div>
            <h3 class="modal-title">Solicitud Recibida</h3>
            <p class="text-muted mb-md">Tu solicitud de retiro por <strong>${formatCOP(parseFloat(amount))}</strong> a <strong>${bank}</strong> ha sido generada.</p>
            
            <div class="card bg-gray-50 mb-md text-left p-sm text-sm" style="background:#f9fafb; padding:12px; border-radius:8px; margin-bottom:16px;">
                <div><strong>Comprobante:</strong> #RET-${Date.now().toString().slice(-6)}</div>
                <div><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</div>
                <div><strong>Estado:</strong> En Proceso</div>
            </div>

            <p class="text-xs text-muted mb-lg" style="margin-bottom:24px;">
                Recuerda que a partir de este momento comienzan a correr los 3 días hábiles.
                Para agilizar, escríbenos al WhatsApp y envía este comprobante.
            </p>

            <a href="https://wa.me/573154870448?text=Hola,%20solicito%20mi%20retiro%20%23RET-${Date.now().toString().slice(-6)}%20por%20valor%20de%20${formatCOP(parseFloat(amount))}" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; text-decoration:none;">
                ${renderIcon('whatsapp', '', '20')} Contactar soporte personalizado
            </a>
            <button class="btn btn--text btn--block mt-sm" id="success-close" style="width:100%; margin-top:8px;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('success-close').addEventListener('click', () => modal.remove());
    document.getElementById('success-close-x').addEventListener('click', () => modal.remove());
}

function showMeatModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
        <div class="modal animate-scale-in text-center">
            <button class="bonus-close" id="meat-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
            
            <h3 class="modal-title mb-md">Disfruta tu cosecha 🥩</h3>
            <p class="text-muted mb-lg" style="margin-bottom:24px;">
                Escríbenos para brindarte una atención personalizada y coordinar tu pedido de carne fresca de Granja Villa Morales.
            </p>

            <div class="grid-2 gap-sm" style="display:grid; gap:12px;">
                <a href="https://wa.me/573154870448?text=Hola,%20quiero%20redimir%20mis%20ganancias%20en%20carne" target="_blank" class="btn btn--success btn--block" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none;">
                    ${renderIcon('whatsapp', '', '20')} WhatsApp
                </a>
                <a href="#" class="btn btn--secondary btn--block" style="text-decoration:none; display:flex; align-items:center; justify-content:center;">
                   Ver Catálogo
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('meat-close-btn').addEventListener('click', () => modal.remove());
}
