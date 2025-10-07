(function(global){
  'use strict';

  // Validar palabra escrita por el usuario (acentos-insensible)
  function validarPalabraUsuario(userWord, correctWord) {
    const user = String(userWord || '').trim().toLowerCase();
    const correct = String(correctWord || '').trim().toLowerCase();
    if (!user || !correct) return false;
    if (user === correct) return true;
    // Comparación acento-insensible usando el módulo centralizado
    const nUser = global.WordFilters?.normalizarBasico ? global.WordFilters.normalizarBasico(user) : user;
    const nCorrect = global.WordFilters?.normalizarBasico ? global.WordFilters.normalizarBasico(correct) : correct;
    return nUser === nCorrect;
  }

  // Sanitiza la entrada para 'Letras a reforzar' (solo una letra o combinación válida)
  function filtrarLetrasEspanol(input) {
    if (!input) return;
    const valorOriginal = String(input.value || '');
    const elementosPermitidos = [
      'b', 'v', 'g', 'j', 'c', 'z', 's', 'h', 'x', 'y', 'w',
      'll', 'rr', 'ch', 'qu', 'gu', 'gü',
      'br', 'bl', 'cr', 'cl', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr',
      'cc', 'sc', 'xc', 'mp', 'mb', 'nv', 'nf', 'nm'
    ];
    let resultado = '';
    for (let i = 0; i < valorOriginal.length; i++) {
      const charActual = valorOriginal[i].toLowerCase();
      if (resultado.length === 0) {
        let puedeSerInicio = false;
        for (const elemento of elementosPermitidos) {
          if (elemento.startsWith(charActual)) { puedeSerInicio = true; break; }
        }
        if (puedeSerInicio) resultado += valorOriginal[i];
      } else {
        const posibleElemento = (resultado + valorOriginal[i]).toLowerCase();
        let esValido = false;
        if (elementosPermitidos.includes(posibleElemento)) {
          resultado += valorOriginal[i];
          break; // Elemento completo encontrado
        } else {
          for (const elemento of elementosPermitidos) {
            if (elemento.startsWith(posibleElemento)) { resultado += valorOriginal[i]; esValido = true; break; }
          }
          if (!esValido) break;
        }
      }
    }
    if (valorOriginal !== resultado) {
      input.value = resultado;
      try { input.setSelectionRange(resultado.length, resultado.length); } catch(_) {}
    }
  }

  // Exponer globales para compatibilidad con HTML inline handlers
  global.validarPalabraUsuario = global.validarPalabraUsuario || validarPalabraUsuario;
  global.filtrarLetrasEspanol = global.filtrarLetrasEspanol || filtrarLetrasEspanol;
})(typeof window !== 'undefined' ? window : globalThis);
