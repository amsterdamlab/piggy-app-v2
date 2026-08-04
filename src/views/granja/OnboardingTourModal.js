/* ============================================
   PIGGY APP — Interactive Onboarding Tour Modal
   5-step guided tour + Final Brand Pop-up Modal.
   Clean, compact cards without overlap or blur.
   Includes transparent click-catcher for 100% click blocking.
   ============================================ */

import { shouldShowOnboardingTour, markOnboardingTourAsCompleted } from '../../services/onboardingTourService.js';

let _currentStepIndex = 0;
let _tourOverlayEl = null;
let _clickCatcherEl = null;
let _currentHighlightedEl = null;
let _savedElementStyles = null;

const TOUR_STEPS = [
    {
        selector: '#granja-header',
        fallbackSelector: '.granja-greeting',
        title: 'Mi perfil',
        icon: '👤',
        description: 'Aquí encuentras toda tu información personal, invitar amigos, centro de ayuda y términos y condiciones.',
        positionType: 'header_top',
    },
    {
        selector: '#wallet-banner',
        fallbackSelector: '.wallet-banner-card',
        title: 'Cuenta Agro',
        icon: '💳',
        description: 'Aquí ves tu saldo disponible para comprar Piggys, solicitar retiros de tu saldo comercial y bonos de consumo.',
        positionType: 'wallet_below',
    },
    {
        selector: '#mis-piggies-header',
        fallbackSelector: '#mis-piggies-section',
        title: 'Mis Piggys',
        icon: '🐷',
        description: 'Monitorea el crecimiento de tu granja y tus comisiones en tiempo real.',
        positionType: 'piggies_strip_below',
    },
    {
        selector: '#mission-banner-container',
        fallbackSelector: '#mission-banner',
        title: 'Misiones',
        icon: '🎁',
        description: 'Completa misiones para ganar bonos, descuentos y acelerar tu granja.',
        positionType: 'missions_above',
    },
    {
        selector: '#granja-bottom-nav',
        fallbackSelector: '.bottom-nav',
        title: 'Menú Principal',
        icon: '🏡',
        description: 'Explora el Mercado, la Tienda de cárnicos y nuestra red de Aliados.',
        positionType: 'nav_above',
    },
];

/**
 * Initialize and launch the onboarding tour if eligible or forced.
 */
export async function startOnboardingTourIfEligible() {
    window._startPiggyOnboardingTour = forceStartTour;

    // Check if user clicked "Ver Tutorial de Inicio" in Mi Perfil
    if (window._forceLaunchOnboardingTour === true) {
        window._forceLaunchOnboardingTour = false;
        setTimeout(() => { startTour(); }, 200);
        return;
    }

    const isEligible = await shouldShowOnboardingTour();
    if (!isEligible) return;

    setTimeout(() => {
        startTour();
    }, 500);
}

/**
 * Force start the tour anytime (for manual testing).
 */
export function forceStartTour() {
    localStorage.removeItem('piggy_onboarding_completed');
    startTour();
}

/**
 * Start the step-by-step tour.
 */
export function startTour() {
    _currentStepIndex = 0;
    clearPreviousHighlight();
    removeExistingOverlay();
    createTourOverlay();
    renderStep(_currentStepIndex);
}

function removeExistingOverlay() {
    const existing = document.getElementById('piggy-onboarding-tour-root');
    if (existing) existing.remove();
    if (_clickCatcherEl) {
        _clickCatcherEl.remove();
        _clickCatcherEl = null;
    }
}

function createTourOverlay() {
    _tourOverlayEl = document.createElement('div');
    _tourOverlayEl.id = 'piggy-onboarding-tour-root';
    _tourOverlayEl.style.cssText = `
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(15, 23, 42, 0.82);
        pointer-events: auto; overflow: hidden;
        font-family: inherit; transition: opacity 0.3s ease;
    `;
    document.body.appendChild(_tourOverlayEl);

    // Create transparent click blocker layer over focused element
    _clickCatcherEl = document.createElement('div');
    _clickCatcherEl.id = 'piggy-tour-click-catcher';
    _clickCatcherEl.style.cssText = `
        position: fixed; z-index: 99999; background: transparent;
        pointer-events: auto; cursor: default; display: none;
    `;
    _clickCatcherEl.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, true);
    _clickCatcherEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, true);
    document.body.appendChild(_clickCatcherEl);
}

function clearPreviousHighlight() {
    if (_clickCatcherEl) {
        _clickCatcherEl.style.display = 'none';
    }

    if (_currentHighlightedEl && _savedElementStyles) {
        _currentHighlightedEl.style.position = _savedElementStyles.position;
        _currentHighlightedEl.style.zIndex = _savedElementStyles.zIndex;
        _currentHighlightedEl.style.boxShadow = _savedElementStyles.boxShadow;
        _currentHighlightedEl.style.borderRadius = _savedElementStyles.borderRadius;
        _currentHighlightedEl.style.transition = _savedElementStyles.transition;
        _currentHighlightedEl.style.background = _savedElementStyles.background;
        _currentHighlightedEl.style.padding = _savedElementStyles.padding;
        _currentHighlightedEl = null;
        _savedElementStyles = null;
    }
}

function highlightElement(el) {
    clearPreviousHighlight();
    if (!el) return;

    _currentHighlightedEl = el;
    _savedElementStyles = {
        position: el.style.position || '',
        zIndex: el.style.zIndex || '',
        boxShadow: el.style.boxShadow || '',
        borderRadius: el.style.borderRadius || '',
        transition: el.style.transition || '',
        background: el.style.background || '',
        padding: el.style.padding || '',
    };

    const computedPos = window.getComputedStyle(el).position;
    if (computedPos === 'static') {
        el.style.position = 'relative';
    }
    el.style.zIndex = '99999';

    // Ensure transparent/un-styled headers have a solid white background & padding to be 100% visible
    const computedBg = window.getComputedStyle(el).backgroundColor;
    const isTransparent = computedBg === 'rgba(0, 0, 0, 0)' || computedBg === 'transparent';

    if (el.id === 'mis-piggies-header') {
        el.style.background = '#ffffff';
        el.style.padding = '10px 16px';
        el.style.borderRadius = '16px';
    } else if (el.id === 'granja-header') {
        el.style.background = '#ffffff';
        el.style.padding = '10px 14px';
        el.style.borderRadius = '18px';
    } else if (isTransparent && !el.style.background) {
        el.style.background = '#ffffff';
        el.style.padding = '8px 12px';
        el.style.borderRadius = '16px';
    } else {
        el.style.borderRadius = el.style.borderRadius || '16px';
    }

    el.style.boxShadow = '0 0 0 4px #b80049, 0 12px 35px rgba(0, 0, 0, 0.4)';
    el.style.transition = 'all 0.3s ease';
}

function renderStep(index) {
    if (index >= TOUR_STEPS.length) {
        renderFinalModal();
        return;
    }

    const step = TOUR_STEPS[index];
    const targetEl = document.querySelector(step.selector) || document.querySelector(step.fallbackSelector);

    clearPreviousHighlight();

    if (targetEl) {
        if (step.positionType === 'header_top') {
            window.scrollTo({ top: 0, behavior: 'instant' });
        } else if (step.positionType === 'wallet_below') {
            targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
        } else if (step.positionType === 'piggies_strip_below' || step.positionType === 'missions_above') {
            targetEl.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
        highlightElement(targetEl);
    }

    setTimeout(() => {
        const targetRect = targetEl ? targetEl.getBoundingClientRect() : null;
        const totalSteps = TOUR_STEPS.length;
        const isFirst = index === 0;

        // Position transparent click catcher over target element to block clicks inside focused area
        if (targetRect && _clickCatcherEl) {
            _clickCatcherEl.style.top = `${targetRect.top}px`;
            _clickCatcherEl.style.left = `${targetRect.left}px`;
            _clickCatcherEl.style.width = `${targetRect.width}px`;
            _clickCatcherEl.style.height = `${targetRect.height}px`;
            _clickCatcherEl.style.display = 'block';
        }

        _tourOverlayEl.innerHTML = `
            <!-- Tooltip Card (Guaranteed z-index: 100000) -->
            <div id="tour-tooltip-card" style="
                position: fixed;
                z-index: 100000;
                left: 50%;
                transform: translateX(-50%);
                ${getTooltipPositionStyles(targetRect, step.positionType)}
                width: calc(100% - 36px);
                max-width: 330px;
                background: white;
                border-radius: 18px;
                padding: 16px 18px;
                box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.08);
                animation: tourCardFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <!-- Header Badges -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="
                        background: #fff1f2; color: #be123c; font-weight: 800;
                        font-size: 0.65rem; padding: 3px 8px; border-radius: 20px;
                        letter-spacing: 0.5px; text-transform: uppercase;
                    ">
                        PASO ${index + 1} DE ${totalSteps}
                    </span>

                    <button id="btn-tour-skip" style="
                        background: none; border: none; color: #94a3b8;
                        font-size: 0.78rem; font-weight: 600; cursor: pointer;
                        padding: 2px 4px; border-radius: 6px; transition: color 0.15s;
                    " onmouseover="this.style.color='#64748b';" onmouseout="this.style.color='#94a3b8';">
                        Omitir
                    </button>
                </div>

                <!-- Title -->
                <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span>${step.icon}</span>
                    <span>${step.title}</span>
                </div>

                <!-- Description -->
                <p style="
                    font-size: 0.85rem; color: #475569; line-height: 1.45;
                    margin: 0 0 16px 0; font-weight: 500;
                ">
                    ${step.description}
                </p>

                <!-- Navigation Buttons -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    ${!isFirst ? `
                        <button id="btn-tour-prev" style="
                            background: #f1f5f9; color: #334155; border: none;
                            padding: 8px 14px; border-radius: 10px; font-weight: 700;
                            font-size: 0.82rem; cursor: pointer; transition: background 0.15s;
                        ">
                            ← Anterior
                        </button>
                    ` : '<div></div>'}

                    <button id="btn-tour-next" style="
                        background: #b80049; color: white; border: none;
                        padding: 9px 18px; border-radius: 12px; font-weight: 800;
                        font-size: 0.88rem; cursor: pointer;
                        box-shadow: 0 4px 12px rgba(184, 0, 73, 0.35); transition: transform 0.15s;
                    ">
                        Siguiente →
                    </button>
                </div>
            </div>
        `;

        attachTourCardListeners();
    }, 100);
}

function getTooltipPositionStyles(targetRect, positionType) {
    if (!targetRect) return 'top: 50%; transform: translate(-50%, -50%);';

    const vh = window.innerHeight;

    if (positionType === 'header_top') {
        const topPos = Math.min(targetRect.bottom + 12, vh - 200);
        return `top: ${Math.max(16, topPos)}px;`;
    }
    if (positionType === 'wallet_below') {
        const topPos = Math.min(targetRect.bottom + 12, vh - 200);
        return `top: ${Math.max(16, topPos)}px;`;
    }
    if (positionType === 'piggies_strip_below') {
        const topPos = Math.min(targetRect.bottom + 12, vh - 200);
        return `top: ${Math.max(16, topPos)}px;`;
    }
    if (positionType === 'missions_above') {
        const topPos = Math.max(16, targetRect.top - 190);
        return `top: ${topPos}px;`;
    }
    if (positionType === 'nav_above') {
        const topPos = Math.max(16, targetRect.top - 190);
        return `top: ${topPos}px;`;
    }

    return 'top: 50%; transform: translate(-50%, -50%);';
}

function attachTourCardListeners() {
    document.getElementById('btn-tour-skip')?.addEventListener('click', () => {
        completeTour();
    });

    document.getElementById('btn-tour-prev')?.addEventListener('click', () => {
        if (_currentStepIndex > 0) {
            _currentStepIndex--;
            renderStep(_currentStepIndex);
        }
    });

    document.getElementById('btn-tour-next')?.addEventListener('click', () => {
        _currentStepIndex++;
        renderStep(_currentStepIndex);
    });
}

function renderFinalModal() {
    clearPreviousHighlight();
    removeExistingOverlay();
    markOnboardingTourAsCompleted();

    const backdrop = document.createElement('div');
    backdrop.id = 'piggy-onboarding-final-modal';
    backdrop.style.cssText = `
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px); display: flex;
        align-items: center; justify-content: center; padding: 20px;
        animation: fadeIn 0.25s ease-out;
    `;

    backdrop.innerHTML = `
        <div style="
            background: white; width: 100%; max-width: 360px;
            border-radius: 24px; padding: 28px 22px 24px; text-align: center;
            position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
            animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        ">
            <!-- Icon Hero -->
            <div style="
                width: 72px; height: 72px; border-radius: 50%;
                background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 16px; font-size: 34px;
                box-shadow: 0 10px 20px -5px rgba(225, 29, 72, 0.2);
            ">
                🏡
            </div>

            <!-- Title -->
            <h2 style="
                font-size: 1.45rem; font-weight: 850; color: #0f172a;
                margin: 0 0 6px 0; letter-spacing: -0.02em; line-height: 1.2;
            ">
                ¡Bienvenido a Piggy App!
            </h2>

            <!-- Subtitle -->
            <div style="
                font-size: 0.75rem; font-weight: 800; color: #be123c;
                letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;
            ">
                +10 AÑOS EN EL SECTOR PORCINO
            </div>

            <!-- Description -->
            <p style="
                font-size: 0.88rem; color: #475569; line-height: 1.5;
                margin: 0 0 22px 0; font-weight: 500;
            ">
                Explora las funcionalidades de tu granja digital, monitorea tus cerditos y haz crecer tus comisiones.
            </p>

            <!-- CTA Button -->
            <button id="btn-final-modal-close" style="
                width: 100%; background: #b80049; color: white; border: none;
                padding: 14px 20px; border-radius: 30px; font-weight: 800;
                font-size: 1rem; cursor: pointer;
                box-shadow: 0 8px 24px -4px rgba(184, 0, 73, 0.4);
                transition: transform 0.15s, box-shadow 0.15s;
            ">
                ¡Entendido, a mi Granja! 🚀
            </button>
        </div>
    `;

    document.body.appendChild(backdrop);

    document.getElementById('btn-final-modal-close')?.addEventListener('click', () => {
        backdrop.remove();
    });
}

function completeTour() {
    clearPreviousHighlight();
    removeExistingOverlay();
    markOnboardingTourAsCompleted();
}
