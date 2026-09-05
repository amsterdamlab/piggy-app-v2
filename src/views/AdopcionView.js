/* ============================================
   PIGGY APP — Adopcion View (Cerdo Completo)
   ============================================ */

import { renderIcon } from '../icons.js';
import { renderBottomNav } from './GranjaView.js';

export function renderAdopcionView() {
  const app = document.getElementById('app');

  const ADOPCION_PRICE = 900000;
  const WHATSAPP_NUMBER = '573154870448';

  const defaultMessage = encodeURIComponent(
    '🐷 ¡Hola Granja Valle Morales! Estoy interesado en Adopción de Cerdo Completo ($900.000 COP). Quiero conocer más información para iniciar el proceso.'
  );

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${defaultMessage}`;

  app.innerHTML = `
    <div class="page page--with-nav adopcion-page">
      <div class="page__content">

        <!-- Hero Header -->
        <div class="adopcion-hero animate-fade-in-up">
          <div class="adopcion-hero__badge">
            ${renderIcon('sparkle', '', '14')}
            Modelo Premium
          </div>
          <h2 class="adopcion-hero__title">Adopción de Cerdo Completo</h2>
          <p class="adopcion-hero__subtitle">
            Ten tu propio cerdo en Granja Valle Morales con trazabilidad fotográfica mensual, visitas programadas y carne 100% fresca al finalizar.
          </p>
        </div>

        <!-- Main Info Card -->
        <div class="card adopcion-card animate-fade-in-up">
          <div class="adopcion-card__image-wrap">
            <img src="/assets/piggies/stage2/et2-1.jpg" alt="Adopción Cerdo" class="adopcion-card__image" onerror="this.onerror=null;this.src='pig2.jpg'" />
            <div class="adopcion-card__price-tag">
              <span class="adopcion-card__price-label">Inversión</span>
              <span class="adopcion-card__price-value">$ 900.000</span>
            </div>
          </div>

          <div class="adopcion-card__content">
            <h3 class="adopcion-card__name">Cerdo en Crianza Personalizada</h3>
            <p class="adopcion-card__desc">
              Financia la crianza completa de un cerdo desde el destete hasta su peso final (80-90 kg) durante 144 días.
            </p>

            <!-- Benefits List -->
            <div class="adopcion-benefits">
              <div class="adopcion-benefit-item">
                <span class="adopcion-benefit-icon">📸</span>
                <div>
                  <strong>Fotos y Trazabilidad Mensual</strong>
                  <p>Recibe reportes y fotos periódicas del avance y salud de tu cerdo.</p>
                </div>
              </div>

              <div class="adopcion-benefit-item">
                <span class="adopcion-benefit-icon">🏡</span>
                <div>
                  <strong>Visita a la Granja</strong>
                  <p>Programa visitas a Granja Valle Morales en Cali para conocer las instalaciones.</p>
                </div>
              </div>

              <div class="adopcion-benefit-item">
                <span class="adopcion-benefit-icon">🥩</span>
                <div>
                  <strong>Carne en Canal o Cortes</strong>
                  <p>Al final del ciclo recibes la canal completa limpia o empacada en cortes para tu familia.</p>
                </div>
              </div>

              <div class="adopcion-benefit-item">
                <span class="adopcion-benefit-icon">📜</span>
                <div>
                  <strong>Certificado de Propiedad</strong>
                  <p>Documento digital firmado que respalda la crianza y custodia de tu animal.</p>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div class="adopcion-cta">
              <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--full btn--lg adopcion-btn">
                <span>💬</span>
                Contactar por WhatsApp para Adoptar
              </a>
              <p class="adopcion-cta-help text-xs text-muted text-center mt-xs">
                Te asesoramos directamente sobre disponibilidad y fechas de inicio de lote.
              </p>
            </div>
          </div>
        </div>

      </div>
      ${renderBottomNav('adopcion')}
    </div>
  `;

  return () => { };
}
