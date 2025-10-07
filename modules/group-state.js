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
    console.log('[GroupState] Modo configurado:', mode);
  }

  setRole(role) {
    this.currentRole = role;
    console.log('[GroupState] Rol configurado:', role);
  }

  // Gestión de participantes
  addParticipant(participantId, participantInfo = {}) {
    if (!this.participants.has(participantId)) {
      // Extraer el nombre directamente del objeto de información
      const participantName = participantInfo.participantName || participantInfo.name || `Participante ${this.participants.size + 1}`;
      
      this.participants.set(participantId, {
        id: participantId,
        name: participantName,
        connected: true,
        answers: [],
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        progress: 0,
        joinedAt: Date.now()
      });
      
      console.log('[GroupState] Participante agregado:', participantId, 'Nombre final:', participantName, 'Info recibida:', participantInfo);
      this.updateParticipantsUI();
    }
  }

  removeParticipant(participantId) {
    const participant = this.participants.get(participantId);
    if (participant) {
      this.participants.delete(participantId);
      console.log('[GroupState] Participante removido:', participant);
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
    
    console.log('[GroupState] Ejercicio iniciado con', words.length, 'palabras');
    
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
      console.log('[GroupState] Siguiente palabra:', this.currentWord);
      return this.currentWord;
    } else {
      this.finishExercise();
      return null;
    }
  }

  finishExercise() {
    this.exerciseActive = false;
    this.currentWord = null;
    console.log('[GroupState] Ejercicio finalizado');
    
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
    
    console.log('[GroupState] Respuesta registrada:', {
      participantId,
      word: this.currentWord,
      answer,
      isCorrect
    });

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

    console.log('[GroupState] Estadísticas finales:', stats);
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

    const participants = this.getAllParticipants();
    // Habilitar botones de reporte solo cuando el ejercicio ha terminado (no activo y con palabras cargadas)
    const canReport = (!this.exerciseActive && (this.exerciseWords.length > 0));
    
    console.log('[GroupState] Actualizando UI con participantes:', participants);
    
    // Actualizar contador
    if (participantCount) {
      participantCount.textContent = participants.length;
    }

    // Actualizar lista
    if (participants.length === 0) {
      participantsList.innerHTML = '<p class="no-participants">No hay participantes conectados</p>';
      if (startExerciseBtn) startExerciseBtn.disabled = true;
    } else {
      const participantsHTML = participants.map(p => {
        console.log('[GroupState] Renderizando participante:', p.name);
        const totalWords = this.exerciseWords.length || 0;
        const corr = Number(p.correctCount || 0);
        // Incorrectas reales (no incluye pendientes):
        const inc  = Number(p.incorrectCount || 0);
        // Progreso basado en respuestas únicas registradas
        const answeredUnique = Array.isArray(p.answers) ? p.answers.length : 0;
        const prog = totalWords > 0 ? Math.round((answeredUnique / totalWords) * 100) : 0;
        return `
          <div class="participant-item" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:6px 8px; border-bottom: 1px solid #eee;">
            <div class="participant-name" style="flex:1; min-width:140px; font-weight:500;">${p.name}</div>
            <div class="participant-stats" style="display:flex; align-items:center; gap:12px; flex: 0 0 auto;">
              <span class="participant-status" style="margin-right:8px; padding:4px 8px; border-radius:999px; background:#e8f5e9; color:#2e7d32; font-size:12px;">Conectado</span>
              <div title="Correctas" style="min-width:70px; text-align:center; background:#e8f7ee; color:#1b7f4a; border-radius:6px; padding:4px 8px; font-weight:600;">✓ ${corr}</div>
              <div title="Incorrectas" style="min-width:90px; text-align:center; background:#fdecea; color:#b23c17; border-radius:6px; padding:4px 8px; font-weight:600;">✗ ${inc}</div>
              <div class="participant-progress" title="Progreso" style="width:140px;">
                <div class="progress" style="height:8px; background:#eee; border-radius:6px; overflow:hidden;">
                  <div style="height:100%; width:${prog}%; background: linear-gradient(90deg, #4CAF50, #81C784);"></div>
                </div>
                <div style="font-size:11px; color:#666; text-align:right; margin-top:2px;">${prog}%</div>
              </div>
              <div class="participant-actions" style="display:flex; gap:6px; margin-left:8px;">
                <button class="btn-ghost" style="padding:4px 8px;" onclick="tutorGenerateParticipantPDF('${p.id}')" ${canReport ? '' : 'disabled title="Disponible al finalizar"'}>📄 PDF</button>
                <button class="btn-ghost" style="padding:4px 8px;" onclick="tutorManualPractice('${p.id}')" ${canReport ? '' : 'disabled title="Disponible al finalizar"'}>📝 Práctica</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      participantsList.innerHTML = participantsHTML;
      // Mantener botón de inicio deshabilitado durante el ejercicio o si ya se inició en esta sesión
      if (startExerciseBtn) {
        if (this.exerciseActive || this.exerciseStarted) {
          startExerciseBtn.disabled = true;
        } else {
          startExerciseBtn.disabled = (this.getParticipantCount() === 0);
        }
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
    
    console.log('[GroupState] Estado reseteado');
  }
}

// Instancia global del gestor de estado
window.groupState = new GroupStateManager();
