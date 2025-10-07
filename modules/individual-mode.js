(function(global){
  'use strict';

  // Iniciar juego en modo individual
  async function iniciarJuego(nivel) {
    console.log(`[DEBUG] Iniciando juego con nivel: ${nivel}`);
    try {
      if (!global.gameState.sessionStartISO) {
        const now = new Date().toISOString();
        global.gameState.sessionStartISO = now;
        global.sessionStartISO = now;
      }
      global.gameState.sessionEndISO = null;
      global.sessionEndISO = null;
    } catch(_) {}

    const alumnoEl2 = document.getElementById('alumno');
    const alumnoVal = (alumnoEl2?.value || '').trim();
    if (!alumnoVal) {
      const msg = 'Faltan datos del alumno.';
      try { alert(msg); } catch(_) {}
      const res = document.getElementById('resultado');
      if (res) {
        res.className = 'incorrecto';
        res.innerHTML = msg + ' Por favor, complétalo para iniciar la lección.';
      }
      alumnoEl2?.focus();
      alumnoEl2?.classList.add('input-error');
      const h = document.getElementById('alumnoError');
      if (h) h.style.display = 'block';
      document.getElementById('juego').style.display = 'none';
      document.getElementById('marcador').innerHTML = '';
      return;
    }
    document.getElementById('alumno')?.classList.remove('input-error');
    const aErr2 = document.getElementById('alumnoError'); if (aErr2) aErr2.style.display = 'none';

    if (global.currentMode === 'individual') {
      if (!global.palabrasPorNivelDinamico && !global.cargandoDiccionario) {
        try {
          await (global.DataLoader && global.DataLoader.prepararNivelesDinamicos ? global.DataLoader.prepararNivelesDinamicos() : Promise.resolve());
        } catch (error) {
          console.warn('[DEBUG NIVEL] Error cargando dinámico, usando estático:', error);
        }
      }
    }

    const nivelNumerico = { basico:1, intermedio:2, avanzado:3, experto:4, facil:1, medio:2, dificil:3 }[nivel] || 1;
    // Guardar nivel actual (código) y también un texto legible en gameState para el reporte
    global.currentNivel = nivel;
    try {
      const levelNames = { basico:'Básico', intermedio:'Intermedio', avanzado:'Avanzado', experto:'Experto', facil:'Fácil', medio:'Medio', dificil:'Difícil' };
      if (global.gameState) global.gameState.currentLevel = levelNames[nivel] || nivel || '-';
    } catch(_) {}
    try { global.guardarParametros && global.guardarParametros(); } catch(_) {}
    try { global.refreshMetaAlumnoCurso && global.refreshMetaAlumnoCurso(true); } catch(_) {}

    try {
      if (global.window && window.DEBUG) {
        const s = document.getElementById('nivelesDiag');
        if (s && global.raeWordsData && global.raeWordsData.wordsByLevel) {
          const c1 = (raeWordsData.wordsByLevel[1]||[]).length;
          const c2 = (raeWordsData.wordsByLevel[2]||[]).length;
          const c3 = (raeWordsData.wordsByLevel[3]||[]).length;
          const c4 = (raeWordsData.wordsByLevel[4]||[]).length;
          s.textContent = `Niveles: 1:${c1} 2:${c2} 3:${c3} 4:${c4}`;
          s.style.display = '';
        }
      } else {
        const s = document.getElementById('nivelesDiag');
        if (s) s.style.display = 'none';
      }
    } catch(_) {}

    const juego = document.getElementById('juego');
    if (juego) juego.style.display = '';

    const acentosCheckbox = document.getElementById('acentosObligatorios');
    // En nivel Experto, forzar acentos activados; en Básico, forzar desactivados
    try {
      if (acentosCheckbox) {
        if (nivelNumerico === 4) acentosCheckbox.checked = true;
        if (nivelNumerico === 1) acentosCheckbox.checked = false;
      }
    } catch(_) {}
    if (acentosCheckbox) acentosCheckbox.disabled = true;
    const btnVolver = document.getElementById('btnVolverGame');
    if (btnVolver) btnVolver.disabled = true;

    const rawFiltro = document.getElementById('filtroLetras').value || '';
    const cantidadInput = parseInt(document.getElementById('cantidad').value, 10);
    const porcentajeRefuerzoRaw = document.getElementById('porcentajeRefuerzo')?.value;
    let porcentajeRefuerzo = parseInt(porcentajeRefuerzoRaw ?? '', 10);

    const filtros = rawFiltro.split(/[\,\s]+/).map(f => global.WordFilters.normalizarBasico(f)).filter(f => f.length > 0);
    if (filtros.length > 0) {
      if (!Number.isInteger(porcentajeRefuerzo)) porcentajeRefuerzo = 40;
    } else {
      porcentajeRefuerzo = 0;
    }
    porcentajeRefuerzo = Math.max(0, Math.min(100, porcentajeRefuerzo));

    const filtrosAvanzados = {};
    if (filtros.length > 0 && porcentajeRefuerzo >= 100) {
      filtrosAvanzados.letrasEspecificas = filtros.join('');
    }
    // En nivel Experto siempre activar; en Básico siempre desactivar; otros niveles según checkbox
    const acentosObligatorios = (nivelNumerico === 4)
      ? true
      : (nivelNumerico === 1 ? false : (document.getElementById('acentosObligatorios')?.checked));
    if (acentosObligatorios) filtrosAvanzados.conAcentos = true;

    try {
      if (!global.raeWordsData.loaded) {
        await (global.DataLoader && global.DataLoader.cargarPalabrasRAE ? global.DataLoader.cargarPalabrasRAE() : Promise.reject(new Error('DataLoader no disponible')));
      }
      const tieneCantidadTemp = Number.isInteger(cantidadInput) && cantidadInput > 0;
      const cantidadFinalTemp = tieneCantidadTemp ? cantidadInput : (global.CONFIG.DEFAULT_WORD_COUNT || 50);
      const filtrosRAE = { ...filtrosAvanzados };
      if (filtros.length === 0 || porcentajeRefuerzo === 0) delete filtrosRAE.letrasEspecificas;
      let seleccionDesdeJSON = global.WordFilters.seleccionarPalabrasPorNivel(global.raeWordsData.wordsByLevel, nivelNumerico, cantidadFinalTemp, filtrosRAE);
      console.log('[Juego] Selección inicial desde JSON:', Array.isArray(seleccionDesdeJSON) ? seleccionDesdeJSON.length : 'null');
      // Priorizar por defecto palabras con errores previos del alumno (refuerzo adaptativo)
      try {
        const bank = (typeof global.cargarBancoErrores === 'function') ? global.cargarBancoErrores() : (global.ErrorBank?.cargar?.() || {});
        if (bank && Object.keys(bank).length > 0 && Array.isArray(seleccionDesdeJSON) && seleccionDesdeJSON.length > 0) {
          const priorizadas = (global.WordFilters && WordFilters.filtrarRefuerzoAdaptativo)
            ? WordFilters.filtrarRefuerzoAdaptativo(seleccionDesdeJSON.slice(), bank)
            : seleccionDesdeJSON.slice();
          // Combinar: primero las priorizadas, luego el resto, sin duplicados
          const setPrior = new Set(priorizadas);
          const resto = seleccionDesdeJSON.filter(w => !setPrior.has(w));
          const combinada = [...priorizadas, ...resto];
          seleccionDesdeJSON = combinada.slice(0, cantidadFinalTemp);
          console.log('[Juego] Refuerzo adaptativo aplicado. Prioridad de errores previos:', priorizadas.length);

          // Inyectar palabras del banco que no hayan entrado en la selección inicial, si existen en el nivel
          try {
            const nivelPool = Array.isArray(global.raeWordsData?.wordsByLevel?.[nivelNumerico])
              ? global.raeWordsData.wordsByLevel[nivelNumerico].map(w => String(w.palabra).toLowerCase())
              : [];
            const normaliza = (s) => { try { return (global.WordFilters && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(s) : String(s||'').toLowerCase().trim(); } catch(_) { return String(s||'').toLowerCase().trim(); } };
            const setSelNorm = new Set(seleccionDesdeJSON.map(normaliza));
            const setNivel = new Set(nivelPool.map(normaliza));
            const faltantes = Object.keys(bank)
              .filter(k => setNivel.has(k) && !setSelNorm.has(k));
            if (faltantes.length > 0) {
              const // map normalized back to original case if present in pool
                poolOriginal = Array.isArray(global.raeWordsData?.wordsByLevel?.[nivelNumerico]) ? global.raeWordsData.wordsByLevel[nivelNumerico] : [];
              const lookup = new Map(poolOriginal.map(o => [normaliza(o.palabra), o.palabra]));
              const aInyectar = faltantes.map(nk => lookup.get(nk)).filter(Boolean);
              const sinDup = (arr) => Array.from(new Set(arr));
              const nueva = sinDup([...(aInyectar || []), ...seleccionDesdeJSON]);
              seleccionDesdeJSON = nueva.slice(0, cantidadFinalTemp);
              console.log('[Juego] Inyectadas desde banco de errores:', aInyectar.length);
            }
          } catch(_) {}
        }
      } catch(_) {}
      // Fallback robusto si por cualquier motivo la selección resultó vacía
      if (!Array.isArray(seleccionDesdeJSON) || seleccionDesdeJSON.length === 0) {
        try {
          const poolNivel = Array.isArray(global.raeWordsData.wordsByLevel[nivelNumerico]) ? global.raeWordsData.wordsByLevel[nivelNumerico].map(w => w.palabra) : [];
          seleccionDesdeJSON = poolNivel.slice(0, cantidadFinalTemp);
          console.warn('[Juego] Selección vacía con filtros; usando fallback simple:', seleccionDesdeJSON.length);
        } catch (e) {
          console.warn('[Juego] Fallback simple falló:', e);
        }
      }
      if (!Array.isArray(seleccionDesdeJSON) || seleccionDesdeJSON.length === 0) {
        try {
          // Último recurso: combinar todos los niveles y tomar N
          const all = [1,2,3,4].flatMap(n => (global.raeWordsData.wordsByLevel[n]||[]).map(w => w.palabra));
          seleccionDesdeJSON = all.slice(0, cantidadFinalTemp);
          console.warn('[Juego] Fallback total (todos los niveles):', seleccionDesdeJSON.length);
        } catch(_) {}
      }
      if (Array.isArray(seleccionDesdeJSON) && seleccionDesdeJSON.length > 0) {
        global.palabras = seleccionDesdeJSON.slice();
        global.indice = 0; global.aciertos = 0; global.resultsLog = [];
        // Reiniciar mapa de últimas respuestas por palabra (para mostrar en el reporte web)
        try { global.lastAnswerByWord = {}; } catch(_) {}
        // Sincronizar por compatibilidad y además asignar explícitamente al estado
        try { global.syncGameState && global.syncGameState('to'); } catch(_) {}
        try { if (global.gameState) { global.gameState.words = Array.isArray(global.palabras) ? global.palabras.slice() : []; global.gameState.currentIndex = 0; } } catch(_) {}
        console.log('[Juego] gameState.words asignadas:', Array.isArray(global.gameState?.words) ? global.gameState.words.length : 'null');
        document.getElementById('resultado').innerHTML = '';
        document.getElementById('marcador').innerHTML = '';
        try {
          const totalSel = Array.isArray(global.gameState?.words) ? global.gameState.words.length : (global.palabras?.length || 0);
          global.UI?.setProgressTotal && global.UI.setProgressTotal(totalSel || 0);
        } catch(_) {}
        document.getElementById('juego').style.display = 'block';
        // Preparar botones según contenido del input: Comprobar deshabilitado hasta que haya texto
        try {
          const inputEl = document.getElementById('respuesta');
          const btnC = document.getElementById('btnComprobar');
          const btnSpeak = document.getElementById('btnSpeak');
          if (btnC) btnC.disabled = true;
          if (btnSpeak) btnSpeak.disabled = false; // input vacío al iniciar
          if (inputEl && !inputEl.dataset.comprobarBind) {
            inputEl.addEventListener('input', () => {
              const val = (inputEl.value || '').trim();
              if (btnC) btnC.disabled = (val.length === 0);
              if (btnSpeak) btnSpeak.disabled = (val.length > 0);
            });
            inputEl.dataset.comprobarBind = '1';
          }
        } catch(_) {}
        try { global.smoothScrollIntoView && global.smoothScrollIntoView('juego', { block: 'start', behavior: 'smooth' }); } catch(_) {}
        try { speechSynthesis.cancel(); speechSynthesis.resume(); } catch(_) {}
        setTimeout(()=>{ const input = document.getElementById('respuesta'); if (input) input.focus(); reproducirPalabra(); }, global.CONFIG.FIRST_WORD_DELAY_MS);
        return;
      }
    } catch(e) {
      console.warn('[Juego] No fue posible seleccionar desde JSON dinámico:', e);
    }

    try { alert('No se encontraron palabras desde el JSON para este nivel con los filtros actuales.\nAjusta los filtros (letras/porcentaje/acentos) y vuelve a intentar.'); } catch(_) {}
    document.getElementById('juego').style.display = 'none';
    return;
  }

  async function reproducirPalabra(fromUser = false) {
    const speakBtn = document.getElementById('btnSpeak');
    const palabra = (typeof global.gameState !== 'undefined' && global.gameState.getCurrentWord)
      ? global.gameState.getCurrentWord()
      : null;
    const idx = (typeof global.gameState !== 'undefined') ? global.gameState.currentIndex : -1;
    const total = (typeof global.gameState !== 'undefined' && Array.isArray(global.gameState.words)) ? global.gameState.words.length : 0;
    console.log(`[DEBUG] reproducirPalabra() llamada. Índice: ${idx}, total: ${total}, palabra: ${palabra}`);
    if (!palabra) return;

    if (global.isMobile && fromUser) {
      await global.unlockTTS();
    }

    if (!global.voicesReady) {
      let attempts = 0;
      while (!global.voicesReady && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        global.selectedVoice = global.elegirVozEspanol();
        global.voicesReady = !!global.selectedVoice;
      }
    }

    try { speechSynthesis.cancel(); } catch (_) {}
    try { speechSynthesis.resume(); } catch (_) {}

    const msg = new SpeechSynthesisUtterance(palabra);
    if (global.isMobile) {
      msg.lang = 'es-ES';
      msg.rate = 0.9; msg.pitch = 1.0; msg.volume = 1.0;
    } else {
      const lang = (global.selectedVoice && global.selectedVoice.lang) ? global.selectedVoice.lang : 'es-ES';
      msg.lang = lang;
      if (global.selectedVoice) msg.voice = global.selectedVoice;
      msg.rate = 0.9; msg.pitch = 1.0; msg.volume = 1.0;
    }

    msg.onstart = () => {
      if (speakBtn) speakBtn.disabled = true;
      const res = document.getElementById('resultado');
      if (res) { res.innerHTML = ''; res.className = ''; }
    };
    msg.onend = () => {
      if (speakBtn) {
        // Habilitar speak solo si el input está vacío
        try {
          const val = (document.getElementById('respuesta')?.value || '').trim();
          speakBtn.disabled = (val.length > 0);
        } catch(_) { speakBtn.disabled = false; }
      }
      if (!global.isMobile) {
        const tNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const dur = tNow - (global.lastStartTime || tNow);
        if (dur < 250 && !reproducirPalabra._retried) {
          reproducirPalabra._retried = true;
          setTimeout(() => reproducirPalabra(), 350);
          return;
        }
      }
      reproducirPalabra._retried = false;
    };
    msg.onerror = () => { if (speakBtn) speakBtn.disabled = false; };

    const input = document.getElementById('respuesta'); if (input) input.focus();
    global.lastStartTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    try {
      await global.ensureTTSReady(global.selectedVoice || global.elegirVozEspanol());
      speechSynthesis.speak(msg);
      console.log('TTS: Speaking word:', palabra);
    } catch(e) {
      console.log('TTS speak error:', e);
    }
  }

  function comprobar() {
    const entrada = document.getElementById('respuesta').value.trim();
    const btnC = document.getElementById('btnComprobar');
    // No comprobar si está vacío (aplica a móvil y desktop)
    if (!entrada) {
      try {
        const res = document.getElementById('resultado');
        if (res) { res.className = ''; res.innerHTML = '<span style="color:#6b7280">Escribe la palabra antes de comprobar.</span>'; }
      } catch(_) {}
      try { const input = document.getElementById('respuesta'); input && input.focus(); } catch(_) {}
      return;
    }
    const palabraCorrecta = global.gameState.getCurrentWord();
    const resultado = document.getElementById('resultado');
    const tEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const tiempoMs = Math.max(0, Math.round(tEnd - (global.lastStartTime || tEnd)));

    // Efectivo: forzar según nivel (Experto=true, Básico=false) o checkbox para el resto
    const esNivelExperto = (function(){
      try {
        const n = String(global.gameState?.currentLevel || global.currentNivel || '').toLowerCase();
        return n.includes('experto') || n === '4' || (global.currentNivel === 'experto');
      } catch(_) { return false; }
    })();
    const esNivelBasico = (function(){
      try {
        const n = String(global.gameState?.currentLevel || global.currentNivel || '').toLowerCase();
        return n.includes('básico') || n.includes('basico') || n === '1' || (global.currentNivel === 'basico');
      } catch(_) { return false; }
    })();
    const acentosObligatorios = esNivelExperto ? true : (esNivelBasico ? false : (document.getElementById('acentosObligatorios')?.checked || false));
    let esCorrect;
    if (acentosObligatorios) {
      esCorrect = entrada.toLowerCase() === palabraCorrecta.toLowerCase();
    } else {
      esCorrect = global.WordFilters.normalizarBasico(entrada) === global.WordFilters.normalizarBasico(palabraCorrecta);
    }

    if (esCorrect) {
      resultado.innerHTML = '✅ ¡Correcto!';
      resultado.className = 'correcto';
      try { global.gameState.correctAnswers++; } catch(_) {}
      // Marcar como resuelta en el banco de errores
      try { if (global.ErrorBank && typeof global.ErrorBank.resolver === 'function') global.ErrorBank.resolver(palabraCorrecta); } catch(_) {}
    } else {
      resultado.innerHTML = `<span style="color: #6c757d;">❌ Incorrecto. Escribiste:</span> <strong style="color: #dc3545;">"${entrada}"</strong> <span style="color: #6c757d;">| Era:</span> <strong style="color: #28a745;">"${palabraCorrecta}"</strong>`;
      resultado.className = 'incorrecto';
      try { global.registrarError && global.registrarError(palabraCorrecta); } catch(_) {}
    }
    try { resultado.classList.remove('result-flash'); void resultado.offsetWidth; resultado.classList.add('result-flash'); } catch(_) {}
    try { global.smoothScrollIntoView && global.smoothScrollIntoView('resultado', { block: 'center', behavior: 'smooth' }); } catch(_) {}

    try { global.gameState.addResult(palabraCorrecta, entrada, esCorrect, tiempoMs); } catch(_) {}
    // Guardar última respuesta por palabra (normalizada) para mostrarla siempre en el reporte web
    try {
      const key = (global.WordFilters && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(palabraCorrecta) : String(palabraCorrecta||'').toLowerCase().trim();
      if (entrada) { global.lastAnswerByWord = global.lastAnswerByWord || {}; global.lastAnswerByWord[key] = entrada; }
    } catch(_) {}
    try {
      if (Array.isArray(global.resultsLog)) {
        global.resultsLog.push({ fechaISO: new Date().toISOString(), nivel: global.currentNivel || '-', palabra: palabraCorrecta, respuesta: entrada, correcto: esCorrect ? 'Sí' : 'No', tiempoMs });
      }
    } catch(_) {}

    try { global.gameState.nextWord(); } catch(_) {}
    try {
      const total = global.gameState.words.length;
      const curr = Math.min(global.gameState.currentIndex, total);
      const pct = total ? Math.round((curr / total) * 100) : 0;
      const fill = document.getElementById('progressFill');
      const txt = document.getElementById('progressText');
      if (txt) txt.textContent = `${curr}/${total}`;
      if (fill) fill.style.width = `${pct}%`;
    } catch(_) {}
    // Limpiar campo de entrada y teclado virtual
    document.getElementById('respuesta').value = '';
    if (btnC) btnC.disabled = true; // volver a deshabilitar hasta nuevo texto
    try { const btnSpeak = document.getElementById('btnSpeak'); if (btnSpeak) btnSpeak.disabled = false; } catch(_) {}
    try {
      if (window.virtualKeyboardManager && typeof window.virtualKeyboardManager.clearInput === 'function') {
        window.virtualKeyboardManager.clearInput();
      } else if (window.virtualKeyboardManager && window.virtualKeyboardManager.keyboard) {
        // Fallback por si no existe clearInput en alguna versión
        try { window.virtualKeyboardManager.keyboard.clearInput(); } catch(_) {}
      }
    } catch(_) {}
    try { speechSynthesis.cancel(); } catch (_) {}

    if (global.gameState.hasMoreWords()) {
      console.log(`[DEBUG] Continuando con siguiente palabra. Índice: ${global.gameState.currentIndex}`);
    } else {
      console.log('[DEBUG] Juego terminado');
      const palabrasAll = Array.isArray(global.gameState.words) ? global.gameState.words : [];
      const normaliza = (s) => { try { return global.WordFilters.normalizarBasico(String(s || '')); } catch(_) { return String(s || '').toLowerCase().trim(); } };
      const rawLog = Array.isArray(global.gameState.resultsLog) ? global.gameState.resultsLog : global.resultsLog;
      // Construir mapa por palabra (último intento) y mapa de última respuesta no vacía
      const mapa = new Map();
      const lastNonEmptyByWord = new Map();
      try {
        for (const r of (rawLog || [])) {
          const key = normaliza(r.palabra);
          mapa.set(key, r);
          if (r && typeof r.respuesta === 'string' && r.respuesta.trim() !== '') {
            lastNonEmptyByWord.set(key, r.respuesta.trim());
          }
        }
      } catch(_) {}
      const resultadosOrdenados = palabrasAll.map(w => {
        const key = normaliza(w);
        const base = mapa.get(key) || { palabra: String(w || ''), respuesta: '', correcto: '-', tiempoMs: '' };
        if (!base.respuesta || String(base.respuesta).trim() === '') {
          const fill = lastNonEmptyByWord.get(key);
          if (fill) base.respuesta = fill;
          else {
            try {
              const fromMap = (global.lastAnswerByWord && global.lastAnswerByWord[key]) ? String(global.lastAnswerByWord[key]) : '';
              if (fromMap) base.respuesta = fromMap;
            } catch(_) {}
          }
        }
        // Recalcular 'correcto' de forma robusta si falta o es dudoso
        try {
          const resp = String(base.respuesta || '').trim();
          const pal = String(base.palabra || '').trim();
          const raw = String(base.correcto ?? '').trim();
          const normFlag = (typeof global.WordFilters !== 'undefined' && global.WordFilters.normalizarBasico)
            ? global.WordFilters.normalizarBasico(raw)
            : raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          const flagKnown = (raw === true) || normFlag === 'si' || normFlag === 'true' || normFlag === '1';
          if (!flagKnown) {
            let ok;
            if (document.getElementById('acentosObligatorios')?.checked) {
              ok = resp.toLowerCase() === pal.toLowerCase();
            } else {
              const nb = (s) => { try { return (global.WordFilters && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(s) : String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch(_) { return String(s||'').toLowerCase(); } };
              ok = nb(resp) === nb(pal);
            }
            base.correcto = ok ? 'Sí' : 'No';
          }
        } catch(_) {}
        return base;
      });
      const total = palabrasAll.length;
      // Contabilizar correctas de forma robusta: aceptar 'Sí'/'Si' (con/sin tilde), true, 'true', '1'
      const esCorrecta = (val) => {
        if (val === true) return true;
        try {
          const raw = String(val ?? '').trim();
          const norm = (typeof global.WordFilters !== 'undefined' && global.WordFilters.normalizarBasico)
            ? global.WordFilters.normalizarBasico(raw)
            : raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          return norm === 'si' || norm === 'true' || norm === '1';
        } catch(_) { return false; }
      };
      // Usar GameState como fuente de verdad si está disponible
      let correctas = resultadosOrdenados.filter(r => esCorrecta(r.correcto)).length;
      try {
        if (global.gameState && typeof global.gameState.getStats === 'function') {
          const gs = global.gameState.getStats();
          if (Number.isFinite(gs?.correct) && Number.isFinite(gs?.total) && gs.total === total) {
            correctas = gs.correct;
          }
        }
      } catch(_) {}
      try {
        if (global.window && window.DEBUG) {
          const sample = resultadosOrdenados.slice(0, Math.min(5, resultadosOrdenados.length)).map(r => ({ p: r.palabra, c: r.correcto }));
          console.log('[DEBUG] Fin juego — total:', total, 'correctas:', correctas, 'muestra:', sample);
        }
      } catch(_) {}
      const incorrectas = Math.max(0, total - correctas);
      const porcentaje = total ? Math.round((correctas / total) * 100) : 0;

      // Marcar fin de sesión para el reporte (timestamps)
      try {
        const nowISO = new Date().toISOString();
        if (global.gameState) global.gameState.sessionEndISO = nowISO;
        global.sessionEndISO = nowISO;
      } catch(_) {}

      document.getElementById('marcador').innerHTML = `Juego terminado. Aciertos: ${correctas}/${total} (${porcentaje}%)`;

      const acentosCheckbox = document.getElementById('acentosObligatorios');
      if (acentosCheckbox) acentosCheckbox.disabled = false;

      const errores = resultadosOrdenados.filter(r => !esCorrecta(r.correcto));
      const rep = document.getElementById('reporteFinal');
      if (rep) {
        let html = '';
        html += '<div class="report-summary" style="font-size:14px; margin-bottom:10px;">';
        // Obtener nivel legible: usar gameState.currentLevel y, si falta, mapear desde global.currentNivel
        const nivelTxt = (function(){
          let v = (typeof global.gameState !== 'undefined' && global.gameState.currentLevel) ? global.gameState.currentLevel : '';
          if (!v || v === '-') {
            try {
              const map = { basico:'Básico', intermedio:'Intermedio', avanzado:'Avanzado', experto:'Experto', facil:'Fácil', medio:'Medio', dificil:'Difícil' };
              const code = global.currentNivel || '';
              v = map[code] || code || '-';
            } catch(_) { v = '-'; }
          }
          return v;
        })();
        const filtroTxt = (document.getElementById('filtroLetras')?.value || '').trim() || '-';
        const cantValRaw = (document.getElementById('cantidad')?.value || '').trim();
        const cantTxt = cantValRaw ? cantValRaw : 'todas';
        const prRaw = document.getElementById('porcentajeRefuerzo')?.value;
        let prTxt = '';
        if (prRaw === '' || prRaw == null) {
          prTxt = (filtroTxt !== '-' ? '-' : '0');
        } else {
          const prN = parseInt(prRaw, 10);
          prTxt = Number.isFinite(prN) ? Math.max(0, Math.min(100, prN)).toString() : '-';
        }
        const strictTxt = (document.getElementById('strictMode')?.checked ? 'Sí' : 'No');
        const nivelBadgeClass = (function(){
          const n = String(nivelTxt || '').toLowerCase();
          if (n.includes('básico') || n.includes('basico') || n === '1') return 'badge-level-basico';
          if (n.includes('intermedio') || n === '2') return 'badge-level-intermedio';
          if (n.includes('avanzado') || n === '3') return 'badge-level-avanzado';
          if (n.includes('experto') || n === '4') return 'badge-level-experto';
          return 'badge-off';
        })();
        const nivelBadge = nivelTxt && nivelTxt !== '-' ? `<span class="badge ${nivelBadgeClass}">${nivelTxt}</span>` : `<span class="badge badge-off">-</span>`;
        html += `<div><strong>Nivel:</strong> ${nivelBadge}</div>`;
        const fechaInicioISO = (typeof global.gameState !== 'undefined' ? global.gameState.sessionStartISO : null) || global.window.sessionStartISO || null;
        const fechaSesionTxt = fechaInicioISO ? new Date(fechaInicioISO).toLocaleString() : new Date().toLocaleString();
        const fechaBadge = `<span class="badge badge-off">${fechaSesionTxt}</span>`;
        html += `<div><strong>Inicio de ejercicio:</strong> ${fechaBadge}</div>`;
        let fechaFinISO = (typeof global.gameState !== 'undefined' ? global.gameState.sessionEndISO : null) || global.window.sessionEndISO || null;
        if (!fechaFinISO) { try { fechaFinISO = new Date().toISOString(); } catch(_) {} }
        if (fechaFinISO) {
          const finTxt = new Date(fechaFinISO).toLocaleString();
          const finBadge = `<span class=\"badge badge-off\">${finTxt}</span>`;
          html += `<div><strong>Fin de ejercicio:</strong> ${finBadge}</div>`;
          try {
            const startDate = new Date(fechaInicioISO);
            const endDate = new Date(fechaFinISO);
            const ms = Math.max(0, endDate - startDate);
            const sec = Math.floor(ms / 1000);
            const mm = Math.floor(sec / 60);
            const ss = sec % 60;
            const durTxt = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
            const durBadge = `<span class=\"badge badge-info\">${durTxt}</span>`;
            html += `<div><strong>Duración total:</strong> ${durBadge}</div>`;
          } catch(_) {}
        }
        html += `<div><strong>Total palabras:</strong> ${total}</div>`;
        html += `<div><strong>Correctas:</strong> ${correctas}</div>`;
        html += `<div><strong>Incorrectas:</strong> ${incorrectas}</div>`;
        html += `<div><strong>Porcentaje de acierto:</strong> ${porcentaje}%</div>`;
        // Mostrar 'Sí' si es nivel Experto y 'No' si es nivel Básico, ignorando el checkbox
        const acentosActiva = (function(){
          try {
            const n = String(global.gameState?.currentLevel || global.currentNivel || '').toLowerCase();
            const expert = n.includes('experto') || n === '4' || (global.currentNivel === 'experto');
            const basic = n.includes('básico') || n.includes('basico') || n === '1' || (global.currentNivel === 'basico');
            if (expert) return true;
            if (basic) return false;
            return !!(document.getElementById('acentosObligatorios')?.checked);
          } catch(_) { return !!(document.getElementById('acentosObligatorios')?.checked); }
        })();
        const acentosTxt = acentosActiva ? 'Sí' : 'No';
        const badge = (val) => val === 'Sí' ? `<span class="badge badge-ok">${val}</span>` : `<span class="badge badge-off">${val}</span>`;
        const filtroBadge = filtroTxt !== '-' ? `<span class="badge badge-info">${filtroTxt}</span>` : `<span class="badge badge-off">-</span>`;
        html += `<div><strong>Letras a reforzar:</strong> ${filtroBadge}</div>`;
        html += `<div><strong>Porcentaje de refuerzo:</strong> ${prTxt}${prTxt !== '-' ? '%' : ''}</div>`;
        html += `<div><strong>Acentos obligatorios:</strong> ${badge(acentosTxt)}</div>`;
        html += `<div><strong>Modo estricto:</strong> ${badge(strictTxt)}</div>`;
        html += '</div>';

        {
          html += '<h3 style="margin:10px 0 6px;">Palabras a reforzar</h3>';
          html += '<div style="font-size:14px;">';
          html += '<ul style="margin:6px 0 0 18px;">';
          const all = Array.isArray(resultadosOrdenados) ? resultadosOrdenados : [];
          const items = all.map((r, idx) => {
            try {
              const esOk = (r.correcto === true) || (function(){
                try {
                  const raw = String(r.correcto ?? '').trim();
                  const norm = (typeof global.WordFilters !== 'undefined' && global.WordFilters.normalizarBasico)
                    ? global.WordFilters.normalizarBasico(raw)
                    : raw.toLowerCase().normalize('NFD').replace(/\[\u0300-\u036f]/g,'');
                  return norm === 'si' || norm === 'true' || norm === '1';
                } catch(_) { return false; }
              })();
              const status = esOk
                ? '<span class="badge badge-ok" style="margin-left:8px;">Correcta</span>'
                : '<span class="badge" style="margin-left:8px; background: var(--danger); color: #fff;">Incorrecta</span>';
              const key = (typeof WordFilters !== 'undefined' && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(r.palabra||'') : String(r.palabra||'').toLowerCase().trim();
              const resp = (r && typeof r.respuesta === 'string' && r.respuesta.trim() !== '') ? r.respuesta.trim() : (lastNonEmptyByWord.get(key) || '');
              const colorWord = esOk ? 'var(--success)' : 'var(--danger)';
              const defId = `def_${idx}`;
              // Siempre mostrar significado (también para correctas)
              const defBlock = `<div id="${defId}" style="font-size:12px; color: var(--muted); margin-top:4px;">Buscando significado...</div>`;
              return `<li style="margin-bottom:8px;">
                <strong style="color:${colorWord};">${r.palabra}</strong> ${status} — escrito: "<em>${resp}</em>"
                ${defBlock}
              </li>`;
            } catch(_) {
              const esOk = (r.correcto === true) || (function(){
                try {
                  const raw = String(r.correcto ?? '').trim();
                  const norm = (typeof global.WordFilters !== 'undefined' && global.WordFilters.normalizarBasico)
                    ? global.WordFilters.normalizarBasico(raw)
                    : raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
                  return norm === 'si' || norm === 'true' || norm === '1';
                } catch(_) { return false; }
              })();
              const status = esOk
                ? '<span class="badge badge-ok" style="margin-left:8px;">Correcta</span>'
                : '<span class="badge" style="margin-left:8px; background: var(--danger); color: #fff;">Incorrecta</span>';
              const colorWord = esOk ? 'var(--success)' : 'var(--danger)';
              return `<li style="margin-bottom:8px;"><strong style="color:${colorWord};">${r.palabra}</strong> ${status} — escrito: "<em>${r.respuesta||''}</em>"</li>`;
            }
          });
          html += items.join('');
          html += '</ul></div>';
          // Buscar significados para todas las palabras (correctas e incorrectas)
          setTimeout(async () => {
            for (let i = 0; i < all.length; i++) {
              const r = all[i];
              const defElement = document.getElementById(`def_${i}`);
              if (defElement && typeof global.fetchSignificado === 'function') {
                try {
                  const significado = await global.fetchSignificado(r.palabra);
                  if (significado) { defElement.textContent = significado; defElement.style.color = 'var(--text)'; }
                  else { defElement.textContent = 'Significado no encontrado'; defElement.style.color = 'var(--muted)'; }
                } catch (e) {
                  defElement.textContent = 'Error al buscar significado';
                  defElement.style.color = 'var(--muted)';
                }
              }
            }
          }, 100);
        }
        rep.innerHTML = html;
        rep.style.display = 'block';
        try { global.smoothScrollIntoView && global.smoothScrollIntoView(rep, { block: 'start', behavior: 'smooth' }); } catch(_) {}
        try {
          const fetchFn = (typeof global.window !== 'undefined') ? global.window.fetchSignificadoPreciso : undefined;
          if (Array.isArray(errores) && errores.length > 0 && typeof fetchFn === 'function') {
            const promises = errores.map((e, idx) => {
              return fetchFn(e.palabra)
                .then(sig => { const el = document.getElementById(`def_${idx}`); if (el) { el.textContent = sig || 'Significado no disponible'; el.style.color = '#374151'; } })
                .catch(() => { const el = document.getElementById(`def_${idx}`); if (el) { el.textContent = 'Significado no disponible'; el.style.color = '#9ca3af'; } });
            });
            Promise.all(promises).finally(() => { UI.showNextButton(); });
          } else {
            UI.showNextButton();
          }
        } catch(_) { UI.showNextButton(); }
      }
      UI.showNextButton();

      // Deshabilitar entrada y ocultar teclado al finalizar
      try {
        const input = document.getElementById('respuesta');
        if (input) { input.disabled = true; input.setAttribute('readonly','true'); }
        const btnC = document.getElementById('btnComprobar');
        if (btnC) btnC.disabled = true;
        const speak = document.getElementById('btnSpeak');
        if (speak) speak.disabled = true;
        // Ocultar virtual keyboard inline en móvil
        try { if (window.virtualKeyboardManager) window.virtualKeyboardManager.hideKeyboard?.(); } catch(_) {}
        const vkInline = document.getElementById('vk-inline');
        if (vkInline) { vkInline.style.display = 'none'; vkInline.setAttribute('aria-hidden','true'); }
        const mirror = document.getElementById('vkMirror');
        if (mirror) mirror.classList.remove('vk-active');
      } catch(_) {}
    }
  }

  function goToReportFromGame() {
    const btn = document.getElementById('btnToReport');
    if (btn) { btn.classList.remove('force-visible'); btn.style.display = 'none'; }
    const floatBtn = document.getElementById('btnToReportFloat');
    if (floatBtn) { try { floatBtn.remove(); } catch(_) { floatBtn.style.display = 'none'; } }
    global.goToPage('page-report');
  }

  function irAlEjercicio() {
    try { global.gameState.reset(); global.sessionStartISO = new Date().toISOString(); global.syncGameState && global.syncGameState('from'); } catch(_) {}
    const juego = document.getElementById('juego');
    const resultado = document.getElementById('resultado');
    const marcador = document.getElementById('marcador');
    const respuesta = document.getElementById('respuesta');
    const btnToReport = document.getElementById('btnToReport');
    if (resultado) resultado.textContent = '';
    if (marcador) marcador.textContent = '';
    if (respuesta) {
      respuesta.value = '';
      // Reactivar input: quitar readonly y disabled
      respuesta.disabled = false;
      // En PC, quitar readonly; en móvil se establecerá después si es necesario
      try {
        const mustUseVK = (typeof global.DeviceDetector !== 'undefined' && global.DeviceDetector.shouldUseVirtualKeyboard) ? global.DeviceDetector.shouldUseVirtualKeyboard() : false;
        if (!mustUseVK) {
          respuesta.removeAttribute('readonly');
        }
      } catch(_) {
        // Fallback: en desktop quitar readonly
        respuesta.removeAttribute('readonly');
      }
    }
    if (btnToReport) btnToReport.style.display = 'none';
    if (juego) juego.style.display = 'none';

    // Mostrar todos los elementos de configuración que se ocultan al iniciar juego
    const pageGame = document.getElementById('page-game');
    if (pageGame) {
      // Mostrar todos los hijos directos excepto #juego
      Array.from(pageGame.children).forEach(child => {
        if (child.id !== 'juego') {
          child.style.display = '';
        }
      });
      
      // Asegurarse de que todos los elementos de configuración estén visibles
      const configElements = pageGame.querySelectorAll('.card:not(#juego), p, .actions, div[style*="margin-top"]');
      configElements.forEach(el => {
        if (el.id !== 'juego' && !el.closest('#juego')) {
          el.style.display = '';
        }
      });
    }

    const bBasico = document.getElementById('btnNivelBasico');
    const bIntermedio = document.getElementById('btnNivelIntermedio');
    const bAvanzado = document.getElementById('btnNivelAvanzado');
    const bExperto = document.getElementById('btnNivelExperto');
    const bF = document.getElementById('btnNivelFacil');
    const bM = document.getElementById('btnNivelMedio');
    const bD = document.getElementById('btnNivelDificil');
    [bBasico, bIntermedio, bAvanzado, bExperto, bF, bM, bD].forEach(b => { if (b) { b.disabled = false; b.classList.remove('btn-selected'); } });

    const cantidad = document.getElementById('cantidad');
    const filtroLetras = document.getElementById('filtroLetras');
    const strictMode = document.getElementById('strictMode');
    const porcentajeRefuerzo = document.getElementById('porcentajeRefuerzo');
    if (cantidad) cantidad.disabled = false;
    if (filtroLetras) filtroLetras.disabled = false;
    if (strictMode) strictMode.disabled = false;
    if (porcentajeRefuerzo) porcentajeRefuerzo.disabled = false;

    const btnVolver = document.getElementById('btnVolverGame');
    if (btnVolver) btnVolver.disabled = false;

    // Reactivar botones del juego
    const btnComprobar = document.getElementById('btnComprobar');
    const btnSpeak = document.getElementById('btnSpeak');
    if (btnComprobar) btnComprobar.disabled = false;
    if (btnSpeak) btnSpeak.disabled = false;

    const acentosCheckbox = document.getElementById('acentosObligatorios');
    if (acentosCheckbox) { acentosCheckbox.disabled = false; acentosCheckbox.checked = false; }

    try { const filtro = document.getElementById('filtroLetras'); if (filtro) filtro.value = ''; const pr = document.getElementById('porcentajeRefuerzo'); if (pr) pr.value = ''; } catch(_) {}

    // Ir a page-game para mostrar la configuración (no iniciar el juego aún)
    global.goToPage('page-game');
    try { global.refreshMetaAlumnoCurso && global.refreshMetaAlumnoCurso(true); } catch(_) {}
  }

  // Expose globals
  global.iniciarJuego = iniciarJuego;
  global.reproducirPalabra = reproducirPalabra;
  global.comprobar = comprobar;
  global.goToReportFromGame = goToReportFromGame;
  global.irAlEjercicio = irAlEjercicio;

  // Also expose stable alias names so app.js wrappers can delegate
  // even if this script loads after them (race-safe delegation)
  try {
    global.__indiv_iniciarJuego = iniciarJuego;
    global.__indiv_reproducirPalabra = reproducirPalabra;
    global.__indiv_comprobar = comprobar;
    global.__indiv_goToReportFromGame = goToReportFromGame;
    global.__indiv_irAlEjercicio = irAlEjercicio;
  } catch(_) {}

})(typeof window !== 'undefined' ? window : globalThis);
