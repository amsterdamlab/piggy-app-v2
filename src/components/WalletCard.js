import { renderIcon } from '../icons.js';
import { formatCOP } from '../services/mockData.js';

/**
 * Render the Wallet Banner Card (Green card with stats and balance)
 */
export function renderWalletCard(firstName, stats) {
  return `
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
             <h3 style="margin:0 0 20px 0; font-size:1.25rem; font-weight:700;">Wallet de ${firstName}</h3>
             
             <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                <!-- Adquisicion -->
                <div>
                   <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Adquisición Bonos de Preventa</div>
                   <div style="font-size:1rem; font-weight:600;">${stats.adquisicionBonosFormatted}</div>
                </div>
                <!-- Diferencial -->
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
                
                <!-- Fase de Maduracion -->
                <div style="grid-column: span 2;">
                   <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:6px;">
                       <div style="font-size:0.75rem; opacity:0.8;">Fase de Maduración Técnica</div>
                       <div style="font-size:0.85rem; font-weight:600;">${stats.nextCloseDays !== null ? stats.nextCloseDays + ' días restantes' : '-'}</div>
                   </div>
                   
                   <div style="background:rgba(0,0,0,0.25); height:8px; border-radius:10px; overflow:hidden; position:relative;">
                       <div style="
                           width:${stats.nextCloseProgress}%; 
                           background: linear-gradient(90deg, #39FF14, #B4F8C8); 
                           height:100%; 
                           border-radius:10px; 
                           box-shadow: 0 0 8px rgba(57,255,20,0.6);
                           transition: width 1s ease-out;
                       "></div>
                   </div>

                   <div style="display:flex; justify-content:space-between; margin-top:4px; opacity:0.6; font-size:10px;">
                       <span>Inicio Ciclo</span>
                       <span>Cosecha (19 sem)</span>
                   </div>
                </div>

                <!-- Disponible -->
                <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.15); padding-top:16px;">
                   <div style="font-size:0.75rem; opacity:0.8; margin-bottom:4px;">Saldo Disponible</div>
                   <div style="font-size:1.75rem; font-weight:800; letter-spacing: -0.5px; margin-bottom:8px;">${stats.disponibleFormatted}</div>
                   
                   ${stats.activeCount > 0 ? `
                     <div style="display:flex; align-items:center; gap:6px; font-size:0.7rem; opacity:0.95; background:rgba(0,0,0,0.1); width:fit-content; padding:4px 10px; border-radius:100px; color:white;">
                       📈 Margen Comercial Granja: <strong style="color:#39FF14; margin-left:2px;">${stats.baseROIFormatted}</strong>
                     </div>
                   ` : ''}
                </div>
             </div>

             ${stats.disponible > 0 ? `
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                   <button id="btn-withdraw" style="
                      background: white; 
                      color: #059669; 
                      border: none; 
                      padding: 10px 20px; 
                      border-radius: 12px; 
                      font-weight: 700; 
                      font-size: 0.9rem; 
                      cursor: pointer;
                      flex: 1;
                      white-space: nowrap;
                      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                      transition: transform 0.2s;
                   ">Convertir Bono en Efectivo</button>
                   <button id="btn-meat" style="
                      background: rgba(255,255,255,0.15); 
                      color: white; 
                      border: 1px solid rgba(255,255,255,0.3); 
                      padding: 10px 20px; 
                      border-radius: 12px; 
                      font-weight: 600; 
                      font-size: 0.9rem; 
                      cursor: pointer;
                      flex: 1;
                      white-space: nowrap;
                      backdrop-filter: blur(5px);
                   ">Solicitar Entrega de Carne</button>
                </div>
              ` : ''}
          </div>
       </div>
    </div>
  `;
}
