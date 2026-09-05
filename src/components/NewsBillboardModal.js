/* ============================================
   PIGGY APP — News Billboard Modal Component
   Displays full-screen image carousel for news
   with action url redirection support
   ============================================ */

import { AppState } from '../state.js';
import { navigateTo } from '../router.js';

/**
 * Show the news billboard popup with a 5-second auto-sliding image carousel.
 * Supports action redirection when clicking a slide.
 * @param {Array<{id: string, image_url: string, action_url: string|null}>} slides - Array of news slides to show
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
  modal.style.background = 'rgba(0, 0, 0, 0.75)';
  modal.style.backdropFilter = 'blur(6px)';
  modal.style.webkitBackdropFilter = 'blur(6px)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  // Inject styles dynamically for carousel layout and animations
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .news-slider {\n      position: relative;\n      width: 90%;\n      height: 90%;\n      max-width: 960px;\n      max-height: 85dvh;\n      border-radius: 5px;\n      overflow: hidden;\n      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);\n      background: #000000;\n    }\n    .news-slides-container {\n      display: flex;\n      width: 100%;\n      height: 100%;\n      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);\n    }\n    .news-slide {\n      min-width: 100%;\n      height: 100%;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      background: #000000;\n      position: relative;\n    }\n    .news-slide img {\n      width: 100%;\n      height: 100%;\n      object-fit: cover;\n    }\n    .news-close-btn {\n      position: absolute;\n      top: 16px;\n      right: 16px;\n      width: 38px;\n      height: 38px;\n      border-radius: 50%;\n      background: rgba(0, 0, 0, 0.6);\n      border: 1.5px solid rgba(255, 255, 255, 0.4);\n      color: #ffffff;\n      font-size: 24px;\n      font-weight: 300;\n      cursor: pointer;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      line-height: 1;\n      z-index: 1000;\n      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);\n      transition: background 0.25s, transform 0.25s, border-color 0.25s;\n    }\n    .news-close-btn:hover {\n      background: rgba(0, 0, 0, 0.85);\n      border-color: #ffffff;\n      transform: scale(1.05);\n    }\n    .news-dots {\n      position: absolute;\n      bottom: 20px;\n      left: 50%;\n      transform: translateX(-50%);\n      display: flex;\n      gap: 10px;\n      z-index: 1000;\n      background: rgba(0, 0, 0, 0.4);\n      padding: 6px 12px;\n      border-radius: var(--radius-full, 999px);\n      backdrop-filter: blur(4px);\n    }\n    .news-dot {\n      width: 8px;\n      height: 8px;\n      border-radius: 50%;\n      background: rgba(255, 255, 255, 0.4);\n      cursor: pointer;\n      transition: background 0.3s, transform 0.3s;\n    }\n    .news-dot--active {\n      background: var(--color-primary, #E91E63);\n      transform: scale(1.25);\n    }\n  `;\n  document.head.appendChild(styleEl);\n\n  // Generate slides content\n  const slidesHtml = slides.map(slide => {\n    const cursor = slide.action_url ? 'pointer' : 'default';\n    const ctaAttr = slide.action_url ? `data-action-url=\"${slide.action_url}\"` : '';\n    return `\n      <div class=\"news-slide\" ${ctaAttr} style=\"cursor: ${cursor};\">\n        <img src=\"${slide.image_url}\" alt=\"Noticia Piggy\" onerror=\"this.onerror=null;this.src='pig2.jpg';\">\n      </div>\n    `;\n  }).join('');\n\n  // Generate dots indicators (only if there are multiple slides)\n  const showDots = slides.length > 1;\n  const dotsHtml = showDots ? slides.map((_, index) => `\n    <div class=\"news-dot ${index === 0 ? 'news-dot--active' : ''}\" data-index=\"${index}\"></div>\n  `).join('') : '';\n\n  modal.innerHTML = `\n    <div class=\"news-slider\">\n      <button class=\"news-close-btn\" id=\"news-close-btn\" aria-label=\"Cerrar noticias\">&times;</button>\n      <div class=\"news-slides-container\" id=\"news-slides-container\">\n        ${slidesHtml}\n      </div>\n      ${showDots ? `<div class=\"news-dots\">${dotsHtml}</div>` : ''}\n    </div>\n  `;\n\n  document.body.appendChild(modal);\n\n  // Slide Animation & Autoplay Logic\n  const container = modal.querySelector('#news-slides-container');\n  const dots = modal.querySelectorAll('.news-dot');\n  let currentIndex = 0;\n  let autoplayTimer = null;\n\n  const goToSlide = (index) => {\n    currentIndex = index;\n    container.style.transform = `translateX(-${index * 100}%)`;\n    \n    // Update active dot classes\n    dots.forEach((dot, idx) => {\n      if (idx === index) {\n        dot.classList.add('news-dot--active');\n      } else {\n        dot.classList.remove('news-dot--active');\n      }\n    });\n  };\n\n  const startAutoplay = () => {\n    if (!showDots) return; // No autoplay needed for single slide\n    stopAutoplay();\n    autoplayTimer = setInterval(() => {\n      const nextIndex = (currentIndex + 1) % slides.length;\n      goToSlide(nextIndex);\n    }, 5000); // 5-second interval\n  };\n\n  const stopAutoplay = () => {\n    if (autoplayTimer) {\n      clearInterval(autoplayTimer);\n      autoplayTimer = null;\n    }\n  };\n\n  // Close modal handler\n  const closeModal = () => {\n    stopAutoplay();\n    AppState.set({ newsPopupClosed: true }); // Prevent showing again in current page session\n    modal.remove();\n    styleEl.remove();\n  };\n\n  // Event Listeners\n  modal.querySelector('#news-close-btn').addEventListener('click', closeModal);\n\n  // Slide click handler (redirection)\n  modal.querySelectorAll('.news-slide').forEach(slideEl => {\n    slideEl.addEventListener('click', (e) => {\n      // Prevent click triggering if clicking the close button or dots indicators\n      if (e.target.closest('#news-close-btn') || e.target.closest('.news-dots')) {\n        return;\n      }\n      \n      const url = slideEl.dataset.actionUrl;\n      if (!url) return;\n\n      closeModal(); // Close modal on action\n\n      if (url.startsWith('#/')) {\n        navigateTo(url.replace('#/', ''));\n      } else {\n        window.open(url, '_blank');\n      }\n    });\n  });\n\n  if (showDots) {\n    dots.forEach(dot => {\n      dot.addEventListener('click', () => {\n        const index = parseInt(dot.dataset.index, 10);\n        goToSlide(index);\n        startAutoplay(); // Reset 5-second timer on user interaction\n      });\n    });\n    \n    // Start automatic sliding\n    startAutoplay();\n  }\n}\n