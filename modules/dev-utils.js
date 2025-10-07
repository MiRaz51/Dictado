// Utilidades de desarrollo (recarga/diagnóstico)
// Expone globalmente: forzarRecargaJSON, forzarRecargaConCacheBusting, solucionarLiveServer
(function(global){
  'use strict';

  const CONFIG = global.CONFIG || {};
  const CacheManager = global.CacheManager;

  // Función para forzar la recarga del archivo JSON (limpiar caché)
  async function forzarRecargaJSON() {
    try {
      console.log('🔄 Forzando recarga del archivo JSON...');
      CacheManager && CacheManager.remove && CacheManager.remove(CONFIG.RAE_CACHE_KEY);
      if (global.raeWordsData) {
        global.raeWordsData.loaded = false;
        global.raeWordsData.words = [];
        global.raeWordsData.wordsSet = new Set();
        global.raeWordsData.wordsByLevel = { 1: [], 2: [], 3: [], 4: [] };
      }
      global.palabrasPorNivelDinamico = null;
      global.cargandoDiccionario = false;
      console.log('✅ Caché limpiado. Ejecuta prepararNivelesDinamicos() para recargar.');
    } catch(e) { console.warn(e); }
  }

  // Diagnóstico rápido del sistema (niveles y totales)
  function diagnosticarSistema() {
    try {
      console.log('=== DIAGNÓSTICO DEL SISTEMA ===');
      const CONFIG = global.CONFIG || {};
      console.log(`📁 Archivo configurado: ${CONFIG.RAE_WORD_LIST_URL}`);
      console.log(`💾 Cache key: ${CONFIG.RAE_CACHE_KEY}`);
      const data = global.raeWordsData || { loaded:false, words:[], wordsByLevel:{} };
      console.log(`\n📊 Estado de datos:`);
      console.log(`   Datos cargados: ${data.loaded ? '✅' : '❌'}`);
      console.log(`   Total palabras: ${Array.isArray(data.words) ? data.words.length : 0}`);
      try {
        for (let nivel = 1; nivel <= 4; nivel++) {
          const cantidad = data.wordsByLevel && Array.isArray(data.wordsByLevel[nivel]) ? data.wordsByLevel[nivel].length : 0;
          console.log(`   Nivel ${nivel}: ${cantidad} palabras`);
        }
      } catch(_) {}
      console.log('=== FIN DIAGNÓSTICO ===');
      return true;
    } catch (e) { console.warn('[DevUtils] diagnosticarSistema error:', e); return false; }
  }

  // Función para forzar la recarga con cache busting (solución para Live Server)
  async function forzarRecargaConCacheBusting() {
    console.log('🔄 Forzando recarga con cache busting para Live Server...');
    CacheManager && CacheManager.remove && CacheManager.remove(CONFIG.RAE_CACHE_KEY);
    if (global.raeWordsData) {
      global.raeWordsData.loaded = false;
      global.raeWordsData.words = [];
      global.raeWordsData.wordsSet = new Set();
      global.raeWordsData.wordsByLevel = { 1: [], 2: [], 3: [], 4: [] };
    }
    global.palabrasPorNivelDinamico = null;
    global.cargandoDiccionario = false;
    const originalUrl = './palabras-con-frecuencia.json';
    try { global.CONFIG.RAE_WORD_LIST_URL = `${originalUrl}?t=${Date.now()}`; } catch(_) {}
    console.log(`📁 URL actualizada: ${global.CONFIG && global.CONFIG.RAE_WORD_LIST_URL}`);
    console.log('✅ Caché limpiado. Ejecuta prepararNivelesDinamicos() para recargar.');
  }

  // --- Nuevas utilidades movidas desde app.js ---
  function obtenerEstadisticasNiveles() {
    try {
      const raeWordsData = global.raeWordsData || {};
      if (!raeWordsData.loaded) return { error: 'Datos no cargados' };
      const stats = { total: (raeWordsData.words||[]).length, porNivel:{}, ejemplos:{}, distribuciones:{} };
      for (let nivel=1; nivel<=4; nivel++){
        const palabrasNivel = (raeWordsData.wordsByLevel?.[nivel]) || [];
        stats.porNivel[nivel] = { cantidad: palabrasNivel.length, porcentaje: ((palabrasNivel.length / stats.total) * 100).toFixed(1) };
        stats.ejemplos[nivel] = palabrasNivel.slice(0,10).map(w=>({ palabra:w.palabra, dificultad:w.dificultad, frecuencia:w.freq, silabas:w.silabas, acentos:w.acentos }));
        const difs = palabrasNivel.map(w=>w.dificultad);
        stats.distribuciones[nivel] = { min: Math.min(...difs), max: Math.max(...difs), promedio: (difs.reduce((a,b)=>a+b, 0)/(difs.length||1)).toFixed(1) };
      }
      return stats;
    } catch(_) { return { error: 'No disponible' }; }
  }

  function probarSistemaNiveles() {
    try {
      const stats = obtenerEstadisticasNiveles();
      if (stats.error) { console.log('❌', stats.error); return; }
      console.log('=== PRUEBA DEL SISTEMA DE NIVELES CON FRECUENCIAS ===');
      console.log(`📊 Total de palabras procesadas: ${stats.total}`);
      for (let nivel=1; nivel<=4; nivel++){
        const nombreNivel = ['', 'Básico','Intermedio','Avanzado','Experto'][nivel];
        const info = stats.porNivel[nivel]; const dist = stats.distribuciones[nivel];
        console.log(`\n🎯 Nivel ${nivel} (${nombreNivel}):`);
        console.log(`   Palabras: ${info.cantidad} (${info.porcentaje}%)`);
        console.log(`   Dificultad: ${dist.min}-${dist.max} (promedio: ${dist.promedio})`);
        console.log(`   Ejemplos: ${stats.ejemplos[nivel].slice(0,5).map(w=>w.palabra).join(', ')}`);
      }
      console.log('\n✅ Prueba completada');
    } catch(e){ console.warn('No se pudo ejecutar prueba de niveles:', e); }
  }

  // Utilidad de delegación (migrada desde app.js)
  function __delegateLater(aliasName, args = [], onTimeoutMsg = '') {
    try {
      let attempts = 0;
      const maxAttempts = 20; // ~2s a 100ms
      const tick = () => {
        try {
          if (typeof global !== 'undefined' && typeof global[aliasName] === 'function') {
            return global[aliasName].apply(global, args);
          }
        } catch(_) {}
        attempts++;
        if (attempts < maxAttempts) {
          return setTimeout(tick, 100);
        }
        if (onTimeoutMsg) {
          console.warn(onTimeoutMsg);
          try { alert(onTimeoutMsg); } catch(_) {}
        }
      };
      return tick();
    } catch(_) {}
  }

  global.forzarRecargaConCacheBusting = forzarRecargaConCacheBusting;
  global.forzarRecargaJSON = forzarRecargaJSON;
  global.diagnosticarSistema = diagnosticarSistema;
  // Exponer pruebas
  global.obtenerEstadisticasNiveles = obtenerEstadisticasNiveles;
  global.probarSistemaNiveles = probarSistemaNiveles;
  if (typeof global.__delegateLater === 'undefined') global.__delegateLater = __delegateLater;

  console.log('✅ DevUtils cargado');
})(typeof window !== 'undefined' ? window : globalThis);
