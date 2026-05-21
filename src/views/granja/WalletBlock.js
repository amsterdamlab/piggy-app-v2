/* ============================================
   PIGGY APP — Wallet Block (Granja Section)
   Wallet banner, recharge modal, and withdrawal modal
   ============================================ */

import { formatCOP } from '../../services/mockData.js';
import { AppState } from '../../state.js';

/**
 * Render the Wallet banner card (green gradient).
 * @param {string} firstName
 * @param {Object} stats
 * @returns {string} HTML
 */
export function renderWalletBanner(firstName, stats) {
  return `
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
              <!-- Organic Pattern Background (Piggy Silhouette) -->
              <div style="
                  position: absolute; 
                  top: 0; left: 0; right: 0; bottom: 0; 
                  opacity: 0.05; 
                  background-image: url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Ctext x=\\'0\\' y=\\'40\\' font-size=\\'30\\'%3E🐷%3C/text%3E%3C/svg%3E');
                  pointer-events: none;
              "></div>

              <!-- Decorative Big Icon -->
              <div style="position: absolute; bottom: -15px; right: -15px; opacity: 0.15; transform: rotate(-15deg); color:white;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>

              <div style="position:relative; z-index:2;">
                 <h3 style="margin:0 0 20px 0; font-size:1.25rem; font-weight:700;">Cuenta Agro de ${firstName}</h3>
                 
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <!-- Adquisicion -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Adquisici\u00F3n Bonos de Preventa</div>
                       <div style="font-size:1rem; font-weight:600;">${stats.adquisicionBonosFormatted}</div>
                    </div>
                    <!-- Diferencial (High Visual Weight) -->
                    <div>
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Diferencial de Preventa</div>
                       <div style="
                           font-size: 1.3rem; 
                           font-weight: 700; 
                           color: #39FF14; 
                           text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
                           letter-spacing: 0.5px;
                       ">+${stats.diferencialPreventaFormatted}</div>
                    </div>

                    <!-- Disponible -->
                    <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.15); padding-top:16px;">
                       <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Saldo Disponible</div>
                       <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                           <div style="font-size:1.75rem; font-weight:800; letter-spacing: -0.5px; line-height: 1;">${stats.saldoDisponibleFormatted}</div>
                           <div style="font-size:0.75rem; opacity:0.9; text-align:right; padding-bottom: 2px;">
                               Margen Comercial Granja: <strong style="color:white; font-weight:800;">${stats.baseROIFormatted}</strong>
                           </div>
                       </div>
                    </div>

                    <!-- Bonos de Consumo (Referidos) — canje manual, NO es saldo retirable -->
                    ${stats.referralBonus > 0 ? `
                    <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.10); padding-top:12px; margin-top:4px;">
                       <div style="display:flex; align-items:center; justify-content:space-between;">
                         <div>
                           <div style="font-size:0.72rem; opacity:0.75; margin-bottom:2px;">🎁 Bonos de Consumo (Referidos)</div>
                           <div style="font-size:1.1rem; font-weight:700; color:#bbf7d0;">${stats.referralBonusFormatted}</div>
                         </div>
                         <span style="
                           background:rgba(255,255,255,0.15);
                           border:1px solid rgba(255,255,255,0.25);
                           color:white;
                           font-size:0.7rem;
                           font-weight:700;
                           padding:5px 10px;
                           border-radius:8px;
                           white-space:nowrap;
                         ">Canjear por carne</span>
                       </div>
                    </div>
                    ` : ''}
                 </div>

                  <button id="btn-recargar-wallet" style="
                     width: 100%;
                     background: white;
                     color: #059669;
                     border: none;
                     padding: 13px 20px;
                     border-radius: 12px;
                     font-weight: 700;
                     font-size: 0.95rem;
                     cursor: pointer;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     gap: 8px;
                     box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                     transition: transform 0.2s, box-shadow 0.2s;
                  "
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)';"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                     Recargar mi Wallet
                  </button>

                  ${stats.saldoDisponible > 0 ? `
                  <div style="margin-top: 10px;">
                     <button id="btn-retirar-saldo" style="
                        background: rgba(255,255,255,0.18);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.35);
                        padding: 11px 20px;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 0.88rem;
                        cursor: pointer;
                        width: 100%;
                        backdrop-filter: blur(5px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                      "><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Retirar mi Saldo</button>
                  </div>
                  ` : ""}
              </div>
           </div>
        </div>
  `;
}

/**
 * Render the Wallet skeleton (loading state).
 * @param {string} firstName
 * @returns {string} HTML
 */
export function renderWalletSkeleton(firstName) {
  return `
        <!-- Stats Skeleton (New Wallet Look) -->
        <div class="section animate-fade-in-up">
           <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 16px; margin-bottom: 24px; color: white; position:relative; overflow:hidden;">
              <h3 style="margin:0 0 16px 0; font-size:1.1rem; opacity:0.9;">Cuenta Agro de ${firstName}</h3>
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
  `;
}

/**
 * Attach wallet-related event listeners.
 * @param {Object} stats
 */
export function attachWalletListeners(stats) {
  document.getElementById('btn-recargar-wallet')?.addEventListener('click', () => {
    openWalletRechargeInfo();
  });

  document.getElementById('btn-retirar-saldo')?.addEventListener('click', () => {
    showRetiroSaldoModal(stats?.saldoDisponible || 0);
  });
}

/**
 * Show Wallet Recharge Info modal with WhatsApp contact.
 * Informs user how to top up their wallet balance.
 */
async function openWalletRechargeInfo() {
  // Remove existing
  const existing = document.getElementById('wallet-recharge-modal');
  if (existing) existing.remove();

  const profile = AppState.get('profile');
  const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
  const ADMIN_WHATSAPP = '573154870448';

  const modal = document.createElement('div');
  modal.id = 'wallet-recharge-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';
  modal.innerHTML = `
    <div class="modal animate-scale-in" style="max-width:380px; padding:28px 24px; text-align:center;">
      <button id="recharge-close-btn" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; color:#9ca3af;">&#x2715;</button>

      <div style="width:64px; height:64px; background:linear-gradient(135deg,#10B981,#059669); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
      </div>

      <h3 style="margin:0 0 8px; font-size:1.2rem; font-weight:800; color:#1f2937;">Recargar mi Wallet</h3>
      <p style="color:#6b7280; font-size:0.9rem; margin:0 0 24px; line-height:1.5;">
        Para recargar tu wallet y poder comprar Piggys, comunicate con nuestro equipo por WhatsApp.
      </p>

      <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:12px; padding:16px; margin-bottom:24px; text-align:left;">
        <div style="font-size:0.8rem; font-weight:700; color:#065f46; margin-bottom:8px;">&#128197; Proceso de Recarga:</div>
        <div style="font-size:0.82rem; color:#047857; line-height:1.8;">
          <div>1. Toca el boton de WhatsApp abajo</div>
          <div>2. Indica el monto que deseas recargar</div>
          <div>3. Realiza la transferencia bancaria</div>
          <div>4. Tu saldo se actualiza en 24 horas</div>
        </div>
      </div>

      <button id="recharge-whatsapp-btn" style="
        width: 100%;
        background: linear-gradient(135deg, #25D366, #128C7E);
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(37,211,102,0.35);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.122 1.528 5.855L0 24l6.336-1.506A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.37l-.36-.213-3.727.885.916-3.623-.234-.373A9.818 9.818 0 0 1 2.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/></svg>
245:         Contactar por WhatsApp
246:       </button>
247:     </div>
248:   `;
249: 
250:   document.body.appendChild(modal);
251: 
252:   // Close
253:   const close = () => modal.remove();
254:   document.getElementById('recharge-close-btn').addEventListener('click', close);
255:   modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
256: 
257:   // WhatsApp
258:   document.getElementById('recharge-whatsapp-btn').addEventListener('click', () => {
259:     const msg = `\u{1F430} *PIGGY APP \u2014 Solicitud de Recarga de Wallet*\n\n\u{1F464} *Usuario:* ${userName}\n\n\u{1F4B0} Hola, deseo recargar mi wallet para comprar Piggys.\n\n\u{1F4CB} Por favor indic\u00E0me el n\u00FAmero de cuenta y el proceso a seguir.`;
260:     window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
261:   });
262: }
263: 
264: 
265: /**
266:  * Unified "Retirar mi Saldo" modal — multi-step flow.
267:  * Step 1: Choose type (Dinero o Consumo)
268:  * Step 2a (Dinero): Enter amount + choose bank -> WhatsApp
269:  * Step 2b (Consumo): Enter amount -> "Solicitar Bonos de Consumo" -> WhatsApp
270:  */
271: function showRetiroSaldoModal(availableAmount) {
272:   const existing = document.getElementById('retiro-modal');
273:   if (existing) existing.remove();
274: 
275:   const ADMIN_WHATSAPP = '573154870448';
276:   const profile = AppState.get('profile');
277:   const userName = profile?.full_name?.split(' ')[0] || 'Usuario';
278:   const userPhone = profile?.phone_number || '';
279:   const minAmount = 10000;
280:   const BANKS = ['Bancolombia', 'Davivienda', 'BBVA', 'Nequi', 'Daviplata', 'Banco de Bogota', 'Scotiabank Colpatria', 'Otro'];
281: 
282:   const modal = document.createElement('div');
283:   modal.id = 'retiro-modal';
284:   modal.className = 'modal-overlay';
285:   modal.style.zIndex = '9999';
286: 
287:   const renderStep1 = () => `
288:     <div class="modal animate-scale-in" style="position:relative; padding-bottom:8px;">
289:       <div class="modal__handle"></div>
290:       <button id="retiro-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; z-index:3;">&times;</button>
291:       <div style="text-align:center; padding:20px 24px 0;">
292:         <div style="font-size:44px; margin-bottom:10px;">&#128176;</div>
293:         <h3 style="margin:0 0 6px; font-size:1.2rem; font-weight:800; color:#111827;">Retirar mi Saldo</h3>
294:         <p style="margin:0 0 16px; font-size:0.82rem; color:#6b7280;">Saldo disponible: <strong style="color:#059669;">${formatCOP(availableAmount)}</strong></p>
295:       </div>
296:       <div style="padding:0 20px 24px; display:flex; flex-direction:column; gap:12px;">
297:         <p style="text-align:center; font-size:0.85rem; font-weight:600; color:#374151; margin:0 0 4px;">Como deseas tu saldo?</p>
298:         <button id="retiro-tipo-dinero" style="background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:18px 20px; border-radius:14px; font-weight:700; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; gap:14px; box-shadow:0 4px 12px rgba(16,185,129,0.3);">
299:           <span style="font-size:26px;">&#127968;</span>
300:           <div style="text-align:left;">
301:             <div>Dinero en cuenta</div>
302:             <div style="font-size:0.72rem; opacity:0.85; font-weight:500;">Transferencia bancaria a tu cuenta</div>
303:           </div>
304:         </button>
305:         <button id="retiro-tipo-consumo" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:18px 20px; border-radius:14px; font-weight:700; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; gap:14px; box-shadow:0 4px 12px rgba(245,158,11,0.3);">
306:           <span style="font-size:26px;">&#129385;</span>
307:           <div style="text-align:left;">
308:             <div>Bonos de Consumo</div>
309:             <div style="font-size:0.72rem; opacity:0.85; font-weight:500;">Canjear por productos de carne</div>
310:           </div>
311:         </button>
312:       </div>
313:     </div>
314:   `;
315: 
316:   const renderStep2Dinero = () => `
317:     <div class="modal animate-scale-in" style="position:relative; padding-bottom:8px;">
318:       <div class="modal__handle"></div>
319:       <button id="retiro-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; z-index:3;">&times;</button>
320:       <button id="retiro-back" style="background:none; border:none; position:absolute; left:16px; top:18px; font-size:13px; color:#6b7280; cursor:pointer; z-index:3; font-weight:600;">&larr; Volver</button>
321:       <div style="text-align:center; padding:20px 24px 0;">
322:         <div style="font-size:36px; margin-bottom:8px;">&#127968;</div>
323:         <h3 style="margin:0 0 4px; font-size:1.1rem; font-weight:800; color:#111827;">Retiro de Dinero</h3>
324:         <p style="margin:0 0 16px; font-size:0.8rem; color:#6b7280;">Disponible: <strong style="color:#059669;">${formatCOP(availableAmount)}</strong></p>
325:       </div>
326:       <div style="padding:0 20px 24px; display:flex; flex-direction:column; gap:12px;">
327:           <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">Monto a retirar</label>
328:           <div style="position:relative;">
329:             <input type="number" id="retiro-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
330:               style="width:100%; padding:12px 50px 12px 14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem; font-weight:700; color:#111827; outline:none; box-sizing:border-box; transition:border 0.2s;"
331:               onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e5e7eb';" />
332:             <button type="button" id="btn-todo-retiro" onclick="document.getElementById('retiro-amount').value='${availableAmount}'; document.getElementById('retiro-amount').dispatchEvent(new Event('input'));" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:#ecfdf5; border:1px solid #a7f3d0; color:#059669; font-weight:700; cursor:pointer; padding:4px 10px; border-radius:8px; font-size:0.78rem;">Todo</button>
333:           </div>
334:           <div id="retiro-amount-error" style="font-size:0.72rem; color:#dc2626; margin-top:4px; display:none;"></div>
335:         </div>
336:         <div>
337:           <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">Banco destino</label>
338:           <select id="retiro-bank" style="width:100%; padding:12px 14px; border:2px solid #e5e7eb; border-radius:12px; font-size:0.95rem; color:#111827; outline:none; background:white; box-sizing:border-box; cursor:pointer; transition:border 0.2s;"
339:             onfocus="this.style.borderColor='#10B981';" onblur="this.style.borderColor='#e5e7eb';">
340:             <option value="">Selecciona tu banco</option>
341:             ${BANKS.map(b => '<option value="' + b + '">' + b + '</option>').join('')}
342:           </select>
343:         </div>
344:         <button id="retiro-confirm-dinero" style="background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:14px 20px; border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.3);">
345:           Solicitar Retiro via WhatsApp
346:         </button>
347:         <p style="text-align:center; font-size:0.72rem; color:#9ca3af; margin:0;">Nuestro equipo procesara el retiro de tu dinero en maximo 48 horas.</p>
348:       </div>
349:     </div>
350:   `;
351: 
352:   const renderStep2Consumo = () => `
353:     <div class="modal animate-scale-in" style="position:relative; padding-bottom:8px;">
354:       <div class="modal__handle"></div>
355:       <button id="retiro-close" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:22px; cursor:pointer; z-index:3;">&times;</button>
356:       <button id="retiro-back" style="background:none; border:none; position:absolute; left:16px; top:18px; font-size:13px; color:#6b7280; cursor:pointer; z-index:3; font-weight:600;">&larr; Volver</button>
357:       <div style="text-align:center; padding:20px 24px 0;">
358:         <div style="font-size:36px; margin-bottom:8px;">&#129385;</div>
359:         <h3 style="margin:0 0 4px; font-size:1.1rem; font-weight:800; color:#111827;">Bonos de Consumo</h3>
360:         <p style="margin:0 0 16px; font-size:0.8rem; color:#6b7280;">Disponible: <strong style="color:#d97706;">${formatCOP(availableAmount)}</strong></p>
361:       </div>
362:       <div style="padding:0 20px 24px; display:flex; flex-direction:column; gap:12px;">
363:           <label style="font-size:0.78rem; font-weight:700; color:#374151; display:block; margin-bottom:6px;">Cuanto saldo deseas en bonos?</label>
364:           <div style="position:relative;">
365:             <input type="number" id="consumo-amount" placeholder="Ej: 50000" min="${minAmount}" max="${availableAmount}"
366:               style="width:100%; padding:12px 50px 12px 14px; border:2px solid #e5e7eb; border-radius:12px; font-size:1rem; font-weight:700; color:#111827; outline:none; box-sizing:border-box; transition:border 0.2s;"
367:               onfocus="this.style.borderColor='#f59e0b';" onblur="this.style.borderColor='#e5e7eb';" />
368:             <button type="button" id="btn-todo-consumo" onclick="document.getElementById('consumo-amount').value='${availableAmount}'; document.getElementById('consumo-amount').dispatchEvent(new Event('input'));" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:#fffbeb; border:1px solid #fcd34d; color:#d97706; font-weight:700; cursor:pointer; padding:4px 10px; border-radius:8px; font-size:0.78rem;">Todo</button>
369:           </div>
370:           <div id="consumo-amount-error" style="font-size:0.72rem; color:#dc2626; margin-top:4px; display:none;"></div>
371:         </div>
372:         <button id="retiro-confirm-consumo" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:14px 20px; border-radius:12px; font-weight:700; font-size:0.95rem; cursor:pointer; box-shadow:0 4px 12px rgba(245,158,11,0.3);">
373:           Solicitar Bonos de Consumo via WhatsApp
374:         </button>
375:         <p style="text-align:center; font-size:0.72rem; color:#9ca3af; margin:0;">Nuestro equipo procesara el canje de tus bonos una vez realices tu compra de carne.</p>
376:       </div>
377:     </div>
378:   `;
379: 
380:   const attachClose = (onBack) => {
381:     document.getElementById('retiro-close')?.addEventListener('click', () => modal.remove());
382:     modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
383:     if (onBack) document.getElementById('retiro-back')?.addEventListener('click', onBack);
384:   };
385: 
386:   const goToStep1 = () => {
387:     modal.innerHTML = renderStep1();
388:     attachClose(null);
389:     document.getElementById('retiro-tipo-dinero')?.addEventListener('click', goToStep2Dinero);
390:     document.getElementById('retiro-tipo-consumo')?.addEventListener('click', goToStep2Consumo);
391:   };
392: 
393:   const goToStep2Dinero = () => {
394:     modal.innerHTML = renderStep2Dinero();
395:     attachClose(goToStep1);
396:     document.getElementById('retiro-confirm-dinero')?.addEventListener('click', () => {
397:       const errDiv = document.getElementById('retiro-amount-error');
398:       const amount = parseFloat(document.getElementById('retiro-amount')?.value || 0);
399:       const bank = document.getElementById('retiro-bank')?.value;
400:       if (!amount || amount < minAmount) { errDiv.textContent = 'El monto minimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
401:       if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
402:       if (!bank) { errDiv.textContent = 'Selecciona un banco'; errDiv.style.display = 'block'; return; }
403:       errDiv.style.display = 'none';
404:       const msg = '\uD83D\uDC37 *PIGGY APP \u2014 Solicitud de RETIRO DE DINERO*\n\n\uD83D\uDC64 *Usuario:* ' + userName + '\n\uD83D\uDCF1 *WhatsApp:* ' + (userPhone || 'No registrado') + '\n\uD83D\uDCB5 *Monto a retirar:* ' + formatCOP(amount) + '\n\uD83C\uDFE6 *Banco destino:* ' + bank + '\n\uD83D\uDCC5 *Fecha:* ' + new Date().toLocaleDateString('es-CO') + '\n\n\u26A1 Por favor procesar la transferencia y confirmar por este medio.';
405:       window.open('https://wa.me/' + ADMIN_WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
406:       modal.remove();
407:     });
408:   };
409: 
410:   const goToStep2Consumo = () => {
411:     modal.innerHTML = renderStep2Consumo();
412:     attachClose(goToStep1);
413:     document.getElementById('retiro-confirm-consumo')?.addEventListener('click', () => {
414:       const errDiv = document.getElementById('consumo-amount-error');
415:       const amount = parseFloat(document.getElementById('consumo-amount')?.value || 0);
416:       if (!amount || amount < minAmount) { errDiv.textContent = 'El monto minimo es ' + formatCOP(minAmount); errDiv.style.display = 'block'; return; }
417:       if (amount > availableAmount) { errDiv.textContent = 'El monto supera tu saldo disponible'; errDiv.style.display = 'block'; return; }
418:       errDiv.style.display = 'none';
419:       const msg = '\uD83D\uDC37 *PIGGY APP \u2014 Solicitud de BONOS DE CONSUMO*\n\n\uD83D\uDC64 *Usuario:* ' + userName + '\n\uD83D\uDCF1 *WhatsApp:* ' + (userPhone || 'No registrado') + '\n\uD83E\uDD69 *Monto en bonos:* ' + formatCOP(amount) + '\n\uD83D\uDCC5 *Fecha:* ' + new Date().toLocaleDateString('es-CO') + '\n\n\u26A1 Por favor coordinar la entrega de bonos de carne y confirmar por este medio.';
420:       window.open('https://wa.me/' + ADMIN_WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
421:       modal.remove();
422:     });
423:   };
424: 
425:   document.body.appendChild(modal);
426:   goToStep1();
427: }
428: 
429: /**
430:  * Show success confirmation after wallet request.
431:  */
432: export function showWalletRequestSuccess(requestType, amount, bank, requestId) {
433:   const isWithdrawal = requestType === 'withdrawal';
434:   const shortId = requestId ? requestId.slice(-8).toUpperCase() : Date.now().toString().slice(-6);
435:   const typeLabel = isWithdrawal ? 'Retiro' : 'Consumo';
436: 
437:   const modal = document.createElement('div');
438:   modal.className = 'modal-overlay';
439:   modal.style.zIndex = '10000';
440:   modal.innerHTML = `
441:     <div class="modal animate-scale-in text-center" style="max-width:400px;">
442:       <button class="bonus-close" id="wallet-success-close-x" style="background:none; border:none; position:absolute; right:16px; top:16px; font-size:24px; cursor:pointer;">&times;</button>
443:       <div style="width:60px; height:60px; background:${isWithdrawal ? '#d1fae5' : '#fef3c7'}; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
444:           <span style="font-size:28px;">${isWithdrawal ? '\u2705' : '\u{1F969}'}</span>
445:       </div>
446:       <h3 style="margin:0 0 8px; font-size:1.15rem; font-weight:800; color:#1f2937;">Solicitud de ${typeLabel} Recibida</h3>
447:       <p style="color:#6b7280; font-size:0.9rem; margin:0 0 16px;">
448:         Tu solicitud de <strong>${typeLabel.toLowerCase()}</strong> por <strong>${formatCOP(amount)}</strong>${isWithdrawal && bank ? ` a <strong>${bank}</strong>` : ''} ha sido registrada.
449:       </p>
450: 
451:       <div style="background:#f9fafb; padding:14px; border-radius:10px; margin-bottom:16px; text-align:left; font-size:0.85rem;">
452:           <div style="margin-bottom:4px;"><strong>Comprobante:</strong> #${typeLabel.toUpperCase().slice(0, 3)}-${shortId}</div>
453:           <div style="margin-bottom:4px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</div>
454:           <div><strong>Estado:</strong> <span style="color:#f59e0b; font-weight:600;">Pendiente</span></div>
455:       </div>
456: 
457:       <p style="color:#9ca3af; font-size:0.78rem; margin:0 0 20px;">
458:         ${isWithdrawal
459:       ? 'Nuestro equipo procesar\u00E1 tu retiro en un plazo m\u00E1ximo de 3 d\u00EDas h\u00E1biles. Te enviaremos un mensaje de WhatsApp para confirmar.'
460:       : 'Nuestro equipo se comunicar\u00E1 contigo por WhatsApp para coordinar la entrega de tu pedido.'}
461:       </p>
462: 
463:       <button class="btn btn--primary btn--block" id="wallet-success-close" style="width:100%; background:linear-gradient(135deg, #10B981, #059669); border:none; color:white; padding:12px; border-radius:12px; font-weight:700; cursor:pointer;">Entendido</button>
464:     </div>
465:   `;
466:   document.body.appendChild(modal);
467: 
468:   const closeModal = () => modal.remove();
469:   document.getElementById('wallet-success-close').addEventListener('click', closeModal);
470:   document.getElementById('wallet-success-close-x').addEventListener('click', closeModal);
471: }
