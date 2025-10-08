/**
 * Module: ui-core.js
 * Responsibility: Core UI helpers (scroll, clear inputs, required validation)
 * Exports: window.smoothScrollIntoView, window.clearInputs, window.validateRequiredFields
 * Depends on: none
 * Load order: before modules that call these helpers (e.g., app.js, individual-mode.js)
 */
(function(global){
  'use strict';

  function smoothScrollIntoView(target, opts = { block: 'center', behavior: 'smooth' }) {
    try {
      const el = (typeof target === 'string') ? document.getElementById(target) : target;
      if (!el) return;
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView(opts);
      } else {
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } catch(_) {}
  }

  function clearInputs(...ids) {
    ids.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = false;
        } else {
          element.value = '';
        }
      }
    });
  }

  function validateRequiredFields(fields) {
    const errors = [];
    fields.forEach(({ id, name }) => {
      const element = document.getElementById(id);
      if (!element || !String(element.value || '').trim()) {
        errors.push(name);
      }
    });
    return errors;
  }

  // Expose
  global.smoothScrollIntoView = global.smoothScrollIntoView || smoothScrollIntoView;
  global.clearInputs = global.clearInputs || clearInputs;
  global.validateRequiredFields = global.validateRequiredFields || validateRequiredFields;
})(typeof window !== 'undefined' ? window : this);
