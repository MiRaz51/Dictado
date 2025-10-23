// ============================================================================
// GROUP STATE MANAGER - Gestión del estado grupal
// ============================================================================

class GroupStateManager {
  constructor() {
    this.currentMode = 'individual'; // 'individual' | 'group'
    this.currentRole = null; // 'tutor' | 'participant'
    this.sessionActive = false;
    this.exerciseActive = false;
    this.exerciseStarted = false; // permanece true tras iniciar, hasta reset()
    this.participants = new Map(); // Map<participantId, participantInfo>
    this.currentWord = null;
    this.currentWordIndex = 0;
    this.exerciseWords = [];
    this.participantAnswers = new Map(); // Map<participantId, answer>
    this.exerciseResults = new Map(); // Map<participantId, results[]>
  }

  // Configurar modo y rol
  setMode(mode) {
    this.currentMode = mode;
  }

  setRole(role) {
    this.currentRole = role;
  }

  // Gestión de participantes
  addParticipant(participantId, participantInfo = {}) {
    if (!this.participants.has(participantId)) {
      // Extraer el nombre directamente del objeto de información
      const participantName = participantInfo.participantName || participantInfo.name || `Participante ${this.participants.size + 1}`;
      const edad = participantInfo.participantEdad || participantInfo.edad || 0;
      
      this.participants.set(participantId, {
        id: participantId,
        name: participantName,
        edad: edad,
        connected: true,
        answers: [],
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        progress: 0,
        joinedAt: Date.now()
      });
      
      this.updateParticipantsUI();
    }
  }

  removeParticipant(participantId) {
    const participant = this.participants.get(participantId);
    if (participant) {
      this.participants.delete(participantId);
      this.updateParticipantsUI();
    }
  }

  getParticipant(participantId) {
    return this.participants.get(participantId);
  }

  getAllParticipants() {
    return Array.from(this.participants.values());
  }

  getParticipantCount() {
    return this.participants.size;
  }

  // Gestión del ejercicio
  startExercise(words) {
    this.exerciseWords = [...words];
    this.currentWordIndex = 0;
    this.currentWord = this.exerciseWords[0];
    this.exerciseActive = true;
    this.exerciseStarted = true;
    this.participantAnswers.clear();
    
    // Limpiar resultados previos
    this.participants.forEach((participant, id) => {
      participant.answers = [];
      participant.score = 0;
      participant.correctCount = 0;
      participant.incorrectCount = 0;
      participant.progress = 0;
    });
    
    // Refrescar UI con contadores reseteados
    this.updateParticipantsUI();
    
    return this.currentWord;
  }

  nextWord() {
    if (this.currentWordIndex < this.exerciseWords.length - 1) {
      this.currentWordIndex++;
      this.currentWord = this.exerciseWords[this.currentWordIndex];
      this.participantAnswers.clear();
      return this.currentWord;
    } else {
      this.finishExercise();
      return null;
    }
  }

  finishExercise() {
    this.exerciseActive = false;
    this.currentWord = null;
    
    // Calcular estadísticas finales
    this.calculateFinalStats();
    // Refrescar UI para habilitar acciones de reporte
    try { this.updateParticipantsUI(); } catch(_) {}
  }

  // Gestión de respuestas
  submitParticipantAnswer(participantId, answer) {
    if (!this.exerciseActive || !this.currentWord) {
      console.warn('[GroupState] No hay ejercicio activo');
      return false;
    }

    const participant = this.participants.get(participantId);
    if (!participant) {
      console.warn('[GroupState] Participante no encontrado:', participantId);
      return false;
    }

    // Validar respuesta
    const isCorrect = this.validateAnswer(answer, this.currentWord);
    
    // Registrar respuesta (registro nuevo o actualización)
    const answerRecord = {
      word: this.currentWord,
      answer: answer.trim(),
      isCorrect,
      timestamp: new Date().toISOString(),
      wordIndex: this.currentWordIndex
    };

    // Ver si ya había respondido esta palabra
    let isNew = true;
    const prevIdx = participant.answers.findIndex(a => a.wordIndex === this.currentWordIndex);
    if (prevIdx >= 0) {
      // Actualizar respuesta existente: ajustar contadores si cambia la corrección
      isNew = false;
      const prev = participant.answers[prevIdx];
      if (prev.isCorrect && !isCorrect) {
        participant.correctCount = Math.max(0, (participant.correctCount || 0) - 1);
        participant.incorrectCount = (participant.incorrectCount || 0) + 1;
      } else if (!prev.isCorrect && isCorrect) {
        participant.incorrectCount = Math.max(0, (participant.incorrectCount || 0) - 1);
        participant.correctCount = (participant.correctCount || 0) + 1;
        participant.score++;
      }
      participant.answers[prevIdx] = answerRecord;
    } else {
      // Primera vez que responde esta palabra
      participant.answers.push(answerRecord);
      if (isCorrect) {
        participant.score++;
        participant.correctCount = (participant.correctCount || 0) + 1;
      } else {
        participant.incorrectCount = (participant.incorrectCount || 0) + 1;
      }
    }

    this.participantAnswers.set(participantId, answerRecord);

    // Actualizar progreso individual (por cantidad de palabras respondidas únicas)
    try {
      const total = this.exerciseWords.length || 0;
      const current = participant.answers.length || 0;
      participant.progress = total > 0 ? Math.round((current / total) * 100) : 0;
    } catch(_) {}

    // Refrescar la lista en el panel del tutor
    this.updateParticipantsUI();

    return { isCorrect, isNew };
  }

  validateAnswer(userAnswer, correctWord) {
    try {
      // Reglas de acentos por nivel (igual que modo individual)
      const map = { basico:1, intermedio:2, avanzado:3, experto:4, facil:1, medio:2, dificil:3 };
      const nivelNum = map[(window.tutorConfig && window.tutorConfig.nivel) || ''] || 1;
      let acentosObligatorios;
      if (nivelNum === 1) acentosObligatorios = false; // Básico: desactivado
      else if (nivelNum === 4) acentosObligatorios = true; // Experto: activado
      else acentosObligatorios = !!(window.tutorConfig && window.tutorConfig.acentosObligatorios);

      const ua = String(userAnswer || '').trim();
      const cw = String(correctWord || '').trim();
      if (acentosObligatorios) {
        // Comparación estricta (ignorando mayúsculas/minúsculas)
        return ua.toLowerCase() === cw.toLowerCase();
      }
      // Comparación por normalización básica (ignora tildes)
      const norm = (s) => {
        try { return (window.WordFilters && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(String(s||'')) : String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
        catch(_) { return String(s||'').toLowerCase(); }
      };
      return norm(ua) === norm(cw);
    } catch(_) {
      // Fallback simple
      const user = String(userAnswer || '').trim().toLowerCase();
      const correct = String(correctWord || '').trim().toLowerCase();
      return user === correct;
    }
  }

  // Obtener respuestas de la palabra actual
  getCurrentWordAnswers() {
    return Array.from(this.participantAnswers.entries()).map(([participantId, answer]) => {
      const participant = this.participants.get(participantId);
      return {
        participantId,
        participantName: participant?.name || participantId,
        ...answer
      };
    });
  }

  // Verificar si todos los participantes han respondido
  allParticipantsAnswered() {
    return this.participantAnswers.size >= this.participants.size;
  }

  // Calcular estadísticas finales
  calculateFinalStats() {
    const stats = {
      totalWords: this.exerciseWords.length,
      totalParticipants: this.participants.size,
      participantStats: []
    };

    this.participants.forEach((participant, id) => {
      const totalAnswers = participant.answers.length;
      const correctAnswers = participant.answers.filter(a => a.isCorrect).length;
      const percentage = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      stats.participantStats.push({
        id,
        name: participant.name,
        totalAnswers,
        correctAnswers,
        percentage,
        answers: participant.answers
      });
    });

    return stats;
  }

  // Actualizar UI de participantes
  updateParticipantsUI() {
    const participantsList = document.getElementById('participantsList');
    const participantCount = document.getElementById('participantCount');
    const startExerciseBtn = document.getElementById('startExercise');
    const respHint = document.getElementById('tutorResponses');
    const btnPlay = document.getElementById('tutorPlayWord');
    const btnNext = document.getElementById('tutorNextWord');
    const btnStopSession = document.getElementById('stopSession');

    if (!participantsList) return;

    // Ordenar alfabéticamente por nombre (sensible a español, case-insensitive)
    const participants = this.getAllParticipants().sort((a, b) => {
      try { return String(a.name||'').localeCompare(String(b.name||''), 'es', { sensitivity: 'base' }); }
      catch(_) { return String(a.name||'').toLowerCase() < String(b.name||'').toLowerCase() ? -1 : 1; }
    });
    // Habilitar botones de reporte solo cuando el ejercicio ha terminado (no activo y con palabras cargadas)
    const canReport = (!this.exerciseActive && (this.exerciseWords.length > 0));
    
    // Actualizar contador
    if (participantCount) {
      participantCount.textContent = participants.length;
    }

    // Actualizar lista
    if (participants.length === 0) {
      participantsList.innerHTML = '<p class="no-participants">No hay participantes conectados</p>';
      if (startExerciseBtn) startExerciseBtn.disabled = true;
    } else {
      // Render con template para evitar HTML inline en JS
      const tpl = document.getElementById('tplParticipantItem');
      const frag = document.createDocumentFragment();
      participants.forEach(p => {
        try {
          const totalWords = this.exerciseWords.length || 0;
          const corr = Number(p.correctCount || 0);
          const inc  = Number(p.incorrectCount || 0);
          const answeredUnique = Array.isArray(p.answers) ? p.answers.length : 0;
          const prog = totalWords > 0 ? Math.round((answeredUnique / totalWords) * 100) : 0;

          let node;
          if (tpl && tpl.content) {
            node = tpl.content.firstElementChild.cloneNode(true);
          } else {
            // Fallback mínimo si el template no existe
            node = document.createElement('div');
            node.className = 'participant-item pi-item';
            node.innerHTML = `<div class="participant-name pi-name"></div>
              <div class="participant-stats pi-stats">
                <span class="participant-status pi-badge">Conectado</span>
                <div class="pi-corr" title="Correctas">✓ <span class="v-corr">0</span></div>
                <div class="pi-inc" title="Incorrectas">✗ <span class="v-inc">0</span></div>
                <div class="pi-tc" title="Créditos de tiempo">⏱ <span class="v-tc">0</span> min</div>
                <div class="participant-progress pi-prog" title="Progreso %"><span class="v-prog">0</span>%</div>
                <div class="participant-actions pi-actions">
                  <button class="btn-ghost btn-pdf">📄 PDF</button>
                  <button class="btn-ghost btn-practica">📝 Práctica</button>
                </div>
              </div>`;
          }

          node.querySelector('.pi-name').textContent = p.name;
          const vc = node.querySelector('.v-corr'); if (vc) vc.textContent = corr;
          const vi = node.querySelector('.v-inc');  if (vi) vi.textContent = inc;
          const vp = node.querySelector('.v-prog'); if (vp) vp.textContent = prog;
          const progBox = node.querySelector('.pi-prog'); if (progBox) progBox.title = `Progreso ${prog}%`;
          // Asignar créditos de tiempo
          (function(){
            const tcSpan = node.querySelector('.v-tc');
            const mins = Number(p.timeCredits || 0);
            if (tcSpan) {
              tcSpan.textContent = mins;
            } else {
              try {
                const stats = node.querySelector('.pi-stats') || node;
                const el = document.createElement('div');
                el.className = 'pi-tc';
                el.title = 'Créditos de tiempo';
                el.innerHTML = `⏱ <span class="v-tc">${mins}</span> min`;
                stats.insertBefore(el, stats.querySelector('.pi-prog'));
              } catch(_) {}
            }
          })();

          // Bind botones
          const btnPdf = node.querySelector('.btn-pdf');
          if (btnPdf) {
            btnPdf.onclick = () => tutorGenerateParticipantPDF(p.id);
            if (!canReport) { btnPdf.disabled = true; btnPdf.title = 'Disponible al finalizar'; }
          }
          const btnPr = node.querySelector('.btn-practica');
          if (btnPr) {
            btnPr.onclick = () => tutorManualPractice(p.id);
            if (!canReport) { btnPr.disabled = true; btnPr.title = 'Disponible al finalizar'; }
          }

          // Mobile: tap row to open detail modal (do not trigger when clicking action buttons)
          try {
            if (window.isMobile) {
              node.addEventListener('click', (ev) => {
                if (ev.target.closest('.pi-actions')) return; // ignore clicks on buttons area
                openParticipantDetailModal(p, { canReport, prog });
              });
              node.style.cursor = 'pointer';
            }
          } catch(_) {}

          frag.appendChild(node);
        } catch(e) { console.warn('Render participante falló:', e); }
      });

      participantsList.innerHTML = '';
      participantsList.appendChild(frag);
      // Ajuste de altura del contenedor: que crezca con el contenido hasta 10 items;
      // si hay más de 10, activar scroll con altura calculada para 10 items.
      try {
        const count = participants.length;
        const items = participantsList.querySelectorAll('.participant-item');
        const firstItem = items && items[0];
        let itemH = 68; // fallback razonable
        try { if (firstItem) itemH = Math.max(48, Math.ceil(firstItem.getBoundingClientRect().height)); } catch(_) {}
        const visibleCount = Math.min(10, Math.max(1, count));
        const padding = 12; // margen interno del contenedor
        if (count > 10) {
          participantsList.style.overflowY = 'auto';
          participantsList.style.maxHeight = `${(itemH * 10) + padding}px`;
        } else {
          // Crecer con contenido: sin límite y sin scroll
          participantsList.style.overflowY = 'visible';
          participantsList.style.maxHeight = 'none';
        }
      } catch(_) {}
      // Regla: el botón 'Iniciar Ejercicio' debe estar activo cuando haya al menos 1 participante y no haya ejercicio activo
      if (startExerciseBtn) {
        const hasParticipants = this.getParticipantCount() > 0;
        startExerciseBtn.disabled = (this.exerciseActive || !hasParticipants);
      }
    }

    // Actualizar contador de respuestas y estado de botones del tutor
    try {
      const total = this.getParticipantCount();
      const answered = this.participantAnswers.size;
      const isLastWord = (this.exerciseWords.length > 0) && (this.currentWordIndex >= this.exerciseWords.length - 1);
      if (respHint) {
        respHint.textContent = `Resp: ${answered}/${total}`;
        if (answered >= total && total > 0) {
          // Estilo de éxito (verde suave)
          respHint.style.color = '#065f46';
          respHint.style.background = '#d1fae5';
          respHint.style.padding = '2px 6px';
          respHint.style.borderRadius = '999px';
          respHint.title = 'Todos han respondido';
        } else {
          // Resetear estilo
          respHint.style.color = '';
          respHint.style.background = '';
          respHint.style.padding = '';
          respHint.style.borderRadius = '';
          respHint.title = '';
        }
      }
      // Regla solicitada: mientras no respondan todos, Reproducir habilitado; cuando respondan todos, bloquearlo
      if (btnPlay) btnPlay.disabled = (answered >= total && total > 0);
      // El botón Siguiente se habilita cuando todos respondan
      if (btnNext) btnNext.disabled = !(answered >= total && total > 0);
      // Si es la última palabra y todos han respondido, deshabilitar 'Terminar Sesión' (solo 'Siguiente' activo)
      if (btnStopSession) {
        if (this.exerciseActive && isLastWord && answered >= total && total > 0) {
          btnStopSession.disabled = true;
        }
      }
    } catch(_) {}
  }

  // Obtener estado actual
  getState() {
    return {
      mode: this.currentMode,
      role: this.currentRole,
      sessionActive: this.sessionActive,
      exerciseActive: this.exerciseActive,
      participantCount: this.getParticipantCount(),
      currentWord: this.currentWord,
      currentWordIndex: this.currentWordIndex,
      totalWords: this.exerciseWords.length,
      participants: this.getAllParticipants()
    };
  }

  // Resetear estado
  reset() {
    this.sessionActive = false;
    this.exerciseActive = false;
    this.exerciseStarted = false;
    this.participants.clear();
    this.currentWord = null;
    this.currentWordIndex = 0;
    this.exerciseWords = [];
    this.participantAnswers.clear();
    this.exerciseResults.clear();
  }
}

// Instancia global del gestor de estado
// ===== Helper: Mobile detail modal for participant =====
function openParticipantDetailModal(p, opts){
  try {
    const canReport = !!(opts && opts.canReport);
    const prog = Number((opts && opts.prog) || 0);
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>👤 ${p.name}</h3>
          <span class="modal-close" aria-label="Cerrar">&times;</span>
        </div>
        <div class="modal-body">
          <p><strong>Correctas:</strong> ${Number(p.correctCount||0)} &nbsp; | &nbsp; <strong>Incorrectas:</strong> ${Number(p.incorrectCount||0)}</p>
          <p><strong>Progreso:</strong> ${prog}%</p>
          <p><strong>Créditos de tiempo:</strong> ${Number(p.timeCredits||0)} min</p>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost btn-pdf">📄 PDF</button>
          <button class="btn-ghost btn-practica">📝 Práctica</button>
          <button class="btn-primary btn-close">Cerrar</button>
        </div>
      </div>`;
    // Close helpers
    const close = () => { try { modal.remove(); } catch(_) {} };
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('.modal-close').addEventListener('click', close);
    modal.querySelector('.btn-close').addEventListener('click', close);
    // Wire actions
    const pdf = modal.querySelector('.btn-pdf');
    if (pdf) { pdf.onclick = () => tutorGenerateParticipantPDF(p.id); if (!canReport) { pdf.disabled = true; pdf.title = 'Disponible al finalizar'; } }
    const pr = modal.querySelector('.btn-practica');
    if (pr) { pr.onclick = () => tutorManualPractice(p.id); if (!canReport) { pr.disabled = true; pr.title = 'Disponible al finalizar'; } }
    document.body.appendChild(modal);
  } catch(e) { console.warn('Modal participante falló:', e); }
}

window.groupState = new GroupStateManager();
