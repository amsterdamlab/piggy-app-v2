/* ============================================
   PIGGY APP — Welcome Bonus Modal (Granja Section)
   Bonus $20.000 terms modal
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
            <p class="text-center text-primary font-bold text-lg">$20.000 PESOS EN CONSUMO DE CARNE</p>
        </div>

        <div class="bonus-content mt-md" style="flex: 2;">
            <h4 class="font-bold mb-sm">Términos y Condiciones: Bono de Bienvenida</h4>
            
            <div class="bonus-text-scroll">
                <p><strong>1. Definición del Beneficio:</strong><br/>
                PIGGY otorga un Bono de Consumo por valor de VEINTE MIL PESOS M/CTE ($20.000 COP) a todo usuario nuevo que complete satisfactoriamente el registro en la plataforma, sin necesidad de adquirir previamente un activo productivo.</p>

                <p><strong>2. Condiciones de Redención:</strong><br/>
                Para hacer efectivo el bono, el usuario deberá realizar un pedido de productos cárnicos a través de Granja Villa Morales del Valle SAS, bajo las siguientes condiciones:</p>
                <ul>
                    <li><strong>Compra Mínima:</strong> El valor del pedido debe ser igual o superior a CIENTO CINCUENTA MIL PESOS M/CTE ($150.000 COP), sin incluir costos de envío.</li>
                    <li><strong>Aplicación del Bono:</strong> Una vez cumplido el monto mínimo, el bono de $20.000 se restará del valor total a pagar por los productos.</li>
                    <li><strong>Alcance de Productos:</strong> El beneficio es válido exclusivamente para la compra de proteína animal: Cerdo, Pollo y Res. No aplica para otros servicios o productos dentro de la plataforma.</li>
                </ul>

                <p><strong>3. Política de Envíos y Logística:</strong></p>
                <ul>
                    <li><strong>Cali:</strong> El servicio de domicilio será completamente gratuito únicamente para entregas dentro del perímetro urbano de la ciudad de Cali.</li>
                    <li><strong>Otras Ubicaciones:</strong> Para entregas en municipios aledaños (Jamundí, Palmira, Yumbo, etc.) o en el resto del territorio nacional, el USUARIO deberá asumir el 100% del costo del envío, el cual se cotizará según la ubicación y el peso del pedido.</li>
                </ul>

                <p><strong>4. Vigencia y Restricciones:</strong></p>
                <ul>
                    <li>El bono es personal, intransferible y no es canjeable por dinero en efectivo.</li>
                    <li>Solo se permite la redención de un (1) bono de bienvenida por usuario único registrado.</li>
                    <li>El bono tendrá una vigencia de 30 días calendario contados a partir de la fecha de registro en la plataforma. Cumplido este periodo, el sistema lo marcará como expirado.</li>
                </ul>
            </div>
        </div>

        <div class="bonus-footer mt-lg">
            <button class="btn btn--primary btn--block" id="btn-redeem-bonus">
                ¡Redime tu bono $20.000 en Tienda!
            </button>
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
