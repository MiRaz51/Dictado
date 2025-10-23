(function(global){
  'use strict';

  function celebrarAcierto(){
    try {
      if (typeof confetti === 'function') {
        // Obtener edad del usuario (modo individual o grupal)
        let edad = 0;
        try {
          const edadIndividual = document.getElementById('edad')?.value;
          const edadGrupal = global.window?.participantEdad;
          edad = parseInt(edadIndividual || edadGrupal || '0');
        } catch(_) {}
        
        // Obtener nivel actual del juego
        let nivel = '';
        try {
          const nivelIndividual = global.gameState?.currentLevel || global.currentNivel;
          const nivelGrupal = global.window?._exerciseConfigParticipant?.nivel;
          nivel = String(nivelIndividual || nivelGrupal || '').toLowerCase();
        } catch(_) {}
        
        // Calcular parámetros de confetti según edad (CANTIDADES AUMENTADAS)
        // Rango 1 (6-7 años): Máxima celebración
        // Rango 2 (8-9 años): Alta celebración
        // Rango 3 (10-11 años): Celebración moderada
        // Rango 4 (12+ años): Celebración sutil
        let particleCount = 120;
        let spread = 70;
        let bursts = 1; // Número de ráfagas de confetti
        
        if (edad >= 6 && edad < 8) {
          // Rango 1: Niños pequeños - ¡Máxima celebración! (AUMENTADO)
          particleCount = 300; // Era 200
          spread = 100;        // Era 90
          bursts = 4;          // Era 3
        } else if (edad >= 8 && edad < 10) {
          // Rango 2: Niños medianos - Alta celebración (AUMENTADO)
          particleCount = 220; // Era 150
          spread = 90;         // Era 80
          bursts = 3;          // Era 2
        } else if (edad >= 10 && edad < 12) {
          // Rango 3: Pre-adolescentes - Moderada (AUMENTADO)
          particleCount = 150; // Era 100
          spread = 80;         // Era 70
          bursts = 2;          // Era 1
        } else if (edad >= 12) {
          // Rango 4: Adolescentes - Sutil (MANTIENE ACTUAL)
          particleCount = 100; // Era 80
          spread = 70;         // Era 60
          bursts = 1;
        }
        
        // BONUS: Multiplicador de desafío si juega en nivel superior
        // Usar la misma lógica que time-credits.js para calcular el desafío
        let challengeBonus = 1.0;
        if (edad >= 6 && nivel) {
          // Calcular rango de edad
          let rango = 0;
          if (edad >= 6 && edad < 8) rango = 1;
          else if (edad >= 8 && edad < 10) rango = 2;
          else if (edad >= 10 && edad < 12) rango = 3;
          else if (edad >= 12) rango = 4;
          
          // Determinar nivel numérico
          let nivelNum = 1;
          if (nivel.includes('experto') || nivel === '4') nivelNum = 4;
          else if (nivel.includes('avanzado') || nivel === '3') nivelNum = 3;
          else if (nivel.includes('intermedio') || nivel === '2') nivelNum = 2;
          else nivelNum = 1; // básico
          
          // Aplicar bonus si está jugando por encima de su nivel esperado (AUMENTADO)
          // Rango 1 (6-7) jugando Intermedio/Avanzado/Experto = BONUS GRANDE
          // Rango 2 (8-9) jugando Avanzado/Experto = BONUS ALTO
          // Rango 3 (10-11) jugando Experto = BONUS MODERADO
          if (rango === 1 && nivelNum >= 2) {
            challengeBonus = nivelNum === 4 ? 2.2 : nivelNum === 3 ? 1.9 : 1.5; // Era 1.8, 1.6, 1.3
          } else if (rango === 2 && nivelNum >= 3) {
            challengeBonus = nivelNum === 4 ? 1.8 : 1.5; // Era 1.5, 1.3
          } else if (rango === 3 && nivelNum === 4) {
            challengeBonus = 1.5; // Era 1.3
          }
        }
        
        // Aplicar bonus de desafío
        particleCount = Math.floor(particleCount * challengeBonus);
        if (challengeBonus > 1.0) {
          // Si hay bonus, agregar ráfaga extra
          bursts = Math.min(bursts + 1, 5); // Máximo 5 ráfagas
        }
        
        // Lanzar ráfagas de confetti
        for (let i = 0; i < bursts; i++) {
          setTimeout(() => {
            confetti({ 
              particleCount: particleCount, 
              spread: spread, 
              origin: { y: 0.6 },
              colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
            });
          }, i * 150); // 150ms entre ráfagas
        }
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
      
      // CELEBRACIÓN ESPECIAL: Confetti abundante para TODAS las edades cuando logran racha de 5+
      if (racha >= 5 && typeof confetti === 'function') {
        // Configuración fija abundante para racha (sin importar edad)
        // Usar valores similares a niños pequeños para que sea muy festivo
        const particleCount = 250; // Abundante para todos
        const spread = 95;          // Amplia dispersión
        const bursts = 4;           // 4 ráfagas
        
        // Lanzar ráfagas de confetti
        for (let i = 0; i < bursts; i++) {
          setTimeout(() => {
            confetti({ 
              particleCount: particleCount, 
              spread: spread, 
              origin: { y: 0.6 },
              colors: ['#ff6b00', '#ffd700', '#ff0000', '#ff1493', '#00ff00', '#00bfff'], // Colores cálidos/festivos
              ticks: 200 // Duración más larga
            });
          }, i * 180); // 180ms entre ráfagas
        }
      }
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
