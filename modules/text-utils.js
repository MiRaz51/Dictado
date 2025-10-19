/**
 * Utilidades de normalización y manipulación de texto
 * Centraliza la lógica de normalización que se repite en múltiples módulos
 */

(function(global) {
  'use strict';

  /**
   * Normaliza un texto eliminando tildes y convirtiendo a minúsculas
   * Usa WordFilters.normalizarBasico si está disponible, sino fallback manual
   * 
   * @param {string} text - Texto a normalizar
   * @returns {string} Texto normalizado
   */
  function normalize(text) {
    try {
      if (typeof global.WordFilters !== 'undefined' && global.WordFilters.normalizarBasico) {
        return global.WordFilters.normalizarBasico(String(text || ''));
      }
      // Fallback: normalización manual
      return String(text || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Eliminar diacríticos
    } catch(_) {
      return String(text || '').toLowerCase().trim();
    }
  }

  /**
   * Compara dos textos ignorando tildes y mayúsculas
   * 
   * @param {string} text1 - Primer texto
   * @param {string} text2 - Segundo texto
   * @returns {boolean} true si son iguales (ignorando tildes/mayúsculas)
   */
  function compareIgnoreDiacritics(text1, text2) {
    return normalize(text1) === normalize(text2);
  }

  /**
   * Compara dos textos respetando o ignorando tildes según configuración
   * 
   * @param {string} text1 - Primer texto
   * @param {string} text2 - Segundo texto
   * @param {boolean} strictAccents - Si true, respeta tildes
   * @returns {boolean} true si son iguales
   */
  function compareText(text1, text2, strictAccents = false) {
    if (strictAccents) {
      return String(text1 || '').toLowerCase() === String(text2 || '').toLowerCase();
    }
    return compareIgnoreDiacritics(text1, text2);
  }

  /**
   * Obtiene el valor de un input y lo normaliza
   * 
   * @param {string} elementId - ID del elemento input
   * @returns {string} Valor normalizado del input
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
   * Convierte un valor booleano-like a boolean
   * Acepta: true, 'si', 'true', '1', 'sí'
   * 
   * @param {any} value - Valor a convertir
   * @returns {boolean} true o false
   */
  function toBoolean(value) {
    if (value === true || value === false) return value;
    try {
      const s = String(value ?? '').trim();
      const norm = normalize(s);
      return norm === 'si' || norm === 'true' || norm === '1';
    } catch(_) {
      return false;
    }
  }

  // Exportar funciones
  global.TextUtils = {
    normalize,
    compareIgnoreDiacritics,
    compareText,
    getInputValue,
    toBoolean
  };

})(window);
