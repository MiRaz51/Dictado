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

  // Beep sencillo WebAudio
  function __beep(durationMs = 350, freq = 880, vol = 0.2) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(()=>{ try { osc.stop(); ctx.close(); } catch(_) {} }, durationMs);
    } catch(_) {}
  }

  function showFinalCongrats(percent, opts) {
    try {
      const p = Math.max(0, Math.min(100, Math.round(percent||0)));
      const title = (p >= 90) ? '¡Excelente trabajo! 🎉' : (p >= 70) ? '¡Muy bien! 🙌' : '¡Buen esfuerzo! 💪';
      const sub = (p >= 70) ? 'Sigue así, vas por buen camino.' : 'No te rindas, cada intento cuenta.';

      const overlay = document.createElement('div');
      overlay.className = 'final-congrats-overlay';
      overlay.innerHTML = `
        <div class="final-congrats-card">
          <div class="final-congrats-title">${title}</div>
          <div class="final-congrats-percent">${p}%</div>
          <div class="final-congrats-sub">${sub}</div>
          <div class="final-congrats-actions">
            <button class="btn-close" id="finalCongratsCloseBtn">Aceptar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = () => { try { overlay.remove(); } catch(_) { overlay.style.display='none'; } };
      overlay.addEventListener('click', (e)=>{ if (e.target === overlay) close(); });
      const btn = overlay.querySelector('#finalCongratsCloseBtn');
      if (btn) btn.addEventListener('click', close);

      // Efecto visual adicional
      try { if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 75 }); } catch(_) {}
      // Sonido simple (si está permitido)
      try { if (window.CONFIG?.FINAL_CELEBRATION_SOUND !== false) __beep(250, 1046, 0.25); } catch(_) {}
    } catch(_) {}
  }

  // Expose API
  const Feedback = { celebrarAcierto, animarError, mostrarRacha, showFinalCongrats };
  global.Feedback = global.Feedback || Feedback;

  // Stable aliases used across codebase
  global.celebrarAcierto = Feedback.celebrarAcierto;
  global.animarError = Feedback.animarError;
  global.mostrarRacha = Feedback.mostrarRacha;
  global.showFinalCongrats = Feedback.showFinalCongrats;
})(typeof window !== 'undefined' ? window : this);
