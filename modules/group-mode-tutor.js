// Funciones del modo grupal - Tutor
(function(global) {
  'use strict';

  // Variable de estado para bloqueo de pantallas
  let __tutorLockAll = false;

  // ===== Iniciar ejercicio grupal =====
  
  function startGroupExercise() {
    if (global.groupState.exerciseActive) {
      try { document.getElementById('startExercise').disabled = true; } catch(_) {}
      return;
    }

    // Deshabilitar inmediatamente para prevenir doble clic
    try { document.getElementById('startExercise').disabled = true; } catch(_) {}
    if (global.groupState.getParticipantCount() === 0) {
      alert('No hay participantes conectados');
      return;
    }
    
    // Usar palabras del nivel básico (1) desde JSON por defecto
    try {
      if (!global.raeWordsData.loaded) {
        console.warn('[Tutor] Datos RAE no cargados todavía');
      }
    } catch(_) {}
    // Tomar las palabras configuradas para el tutor (respeta cantidad elegida)
    let words = Array.isArray(global.tutorConfig?.palabrasGeneradas) ? global.tutorConfig.palabrasGeneradas.slice(0, global.tutorConfig.cantidad || 20) : [];
    if (!words || words.length === 0) {
      // Fallback si por alguna razón no se generaron previamente
      const map = { basico:1, intermedio:2, avanzado:3, experto:4, facil:1, medio:2, dificil:3 };
      const nivelNum = map[global.tutorConfig?.nivel] || 1;
      words = global.WordFilters.seleccionarPalabrasPorNivel(global.raeWordsData.wordsByLevel, nivelNum, global.tutorConfig?.cantidad || 20, {
        letrasEspecificas: global.tutorConfig?.filtroLetras || undefined,
        conAcentos: global.tutorConfig?.acentosObligatorios || undefined
      }) || [];
    }
    global.groupState.startExercise(words);
    
    // Notificar a todos los participantes
    global.peerManager.broadcastToParticipants({
      type: 'exercise_start',
      totalWords: words.length,
      nivel: (global.tutorConfig && global.tutorConfig.nivel) ? global.tutorConfig.nivel : undefined
    });

    // Mostrar controles de reproducción del tutor y estado inicial
    try {
      const pb = document.getElementById('tutorPlayback');
      const cw = document.getElementById('tutorCurrentWord');
      const pr = document.getElementById('tutorProgress');
      const btnNext = document.getElementById('tutorNextWord');
      if (pb) pb.style.display = '';
      if (cw) global.refreshTutorCurrentWordLabel();
      if (pr) pr.textContent = `${global.groupState.currentWordIndex+1}/${global.groupState.exerciseWords.length}`;
      global.refreshTutorOverallProgress();
      if (btnNext) btnNext.disabled = true; // Deshabilitar hasta que todos respondan
      
      // Scroll para mostrar el estado del servidor en la parte superior
      setTimeout(() => {
        try {
          const statusEl = document.getElementById('tutorStatus');
          if (statusEl) {
            statusEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch(_) {}
      }, 200);
    } catch(_) {}
    
    // Enviar primera palabra
    setTimeout(() => {
      sendCurrentWordToParticipants();
      // Reproducir también en el equipo del tutor automáticamente
      try { (async () => { await global.ensureTTSReady(); await global.speakWordSafe(global.groupState.currentWord, { rate: 0.9 }); })(); } catch(_) {}
    }, 1000);
    
    global.updateTutorUI();
  }

  // ===== Enviar palabra actual a participantes =====
  
  function sendCurrentWordToParticipants() {
    if (!global.groupState.currentWord) return;
    
    // Determinar si el tutor desea reproducir audio en los participantes
    const playAudio = !!document.getElementById('participantAudio')?.checked;

    global.peerManager.broadcastToParticipants({
      type: 'new_word',
      word: global.groupState.currentWord,
      wordIndex: global.groupState.currentWordIndex,
      totalWords: global.groupState.exerciseWords.length,
      playAudio,
      nivel: (global.tutorConfig && global.tutorConfig.nivel) ? global.tutorConfig.nivel : undefined
    });
    // Actualizar etiqueta en el tutor
    try {
      const cw = document.getElementById('tutorCurrentWord');
      const pr = document.getElementById('tutorProgress');
      const resp = document.getElementById('tutorResponses');
      const btnNext = document.getElementById('tutorNextWord');
      const btnPlay = document.getElementById('tutorPlayWord');
      if (cw) global.refreshTutorCurrentWordLabel();
      if (pr) pr.textContent = `${global.groupState.currentWordIndex+1}/${global.groupState.exerciseWords.length}`;
      if (resp) resp.textContent = `Resp: 0/${global.groupState.getParticipantCount()}`;
      // Resetear estilo de "Resp" por si venía en estado de éxito
      if (resp) {
        resp.style.color = '';
        resp.style.fontWeight = '';
        resp.style.background = '';
        resp.style.padding = '';
        resp.style.borderRadius = '';
        resp.title = '';
      }
      // Resetear contador de respuestas mostradas
      window._tutorRespCount = 0;
      global.refreshTutorOverallProgress();
      if (btnNext) btnNext.disabled = true; // Re-desactivar hasta que todos respondan la nueva palabra
      if (btnPlay) btnPlay.disabled = false; // Nueva palabra: permitir reproducir nuevamente
    } catch(_) {}
  }

  // ===== Siguiente palabra en el ejercicio =====
  
  function nextWordInExercise() {
    const nextWord = global.groupState.nextWord();
    
    if (nextWord) {
      sendCurrentWordToParticipants();
      // Reproducir también en el equipo del tutor automáticamente
      try { (async () => { await global.ensureTTSReady(); await global.speakWordSafe(global.groupState.currentWord, { rate: 0.9 }); })(); } catch(_) {}
    } else {
      // Ejercicio terminado
      // Recopilar resultados de todos los participantes para enviar al cliente
      const allResults = [];
      try {
        for (const [pid, pdata] of global.groupState.participants.entries()) {
          if (Array.isArray(pdata.results)) {
            allResults.push(...pdata.results.map(r => ({
              ...r,
              participantId: pid,
              participantName: pdata.name || pid
            })));
          }
        }
      } catch(_) {}
      
      global.peerManager.broadcastToParticipants({
        type: 'exercise_end',
        results: allResults
      });
      
      // Mostrar estadísticas finales
      const stats = global.groupState.calculateFinalStats();
      console.log('Estadísticas finales:', stats);
      try { const pb = document.getElementById('tutorPlayback'); if (pb) pb.style.display='none'; } catch(_) {}
      // Actualizar botones del tutor al finalizar
      global.updateTutorUI();
    }
  }

  // ===== Controles del tutor =====
  
  async function tutorPlayCurrentWord(){
    if (!global.groupState.currentWord) return;
    sendCurrentWordToParticipants();
    // Reproducir en local para el tutor también
    try { await global.ensureTTSReady(); await global.speakWordSafe(global.groupState.currentWord, { rate: 0.9 }); } catch(_) {}
  }

  async function tutorRepeatCurrentWord(){
    if (!global.groupState.currentWord) return;
    sendCurrentWordToParticipants();
    try { await global.ensureTTSReady(); await global.speakWordSafe(global.groupState.currentWord, { rate: 0.9 }); } catch(_) {}
  }

  // ===== Nuevo ejercicio (mantener sesión y participantes) =====
  async function tutorNewExercise(){
    try {
      // Preparar estado mínimo para permitir una nueva configuración
      if (global.groupState) {
        global.groupState.exerciseActive = false;
        global.groupState.exerciseStarted = false;
        global.groupState.currentWord = null;
        global.groupState.currentWordIndex = 0;
        global.groupState.exerciseWords = [];
        try { global.groupState.participantAnswers.clear(); } catch(_) {}
      }
      // Ir a la pantalla de configuración del tutor
      if (typeof global.goToPage === 'function') {
        global.goToPage('page-tutor-config');
      }
      // Refrescar controles
      if (typeof global.updateTutorUI === 'function') global.updateTutorUI();
    } catch(e) {
      console.error('[Tutor] Nuevo ejercicio falló:', e);
      try { alert('No se pudo preparar el nuevo ejercicio'); } catch(_) {}
    }
  }

  // ===== Nueva sesión (resetear todo y volver a información del tutor) =====
  async function tutorNewSession(){
    try {
      // Resetear estado completo (igual que tutorNewExercise)
      if (global.groupState) {
        global.groupState.exerciseActive = false;
        global.groupState.exerciseStarted = false;
        global.groupState.currentWord = null;
        global.groupState.currentWordIndex = 0;
        global.groupState.exerciseWords = [];
        try { global.groupState.participantAnswers.clear(); } catch(_) {}
      }
      
      // Limpiar campos de información del tutor para nueva sesión
      try {
        const tutorNameInput = document.getElementById('tutorName');
        const tutorGroupInput = document.getElementById('tutorGroup');
        if (tutorNameInput) tutorNameInput.value = '';
        if (tutorGroupInput) tutorGroupInput.value = '';
      } catch(_) {}
      
      // Ir a la pantalla de información del tutor (inicio del flujo)
      if (typeof global.goToPage === 'function') {
        global.goToPage('page-tutor-info');
      }
      
      // Refrescar controles
      if (typeof global.updateTutorUI === 'function') global.updateTutorUI();
    } catch(e) {
      console.error('[Tutor] Nueva sesión falló:', e);
      try { alert('No se pudo preparar la nueva sesión'); } catch(_) {}
    }
  }

  function tutorStopAllAudio(){
    try { speechSynthesis.cancel(); } catch(_) {}
    // Avisar a participantes que detengan audio
    global.peerManager.broadcastToParticipants({ type: 'stop_audio' });
  }

  // ===== Bloquear/Desbloquear pantallas de todos los participantes =====
  
  function tutorToggleLockAll(){
    __tutorLockAll = !__tutorLockAll;
    // Actualizar etiqueta del botón
    try {
      const btn = document.getElementById('tutorStopAll');
      if (btn) {
        btn.textContent = __tutorLockAll ? '✅ Desbloquear pantallas' : '⛔ Bloquear pantallas';
        if (__tutorLockAll) { 
          btn.classList.add('btn-danger');
          // Añadir overlay de spotlight
          createSpotlightOverlay(btn);
          // Bloquear controles del tutor
          lockTutorControls(true);
        } else { 
          btn.classList.remove('btn-danger');
          // Remover overlay de spotlight
          removeSpotlightOverlay();
          // Desbloquear controles del tutor
          lockTutorControls(false);
        }
      }
    } catch(_) {}
    // Difundir estado a todos los participantes
    global.peerManager.broadcastToParticipants({ type: 'lock_ui', locked: __tutorLockAll });
    // También detener audio cuando se bloquea
    if (__tutorLockAll) {
      try { speechSynthesis.cancel(); } catch(_) {}
      global.peerManager.broadcastToParticipants({ type: 'stop_audio' });
    }
  }

  // ===== Bloquear/Desbloquear controles del tutor =====
  
  function lockTutorControls(lock) {
    try {
      const tutorPage = document.getElementById('page-tutor');
      if (!tutorPage) return;
      
      // Obtener todos los controles excepto el botón de desbloquear
      const controls = tutorPage.querySelectorAll('button, input, select, textarea');
      const unlockBtn = document.getElementById('tutorStopAll');
      
      controls.forEach(control => {
        // No bloquear el botón de desbloquear
        if (control === unlockBtn) return;
        
        if (lock) {
          // Guardar estado original antes de bloquear
          control.dataset.wasDisabledTutor = control.disabled ? 'true' : 'false';
          control.disabled = true;
          control.style.pointerEvents = 'none';
          control.style.opacity = '0.5';
        } else {
          // Restaurar estado original
          if (control.dataset.wasDisabledTutor === 'false') {
            control.disabled = false;
          }
          control.style.pointerEvents = '';
          control.style.opacity = '';
          delete control.dataset.wasDisabledTutor;
        }
      });
    } catch(e) {
      console.error('[Lock] Error bloqueando controles del tutor:', e);
    }
  }

  // ===== Spotlight para botón de desbloqueo =====
  
  function createSpotlightOverlay(targetButton) {
    try {
      // Remover overlay previo si existe
      removeSpotlightOverlay();
      
      // Crear overlay oscuro
      const overlay = document.createElement('div');
      overlay.id = 'tutorSpotlightOverlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: 9998;
        pointer-events: none;
        animation: fadeInOverlay 0.3s ease-out;
      `;
      
      // Crear spotlight (área clara alrededor del botón)
      const spotlight = document.createElement('div');
      spotlight.id = 'tutorSpotlight';
      spotlight.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: auto;
        border-radius: 16px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5),
                    0 0 60px 20px rgba(239, 68, 68, 0.6),
                    inset 0 0 0 3px rgba(239, 68, 68, 0.8);
        animation: pulseSpotlight 2s ease-in-out infinite;
      `;
      
      // Posicionar spotlight sobre el botón
      const updateSpotlightPosition = () => {
        const rect = targetButton.getBoundingClientRect();
        const padding = 12;
        spotlight.style.top = `${rect.top - padding}px`;
        spotlight.style.left = `${rect.left - padding}px`;
        spotlight.style.width = `${rect.width + padding * 2}px`;
        spotlight.style.height = `${rect.height + padding * 2}px`;
      };
      
      updateSpotlightPosition();
      
      // Actualizar posición en scroll/resize
      const updateHandler = () => updateSpotlightPosition();
      window.addEventListener('scroll', updateHandler);
      window.addEventListener('resize', updateHandler);
      
      // Guardar handlers para limpieza
      spotlight._updateHandler = updateHandler;
      
      document.body.appendChild(overlay);
      document.body.appendChild(spotlight);
      
      // Elevar z-index del botón
      targetButton.style.position = 'relative';
      targetButton.style.zIndex = '10000';
    } catch(e) {
      console.error('[Spotlight] Error creando overlay:', e);
    }
  }
  
  function removeSpotlightOverlay() {
    try {
      const overlay = document.getElementById('tutorSpotlightOverlay');
      const spotlight = document.getElementById('tutorSpotlight');
      
      if (spotlight && spotlight._updateHandler) {
        window.removeEventListener('scroll', spotlight._updateHandler);
        window.removeEventListener('resize', spotlight._updateHandler);
      }
      
      if (overlay) overlay.remove();
      if (spotlight) spotlight.remove();
      
      // Restaurar z-index del botón
      const btn = document.getElementById('tutorStopAll');
      if (btn) {
        btn.style.position = '';
        btn.style.zIndex = '';
      }
    } catch(_) {}
  }

  // ===== Guardar configuración del tutor =====
  
  async function saveTutorConfig(nivel) {
    const nameInput = document.getElementById('tutorName');
    const groupInput = document.getElementById('tutorGroup');
    let tutorName = (nameInput?.value || '').trim();
    let tutorGroup = (groupInput?.value || '').trim();

    // Bandera de desarrollo: se activa en localhost o redes privadas, o puede forzarse con window.IS_DEV = true
    const IS_DEV = (typeof window !== 'undefined') && (
      window.IS_DEV === true ||
      (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(location.hostname))
    );

    // En desarrollo, autocompletar valores por defecto para no bloquear el flujo
    if (IS_DEV) {
      if (!tutorName) { tutorName = 'DevTutor'; try { if (nameInput) nameInput.value = tutorName; } catch(_) {} }
      if (!tutorGroup) { tutorGroup = 'DevGrupo'; try { if (groupInput) groupInput.value = tutorGroup; } catch(_) {} }
    }

    if (!tutorName) {
      alert('Por favor ingresa el nombre del tutor/administrador');
      if (nameInput) nameInput.focus();
      return;
    }
    
    if (!tutorGroup) {
      alert('Por favor ingresa el grupo/grado');
      if (groupInput) groupInput.focus();
      return;
    }
    
    // Determinar bandera de acentos según reglas por nivel
    const mapNivel = { basico:1, intermedio:2, avanzado:3, experto:4, facil:1, medio:2, dificil:3 };
    const nivelNumCfg = mapNivel[nivel] || 1;
    // Leer checkbox actual
    const acentosChkEl = document.getElementById('tutorAcentosObligatorios');
    let acentosFlag = !!(acentosChkEl && acentosChkEl.checked);
    // Forzar según nivel
    if (nivelNumCfg === 1) acentosFlag = false; // Básico: desactivado
    else if (nivelNumCfg === 4) acentosFlag = true; // Experto: activado
    // Reflejar en UI
    try { if (acentosChkEl) acentosChkEl.checked = acentosFlag; } catch(_) {}

    // Leer porcentaje de refuerzo (0-100)
    let prRaw = (document.getElementById('tutorPorcentajeRefuerzo')?.value || '').toString().trim();
    let porcentajeRefuerzo = parseInt(prRaw, 10);
    if (!Number.isInteger(porcentajeRefuerzo)) porcentajeRefuerzo = 0;
    porcentajeRefuerzo = Math.max(0, Math.min(100, porcentajeRefuerzo));

    global.tutorConfig = {
      tutorName: tutorName,
      tutorGroup: tutorGroup,
      cantidad: parseInt(document.getElementById('tutorCantidad').value) || 20,
      filtroLetras: document.getElementById('tutorFiltroLetras').value.trim(),
      porcentajeRefuerzo: porcentajeRefuerzo,
      acentosObligatorios: acentosFlag,
      strictMode: document.getElementById('tutorStrictMode').checked,
      nivel: nivel
    };
    
    // Mostrar resumen de configuración
    const configDetails = document.getElementById('configDetails');
    const letrasReforzar = global.tutorConfig.filtroLetras ? global.tutorConfig.filtroLetras : 'Ninguna';
    configDetails.innerHTML = `
      <p><strong>Tutor:</strong> ${global.tutorConfig.tutorName}</p>
      <p><strong>Grupo:</strong> ${global.tutorConfig.tutorGroup}</p>
      <p><strong>Nivel:</strong> ${nivel}</p>
      <p><strong>Cantidad:</strong> ${global.tutorConfig.cantidad} palabras</p>
      <p><strong>Letras a reforzar:</strong> ${letrasReforzar}</p>
      <p><strong>Porcentaje de refuerzo:</strong> ${global.tutorConfig.porcentajeRefuerzo || 0}%</p>
      <p><strong>Acentos obligatorios:</strong> ${global.tutorConfig.acentosObligatorios ? 'Sí' : 'No'}</p>
      <p><strong>Modo estricto:</strong> ${global.tutorConfig.strictMode ? 'Sí' : 'No'}</p>
    `;
    
    // Generar palabras según configuración
    await generarPalabrasParaTutor();
    // Actualizar resumen con la cantidad real generada
    try {
      const realCount = Array.isArray(global.tutorConfig.palabrasGeneradas) ? global.tutorConfig.palabrasGeneradas.length : 0;
      const letrasReforzarFinal = global.tutorConfig.filtroLetras ? global.tutorConfig.filtroLetras : 'Ninguna';
      configDetails.innerHTML = `
        <p><strong>Tutor:</strong> ${global.tutorConfig.tutorName}</p>
        <p><strong>Grupo:</strong> ${global.tutorConfig.tutorGroup}</p>
        <p><strong>Nivel:</strong> ${nivel}</p>
        <p><strong>Cantidad solicitada:</strong> ${global.tutorConfig.cantidad} &nbsp; <span class="hint">(generadas: ${realCount})</span></p>
        <p><strong>Letras a reforzar:</strong> ${letrasReforzarFinal}</p>
        <p><strong>Porcentaje de refuerzo:</strong> ${global.tutorConfig.porcentajeRefuerzo || 0}%</p>
        <p><strong>Acentos obligatorios:</strong> ${global.tutorConfig.acentosObligatorios ? 'Sí' : 'No'}</p>
        <p><strong>Modo estricto:</strong> ${global.tutorConfig.strictMode ? 'Sí' : 'No'}</p>
      `;
    } catch(_) {}
    
    // Ir al panel del tutor y asegurar mostrar el resumen de configuración
    try {
      if (!(global.peerManager && global.peerManager.isConnected)) {
        // Iniciar modo tutor (navega a page-tutor internamente)
        global.initTutorMode();
        // Tras un pequeño delay, hacer scroll al resumen
        setTimeout(() => {
          try {
            global.goToPage && global.goToPage('page-tutor');
            const card = document.getElementById('tutorConfigSummary');
            if (card) {
              card.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // ajustar un offset para no quedar pegado al borde
              setTimeout(() => { window.scrollBy(0, -80); }, 250);
            }
          } catch(_) {}
        }, 400);
      } else {
        // Ya hay servidor activo; ir a page-tutor, refrescar y enfocar resumen
        global.goToPage('page-tutor');
        try {
          document.getElementById('sessionId').textContent = global.peerManager.sessionId || '-';
          document.getElementById('serverStatus').textContent = 'Activo';
          document.getElementById('tutorStatus').innerHTML = '<p>✅ Servidor activo y listo para recibir participantes</p>';
          document.getElementById('sessionInfo').style.display = 'block';
        } catch(_) {}
        global.groupState.sessionActive = true;
        global.updateTutorUI();
        // Scroll inmediato al resumen
        setTimeout(() => {
          try {
            const card = document.getElementById('tutorConfigSummary');
            if (card) {
              card.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setTimeout(() => { window.scrollBy(0, -80); }, 250);
            }
          } catch(_) {}
        }, 100);
      }
    } catch(_) {
      try { global.initTutorMode(); } catch(_) {}
    }
  }

  // ===== Generar palabras para el tutor =====
  
  async function generarPalabrasParaTutor() {
    try {
      if (!global.raeWordsData.loaded) {
        await (global.DataLoader && global.DataLoader.cargarPalabrasRAE ? global.DataLoader.cargarPalabrasRAE() : Promise.resolve());
      }
      const map = { basico:1, intermedio:2, avanzado:3, experto:4, facil:1, medio:2, dificil:3 };
      const nivelNum = map[global.tutorConfig.nivel] || 1;
      let seleccion = global.WordFilters.seleccionarPalabrasPorNivel(global.raeWordsData.wordsByLevel, nivelNum, global.tutorConfig.cantidad || 20, {
        letrasEspecificas: global.tutorConfig.filtroLetras || undefined,
        conAcentos: global.tutorConfig.acentosObligatorios || undefined
      });
      global.tutorConfig.palabrasGeneradas = Array.isArray(seleccion) ? seleccion : [];
      console.log('[Tutor] Palabras generadas desde JSON:', global.tutorConfig.palabrasGeneradas.length);
    } catch (error) {
      console.error('[Tutor] Error generando palabras:', error);
      global.tutorConfig.palabrasGeneradas = [];
    }
  }

  // ===== Utilidades para generar PDF de participante =====
  
  function __buildResultsLogFromParticipant(p){
    const mapRecord = (a) => ({
      fechaISO: a.timestamp || new Date().toISOString(),
      nivel: (global.currentNivel || global.tutorConfig?.nivel || '-'),
      palabra: a.word || '',
      respuesta: a.answer || '',
      correcto: a.isCorrect ? 'Sí' : 'No',
      tiempoMs: ''
    });
    const uniques = new Map(); // por índice de palabra
    (Array.isArray(p.answers) ? p.answers : []).forEach(a => {
      uniques.set(a.wordIndex, a); // quedarse con el último intento
    });
    return Array.from(uniques.values()).map(mapRecord);
  }

  function __withTempAlumnoCurso(name, group, fn){
    // Crea temporalmente elementos #alumno y #curso si no existen, para que reportes.js los lea
    const created = { alumno: null, curso: null };
    let alumnoEl = document.getElementById('alumno');
    if (!alumnoEl) { alumnoEl = document.createElement('input'); alumnoEl.type='hidden'; alumnoEl.id='alumno'; document.body.appendChild(alumnoEl); created.alumno = alumnoEl; }
    let cursoEl = document.getElementById('curso');
    if (!cursoEl) { cursoEl = document.createElement('input'); cursoEl.type='hidden'; cursoEl.id='curso'; document.body.appendChild(cursoEl); created.curso = cursoEl; }
    const prevAlumno = alumnoEl.value; const prevCurso = cursoEl.value;
    try { alumnoEl.value = name || ''; cursoEl.value = group || ''; fn(); } finally {
      alumnoEl.value = prevAlumno; cursoEl.value = prevCurso;
      try { if (created.alumno) created.alumno.remove(); } catch(_) {}
      try { if (created.curso) created.curso.remove(); } catch(_) {}
    }
  }

  function tutorGenerateParticipantPDF(participantId){
    try {
      const p = global.groupState.getParticipant(participantId);
      if (!p) return alert('Participante no encontrado');
      // Preparar contexto de datos
      window.resultsLog = __buildResultsLogFromParticipant(p);
      try { window.gameState = window.gameState || {}; window.gameState.words = (global.groupState.exerciseWords || []).slice(); } catch(_) {}
      // Reutilizar generador oficial
      if (typeof window.__reportes_generarReportePDF === 'function') {
        __withTempAlumnoCurso(p.name, global.tutorConfig?.tutorGroup || '', () => window.__reportes_generarReportePDF());
      } else if (typeof window.generarReportePDF === 'function') {
        __withTempAlumnoCurso(p.name, global.tutorConfig?.tutorGroup || '', () => window.generarReportePDF());
      } else {
        alert('Generador de reportes no disponible');
      }
    } catch(e) { console.error('[Tutor] Error generando PDF:', e); alert('Error al generar PDF'); }
  }

  // ===== Funciones de UI del Tutor =====
  
  function updateTutorUI() {
    const startBtn = document.getElementById('startExercise');
    const stopAllBtn = document.getElementById('tutorStopAll');
    const stopBtn = document.getElementById('stopSession');
    const newExBtn = document.getElementById('tutorNewExercise');
    const newSessBtn = document.getElementById('tutorNewSession');
    const qrBtn = document.getElementById('btnShowQR');
    
    if (global.groupState.exerciseActive) {
      startBtn.textContent = '⏸️ Ejercicio en Curso';
      startBtn.disabled = true;
      if (stopAllBtn) stopAllBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = false;
      if (newExBtn) newExBtn.disabled = true;
      if (newSessBtn) newSessBtn.disabled = true;
      if (qrBtn) qrBtn.disabled = true; // Desactivar QR durante el ejercicio
    } else {
      startBtn.textContent = '▶️ Iniciar Ejercicio';
      if (global.groupState.exerciseStarted) {
        startBtn.disabled = true;
      } else {
        startBtn.disabled = false;
      }
      if (stopAllBtn) stopAllBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;
      if (newExBtn) newExBtn.disabled = !(global.groupState.exerciseStarted && !global.groupState.exerciseActive);
      if (newSessBtn) newSessBtn.disabled = !(global.groupState.exerciseStarted && !global.groupState.exerciseActive);
      if (qrBtn) qrBtn.disabled = false; // Rehabilitar QR cuando no hay ejercicio
    }
  }

  function refreshTutorCurrentWordLabel() {
    try {
      const cw = document.getElementById('tutorCurrentWord');
      if (!cw) return;
      const show = !!document.getElementById('showCurrentWord')?.checked;
      const w = global.groupState.currentWord || '—';
      cw.textContent = show ? w : '—';
    } catch(_) {}
  }

  function refreshTutorOverallProgress() {
    try {
      const fill = document.getElementById('tutorOverallProgressFill');
      const txt  = document.getElementById('tutorOverallProgressText');
      const total = Array.isArray(global.groupState.exerciseWords) ? global.groupState.exerciseWords.length : 0;
      const current = Math.min(total, (global.groupState.currentWordIndex + 1));
      const pct = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;
      if (fill) fill.style.width = `${pct}%`;
      if (txt) txt.textContent = `${current}/${total}`;
    } catch(_) {}
  }

  // Exportar funciones globalmente
  global.GroupModeTutor = {
    startGroupExercise,
    sendCurrentWordToParticipants,
    nextWordInExercise,
    tutorPlayCurrentWord,
    tutorRepeatCurrentWord,
    tutorStopAllAudio,
    tutorToggleLockAll,
    saveTutorConfig,
    generarPalabrasParaTutor,
    tutorNewExercise,
    tutorNewSession,
    tutorGenerateParticipantPDF,
    updateTutorUI,
    refreshTutorCurrentWordLabel,
    refreshTutorOverallProgress,
    createSpotlightOverlay,
    removeSpotlightOverlay,
    lockTutorControls
  };

  // Mantener compatibilidad con código existente
  global.startGroupExercise = startGroupExercise;
  global.sendCurrentWordToParticipants = sendCurrentWordToParticipants;
  global.nextWordInExercise = nextWordInExercise;
  global.tutorPlayCurrentWord = tutorPlayCurrentWord;
  global.tutorRepeatCurrentWord = tutorRepeatCurrentWord;
  global.tutorStopAllAudio = tutorStopAllAudio;
  global.tutorToggleLockAll = tutorToggleLockAll;
  global.saveTutorConfig = saveTutorConfig;
  global.generarPalabrasParaTutor = generarPalabrasParaTutor;
  global.tutorNewExercise = tutorNewExercise;
  global.tutorNewSession = tutorNewSession;
  global.tutorGenerateParticipantPDF = tutorGenerateParticipantPDF;
  global.updateTutorUI = updateTutorUI;
  global.refreshTutorCurrentWordLabel = refreshTutorCurrentWordLabel;
  global.refreshTutorOverallProgress = refreshTutorOverallProgress;

})(typeof window !== 'undefined' ? window : globalThis);
