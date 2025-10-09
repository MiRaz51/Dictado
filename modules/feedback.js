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

  // Beep sencillo WebAudio (fallback)
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

  // Festive jingle (~4.5s) using WebAudio (no external assets)
  function __partyJingle() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext; if (!AudioCtx) return __beep(300, 1046, 0.25);
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.25;
      master.connect(ctx.destination);

      const now = ctx.currentTime;

      // Helper to create a tone with envelope
      const tone = (freq, t0, dur, type='sine', vol=0.8) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(master);
        o.start(t0); o.stop(t0 + dur + 0.05);
      };

      // Helper for noise burst (clap)
      const clap = (t0, dur=0.12, vol=0.4) => {
        const bufferSize = 2 * ctx.sampleRate * dur;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2 - 1) * Math.pow(1 - i/bufferSize, 2);
        const src = ctx.createBufferSource(); src.buffer = buffer;
        const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(g).connect(master); src.start(t0); src.stop(t0 + dur + 0.01);
      };

      // C major party phrase: arpeggio + second phrase + big end chord, with rhythmic claps
      const bpm = 120; const beat = 60 / bpm; // 0.5s per beat
      const t = now + 0.02;
      // Phrase 1 (beats 0 - 2)
      tone(261.63, t + 0*beat,   0.20, 'sine',     0.85); // C4
      tone(329.63, t + 0.5*beat, 0.20, 'sine',     0.85); // E4
      clap(t + 0.5*beat);
      tone(392.00, t + 1.0*beat, 0.20, 'sine',     0.85); // G4
      tone(523.25, t + 1.5*beat, 0.20, 'sine',     0.85); // C5
      clap(t + 1.5*beat);
      // Phrase 2 (beats 2 - 4)
      tone(659.25, t + 2.0*beat, 0.22, 'sine',     0.80); // E5
      tone(587.33, t + 2.5*beat, 0.22, 'sine',     0.80); // D5
      clap(t + 2.5*beat);
      tone(523.25, t + 3.0*beat, 0.22, 'sine',     0.80); // C5
      tone(392.00, t + 3.5*beat, 0.22, 'sine',     0.80); // G4
      clap(t + 3.5*beat);
      // End chord (beats 4 - 5.2)
      tone(261.63, t + 4.0*beat, 1.10, 'triangle', 0.70); // C4
      tone(329.63, t + 4.0*beat, 1.10, 'triangle', 0.70); // E4
      tone(392.00, t + 4.0*beat, 1.10, 'triangle', 0.70); // G4
      tone(523.25, t + 4.0*beat, 0.90, 'triangle', 0.65); // C5
      clap(t + 4.0*beat, 0.18, 0.55);

      // Auto close context later (~4.5s total)
      setTimeout(() => { try { ctx.close(); } catch(_) {} }, 4600);
    } catch(_) { __beep(300, 1046, 0.25); }
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
      // Sonido festivo (si está permitido)
      try {
        const enabled = (window.CONFIG?.FINAL_CELEBRATION_SOUND !== false);
        if (enabled && p >= 70) __partyJingle();
      } catch(_) { __beep(300, 1046, 0.25); }
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
