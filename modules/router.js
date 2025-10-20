(function(global){
  'use strict';

  // Suscriptores para cambios de página
  const __subscribers = [];
  function onPageChange(cb){ if (typeof cb === 'function') __subscribers.push(cb); }
  function __emitPageChange(pageId){ try { __subscribers.forEach(fn => { try { fn(pageId); } catch(_) {} }); } catch(_) {} }

  function goToPage(pageId) {
    const ids = (global.CONSTANTS && global.CONSTANTS.ROUTER && Array.isArray(global.CONSTANTS.ROUTER.PAGE_IDS))
      ? global.CONSTANTS.ROUTER.PAGE_IDS
      : ['page-mode-select', 'page-role-select', 'page-config', 'page-game', 'page-tutor-info', 'page-tutor-config', 'page-tutor', 'page-participant', 'page-report'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle('active', id === pageId);
      }
    });
    
    // Mostrar/ocultar badge de créditos según la página
    try {
      const tcBadge = document.getElementById('tcBadgeBtn');
      if (tcBadge) {
        // Páginas donde NO debe aparecer el badge:
        // - page-mode-select (selección de modo)
        // - page-role-select (selección de rol grupal)
        // - page-tutor-info (info del tutor)
        // - page-tutor-config (configuración del tutor)
        // - page-tutor (pantalla del tutor)
        const hideBadgePages = (global.CONSTANTS && global.CONSTANTS.ROUTER && Array.isArray(global.CONSTANTS.ROUTER.HIDE_TC_BADGE_PAGES))
          ? global.CONSTANTS.ROUTER.HIDE_TC_BADGE_PAGES
          : ['page-mode-select', 'page-role-select', 'page-tutor-info', 'page-tutor-config', 'page-tutor'];
        
        if (hideBadgePages.includes(pageId)) {
          tcBadge.style.display = 'none';
        } else {
          // Mostrar en: page-config, page-game, page-report (modo individual)
          // y page-participant (modo grupal)
          tcBadge.style.display = 'inline-flex';
        }
      } else {
        console.warn('[TimeCredits] Badge no encontrado al navegar a:', pageId);
      }
    } catch(e) {
      console.error('[TimeCredits] Error al mostrar/ocultar badge:', e);
    }
    // Preseleccionar primer campo cuando se abre la página de juego
    if (pageId === 'page-game') {
      setTimeout(() => {
        try {
          const f = document.getElementById('filtroLetras');
          if (f) f.value = '';
          const pr = document.getElementById('porcentajeRefuerzo');
          if (pr) pr.value = '';
        } catch(_) {}
        const cantidadField = document.getElementById('cantidad');
        if (cantidadField && !cantidadField.disabled) {
          cantidadField.focus();
          try { cantidadField.select(); } catch (_) {}
        }
      }, 100);
    }
    if (pageId === 'page-report') {
      const rep = document.getElementById('reporteFinal');
      if (rep) rep.style.display = 'block';
      try {
        const reportSection = document.getElementById('page-report');
        const btnNuevaSesion = reportSection?.querySelector("button[onclick=\"goToPage('page-config')\"]");
        const btnNuevoEjercicio = reportSection?.querySelector("button[onclick*=\"irAlEjercicio()\"]");
        const actionsBar = reportSection?.querySelector('.actions');
        let busyHint = document.getElementById('reportBusyHint');
        if (!busyHint) {
          busyHint = document.createElement('span');
          busyHint.id = 'reportBusyHint';
          busyHint.className = 'hint';
          busyHint.style.marginLeft = '8px';
          busyHint.textContent = 'Generando PDF…';
          if (actionsBar) actionsBar.appendChild(busyHint);
        } else {
          busyHint.style.display = '';
        }
        if (btnNuevaSesion) btnNuevaSesion.disabled = true;
        if (btnNuevoEjercicio) btnNuevoEjercicio.disabled = true;
        const onReportReady = () => {
          try {
            if (btnNuevaSesion) btnNuevaSesion.disabled = false;
            if (btnNuevoEjercicio) btnNuevoEjercicio.disabled = false;
            const bh = document.getElementById('reportBusyHint');
            if (bh) bh.style.display = 'none';
          } catch(_) {}
          try { window.removeEventListener('report:ready', onReportReady); } catch(_) {}
        };
        try { window.addEventListener('report:ready', onReportReady, { once: true }); } catch(_) {}
      } catch(_) {}
      setTimeout(() => {
        const reportSection = document.getElementById('page-report');
        if (reportSection) {
          const buttons = reportSection.querySelector('.actions');
          if (buttons) {
            buttons.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
      setTimeout(() => {
        try {
          const now = Date.now();
          if (!window._lastAutoReportTs || (now - window._lastAutoReportTs) > 1500) {
            window._lastAutoReportTs = now;
            if (typeof global.generarReportePDF === 'function') {
              global.generarReportePDF();
            }
          }
        } catch(_) {}
      }, 300);
    }
    if (pageId === 'page-config') {
      try {
        const filtro = document.getElementById('filtroLetras');
        if (filtro) { filtro.value = ''; filtro.disabled = false; }
        const pr = document.getElementById('porcentajeRefuerzo');
        if (pr) pr.value = '';
        const strict = document.getElementById('strictMode');
        if (strict) strict.disabled = false;
        const acentos = document.getElementById('acentosObligatorios');
        if (acentos) { acentos.checked = false; acentos.disabled = false; }
      } catch(_) {}
      const a = document.getElementById('alumno');
      if (a) { a.focus(); try { a.select(); } catch (_) {} }
      // Actualizar estado del botón Siguiente
      setTimeout(() => {
        try {
          if (typeof global.validateFields === 'function') {
            global.validateFields();
          } else if (typeof global.Params !== 'undefined' && typeof global.Params.updateNextEnabled === 'function') {
            global.Params.updateNextEnabled();
          }
        } catch(_) {}
      }, 100);
    }
    if (pageId === 'page-tutor-info') {
      // Enfocar primer campo de información del tutor
      setTimeout(() => {
        try {
          const tName = document.getElementById('tutorName');
          if (tName) { tName.focus(); try { tName.select(); } catch(_) {} }
        } catch(_) {}
      }, 50);
    }
    if (pageId === 'page-tutor-config') {
      // Enfocar primer campo de configuración del ejercicio
      setTimeout(() => {
        try {
          const tCantidad = document.getElementById('tutorCantidad');
          if (tCantidad) { tCantidad.focus(); try { tCantidad.select(); } catch(_) {} }
        } catch(_) {}
        try { if (typeof global.attachEnterNavigationTutorConfig === 'function') global.attachEnterNavigationTutorConfig(); } catch(_) {}
      }, 50);
    }
    if (pageId === 'page-participant') {
      // Asegurar bindings y mostrar ayuda en primera visita
      try { if (typeof global.attachEnterNavigationParticipantConnect === 'function') global.attachEnterNavigationParticipantConnect(); } catch(_) {}
      try { if (window.PageHints && typeof window.PageHints.showFirstTime === 'function') window.PageHints.showFirstTime('page-participant'); } catch(_) {}
      // Enfocar el campo de nombre de participante de forma robusta
      try {
        const tryFocusName = () => {
          try {
            const name = document.getElementById('participantName');
            if (name && getComputedStyle(name).display !== 'none' && name.offsetParent !== null) {
              name.focus();
              try { name.select(); } catch(_) {}
              return true;
            }
          } catch(_) {}
          return false;
        };
        // Intentos espaciados para cubrir render asíncrono
        if (!tryFocusName()) setTimeout(tryFocusName, 120);
        setTimeout(tryFocusName, 300);
      } catch(_) {}
    }
    // Notificar a suscriptores
    __emitPageChange(pageId);
  }

  // Ir de información del tutor a configuración del ejercicio
  function goToTutorConfig() {
    const nameInput = document.getElementById('tutorName');
    const groupInput = document.getElementById('tutorGroup');
    const tutorName = (nameInput?.value || '').trim();
    const tutorGroup = (groupInput?.value || '').trim();

    // Validar que se hayan ingresado los datos
    if (!tutorName) {
      alert('Por favor ingresa el nombre del tutor/administrador');
      if (nameInput) nameInput.focus();
      return;
    }
    
    if (!tutorGroup) {
      alert('Por favor ingresa el grupo/grado');
      if (groupInput) groupInput.focus();
      return;
    }

    // Guardar temporalmente en global para usarlos después
    if (!global.tutorConfig) global.tutorConfig = {};
    global.tutorConfig.tutorName = tutorName;
    global.tutorConfig.tutorGroup = tutorGroup;

    // Ir a la página de configuración del ejercicio
    goToPage('page-tutor-config');
  }

  global.goToPage = goToPage;
  global.onPageChange = onPageChange;
  global.goToTutorConfig = goToTutorConfig;
  // selectRole se define en app.js con más funcionalidad
})(typeof window !== 'undefined' ? window : globalThis);
