// Helpers y funciones del modo participante (grupal)
(function(global) {
  'use strict';

  // ===== Helpers de audio y UI del participante =====
  
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
        // Inicializar progreso local (fallback)
        try {
          global.window._participantProgressCurrent = 0;
          global.window._participantProgressTotal = Number(data.totalWords || 0);
          const pf0 = document.getElementById('participantProgressFill');
          const pt0 = document.getElementById('participantProgressText');
          if (pf0) pf0.style.width = '0%';
          if (pt0) pt0.textContent = `0/${global.window._participantProgressTotal}`;
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
        } else {
          feedback.innerHTML = `<p style=\"color: var(--danger);\">❌ Incorrecto. La palabra era: <strong>${data.correctWord}</strong></p>`;
        }
        // Fallback de progreso local: contar una respuesta por palabra
        try {
          if (!global.window._participantAnsweredCurrentWord) {
            global.window._participantAnsweredCurrentWord = true;
            const total = Number(global.window._participantProgressTotal || 0);
            let cur = Number(global.window._participantProgressCurrent || 0) + 1;
            if (cur > total) cur = total;
            global.window._participantProgressCurrent = cur;
            const pf1 = document.getElementById('participantProgressFill');
            const pt1 = document.getElementById('participantProgressText');
            const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((cur / total) * 100))) : 0;
            if (pf1) { try { pf1.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)'; } catch(_) {} pf1.style.width = `${pct}%`; }
            if (pt1) pt1.textContent = `${cur}/${total}`;
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
        pf = document.getElementById('participantProgressFill');
        pt = document.getElementById('participantProgressText');
        const safeTotal = Number(data.total || 0);
        const safeCurrent = Math.max(0, Math.min(Number(data.current || 0), safeTotal));
        const percentage = safeTotal > 0 ? Math.min(100, Math.max(0, (safeCurrent / safeTotal) * 100)) : 0;
        if (pf) {
          // Asegurar un estilo visible del fill
          try { pf.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)'; } catch(_) {}
          pf.style.width = `${percentage}%`;
        }
        if (pt) pt.textContent = `${safeCurrent}/${safeTotal}`;
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
        
        showParticipantReport(data.results);
        // Bloquear entrada y ocultar teclado virtual en participante
        try {
          const ans = document.getElementById('participantAnswer');
          if (ans) { ans.disabled = true; ans.setAttribute('readonly','true'); ans.value = ''; }
          const game = document.getElementById('participantGame');
          const confirmBtn = game ? game.querySelector('.participant-input button') : null;
          if (confirmBtn) confirmBtn.disabled = true;
          try { if (window.virtualKeyboardManager) window.virtualKeyboardManager.hideKeyboard?.(); } catch(_) {}
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
    
    // Usar window.resultsLog que ya fue poblado en exercise_end
    const resultados = Array.isArray(global.window.resultsLog) ? global.window.resultsLog : [];
    const total = resultados.length;
    const correctas = resultados.filter(r => r.correcto === 'Sí' || r.correcto === true).length;
    const incorrectas = Math.max(0, total - correctas);
    const porcentaje = total ? Math.round((correctas / total) * 100) : 0;
    
    // Construir reporte detallado similar al modo individual
    let html = '';
    html += '<div class="report-summary" style="font-size:14px; margin-bottom:10px;">';
    
    // Nivel (mejor esfuerzo: config -> resultados -> fallback)
    let nivelTxt = (global.window._exerciseConfigParticipant && global.window._exerciseConfigParticipant.nivel)
      ? global.window._exerciseConfigParticipant.nivel
      : (global.window.currentNivel || '');
    if (!nivelTxt) {
      try {
        const fromResults = (resultados.find(r => r && r.nivel && String(r.nivel).trim()) || {}).nivel;
        if (fromResults) nivelTxt = String(fromResults);
      } catch(_) {}
    }
    // Normalizar presentación (capitalizar)
    try {
      const map = { basico: 'Básico', básico:'Básico', intermedio:'Intermedio', avanzado:'Avanzado', experto:'Experto', facil:'Básico', medio:'Intermedio', dificil:'Avanzado' };
      const key = String(nivelTxt||'').toLowerCase().trim();
      nivelTxt = map[key] || nivelTxt || '-';
    } catch(_) { nivelTxt = nivelTxt || '-'; }
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
    
    // Fechas
    const fechaInicioISO = global.window.sessionStartISO || null;
    const fechaSesionTxt = fechaInicioISO ? new Date(fechaInicioISO).toLocaleString() : new Date().toLocaleString();
    const fechaBadge = `<span class="badge badge-off">${fechaSesionTxt}</span>`;
    html += `<div><strong>Inicio de ejercicio:</strong> ${fechaBadge}</div>`;
    
    const fechaFinISO = global.window.sessionEndISO || null;
    if (fechaFinISO) {
      const finTxt = new Date(fechaFinISO).toLocaleString();
      const finBadge = `<span class="badge badge-off">${finTxt}</span>`;
      html += `<div><strong>Fin de ejercicio:</strong> ${finBadge}</div>`;
      
      // Duración
      try {
        const startDate = new Date(fechaInicioISO);
        const endDate = new Date(fechaFinISO);
        const ms = Math.max(0, endDate - startDate);
        const sec = Math.floor(ms / 1000);
        const mm = Math.floor(sec / 60);
        const ss = sec % 60;
        const durTxt = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
        const durBadge = `<span class="badge badge-info">${durTxt}</span>`;
        html += `<div><strong>Duración total:</strong> ${durBadge}</div>`;
      } catch(_) {}
    }
    
    // Estadísticas
    html += `<div><strong>Total palabras:</strong> ${total}</div>`;
    html += `<div><strong>Correctas:</strong> ${correctas}</div>`;
    html += `<div><strong>Incorrectas:</strong> ${incorrectas}</div>`;
    
    const config = global.window._exerciseConfigParticipant || {};
    
    html += `<div><strong>Porcentaje de acierto:</strong> ${porcentaje}%</div>`;
    
    // Letras a reforzar (siempre mostrar)
    const filtroLetras = config.filtroLetras || '';
    const filtroTxt = filtroLetras.trim() || '-';
    const filtroBadge = filtroTxt !== '-' 
      ? `<span class="badge badge-info">${filtroTxt}</span>` 
      : `<span class="badge badge-off">-</span>`;
    html += `<div><strong>Letras a reforzar:</strong> ${filtroBadge}</div>`;
    
    // Porcentaje de refuerzo (en modo grupal generalmente no aplica, mostrar 0% o -)
    const porcentajeRefuerzo = config.porcentajeRefuerzo;
    let prTxt = '0';
    if (porcentajeRefuerzo !== undefined && porcentajeRefuerzo !== null && porcentajeRefuerzo !== '') {
      const prN = parseInt(porcentajeRefuerzo, 10);
      prTxt = Number.isFinite(prN) ? Math.max(0, Math.min(100, prN)).toString() : '0';
    }
    html += `<div><strong>Porcentaje de refuerzo:</strong> ${prTxt}%</div>`;
    
    // Acentos obligatorios
    if (config.acentosObligatorios !== undefined) {
      const acentosTxt = config.acentosObligatorios ? 'Sí' : 'No';
      const badge = acentosTxt === 'Sí' ? `<span class="badge badge-ok">${acentosTxt}</span>` : `<span class="badge badge-off">${acentosTxt}</span>`;
      html += `<div><strong>Acentos obligatorios:</strong> ${badge}</div>`;
    }
    
    // Modo estricto
    if (config.strictMode !== undefined) {
      const strictTxt = config.strictMode ? 'Sí' : 'No';
      const badge = strictTxt === 'Sí' ? `<span class="badge badge-ok">${strictTxt}</span>` : `<span class="badge badge-off">${strictTxt}</span>`;
      html += `<div><strong>Modo estricto:</strong> ${badge}</div>`;
    }
    
    html += '</div>';
    
    // Lista completa con estado Correcta/Incorrecta (estilo individual)
    const normalize = (s) => {
      try {
        return (global.WordFilters && WordFilters.normalizarBasico)
          ? WordFilters.normalizarBasico(String(s ?? '').trim())
          : String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      } catch(_) { return String(s ?? '').trim().toLowerCase(); }
    };
    const esCorrecta = (val) => {
      if (val === true) return true;
      try {
        const norm = normalize(val);
        return norm === 'si' || norm === 'true' || norm === '1';
      } catch(_) { return false; }
    };

    html += '<h3 style="margin:10px 0 6px;">Palabras a reforzar</h3>';
    html += '<div style="font-size:14px;">';
    html += '<ul style="margin:6px 0 0 18px;">';
    const all = resultados;
    all.forEach((r, idx) => {
      // Recalcular correcto si falta o es dudoso
      try {
        const raw = String(r.correcto ?? '').trim();
        const known = (raw === true) || ['si','true','1'].includes(normalize(raw));
        if (!known) {
          const acentosObl = !!(global.window._exerciseConfigParticipant && global.window._exerciseConfigParticipant.acentosObligatorios);
          if (acentosObl) r.correcto = (String(r.respuesta||'').toLowerCase().trim() === String(r.palabra||'').toLowerCase().trim()) ? 'Sí' : 'No';
          else r.correcto = (normalize(r.respuesta) === normalize(r.palabra)) ? 'Sí' : 'No';
        }
      } catch(_) {}

      const ok = esCorrecta(r.correcto);
      const status = ok
        ? '<span class="badge badge-ok" style="margin-left:8px;">Correcta</span>'
        : '<span class="badge" style="margin-left:8px; background: var(--danger); color: #fff;">Incorrecta</span>';
      const colorWord = ok ? 'var(--success)' : 'var(--danger)';
      const defId = `def_${idx}`;
      const defBlock = `<div id="${defId}" style="font-size:12px; color: var(--muted); margin-top:4px;">Buscando significado...</div>`;
      html += `<li style="margin-bottom:8px;">
        <strong style="color:${colorWord};">${r.palabra}</strong> ${status} — escrito: "<em>${r.respuesta || ''}</em>"
        ${defBlock}
      </li>`;
    });
    html += '</ul></div>';

    // Buscar significados para todas las palabras (correctas e incorrectas)
    setTimeout(async () => {
      for (let i = 0; i < all.length; i++) {
        const r = all[i];
        const defElement = document.getElementById(`def_${i}`);
        if (defElement && typeof global.window.fetchSignificado === 'function') {
          try {
            const significado = await global.window.fetchSignificado(r.palabra);
            if (significado) {
              defElement.textContent = significado;
              defElement.style.color = 'var(--text)';
            } else {
              defElement.textContent = 'Significado no encontrado';
              defElement.style.color = 'var(--muted)';
            }
          } catch (e) {
            defElement.textContent = 'Error al buscar significado';
            defElement.style.color = 'var(--muted)';
          }
        }
      }
    }, 100);
    
    contentDiv.innerHTML = html;
    reportDiv.style.display = 'block';
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
