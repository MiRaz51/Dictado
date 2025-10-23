/**
 * Module: ui-forms.js
 * Responsibility: Form wiring and Enter navigation for config page.
 * Exports: window.configurarEnterSiguiente
 * Depends on: none (optionally window.goNextFromConfig)
 * Load order: before app.js init that calls configurarEnterSiguiente()
 */
(function(global){
  'use strict';

  function configurarEnterSiguiente(){
    const fieldOrder = ['alumno', 'edad', 'btnNext'];

    const focusElement = (elementId) => {
      const element = document.getElementById(elementId);
      if (!element) return false;
      element.focus();
      if (element.select && elementId !== 'btnNext') {
        try { element.select(); } catch(_) {}
      }
      return true;
    };

    fieldOrder.forEach((id, index) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        
        // Validar edad antes de avanzar
        if (id === 'edad') {
          const edadVal = parseInt(element.value || '0');
          if (!edadVal || edadVal < 6) {
            alert('Por favor, ingresa una edad válida (mínimo 6 años).');
            element.focus();
            return;
          }
        }
        
        if (id === 'btnNext') { try { global.goNextFromConfig && global.goNextFromConfig(); } catch(_) {} return; }
        for (let i = index + 1; i < fieldOrder.length; i++) {
          if (focusElement(fieldOrder[i])) break;
        }
      });
    });
  }

  // Expose
  global.configurarEnterSiguiente = global.configurarEnterSiguiente || configurarEnterSiguiente;
})(typeof window !== 'undefined' ? window : this);
