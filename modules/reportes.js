// Reportes y utilidades relacionadas (PDF, práctica manual, modal, y caché de significados)
// Depende de librerías cargadas vía CDN (jsPDF, html2canvas, autotable) y de utilidades globales:
// - CacheManager, CONFIG, WordFilters, gameState, fetchDesdeWikipediaEs (definidos en app.js y otros scripts)

(function(){
  'use strict';

  // Helper reutilizable: dibuja pies de página "Página X de Y" en todo el documento
  function finalizeFootersFor(doc, leftLabel = 'Autor: GMR') {
    try {
      const pageWidth = 595; const pageHeight = 842;
      const tp = doc.getNumberOfPages ? doc.getNumberOfPages() : 1;
      for (let i = 1; i <= tp; i++) {
        doc.setPage(i);
        doc.setFontSize(10); doc.setFont(undefined, 'normal');
        doc.text(`Página ${i} de ${tp}`, pageWidth - 120, pageHeight - 20);
        doc.text(leftLabel, 40, pageHeight - 20);
      }
    } catch(_) {}
  }

  // Extraer fuente desde cadena con sufijo ' — Fuente: X'
  function splitMeaningAndSource(s) {
    try {
      const SEP = ' — Fuente: ';
      const str = String(s || '').trim();
      const idx = str.lastIndexOf(SEP);
      if (idx > 0) {
        const text = str.slice(0, idx).trim();
        const src = str.slice(idx + SEP.length).trim();
        return { text, src };
      }
      return { text: str, src: '' };
    } catch(_) { return { text: String(s||''), src: '' }; }
  }

  // Forzar exactamente dos líneas para PDF: línea 1 = definición truncada, línea 2 = "Fuente: X" (si hay)
  function meaningTwoLinesForPDF(s) {
    try {
      const { text, src } = splitMeaningAndSource(s);
      const base = formatMeaningTwoLines(text);
      const first = String(base).split('\n')[0] || '';
      const second = src ? `Fuente: ${src}` : (String(base).split('\n')[1] || '');
      return second ? `${first}\n${second}` : first;
    } catch(_) { return String(s||''); }
  }

  // Utilidad local para normalizar términos (quitar tildes y pasar a minúsculas)
  function normalizeForLookup(term) {
    try {
      if (!term) return '';
      // Preferir normalizador del proyecto si existe
      if (typeof WordFilters !== 'undefined' && typeof WordFilters.normalizarBasico === 'function') {
        return WordFilters.normalizarBasico(term);
      }
      return String(term)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    } catch(_) { return String(term || '').toLowerCase(); }
  }

  // --- Caché de significados ---
  function cargarCacheSignificados() {
    return (typeof CacheManager !== 'undefined' && typeof CONFIG !== 'undefined')
      ? (CacheManager.get(CONFIG.MEANING_CACHE_KEY) || {})
      : {};
  }

  function guardarCacheSignificados(cache) {
    if (typeof CacheManager !== 'undefined' && typeof CONFIG !== 'undefined') {
      CacheManager.set(CONFIG.MEANING_CACHE_KEY, cache);
    }
  }

  function sanitizeMeaning(val) {
    if (val == null) return null;
    try {
      let s = String(val).trim();
      if (!s) return null;
      s = s.replace(/^"+|"+$/g, '').trim();
      if (/^\d+$/.test(s)) return null;
      if (s.length < 3) return null;
      if (/[²¹⁵ᵃ®⁰]/.test(s)) return null;
      if (/[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]/.test(s)) return null;
      if (s.length > 80) {
        // No recortar aquí; la formatearemos a dos líneas más adelante
      }
      return s;
    } catch(_) { return null; }
  }

  // Formatear significado a máximo dos líneas (aprox.) inserta un salto de línea conveniente
  function formatMeaningTwoLines(s, maxTotal = 180) {
    try {
      if (!s) return '';
      let txt = String(s).trim();
      if (txt.length > maxTotal) txt = txt.slice(0, maxTotal).trim() + '...';
      // Intentar cortar en un punto natural cerca de la mitad
      const half = Math.floor(txt.length / 2);
      const natural = ['. ', '; ', ', ', ' – ', ' — ', ': '];
      let breakPos = -1;
      for (const br of natural) {
        const right = txt.indexOf(br, Math.max(40, half - 20));
        if (right !== -1 && right < txt.length - 10) { breakPos = right + br.length; break; }
      }
      if (breakPos === -1) {
        // Buscar espacio cerca de la mitad
        const leftSpace = txt.lastIndexOf(' ', half);
        const rightSpace = txt.indexOf(' ', half);
        if (leftSpace > 40) breakPos = leftSpace;
        else if (rightSpace > 0 && rightSpace < txt.length - 10) breakPos = rightSpace;
      }
      if (breakPos !== -1) {
        return txt.slice(0, breakPos).trim() + '\n' + txt.slice(breakPos).trim();
      }
      return txt; // corto o sin buen punto de quiebre
    } catch(_) { return String(s || ''); }
  }

  function getCachedMeaning(palabra) {
    try {
      const cache = cargarCacheSignificados();
      const key = (typeof WordFilters !== 'undefined' && WordFilters.normalizarBasico)
        ? WordFilters.normalizarBasico(palabra)
        : String(palabra || '').toLowerCase();
      const val = (cache[key] && cache[key].def) ? cache[key].def : null;
      const src = (cache[key] && cache[key].src) ? String(cache[key].src) : null;
      const clean = sanitizeMeaning(val);
      if (!clean) return null;
      return src ? `${clean} — Fuente: ${src}` : clean;
    } catch(_) { return null; }
  }

  function extraerDefinicionBreve(apiData) {
    try {
      if (!Array.isArray(apiData) || apiData.length === 0) return null;
      const entry = apiData[0];
      if (!entry.meanings || !Array.isArray(entry.meanings)) return null;
      for (const m of entry.meanings) {
        if (Array.isArray(m.definitions) && m.definitions.length > 0) {
          const d = m.definitions[0];
          if (d.definition) return d.definition;
          if (d.example) return d.example;
        }
      }
      return null;
    } catch(_) { return null; }
  }

  async function fetchSignificado(palabra, timeout = 2000) {
    const key = (typeof WordFilters !== 'undefined' && WordFilters.normalizarBasico)
      ? WordFilters.normalizarBasico(palabra)
      : String(palabra || '').toLowerCase();

    try {
      let defs = window.DEFINITIONS || null;
      if (!defs && !window.__defsLoadAttempted) {
        window.__defsLoadAttempted = true;
        try {
          const resp = await fetch('assets/definitions.json');
          if (resp.ok) {
            defs = await resp.json();
            window.DEFINITIONS = defs;
          }
        } catch(_) {}
      }
      if (defs) {
        let val = defs[key] || defs[palabra] || null;
        if (val) {
          const clean = sanitizeMeaning(val);
          if (clean) {
            const hasSrc = / — Fuente: /.test(clean);
            return hasSrc ? clean : `${clean} — Fuente: Local`;
          }
        }
      }
    } catch(_) {}

    const cache = cargarCacheSignificados();
    if (cache[key] && cache[key].def) {
      const src = cache[key].src ? ` — Fuente: ${cache[key].src}` : '';
      return (sanitizeMeaning(cache[key].def) || '') + src;
    }

    // 1) RAE API (rae-api.com) prioritario
    try {
      const raeUrl = `https://rae-api.com/api/words/${encodeURIComponent(palabra)}`;
      const resp = await fetch(raeUrl, { headers: { 'Accept': 'application/json' } });
      if (resp.ok) {
        const j = await resp.json();
        const d = j?.data;
        let text = null;
        let sensesCount = 0;
        if (d) {
          // meanings -> senses -> first definition-like field
          const meanings = Array.isArray(d.meanings) ? d.meanings : [];
          for (const m of meanings) {
            const senses = Array.isArray(m?.senses) ? m.senses : [];
            sensesCount += senses.length;
            for (const s of senses) {
              const cand = s?.def || s?.definition || s?.raw || s?.text || '';
              if (cand && String(cand).trim()) { text = String(cand).trim(); break; }
            }
            if (text) break;
          }
        }
        const def = sanitizeMeaning(text);
        if (def) {
          const src = 'RAE API';
          const pageLink = `https://rae-api.com/search?q=${encodeURIComponent(palabra)}`;
          const extra = sensesCount > 1
            ? ` — Más: <a href="${pageLink}" target="_blank" rel="noopener">ver más</a>`
            : '';
          // Guardar también el 'Más' con anchor dentro de def para que no se pierda al leer desde caché
          cache[key] = { def: `${def}${extra}`, src, ts: Date.now() };
          guardarCacheSignificados(cache);
          // Colocar 'Más' antes de ' — Fuente: '
          return `${def}${extra} — Fuente: ${src}`;
        }
      }
    } catch(_) {}

    // 1.1) RAE API con término normalizado (sin tildes) como segundo intento
    try {
      const alt = normalizeForLookup(palabra);
      if (alt && alt !== palabra) {
        const raeUrlN = `https://rae-api.com/api/words/${encodeURIComponent(alt)}`;
        const respN = await fetch(raeUrlN, { headers: { 'Accept': 'application/json' } });
        if (respN.ok) {
          const j = await respN.json();
          const d = j?.data;
          let text = null;
          let sensesCount = 0;
          if (d) {
            const meanings = Array.isArray(d.meanings) ? d.meanings : [];
            for (const m of meanings) {
              const senses = Array.isArray(m?.senses) ? m.senses : [];
              sensesCount += senses.length;
              for (const s of senses) {
                const cand = s?.def || s?.definition || s?.raw || s?.text || '';
                if (cand && String(cand).trim()) { text = String(cand).trim(); break; }
              }
              if (text) break;
            }
          }
          const def = sanitizeMeaning(text);
          if (def) {
            const src = 'RAE API (normalizado)';
            const pageLink = `https://rae-api.com/search?q=${encodeURIComponent(palabra)}`;
            const extra = sensesCount > 1
              ? ` — Más: <a href="${pageLink}" target="_blank" rel="noopener">ver más</a>`
              : '';
            // Guardar 'Más' con anchor dentro de def para persistir en caché
            cache[key] = { def: `${def}${extra}`, src, ts: Date.now() };
            guardarCacheSignificados(cache);
            // Colocar 'Más' antes de ' — Fuente: '
            return `${def}${extra} — Fuente: ${src}`;
          }
        }
      }
    } catch(_) {}

    // 2) DictionaryAPI (prioritario por velocidad y simplicidad)
    try {
      const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(palabra)}`);
      if (resp.ok) {
        const data = await resp.json();
        const def = sanitizeMeaning(extraerDefinicionBreve(data));
        if (def) { const src = 'DictionaryAPI'; cache[key] = { def, src, ts: Date.now() }; guardarCacheSignificados(cache); return `${def} — Fuente: ${src}`; }
      }
    } catch(_) {}

    // 2) Wikcionario (HTML renderizado) como fallback léxico
    try {
      const defW = await (async function fetchFromWiktionaryPrimary(term){
        try {
          // Usar API de texto HTML renderizado en lugar de wikitext
          const url = `https://es.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(term)}&prop=text&format=json&origin=*`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error('wiktionary http');
          const data = await resp.json();
          const htmlText = data?.parse?.text?.['*'];
          if (!htmlText || typeof htmlText !== 'string') return null;
          
          // Crear un DOM temporal para parsear el HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          
          // Buscar la sección de Español
          const spanishHeading = Array.from(doc.querySelectorAll('h2 .mw-headline')).find(
            h => h.textContent.includes('Español')
          );
          if (!spanishHeading) return null;
          
          // Encontrar el contenedor de la sección española
          let currentElement = spanishHeading.closest('h2').nextElementSibling;
          let wordType = '';
          let definition = '';
          
          // Buscar subsección (h3) con el tipo de palabra
          while (currentElement && currentElement.tagName !== 'H2') {
            if (currentElement.tagName === 'H3') {
              const headline = currentElement.querySelector('.mw-headline');
              if (headline) {
                wordType = headline.textContent.trim();
              }
            }
            
            // Buscar listas ordenadas (ol) con definiciones
            if (currentElement.tagName === 'OL' && wordType) {
              const firstLi = currentElement.querySelector('li');
              if (firstLi) {
                definition = firstLi.textContent.trim();
                // Limpiar referencias y notas
                definition = definition.replace(/\[\d+\]/g, '').trim();
                break;
              }
            }
            
            currentElement = currentElement.nextElementSibling;
          }
          
          if (wordType && definition) {
            return `${wordType}: ${definition}`;
          }
          return definition || null;
        } catch(err) { 
          console.warn('[Wikcionario] Error parsing:', err);
          return null; 
        }
      })(palabra);
      if (defW) {
        const def = sanitizeMeaning(defW);
        if (def) { const src = 'Wikcionario'; cache[key] = { def, src, ts: Date.now() }; guardarCacheSignificados(cache); return `${def} — Fuente: ${src}`; }
      }
      
      // Intentar con palabra normalizada si no funcionó
      const altW = normalizeForLookup(palabra);
      if (altW && altW !== palabra) {
        const defW2 = await (async function(term){
          try {
            const url = `https://es.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(term)}&prop=text&format=json&origin=*`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('wiktionary http');
            const data = await resp.json();
            const htmlText = data?.parse?.text?.['*'];
            if (!htmlText || typeof htmlText !== 'string') return null;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            const spanishHeading = Array.from(doc.querySelectorAll('h2 .mw-headline')).find(
              h => h.textContent.includes('Español')
            );
            if (!spanishHeading) return null;
            
            let currentElement = spanishHeading.closest('h2').nextElementSibling;
            let wordType = '';
            let definition = '';
            
            while (currentElement && currentElement.tagName !== 'H2') {
              if (currentElement.tagName === 'H3') {
                const headline = currentElement.querySelector('.mw-headline');
                if (headline) {
                  wordType = headline.textContent.trim();
                }
              }
              
              if (currentElement.tagName === 'OL' && wordType) {
                const firstLi = currentElement.querySelector('li');
                if (firstLi) {
                  definition = firstLi.textContent.trim();
                  definition = definition.replace(/\[\d+\]/g, '').trim();
                  break;
                }
              }
              
              currentElement = currentElement.nextElementSibling;
            }
            
            if (wordType && definition) {
              return `${wordType}: ${definition}`;
            }
            return definition || null;
          } catch(err) { 
            console.warn('[Wikcionario normalizado] Error parsing:', err);
            return null; 
          }
        })(altW);
        if (defW2) {
          const def = sanitizeMeaning(defW2);
          if (def) { const src = 'Wikcionario (normalizado)'; cache[key] = { def, src, ts: Date.now() }; guardarCacheSignificados(cache); return `${def} — Fuente: ${src}`; }
        }
      }
    } catch(err) {
      console.warn('[Wikcionario] Error general:', err);
    }

    // Sin más fuentes: si Wikcionario no da resultado, devolver null

    return null;
  }

  // --- Modal descarga ---
  let currentDownloadedFile = null;
  let currentDownloadedBlob = null;

  function showDownloadModal(fileType, fileName, extraMessage = '', pdfBlob = null) {
    currentDownloadedFile = fileName;
    currentDownloadedBlob = pdfBlob;

    const modal = document.getElementById('downloadModal');
    const title = document.getElementById('modalTitle');
    const message = document.getElementById('modalMessage');

    if (!modal || !title || !message) return;

    title.textContent = `✅ ${fileType} Descargado`;
    let messageText = `Archivo descargado exitosamente:\n${fileName}`;
    if (extraMessage) messageText += `\n\n${extraMessage}`;
    message.textContent = messageText;
    message.style.whiteSpace = 'pre-line';
    modal.style.display = 'block';

    modal.onclick = function(ev){ if (ev.target === modal) { closeDownloadModal(); } };
  }

  // Señalizar que el reporte ha terminado de generarse/mostrarse
  function markReportReady() {
    try {
      window._reportBusy = false;
      const ev = new CustomEvent('report:ready');
      window.dispatchEvent(ev);
    } catch(_) {}
  }

  function closeDownloadModal() {
    const modal = document.getElementById('downloadModal');
    if (modal) modal.style.display = 'none';
    currentDownloadedFile = null;
    currentDownloadedBlob = null;
  }

  function openDownloadedFile() {
    if (!currentDownloadedFile || !currentDownloadedBlob) { alert('No hay archivo para abrir.'); return; }
    try {
      const blobUrl = URL.createObjectURL(currentDownloadedBlob);
      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow) {
        const link = document.createElement('a');
        link.href = blobUrl; link.target = '_blank'; link.style.display = 'none';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) {
      console.error('Error abriendo archivo:', e);
      alert('Error al abrir el archivo. Búscalo en tu carpeta de Descargas.');
    }
    closeDownloadModal();
  }

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeDownloadModal();
  });

  // --- Generador de Reporte PDF ---
  // Nota: Usamos pdf.save() nativo de jsPDF que es más confiable
  // y no genera advertencias de seguridad en los navegadores

  async function generarReportePDF() {
    try { window._reportBusy = true; } catch(_) {}
    if (!window.jspdf) { try { alert('No se pudo cargar el generador de PDF.'); } catch(_) {} return; }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'pt', 'a4');

    const pageWidth = 595; const pageHeight = 842;
    const finalizeFootersFor = (pdf) => {
      try {
        const tp = pdf.getNumberOfPages ? pdf.getNumberOfPages() : 1;
        for (let i = 1; i <= tp; i++) {
          pdf.setPage(i);
          pdf.setFontSize(10); pdf.setFont(undefined, 'normal');
          pdf.text(`Página ${i} de ${tp}`, pageWidth - 120, pageHeight - 20);
          pdf.text('Autor: GMR', 40, pageHeight - 20);
        }
      } catch(_) {}
    };

    try {
      const alumno = (document.getElementById('alumno')?.value || '').trim();
      const curso = (document.getElementById('curso')?.value || '').trim();
      // Nivel: priorizar lo que clickeó el tutor (inyectado por participant-helpers)
      let nivel = (window._exerciseConfigParticipant && window._exerciseConfigParticipant.nivel)
        ? String(window._exerciseConfigParticipant.nivel)
        : (typeof gameState !== 'undefined' ? (gameState.currentLevel || '') : '');
      const filtroLetras = (document.getElementById('filtroLetras')?.value || '').trim();
      const cant = (document.getElementById('cantidad')?.value || '').trim() || 'todas';
      const acentosObligatorios = document.getElementById('acentosObligatorios')?.checked ? 'Sí' : 'No';

      let resultados = [];
      if (Array.isArray(window.resultsLog) && window.resultsLog.length > 0) resultados = window.resultsLog;
      else if (typeof gameState !== 'undefined' && Array.isArray(gameState.resultsLog) && gameState.resultsLog.length > 0) resultados = gameState.resultsLog;
      // Si aún no tenemos nivel, intentar deducir desde resultados (campo nivel)
      if (!nivel) {
        try {
          const fromResults = (resultados.find(r => r && r.nivel && String(r.nivel).trim()) || {}).nivel;
          if (fromResults) nivel = String(fromResults);
        } catch(_) {}
      }
      // Normalizar etiqueta
      try {
        const map = { basico: 'Básico', básico:'Básico', intermedio:'Intermedio', avanzado:'Avanzado', experto:'Experto', facil:'Básico', medio:'Intermedio', dificil:'Avanzado', '1':'Básico', '2':'Intermedio', '3':'Avanzado', '4':'Experto' };
        const key = String(nivel||'').toLowerCase().trim();
        nivel = map[key] || (nivel || '-');
      } catch(_) { nivel = nivel || '-'; }

      // PDF solo usa definiciones ya en caché (sin prefetch de red)
      // Si no están en caché, se mostrará "Definición no disponible" para esa palabra

      // Alinear resultados a las palabras del ejercicio y completar faltantes
      const palabrasAll = (typeof gameState !== 'undefined' && Array.isArray(gameState.words) && gameState.words.length > 0)
        ? gameState.words
        : (Array.isArray(window.palabras) ? window.palabras : []);
      const normaliza = (s) => {
        try {
          return (typeof WordFilters !== 'undefined' && WordFilters.normalizarBasico)
            ? WordFilters.normalizarBasico(String(s || ''))
            : String(s || '').toLowerCase().trim();
        } catch(_) { return String(s || '').toLowerCase().trim(); }
      };
      const setPalabras = new Set(palabrasAll.map(normaliza));
      let resultadosFiltrados = Array.isArray(resultados)
        ? resultados.filter(r => r && setPalabras.has(normaliza(r.palabra)))
        : [];
      // Completar faltantes como no respondidas
      const existentes = new Set(resultadosFiltrados.map(r => normaliza(r.palabra)));
      const nivelFallback = (typeof gameState !== 'undefined' && gameState.currentLevel) ? gameState.currentLevel : '-';
      for (const w of palabrasAll) {
        const key = normaliza(w);
        if (!existentes.has(key)) {
          resultadosFiltrados.push({ fechaISO: '', nivel: nivelFallback, palabra: String(w || ''), respuesta: '', correcto: '-', tiempoMs: '' });
        }
      }
      // Ordenar según el orden del ejercicio
      const mapa = new Map(resultadosFiltrados.map(r => [normaliza(r.palabra), r]));
      resultados = palabrasAll.map(w => mapa.get(normaliza(w)) || { fechaISO: '', nivel: nivelFallback, palabra: String(w || ''), respuesta: '', correcto: '-', tiempoMs: '' });

      const total = palabrasAll.length || resultados.length;
      const correctas = resultados.filter(r => r.correcto === 'Sí' || r.correcto === true).length;
      const porcentaje = total ? Math.round((correctas / total) * 100) : 0;

      const fechaInicio = (typeof gameState !== 'undefined' ? gameState.sessionStartISO : null) || window.sessionStartISO;
      const fechaFin = (typeof gameState !== 'undefined' ? gameState.sessionEndISO : null) || window.sessionEndISO || null;
      const fechaSesion = fechaInicio ? new Date(fechaInicio).toLocaleString() : new Date().toLocaleString();
      const fechaFinTxt = fechaFin ? new Date(fechaFin).toLocaleString() : null;

      const totalReportPages = resultados.length > 0 ? 2 : 1;

      pdf.setFontSize(18); pdf.setTextColor(15, 99, 245);
      pdf.text('Práctica de Ortografía - Resumen', 40, 50);
      pdf.setTextColor(0,0,0); pdf.setFontSize(11);

      if (pdf.autoTable) {
        const head = [[ 'Campo', 'Valor' ]];
        // Calcular porcentaje de refuerzo como en la UI web
        const prRaw = (document.getElementById('porcentajeRefuerzo')?.value ?? '').toString().trim();
        const tieneLetras = !!(filtroLetras && filtroLetras.trim());
        let prTxt;
        if (prRaw === '') {
          prTxt = tieneLetras ? '-' : '0%';
        } else {
          const n = parseInt(prRaw, 10);
          prTxt = Number.isFinite(n) ? Math.max(0, Math.min(100, n)).toString() + '%' : '-';
        }
        const strictTxt = (document.getElementById('strictMode')?.checked ? 'Sí' : 'No');

        // Orden alineado a la solicitud: primero Alumno y Curso/Grupo, luego Nivel y el resto
        // 1) Alumno, 2) Curso/Grupo, 3) Nivel, 4) Inicio de sesión, 5) Total palabras,
        // 6) Aciertos, 7) Incorrectas, 8) Cantidad solicitada, 9) Porcentaje de acierto,
        // 10) Letras a reforzar, 11) Porcentaje de refuerzo, 12) Acentos obligatorios, 13) Modo estricto
        const body = [
          ['Alumno', alumno || '-'],
          ['Curso/Grupo', curso || '-'],
          ['Nivel', nivel],
          ['Inicio de ejercicio', fechaSesion],
          ...(fechaFinTxt ? [['Fin de ejercicio', fechaFinTxt]] : []),
          ...(function(){
            if (!fechaInicio || !fechaFin) return [];
            try {
              const ms = Math.max(0, new Date(fechaFin) - new Date(fechaInicio));
              const sec = Math.floor(ms/1000);
              const mm = Math.floor(sec/60);
              const ss = sec % 60;
              const dur = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
              return [['Duración total', dur]];
            } catch(_) { return []; }
          })(),
          ['Total palabras', String(total)],
          ['Aciertos', String(correctas)],
          ['Incorrectas', String(Math.max(0, total - correctas))],
          ['Porcentaje de acierto', porcentaje + '%'],
          ['Letras a reforzar', filtroLetras || '-'],
          ['Porcentaje de refuerzo', prTxt],
          ['Acentos obligatorios', acentosObligatorios],
          ['Modo estricto', strictTxt],
        ];

        pdf.autoTable({
          startY: 70,
          head,
          body,
          styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
          headStyles: { fillColor: [15,99,245], halign: 'center', valign: 'middle', textColor: 255 },
          columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 'auto' } },
          margin: { left: 36, right: 36 },
          tableWidth: 'wrap',
          didParseCell: function(data) {
            try {
              if (data.section === 'body' && data.column.index === 1) {
                const campo = data.table.body[data.row.index].raw[0];
                const val = String(data.cell.raw || '');
                // Resaltar Sí/No
                if (campo === 'Modo estricto' || campo === 'Acentos obligatorios') {
                  if (val === 'Sí') {
                    data.cell.styles.fillColor = [209, 250, 229];
                    data.cell.styles.textColor = [6, 95, 70];
                  } else if (val === 'No') {
                    data.cell.styles.fillColor = [243, 244, 246];
                    data.cell.styles.textColor = [55, 65, 81];
                  }
                }
                // Letras a reforzar vacío
                if (campo === 'Letras a reforzar' && (val === '' || val === '-')) {
                  data.cell.styles.fillColor = [243, 244, 246];
                  data.cell.styles.textColor = [107, 114, 128];
                }
                // Nivel con color por categoría
                if (campo === 'Nivel') {
                  const v = val.toLowerCase();
                  if (v.includes('básico') || v.includes('basico') || v === '1') {
                    data.cell.styles.fillColor = [209, 250, 229]; // emerald-100
                    data.cell.styles.textColor = [6, 95, 70];      // emerald-800
                  } else if (v.includes('intermedio') || v === '2') {
                    data.cell.styles.fillColor = [254, 243, 199]; // amber-100
                    data.cell.styles.textColor = [146, 64, 14];   // amber-800
                  } else if (v.includes('avanzado') || v === '3') {
                    data.cell.styles.fillColor = [219, 234, 254]; // blue-100
                    data.cell.styles.textColor = [30, 58, 138];   // blue-900
                  } else if (v.includes('experto') || v === '4') {
                    data.cell.styles.fillColor = [255, 237, 213]; // orange-100
                    data.cell.styles.textColor = [124, 45, 18];   // orange-900
                  }
                }
              }
            } catch(_) {}
          }
        });
      } else {
        pdf.setFontSize(12);
        pdf.text(`Alumno: ${alumno || '-'}`, 40, 80);
        pdf.text(`Curso/Grupo: ${curso || '-'}`, 40, 100);
        pdf.text(`Nivel: ${nivel}`, 40, 120);
        pdf.text(`Fecha: ${fechaSesion}`, 40, 140);
        pdf.text(`Total: ${total}  Correctas: ${correctas}  Acierto: ${porcentaje}%`, 40, 160);
      }

      if (resultados.length > 0) {
        pdf.addPage();
        pdf.setFontSize(14); pdf.text('Detalle de intentos', 40, 40);
        pdf.setFontSize(10); pdf.text(`Alumno: ${alumno || '-'}  ·  Curso/Grupo: ${curso || '-'}  ·  Nivel: ${nivel}  ·  Inicio: ${fechaSesion}`, 40, 58);

        if (pdf.autoTable) {
          const head2 = [[ 'Palabra','Respuesta','Correcto','Tiempo (ms)','Significado' ]];
          const body2 = await Promise.all(resultados.map(async r => {
            let significado = getCachedMeaning(r.palabra) || '';
            if (!significado) {
              try {
                if (r.palabra && r.palabra.length > 1) {
                  // Prefetch ya intentó; como fallback pide ahora
                  significado = await fetchSignificado(r.palabra);
                }
              } catch(_) {}
            }
            significado = sanitizeMeaning(significado) || 'Definición no disponible';
            const sig2 = meaningTwoLinesForPDF(significado);
            return [ r.palabra || '', r.respuesta || '', r.correcto || '', String(r.tiempoMs ?? ''), sig2 ];
          }));

          pdf.autoTable({
            startY: 70,
            head: head2,
            body: body2,
            styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
            headStyles: { fillColor: [15,99,245], halign: 'center', valign: 'middle', textColor: 255 },
            columnStyles: { 0:{cellWidth:90},1:{cellWidth:90},2:{cellWidth:35,halign:'center'},3:{cellWidth:45,halign:'right'},4:{cellWidth:270, overflow: 'linebreak', cellPadding: 3, fontSize: 9, valign: 'top'} },
            margin: { left: 36, right: 36 },
            tableWidth: 'wrap',
            rowPageBreak: 'avoid',
            didParseCell: function(data){
              if (data.column.index === 0 || data.column.index === 1) {
                const rowIndex = data.row.index; const resultado = resultados[rowIndex];
                if (resultado) {
                  const esCorrecta = resultado.correcto === 'Sí' || resultado.correcto === true;
                  data.cell.styles.textColor = esCorrecta ? [0,128,0] : [220,53,69];
                }
              }
              if (data.column.index === 4) {
                data.cell.styles.overflow = 'linebreak';
                data.cell.styles.valign = 'top';
                data.cell.styles.fontSize = 8;
              }
            }
          });
          // Footer definitivo se aplicará al final con finalizeFootersFor(pdf)
        } else {
          let yPos = 80; pdf.setFontSize(8);
          resultados.forEach((r, i) => { if (yPos > 750) { pdf.addPage(); yPos = 40; } pdf.text(`${i+1}. ${r.palabra} → "${r.respuesta}" (${r.correcto}) - ${r.tiempoMs}ms`, 40, yPos); yPos += 15; });
        }
      }

      const ts = new Date();
      const pad = n => String(n).padStart(2, '0');
      const alumnoSlug = (alumno).replace(/[^\w\-]+/g,'_');
      const cursoSlug = (curso).replace(/[^\w\-]+/g,'_');
      const meta = [alumnoSlug, cursoSlug].filter(Boolean).join('_');
      const base = `Reporte_Final_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}`;
      const fileName = meta ? `${base}_${meta}.pdf` : `${base}.pdf`;

      // Dibujar pies de página con total definitivo
      finalizeFootersFor(pdf);

      // Usar método nativo de jsPDF (más confiable y sin advertencias)
      pdf.save(fileName);
      
      // Generar blob solo para preview en modal
      const pdfBlob = pdf.output('blob');
      
      setTimeout(() => { showDownloadModal('Reporte PDF', fileName, '', pdfBlob); markReportReady(); }, 500);
    } catch (e) {
      try { alert('Ocurrió un error al generar el PDF.'); } catch(_) {}
      try { markReportReady(); } catch(_) {}
    }
  }

  // --- Práctica manual PDF ---
  async function generarPracticaManual() {
    try {
      if (!window.jspdf) { alert('jsPDF no está cargado. Verifica que las librerías estén incluidas.'); return; }
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      let resultados = [];
      if (Array.isArray(window.resultsLog) && window.resultsLog.length > 0) resultados = window.resultsLog;
      else if (typeof gameState !== 'undefined' && Array.isArray(gameState.resultsLog) && gameState.resultsLog.length > 0) resultados = gameState.resultsLog;

      if (!resultados || resultados.length === 0) {
        pdf.setFontSize(16); pdf.text('Práctica Manual de Ortografía', 20, 30);
        pdf.text('Completa primero un ejercicio para generar práctica', 20, 50);
        pdf.save('practica-manual-sin-datos.pdf');
        const pdfBlob1 = pdf.output('blob');
        setTimeout(() => { showDownloadModal('Práctica Manual', 'practica-manual-sin-datos.pdf', 'Completa primero un ejercicio para generar práctica.', pdfBlob1); }, 500);
        return;
      }

      const palabrasIncorrectas = resultados.filter(r => {
        const esCorrecta = r.correcto === 'Sí' || r.correcto === true || r.correcto === 'Si';
        return !esCorrecta;
      });

      if (palabrasIncorrectas.length === 0) {
        pdf.setFontSize(16); pdf.text('Práctica Manual de Ortografía', 20, 30);
        pdf.text('¡Excelente! No hay palabras incorrectas para practicar', 20, 50);
        pdf.save('practica-manual-sin-errores.pdf');
        const pdfBlob2 = pdf.output('blob');
        setTimeout(() => { showDownloadModal('Práctica Manual', 'practica-manual-sin-errores.pdf', '¡Excelente! No hay palabras incorrectas para practicar.', pdfBlob2); }, 500);
        return;
      }

      // Sanitizar palabras (evitar undefined/null y vacíos)
      const palabrasCorrectas = [...new Set(
        palabrasIncorrectas
          .map(r => (r && r.palabra ? String(r.palabra) : '').trim())
          .filter(Boolean)
      )];
      const pdf2 = new jsPDF('portrait', 'pt', 'a4');

      let totalPages = 1;
      if (palabrasCorrectas.length > 8) {
        const extraWords = palabrasCorrectas.length - 8;
        const wordsPerExtraPage = 8;
        totalPages += Math.ceil(extraWords / wordsPerExtraPage);
      }

      const addFooter = (pageNum) => {
        // No-op: los pies de página se dibujan una sola vez en finalizeFooters()
      };

      // Al final recalculamos totales y reescribimos los pies de página
      const finalizeFooters = () => {
        try {
          const pageWidth = 595; const pageHeight = 842;
          const tp = pdf2.getNumberOfPages ? pdf2.getNumberOfPages() : totalPages;
          for (let i = 1; i <= tp; i++) {
            pdf2.setPage(i);
            pdf2.setFontSize(10); pdf2.setFont(undefined, 'normal');
            pdf2.text(`Página ${i} de ${tp}`, pageWidth - 120, pageHeight - 20);
            pdf2.text('Autor: GMR', 40, pageHeight - 20);
          }
        } catch(_) {}
      };

      pdf2.setFontSize(16); pdf2.text('Práctica Manual de Ortografía', 40, 40);
      const alumnoTexto = document.getElementById('alumno')?.value || 'Alumno';
      const cursoTexto = document.getElementById('curso')?.value || 'Curso';
      // Calcular fecha y totales del ejercicio
      const fechaInicioPM = (typeof gameState !== 'undefined' ? gameState.sessionStartISO : null) || window.sessionStartISO;
      const fechaTextoPM = fechaInicioPM ? new Date(fechaInicioPM).toLocaleString() : new Date().toLocaleString();
      const palabrasAllPM = (typeof gameState !== 'undefined' && Array.isArray(gameState.words) && gameState.words.length > 0)
        ? gameState.words
        : Array.from(new Set(resultados.map(r => (r && r.palabra ? String(r.palabra) : '').trim()).filter(Boolean)));
      const totalEjercicioPM = palabrasAllPM.length || resultados.length;
      const correctasPM = resultados.filter(r => r.correcto === 'Sí' || r.correcto === true || r.correcto === 'Si').length;
      const incorrectasPM = Math.max(0, totalEjercicioPM - correctasPM);

      pdf2.setFontSize(10);
      let yHeader = 60;
      pdf2.text(`Alumno: ${alumnoTexto}  ·  Curso/Grupo: ${cursoTexto}`, 40, yHeader); yHeader += 13;
      pdf2.text(`Fecha: ${fechaTextoPM}`, 40, yHeader); yHeader += 13;
      pdf2.text(`Total palabras: ${totalEjercicioPM}   ·   Aciertos: ${correctasPM}   ·   Incorrectas: ${incorrectasPM}`, 40, yHeader); yHeader += 13;
      pdf2.text(`Palabras a practicar: ${palabrasCorrectas.length}`, 40, yHeader);

      const pageWidth = 595, pageHeight = 842, margin = 40, availableWidth = pageWidth - (margin * 2);
      const firstSectionY = yHeader + 25, colWidth = availableWidth / 4, lineSpacing = 25, wordSpacing = 25;

      const firstFourWords = palabrasCorrectas.slice(0, 4);
      const remainingWords = palabrasCorrectas.slice(4);

      firstFourWords.forEach((palabra, colIndex) => {
        const x = margin + (colIndex * colWidth); let currentY = firstSectionY;
        const palabraTxt = String(palabra || '-');
        pdf2.setFontSize(14); pdf2.setFont(undefined, 'bold'); pdf2.text(palabraTxt, x + 5, currentY); currentY += wordSpacing;
        pdf2.setFont(undefined, 'normal');
        for (let line = 1; line <= 10; line++) { pdf2.line(x + 5, currentY, x + colWidth - 10, currentY); currentY += lineSpacing; }
      });

      addFooter(1);

      if (remainingWords.length > 0) {
        const secondSectionWords = remainingWords.slice(0, 4);
        const thirdSectionWords = remainingWords.slice(4);

        if (secondSectionWords.length > 0) {
          const secondSectionY = pageHeight / 2; const rowHeight = 280;
          secondSectionWords.forEach((palabra, colIndex) => {
            const x = margin + (colIndex * colWidth); let currentY = secondSectionY;
            const palabraTxt = String(palabra || '-');
            pdf2.setFontSize(14); pdf2.setFont(undefined, 'bold'); pdf2.text(palabraTxt, x + 5, currentY); currentY += wordSpacing;
            pdf2.setFont(undefined, 'normal');
            for (let line = 1; line <= 10; line++) { pdf2.line(x + 5, currentY, x + colWidth - 10, currentY); currentY += lineSpacing; }
          });
        }

        if (thirdSectionWords.length > 0) {
          let currentPageNum = 2; pdf2.addPage();
          pdf2.setFontSize(16); pdf2.setFont(undefined, 'bold'); pdf2.text('Práctica Manual de Ortografía (continuación)', margin, 40);
          pdf2.setFontSize(10); pdf2.setFont(undefined, 'normal'); pdf2.text(`Alumno: ${alumnoTexto}  ·  Curso/Grupo: ${cursoTexto}`, margin, 60);

          let wordIndex = 0; let currentRow = 0; const maxWordsPerRow = 4; const rowHeight = 280; const newPageStartY = 100;
          while (wordIndex < thirdSectionWords.length) {
            const base = wordIndex;
            const wordsInThisRow = Math.min(maxWordsPerRow, thirdSectionWords.length - base);
            for (let col = 0; col < wordsInThisRow; col++) {
              const palabra = thirdSectionWords[base + col];
              const x = margin + (col * colWidth); let currentY = newPageStartY + (currentRow * rowHeight);
              const palabraTxt = String(palabra || '-');
              pdf2.setFontSize(14); pdf2.setFont(undefined, 'bold'); pdf2.text(palabraTxt, x + 5, currentY); currentY += wordSpacing;
              pdf2.setFont(undefined, 'normal');
              for (let line = 1; line <= 10; line++) { pdf2.line(x + 5, currentY, x + colWidth - 10, currentY); currentY += lineSpacing; }
            }
            wordIndex += wordsInThisRow;
            currentRow++;
            if (newPageStartY + ((currentRow + 1) * rowHeight) > pageHeight - margin) {
              if (wordIndex < thirdSectionWords.length) {
                addFooter(currentPageNum); pdf2.addPage(); currentPageNum++; currentRow = 0;
                pdf2.setFontSize(16); pdf2.setFont(undefined, 'bold'); pdf2.text('Práctica Manual de Ortografía (continuación)', margin, 40);
                pdf2.setFontSize(10); pdf2.setFont(undefined, 'normal'); pdf2.text(`Alumno: ${alumnoTexto}  ·  Curso/Grupo: ${cursoTexto}`, margin, 60);
              }
            }
          }
          addFooter(currentPageNum);
        }
      }

      // Última hoja: Palabras erradas con significado (resumen)
      try {
        const palabrasErradasUnicas = [...new Set(
          resultados
            .filter(r => !(r.correcto === 'Sí' || r.correcto === true || r.correcto === 'Si'))
            .map(r => (r && r.palabra ? String(r.palabra) : '').trim())
            .filter(Boolean)
        )];
        if (palabrasErradasUnicas.length > 0) {
          pdf2.addPage();
          let currentPageNum = pdf2.getNumberOfPages();
          pdf2.setFontSize(16); pdf2.setFont(undefined, 'bold');
          pdf2.text('Palabras erradas · Significados', 40, 40);
          pdf2.setFontSize(10); pdf2.setFont(undefined, 'normal');
          pdf2.text(`Total: ${palabrasErradasUnicas.length}`, 40, 60);

          const pairs = palabrasErradasUnicas.map(p => {
            let significado = getCachedMeaning(p) || '';
            significado = sanitizeMeaning(significado) || 'Definición no disponible';
            const sig2 = meaningTwoLinesForPDF(significado);
            return [p, sig2];
          });

          if (pdf2.autoTable) {
            pdf2.autoTable({
              startY: 80,
              head: [[ 'Palabra', 'Significado' ]],
              body: pairs,
              styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
              headStyles: { fillColor: [15,99,245], halign: 'center', valign: 'middle', textColor: 255 },
              columnStyles: { 0:{cellWidth:140}, 1:{cellWidth:380, overflow:'linebreak'} },
              margin: { left: 40, right: 40 },
              tableWidth: 'wrap',
            });
            addFooter(currentPageNum);
          } else {
            // Fallback sin autotable
            let y = 80; pdf2.setFontSize(10);
            for (const [pal, sig] of pairs) {
              if (y > 780) { addFooter(currentPageNum); pdf2.addPage(); currentPageNum++; y = 40; }
              pdf2.setFont(undefined, 'bold'); pdf2.text(String(pal||'-'), 40, y); y += 14;
              pdf2.setFont(undefined, 'normal');
              const lines = String(sig||'').split('\n');
              for (const ln of lines) { if (y > 800) { addFooter(currentPageNum); pdf2.addPage(); currentPageNum++; y = 40; } pdf2.text(ln, 40, y); y += 12; }
              y += 6;
            }
            addFooter(currentPageNum);
          }
        }
      } catch(_) {}

      // Reescribir pies de página con el total definitivo
      finalizeFooters();

      const ts = new Date(); const pad = n => String(n).padStart(2, '0');
      const alumnoSlug = (alumnoTexto).replace(/\s+/g, '-');
      const base = `Practica_Manual_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}`;
      const nombreArchivo = alumnoSlug ? `${base}_${alumnoSlug}.pdf` : `${base}.pdf`;
      // Usar método nativo de jsPDF
      pdf2.save(nombreArchivo);
      
      // Generar blob solo para preview en modal
      const pdfBlob3 = pdf2.output('blob');
      
      setTimeout(() => { showDownloadModal('Práctica Manual', nombreArchivo, '', pdfBlob3); }, 500);
    } catch (error) {
      console.error('Error en práctica manual:', error);
      alert('Error generando PDF: ' + error.message);
    }
  }

  // ===== Utilidades compartidas para render HTML de reportes (para ambos modos) =====
  function normalizeLevelName(v){
    try {
      const map = { basico:'Básico', básico:'Básico', intermedio:'Intermedio', avanzado:'Avanzado', experto:'Experto', facil:'Básico', medio:'Intermedio', dificil:'Avanzado', '1':'Básico','2':'Intermedio','3':'Avanzado','4':'Experto' };
      const key = String(v||'').toLowerCase().trim();
      return map[key] || (v || '-');
    } catch(_) { return v || '-'; }
  }

  function isCorrectFlag(val){
    if (val === true) return true;
    try {
      const s = String(val ?? '').trim();
      const norm = (typeof WordFilters !== 'undefined' && WordFilters.normalizarBasico) ? WordFilters.normalizarBasico(s) : s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return norm === 'si' || norm === 'true' || norm === '1';
    } catch(_) { return false; }
  }

  function formatDuration(startISO, endISO){
    try {
      const startDate = new Date(startISO);
      const endDate = new Date(endISO);
      const ms = Math.max(0, endDate - startDate);
      const sec = Math.floor(ms/1000);
      const mm = Math.floor(sec/60); const ss = sec % 60;
      return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    } catch(_) { return ''; }
  }

  function parseMeaningParts(meaning){
    try {
      const SEP_SRC = ' — Fuente: ';
      const SEP_MORE = ' — Más: ';
      let s = String(meaning || '').trim();
      let src = '';
      let moreUrl = '';
      const iSrc = s.lastIndexOf(SEP_SRC);
      if (iSrc > -1) { src = s.slice(iSrc + SEP_SRC.length).trim(); s = s.slice(0, iSrc).trim(); }
      const iMore = s.lastIndexOf(SEP_MORE);
      if (iMore > -1) {
        const tail = s.slice(iMore + SEP_MORE.length).trim();
        const m = tail.match(/href="([^"]+)"/);
        moreUrl = m ? m[1] : (/^https?:\/\//.test(tail) ? tail : '');
        s = s.slice(0, iMore).trim();
      }
      return { text: s, source: src, moreUrl };
    } catch(_) { return { text: String(meaning||''), source: '', moreUrl: '' }; }
  }

  function createDefCardFromMeaning(meaningStr){
    const parts = parseMeaningParts(meaningStr);
    const card = document.createElement('div');
    card.setAttribute('data-collapsed', 'true');
    card.style.background = '#f9fafb';
    card.style.border = '1px solid #e5e7eb';
    card.style.borderRadius = '8px';
    card.style.padding = '8px 12px';
    card.style.marginTop = '6px';
    card.style.cursor = 'pointer';

    const content = document.createElement('div');
    content.style.display = '-webkit-box';
    content.style.webkitLineClamp = '2';
    content.style.webkitBoxOrient = 'vertical';
    content.style.overflow = 'hidden';
    content.style.whiteSpace = 'normal';
    content.textContent = parts.text || 'Definición no disponible';

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '12px';
    footer.style.alignItems = 'center';
    footer.style.marginTop = '6px';
    footer.style.fontSize = '12px';
    footer.style.color = 'var(--muted)';

    const src = document.createElement('span');
    src.textContent = 'Fuente: ' + (parts.source || '-');

    const more = document.createElement('a');
    more.style.color = '#0ea5e9';
    more.style.textDecoration = 'underline';
    if (parts.moreUrl) { more.href = parts.moreUrl; more.target = '_blank'; more.rel = 'noopener'; more.textContent = 'ver más'; }
    else { more.style.display = 'none'; }

    footer.appendChild(src);
    footer.appendChild(more);

    card.appendChild(content);
    card.appendChild(footer);

    card.addEventListener('click', (ev) => {
      if (ev.target === more) return;
      const collapsed = card.getAttribute('data-collapsed') !== 'false';
      if (collapsed) {
        card.setAttribute('data-collapsed','false');
        content.style.display = 'block';
        content.style.webkitLineClamp = 'initial';
      } else {
        card.setAttribute('data-collapsed','true');
        content.style.display = '-webkit-box';
        content.style.webkitLineClamp = '2';
      }
    });
    return card;
  }

  function renderReportSummaryAndList(targetElOrId, ctx){
    const el = (typeof targetElOrId === 'string') ? document.getElementById(targetElOrId) : targetElOrId;
    if (!el) return;
    const resultados = Array.isArray(ctx?.results) ? ctx.results : [];
    const total = resultados.length;
    const correctas = resultados.filter(r => isCorrectFlag(r.correcto)).length;
    const incorrectas = Math.max(0, total - correctas);
    const porcentaje = total ? Math.round((correctas / total) * 100) : 0;
    const nivelTxt = normalizeLevelName(ctx?.level || '-');
    const inicioTxt = ctx?.startISO ? new Date(ctx.startISO).toLocaleString() : new Date().toLocaleString();
    const finTxt = ctx?.endISO ? new Date(ctx.endISO).toLocaleString() : '';
    const durTxt = (ctx?.startISO && ctx?.endISO) ? formatDuration(ctx.startISO, ctx.endISO) : '';

    let html = '';
    html += '<div class="report-summary" style="font-size:14px; margin-bottom:10px;">';
    const nivelBadgeClass = (function(){ const n = String(nivelTxt||'').toLowerCase(); if (n.includes('básico')||n.includes('basico')||n==='1') return 'badge-level-basico'; if (n.includes('intermedio')||n==='2') return 'badge-level-intermedio'; if (n.includes('avanzado')||n==='3') return 'badge-level-avanzado'; if (n.includes('experto')||n==='4') return 'badge-level-experto'; return 'badge-off';})();
    const nivelBadge = nivelTxt && nivelTxt !== '-' ? `<span class="badge ${nivelBadgeClass}">${nivelTxt}</span>` : `<span class="badge badge-off">-</span>`;
    html += `<div><strong>Nivel:</strong> ${nivelBadge}</div>`;
    html += `<div><strong>Inicio de ejercicio:</strong> <span class="badge badge-off">${inicioTxt}</span></div>`;
    if (finTxt) html += `<div><strong>Fin de ejercicio:</strong> <span class="badge badge-off">${finTxt}</span></div>`;
    if (durTxt) html += `<div><strong>Duración total:</strong> <span class="badge badge-info">${durTxt}</span></div>`;
    html += `<div><strong>Total palabras:</strong> ${total}</div>`;
    html += `<div><strong>Correctas:</strong> ${correctas}</div>`;
    html += `<div><strong>Incorrectas:</strong> ${incorrectas}</div>`;
    html += `<div><strong>Porcentaje de acierto:</strong> ${porcentaje}%</div>`;
    if (ctx?.filterTxt != null) {
      const ftxt = (String(ctx.filterTxt).trim() || '-');
      const filtroBadge = ftxt !== '-' ? `<span class="badge badge-info">${ftxt}</span>` : `<span class="badge badge-off">-</span>`;
      html += `<div><strong>Letras a reforzar:</strong> ${filtroBadge}</div>`;
    }
    if (ctx?.refuerzoTxt != null) html += `<div><strong>Porcentaje de refuerzo:</strong> ${ctx.refuerzoTxt}${ctx.refuerzoTxt !== '-' ? '%' : ''}</div>`;
    if (ctx?.acentosObligatorios != null) {
      const badge = ctx.acentosObligatorios ? `<span class="badge badge-ok">Sí</span>` : `<span class="badge badge-off">No</span>`;
      html += `<div><strong>Acentos obligatorios:</strong> ${badge}</div>`;
    }
    if (ctx?.strictTxt != null) {
      const badge = ctx.strictTxt === 'Sí' ? `<span class="badge badge-ok">Sí</span>` : `<span class="badge badge-off">No</span>`;
      html += `<div><strong>Modo estricto:</strong> ${badge}</div>`;
    }
    html += '</div>';

    // Lista de palabras con significado
    html += '<h3 style="margin:10px 0 6px;">Palabras a reforzar</h3>';
    html += '<div style="font-size:14px;"><ul style="margin:6px 0 0 18px;">';
    resultados.forEach((r, idx) => {
      const ok = isCorrectFlag(r.correcto);
      const status = ok ? '<span class="badge badge-ok" style="margin-left:8px;">Correcta</span>' : '<span class="badge" style="margin-left:8px; background: var(--danger); color: #fff;">Incorrecta</span>';
      const colorWord = ok ? 'var(--success)' : 'var(--danger)';
      const defId = `def_${idx}`;
      const defBlock = `<div id="${defId}" style="font-size:12px; color: var(--muted); margin-top:4px;">Buscando significado...</div>`;
      html += `<li style="margin-bottom:8px;"><strong style="color:${colorWord};">${r.palabra || ''}</strong> ${status} — escrito: "<em>${r.respuesta || ''}</em>" ${defBlock}</li>`;
    });
    html += '</ul></div>';

    el.innerHTML = html;
    // Asíncronamente poblar significados si hay fetch disponible
    setTimeout(async () => {
      for (let i = 0; i < resultados.length; i++) {
        const r = resultados[i];
        const defEl = document.getElementById(`def_${i}`);
        if (!defEl) continue;
        try {
          let significado = getCachedMeaning(r.palabra) || '';
          if (!significado && typeof window.fetchSignificado === 'function') {
            significado = await window.fetchSignificado(r.palabra);
          }
          if (significado) {
            defEl.innerHTML = '';
            defEl.style.color = 'var(--text)';
            defEl.appendChild(createDefCardFromMeaning(significado));
          } else {
            defEl.textContent = 'Significado no encontrado';
            defEl.style.color = 'var(--muted)';
          }
        } catch(_) {
          defEl.textContent = 'Error al buscar significado'; defEl.style.color = 'var(--muted)';
        }
      }
    }, 50);
  }

  // Exponer globales
  window.cargarCacheSignificados = cargarCacheSignificados;
  window.guardarCacheSignificados = guardarCacheSignificados;
  window.getCachedMeaning = getCachedMeaning;
  window.sanitizeMeaning = sanitizeMeaning;
  window.fetchSignificado = fetchSignificado;
  window.extraerDefinicionBreve = extraerDefinicionBreve;
  window.showDownloadModal = showDownloadModal;
  window.markReportReady = markReportReady;
  window.closeDownloadModal = closeDownloadModal;
  window.openDownloadedFile = openDownloadedFile;
  try { window.ReportUtils = window.ReportUtils || { normalizeLevelName, isCorrectFlag, formatDuration, renderReportSummaryAndList }; } catch(_) {}
  // Alias estable del generador real para que otros scripts (app.js) lo invoquen sin riesgo de recursión
  // Nota: mantenemos también window.generarReportePDF por compatibilidad con el HTML
  window.__reportes_generarReportePDF = generarReportePDF;
  window.generarReportePDF = generarReportePDF;
  window.generarPracticaManual = generarPracticaManual;
})();
