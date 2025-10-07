(function(global){
  'use strict';

  function seleccionarNivel(nivel) {
    // Bloquear todos los elementos de configuración
    const cantidad = document.getElementById('cantidad');
    const filtroLetras = document.getElementById('filtroLetras');
    const strictMode = document.getElementById('strictMode');
    const acentosCheckbox = document.getElementById('acentosObligatorios');

    if (cantidad) cantidad.disabled = true;
    if (filtroLetras) filtroLetras.disabled = true;
    if (strictMode) strictMode.disabled = true;

    if (nivel === 'basico' || nivel === 'facil') {
      acentosCheckbox.checked = false;
      acentosCheckbox.disabled = true;
    } else if (nivel === 'intermedio' || nivel === 'avanzado' || nivel === 'experto' || nivel === 'medio' || nivel === 'dificil') {
      acentosCheckbox.disabled = true;
    }

    const bBasico = document.getElementById('btnNivelBasico');
    const bIntermedio = document.getElementById('btnNivelIntermedio');
    const bAvanzado = document.getElementById('btnNivelAvanzado');
    const bExperto = document.getElementById('btnNivelExperto');
    const bF = document.getElementById('btnNivelFacil');
    const bM = document.getElementById('btnNivelMedio');
    const bD = document.getElementById('btnNivelDificil');

    [bBasico, bIntermedio, bAvanzado, bExperto, bF, bM, bD].forEach(b => { if (b) b.disabled = true; });
    [bBasico, bIntermedio, bAvanzado, bExperto, bF, bM, bD].forEach(b => { if (b) b.classList.remove('btn-selected'); });

    const map = { basico: bBasico, intermedio: bIntermedio, avanzado: bAvanzado, experto: bExperto, facil: bF, medio: bM, dificil: bD };
    if (map[nivel]) map[nivel].classList.add('btn-selected');

    // Ocultar toda la zona de configuración dentro de #page-game y dejar solo el panel #juego
    try {
      const page = document.getElementById('page-game');
      if (page) {
        Array.from(page.children).forEach(el => {
          if (el && el.id !== 'juego') el.style.display = 'none';
        });
        const juego = document.getElementById('juego');
        if (juego) juego.style.display = 'block';
        // Enfocar el campo y mostrar teclado virtual (si aplica en móvil/tablet)
        const input = document.getElementById('respuesta');
        if (input) {
          try { input.focus(); } catch(_) {}
          try {
            if (window.virtualKeyboardManager && typeof window.virtualKeyboardManager.showKeyboard === 'function') {
              window.virtualKeyboardManager.showKeyboard(input);
            } else if (typeof window.updateVKVisibility === 'function') {
              window.updateVKVisibility();
            }
          } catch(_) {}
        }
      }
    } catch(_) {}

    // Delegar primero al alias estable del módulo (tolerante al orden de carga)
    if (typeof global.__indiv_iniciarJuego === 'function') {
      return global.__indiv_iniciarJuego(nivel);
    }
    // Luego al iniciarJuego global, si está
    if (typeof global.iniciarJuego === 'function') {
      return global.iniciarJuego(nivel);
    }
    // Último recurso: intentar la función en ámbito global (legacy)
    try { iniciarJuego(nivel); } catch(_) {}
  }

  // Sobrescribir la referencia global para que los onclick usen esta versión modular
  global.seleccionarNivel = seleccionarNivel;

})(typeof window !== 'undefined' ? window : globalThis);
