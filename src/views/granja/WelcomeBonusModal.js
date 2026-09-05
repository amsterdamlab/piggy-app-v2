/* ============================================
   PIGGY APP — Welcome Bonus Modal (Granja Section)
   Terms & Conditions for $20.000 Consumption Bonus
   ============================================ */

import { renderIcon } from '../icons.js';
import { navigateTo } from '../router.js';

/**
 * Show Welcome Bonus Terms Modal
 */
export function showWelcomeBonusModal() {
  const existing = document.getElementById('bonus-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'bonus-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal bonus-modal animate-scale-in">
        <div class="modal__handle"></div>
        <button id="bonus-close-btn" style="background:none; border:none; position:absolute; right:18px; top:18px; font-size:24px; color:#9ca3af; cursor:pointer; line-height:1; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s; z-index:10;" onmouseover="this.style.color='#111827'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        
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
                <ul class="mb-sm">
                    <li><strong>Compra Mínima:</strong> El valor del pedido debe ser igual o superior a CIENTO CINCUENTA MIL PESOS M/CTE ($150.000 COP), sin incluir costos de envío.</li>
                    <li><strong>Descuento Aplicable:</strong> Se descontarán automáticamente los $20.000 COP del valor total de la compra al momento de la facturación.</li>
                    <li><strong>Límite de Uso:</strong> Este beneficio es válido por una única vez por usuario registrado y no es acumulable con otras promociones o cupones de descuento.</li>
                </ul>

                <p><strong>3. Cobertura y Envíos:</strong><br/>
                La entrega de los productos cárnicos se rige por las siguientes políticas de cobertura:</p>
                <ul class="mb-sm">
                    <li><strong>Cali Urbano:</strong> Envío totalmente gratuito para pedidos que cumplan con el monto mínimo de compra.</li>
                    <li><strong>Otras Ubicaciones:</strong> Para entregas en municipios aledaños (Jamundí, Palmira, Yumbo, etc.) o en el resto del territorio nacional, el USUARIO deberá asumir el 100% del costo del envío, el cual se cotizará según la ubicación y el peso del pedido.</li>
                </ul>

                <p><strong>4. No Canjeable en Efectivo:</strong><br/>
                El bono no es transferible a terceros, no es reembolsable ni redimible en dinero en efectivo, saldo en billetera digital ni mediante transferencias bancarias. Su uso es exclusivo para la adquisición de productos cárnicos de Granja Villa Morales.</p>

                <p><strong>5. Vigencia:</strong><br/>
                El bono tendrá una vigencia de noventa (90) días calendario contados a partir de la fecha de registro exitoso en la plataforma. Vencido este plazo sin haberse redimido, el beneficio expirará automáticamente sin lugar a reclamación.</p>

                <p><strong>6. Modificaciones:</strong><br/>
                PIGGY se reserva el derecho de modificar o suspender los términos de esta promoción en cualquier momento, garantizando el respeto de los derechos adquiridos por los usuarios registrados con anterioridad a dicha modificación.</p>
            </div>
        </div>

        <div class="bonus-footer mt-lg">
            <button class="btn btn--primary btn--block" id="btn-redeem-bonus">¡Redime tu bono $20.000 en carne!</button>
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

  // Action Button
  document.getElementById('btn-redeem-bonus').addEventListener('click', () => {
    close();
    // Always navigate to Piggy Gourmet for bonus redemption
    navigateTo('gourmet');
  });
}
