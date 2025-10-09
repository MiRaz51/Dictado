// Initialization and inline script extraction from index.html (moved to modules/init.js)
// 1) Render reusable config blocks when DOM is ready
(function(){
  function init(){
    try {
      if (window.renderConfigBlock) {
        const ci = document.getElementById('config-individual-block');
        if (ci) window.renderConfigBlock(ci, { mode: 'individual' });
        const ct = document.getElementById('config-tutor-block');
        if (ct) window.renderConfigBlock(ct, { mode: 'tutor' });
      }
    } catch(e) { console.warn('[Init] Error renderConfigBlock:', e); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }
})();

// 2) Virtual keyboard initializer (mobile/tablet)
(function(){
  function ready(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true }); else fn(); }
  ready(() => {
    try {
      if (window.DeviceDetector && typeof window.DeviceDetector.shouldUseVirtualKeyboard === 'function') {
        const needs = window.DeviceDetector.shouldUseVirtualKeyboard();
        if (needs && typeof window.initVirtualKeyboardIfNeeded === 'function') {
          window.initVirtualKeyboardIfNeeded();
        }
      }
    } catch(e){ console.warn('[Init] VK init error:', e); }
  });
})();

// 3) Basic DevTools prevention (optional)
(function(){
  try {
    const devToolsCheck = () => {
      const threshold = 160;
      const w = window.outerWidth - window.innerWidth > threshold;
      const h = window.outerHeight - window.innerHeight > threshold;
      if (w || h) {
        console.warn('[Init] DevTools detectado');
      }
    };
    setInterval(devToolsCheck, 1000);
  } catch (e) {
    console.warn('[Init] Protección DevTools no pudo inicializarse:', e);
  }
})();

// 4) Replace inline onclick/onkeydown handlers with event listeners
(function(){
  function on(id, event, handler){ try { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); } catch(_) {} }
  function onAll(selector, event, handler){ try { document.querySelectorAll(selector).forEach(el => el.addEventListener(event, handler)); } catch(_) {} }
  function ready(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }

  ready(() => {
    // Help button
    on('help-btn', 'click', () => { try { window.PageHints && window.PageHints.showCurrent && window.PageHints.showCurrent(); } catch(_) {} });

    // Mode selection
    on('modeIndividual', 'click', () => { try { window.selectMode && selectMode('individual'); } catch(_) {} });
    on('modeGroup', 'click', () => { try { window.selectMode && selectMode('group'); } catch(_) {} });

    // Role selection (two cards in page-role-select)
    try {
      const roleCards = document.querySelectorAll('#page-role-select .mode-grid .mode-card');
      if (roleCards[0]) roleCards[0].addEventListener('click', () => { try { window.selectRole && selectRole('tutor'); } catch(_) {} });
      if (roleCards[1]) roleCards[1].addEventListener('click', () => { try { window.selectRole && selectRole('participant'); } catch(_) {} });
    } catch(_) {}

    // Back from role-select to mode-select
    try {
      const backRole = document.querySelector('#page-role-select .actions .btn-ghost');
      if (backRole) backRole.addEventListener('click', () => { try { window.goToPage && goToPage('page-mode-select'); } catch(_) {} });
    } catch(_) {}

    // Config next and navigation
    on('btnNext', 'click', () => { try { window.goNextFromConfig && goNextFromConfig(); } catch(_) {} });
    on('btnVolverGame', 'click', () => { try { window.goToPage && goToPage('page-config'); } catch(_) {} });

    // Refresh data buttons by title
    onAll('button[title="Limpiar caché del JSON y recargar"]', 'click', () => { try { window.refrescarDatosRAE && refrescarDatosRAE(); } catch(_) {} });

    // Game buttons
    on('btnSpeak', 'click', () => { try { window.reproducirPalabra && reproducirPalabra(true); } catch(_) {} });
    on('btnEnableAudio', 'click', () => { try { window.unlockTTS && unlockTTS(); } catch(_) {} try { window.reproducirPalabra && reproducirPalabra(true); } catch(_) {} });
    on('btnComprobar', 'click', () => { try { window.comprobar && comprobar(); } catch(_) {} });
    on('btnToReport', 'click', () => { try { window.goToReportFromGame && goToReportFromGame(); } catch(_) {} });

    // Tutor info page
    try {
      const backTutorInfo = document.querySelector('#page-tutor-info .actions .btn-ghost');
      if (backTutorInfo) backTutorInfo.addEventListener('click', () => { try { window.goToPage && goToPage('page-role-select'); } catch(_) {} });
    } catch(_) {}
    on('btnTutorNext', 'click', () => { try { window.goToTutorConfig && goToTutorConfig(); } catch(_) {} });

    // Tutor config page
    try {
      const backTutorCfg = document.querySelector('#page-tutor-config .actions .btn-ghost');
      if (backTutorCfg) backTutorCfg.addEventListener('click', () => { try { window.goToPage && goToPage('page-tutor-info'); } catch(_) {} });
    } catch(_) {}
    on('tutorNivelBasico', 'click', () => { try { window.configurarEjercicioTutor && configurarEjercicioTutor('basico'); } catch(_) {} });
    on('tutorNivelIntermedio', 'click', () => { try { window.configurarEjercicioTutor && configurarEjercicioTutor('intermedio'); } catch(_) {} });
    on('tutorNivelAvanzado', 'click', () => { try { window.configurarEjercicioTutor && configurarEjercicioTutor('avanzado'); } catch(_) {} });
    on('tutorNivelExperto', 'click', () => { try { window.configurarEjercicioTutor && configurarEjercicioTutor('experto'); } catch(_) {} });

    // Tutor panel buttons
    try {
      const editCfg = document.querySelector('#tutorConfigSummary button.btn-ghost');
      if (editCfg) editCfg.addEventListener('click', () => { try { window.goToPage && goToPage('page-tutor-config'); } catch(_) {} });
    } catch(_) {}
    on('btnShowQR', 'click', () => { try { window.showSessionQR && showSessionQR(); } catch(_) {} });
    on('btnCopySessionId', 'click', async () => {
      const sidEl = document.getElementById('sessionId');
      const text = (sidEl?.textContent || '').trim();
      if (!text || text === '-') return;
      const setTip = (msg) => { try { const btn = document.getElementById('btnCopySessionId'); if (btn){ const prev = btn.title; btn.title = msg; setTimeout(()=>{ try { btn.title = prev || 'Copiar ID'; } catch(_) {} }, 1200);} } catch(_) {} };
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          setTip('¡Copiado!');
          return;
        }
      } catch(e) {
        // seguirá al fallback
      }
      // Fallback para contextos no seguros (http en LAN)
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        // Evitar scroll/resaltado visual
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) setTip('¡Copiado!'); else setTip('No se pudo copiar');
      } catch(e) {
        setTip('No se pudo copiar');
      }
    });
    on('startExercise', 'click', () => { try { window.startGroupExercise && startGroupExercise(); } catch(_) {} });
    on('tutorStopAll', 'click', () => { try { window.tutorToggleLockAll && tutorToggleLockAll(); } catch(_) {} });
    on('tutorPlayWord', 'click', () => { try { window.tutorPlayCurrentWord && tutorPlayCurrentWord(); } catch(_) {} });
    on('tutorNextWord', 'click', (e) => {
      try { console.log('[Init] tutorNextWord clicked'); } catch(_) {}
      try { e && e.preventDefault && e.preventDefault(); } catch(_) {}
      try { window.nextWordInExercise && nextWordInExercise(); } catch(err) { try { console.error('[Init] nextWordInExercise error:', err); } catch(_) {} }
    });
    on('tutorNewExercise', 'click', () => { try { window.tutorNewExercise && tutorNewExercise(); } catch(_) {} });
    on('tutorNewSession', 'click', () => { try { window.tutorNewSession && tutorNewSession(); } catch(_) {} });
    on('stopSession', 'click', () => { try { window.stopSession && stopSession(); } catch(_) {} });

    // Participant connection page
    on('connectToSession', 'click', () => { try { window.connectToSession && connectToSession(); } catch(_) {} });

    // Participant game: confirm answer button
    try {
      const confirmBtn = document.querySelector('#participantGame .participant-input button');
      if (confirmBtn) confirmBtn.addEventListener('click', () => { try { window.submitParticipantAnswer && submitParticipantAnswer(); } catch(_) {} });
    } catch(_) {}

    // Participant report actions
    try {
      const prActions = document.querySelectorAll('#participantReport .actions button');
      if (prActions[0]) prActions[0].addEventListener('click', () => { try { window.generarReportePDF && generarReportePDF(); } catch(_) {} });
      if (prActions[1]) prActions[1].addEventListener('click', () => { try { window.generarPracticaManual && generarPracticaManual(); } catch(_) {} });
    } catch(_) {}

    // Final report page actions
    try {
      const repActions = document.querySelectorAll('#page-report .actions button');
      if (repActions[0]) repActions[0].addEventListener('click', () => { try { window.goToPage && goToPage('page-config'); } catch(_) {} });
      if (repActions[1]) repActions[1].addEventListener('click', () => { try { window.irAlEjercicio && irAlEjercicio(); } catch(_) {} });
      if (repActions[2]) repActions[2].addEventListener('click', () => { try { window.generarReportePDF && generarReportePDF(); } catch(_) {} });
      if (repActions[3]) repActions[3].addEventListener('click', () => { try { window.generarPracticaManual && generarPracticaManual(); } catch(_) {} });
    } catch(_) {}

    // Tutor page: bottom back-to-config button
    try {
      const tutorBottomBack = document.querySelector('#page-tutor .actions .btn-ghost');
      if (tutorBottomBack) tutorBottomBack.addEventListener('click', () => { try { window.goToPage && goToPage('page-tutor-config'); } catch(_) {} });
    } catch(_) {}

    // Download modal controls
    on('openFileBtn', 'click', () => { try { window.openDownloadedFile && openDownloadedFile(); } catch(_) {} });
    try {
      const cancelDownload = document.querySelector('#downloadModal .modal-actions .btn-ghost');
      if (cancelDownload) cancelDownload.addEventListener('click', () => { try { window.closeDownloadModal && closeDownloadModal(); } catch(_) {} });
      const closeSpans = document.querySelectorAll('#downloadModal .modal-close');
      closeSpans.forEach(sp => sp.addEventListener('click', () => { try { window.closeDownloadModal && closeDownloadModal(); } catch(_) {} }));
    } catch(_) {}

    // QR modal controls
    try {
      const qrClose = document.querySelector('#qrModal .modal-close');
      if (qrClose) qrClose.addEventListener('click', () => { try { window.closeQRModal && closeQRModal(); } catch(_) {} });
      const qrPrimary = document.querySelector('#qrModal .btn-primary');
      if (qrPrimary) qrPrimary.addEventListener('click', () => { try { window.closeQRModal && closeQRModal(); } catch(_) {} });
    } catch(_) {}

    // Accessibility: config form input navigation and validation
    try {
      const alumno = document.getElementById('alumno');
      if (alumno) {
        alumno.addEventListener('input', () => { try { window.validateFields && validateFields(); } catch(_) {} });
        alumno.addEventListener('keydown', (event) => { try { window.handleEnterNavigation && handleEnterNavigation(event, 'btnNext'); } catch(_) {} });
      }
    } catch(_) {}

    // Accessibility: level buttons arrow navigation
    try {
      const bBasico = document.getElementById('btnNivelBasico');
      const bIntermedio = document.getElementById('btnNivelIntermedio');
      const bAvanzado = document.getElementById('btnNivelAvanzado');
      const bExperto = document.getElementById('btnNivelExperto');
      if (bBasico) bBasico.addEventListener('keydown', (e) => { try { window.handleArrowNavigation && handleArrowNavigation(e, 'btnNivelIntermedio', 'btnNivelExperto'); } catch(_) {} });
      if (bIntermedio) bIntermedio.addEventListener('keydown', (e) => { try { window.handleArrowNavigation && handleArrowNavigation(e, 'btnNivelAvanzado', 'btnNivelBasico'); } catch(_) {} });
      if (bAvanzado) bAvanzado.addEventListener('keydown', (e) => { try { window.handleArrowNavigation && handleArrowNavigation(e, 'btnNivelExperto', 'btnNivelIntermedio'); } catch(_) {} });
      if (bExperto) bExperto.addEventListener('keydown', (e) => { try { window.handleArrowNavigation && handleArrowNavigation(e, 'btnNivelBasico', 'btnNivelAvanzado'); } catch(_) {} });
    } catch(_) {}

    // Accessibility: tutor info step navigation on Enter
    try {
      const tutorName = document.getElementById('tutorName');
      const tutorGroup = document.getElementById('tutorGroup');
      if (tutorName) tutorName.addEventListener('keydown', (event) => {
        try { if (event && (event.key === 'Enter')) { event.preventDefault(); const el = document.getElementById('tutorGroup'); if (el) el.focus(); } } catch(_) {}
      });
      if (tutorGroup) tutorGroup.addEventListener('keydown', (event) => {
        try { if (event && (event.key === 'Enter')) { event.preventDefault(); const el = document.getElementById('btnTutorNext'); if (el) el.focus(); } } catch(_) {}
      });
    } catch(_) {}

    // Accessibility: participant answer key handler
    try {
      const pAns = document.getElementById('participantAnswer');
      if (pAns) pAns.addEventListener('keydown', (event) => { try { window.handleParticipantEnter && handleParticipantEnter(event); } catch(_) {} });
    } catch(_) {}
  });
})();
