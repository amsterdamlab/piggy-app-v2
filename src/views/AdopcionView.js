/* ============================================
   PIGGY APP — Adopcion (Purchase) View
   Custom view for adopting a new piggy
   ============================================ */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';
import { renderBottomNav } from './GranjaView.js';

/**
 * Render the Adopcion view.
 */
export function renderAdopcionView() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="page page--with-nav adopcion-page">
      
      <!-- Header / Back -->
      <div class="adopcion-header">
        <button class="btn btn--ghost btn--sm" id="btn-back-adopcion">
          ${renderIcon('arrowRight', '', '16')} Cancelar adopción
        </button>
      </div>

      <div class="page__content adopcion-content">
        
        <!-- Piggy Image Circle -->
        <div class="adopcion-image-wrapper animate-scale-in">
          <div class="adopcion-image">
            <img src="https://images.unsplash.com/photo-1516467508483-a7212febe31a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="New Piggy" class="adopcion-image__img" />
            <div class="adopcion-image__badge">ADOPCIÓN</div>
          </div>
        </div>

        <!-- Adoption Card -->
        <div class="adopcion-card card animate-fade-in-up">
          <h2 class="adopcion-title">¡Adopta tu Cerdito!</h2>
          <p class="adopcion-subtitle">Inicia tu adopción con $ 250.000</p>

          <!-- Inputs -->
          <div class="adopcion-form">
            <div class="input-wrapper">
              <input 
                type="text" 
                class="input-wrapper__field text-center" 
                id="piggy-name-input" 
                placeholder="Ponle un nombre a tu Piggy"
                autocomplete="off"
              />
            </div>

            <!-- Name Chips -->
            <div class="adopcion-chips">
              <button class="chip" data-name="Bacon">Bacon</button>
              <button class="chip" data-name="Piggy">Piggy</button>
              <button class="chip" data-name="Oink">Oink</button>
              <button class="chip" data-name="Rosita">Rosita</button>
            </div>

            <!-- Action Button -->
            <button class="btn btn--primary btn--block btn--lg" id="btn-adopt-confirm">
              ${renderIcon('shop', '', '20')}
              Adoptar por $ 250.000
            </button>
          </div>
        </div>

      </div>

      ${renderBottomNav('granja')}
    </div>
  `;

    attachAdopcionListeners();

    return () => { };
}

function attachAdopcionListeners() {
    // Back button (actually styling suggests left arrow, but using "Cancelar" text)
    // The icon is arrowRight in code above, but CSS flip or use proper arrowLeft if available. 
    // Wait, let's just use a simple back logic.
    document.getElementById('btn-back-adopcion')?.addEventListener('click', () => {
        navigateTo('granja');
    });

    // Name chips
    const input = document.getElementById('piggy-name-input');
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (input) {
                input.value = chip.dataset.name;
                // Highlight selected chip if we wanted to
            }
        });
    });

    // Adopt confirm
    document.getElementById('btn-adopt-confirm')?.addEventListener('click', () => {
        const name = input?.value?.trim();
        if (!name) {
            alert('¡Por favor ponle un nombre a tu cerdito!');
            return;
        }

        // Mock purchase flow for now
        alert(`¡Felicidades! Has adoptado a ${name}. Procesando pago...`);
        // In real app -> Trigger payment or service call here
        navigateTo('granja');
    });
}
