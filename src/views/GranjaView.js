/* ============================================
   PIGGY APP — Granja (Dashboard) View
   Matches screen2.png design
   ============================================ */

import { renderIcon } from '../icons.js';
import { AppState } from '../state.js';
import { getUserPiggies, getDashboardStats, formatCOP } from '../services/piggiesService.js';
import { navigateTo } from '../router.js';
import { signOut } from '../services/authService.js';

// ... imports remain the same

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
        <h2 class="granja-title">Granja Piggy</h2>

        <!-- Stats Skeleton -->
        <div class="section animate-fade-in-up">
          <div class="stat-card" style="margin-bottom:var(--space-md);">
            <div>
              <div class="stat-card__label">Compra Activa</div>
              <div class="stat-card__value">
                <span class="skeleton" style="display:inline-block;width:40px;height:28px;"></span>
              </div>
            </div>
            <div class="stat-card__icon">
              <span style="font-size: 28px;">🐷</span>
            </div>
          </div>
          
          <div class="stat-card">
              <div>
                <div class="stat-card__label">Wallet Piggy</div>
                <div class="stat-card__value stat-card__value--accent">
                  <span class="skeleton" style="display:inline-block;width:120px;height:24px;"></span>
                </div>
              </div>
              <div class="stat-card__icon" style="background:var(--color-success-light);color:var(--color-success);">
                 ${renderIcon('dollar', '', '24')}
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

    attachGranjaListeners(piggies.length > 0);
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
        <h2 class="granja-title animate-fade-in-up">Granja Piggy</h2>

        <!-- Stats -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.1s;">
          <!-- Compra Activa -->
          <div class="stat-card" style="margin-bottom:var(--space-md);">
            <div>
              <div class="stat-card__label">Compra Activa</div>
              <div class="stat-card__value">${stats.activeCount}</div>
              <div class="stat-card__subtext mt-sm text-xs text-muted">
                En engorde: <strong>${stats.activeCount}</strong> • Finalizados: <strong>${stats.finishedCount}</strong>
              </div>
            </div>
            <div class="stat-card__icon">
              <span style="font-size: 28px;">🐷</span>
            </div>
          </div>
          
          <!-- Wallet Piggy -->
          <div class="stat-card">
            <div>
              <div class="stat-card__label">Wallet Piggy</div>
              <div class="stat-card__value stat-card__value--accent">${stats.walletPiggyTotalFormatted}</div>
              <div class="text-xs text-muted mt-sm">Disponible al finalizar ciclo</div>
            </div>
            <div class="stat-card__icon" style="background:var(--color-success-light);color:var(--color-success);">
               ${renderIcon('dollar', '', '24')}
            </div>
          </div>
        </div>

        <!-- ROI Info -->
        ${stats.activeCount > 0 ? `
          <div class="roi-info animate-fade-in-up" style="animation-delay: 0.15s;">
            ${renderIcon('trendUp', 'roi-info__icon', '16')}
            <span>Tu ROI base actual: <strong class="text-primary">${stats.baseROIFormatted}</strong></span>
          </div>
        ` : ''}

        <!-- Mis Cerdos -->
        <div class="section animate-fade-in-up" style="animation-delay: 0.2s;">
          <div class="section__header">
            <h3 class="section__title">Mis Cerdos</h3>
            <a href="#" class="section__link">
              Ver historial ${renderIcon('arrowRight', '', '14')}
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
        <span style="font-size: 32px;">🐷</span>
      </div>
      <div class="empty-state__title">No tienes piggys aún</div>
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
          <span style="font-size: 36px;">🐷</span>
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
          <div class="text-xs text-muted">Retorno estimado</div>
          <div class="font-semibold text-primary">${formatCOP(projectedReturn)}</div>
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
function attachGranjaListeners(hasPiggies) {
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
            <div class="bonus-image-placeholder">
                <span style="font-size: 64px;">🏡🐷</span>
            </div>
            <h3 class="bonus-title text-center mt-md">BONO DE BIENENIDA</h3>
            <p class="text-center text-primary font-bold text-lg">$50.000 COP</p>
        </div>

        <div class="bonus-content mt-lg">
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
            <button class="btn btn--primary btn--block" id="btn-redeem-bonus" ${!hasPiggies ? 'disabled title="Debes comprar tu primer Piggy para activar este bono"' : ''}>
                ${hasPiggies ? 'Redimir Bono Ahora' : 'Comprar Piggy para Activar'}
            </button>
            ${!hasPiggies ? '<p class="text-xs text-center mt-sm text-muted">El botón se activará automáticamente tras tu primera compra.</p>' : ''}
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
  if (hasPiggies) {
      document.getElementById('btn-redeem-bonus').addEventListener('click', () => {
          close();
          navigateTo('mercado');
      });
  }
}

function removeBonusModal() {
    const existing = document.getElementById('bonus-modal');
    if (existing) existing.remove();
}