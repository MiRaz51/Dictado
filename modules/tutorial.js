/**
 * Tutorial Interactivo - Sistema de Onboarding
 * Guía a usuarios nuevos en 3 pasos simples
 */

(function(global) {
  'use strict';

  class Tutorial {
    constructor() {
      this.steps = [
        {
          target: '.mode-grid',
          title: '¡Bienvenido! 👋',
          content: 'Esta es tu aplicación de práctica de ortografía.<br><br>🎯 <strong>Modo Individual:</strong> Practica solo a tu ritmo<br>👥 <strong>Modo Grupal:</strong> Sesiones con un tutor<br><br>💡 <em>Haz clic en "¡Entendido!" para empezar.</em>',
          position: 'center',
          page: 'page-mode-select'
        }
      ];
      
      this.currentStep = 0;
      this.completed = localStorage.getItem('tutorial_completed') === 'true';
      this.overlay = null;
      this.tooltip = null;
      this.spotlight = null;
    }

    /**
     * Inicia el tutorial si no se ha completado
     */
    start() {
      if (this.completed) {
        console.log('[Tutorial] Ya completado anteriormente');
        return;
      }

      console.log('[Tutorial] Iniciando...');
      
      // Esperar un momento para que la página cargue
      setTimeout(() => {
        this.showStep(0);
      }, 800);
    }

    /**
     * Muestra un paso específico del tutorial
     */
    showStep(index) {
      if (index < 0 || index >= this.steps.length) {
        this.complete();
        return;
      }

      this.currentStep = index;
      const step = this.steps[index];

      // Verificar que estamos en la página correcta
      const currentPage = document.querySelector('.page.active');
      if (currentPage && currentPage.id !== step.page) {
        console.log(`[Tutorial] Esperando página ${step.page}...`);
        // Esperar a que cambie la página
        const observer = new MutationObserver(() => {
          const newPage = document.querySelector('.page.active');
          if (newPage && newPage.id === step.page) {
            observer.disconnect();
            setTimeout(() => this.renderStep(step), 300);
          }
        });
        observer.observe(document.body, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          attributeFilter: ['class']
        });
        return;
      }

      this.renderStep(step);
    }

    /**
     * Renderiza el paso actual
     */
    renderStep(step) {
      // Limpiar paso anterior
      this.cleanup();

      // Crear overlay
      this.overlay = document.createElement('div');
      this.overlay.className = 'tutorial-overlay';
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.skip();
        }
      });

      // Encontrar elemento target
      const targetEl = document.querySelector(step.target);
      
      if (!targetEl) {
        console.warn(`[Tutorial] Elemento ${step.target} no encontrado`);
        this.next();
        return;
      }

      // Crear spotlight si es necesario
      if (step.highlight) {
        this.createSpotlight(targetEl);
      }

      // Crear tooltip
      this.createTooltip(step, targetEl);

      // Añadir al DOM
      document.body.appendChild(this.overlay);
      if (this.spotlight) document.body.appendChild(this.spotlight);
      document.body.appendChild(this.tooltip);

      // Posicionar tooltip
      if (step.position === 'center') {
        this.tooltip.classList.add('centered');
      } else {
        this.positionTooltip(this.tooltip, targetEl, step.position);
      }

      // Animación de entrada
      requestAnimationFrame(() => {
        this.overlay.classList.add('active');
        if (this.spotlight) this.spotlight.classList.add('active');
        this.tooltip.classList.add('active');
      });
    }

    /**
     * Crea el spotlight (resaltado) sobre el elemento
     */
    createSpotlight(targetEl) {
      this.spotlight = document.createElement('div');
      this.spotlight.className = 'tutorial-spotlight';
      
      const rect = targetEl.getBoundingClientRect();
      const padding = 8;
      
      this.spotlight.style.top = `${rect.top - padding + window.scrollY}px`;
      this.spotlight.style.left = `${rect.left - padding}px`;
      this.spotlight.style.width = `${rect.width + padding * 2}px`;
      this.spotlight.style.height = `${rect.height + padding * 2}px`;
    }

    /**
     * Crea el tooltip con el contenido del paso
     */
    createTooltip(step, targetEl) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tutorial-tooltip';
      
      const isLastStep = this.currentStep === this.steps.length - 1;
      const progress = `${this.currentStep + 1}/${this.steps.length}`;
      
      this.tooltip.innerHTML = `
        <div class="tutorial-progress">${progress}</div>
        <h3>${step.title}</h3>
        <p>${step.content}</p>
        <div class="tutorial-actions">
          <button class="tutorial-skip" onclick="window.Tutorial.skip()">
            Saltar tutorial
          </button>
          <div class="tutorial-nav">
            ${this.currentStep > 0 ? 
              '<button class="tutorial-prev" onclick="window.Tutorial.prev()">◂ Anterior</button>' : 
              ''}
            <button class="tutorial-next" onclick="window.Tutorial.${isLastStep ? 'complete' : 'next'}()">
              ${isLastStep ? '¡Entendido!' : 'Siguiente ▸'}
            </button>
          </div>
        </div>
      `;
    }

    /**
     * Posiciona el tooltip relativo al elemento target
     */
    positionTooltip(tooltip, targetEl, position) {
      const rect = targetEl.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = 20;
      const isFixed = (getComputedStyle(tooltip).position === 'fixed');
      const yOffset = isFixed ? 0 : window.scrollY;
      
      let top, left;

      switch (position) {
        case 'top':
          top = rect.top - tooltipRect.height - padding + yOffset;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        
        case 'bottom':
          top = rect.bottom + padding + yOffset;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;
        
        case 'left':
          top = rect.top + (rect.height - tooltipRect.height) / 2 + yOffset;
          left = rect.left - tooltipRect.width - padding;
          break;
        
        case 'right':
          top = rect.top + (rect.height - tooltipRect.height) / 2 + yOffset;
          left = rect.right + padding;
          break;
        
        case 'center':
        default:
          top = (window.innerHeight - tooltipRect.height) / 2 + (isFixed ? 0 : window.scrollY);
          left = (window.innerWidth - tooltipRect.width) / 2;
          break;
      }

      // Asegurar que no se salga de la pantalla
      const maxLeft = window.innerWidth - tooltipRect.width - 20;
      const maxTop = (window.innerHeight - tooltipRect.height - 20) + (isFixed ? 0 : window.scrollY);
      
      left = Math.max(20, Math.min(left, maxLeft));
      top = Math.max(20, Math.min(top, maxTop));

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }

    /**
     * Avanza al siguiente paso
     */
    next() {
      // Si es el último paso, completar
      if (this.currentStep >= this.steps.length - 1) {
        this.complete();
        return;
      }
      
      this.showStep(this.currentStep + 1);
    }

    /**
     * Retrocede al paso anterior
     */
    prev() {
      this.showStep(this.currentStep - 1);
    }

    /**
     * Salta el tutorial
     */
    skip() {
      if (confirm('¿Seguro que quieres saltar el tutorial? Puedes verlo después desde el menú de ayuda.')) {
        this.complete();
      }
    }

    /**
     * Completa el tutorial
     */
    complete() {
      console.log('[Tutorial] Completado');
      localStorage.setItem('tutorial_completed', 'true');
      this.completed = true;
      this.cleanup();
    }

    /**
     * Reinicia el tutorial (para testing o si el usuario lo solicita)
     */
    reset() {
      localStorage.removeItem('tutorial_completed');
      this.completed = false;
      this.currentStep = 0;
      console.log('[Tutorial] Reiniciado');
    }

    /**
     * Reinicia y muestra el tutorial de nuevo
     */
    restart() {
      this.reset();
      this.cleanup();
      setTimeout(() => this.start(), 300);
    }

    /**
     * Limpia elementos del DOM
     */
    cleanup() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      if (this.tooltip) {
        this.tooltip.remove();
        this.tooltip = null;
      }
      if (this.spotlight) {
        this.spotlight.remove();
        this.spotlight = null;
      }
    }
  }

  // Crear instancia global
  const tutorial = new Tutorial();
  global.Tutorial = tutorial;

  // Auto-iniciar en primera carga
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      // Esperar a que la página esté lista
      setTimeout(() => {
        try {
          const allowAuto = !!(window.CONFIG && window.CONFIG.AUTO_TUTORIAL_ON_FIRST_RUN);
          if (allowAuto && !tutorial.completed) {
            tutorial.start();
          } else {
            console.log('[Tutorial] Auto-start deshabilitado por configuración');
          }
        } catch(_) {}
      }, 1000);
    });
  }

  console.log('✅ Tutorial module loaded');

})(typeof window !== 'undefined' ? window : globalThis);
