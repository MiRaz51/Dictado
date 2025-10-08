(function(global){
  'use strict';
  /**
   * Module: vk-helpers.js
   * Responsibility: Unified helpers for virtual keyboard mirror and init.
   * Exports: window.VK { ensure, attachMirror, show, hide, clear }
   * Depends on: window.virtualKeyboardManager (if present)
   * Load order: before modules that wire VK (participant/individual)
   */

  function ensure(){
    try {
      if (!global.virtualKeyboardManager && typeof global.initVirtualKeyboardIfNeeded === 'function') {
        const p = global.initVirtualKeyboardIfNeeded();
        if (p && typeof p.then === 'function') { p.then(()=>{}).catch(()=>{}); }
      }
    } catch(_) {}
  }

  function attachMirror(inputEl, containerEl, mirrorId){
    try {
      const input = (typeof inputEl === 'string') ? document.getElementById(inputEl) : inputEl;
      const container = (typeof containerEl === 'string') ? document.getElementById(containerEl) : containerEl;
      if (!input || !container) return null;
      let mirror = document.getElementById(mirrorId);
      if (!mirror) {
        mirror = document.createElement('div');
        mirror.id = mirrorId;
        mirror.className = 'vk-mirror empty';
        mirror.innerHTML = '<span class="vk-mirror-text"></span><span class="vk-caret"></span>';
        try { container.insertBefore(mirror, container.querySelector('.participant-input') || input); } catch(_) { container.insertBefore(mirror, input); }
        // Interacción básica: abrir teclado si no está bloqueado
        const tryOpen = () => {
          if (global._waitNextWord) return;
          try { global.virtualKeyboardManager?.showKeyboard(input); } catch(_) {}
        };
        mirror.addEventListener('click', tryOpen);
        mirror.addEventListener('touchstart', tryOpen, { passive: true });
      }
      if (global.virtualKeyboardManager) {
        const text = mirror.querySelector('.vk-mirror-text');
        const caret = mirror.querySelector('.vk-caret');
        global.virtualKeyboardManager.mirror = { el: mirror, text, caret };
        global.virtualKeyboardManager._updateMirrorFromInput?.(input);
      }
      return mirror;
    } catch(_) { return null; }
  }

  function show(inputEl){ try { global.virtualKeyboardManager?.showKeyboard?.((typeof inputEl==='string')?document.getElementById(inputEl):inputEl); } catch(_) {} }
  function hide(){ try { global.virtualKeyboardManager?.hideKeyboard?.(); } catch(_) {} }
  function clear(){
    try {
      if (global.virtualKeyboardManager && typeof global.virtualKeyboardManager.clearInput === 'function') {
        global.virtualKeyboardManager.clearInput();
      } else if (global.virtualKeyboardManager && global.virtualKeyboardManager.keyboard) {
        global.virtualKeyboardManager.keyboard.clearInput?.();
      }
    } catch(_) {}
  }

  global.VK = global.VK || { ensure, attachMirror, show, hide, clear };
})(typeof window !== 'undefined' ? window : this);
