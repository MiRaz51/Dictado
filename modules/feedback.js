(function(global){
  'use strict';

  function celebrarAcierto(){
    try {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 65, origin: { y: 0.6 } });
      }
    } catch(_) {}
  }

  function _shake(el){
    if (!el) return;
    try {
      el.classList.remove('shake-error');
      void el.offsetWidth; // reflow
      el.classList.add('shake-error');
      setTimeout(() => el.classList.remove('shake-error'), 500);
    } catch(_) {}
  }

  function animarError(){
    try {
      // Individual
      _shake(document.getElementById('respuesta'));
      _shake(document.getElementById('vkMirror'));
      // Participante
      _shake(document.getElementById('participantAnswer'));
      _shake(document.getElementById('vkMirrorParticipant'));
    } catch(_) {}
  }

  function mostrarRacha(racha){
    try {
      const el = document.createElement('div');
      el.className = 'racha-notification';
      el.textContent = `🔥 ¡${racha} seguidas!`;
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch(_) {} }, 3000);
    } catch(_) {}
  }

  // Expose API
  const Feedback = { celebrarAcierto, animarError, mostrarRacha };
  global.Feedback = global.Feedback || Feedback;

  // Stable aliases used across codebase
  global.celebrarAcierto = Feedback.celebrarAcierto;
  global.animarError = Feedback.animarError;
  global.mostrarRacha = Feedback.mostrarRacha;
})(typeof window !== 'undefined' ? window : this);
