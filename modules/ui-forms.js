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
    const fieldOrder = ['alumno', 'curso', 'filtroLetras', 'cantidad', 'btnNext'];

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
