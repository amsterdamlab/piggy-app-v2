/* ============================================
   PIGGY APP — Interactive Onboarding Tour Modal
   5-step guided tour + Final Brand Pop-up Modal.
   Features 100% crisp unblurred spotlighting.
   ============================================ */

import { shouldShowOnboardingTour, markOnboardingTourAsCompleted } from '../../services/onboardingTourService.js';

let _currentStepIndex = 0;
let _tourOverlayEl = null;
let _currentHighlightedEl = null;
let _savedElementStyles = null;

const TOUR_STEPS = [
    {
        selector: '#granja-header',
        fallbackSelector: '.granja-greeting',
        title: 'Mi perfil',
        icon: '👤',
        description: 'Aquí encuentras toda tu información personal, invitar amigos, centro de ayuda y términos y condiciones.',
        positionPreference: 'below',
    },
    {
        selector: '#wallet-banner',
        fallbackSelector: '.wallet-banner-card',
        title: 'Cuenta Agro',
        icon: '💳',
        description: 'Aquí ves tu saldo actual. Puedes recargar dinero para comprar nuevos Piggys o solicitar retiros de tu saldo comercial y bonos de consumo.',
        positionPreference: 'below',
    },
    {
        selector: '#piggies-carousel-section',
        fallbackSelector: '#piggies-section',
        title: 'Mis Piggys',
        icon: '🐷',
        description: 'Aquí verás crecer tus Piggys durante su ciclo de engorde y cómo se acumulan tus comisiones comerciales.',
        positionPreference: 'auto',
    },
    {
        selector: '#mission-banner-container',
        fallbackSelector: '#mission-banner',
        title: 'Misiones',
        icon: '🎁',
        description: 'Completa misiones para que tu granja crezca con bonanza, accede a bonos de bienvenida y descuentos de nuestra comunidad.',
        positionPreference: 'above',
    },
    {
        selector: '#granja-bottom-nav',
        fallbackSelector: '.bottom-nav',
        title: 'Menú Principal',
        icon: '🧭',
        description: 'Visita el Mercado para comprar más Piggys. Conoce nuestra Tienda de cárnicos o accede a beneficios en nuestra comunidad de aliados.',
        positionPreference: 'above_nav',
    },
];

/**
 * Initialize and launch the onboarding tour if the user is eligible.
 */
export async function startOnboardingTourIfEligible() {
    window._startPiggyOnboardingTour = startTour;

    const isEligible = await shouldShowOnboardingTour();
    if (!isEligible) return;

    // Small delay to ensure all dynamic elements are mounted in DOM
    setTimeout(() => {
        startTour();
    }, 600);
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
}

function createTourOverlay() {
    _tourOverlayEl = document.createElement('div');
    _tourOverlayEl.id = 'piggy-onboarding-tour-root';
    _tourOverlayEl.style.cssText = `
        position: fixed; inset: 0; z-index: 100000;
        background: rgba(15, 23, 42, 0.82);
        pointer-events: auto; overflow: hidden;
        font-family: inherit; transition: opacity 0.3s ease;
    `;
    document.body.appendChild(_tourOverlayEl);
}

function clearPreviousHighlight() {
    if (_currentHighlightedEl && _savedElementStyles) {
        _currentHighlightedEl.style.position = _savedElementStyles.position;
        _currentHighlightedEl.style.zIndex = _savedElementStyles.zIndex;
        _currentHighlightedEl.style.boxShadow = _savedElementStyles.boxShadow;
        _currentHighlightedEl.style.borderRadius = _savedElementStyles.borderRadius;
        _currentHighlightedEl.style.transition = _savedElementStyles.transition;
        _currentHighlightedEl.style.background = _savedElementStyles.background;
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
    };

    const computedPos = window.getComputedStyle(el).position;
    if (computedPos === 'static') {
        el.style.position = 'relative';
    }
    el.style.zIndex = '100001';
    el.style.boxShadow = '0 0 0 4px #b80049, 0 0 30px 4px rgba(184, 0, 73, 0.7)';
    el.style.borderRadius = el.style.borderRadius || '16px';
    el.style.transition = 'box-shadow 0.3s ease, z-index 0.3s ease';
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
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        highlightElement(targetEl);
    }

    // Delay target rect calculation slightly to wait for smooth scroll to settle
    setTimeout(() => {
        const targetRect = targetEl ? targetEl.getBoundingClientRect() : null;
        const totalSteps = TOUR_STEPS.length;
        const isFirst = index === 0;

        _tourOverlayEl.innerHTML = `
            <!-- Tooltip Card -->
            <div id="tour-tooltip-card" style="
                position: absolute;
                z-index: 100002;
                left: 50%;
                transform: translateX(-50%);
                ${getTooltipPositionStyles(targetRect, step.positionPreference)}
                width: calc(100% - 32px);
                max-width: 380px;
                background: white;
                border-radius: 20px;
                padding: 20px 22px;
                box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.08);
                animation: tourCardFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <!-- Header Badges -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span style="
                        background: #fff1f2; color: #be123c; font-weight: 800;
                        font-size: 0.68rem; padding: 4px 10px; border-radius: 20px;
                        letter-spacing: 1px; text-transform: uppercase;
                    ">
                        PASO ${index + 1} DE ${totalSteps}
                    </span>

                    <button id="btn-tour-skip" style="
                        background: none; border: none; color: #94a3b8;
                        font-size: 0.78rem; font-weight: 600; cursor: pointer;
                        padding: 2px 6px; border-radius: 6px; transition: color 0.15s;
                    " onmouseover="this.style.color='#64748b';" onmouseout="this.style.color='#94a3b8';">
                        Omitir tour ✕
                    </button>
                </div>

                <!-- Title -->
                <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span>${step.icon}</span>
                    <span>${step.title}</span>
                </div>

                <!-- Description -->
                <div style="font-size: 0.84rem; color: #475569; line-height: 1.45; margin-bottom: 18px;">
                    ${step.description}
                </div>

                <!-- Footer Controls -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                    <div>
                        ${!isFirst ? `
                            <button id="btn-tour-prev" style="
                                background: #f1f5f9; color: #475569; border: none;
                                padding: 8px 14px; border-radius: 10px; font-weight: 700;
                                font-size: 0.82rem; cursor: pointer; transition: background 0.15s;
                            ">
                                ← Anterior
                            </button>
                        ` : '<div></div>'}
                    </div>

                    <button id="btn-tour-next" style="
                        background: linear-gradient(135deg, #b80049 0%, #880036 100%);
                        color: white; border: none; padding: 9px 20px; border-radius: 10px;
                        font-weight: 800; font-size: 0.85rem; cursor: pointer;
                        box-shadow: 0 4px 14px rgba(184, 0, 73, 0.35); transition: transform 0.15s;
                    ">
                        ${index === totalSteps - 1 ? 'Finalizar →' : 'Siguiente →'}
                    </button>
                </div>
            </div>
        `;

        attachStepListeners(index);
    }, 150);
}

function getTooltipPositionStyles(targetRect, preference) {
    if (!targetRect) {
        return 'top: 50%; transform: translate(-50%, -50%);';
    }

    const windowHeight = window.innerHeight;

    if (preference === 'above_nav') {
        return 'bottom: 85px;';
    }

    if (preference === 'below') {
        const topPos = Math.min(windowHeight - 230, targetRect.bottom + 14);
        return `top: ${Math.max(16, topPos)}px;`;
    }

    if (preference === 'above') {
        const bottomPos = Math.max(16, windowHeight - targetRect.top + 14);
        return `bottom: ${bottomPos}px;`;
    }

    // Auto positioning
    const spaceBelow = windowHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow >= 220 || spaceBelow > spaceAbove) {
        const topPos = Math.min(windowHeight - 230, targetRect.bottom + 14);
        return `top: ${Math.max(16, topPos)}px;`;
    } else {
        const bottomPos = Math.max(16, windowHeight - targetRect.top + 14);
        return `bottom: ${bottomPos}px;`;
    }
}

function attachStepListeners(currentIndex) {
    const btnSkip = document.getElementById('btn-tour-skip');
    const btnPrev = document.getElementById('btn-tour-prev');
    const btnNext = document.getElementById('btn-tour-next');

    if (btnSkip) {
        btnSkip.addEventListener('click', () => {
            finishTour();
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (_currentStepIndex > 0) {
                _currentStepIndex--;
                renderStep(_currentStepIndex);
            }
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            _currentStepIndex++;
            renderStep(_currentStepIndex);
        });
    }
}

/**
 * Render Final Pop-up Brand Modal (Paso Final)
 */
function renderFinalModal() {
    clearPreviousHighlight();

    _tourOverlayEl.innerHTML = `
        <!-- Centered Modal Card -->
        <div style="
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: calc(100% - 36px); max-width: 400px;
            background: white; border-radius: 24px; padding: 28px 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            text-align: center; z-index: 100002;
            animation: tourScaleUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        ">
            <!-- Icon Favicon -->
            <div style="
                width: 68px; height: 68px; background: #fff1f2;
                border-radius: 20px; display: flex; align-items: center;
                justify-content: center; margin: 0 auto 16px auto;
                box-shadow: 0 10px 20px -5px rgba(184, 0, 73, 0.2);
            ">
                <img src="/piggy-favicon.svg" alt="Piggy Logo" style="width: 44px; height: 44px; object-fit: contain;" />
            </div>

            <!-- Title -->
            <div style="font-size: 1.3rem; font-weight: 900; color: #0f172a; margin-bottom: 8px;">
                Mi Granja Piggy
            </div>

            <!-- Subtitle Explicación -->
            <div style="font-size: 0.9rem; color: #475569; line-height: 1.5; font-weight: 600; margin-bottom: 20px;">
                Crece junto a nosotros con respaldo 100% en carne real.
            </div>

            <!-- Valle Morales Badge -->
            <div style="
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0; border-radius: 14px;
                padding: 12px 16px; margin-bottom: 24px;
                display: flex; align-items: center; justify-content: center; gap: 10px;
            ">
                <span style="font-size: 1.2rem;">🐖</span>
                <div style="text-align: left;">
                    <div style="font-weight: 800; font-size: 0.82rem; color: #1e293b;">Valle Morales</div>
                    <div style="font-size: 0.74rem; color: #059669; font-weight: 700;">+10 años en el sector porcino</div>
                </div>
            </div>

            <!-- Action Button -->
            <button id="btn-tour-finish-final" style="
                width: 100%;
                background: linear-gradient(135deg, #b80049 0%, #880036 100%);
                color: white; border: none; padding: 14px 24px; border-radius: 14px;
                font-weight: 800; font-size: 0.95rem; cursor: pointer;
                box-shadow: 0 8px 20px -4px rgba(184, 0, 73, 0.4);
                transition: transform 0.15s;
            ">
                ¡Comenzar Experiencia! 🚀
            </button>
        </div>
    `;

    const finishBtn = document.getElementById('btn-tour-finish-final');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            finishTour();
        });
    }
}

/**
 * Complete and close tour permanently.
 */
function finishTour() {
    markOnboardingTourAsCompleted();
    clearPreviousHighlight();
    removeExistingOverlay();
}
