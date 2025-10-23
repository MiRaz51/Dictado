(function(global){
  'use strict';

  // Iniciar juego en modo individual
  async function iniciarJuego(nivel) {
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
      const cantidadFinalTemp = tieneCantidadTemp ? cantidadInput : (global.CONFIG.DEFAULT_WORD_COUNT || 25);
      const filtrosRAE = { ...filtrosAvanzados };
      if (filtros.length === 0 || porcentajeRefuerzo === 0) delete filtrosRAE.letrasEspecificas;
      let seleccionDesdeJSON = global.WordFilters.seleccionarPalabrasPorNivel(global.raeWordsData.wordsByLevel, nivelNumerico, cantidadFinalTemp, filtrosRAE);
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
    
    if (!palabra) return;

    // Usar función global unificada
    if (typeof global.playWord === 'function') {
      const input = document.getElementById('respuesta');
      if (input) input.focus();
      
      global.playWord(palabra, {
        rate: 0.9,
        onstart: () => {
          if (speakBtn) speakBtn.disabled = true;
          const res = document.getElementById('resultado');
          if (res) { res.innerHTML = ''; res.className = ''; }
        },
        onend: () => {
          if (speakBtn) {
            // Habilitar speak solo si el input está vacío
            try {
              const val = (document.getElementById('respuesta')?.value || '').trim();
              speakBtn.disabled = (val.length > 0);
            } catch(_) { speakBtn.disabled = false; }
          }
        },
        onerror: () => {
          if (speakBtn) speakBtn.disabled = false;
        }
      });
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
      
      // 🎉 NUEVO: Animaciones y feedback de éxito
      celebrarAcierto();
      
      // Incrementar racha
      global.window.rachaActual = (global.window.rachaActual || 0) + 1;
      if (global.window.rachaActual >= 5) {
        mostrarRacha(global.window.rachaActual);
      }
      
      // Marcar como resuelta en el banco de errores
      try { if (global.ErrorBank && typeof global.ErrorBank.resolver === 'function') global.ErrorBank.resolver(palabraCorrecta); } catch(_) {}
    } else {
      resultado.innerHTML = `<span style="color: #6c757d;">❌ Incorrecto. Escribiste:</span> <strong style="color: #dc3545;">"${entrada}"</strong> <span style="color: #6c757d;">| Era:</span> <strong style="color: #28a745;">"${palabraCorrecta}"</strong>`;
      resultado.className = 'incorrecto';
      
      // 🔴 NUEVO: Animación de error
      animarError();
      
      // Resetear racha
      global.window.rachaActual = 0;
      
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
      if (global.Progress && typeof global.Progress.set === 'function') {
        global.Progress.set('progressFill', 'progressText', curr, total);
      } else {
        const fill = document.getElementById('progressFill');
        const txt = document.getElementById('progressText');
        if (txt) txt.textContent = `${curr}/${total}`;
        if (fill) fill.style.width = `${total ? Math.round((curr / total) * 100) : 0}%`;
      }
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
      // Continuar con siguiente palabra
    } else {
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
        }
      } catch(_) {}
      const incorrectas = Math.max(0, total - correctas);
      const porcentaje = total ? Math.round((correctas / total) * 100) : 0;

      // Créditos de Tiempo: usar función unificada
      try {
        if (typeof window !== 'undefined' && window.TimeCredits && window.TimeCredits.calculateAndAwardCredits && total > 0) {
          const alumnoId = (typeof window.getAlumnoCursoId === 'function') ? window.getAlumnoCursoId() : 'anon|sin-curso';
          const nivel = (global.gameState?.currentLevel || global.currentNivel || '-');
          const rangoEdad = document.getElementById('edad')?.value || ''; // Ahora es edad numérica
          
          // ¿Acentos activos?
          const acentosActivos = (function(){
            try {
              const n = String(nivel || '').toLowerCase();
              const expert = n.includes('experto') || n === '4' || (global.currentNivel === 'experto');
              const basic = n.includes('básico') || n.includes('basico') || n === '1' || (global.currentNivel === 'basico');
              if (expert) return true; if (basic) return false; return !!(document.getElementById('acentosObligatorios')?.checked);
            } catch(_) { return !!(document.getElementById('acentosObligatorios')?.checked); }
          })();
          
          // Porcentaje de refuerzo de letras
          let porcentajeRefuerzo = 0;
          try { 
            const prRaw = document.getElementById('porcentajeRefuerzo')?.value; 
            const n = parseInt(prRaw ?? '0', 10); 
            porcentajeRefuerzo = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0; 
          } catch(_) { porcentajeRefuerzo = 0; }
          
          window.TimeCredits.calculateAndAwardCredits({
            correctas,
            total,
            nivel,
            rangoEdad,
            acentosActivos,
            porcentajeRefuerzo,
            alumnoId,
            mode: 'individual'
          });
        }
      } catch(_) {}

      // Marcar fin de sesión para el reporte (timestamps)
      try {
        const nowISO = new Date().toISOString();
        if (global.gameState) global.gameState.sessionEndISO = nowISO;
        global.sessionEndISO = nowISO;
      } catch(_) {}

      document.getElementById('marcador').innerHTML = `Juego terminado. Aciertos: ${correctas}/${total} (${porcentaje}%)`;

      // Celebración final si supera el umbral
      try {
        const umbral = (window.CONFIG && Number.isFinite(window.CONFIG.FINAL_CELEBRATION_THRESHOLD)) ? window.CONFIG.FINAL_CELEBRATION_THRESHOLD : 70;
        if (porcentaje >= umbral && window.Feedback && typeof window.Feedback.showFinalCongrats === 'function') {
          window.Feedback.showFinalCongrats(porcentaje);
        }
      } catch(_) {}

      const acentosCheckbox = document.getElementById('acentosObligatorios');
      if (acentosCheckbox) acentosCheckbox.disabled = false;

      const rep = document.getElementById('reporteFinal');
      if (rep && window.ReportUtils && typeof window.ReportUtils.renderReportSummaryAndList === 'function') {
        const nivelCode = (global.gameState?.currentLevel || global.currentNivel || '-');
        const filtroTxt = (document.getElementById('filtroLetras')?.value || '').trim() || '-';
        const prRaw = document.getElementById('porcentajeRefuerzo')?.value;
        let prTxt = '';
        if (prRaw === '' || prRaw == null) { prTxt = (filtroTxt !== '-' ? '-' : '0'); }
        else { const prN = parseInt(prRaw, 10); prTxt = Number.isFinite(prN) ? Math.max(0, Math.min(100, prN)).toString() : '-'; }
        const strictTxt = (document.getElementById('strictMode')?.checked ? 'Sí' : 'No');
        const acentosActiva = (function(){
          try {
            const n = String(global.gameState?.currentLevel || global.currentNivel || '').toLowerCase();
            const expert = n.includes('experto') || n === '4' || (global.currentNivel === 'experto');
            const basic = n.includes('básico') || n.includes('basico') || n === '1' || (global.currentNivel === 'basico');
            if (expert) return true; if (basic) return false; return !!(document.getElementById('acentosObligatorios')?.checked);
          } catch(_) { return !!(document.getElementById('acentosObligatorios')?.checked); }
        })();
        const ctx = {
          results: Array.isArray(resultadosOrdenados) ? resultadosOrdenados : [],
          level: nivelCode,
          startISO: (global.gameState?.sessionStartISO || global.window.sessionStartISO || null),
          endISO: (global.gameState?.sessionEndISO || global.window.sessionEndISO || null),
          filterTxt: filtroTxt,
          refuerzoTxt: prTxt,
          acentosObligatorios: !!acentosActiva,
          strictTxt
        };
        window.ReportUtils.renderReportSummaryAndList(rep, ctx);
        rep.style.display = 'block';
        try { global.smoothScrollIntoView && global.smoothScrollIntoView(rep, { block: 'start', behavior: 'smooth' }); } catch(_) {}
        try { UI.showNextButton(); } catch(_) {}
      } else {
        try { UI.showNextButton(); } catch(_) {}
      }

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

  // ========================================================================
  // FUNCIONES DE ANIMACIÓN Y FEEDBACK
  // ========================================================================
  
  /**
   * celebra un acierto con confetti y animaciones
   */
  function celebrarAcierto() {
    // Delegar al módulo centralizado de feedback
    try { (window.Feedback && Feedback.celebrarAcierto) ? Feedback.celebrarAcierto() : (window.celebrarAcierto && window.celebrarAcierto !== celebrarAcierto && window.celebrarAcierto()); } catch(_) {}
  }
  
  /**
   * Anima un error con shake
   */
  function animarError() {
    // Delegar al módulo centralizado de feedback
    try { (window.Feedback && Feedback.animarError) ? Feedback.animarError() : (window.animarError && window.animarError !== animarError && window.animarError()); } catch(_) {}
  }
  
  /**
   * Muestra notificación de racha
   */
  function mostrarRacha(racha) {
    // Delegar al módulo centralizado de feedback
    try { (window.Feedback && Feedback.mostrarRacha) ? Feedback.mostrarRacha(racha) : (window.mostrarRacha && window.mostrarRacha !== mostrarRacha && window.mostrarRacha(racha)); } catch(_) {}
  }

  // Expose globals
  global.iniciarJuego = iniciarJuego;
  global.reproducirPalabra = reproducirPalabra;
  global.comprobar = comprobar;
  global.goToReportFromGame = goToReportFromGame;
  global.irAlEjercicio = irAlEjercicio;
  global.celebrarAcierto = celebrarAcierto;
  global.animarError = animarError;
  global.mostrarRacha = mostrarRacha;

  // Aliases estables para delegación
  global.__indiv_iniciarJuego = iniciarJuego;
  global.__indiv_reproducirPalabra = reproducirPalabra;
  global.__indiv_comprobar = comprobar;
  global.__indiv_goToReportFromGame = goToReportFromGame;
  global.__indiv_irAlEjercicio = irAlEjercicio;

})(typeof window !== 'undefined' ? window : globalThis);
