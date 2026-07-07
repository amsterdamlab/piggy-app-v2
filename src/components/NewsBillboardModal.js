/* ============================================
   PIGGY APP — News Billboard Modal Component
   Displays full-screen image carousel for news
   ============================================ */

import { AppState } from '../state.js';

/**
 * Show the news billboard popup with a 5-second auto-sliding image carousel.
 * @param {Array<{id: string, image_url: string}>} slides - Array of news slides to show
 */
export function showNewsBillboardModal(slides) {
  if (!slides || slides.length === 0) return;

  // Session guard: if user already closed it during this page session, do not show again
  if (AppState.get('newsPopupClosed')) return;

  // Remove existing modal if any
  const existing = document.getElementById('news-billboard-modal');
  if (existing) existing.remove();

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'news-billboard-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100dvw';
  modal.style.height = '100dvh';
  modal.style.zIndex = '999999';
  modal.style.background = '#000000';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  // Inject styles dynamically for carousel layout and animations
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .news-slider {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .news-slides-container {
      display: flex;
      width: 100%;
      height: 100%;
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .news-slide {
      min-width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000000;
    }
    .news-slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .news-close-btn {
      position: absolute;
      top: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      border: 1.5px solid rgba(255, 255, 255, 0.4);
      color: #ffffff;
      font-size: 28px;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: background 0.25s, transform 0.25s, border-color 0.25s;
    }
    .news-close-btn:hover {
      background: rgba(0, 0, 0, 0.85);
      border-color: #ffffff;
      transform: scale(1.05);
    }
    .news-dots {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.4);
      padding: 6px 12px;
      border-radius: var(--radius-full, 999px);
      backdrop-filter: blur(4px);
    }
    .news-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      transition: background 0.3s, transform 0.3s;
    }
    .news-dot--active {
      background: var(--color-primary, #E91E63);
      transform: scale(1.25);
    }
  `;
  document.head.appendChild(styleEl);

  // Generate slides content
  const slidesHtml = slides.map(slide => `
    <div class="news-slide">
      <img src="${slide.image_url}" alt="Noticia Piggy" onerror="this.onerror=null;this.src='pig2.jpg';">
    </div>
  `).join('');

  // Generate dots indicators (only if there are multiple slides)
  const showDots = slides.length > 1;
  const dotsHtml = showDots ? slides.map((_, index) => `
    <div class="news-dot ${index === 0 ? 'news-dot--active' : ''}" data-index="${index}"></div>
  `).join('') : '';

  modal.innerHTML = `
    <div class="news-slider">
      <button class="news-close-btn" id="news-close-btn" aria-label="Cerrar noticias">&times;</button>
      <div class="news-slides-container" id="news-slides-container">
        ${slidesHtml}
      </div>
      ${showDots ? `<div class="news-dots">${dotsHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(modal);

  // Slide Animation & Autoplay Logic
  const container = modal.querySelector('#news-slides-container');
  const dots = modal.querySelectorAll('.news-dot');
  let currentIndex = 0;
  let autoplayTimer = null;

  const goToSlide = (index) => {
    currentIndex = index;
    container.style.transform = `translateX(-${index * 100}%)`;
    
    // Update active dot classes
    dots.forEach((dot, idx) => {
      if (idx === index) {
        dot.classList.add('news-dot--active');
      } else {
        dot.classList.remove('news-dot--active');
      }
    });
  };

  const startAutoplay = () => {
    if (!showDots) return; // No autoplay needed for single slide
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      goToSlide(nextIndex);
    }, 5000); // 5-second interval
  };

  const stopAutoplay = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };

  // Close modal handler
  const closeModal = () => {
    stopAutoplay();
    AppState.set({ newsPopupClosed: true }); // Prevent showing again in current page session
    modal.remove();
    styleEl.remove();
  };

  // Event Listeners
  modal.querySelector('#news-close-btn').addEventListener('click', closeModal);

  if (showDots) {
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index, 10);
        goToSlide(index);
        startAutoplay(); // Reset 5-second timer on user interaction
      });
    });
    
    // Start automatic sliding
    startAutoplay();
  }
}
