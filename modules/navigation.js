(function(global){
  'use strict';

  // Navegación con Enter entre campos específicos
  function handleEnterNavigation(event, nextElementId) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      setTimeout(() => {
        const nextElement = document.getElementById(nextElementId);
        if (nextElement && !nextElement.disabled) {
          nextElement.focus();
          if (nextElement.type === 'text' || nextElement.type === 'number') {
            try { nextElement.select(); } catch (_) {}
          }
        }
      }, 10);
    }
  }

  // Adjuntar navegación con Enter en la configuración del Tutor (page-tutor-config)
  function attachEnterNavigationTutorConfig() {
    try {
      const page = document.getElementById('page-tutor-config');
      if (!page) return;

      // Orden explícito de enfoque
      const order = [
        'tutorName',
        'tutorGroup',
        'tutorCantidad',
        'tutorFiltroLetras',
        'tutorAcentosObligatorios',
        'tutorStrictMode',
        'tutorNivelBasico' // primer botón de nivel por defecto
      ];

      // Vincular Enter a cada elemento del orden
      order.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!el._enterBound) {
          el.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter') return;
            const t = ev.currentTarget;
            // Si es botón, ejecutar acción
            const isButton = t && (t.tagName === 'BUTTON' || t.type === 'button' || t.type === 'submit');
            if (isButton) {
              ev.preventDefault();
              try { t.click(); } catch(_) {}
              return;
            }
            // Checkbox: no cambiar el estado con Enter; avanzar al siguiente campo
            if (t && t.type === 'checkbox') {
              ev.preventDefault();
              focusNextInOrder(order, id);
              return;
            }
            // Inputs de texto/número: avanzar
            ev.preventDefault();
            focusNextInOrder(order, id);
          });
          el._enterBound = true;
        }
      });

      // Navegación con flechas entre botones de nivel del tutor
      const btnIds = ['tutorNivelBasico','tutorNivelIntermedio','tutorNivelAvanzado','tutorNivelExperto'];
      btnIds.forEach((id, idx) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (!btn._arrowBound) {
          btn.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
              ev.preventDefault();
              const nextIdx = (ev.key === 'ArrowRight') ? (idx + 1) % btnIds.length : (idx - 1 + btnIds.length) % btnIds.length;
              const next = document.getElementById(btnIds[nextIdx]);
              if (next && !next.disabled) next.focus();
            }
          });
          btn._arrowBound = true;
        }
      });

      // Captura Enter en la página para evitar submits inesperados
      if (!page._enterCapture) {
        page.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            const t = ev.target;
            const isButton = t && (t.tagName === 'BUTTON' || t.getAttribute?.('role') === 'button' || t.type === 'button' || t.type === 'submit');
            if (!isButton) {
              ev.preventDefault();
            }
          }
        }, true);
        page._enterCapture = true;
      }
    } catch(_) {}
  }

  // Adjuntar navegación con Enter en el Panel del Participante (page-participant)
  function attachEnterNavigationParticipantConnect() {
    try {
      const page = document.getElementById('page-participant');
      if (!page) return;

      const order = ['participantName', 'participantEdad', 'sessionIdInput', 'connectToSession'];

      order.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!el._enterBound) {
          el.addEventListener('keydown', (ev) => {
            if (!(ev.key === 'Enter' || ev.key === 'NumpadEnter')) return;
            const t = ev.currentTarget;
            const isButton = t && (t.tagName === 'BUTTON' || t.type === 'button' || t.type === 'submit');
            if (isButton) {
              ev.preventDefault();
              try { t.click(); } catch(_) {}
              return;
            }
            ev.preventDefault();
            const moved = focusNextInOrder(order, id);
            if (!moved) {
              // Fallback: enfocar siguiente por índice local
              const nextId = order[idx + 1];
              const next = nextId ? document.getElementById(nextId) : null;
              if (next && !next.disabled) {
                try { next.focus(); if (next.select) next.select(); } catch(_) {}
              }
            }
          });
          el._enterBound = true;
        }
      });

      // Captura Enter en la página para evitar submits inesperados
      if (!page._enterCapture) {
        page.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            const t = ev.target;
            const isButton = t && (t.tagName === 'BUTTON' || t.getAttribute?.('role') === 'button' || t.type === 'button' || t.type === 'submit');
            if (!isButton) {
              ev.preventDefault();
            }
          }
        }, true);
        page._enterCapture = true;
      }
    } catch(_) {}
  }

  attachEnterNavigationParticipantConnect();

  // Navegación con flechas entre botones de nivel
  function handleArrowNavigation(event, rightElementId, leftElementId) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const rightElement = document.getElementById(rightElementId);
      if (rightElement && !rightElement.disabled) {
        rightElement.focus();
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const leftElement = document.getElementById(leftElementId);
      if (leftElement && !leftElement.disabled) {
        leftElement.focus();
      }
    }
  }

  // Enfocar siguiente por tabindex dentro de #page-config
  function focusNextByTabIndex(currentEl) {
    try {
      const page = document.getElementById('page-config');
      if (!page) return;
      const focusables = Array.from(page.querySelectorAll('[tabindex]'))
        .filter(el => !el.disabled && el.tabIndex > 0)
        .sort((a, b) => a.tabIndex - b.tabIndex);
      const idx = focusables.indexOf(currentEl);
      const next = idx >= 0 ? focusables[idx + 1] : focusables[0];
      if (next) {
        next.focus();
        if (next.select) { try { next.select(); } catch(_) {} }
      }
    } catch(_) {}
  }

  // Enfocar siguiente elemento en una página específica siguiendo un orden explícito
  function focusNextInOrder(order, currentId) {
    try {
      const idx = order.indexOf(currentId);
      for (let i = idx + 1; i < order.length; i++) {
        const next = document.getElementById(order[i]);
        if (next && !next.disabled) {
          next.focus();
          if ((next.type === 'text' || next.type === 'number') && next.select) {
            try { next.select(); } catch(_) {}
          }
          return true;
        }
      }
    } catch(_) {}
    return false;
  }

  // Adjuntar navegación con Enter solo en page-config
  function attachEnterNavigationConfig() {
    try {
      const page = document.getElementById('page-config');
      if (!page) return;
      const elements = page.querySelectorAll('#alumno');
      elements.forEach(el => {
        const handler = (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            const order = ['alumno', 'btnNext'];
            const idx = order.indexOf(el.id);
            for (let i = idx + 1; i < order.length; i++) {
              const next = document.getElementById(order[i]);
              if (next) { next.focus(); if (next.select) try { next.select(); } catch(_) {} break; }
            }
          }
        };
        el.addEventListener('keydown', handler);
      });
      // Captura Enter en la página para evitar submits inesperados
      if (!page._enterCapture) {
        const captureHandler = (ev) => {
          if (ev.key === 'Enter') {
            const t = ev.target;
            const isButton = t && (t.tagName === 'BUTTON' || t.getAttribute?.('role') === 'button' || t.type === 'button' || t.type === 'submit');
            if (!isButton) {
              ev.preventDefault();
            }
          }
        };
        page.addEventListener('keydown', captureHandler, true);
        page._enterCapture = true;
      }
    } catch(_) {}
  }

  // Auto-attach al cargar
  try {
    window.addEventListener('DOMContentLoaded', () => {
      attachEnterNavigationConfig();
      attachEnterNavigationTutorConfig();
      // Asegurar bindings críticos incluso si app.js no los llama
      try { bindCriticalUIHandlers(); } catch(_) {}
      // Delegado de respaldo por si algún binding no se adjunta
      document.addEventListener('click', (ev) => {
        const ind = ev.target.closest && ev.target.closest('#modeIndividual');
        const grp = ev.target.closest && ev.target.closest('#modeGroup');
        if (ind) {
          ev.preventDefault();
          try { global.selectMode && global.selectMode('individual'); } catch(_) {}
        } else if (grp) {
          ev.preventDefault();
          try { global.selectMode && global.selectMode('group'); } catch(_) {}
        }
      }, { capture: true });
    });
  } catch(_) {}

  // Bindings críticos de UI (trasladado desde app.js)
  function bindCriticalUIHandlers() {
    // Botones de selección de modo (página inicial)
    try {
      const modeInd = document.getElementById('modeIndividual');
      const modeGrp = document.getElementById('modeGroup');
      if (modeInd && !modeInd._boundClick) { modeInd.addEventListener('click', () => global.selectMode && global.selectMode('individual')); modeInd._boundClick = true; }
      if (modeGrp && !modeGrp._boundClick) { modeGrp.addEventListener('click', () => global.selectMode && global.selectMode('group')); modeGrp._boundClick = true; }
    } catch(_) {}

    // Botones de niveles (página de juego)
    try {
      const btnBasico = document.getElementById('btnNivelBasico');
      const btnInter  = document.getElementById('btnNivelIntermedio');
      const btnAvanz  = document.getElementById('btnNivelAvanzado');
      const btnExpe   = document.getElementById('btnNivelExperto');
      if (btnBasico && !btnBasico._boundClick) { btnBasico.addEventListener('click', () => global.seleccionarNivel && global.seleccionarNivel('basico')); btnBasico._boundClick = true; }
      if (btnInter  && !btnInter._boundClick)  { btnInter.addEventListener('click',  () => global.seleccionarNivel && global.seleccionarNivel('intermedio')); btnInter._boundClick = true; }
      if (btnAvanz  && !btnAvanz._boundClick)  { btnAvanz.addEventListener('click',  () => global.seleccionarNivel && global.seleccionarNivel('avanzado')); btnAvanz._boundClick = true; }
      if (btnExpe   && !btnExpe._boundClick)   { btnExpe.addEventListener('click',   () => global.seleccionarNivel && global.seleccionarNivel('experto')); btnExpe._boundClick = true; }
    } catch(_) {}

    // Asegurar estado del botón de audio (móvil)
    try { global.updateEnableAudioButton && global.updateEnableAudioButton(); } catch(_) {}
  }

  // Exponer globales usadas por el HTML
  global.handleEnterNavigation = handleEnterNavigation;
  global.handleArrowNavigation = handleArrowNavigation;
  global.attachEnterNavigationConfig = attachEnterNavigationConfig;
  global.attachEnterNavigationTutorConfig = attachEnterNavigationTutorConfig;
  global.attachEnterNavigationParticipantConnect = attachEnterNavigationParticipantConnect;
  global.bindCriticalUIHandlers = bindCriticalUIHandlers;
})(typeof window !== 'undefined' ? window : globalThis);
