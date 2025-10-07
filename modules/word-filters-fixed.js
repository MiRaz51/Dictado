/*
 * Word Filters Module (clean version)
 * Provides filtering, difficulty, and selection utilities for the dictation app
 */

(function(global){
  'use strict';

  // ------------------------------
  // Constants
  // ------------------------------
  const EXCLUDE_DEFAULT = new Set([
    'allah','wifi','web','chat','email','online','software','hardware','internet',
    'blog','mouse','click','link','spam','hacker','backup','update','download',
    'upload','login','logout','password','username','hashtag','selfie','streaming',
    'smartphone','tablet','laptop','desktop','server','router','modem','bluetooth',
    'podcast','youtuber','influencer','tiktoker','gamer','streamer','blogger',
    'startup','freelancer','coworking','networking','marketing','branding','coaching',
    'workshop','webinar','tutorial','feedback','layout','template','framework'
  ]);

  // Non-Spanish patterns (heuristic)
  const NON_SPANISH_PATTERNS = [
    /^[bcdfghjklmnpqrstvwxyz]{4,}$/i, // 4+ consonants together
    /q(?!u)/i,                        // q without u
    /k[^aeiouáéíóúü]/i,              // k followed by consonant
    /[wxy]/i,                         // letters uncommon in Spanish words (heuristic)
  ];

  // Length by level
  const LONGITUD_POR_NIVEL = {
    1: { min: 0,  max: 5 },   // Básico
    2: { min: 4,  max: 8 },   // Intermedio
    3: { min: 6,  max: 12 },  // Avanzado
    4: { min: 10, max: 99 },  // Experto
  };

  // ------------------------------
  // Helpers
  // ------------------------------
  function validacionBasica(item){
    return !!(item && item.palabra && (item.freq || item.freq === 0));
  }

  function caracteresValidos(palabra){
    const p = String(palabra||'').toLowerCase().trim();
    return /^[a-záéíóúüñ]+$/i.test(p);
  }

  function listaExclusion(palabra){
    const p = String(palabra||'').toLowerCase().trim();
    return !EXCLUDE_DEFAULT.has(p);
  }

  // Heurístico síncrono para Español (similar a checkSpanish, sin async)
  function esEspanolHeuristico(palabra){
    try{
      const w = String(palabra||'').trim().toLowerCase();
      if (!w) return false;
      // Debe contener al menos una vocal y una consonante típicas del español
      if (!/[aeiouáéíóúü]/.test(w) || !/[bcdfghjklmnñpqrstvwxyz]/.test(w)) return false;
      // Excluir lista de términos conocidos en inglés/tech
      if (EXCLUDE_DEFAULT.has(w)) return false;
      // Patrones no españoles (q sin u, muchas consonantes seguidas, etc.)
      if (NON_SPANISH_PATTERNS.some(rx => rx.test(w))) return false;
      // Si contiene caracteres no alfabéticos latinos, excluir
      if (!/^[a-záéíóúüñ]+$/i.test(w)) return false;
      return true;
    }catch(_){ return false; }
  }

  function contarSilabas(palabra){
    if (!palabra || typeof palabra !== 'string') return 1;
    const w = palabra.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (w.length <= 1) return 1;
    let silabas = 0;
    let enVocal = false;
    for (let i=0;i<w.length;i++){
      const ch = w[i];
      const esVocal = /[aeiou]/.test(ch);
      if (esVocal){
        if (!enVocal) silabas++;
        enVocal = true;
      } else {
        enVocal = false;
      }
    }
    return Math.max(1, silabas);
  }

  function analizarAcentos(palabra){
    if (!palabra) return 0;
    const matches = String(palabra).match(/[áéíóúü]/g) || [];
    let score = matches.length * 15;
    if (matches.length > 1) score += matches.length * 8;
    if (matches.length > 2) score += matches.length * 6;
    if (matches.length > 3) score += matches.length * 10;
    return Math.min(40, score);
  }

  // Difficulty based on frequency (higher frequency -> easier -> higher score)
  function calcularDificultadPalabra(palabra, frecuencia, maxFreq){
    if (!palabra || !frecuencia || !maxFreq) return 50;
    const frecuenciaNormalizada = Math.min(1, Math.max(0, frecuencia / maxFreq));
    return Math.round(frecuenciaNormalizada * 100); // 0..100
  }

  function asignarNivel(dificultad, palabra=''){
    // Base on frequency-derived difficulty
    let nivelBase;
    if (dificultad >= 15) nivelBase = 1;
    else if (dificultad >= 8) nivelBase = 2;
    else if (dificultad >= 4) nivelBase = 3;
    else nivelBase = 4;

    const len = palabra.length;
    const cfg = LONGITUD_POR_NIVEL[nivelBase];
    if (cfg && len >= cfg.min && len <= cfg.max) return nivelBase;

    // Adjust by length if outside base range
    for (let n=1;n<=4;n++){
      const c = LONGITUD_POR_NIVEL[n];
      if (len >= c.min && len <= c.max) return n;
    }
    return nivelBase;
  }

  async function checkSpanish(word){
    try{
      const w = String(word||'').trim().toLowerCase();
      if (!w) return false;
      if (!/[aeiouáéíóúü]/.test(w) || !/[bcdfghjklmnñpqrstvwxyz]/.test(w)) return false;
      if (EXCLUDE_DEFAULT.has(w)) return false;
      if (NON_SPANISH_PATTERNS.some(rx => rx.test(w))) return false;
      return true;
    }catch(e){ return false; }
  }

  function filtrarPorLetrasEspecificas(palabras, letras){
    if (!letras) return palabras;
    const needle = String(letras).toLowerCase();
    return palabras.filter(obj => String(obj.palabra).toLowerCase().includes(needle));
  }

  function filtrarPorAcentos(palabras, conAcentos){
    if (conAcentos === undefined) return palabras;
    return palabras.filter(obj => {
      const hasAccent = /[áéíóúü]/.test(obj.palabra);
      return hasAccent === !!conAcentos;
    });
  }

  function filtrarRefuerzoAdaptativo(candidatas, bancoErrores){
    if (!bancoErrores || Object.keys(bancoErrores).length === 0) return candidatas;
    const withErrors = candidatas.filter(p => {
      const k = String(p).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      return bancoErrores[k] && bancoErrores[k].count > 0;
    });
    return withErrors.sort((a,b)=>{
      const ka = String(a).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const kb = String(b).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      return (bancoErrores[kb]?.count||0) - (bancoErrores[ka]?.count||0);
    });
  }

  function aplicarFiltrosCargaInicial(palabrasArray){
    return palabrasArray.filter(item => 
      validacionBasica(item)
      && caracteresValidos(item.palabra)
      && listaExclusion(item.palabra)
      && esEspanolHeuristico(item.palabra)
    );
  }

  function procesarPalabrasConNiveles(palabrasArray, maxFreq){
    const mf = maxFreq || Math.max(...palabrasArray.map(x => x.freq || 0), 1);
    return palabrasArray.map(item => {
      const palabra = String(item.palabra).toLowerCase().trim();
      const frecuencia = item.freq || 0;
      const dificultad = calcularDificultadPalabra(palabra, frecuencia, mf);
      const nivel = asignarNivel(dificultad, palabra);
      return {
        palabra,
        freq: frecuencia,
        dificultad,
        nivel,
        silabas: contarSilabas(palabra),
        acentos: /[áéíóúü]/.test(palabra)
      };
    });
  }

  function seleccionarPalabrasPorNivel(wordsByLevel, nivel, cantidad, filtros={}){
    const list = Array.isArray(wordsByLevel[nivel]) ? [...wordsByLevel[nivel]] : [];
    let disponibles = list;

    if (filtros.letrasEspecificas) disponibles = filtrarPorLetrasEspecificas(disponibles, filtros.letrasEspecificas);
    if (filtros.conAcentos !== undefined) disponibles = filtrarPorAcentos(disponibles, filtros.conAcentos);

    // Shuffle
    const shuffled = disponibles.slice().sort(() => Math.random() - 0.5);

    const usadas = new Set();
    const resultado = [];
    for (const obj of shuffled){
      const w = obj.palabra;
      if (!usadas.has(w)){
        resultado.push(w);
        usadas.add(w);
      }
      if (resultado.length >= (cantidad || 50)) break;
    }

    // If not enough, keep pulling without replacement
    let pool = disponibles.slice();
    while (resultado.length < (cantidad || 50) && pool.length > 0){
      const idx = Math.floor(Math.random() * pool.length);
      const w = pool[idx].palabra;
      if (!usadas.has(w)){
        resultado.push(w);
        usadas.add(w);
      }
      pool.splice(idx,1);
    }

    return resultado;
  }

  // --- Nuevos helpers para arreglos de strings simples ---
  // Complejidad silábica (heurística usada por app)
  function analizarComplejidadSilabica(palabra){
    if (!palabra) return 0;
    const w = String(palabra).toLowerCase();
    let complejidad = 0;
    const consonantesComplejas = /[ñrxzjqwckph]/g;
    const gruposConsonanticos = /[bcdfghjklmnpqrstvwxyz]{2,}/g;
    const diptongos = /[aeiou][iu]|[iu][aeiou]/g;
    const triptongos = /[iu][aeiou][iu]/g;
    const hiatos = /[aeo][aeo]|[ií][aeo]|[aeo][ií]/g;
    const consonantesDificiles = /[bcdfghjklmnpqrstvwxyz]{3,}/g;
    complejidad += (w.match(consonantesComplejas) || []).length * 5;
    complejidad += (w.match(gruposConsonanticos) || []).length * 7;
    complejidad += (w.match(diptongos) || []).length * 4;
    complejidad += (w.match(triptongos) || []).length * 10;
    complejidad += (w.match(hiatos) || []).length * 4;
    complejidad += (w.match(consonantesDificiles) || []).length * 8;
    return Math.min(50, complejidad);
  }
  // Función de normalización centralizada (usada en múltiples módulos)
  function normalizarBasico(str){
    return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  // Alias para compatibilidad
  const _normalizeBasic = normalizarBasico;

  function filtrarPorLetrasSimples(palabras, filtros){
    try{
      if (!Array.isArray(palabras)) return [];
      let needles = filtros;
      if (!Array.isArray(needles)) {
        needles = String(needles||'').split(/[\,\s]+/).map(_normalizeBasic).filter(Boolean);
      } else {
        needles = needles.map(_normalizeBasic).filter(Boolean);
      }
      if (needles.length === 0) return palabras.slice();
      return palabras.filter(p => {
        const pn = _normalizeBasic(p);
        return needles.every(f => pn.includes(f));
      });
    }catch(_){ return palabras || []; }
  }

  // Filtro de compatibilidad por longitud (legacy)
  const LENGTH_RANGES_LEGACY = {
    1: { min: 3, max: 5 },  // Básico
    2: { min: 4, max: 7 },  // Intermedio
    3: { min: 5, max: 10 }, // Avanzado
    4: { min: 3, max: 15 }, // Experto
  };

  function filtrarPorLongitudCompat(words, nivel){
    if (!Array.isArray(words)) return [];
    let key = nivel;
    if (typeof nivel === 'string'){
      const map = { basico:1, intermedio:2, avanzado:3, experto:4, facil:1, medio:2, dificil:3 };
      key = map[nivel] ?? 1;
    }
    const cfg = LENGTH_RANGES_LEGACY[key] || { min:3, max:10 };
    return words.filter(word => {
      if (!word || word.length < cfg.min || word.length > cfg.max) return false;
      if (word.includes('-') || word.includes('.')) return false;
      if (/^[^a-záéíóúüñ]/i.test(word)) return false;
      return true;
    });
  }

  const api = {
    EXCLUDE_DEFAULT,
    NON_SPANISH_PATTERNS,
    LONGITUD_POR_NIVEL,
    validacionBasica,
    caracteresValidos,
    listaExclusion,
    calcularDificultadPalabra,
    asignarNivel,
    filtrarPorLetrasEspecificas,
    filtrarPorAcentos,
    checkSpanish,
    filtrarRefuerzoAdaptativo,
    contarSilabas,
    analizarAcentos,
    aplicarFiltrosCargaInicial,
    procesarPalabrasConNiveles,
    seleccionarPalabrasPorNivel,
    filtrarPorLetrasSimples,
    filtrarPorLongitudCompat,
    LENGTH_RANGES_LEGACY,
    // Exponer normalización básica para comparaciones acento-insensibles (función centralizada)
    normalizarBasico,
    analizarComplejidadSilabica,
    // También exponer heurístico síncrono si se requiere en otros módulos
    esEspanolHeuristico,
  };

  // UMD export
  if (typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
  if (typeof global !== 'undefined'){
    global.WordFilters = api;
  }

  console.log('✅ WordFilters (fixed) loaded');
})(typeof window !== 'undefined' ? window : globalThis);
