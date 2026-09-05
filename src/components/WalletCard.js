import { renderIcon } from '../icons.js';
import { formatCOP } from '../services/mockData.js';

/**
 * Render the Wallet Banner Card (Green card with stats and balance)
 */
export function renderWalletCard(firstName, stats = {}) {
  const adquisicionText = stats?.adquisicionBonosFormatted || formatCOP(stats?.adquisicionBonos || 0);
  const diferencialText = stats?.diferencialPreventaFormatted || formatCOP(stats?.diferencialPreventa || 0);
  const baseRoiText = stats?.baseROIFormatted || (stats?.baseROI ? `${(Number(stats.baseROI) * 100).toFixed(0)}%` : '12%');
  const disponibleText = stats?.disponibleFormatted || formatCOP(stats?.disponible || stats?.saldoDisponible || 0);

  return `
    <div class=\"section animate-fade-in-up\" style=\"animation-delay: 0.1s;\">
       <div class=\"wallet-banner-card\" style=\"
          background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
          color: white; 
          padding: 24px; 
          border-radius: 16px; 
          margin-bottom: 24px; 
          position: relative; 
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
       \">
          <!-- Organic Pattern Background (Piggy Silhouette) -->
          <div style=\"
              position: absolute; 
              top: 0; left: 0; right: 0; bottom: 0; 
              opacity: 0.05; 
              background-image: url('data:image/svg+xml,%3Csvg width=\\\\'60\\\\' height=\\\\'60\\\\' viewBox=\\\\'0 0 60 60\\\\' xmlns=\\\\'http://www.w3.org/2000/svg\\\\'%3E%3Ctext x=\\\\'0\\\\' y=\\\\'40\\\\' font-size=\\\\'30\\\\'%3E🐷%3C/text%3E%3C/svg%3E');
              pointer-events: none;
          \"></div>

          <!-- Decorative Big Icon -->
          <div style=\"position: absolute; bottom: -15px; right: -15px; opacity: 0.15; transform: rotate(-15deg); color:white;\">
             <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"140\" height=\"140\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12V7H5a2 2 0 0 1 0-4h14v4\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h16v-5\"/><path d=\"M18 12a2 2 0 0 0 0 4h4v-4Z\"/></svg>
          </div>

          <div style=\"position:relative; z-index:2;\">
             <h3 style=\"margin:0 0 20px 0; font-size:1.25rem; font-weight:700;\">Wallet de ${firstName}</h3>
             
             <div style=\"display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;\">
                <!-- Adquisicion -->
                <div>
                   <div style=\"font-size:0.75rem; opacity:0.8; margin-bottom:4px;\">Adquisición Bonos de Preventa</div>
                   <div style=\"font-size:1rem; font-weight:600;\">${adquisicionText}</div>
                </div>
                <!-- Diferencial -->
                <div>
                   <div style=\"font-size:0.75rem; opacity:0.8; margin-bottom:4px;\">Diferencial de Preventa</div>
                   <div style=\"
                       font-size: 1.3rem; 
                       font-weight: 700; 
                       color: #39FF14; 
                       text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);\n                       letter-spacing: 0.5px;\n                   \">+${diferencialText}</div>\n                </div>\n                \n                <!-- Fase de Maduracion -->\n                <div style=\"grid-column: span 2;\">\n                   <div style=\"display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:6px;\">\n                       <div style=\"font-size:0.75rem; opacity:0.8;\">Fase de Maduración Técnica</div>\n                       <div style=\"font-size:0.85rem; font-weight:600;\">${stats.nextCloseDays !== null && stats.nextCloseDays !== undefined ? stats.nextCloseDays + ' días restantes' : '-'}</div>\n                   </div>\n                   \n                   <div style=\"background:rgba(0,0,0,0.25); height:8px; border-radius:10px; overflow:hidden; position:relative;\">\n                       <div style=\"\n                           width:${stats.nextCloseProgress || 0}%; \n                           background: linear-gradient(90deg, #39FF14, #B4F8C8); \n                           height:100%; \n                           border-radius:10px; \n                           box-shadow: 0 0 8px rgba(57,255,20,0.6);\n                           transition: width 1s ease-out;\n                       \"></div>\n                   </div>\n\n                   <div style=\"display:flex; justify-content:space-between; margin-top:4px; opacity:0.6; font-size:10px;\">\n                       <span>Inicio Ciclo</span>\n                       <span>Cosecha (19 sem)</span>\n                   </div>\n                </div>\n\n                <!-- Disponible -->\n                <div style=\"grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.15); padding-top:16px;\">\n                   <div style=\"font-size:0.75rem; opacity:0.8; margin-bottom:4px;\">Saldo Disponible</div>\n                   <div style=\"font-size:1.75rem; font-weight:850; letter-spacing: -0.5px; margin-bottom:8px;\">${disponibleText}</div>\n                   \n                   ${(stats.activeCount || 0) > 0 ? `\n                     <div style=\"display:flex; align-items:center; gap:6px; font-size:0.7rem; opacity:0.95; background:rgba(0,0,0,0.1); width:fit-content; padding:4px 10px; border-radius:100px; color:white;\">\n                       📈 Margen Comercial Granja: <strong style=\"color:#39FF14; margin-left:2px;\">${baseRoiText}</strong>\n                     </div>\n                   ` : ''}\n                </div>\n             </div>\n\n             ${stats.disponible > 0 ? `\n                <div style=\"display:flex; gap:10px; flex-wrap:wrap;\">\n                   <button id=\"btn-withdraw\" style=\"\n                      background: white; \n                      color: #059669; \n                      border: none; \n                      padding: 10px 20px; \n                      border-radius: 12px; \n                      font-weight: 700; \n                      font-size: 0.9rem; \n                      cursor: pointer;\n                      flex: 1;\n                      white-space: nowrap;\n                      box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n                      transition: transform 0.2s;\n                   \">Convertir Bono en Efectivo</button>\n                   <button id=\"btn-meat\" style=\"\n                      background: rgba(255,255,255,0.15); \n                      color: white; \n                      border: 1px solid rgba(255,255,255,0.3); \n                      padding: 10px 20px; \n                      border-radius: 12px; \n                      font-weight: 600; \n                      font-size: 0.9rem; \n                      cursor: pointer;\n                      flex: 1;\n                      white-space: nowrap;\n                      backdrop-filter: blur(5px);\n                   \">Solicitar Entrega de Carne</button>\n                </div>\n              ` : ''}\n          </div>\n       </div>\n    </div>\n  `;\n}\n