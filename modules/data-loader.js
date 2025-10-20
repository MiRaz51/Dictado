// Carga de datos RAE y preparación de niveles
// Expone globalmente: DataLoader.cargarPalabrasRAE(), DataLoader.prepararNivelesDinamicos()
// Mantiene compatibilidad dejando window.raeWordsData, window.palabrasPorNivelDinamico y window.cargandoDiccionario
(function(global){
  'use strict';

  const DataLoader = {};
  const CacheManager = global.CacheManager;
  const CONFIG = global.CONFIG || {};
  const WORD_LIST_URL = CONFIG.RAE_WORD_LIST_URL || './palabras-con-frecuencia.json';

  // Datos RAE cargados desde JSON con frecuencias
  global.raeWordsData = global.raeWordsData || {
    words: [],
    wordsSet: new Set(),
    wordsByLevel: { 1: [], 2: [], 3: [], 4: [] },
    loaded: false
  };

  global.palabrasPorNivelDinamico = global.palabrasPorNivelDinamico || null;
  global.cargandoDiccionario = global.cargandoDiccionario || false;

  // Cargar palabras desde JSON con análisis de dificultad
  async function cargarPalabrasRAE() {
    const raeWordsData = global.raeWordsData;
    if (raeWordsData.loaded) {
      return raeWordsData.words;
    }

    // Verificar caché usando CacheManager
    const cached = CacheManager && CacheManager.get ? CacheManager.get(CONFIG.RAE_CACHE_KEY) : null;
    if (cached && CacheManager && !CacheManager.isExpired(cached.ts, CONFIG.RAE_CACHE_TTL_MS) && 
        Array.isArray(cached.data) && cached.data.length > 0) {
      let cachedData = cached.data;
      // Validar si el caché trae 'nivel' calculado; si no, reprocesar para evitar que todo caiga en nivel 1
      let needsReprocess = false;
      try {
        const sample = cachedData[0] || {};
        if (typeof sample.nivel === 'undefined') needsReprocess = true;
      } catch(_) {}
      if (needsReprocess && global.WordFilters && WordFilters.procesarPalabrasConNiveles) {
        try {
          // Aplicar filtros básicos si existen
          if (WordFilters.aplicarFiltrosCargaInicial) {
            cachedData = WordFilters.aplicarFiltrosCargaInicial(cachedData);
          }
          cachedData = WordFilters.procesarPalabrasConNiveles(cachedData);
          // Sobrescribir caché con la versión procesada
          CacheManager.set(CONFIG.RAE_CACHE_KEY, { ts: Date.now(), data: cachedData });
        } catch(e) {
          console.warn('[DataLoader] No se pudo reprocesar caché, se usará tal cual:', e);
        }
      }
      raeWordsData.words = cachedData;
      raeWordsData.wordsSet = new Set(cachedData.map(w => w.palabra));
      raeWordsData.wordsByLevel = { 1: [], 2: [], 3: [], 4: [] };
      for (const item of cachedData) {
        const lvl = Math.max(1, Math.min(4, item.nivel || 1));
        if (!raeWordsData.wordsByLevel[lvl]) raeWordsData.wordsByLevel[lvl] = [];
        raeWordsData.wordsByLevel[lvl].push(item);
      }
      raeWordsData.loaded = true;
      return cachedData;
    }

    // Cargar archivo JSON
    try {
      const resp = await fetch(WORD_LIST_URL);
      if (!resp.ok) throw new Error(`No se pudo cargar el archivo de palabras (${resp.status} ${resp.statusText})`);
      const palabrasRaw = await resp.json();

      // Asegurar estructura y niveles usando WordFilters
      let palabrasValidas = Array.isArray(palabrasRaw) ? palabrasRaw : [];
      try {
        if (global.WordFilters && WordFilters.aplicarFiltrosCargaInicial) {
          palabrasValidas = WordFilters.aplicarFiltrosCargaInicial(palabrasValidas);
          palabrasValidas = WordFilters.procesarPalabrasConNiveles(palabrasValidas);
        }
      } catch (e) {
        console.warn('[DataLoader] No se pudieron aplicar filtros/procesamiento avanzados:', e);
      }

      const palabrasProcesadas = palabrasValidas;

      // Reconstruir estructuras
      raeWordsData.wordsByLevel = { 1: [], 2: [], 3: [], 4: [] };
      for (const item of palabrasProcesadas) {
        const lvl = Math.max(1, Math.min(4, item.nivel || 1));
        if (!raeWordsData.wordsByLevel[lvl]) raeWordsData.wordsByLevel[lvl] = [];
        raeWordsData.wordsByLevel[lvl].push(item);
      }

      // Guardar en caché
      if (CacheManager && CacheManager.set) {
        CacheManager.set(CONFIG.RAE_CACHE_KEY, { ts: Date.now(), data: palabrasProcesadas });
      }

      raeWordsData.words = palabrasProcesadas;
      raeWordsData.wordsSet = new Set(palabrasProcesadas.map(w => w.palabra));
      raeWordsData.loaded = true;
      return palabrasProcesadas;
    } catch (error) {
      console.error('[DataLoader] Error cargando palabras:', error);
      throw error;
    }
  }

  async function prepararNivelesDinamicos() {
    if (global.palabrasPorNivelDinamico || global.cargandoDiccionario) return; // ya listo o en progreso
    global.cargandoDiccionario = true;
    try {
      const palabrasRAE = await cargarPalabrasRAE();
      const raeWordsData = global.raeWordsData;
      if (!raeWordsData.loaded || !raeWordsData.wordsByLevel) {
        throw new Error('Datos de palabras no cargados correctamente');
      }
      const basico = raeWordsData.wordsByLevel[1].map(w => w.palabra);
      const intermedio = raeWordsData.wordsByLevel[2].map(w => w.palabra);
      const avanzado = raeWordsData.wordsByLevel[3].map(w => w.palabra);
      const experto = raeWordsData.wordsByLevel[4].map(w => w.palabra);
      const facil = basico;
      const medio = intermedio;
      const dificil = [...avanzado, ...experto];
      global.palabrasPorNivelDinamico = { basico, intermedio, avanzado, experto, facil, medio, dificil };
    } catch (e) {
      console.warn('Error preparando niveles dinámicos:', e);
    } finally {
      global.cargandoDiccionario = false;
    }
  }

  DataLoader.cargarPalabrasRAE = cargarPalabrasRAE;
  DataLoader.prepararNivelesDinamicos = prepararNivelesDinamicos;
  global.DataLoader = DataLoader;
})(typeof window !== 'undefined' ? window : globalThis);
