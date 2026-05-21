/* ============================================
   PIGGY APP — Welcome Bonus Modal (Granja Section)
   Bonus $50.000 terms modal
   ============================================ */

import { renderIcon } from '../../icons.js';
import { navigateTo } from '../../router.js';

/**
 * Show Bonus Modal
 */
export function showBonusModal(hasPiggies) {
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
            <h4 class="font-bold mb-sm">T\u00E9rminos y Condiciones: Bono de Bienvenida</h4>
            
            <div class="bonus-text-scroll">
                <p><strong>1. Definici\u00F3n del Beneficio:</strong><br/>
                PIGGY otorga un Bono de Consumo por valor de CINCUENTA MIL PESOS M/CTE ($50.000 COP) a todo usuario nuevo que complete satisfactoriamente el registro en la plataforma y realice su primera adopci\u00F3n de un "Piggy" (pago \u00FAnico de $1.000.000 COP).</p>

                <p><strong>2. Condiciones de Redenci\u00F3n:</strong><br/>
                Para hacer efectivo el bono, el usuario deber\u00E1 realizar un pedido de productos c\u00E1rnicos a trav\u00E9s de Granja Villa Morales, bajo las siguientes condiciones:</p>
                <ul>
                    <li><strong>Compra M\u00EDnima:</strong> El valor del pedido debe ser igual o superior a CIENTO CINCUENTA MIL PESOS M/CTE ($150.000 COP), sin incluir costos de env\u00EDo.</li>
                    <li><strong>Aplicaci\u00F3n del Bono:</strong> Una vez cumplido el monto m\u00EDnimo, el bono de $50.000 se restar\u00E1 del valor total a pagar por los productos.</li>
                    <li><strong>Alcance de Productos:</strong> El beneficio es v\u00E1lido exclusivamente para la compra de prote\u00EDna animal: Cerdo, Pollo y Res. No aplica para otros servicios o productos dentro de la plataforma.</li>
                </ul>

                <p><strong>3. Pol\u00EDtica de Env\u00EDos y Log\u00EDstica:</strong></p>
                <ul>
                    <li><strong>Cali:</strong> El servicio de domicilio ser\u00E1 completamente gratuito unicamente para entregas dentro del per\u00EDmetro urbano de la ciudad de Cali.</li>
                    <li><strong>Otras Ubicaciones:</strong> Para entregas en municipios aleda\u00F1os (Jamund\u00ED, Palmira, Yumbo, etc.) o en el resto del territorio nacional, el USUARIO deber\u00E1 asumir el 100% del costo del env\u00EDo, el cual se cotizar\u00E1 seg\u00FAn la ubicaci\u00F3n y el peso del pedido.</li>
                </ul>

                <p><strong>4. Vigencia y Restricciones:</strong></p>
                <ul>
                    <li>El bono es personal, intransferible y no es canjeable por dinero en efectivo.</li>
                    <li>Solo se permite la redenci\u00F3n de un (1) bono por usuario \u00FAnico y por la primera compra de activo productivo.</li>
                    <li>El bono tendr\u00E1 una vigencia de 30 d\u00EDas calendario a partir del momento de la confirmaci\u00F3n de la primera compra del piggy inicial.</li>
                </ul>
            </div>
        </div>

        <div class="bonus-footer mt-lg">
            <button class="btn btn--primary btn--block" id="btn-redeem-bonus">
                ${hasPiggies ? 'Redimir Bono Ahora' : '\u00A1Redime tu bono $50.000!'}
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
    // Always navigate to Piggy Gourmet for bonus redemption
    navigateTo('gourmet');
  });
}

export function removeBonusModal() {
  const existing = document.getElementById('bonus-modal');
  if (existing) existing.remove();
}
