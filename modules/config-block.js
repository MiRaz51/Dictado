(function(global){
  'use strict';

  function renderConfigBlock(container, opts){
    if (!container) return;
    const mode = (opts && opts.mode) === 'tutor' ? 'tutor' : 'individual';
    const P = mode === 'tutor' ? 'tutor' : '';

    const id = (base) => (P ? (P + base.charAt(0).toUpperCase() + base.slice(1)) : base);

    // Shared block markup (identical UI for ambos modos; solo cambian IDs)

    const cantidadRow = `<div class="config-field">
        <label class="config-label" for="${id('cantidad')}"><strong>Cantidad de palabras</strong>: </label>
        <input class="config-input" id="${id('cantidad')}" type="number" min="1" step="1" placeholder="vacío = 25" tabindex="1" onkeydown="handleEnterNavigation(event, '${id('filtroLetras')}')">
        <div class="config-hint">Al no ingresar cantidad, será 25 palabras como máximo disponible.</div>
      </div>`;

    const letrasRow = `<div class="config-field">
        <label class="config-label" for="${id('filtroLetras')}"><strong>Letras a reforzar</strong> (solo una letra o combinación, ej.: rr): </label>
        <input class="config-input" id="${id('filtroLetras')}" type="text" placeholder="ej.: rr" tabindex="2" oninput="filtrarLetrasEspanol(this)" onkeydown="handleEnterNavigation(event, '${id('porcentajeRefuerzo')}')" autocomplete="off" autocorrect="off" spellcheck="false" data-gramm="false">
      </div>`;

    const guia = `<div class="config-hint">
        <strong>Letras individuales:</strong> b, v, g, j, c, z, s, h, x, y, w<br>
        <strong>Dígrafos:</strong> ll, rr, ch, qu, gu, gü<br>
        <strong>Grupos consonánticos:</strong> br, bl, cr, cl, dr, fl, fr, gl, gr, pl, pr, tr<br>
        <strong>Combinaciones ortográficas:</strong> cc, sc, xc, mp, mb, nv, nf, nm
      </div>`;

    const porcentajeRow = `<div class="config-row" style="margin: 12px 0;">
        <label class="config-label" for="${id('porcentajeRefuerzo')}" style="min-width: 220px;"><strong>Porcentaje de refuerzo</strong> (0–100%): </label>
        <input class="config-input" id="${id('porcentajeRefuerzo')}" type="number" min="0" max="100" step="1" placeholder="p. ej.: 40" tabindex="2" onkeydown="handleEnterNavigation(event, '${id('acentosObligatorios')}')">
      </div>`;

    const acentosYModo = `<!-- Acentos obligatorios y Modo estricto dentro del card -->
      <div class=\"config-box\">\n        <label class=\"inline\">\n          <input id=\"${id('acentosObligatorios')}\" type=\"checkbox\" tabindex=\"3\" onkeydown=\"handleEnterNavigation(event, '${id('strictMode')}')\">\n          <span>Acentos obligatorios (más difícil)</span>\n        </label>\n        <div id=\"acentosHelp\" class=\"config-hint\" style=\"margin-left: 28px;\">\n          Básico: desactivado · Intermedio/Avanzado: opcional · Experto: siempre activado\n        </div>\n      </div>\n      <div class=\"config-box\">\n        <label class=\"inline\">\n          <input id=\"${id('strictMode')}\" type=\"checkbox\" checked tabindex=\"5\" onkeydown=\"handleEnterNavigation(event, 'btnNivelBasico')\">\n          <span>Modo estricto (solo español)</span>\n        </label>\n      </div>`;

    container.innerHTML = [
      '<div class="config-card">',
      cantidadRow,
      letrasRow,
      guia,
      porcentajeRow,
      '<br>',
      acentosYModo,
      '</div>'
    ].join('\n');
  }

  global.renderConfigBlock = renderConfigBlock;
})(typeof window !== 'undefined' ? window : globalThis);
