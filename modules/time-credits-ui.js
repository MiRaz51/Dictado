(function(global){
  'use strict';

  // Get display name from multiple sources (input, participantName, alumnoCursoId)
  function getDisplayName(){
    try {
      // Prefer explicit input in individual mode
      const input = document.getElementById('alumno');
      const fromInput = (input && input.value) ? String(input.value).trim() : '';
      if (fromInput) return fromInput;

      // Participant mode variable
      const fromParticipant = (global.window && typeof global.window.participantName === 'string') ? global.window.participantName.trim() : '';
      if (fromParticipant) return fromParticipant;

      // Combined alumno|curso id (fallback). Avoid showing defaults like 'anon'.
      if (typeof global.getAlumnoCursoId === 'function') {
        const s = String(global.getAlumnoCursoId() || '').trim();
        if (s) {
          const ix = s.indexOf('|');
          const first = (ix >= 0) ? s.slice(0, ix) : s;
          if (!first || first === '-' || first.toLowerCase() === 'anon') return '';
          return first;
        }
      }
    } catch(_) {}
    return '';
  }

  function getUserShort(){
    const name = (getDisplayName() || '').trim();
    if (!name || name === '-') return '';
    try {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '';
      if (parts.length === 1) return parts[0].slice(0, 12);
      return (parts[0] + ' ' + parts[1]).slice(0, 18);
    } catch(_) { return name; }
  }

  // Refresh badge contents (minutes and user short). Define if not present.
  function _computeBalance(){
    try { return (global.TimeCredits && typeof global.TimeCredits.getBalance === 'function') ? (global.TimeCredits.getBalance() || { minutesAvailable: 0 }) : { minutesAvailable: 0 }; }
    catch(_) { return { minutesAvailable: 0 }; }
  }

  function refreshTimeCreditsBadge(){
    try {
      const btn = document.getElementById('tcBadgeBtn');
      if (!btn) return;
      const minsEl = document.getElementById('tcMins');
      const userEl = document.getElementById('tcUserShort');
      const userLbl = document.getElementById('tcUserLabel');
      const hint = document.getElementById('tcBalanceHint');
      const balanceDisplay = document.getElementById('tcBalanceDisplay');
      const bal = _computeBalance();
      if (minsEl) minsEl.textContent = String(bal.minutesAvailable|0);
      const nameShort = getUserShort();
      if (userEl) {
        userEl.textContent = nameShort;
        // Ajustar separador ' · ' cuando no hay nombre
        try {
          const prev = userEl.previousSibling;
          if (prev && prev.nodeType === 3) {
            prev.textContent = nameShort ? ' min · ' : ' min ';
          }
        } catch(_) {}
      }
      const nameFull = getDisplayName();
      if (userLbl) userLbl.textContent = nameFull;
      if (hint) hint.textContent = `Saldo disponible: ${bal.minutesAvailable|0} min`;
      if (balanceDisplay) balanceDisplay.textContent = String(bal.minutesAvailable|0);
    } catch(_) {}
  }

  // Expose globally if not defined elsewhere
  if (typeof global.refreshTimeCreditsBadge !== 'function') {
    global.refreshTimeCreditsBadge = refreshTimeCreditsBadge;
  }

  function updateBadgeVisibility(pageId){
    try {
      const tcBadge = document.getElementById('tcBadgeBtn');
      if (!tcBadge) return;
      const hidePages = (global.CONSTANTS && global.CONSTANTS.ROUTER && Array.isArray(global.CONSTANTS.ROUTER.HIDE_TC_BADGE_PAGES))
        ? global.CONSTANTS.ROUTER.HIDE_TC_BADGE_PAGES
        : ['page-mode-select','page-role-select','page-tutor-info','page-tutor-config','page-tutor'];
      const shouldHide = hidePages.includes(pageId);
      // Usar clase 'hidden' (tiene !important) para evitar conflictos
      if (shouldHide) {
        tcBadge.classList.add('hidden');
      } else {
        tcBadge.classList.remove('hidden');
      }
      // Fallback defensivo: también ajustar style.display por si hay estilos externos
      tcBadge.style.display = shouldHide ? 'none' : 'inline-flex';
    } catch(_) {}
  }

  // Subscribe to page changes if router available
  try {
    if (typeof global.onPageChange === 'function') {
      global.onPageChange(function(pageId){ updateBadgeVisibility(pageId); refreshTimeCreditsBadge(); });
    }
  } catch(_) {}

  // Initial run after DOM ready: find active page and update
  try {
    const run = () => {
      try {
        const active = document.querySelector('.page.active');
        const id = active ? active.id : null;
        if (id) updateBadgeVisibility(id);
        refreshTimeCreditsBadge();
      } catch(_) {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run();
    // Actualizar el badge en tiempo real cuando el usuario escribe su nombre en #alumno
    try {
      const onAlumnoInput = (e) => { try { if (e && e.target && e.target.id === 'alumno') refreshTimeCreditsBadge(); } catch(_) {} };
      document.addEventListener('input', onAlumnoInput, true);
      document.addEventListener('change', onAlumnoInput, true);
    } catch(_) {}
  } catch(_) {}

  // Periodic refresh eliminado tras actualizar en eventos de input/cambio y hooks explícitos

  // ===== Modal de Créditos de Tiempo =====
  function openTc(){
    try {
      const tcModal = document.getElementById('timeCreditsModal');
      if (!tcModal) return;
      tcModal.style.display = 'flex';
      refreshTimeCreditsBadge();
      const modalBody = tcModal.querySelector('.modal-body');
      if (modalBody) modalBody.scrollTop = 0;
      // Ajustar variable CSS de viewport visible para evitar que toolbars tapen acciones
      try {
        const updateVvVars = () => {
          const vv = global.visualViewport;
          const h = (vv && vv.height) ? vv.height : global.innerHeight;
          document.documentElement.style.setProperty('--vvh', `${Math.round(h)}px`);
          // Calcular obstrucción inferior (barra UI) relativa al layout viewport
          let bottomOb = 0;
          try {
            if (vv && typeof vv.offsetTop === 'number') {
              const innerH = global.innerHeight || h;
              bottomOb = Math.max(0, Math.round(innerH - (vv.height + vv.offsetTop))); // px
            }
          } catch(_) {}
          document.documentElement.style.setProperty('--vvb', `${bottomOb}px`);
        };
        updateVvVars();
        // Guardar handlers para limpiar luego
        if (!global.__tcVvHandlers) {
          global.__tcVvHandlers = {
            resize: () => { try { updateVvVars(); } catch(_){} },
            scroll: () => { try { updateVvVars(); } catch(_){} }
          };
        }
        if (global.visualViewport) {
          try { global.visualViewport.addEventListener('resize', global.__tcVvHandlers.resize); } catch(_) {}
          try { global.visualViewport.addEventListener('scroll', global.__tcVvHandlers.scroll); } catch(_) {}
        }
        // Fallback también en window
        try { global.addEventListener('resize', global.__tcVvHandlers.resize); } catch(_){}
      } catch(_) {}
    } catch(e) {}
  }

  function closeTc(){
    try {
      const tcModal = document.getElementById('timeCreditsModal');
      const tcError = document.getElementById('tcError');
      if (tcModal) tcModal.style.display = 'none';
      if (tcError) tcError.style.display = 'none';
      // Quitar listeners de VisualViewport y limpiar variable si es necesario
      try {
        if (global.__tcVvHandlers) {
          if (global.visualViewport) {
            try { global.visualViewport.removeEventListener('resize', global.__tcVvHandlers.resize); } catch(_) {}
            try { global.visualViewport.removeEventListener('scroll', global.__tcVvHandlers.scroll); } catch(_) {}
          }
          try { global.removeEventListener('resize', global.__tcVvHandlers.resize); } catch(_) {}
        }
      } catch(_) {}
    } catch(_) {}
  }

  function initTimeCreditsModal(){
    try {
      // Evitar doble enlace de listeners globales
      if (global.__tcBadgeDelegated) {
        // Solo volver a enlazar controles directos del modal (close/cancel/redeem)
      } else {
        document.addEventListener('click', (e) => {
          try {
            const target = e.target;
            if (target.id === 'tcBadgeBtn' || target.closest?.('#tcBadgeBtn')) {
              e.preventDefault();
              e.stopPropagation();
              openTc();
            }
          } catch(_) {}
        }, true);
        global.__tcBadgeDelegated = true;
      }
      const tcBtn = document.getElementById('tcBadgeBtn');
      const tcModal = document.getElementById('timeCreditsModal');
      const tcClose = tcModal ? tcModal.querySelector('.modal-close') : null;
      const tcCancel = document.getElementById('tcCancelBtn');
      const tcRedeem = document.getElementById('tcRedeemBtn');
      const tcMinutes = document.getElementById('tcMinutes');
      const tcPin = document.getElementById('tcPin');
      const tcError = document.getElementById('tcError');

      if (tcClose) tcClose.addEventListener('click', closeTc);
      if (tcCancel) tcCancel.addEventListener('click', closeTc);
      if (tcModal) tcModal.addEventListener('click', (e) => { try { if (e.target === tcModal) closeTc(); } catch(_) {} });

      // Listener para mantener el PIN visible cuando se enfoca (móvil con teclado)
      if (tcPin) {
        tcPin.addEventListener('focus', () => {
          try {
            // Pequeño delay para que el teclado se abra primero
            setTimeout(() => {
              try {
                const body = document.querySelector('#timeCreditsModal .modal-body');
                if (body && global.isMobile) {
                  const pinRect = tcPin.getBoundingClientRect();
                  const bodyRect = body.getBoundingClientRect();
                  // Centrar el PIN en el área visible del modal body
                  const offset = (pinRect.top - bodyRect.top) - (body.clientHeight/2 - pinRect.height/2);
                  body.scrollBy({ top: offset, behavior: 'smooth' });
                }
              } catch(_) {}
            }, 300);
          } catch(_) {}
        });
      }

      if (tcRedeem) tcRedeem.addEventListener('click', () => {
        try {
          if (typeof global.TimeCredits === 'undefined') return;
          const minutes = Math.max(0, parseInt((tcMinutes && tcMinutes.value) || '0', 10));
          const pin = (tcPin && tcPin.value) || '';
          const note = (document.getElementById('tcNote')?.value || '').trim();

          if (!pin || pin.trim() === '') {
            if (tcPin) {
              if (tcError) { tcError.textContent = 'Por favor ingrese el PIN de adulto'; tcError.style.display = 'block'; }
              // Enfocar y centrar el campo PIN en pantalla
              try { tcPin.focus(); tcPin.select && tcPin.select(); } catch(_) {}
              try { tcPin.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(_) {}
              try {
                const body = document.querySelector('#timeCreditsModal .modal-body');
                if (body) {
                  const pinRect = tcPin.getBoundingClientRect();
                  const bodyRect = body.getBoundingClientRect();
                  const offset = (pinRect.top - bodyRect.top) - (body.clientHeight/2 - pinRect.height/2);
                  body.scrollBy({ top: offset, behavior: 'smooth' });
                }
              } catch(_) {}
            }
            return;
          }

          const res = global.TimeCredits.redeem({ activity: 'parent_approved', minutes, pin, note });
          if (res && res.error) {
            if (tcError) { tcError.textContent = res.error; tcError.style.display = 'block'; }
            if (tcPin) {
              try { tcPin.focus(); tcPin.select && tcPin.select(); } catch(_) {}
              try { tcPin.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(_) {}
              try {
                const body = document.querySelector('#timeCreditsModal .modal-body');
                if (body) {
                  const pinRect = tcPin.getBoundingClientRect();
                  const bodyRect = body.getBoundingClientRect();
                  const offset = (pinRect.top - bodyRect.top) - (body.clientHeight/2 - pinRect.height/2);
                  body.scrollBy({ top: offset, behavior: 'smooth' });
                }
              } catch(_) {}
            }
            return;
          }
          if (tcError) tcError.style.display = 'none';
          refreshTimeCreditsBadge();
          try {
            if (global.peerManager && typeof global.peerManager.sendTimeCreditsBalance === 'function' && global.peerManager.role === 'participant') {
              global.peerManager.sendTimeCreditsBalance();
            }
          } catch(_) {}
          closeTc();
        } catch(_) {}
      });
    } catch(_) {}
  }

  // Init modal when DOM is ready
  try {
    const init = () => { try { initTimeCreditsModal(); } catch(_) {} };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
    // Reintentar cuando las plantillas se carguen dinámicamente
    try { document.addEventListener('templates:loaded', init); } catch(_) {}
  } catch(_) {}

})(typeof window !== 'undefined' ? window : globalThis);
