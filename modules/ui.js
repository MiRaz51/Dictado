(function(global){
  'use strict';

  const UI = {
    updateProgress(current, total){
      try {
        const fill = document.getElementById('progressFill');
        const text = document.getElementById('progressText');
        const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((current/total)*100))) : 0;
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = `${current}/${total}`;
      } catch(_) {}
    },

    setProgressTotal(total){
      try {
        const text = document.getElementById('progressText');
        if (text) text.textContent = `0/${total}`;
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.width = '0%';
      } catch(_) {}
    },

    clearGameUI(){
      try {
        const resultado = document.getElementById('resultado');
        const marcador = document.getElementById('marcador');
        const respuesta = document.getElementById('respuesta');
        if (resultado) { resultado.className=''; resultado.innerHTML=''; }
        if (marcador) { marcador.innerHTML=''; }
        if (respuesta) { respuesta.value=''; }
        const toReport = document.getElementById('btnToReport');
        if (toReport) toReport.style.display='none';
        const floatBtn = document.getElementById('btnToReportFloat');
        if (floatBtn) { try { floatBtn.remove(); } catch(_) { floatBtn.style.display = 'none'; } }
      } catch(_) {}
    },

    refreshMetaAlumnoCurso(forceVisible = null){
      try {
        const meta = document.getElementById('metaAlumnoCurso');
        if (!meta) return;
        const alumno = (document.getElementById('alumno')?.value || '').trim();
        const cursoEl = document.getElementById('curso');
        const curso = (cursoEl && cursoEl.value) ? String(cursoEl.value).trim() : '';
        const parts = [`Participante: ${alumno || '-'}`];
        if (curso) parts.push(`Curso/Grupo: ${curso}`);
        const currentNivel = global.currentNivel;
        if (currentNivel) {
          const levelNames = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', basico:'Básico', intermedio:'Intermedio', avanzado:'Avanzado', experto:'Experto' };
          parts.push(`Nivel: ${levelNames[currentNivel] || currentNivel}`);
        }
        const isReportPage = document.getElementById('page-report')?.classList.contains('active');
        const sessionStartISO = global.sessionStartISO;
        if (isReportPage && sessionStartISO) {
          try { parts.push(`Fecha: ${new Date(sessionStartISO).toLocaleString()}`); } catch(_) {}
        }
        meta.textContent = parts.join(' · ');
        const shouldShow = forceVisible !== null ? forceVisible : 
          (document.getElementById('page-game')?.classList.contains('active') || isReportPage);
        meta.style.display = shouldShow ? '' : 'none';
      } catch(_) {}
    },

    focusRespuesta(){
      try { const el = document.getElementById('respuesta'); if (el) { el.focus(); try { el.select(); } catch(_) {} } } catch(_) {}
    },

    showNextButton(){
      try {
        const juego = document.getElementById('juego');
        if (juego) { juego.style.display=''; juego.style.marginBottom='12px'; }
        let actions = juego ? juego.querySelector('.actions:last-of-type') : null;
        if (!actions) { actions = document.createElement('div'); actions.className='actions'; actions.style.marginTop='8px'; if (juego) juego.appendChild(actions); }
        let btn = document.getElementById('btnToReport');
        if (!btn) { btn = document.createElement('button'); btn.id='btnToReport'; btn.textContent='Siguiente ▸'; actions.appendChild(btn); }
        btn.style.display='inline-block';
        btn.onclick = () => { try { global.goToReportFromGame && global.goToReportFromGame(); } catch(_) {} };
        // Asegurar que no permanezca ningún botón flotante previo
        const floatBtn = document.getElementById('btnToReportFloat');
        if (floatBtn) { try { floatBtn.remove(); } catch(_) { floatBtn.style.display = 'none'; } }
      } catch(_) {}
    }
  };

  global.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
