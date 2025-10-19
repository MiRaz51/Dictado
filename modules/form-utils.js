/**
 * Utilidades para manejo de formularios
 * Centraliza operaciones comunes con inputs y formularios
 */

(function(global) {
  'use strict';

  /**
   * Obtiene el valor de un input de texto y lo limpia
   * @param {string} elementId - ID del elemento
   * @returns {string} Valor limpio del input
   */
  function getInputValue(elementId) {
    try {
      const element = document.getElementById(elementId);
      return (element?.value || '').trim();
    } catch(_) {
      return '';
    }
  }

  /**
   * Obtiene el valor de un checkbox
   * @param {string} elementId - ID del checkbox
   * @returns {boolean} Estado del checkbox
   */
  function getCheckboxValue(elementId) {
    try {
      const element = document.getElementById(elementId);
      return element?.checked || false;
    } catch(_) {
      return false;
    }
  }

  /**
   * Obtiene el valor de un input numérico
   * @param {string} elementId - ID del elemento
   * @param {number} defaultValue - Valor por defecto si no es válido
   * @param {number} min - Valor mínimo permitido
   * @param {number} max - Valor máximo permitido
   * @returns {number} Valor numérico
   */
  function getNumberValue(elementId, defaultValue = 0, min = null, max = null) {
    try {
      const element = document.getElementById(elementId);
      let value = parseInt(element?.value, 10);
      
      if (!Number.isInteger(value)) {
        return defaultValue;
      }
      
      if (min !== null) value = Math.max(min, value);
      if (max !== null) value = Math.min(max, value);
      
      return value;
    } catch(_) {
      return defaultValue;
    }
  }

  /**
   * Establece el valor de un input
   * @param {string} elementId - ID del elemento
   * @param {string} value - Valor a establecer
   */
  function setInputValue(elementId, value) {
    try {
      const element = document.getElementById(elementId);
      if (element) element.value = value;
    } catch(_) {}
  }

  /**
   * Establece el estado de un checkbox
   * @param {string} elementId - ID del checkbox
   * @param {boolean} checked - Estado a establecer
   */
  function setCheckboxValue(elementId, checked) {
    try {
      const element = document.getElementById(elementId);
      if (element) element.checked = checked;
    } catch(_) {}
  }

  /**
   * Habilita o deshabilita un elemento
   * @param {string} elementId - ID del elemento
   * @param {boolean} enabled - true para habilitar, false para deshabilitar
   */
  function setEnabled(elementId, enabled) {
    try {
      const element = document.getElementById(elementId);
      if (element) element.disabled = !enabled;
    } catch(_) {}
  }

  /**
   * Limpia el valor de un input
   * @param {string} elementId - ID del elemento
   */
  function clearInput(elementId) {
    setInputValue(elementId, '');
  }

  /**
   * Obtiene datos del alumno y curso desde el formulario
   * @returns {Object} {alumno, curso}
   */
  function getStudentInfo() {
    return {
      alumno: getInputValue('alumno'),
      curso: getInputValue('curso')
    };
  }

  /**
   * Obtiene configuración del filtro de letras
   * @returns {Object} {filtroLetras, porcentajeRefuerzo, acentosObligatorios}
   */
  function getFilterConfig() {
    return {
      filtroLetras: getInputValue('filtroLetras'),
      porcentajeRefuerzo: getNumberValue('porcentajeRefuerzo', 0, 0, 100),
      acentosObligatorios: getCheckboxValue('acentosObligatorios')
    };
  }

  /**
   * Valida que un campo no esté vacío
   * @param {string} elementId - ID del elemento
   * @returns {boolean} true si tiene valor
   */
  function isFieldFilled(elementId) {
    return getInputValue(elementId).length > 0;
  }

  /**
   * Enfoca un elemento
   * @param {string} elementId - ID del elemento
   */
  function focusElement(elementId) {
    try {
      const element = document.getElementById(elementId);
      if (element) element.focus();
    } catch(_) {}
  }

  // Exportar funciones
  global.FormUtils = {
    getInputValue,
    getCheckboxValue,
    getNumberValue,
    setInputValue,
    setCheckboxValue,
    setEnabled,
    clearInput,
    getStudentInfo,
    getFilterConfig,
    isFieldFilled,
    focusElement
  };

})(window);
