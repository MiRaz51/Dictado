(function(global){
  'use strict';

  function getAlumnoCursoId(){
    const alumno = (document.getElementById('alumno')?.value || '').trim();
    const curso  = (document.getElementById('curso')?.value || '').trim();
    const a = alumno ? (global.WordFilters && WordFilters.normalizarBasico ? WordFilters.normalizarBasico(alumno) : alumno.toLowerCase()) : 'anon';
    const c = curso ? (global.WordFilters && WordFilters.normalizarBasico ? WordFilters.normalizarBasico(curso) : curso.toLowerCase()) : 'sin-curso';
    return `${a}|${c}`;
  }

  function getKey(){
    const base = (global.CONFIG && global.CONFIG.ERROR_BANK_KEY) ? global.CONFIG.ERROR_BANK_KEY : 'dictado_error_bank_v1';
    return `${base}:${getAlumnoCursoId()}`;
  }

  function cargar(){
    try { return (global.CacheManager && CacheManager.get) ? (CacheManager.get(getKey()) || {}) : {}; } catch(_) { return {}; }
  }

  function guardar(bank){
    try { if (global.CacheManager && CacheManager.set) CacheManager.set(getKey(), bank || {}); } catch(_) {}
  }

  function registrar(palabra){
    try {
      const bank = cargar();
      const key = (global.WordFilters && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(palabra) : String(palabra||'').toLowerCase();
      const prev = bank[key] || { count: 0, lastSeen: 0 };
      bank[key] = { count: prev.count + 1, lastSeen: Date.now() };
      guardar(bank);
    } catch(_) {}
  }

  function resolver(palabra){
    try {
      const bank = cargar();
      const key = (global.WordFilters && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(palabra) : String(palabra||'').toLowerCase();
      if (bank && Object.prototype.hasOwnProperty.call(bank, key)) {
        // Eliminar definitivamente cuando se responda correctamente
        delete bank[key];
        guardar(bank);
      }
    } catch(_) {}
  }

  global.ErrorBank = { getAlumnoCursoId, getKey, cargar, guardar, registrar, resolver };
})(typeof window !== 'undefined' ? window : globalThis);
