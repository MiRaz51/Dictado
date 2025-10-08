/**
 * Module: filters.js
 * Responsibility: Centralize word selection/filter wrappers over WordFilters
 * Exports: window.seleccionarPalabrasPorNivel, window.filtrarPalabrasRAE
 * Depends on: window.WordFilters, optionally DataAPI/raeWordsData for pools
 * Load order: after word-filters-fixed.js and before app.js
 */
(function(global){
  'use strict';
  // Wrappers centralizados sobre WordFilters para mantener compatibilidad

  function seleccionarPalabrasPorNivel(nivel, cantidad, filtros = {}){
    try {
      const byLevel = (global.raeWordsData && global.raeWordsData.wordsByLevel) || {};
      return global.WordFilters.seleccionarPalabrasPorNivel(byLevel, nivel, cantidad, filtros);
    } catch(e) {
      console.warn('[filters] seleccionarPalabrasPorNivel fallback:', e);
      return [];
    }
  }

  function filtrarPalabrasRAE(words, nivel){
    // Compat: si es array de strings, usar filtro de longitud antiguo
    try {
      if (Array.isArray(words) && words.length > 0 && typeof words[0] === 'string') {
        return global.WordFilters.filtrarPorLongitudCompat(words, nivel);
      }
      // Formato nuevo: usar selección estratificada (tomando largo como cantidad)
      const cantidad = (Array.isArray(words) ? words.length : 50) || 50;
      return seleccionarPalabrasPorNivel(nivel, cantidad);
    } catch(e) {
      console.warn('[filters] filtrarPalabrasRAE fallback:', e);
      return [];
    }
  }

  // Expose only if not already defined (mantener compatibilidad)
  global.seleccionarPalabrasPorNivel = global.seleccionarPalabrasPorNivel || seleccionarPalabrasPorNivel;
  global.filtrarPalabrasRAE = global.filtrarPalabrasRAE || filtrarPalabrasRAE;
})(typeof window !== 'undefined' ? window : this);
