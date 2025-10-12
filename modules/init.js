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
    // Pequeño toast visual cerca del botón
    function __showCopyToastNear(el, msg){
      try {
        const rect = el?.getBoundingClientRect?.();
        const tip = document.createElement('div');
        tip.className = 'toast-copy';
        tip.textContent = msg || 'Copiado';
        tip.style.position = 'fixed';
        tip.style.zIndex = '10001';
        tip.style.padding = '6px 10px';
        tip.style.borderRadius = '8px';
        tip.style.background = '#0ea5e9';
        tip.style.color = '#fff';
        tip.style.fontSize = '12px';
        tip.style.boxShadow = '0 6px 18px rgba(2,6,23,.15)';
        tip.style.opacity = '0';
        const top = rect ? (rect.top - 8) : 20;
        const left = rect ? (rect.right + 8) : 20;
        tip.style.top = `${Math.max(8, top)}px`;
        tip.style.left = `${Math.min(window.innerWidth - 80, left)}px`;
        document.body.appendChild(tip);
        requestAnimationFrame(() => { tip.style.transition = 'opacity .18s ease, transform .18s ease'; tip.style.opacity = '1'; tip.style.transform = 'translateY(-4px)'; });
        setTimeout(() => { try { tip.style.opacity = '0'; tip.style.transform = 'translateY(-2px)'; } catch(_) {} }, 900);
        setTimeout(() => { try { tip.remove(); } catch(_) {} }, 1200);
      } catch(_) {}
    }

    on('btnCopySessionId', 'click', async () => {
      const sidEl = document.getElementById('sessionId');
      const text = (sidEl?.textContent || '').trim();
      if (!text || text === '-') return;
      const setTip = (msg) => { try { const btn = document.getElementById('btnCopySessionId'); if (btn){ const prev = btn.title; btn.title = msg; __showCopyToastNear(btn, msg); setTimeout(()=>{ try { btn.title = prev || 'Copiar ID'; } catch(_) {} }, 1200);} } catch(_) {} };
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
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) { setTip('¡Copiado!'); return; }
      } catch(_) {}
      // Último recurso
      setTip('No se pudo copiar');
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

    // Time Credits UI: badge/modal open/close and redeem
    // Envolver en función para ejecutar después de que el DOM esté listo
    const initTimeCredits = () => {
      try {
        // Global badge refresher
        if (!window.refreshTimeCreditsBadge) {
          window.refreshTimeCreditsBadge = function refreshTimeCreditsBadge(){
            try {
              const minsEl = document.getElementById('tcMins');
              const hint = document.getElementById('tcBalanceHint');
              const balanceDisplay = document.getElementById('tcBalanceDisplay');
              const userLbl = document.getElementById('tcUserLabel');
              const userShort = document.getElementById('tcUserShort');
              // Actualiza etiqueta de usuario si existe
              try {
                const uid = (typeof window.getAlumnoCursoId === 'function') ? window.getAlumnoCursoId() : '-';
                const displayName = (function(){
                  try {
                    const s = String(uid || '-');
                    const ix = s.indexOf('|');
                    return (ix >= 0) ? s.slice(0, ix) : s;
                  } catch(_) { return String(uid || '-'); }
                })();
                if (userLbl) userLbl.textContent = displayName || '-';
                if (userShort) userShort.textContent = displayName || '-';
              } catch(_) {}
              if (typeof TimeCredits !== 'undefined') {
                const bal = TimeCredits.getBalance();
                const mins = bal.minutesAvailable || 0;
                if (minsEl) minsEl.textContent = String(mins);
                if (hint) hint.textContent = `Saldo disponible: ${mins} min`;
                if (balanceDisplay) balanceDisplay.textContent = String(mins);
              } else {
                if (minsEl) minsEl.textContent = '0';
                if (hint) hint.textContent = 'Saldo disponible: 0 min';
                if (balanceDisplay) balanceDisplay.textContent = '0';
              }
            } catch(_) {}
          };
        }

        const tcBtn = document.getElementById('tcBadgeBtn');
        const tcModal = document.getElementById('timeCreditsModal');
        const tcClose = tcModal ? tcModal.querySelector('.modal-close') : null;
        const tcCancel = document.getElementById('tcCancelBtn');
        const tcRedeem = document.getElementById('tcRedeemBtn');
        const tcMinutes = document.getElementById('tcMinutes');
        const tcPin = document.getElementById('tcPin');
        const tcError = document.getElementById('tcError');

        const openTc = () => { 
          try { 
            console.log('[TimeCredits] Abriendo modal...');
            if (tcModal){ 
              tcModal.style.display = 'flex'; 
              refreshTimeCreditsBadge(); 
              // Resetear scroll del modal al inicio para mostrar la tarjeta de información
              const modalBody = tcModal.querySelector('.modal-body');
              if (modalBody) modalBody.scrollTop = 0;
              // NO poner foco automático, dejar que el usuario vea la información primero
            } else {
              console.error('[TimeCredits] Modal no encontrado');
            }
          } catch(e) { console.error('[TimeCredits] Error abriendo modal:', e); } 
        };
        const closeTc = () => { try { if (tcModal) tcModal.style.display = 'none'; if (tcError) tcError.style.display = 'none'; } catch(_) {} };

        // Usar delegación de eventos en document para que funcione en todas las páginas
        document.addEventListener('click', (e) => {
          try {
            // Verificar si el click fue en el badge o en algún elemento hijo
            const target = e.target;
            const isBadge = target.id === 'tcBadgeBtn';
            const isInsideBadge = target.closest('#tcBadgeBtn');
            
            if (isBadge || isInsideBadge) {
              e.preventDefault();
              e.stopPropagation();
              console.log('[TimeCredits] Click en badge detectado', { target: target.id || target.className, isBadge, isInsideBadge });
              openTc();
            }
          } catch(err) {
            console.error('[TimeCredits] Error en listener de click:', err);
          }
        }, true); // useCapture=true para capturar en fase de captura
        
        console.log('[TimeCredits] Listener delegado conectado en document');
        
        // Verificar que el badge existe y es visible
        setTimeout(() => {
          const badge = document.getElementById('tcBadgeBtn');
          if (badge) {
            const styles = window.getComputedStyle(badge);
            console.log('[TimeCredits] Badge verificado:', {
              exists: true,
              display: styles.display,
              visibility: styles.visibility,
              zIndex: styles.zIndex,
              position: styles.position
            });
          } else {
            console.error('[TimeCredits] Badge NO encontrado en el DOM');
          }
        }, 500);
        if (tcClose) tcClose.addEventListener('click', closeTc);
        if (tcCancel) tcCancel.addEventListener('click', closeTc);
        if (tcModal) tcModal.addEventListener('click', (e) => { try { if (e.target === tcModal) closeTc(); } catch(_) {} });

        if (tcRedeem) tcRedeem.addEventListener('click', () => {
          try {
            if (typeof TimeCredits === 'undefined') return;
            const minutes = Math.max(0, parseInt((tcMinutes && tcMinutes.value) || '0', 10));
            const pin = (tcPin && tcPin.value) || '';
            const note = (document.getElementById('tcNote')?.value || '').trim();
            
            // Si no hay PIN, mover foco al campo PIN
            if (!pin || pin.trim() === '') {
              if (tcPin) {
                tcPin.focus();
                if (tcError) {
                  tcError.textContent = 'Por favor ingrese el PIN de adulto';
                  tcError.style.display = 'block';
                }
              }
              return;
            }
            
            const res = TimeCredits.redeem({ activity: 'parent_approved', minutes, pin, note });
            if (res && res.error) {
              if (tcError) { tcError.textContent = res.error; tcError.style.display = 'block'; }
              // Mover foco al PIN si hay error
              if (tcPin) tcPin.focus();
              return;
            }
            if (tcError) tcError.style.display = 'none';
            refreshTimeCreditsBadge();
            // Si estamos en modo participante, enviar saldo actualizado al tutor
            try {
              if (window.peerManager && typeof window.peerManager.sendTimeCreditsBalance === 'function' && window.peerManager.role === 'participant') {
                window.peerManager.sendTimeCreditsBalance();
              }
            } catch(_) {}
            closeTc();
          } catch(_) {}
        });

        // Initial badge refresh
        try { refreshTimeCreditsBadge(); } catch(_) {}
      } catch(_) {}
    };
    
    // Ejecutar initTimeCredits inmediatamente (el script ya se carga al final del body)
    try { initTimeCredits(); } catch(_) {}
    
    // Ocultar badge en la página inicial (page-mode-select)
    try {
      const tcBadge = document.getElementById('tcBadgeBtn');
      if (tcBadge) {
        // Verificar qué página está activa al cargar
        const activePage = document.querySelector('.page.active');
        if (activePage) {
          const pageId = activePage.id;
          const hideBadgePages = ['page-mode-select', 'page-role-select', 'page-tutor-info', 'page-tutor-config', 'page-tutor'];
          if (hideBadgePages.includes(pageId)) {
            tcBadge.style.display = 'none';
          }
        }
      }
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
