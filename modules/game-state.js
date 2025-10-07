(function(global){
  'use strict';

  class GameState {
    constructor() {
      this.reset();
    }

    reset() {
      this.words = [];
      this.currentIndex = 0;
      this.correctAnswers = 0;
      this.currentLevel = null;
      this.resultsLog = [];
      this.sessionStartISO = null;
      this.lastStartTime = 0;
    }

    getCurrentWord() {
      return this.words[this.currentIndex];
    }

    hasMoreWords() {
      return this.currentIndex < this.words.length;
    }

    nextWord() {
      this.currentIndex++;
    }

    addResult(word, userAnswer, isCorrect, timeMs) {
      this.resultsLog.push({
        fechaISO: new Date().toISOString(),
        nivel: this.currentLevel || '-',
        palabra: word,
        respuesta: userAnswer,
        correcto: isCorrect ? 'Sí' : 'No',
        tiempoMs
      });
    }

    getStats() {
      const total = this.words.length;
      const correct = this.correctAnswers;
      const incorrect = total - correct;
      const percentage = total ? Math.round((correct / total) * 100) : 0;
      return { total, correct, incorrect, percentage };
    }

    getErrors() {
      return this.resultsLog.filter(r => r.correcto === 'No');
    }
  }

  // Singleton global
  if (!global.gameState) {
    global.gameState = new GameState();
  }

  // Compat: sincronización entre variables legacy y GameState
  function syncGameState(direction = 'from') {
    const gs = global.gameState;
    // variables legacy podrían no existir aún; usar global
    if (direction === 'from') {
      global.palabras = gs.words;
      global.indice = gs.currentIndex;
      global.aciertos = gs.correctAnswers;
      global.currentNivel = gs.currentLevel;
      global.resultsLog = gs.resultsLog;
    } else {
      gs.words = global.palabras || [];
      gs.currentIndex = Number(global.indice) || 0;
      gs.correctAnswers = Number(global.aciertos) || 0;
      gs.currentLevel = global.currentNivel || null;
      gs.resultsLog = Array.isArray(global.resultsLog) ? global.resultsLog : [];
    }
  }

  global.syncGameState = syncGameState;
  global.GameState = GameState;
})(typeof window !== 'undefined' ? window : globalThis);
