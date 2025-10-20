/**
 * Módulo unificado de reproducción de audio
 * Usado por: modo individual, tutor y participante
 * Solución optimizada para móviles que mantiene el contexto del gesto del usuario
 */

(function(global) {
  'use strict';

  /**
   * Reproduce una palabra usando TTS
   * @param {string} word - Palabra a reproducir
   * @param {Object} options - Opciones de reproducción
   * @param {number} options.rate - Velocidad (default: 0.9)
   * @param {number} options.volume - Volumen (default: 1.0)
   * @param {Function} options.onstart - Callback al iniciar
   * @param {Function} options.onend - Callback al finalizar
   * @param {Function} options.onerror - Callback en error
   * @returns {void}
   */
  function playWord(word, options = {}) {
    if (!word || typeof word !== 'string') {
      console.warn('[AudioPlayer] Palabra inválida:', word);
      return;
    }

    try {
      // Cancelar cualquier audio previo
      speechSynthesis.cancel();
      
      // Crear utterance
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'es-ES';
      utterance.rate = options.rate || 0.9;
      utterance.volume = options.volume || 1.0;
      utterance.pitch = options.pitch || 1.0;
      
      // Seleccionar voz española usando la estrategia correcta
      // Prioridad: 1) selectedVoice global, 2) VoiceStrategy, 3) elegirVozEspanol, 4) fallback
      let spanishVoice = null;
      
      // Intentar usar la voz ya seleccionada globalmente
      if (global.selectedVoice) {
        spanishVoice = global.selectedVoice;
      } 
      // Si no, usar VoiceStrategy para Chrome (prioriza "Google español")
      else if (global.VoiceStrategy && typeof global.VoiceStrategy.pickVoice === 'function') {
        const voices = speechSynthesis.getVoices();
        spanishVoice = global.VoiceStrategy.pickVoice(voices);
      }
      // Si no, usar elegirVozEspanol de tts.js
      else if (global.elegirVozEspanol && typeof global.elegirVozEspanol === 'function') {
        spanishVoice = global.elegirVozEspanol();
      }
      // Fallback: buscar cualquier voz es-ES
      else {
        const voices = speechSynthesis.getVoices();
        spanishVoice = voices.find(v => v.lang.startsWith('es-ES')) || 
                      voices.find(v => v.lang.startsWith('es'));
      }
      
      if (spanishVoice) {
        utterance.voice = spanishVoice;
        console.log('[AudioPlayer] Usando voz:', spanishVoice.name, '-', spanishVoice.lang);
      } else {
        console.warn('[AudioPlayer] No se encontró voz española, usando voz por defecto');
      }
      
      // Eventos
      if (options.onstart) {
        utterance.onstart = options.onstart;
      }
      
      if (options.onend) {
        utterance.onend = options.onend;
      }
      
      if (options.onerror) {
        utterance.onerror = options.onerror;
      }
      
      // Reproducir inmediatamente (mantiene contexto del gesto en móviles)
      speechSynthesis.speak(utterance);
      
    } catch(err) {
      console.error('[AudioPlayer] Error reproduciendo:', err);
      if (options.onerror) {
        options.onerror(err);
      }
    }
  }

  /**
   * Reproduce una palabra con auto-reproducción en móviles
   * Si el navegador bloquea la reproducción, configura listeners para reproducir
   * en el próximo gesto del usuario (toque, click, focus)
   * 
   * @param {string} word - Palabra a reproducir
   * @param {Object} options - Opciones de reproducción
   * @returns {void}
   */
  function playWordWithAutoRetry(word, options = {}) {
    if (!word) return;
    
    // Guardar palabra pendiente
    global._pendingWordToPlay = word;
    global._wordPlayAttempts = 0;
    
    // Función interna de reproducción
    const play = (w) => {
      playWord(w, {
        ...options,
        onstart: () => {
          // Limpiar palabra pendiente cuando se reproduce exitosamente
          global._pendingWordToPlay = null;
          if (options.onstart) options.onstart();
        }
      });
    };
    
    // Intentar reproducir inmediatamente
    play(word);
    
    // Si estamos en móvil, configurar auto-retry en el próximo gesto
    const isMobile = global.DeviceUtils ? global.DeviceUtils.isMobile : (global.isMobile || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    if (isMobile) {
      // Función que se ejecuta en el próximo gesto del usuario
      const autoPlayOnGesture = () => {
        const pendingWord = global._pendingWordToPlay;
        if (pendingWord && global._wordPlayAttempts < 3) {
          global._wordPlayAttempts++;
          play(pendingWord);
        }
      };
      
      // Remover listeners anteriores si existen
      if (global._autoPlayListener) {
        document.removeEventListener('touchstart', global._autoPlayListener);
        document.removeEventListener('click', global._autoPlayListener);
        document.removeEventListener('focus', global._autoPlayListener, true);
      }
      
      // Agregar nuevos listeners (se ejecutan solo una vez)
      global._autoPlayListener = autoPlayOnGesture;
      document.addEventListener('touchstart', autoPlayOnGesture, { once: true, passive: true });
      document.addEventListener('click', autoPlayOnGesture, { once: true });
    }
  }

  // Exportar funciones globales
  global.playWord = playWord;
  global.playWordWithAutoRetry = playWordWithAutoRetry;

})(window);
