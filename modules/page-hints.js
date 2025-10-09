(function(global){
  'use strict';

  const STORAGE_PREFIX = 'page_hint_shown_';

  const PAGE_HINTS = {
    'page-mode-select': {
      target: '.mode-grid',
      position: 'center',
      title: 'Bienvenido 👋',
      content: 'Elige cómo practicar.<br><br>👤 <strong>Individual</strong>: práctica personal a tu ritmo<br>👥 <strong>Grupal</strong>: sesión con un tutor'
    },
    'page-role-select': {
      target: '.mode-grid',
      position: 'center',
      title: 'Selecciona tu rol',
      content: 'Elige si serás <strong>Tutor</strong> (administra la sesión) o <strong>Participante</strong> (se une a la sesión)'
    },
    'page-config': {
      target: '#alumno',
      position: 'bottom',
      title: 'Configura tu sesión',
      content: 'Ingresa el <strong>nombre del participante</strong> y continúa con "Siguiente".'
    },
    'page-game': {
      target: '.actions',
      position: 'top',
      title: 'Elige dificultad',
      content: 'Selecciona un <strong>nivel</strong> para iniciar el ejercicio. Luego usa <strong>Reproducir</strong> y escribe la palabra.',
      // Mostrar solo cuando el ejercicio aún no ha iniciado (bloque #juego oculto)
      shouldShow: function(){
        try {
          const juego = document.getElementById('juego');
          if (!juego) return true;
          const style = window.getComputedStyle(juego);
          return (juego.style.display === 'none') || (style && style.display === 'none');
        } catch(_) { return true; }
      }
    },
    'page-tutor-info': {
      target: '#tutorName',
      position: 'bottom',
      title: 'Datos del tutor',
      content: 'Ingresa tu <strong>nombre</strong> y el <strong>grupo</strong> que atenderás.'
    },
    'page-tutor-config': {
      target: '.actions',
      position: 'top',
      title: 'Configura el ejercicio',
      content: 'Selecciona el <strong>nivel</strong> y prepara la sesión antes de iniciarla.'
    },
    'page-tutor': {
      target: '#sessionInfo',
      position: 'bottom',
      title: 'Panel del Tutor',
      content: 'Comparte el <strong>ID de sesión</strong> con los participantes. Controla la reproducción y el avance desde aquí.'
    },
    'page-participant': {
      target: '#participantConnection',
      position: 'bottom',
      title: 'Conectar a una sesión',
      content: 'Escribe tu <strong>nombre</strong> y el <strong>ID de sesión</strong> que te dio el tutor y presiona "Conectar".',
      shouldShow: function(){
        try {
          const conn = document.getElementById('participantConnection');
          const report = document.getElementById('participantReport');
          const connVisible = conn && ((conn.style.display !== 'none') && (getComputedStyle(conn).display !== 'none'));
          const reportVisible = report && ((report.style.display !== 'none') && (getComputedStyle(report).display !== 'none'));
          return !!connVisible && !reportVisible;
        } catch(_) { return true; }
      }
    },
    'page-report': {
      target: '.actions',
      position: 'bottom',
      title: 'Reporte final',
      content: 'Descarga tu <strong>PDF</strong> o crea una <strong>práctica manual</strong>. También puedes iniciar una nueva sesión.'
    }
  };

  function makeTooltip({title, content}, progress){
    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.innerHTML = `
      <div class="tutorial-progress">${progress}</div>
      <h3>${title}</h3>
      <p>${content}</p>
      <div class="tutorial-actions">
        <div class="tutorial-nav">
          <button class="tutorial-next" id="pageHintCloseBtn">¡Entendido!</button>
        </div>
      </div>
    `;
    return tooltip;
  }

  function positionTooltip(tooltip, targetEl, position){
    const rect = targetEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 20;
    const isFixed = (getComputedStyle(tooltip).position === 'fixed');
    const yOffset = isFixed ? 0 : window.scrollY;

    let top, left;
    switch(position){
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

    const maxLeft = window.innerWidth - tooltipRect.width - 20;
    const maxTop = (window.innerHeight - tooltipRect.height - 20) + (isFixed ? 0 : window.scrollY);
    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  class PageHints {
    constructor(){
      this.overlay = null;
      this.tooltip = null;
      this.activePageId = null;
      this._initObserver();
    }

    _initObserver(){
      const run = () => this._checkActivePage(true);
      // On DOM ready and on load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
      } else { run(); }

      // Observe changes in active page
      const observer = new MutationObserver(() => this._checkActivePage(false));
      observer.observe(document.body, {subtree: true, attributes: true, attributeFilter: ['class']});
    }

    _checkActivePage(onInit){
      const active = document.querySelector('.page.active');
      if (!active) return;
      const id = active.id;
      if (!id || this.activePageId === id) return;
      this.activePageId = id;
      // Show hint automatically on first visit
      this.showFirstTime(id);
    }

    show(pageId){
      const id = pageId || (document.querySelector('.page.active')?.id);
      if (!id) return false;
      const cfg = PAGE_HINTS[id];
      if (!cfg) return false; // no hint defined
      if (typeof cfg.shouldShow === 'function') {
        try { if (!cfg.shouldShow()) return false; } catch(_) { /* ignore and continue */ }
      }

      this.close();

      const targetEl = document.querySelector(cfg.target) || document.querySelector(`#${id}`) || document.body;

      // Create overlay (reuse tutorial styles)
      this.overlay = document.createElement('div');
      this.overlay.className = 'tutorial-overlay';
      this.overlay.addEventListener('click', (e)=>{ if (e.target === this.overlay) this.close(); });

      // Create tooltip
      const progress = 'Ayuda';
      this.tooltip = makeTooltip({title: cfg.title, content: cfg.content}, progress);

      document.body.appendChild(this.overlay);
      document.body.appendChild(this.tooltip);

      if (cfg.position === 'center') {
        this.tooltip.classList.add('centered');
      } else {
        // Initial attach offscreen so getBoundingClientRect has dimensions
        this.tooltip.style.visibility = 'hidden';
        requestAnimationFrame(()=>{
          this.tooltip.style.visibility = '';
          positionTooltip(this.tooltip, targetEl, cfg.position || 'center');
        });
      }

      requestAnimationFrame(()=>{
        this.overlay.classList.add('active');
        this.tooltip.classList.add('active');
      });

      const btn = this.tooltip.querySelector('#pageHintCloseBtn');
      if (btn) btn.addEventListener('click', ()=> this.close());
      return true;
    }

    showCurrent(){
      const did = this.show();
      if (did) return true;
      // Fallbacks contextuales cuando la pista por página no aplica
      try {
        const activeId = document.querySelector('.page.active')?.id || '';
        // Si estamos en participante y el reporte está visible, mostrar ayuda del reporte
        if (activeId === 'page-participant') {
          const report = document.getElementById('participantReport');
          if (report && ((report.style.display !== 'none') && (getComputedStyle(report).display !== 'none'))) {
            this.showAt('#participantReport', {
              title: 'Tu reporte 📊',
              content: 'Aquí puedes <strong>descargar tu PDF</strong> o crear una <strong>práctica manual</strong>. Revisa el resumen y la lista de palabras respondidas.',
              position: 'bottom'
            });
            return true;
          }
        }
      } catch(_) {}
      return false;
    }

    showFirstTime(pageId){
      const id = pageId || (document.querySelector('.page.active')?.id);
      if (!id) return false;
      const key = STORAGE_PREFIX + id;
      const cfg = PAGE_HINTS[id];
      if (cfg && typeof cfg.shouldShow === 'function') {
        try { if (!cfg.shouldShow()) return false; } catch(_) {}
      }
      if (localStorage.getItem(key)) return false;
      const beforeCount = document.querySelectorAll('.tutorial-tooltip').length;
      const didShow = this.show(id);
      if (!didShow) return false;
      // Marcar como mostrado solo si se renderizó algo nuevo
      setTimeout(() => {
        try {
          const afterCount = document.querySelectorAll('.tutorial-tooltip').length;
          if (afterCount > beforeCount) {
            localStorage.setItem(key, 'true');
          }
        } catch(_) {}
      }, 0);
      return true;
    }

    /**
     * Muestra una ayuda contextual en cualquier selector, sin depender del mapeo de páginas.
     * options: { title, content, position?: 'top'|'bottom'|'left'|'right'|'center', storageKey?: string }
     */
    showAt(targetSelector, options){
      try {
        const { title, content, position = 'center', storageKey } = options || {};
        if (!title || !content) return;
        if (storageKey && localStorage.getItem(storageKey)) return;

        const targetEl = document.querySelector(targetSelector) || document.body;
        this.close();

        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.addEventListener('click', (e)=>{ if (e.target === this.overlay) this.close(); });

        // Tooltip
        const tooltip = makeTooltip({ title, content }, 'Ayuda');
        this.tooltip = tooltip;

        document.body.appendChild(this.overlay);
        document.body.appendChild(tooltip);

        if (position === 'center') {
          tooltip.classList.add('centered');
        } else {
          tooltip.style.visibility = 'hidden';
          requestAnimationFrame(()=>{
            tooltip.style.visibility = '';
            positionTooltip(tooltip, targetEl, position);
          });
        }

        requestAnimationFrame(()=>{
          this.overlay.classList.add('active');
          tooltip.classList.add('active');
        });

        const btn = tooltip.querySelector('#pageHintCloseBtn');
        if (btn) btn.addEventListener('click', ()=> this.close());

        if (storageKey) {
          // marcar como mostrado sólo si realmente se insertó
          setTimeout(()=>{ try { localStorage.setItem(storageKey, 'true'); } catch(_) {} }, 0);
        }
      } catch(_) {}
    }

    reset(pageId){
      if (pageId) localStorage.removeItem(STORAGE_PREFIX + pageId);
      else Object.keys(PAGE_HINTS).forEach(id => localStorage.removeItem(STORAGE_PREFIX + id));
    }

    close(){
      if (this.tooltip){ this.tooltip.remove(); this.tooltip = null; }
      if (this.overlay){ this.overlay.remove(); this.overlay = null; }
    }
  }

  const instance = new PageHints();
  global.PageHints = instance;

  console.log('✅ PageHints module loaded');
})(typeof window !== 'undefined' ? window : globalThis);
