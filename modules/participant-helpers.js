// Helpers y funciones del modo participante (grupal)
(function(global) {
  'use strict';

  // ===== Helpers de audio y UI del participante =====
  
  // Escapar HTML para evitar inyección en feedback
  function _escapeHtml(str){
    try {
      return String(str || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    } catch(_) { return String(str || ''); }
  }

  function setParticipantAudioPolicy(allowAudio) {
    try {
      const allowed = !!allowAudio;
      global.window._participantAudioLastAllowed = allowed;
      global.window.__ttsMuted = !allowed;
      if (!allowed) {
        try { speechSynthesis.cancel(); } catch(_) {}
      }
    } catch(_) {}
  }

  function resetParticipantAnswerInput() {
    try {
      const ans = document.getElementById('participantAnswer');
      if (ans) {
        ans.disabled = false;
        // Si no se requiere teclado virtual, permitir edición normal
        try {
          const mustUseVK = !!(window.DeviceDetector && typeof window.DeviceDetector.shouldUseVirtualKeyboard === 'function' && window.DeviceDetector.shouldUseVirtualKeyboard());
          if (!mustUseVK) {
            ans.removeAttribute('readonly');
          }
        } catch(_) {
          // Fallback: en desktop típicamente no hay readonly
          try { ans.removeAttribute('readonly'); } catch(_) {}
        }
        ans.value = '';
        try { ans.focus(); } catch(_) {}
        // Sincronizar espejo visual si existe gestor VK
        try {
          if (window.virtualKeyboardManager && typeof window.virtualKeyboardManager._updateMirrorFromInput === 'function') {
            window.virtualKeyboardManager._updateMirrorFromInput(ans);
          }
        } catch(_) {}
      }
      const fb = document.getElementById('participantFeedback');
      if (fb) fb.innerHTML = '';
    } catch(_) {}
  }

  function showJoinDeniedAndReturn() {
    try { global.window._lastDisconnectReason = 'exercise_in_progress'; } catch(_) {}
    try { alert('No es posible unirse: el ejercicio ya está en curso. Intenta nuevamente cuando el tutor inicie un nuevo ejercicio.'); } catch(_) {}
    try { global.peerManager.disconnect(); } catch(_) {}
    try {
      global.goToPage('page-participant');
      const conn = document.getElementById('participantConnection');
      const panel = document.getElementById('participantExercise');
      const statusPanel = document.getElementById('participantStatus');
      const statusLabel = document.getElementById('connectionStatus');
      if (conn) conn.style.display = 'block';
      if (panel) panel.style.display = 'none';
      if (statusPanel) statusPanel.style.display = 'block';
      if (statusLabel) statusLabel.textContent = '❌ No te pudiste unir: la sesión ya está en curso. Mantente atento para el próximo ejercicio.';
      global.updateParticipantConnectionStatus(false);
    } catch(_) {}
  }

  // ===== Handler de datos recibidos del tutor =====
  
  function handleParticipantDataReceived(tutorId, data) {
    console.log('[Participante] Datos recibidos del tutor:', data);
    let pf = null, pt = null;
    
    switch (data.type) {
      case 'exercise_config':
        console.log('[Participante] Configuración recibida:', data.config);
        try { global.window._exerciseConfigParticipant = data.config || null; } catch(_) {}
        // Preparar confirmación condicionada al contenido del input
        try {
          const ans = document.getElementById('participantAnswer');
          const game = document.getElementById('participantGame');
          const confirmBtn = game ? game.querySelector('.participant-input button') : null;
          if (confirmBtn) confirmBtn.disabled = true;
          if (ans && !ans.dataset._bindConfirmToggle) {
            ans.addEventListener('input', () => {
              const val = (ans.value || '').trim();
              const waitNext = !!window._waitNextWord; // si true, no habilitar aún
              if (confirmBtn) confirmBtn.disabled = (val.length === 0 || waitNext);
            });
            ans.dataset._bindConfirmToggle = '1';
          }
        } catch(_) {}
        break;
        
      case 'exercise_start':
        try { global.window._exerciseStartedParticipant = true; global.updateParticipantConnectionStatus(true); } catch(_) {}
        document.getElementById('exerciseStatus').textContent = 'Ejercicio iniciado';
        document.getElementById('participantGame').style.display = 'block';
        // Ocultar y limpiar cualquier reporte anterior
        try {
          const reportDiv = document.getElementById('participantReport');
          const contentDiv = document.getElementById('participantReportContent');
          if (contentDiv) contentDiv.innerHTML = '';
          if (reportDiv) reportDiv.style.display = 'none';
        } catch(_) {}
        // Preparar espejo visual para móviles/tablets (como en modo individual)
        try {
          const needsVK = !!(window.DeviceDetector && typeof window.DeviceDetector.shouldUseVirtualKeyboard === 'function' && window.DeviceDetector.shouldUseVirtualKeyboard());
          if (needsVK) {
            // Asegurar inicialización de VK
            if (!window.virtualKeyboardManager) {
              try {
                const fn = window.initVirtualKeyboardIfNeeded;
                if (typeof fn === 'function') {
                  const p = fn();
                  if (p && typeof p.then === 'function') { p.then(() => {}).catch(() => {}); }
                }
              } catch(_) {}
            }
            const ans = document.getElementById('participantAnswer');
            const container = document.getElementById('participantGame');
            if (ans && container) {
              let mirror = document.getElementById('vkMirrorParticipant');
              if (!mirror) {
                mirror = document.createElement('div');
                mirror.id = 'vkMirrorParticipant';
                mirror.className = 'vk-mirror empty';
                mirror.innerHTML = '<span class="vk-mirror-text"></span><span class="vk-caret"></span>';
                // Insertar el espejo justo antes del input
                try { container.insertBefore(mirror, container.querySelector('.participant-input') || ans); } catch(_) { container.insertBefore(mirror, ans); }
                // Click/touch en espejo abre teclado para el input (solo si no estamos esperando 'Siguiente')
                const tryOpen = () => {
                  const waitNext = !!window._waitNextWord;
                  if (waitNext) return; // bloqueado hasta siguiente palabra
                  try { window.virtualKeyboardManager?.showKeyboard(ans); } catch(_) {}
                };
                mirror.addEventListener('click', tryOpen);
                mirror.addEventListener('touchstart', tryOpen, { passive: true });
              }
              // Registrar el espejo en el VK manager para mantener sincronía
              try {
                if (window.virtualKeyboardManager) {
                  const text = mirror.querySelector('.vk-mirror-text');
                  const caret = mirror.querySelector('.vk-caret');
                  window.virtualKeyboardManager.mirror = { el: mirror, text, caret };
                  window.virtualKeyboardManager._updateMirrorFromInput(ans);
                  // Abrir automáticamente el teclado virtual para estar listo para digitar
                  try { window.virtualKeyboardManager.showKeyboard(ans); } catch(_) {}
                }
              } catch(_) {}
              // Aplicar estado de interactividad del espejo según bandera de espera
              try {
                mirror.style.pointerEvents = (!!window._waitNextWord) ? 'none' : 'auto';
                mirror.style.opacity = (!!window._waitNextWord) ? '0.8' : '';
              } catch(_) {}
            }
          }
        } catch(_) {}
        // Persistir nivel elegido por el tutor
        try {
          global.window._exerciseConfigParticipant = global.window._exerciseConfigParticipant || {};
          if (data && data.nivel) global.window._exerciseConfigParticipant.nivel = data.nivel;
        } catch(_) {}
        // Inicializar progreso local (unificado)
        try {
          global.window._participantProgressCurrent = 0;
          global.window._participantProgressTotal = Number(data.totalWords || 0);
          if (window.Progress && Progress.set) Progress.set('participantProgressFill','participantProgressText',0, global.window._participantProgressTotal);
          else {
            const pf0 = document.getElementById('participantProgressFill');
            const pt0 = document.getElementById('participantProgressText');
            if (pf0) pf0.style.width = '0%';
            if (pt0) pt0.textContent = `0/${global.window._participantProgressTotal}`;
          }
        } catch(_) {}
        // Preparar estructuras para el reporte
        try {
          global.window._groupResultsLog = [];
          global.window._receivedWords = [];
          global.window.gameState = global.window.gameState || {};
          global.window.gameState.words = [];
          global.window.sessionStartISO = new Date().toISOString();
        } catch(_) {}
        // Actualizar progreso
        pf = document.getElementById('participantProgressFill');
        pt = document.getElementById('participantProgressText');
        if (pf) pf.style.width = '0%';
        if (pt) pt.textContent = `0/${data.totalWords||0}`;
        break;
        
      case 'new_word':
        try { const panel = document.getElementById('participantExercise'); if (panel) panel.style.display = 'block'; } catch(_) {}
        try { const conn = document.getElementById('participantConnection'); if (conn) conn.style.display = 'none'; } catch(_) {}
        // Al llegar una nueva palabra, permitir nueva respuesta
        try { window._waitNextWord = false; } catch(_) { window._waitNextWord = false; }
        resetParticipantAnswerInput();
        // Al llegar nueva palabra, dejar botón confirmar deshabilitado hasta que el alumno escriba
        try {
          const game = document.getElementById('participantGame');
          const confirmBtn = game ? game.querySelector('.participant-input button') : null;
          if (confirmBtn) confirmBtn.disabled = true;
          // Habilitar interactividad del espejo nuevamente
          try { const mirror = document.getElementById('vkMirrorParticipant'); if (mirror) mirror.style.pointerEvents = 'auto'; } catch(_) {}
        } catch(_) {}
        setParticipantAudioPolicy(data.playAudio);
        // Persistir nivel en cada palabra por seguridad
        try {
          global.window._exerciseConfigParticipant = global.window._exerciseConfigParticipant || {};
          if (data && data.nivel) global.window._exerciseConfigParticipant.nivel = data.nivel;
        } catch(_) {}
        // Marcar que aún no se respondió esta palabra (para fallback de progreso)
        try { global.window._participantAnsweredCurrentWord = false; } catch(_) {}
        // Registrar palabra para el PDF
        try {
          if (data && typeof data.word === 'string' && data.word.trim()) {
            const w = String(data.word).trim();
            if (!Array.isArray(global.window._receivedWords)) global.window._receivedWords = [];
            if (!global.window._receivedWords.includes(w)) global.window._receivedWords.push(w);
            global.window._currentWordParticipant = w;
            global.window.gameState = global.window.gameState || {};
            if (!Array.isArray(global.window.gameState.words)) global.window.gameState.words = [];
            if (!global.window.gameState.words.includes(w)) global.window.gameState.words.push(w);
          }
        } catch(_) {}
        // Reproducir palabra (solo si está habilitado)
        if (data.playAudio) {
          setTimeout(async () => {
            try {
              const v = (typeof global.elegirVozEspanol === 'function') ? global.elegirVozEspanol() : null;
              await global.ensureTTSReady(v);
              await global.speakWordSafe(data.word, { voice: v, lang: (v?.lang || 'es-ES'), rate: 0.8 });
            } catch(_) {}
          }, 200);
        }
        break;
        
      case 'answer_feedback':
        const feedback = document.getElementById('participantFeedback');
        if (data.isCorrect) {
          feedback.innerHTML = '<p style="color: var(--success);">✅ ¡Correcto!</p>';
          
          // 🎉 NUEVO: Animaciones de éxito para participante
          try { (global.Feedback && Feedback.celebrarAcierto) ? Feedback.celebrarAcierto() : (typeof global.celebrarAcierto === 'function' && global.celebrarAcierto()); } catch(_) {}
          
          // Incrementar racha del participante
          global.window.rachaActualParticipant = (global.window.rachaActualParticipant || 0) + 1;
          if (global.window.rachaActualParticipant >= 5 && typeof global.mostrarRacha === 'function') {
            global.mostrarRacha(global.window.rachaActualParticipant);
          }
        } else {
          const typed = _escapeHtml(global.window._lastSubmittedAnswer || '');
          const correct = _escapeHtml(typeof data.correctWord === 'string' ? data.correctWord : '');
          feedback.innerHTML = `<p style="color:#6b7280;">❌ Incorrecto. Escribiste: <strong style="color:#dc3545;">"${typed}"</strong> <span style="color:#6b7280;">| Era:</span> <strong style="color:#16a34a;">"${correct}"</strong></p>`;
          
          // 🔴 NUEVO: Animación de error para participante
          try { (global.Feedback && Feedback.animarError) ? Feedback.animarError() : (typeof global.animarError === 'function' && global.animarError()); } catch(_) {}
          
          // Resetear racha
          global.window.rachaActualParticipant = 0;
        }
        // Fallback de progreso local: contar una respuesta por palabra (unificado)
        try {
          if (!global.window._participantAnsweredCurrentWord) {
            global.window._participantAnsweredCurrentWord = true;
            const total = Number(global.window._participantProgressTotal || 0);
            let cur = Number(global.window._participantProgressCurrent || 0) + 1;
            if (cur > total) cur = total;
            global.window._participantProgressCurrent = cur;
            if (window.Progress && Progress.set) Progress.set('participantProgressFill','participantProgressText', cur, total);
            else {
              const pf1 = document.getElementById('participantProgressFill');
              const pt1 = document.getElementById('participantProgressText');
              const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((cur / total) * 100))) : 0;
              if (pf1) { try { pf1.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)'; } catch(_) {} pf1.style.width = `${pct}%`; }
              if (pt1) pt1.textContent = `${cur}/${total}`;
            }
          }
        } catch(_) {}
        // Registrar intento para el PDF
        try {
          const palabra = (typeof data.correctWord === 'string' && data.correctWord) ? data.correctWord : (global.window._currentWordParticipant || '');
          const respuesta = (typeof global.window._lastSubmittedAnswer === 'string') ? global.window._lastSubmittedAnswer : '';
          const correcto = !!data.isCorrect ? 'Sí' : 'No';
          const nivel = (global.window._exerciseConfigParticipant && global.window._exerciseConfigParticipant.nivel) ? global.window._exerciseConfigParticipant.nivel : (global.window.currentNivel || '-');
          const rec = { fechaISO: new Date().toISOString(), nivel, palabra, respuesta, correcto, tiempoMs: '' };
          if (!Array.isArray(global.window._groupResultsLog)) global.window._groupResultsLog = [];
          global.window._groupResultsLog.push(rec);
        } catch(_) {}
        break;
        
      case 'progress_update':
        try { console.log('[Participante] progress_update recibido:', data); } catch(_) {}
        (function(){
          const safeTotal = Number(data.total || 0);
          const safeCurrent = Math.max(0, Math.min(Number(data.current || 0), safeTotal));
          if (window.Progress && Progress.set) Progress.set('participantProgressFill','participantProgressText', safeCurrent, safeTotal);
          else {
            const pf = document.getElementById('participantProgressFill');
            const pt = document.getElementById('participantProgressText');
            const percentage = safeTotal > 0 ? Math.min(100, Math.max(0, (safeCurrent / safeTotal) * 100)) : 0;
            if (pf) { try { pf.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)'; } catch(_) {} pf.style.width = `${percentage}%`; }
            if (pt) pt.textContent = `${safeCurrent}/${safeTotal}`;
          }
        })();
        break;
        
      case 'stop_audio':
        try { speechSynthesis.cancel(); } catch(_) {}
        break;
        
      case 'lock_ui':
        global.applyParticipantLockUI(!!data.locked);
        break;
        
      case 'session_end':
        try { global.peerManager.disconnect(); } catch(_) {}
        try { global.groupState.reset(); } catch(_) {}
        try { global.goToPage('page-mode-select'); } catch(_) {}
        return;
        
      case 'exercise_end':
        document.getElementById('exerciseStatus').textContent = 'Ejercicio completado';
        document.getElementById('participantGame').style.display = 'none';
        try { global.window._exerciseStartedParticipant = false; global.updateParticipantConnectionStatus(true); } catch(_) {}
        // Construir contexto de reporte para modules/reportes.js
        try {
          let words = Array.isArray(global.window._receivedWords) ? global.window._receivedWords.slice() : [];
          let log = Array.isArray(global.window._groupResultsLog) ? global.window._groupResultsLog.slice() : [];
          
          // Filtrar solo los resultados de este participante si vienen del tutor
          if (Array.isArray(data.results) && data.results.length > 0) {
            const myName = global.window.participantName || '';
            const myResults = data.results.filter(r => 
              !r.participantName || r.participantName === myName || !myName
            );
            
            // Si los buffers locales están vacíos, usar los resultados del tutor
            if (words.length === 0 || log.length === 0) {
              try {
                words = [...new Set(myResults.map(r => String(r.palabra || '').trim()).filter(Boolean))];
              } catch(_) {}
              try {
                log = myResults.map(r => ({
                  fechaISO: r.fechaISO || new Date().toISOString(),
                  nivel: r.nivel || (global.window._exerciseConfigParticipant?.nivel || global.window.currentNivel || '-'),
                  palabra: String(r.palabra || ''),
                  respuesta: String(r.respuesta || ''),
                  correcto: (r.correcto === true || r.correcto === 'Sí' || r.correcto === 'Si') ? 'Sí' : (r.correcto || 'No'),
                  tiempoMs: (r.tiempoMs ?? '')
                }));
              } catch(_) {}
            }
          }
          
          global.window.resultsLog = log;
          global.window.gameState = global.window.gameState || {};
          global.window.gameState.words = words;
          global.window.gameState.resultsLog = log;
          global.window.sessionEndISO = new Date().toISOString();
          
          console.log('[Participante] PDF data ready:', { words: words.length, log: log.length });
        } catch(e) { console.error('[Participante] Error preparando datos PDF:', e); }
        
        // Celebración final si supera el umbral (participante)
        try {
          const log = Array.isArray(global.window.resultsLog) ? global.window.resultsLog : [];
          const total = (function(){
            if (Number.isFinite(global.window._participantProgressTotal) && global.window._participantProgressTotal > 0) return global.window._participantProgressTotal;
            if (Array.isArray(global.window.gameState?.words)) return global.window.gameState.words.length;
            return log.length;
          })();
          const esOk = (val) => {
            if (val === true) return true;
            try {
              const raw = String(val ?? '').trim();
              const norm = (typeof global.WordFilters !== 'undefined' && global.WordFilters.normalizarBasico)
                ? global.WordFilters.normalizarBasico(raw)
                : raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
              return norm === 'si' || norm === 'true' || norm === '1';
            } catch(_) { return false; }
          };
          const correctas = log.filter(r => esOk(r.correcto)).length;
          const porcentaje = total ? Math.round((correctas / total) * 100) : 0;
          const umbral = (window.CONFIG && Number.isFinite(window.CONFIG.FINAL_CELEBRATION_THRESHOLD)) ? window.CONFIG.FINAL_CELEBRATION_THRESHOLD : 70;
          if (porcentaje >= umbral && window.Feedback && typeof window.Feedback.showFinalCongrats === 'function') {
            window.Feedback.showFinalCongrats(porcentaje);
          }
        } catch(_) {}

        showParticipantReport(data.results);
        // Bloquear entrada y ocultar teclado virtual en participante
        try {
          const ans = document.getElementById('participantAnswer');
          if (ans) { ans.disabled = true; ans.setAttribute('readonly','true'); ans.value = ''; }
          const game = document.getElementById('participantGame');
          const confirmBtn = game ? game.querySelector('.participant-input button') : null;
          if (confirmBtn) confirmBtn.disabled = true;
          try { if (window.VK && VK.hide) VK.hide(); else if (window.virtualKeyboardManager) window.virtualKeyboardManager.hideKeyboard?.(); } catch(_) {}
          const vkInline = document.getElementById('vk-inline');
          if (vkInline) { vkInline.style.display = 'none'; vkInline.setAttribute('aria-hidden','true'); }
        } catch(_) {}
        break;
    }
  }

  // ===== Mostrar reporte del participante (unificado con modo individual) =====
  
  function showParticipantReport(results) {
    const reportDiv = document.getElementById('participantReport');
    const contentDiv = document.getElementById('participantReportContent');
    if (!contentDiv) return;
  
    const resultados = Array.isArray(window.resultsLog) ? window.resultsLog : [];
    if (window.ReportUtils && typeof window.ReportUtils.renderReportSummaryAndList === 'function') {
      let level = (window._exerciseConfigParticipant && window._exerciseConfigParticipant.nivel)
        ? window._exerciseConfigParticipant.nivel
        : (window.currentNivel || '');
      if (!level) {
        try {
          const fromResults = (resultados.find(r => r && r.nivel && String(r.nivel).trim()) || {}).nivel;
          if (fromResults) level = String(fromResults);
        } catch(_) {}
      }
      const ctx = {
        results: resultados,
        level,
        startISO: window.sessionStartISO || null,
        endISO: window.sessionEndISO || null,
        filterTxt: (window._exerciseConfigParticipant && window._exerciseConfigParticipant.filtroLetras) ? String(window._exerciseConfigParticipant.filtroLetras).trim() : '-',
        refuerzoTxt: (function(){ const v = window._exerciseConfigParticipant?.porcentajeRefuerzo; if (v === undefined || v === null || v === '') return '0'; const n = parseInt(v,10); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)).toString() : '0'; })(),
        acentosObligatorios: !!(window._exerciseConfigParticipant && window._exerciseConfigParticipant.acentosObligatorios),
        strictTxt: (window._exerciseConfigParticipant && window._exerciseConfigParticipant.strictMode) ? 'Sí' : 'No'
      };
      window.ReportUtils.renderReportSummaryAndList(contentDiv, ctx);
      if (reportDiv) reportDiv.style.display = 'block';
      // Mostrar ayuda contextual (primera vez) también en la ruta principal
      try {
        if (window.PageHints && typeof window.PageHints.showAt === 'function') {
          window.PageHints.showAt('#participantReport', {
            title: 'Tu reporte 📊',
            content: 'Aquí puedes <strong>descargar tu PDF</strong> o crear una <strong>práctica manual</strong>. Revisa el resumen y la lista de palabras respondidas.',
            position: 'bottom',
            storageKey: 'hint_participant_report_shown'
          });
        }
      } catch(_) {}
      return;
    }
  
    // Fallback mínimo
    contentDiv.innerHTML = '<div class="report-summary">Reporte no disponible</div>';
    if (reportDiv) reportDiv.style.display = 'block';

    // Mostrar ayuda contextual al abrir el reporte por primera vez
    try {
      if (window.PageHints && typeof window.PageHints.showAt === 'function') {
        window.PageHints.showAt('#participantReport', {
          title: 'Tu reporte 📊',
          content: 'Aquí puedes <strong>descargar tu PDF</strong> o crear una <strong>práctica manual</strong>. Revisa el resumen y la lista de palabras respondidas.',
          position: 'bottom',
          storageKey: 'hint_participant_report_shown'
        });
      }
    } catch(_) {}
  }

  // ===== Funciones de UI del Participante =====
  
  function updateParticipantConnectionStatus(isConnected) {
    const status = document.getElementById('connectionStatus');
    const statusPanel = document.getElementById('participantStatus');
    if (!status || !statusPanel) return;
    if (isConnected) {
      try { global.window._participantEverConnected = true; } catch(_) {}
      statusPanel.style.display = 'block';
      const started = !!global.window._exerciseStartedParticipant;
      status.textContent = started
        ? '✅ Conectado al tutor'
        : '✅ Conectado al tutor · Esperando inicio de ejercicio';
    } else {
      const tried = !!global.window._participantTriedConnect;
      const ever = !!global.window._participantEverConnected;
      const reason = (typeof global.window !== 'undefined' && global.window._lastDisconnectReason) ? global.window._lastDisconnectReason : '';
      if (reason === 'exercise_in_progress') {
        statusPanel.style.display = 'block';
        status.textContent = '❌ No te pudiste unir: la sesión ya está en curso. Mantente atento para el próximo ejercicio.';
      } else if (tried || ever) {
        statusPanel.style.display = 'block';
        status.textContent = '❌ Desconectado del tutor. Si la sesión ya comenzó, espera al próximo ejercicio e intenta conectarte a tiempo.';
      } else {
        statusPanel.style.display = 'none';
        status.textContent = '';
      }
    }
  }

  function applyParticipantLockUI(locked) {
    try {
      global.window._participantUILocked = !!locked;
      
      // Bloquear todos los controles de la página del participante
      const participantPage = document.getElementById('page-participant');
      if (participantPage) {
        const controls = participantPage.querySelectorAll('button, input, select, textarea');
        controls.forEach(control => {
          if (locked) {
            // Guardar estado original antes de bloquear
            control.dataset.wasDisabledParticipant = control.disabled ? 'true' : 'false';
            control.disabled = true;
            control.style.pointerEvents = 'none';
            
            // Prevenir entrada de teclado en inputs
            if (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA') {
              control.dataset.wasReadonlyParticipant = control.hasAttribute('readonly') ? 'true' : 'false';
              control.setAttribute('readonly', 'readonly');
            }
          } else {
            // Restaurar estado original
            if (control.dataset.wasDisabledParticipant === 'false') {
              control.disabled = false;
            }
            control.style.pointerEvents = '';
            
            // Restaurar capacidad de escritura
            if (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA') {
              if (control.dataset.wasReadonlyParticipant === 'false') {
                control.removeAttribute('readonly');
              }
              delete control.dataset.wasReadonlyParticipant;
            }
            delete control.dataset.wasDisabledParticipant;
          }
        });
      }
      
      // Overlay visual
      let ov = document.getElementById('participantLockOverlay');
      if (locked) {
        if (!ov) {
          ov = document.createElement('div');
          ov.id = 'participantLockOverlay';
          ov.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(3px); z-index:9999; display:flex; align-items:center; justify-content:center; pointer-events:all; animation: fadeInOverlay 0.3s ease-out;';
          ov.innerHTML = `
            <div style="background:#fff; padding:24px 28px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.2); text-align:center; max-width:400px;">
              <div style="font-size:48px; margin-bottom:16px;">⛔</div>
              <div style="font-size:20px; font-weight:700; color:#dc2626; margin-bottom:12px;">Pantalla Bloqueada</div>
              <div style="font-size:16px; color:#666; line-height:1.5;">Espera indicaciones del tutor para continuar</div>
            </div>
          `;
          document.body.appendChild(ov);
        } else {
          ov.style.display = 'flex';
        }
      } else if (ov) {
        try { ov.remove(); } catch(_) { ov.style.display = 'none'; }
      }
    } catch(e) {
      console.error('[Lock] Error bloqueando UI del participante:', e);
    }
  }

  // Exportar funciones globalmente
  global.ParticipantHelpers = {
    setParticipantAudioPolicy,
    resetParticipantAnswerInput,
    showJoinDeniedAndReturn,
    handleParticipantDataReceived,
    showParticipantReport,
    updateParticipantConnectionStatus,
    applyParticipantLockUI
  };

  // Mantener compatibilidad con código existente
  global.setParticipantAudioPolicy = setParticipantAudioPolicy;
  global.resetParticipantAnswerInput = resetParticipantAnswerInput;
  global.showJoinDeniedAndReturn = showJoinDeniedAndReturn;
  global.handleParticipantDataReceived = handleParticipantDataReceived;
  global.showParticipantReport = showParticipantReport;
  global.updateParticipantConnectionStatus = updateParticipantConnectionStatus;
  global.applyParticipantLockUI = applyParticipantLockUI;

})(typeof window !== 'undefined' ? window : globalThis);
