// 📌 Listas de palabras por niveles
const palabrasPorNivel = {
  facil: ["gato", "perro", "mesa", "silla", "casa", "flor", "pan", "luz", "cielo", "sol"],
  medio: ["camión", "árbol", "fácil", "zapato", "ventana", "película", "corazón", "fútbol", "música", "avión"],
  dificil: ["otorrinolaringólogo", "murciélago", "paralelepípedo", "idiosincrasia", "hipopótamo", 
            "circunferencia", "electrodoméstico", "extraordinario", "biblioteca", "metamorfosis"]
};

// 📦 Config de diccionario externo (HermitDave es_50k)
const WORDS_URL = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt";
const CACHE_KEY = "es_words_50k_cache_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
// Lista negra básica de términos a excluir por defecto (no considerados léxico escolar/RAE en este contexto)
const EXCLUDE_DEFAULT = new Set([
  'allah'
]);

// Nivel dinámico construido desde diccionario externo (cuando esté listo)
let palabrasPorNivelDinamico = null;
let cargandoDiccionario = false;

let palabras = [];
let indice = 0;
let aciertos = 0;
let currentNivel = null;
let resultsLog = []; // {fechaISO, nivel, palabra, respuesta, correcto, tiempoMs}

// --- Hunspell (Typo.js) modo estricto ---
let typoEs = null;            // instancia Typo
let hunspellLoading = false;  // bandera de carga
let hunspellReady = null;     // Promise

const HUNS_AFF_KEY = 'hunspell_es_ANY_aff_v1';
const HUNS_DIC_KEY = 'hunspell_es_ANY_dic_v1';
const HUNS_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

async function ensureHunspellES_ANY() {
  if (typoEs) return typoEs;
  if (hunspellReady) return hunspellReady;
  hunspellReady = (async () => {
    // Intentar cache local
    let aff = null, dic = null;
    try {
      const affRaw = localStorage.getItem(HUNS_AFF_KEY);
      const dicRaw = localStorage.getItem(HUNS_DIC_KEY);
      const now = Date.now();
      if (affRaw && dicRaw) {
        const a = JSON.parse(affRaw); const d = JSON.parse(dicRaw);
        if (a && d && (now - a.ts < HUNS_TTL_MS) && (now - d.ts < HUNS_TTL_MS)) {
          aff = a.data; dic = d.data;
        }
      }
    } catch(_) {}

// --- Utilidades de diagnóstico ---
function diagnosticoTTS() {
  try {
    const voces = (typeof speechSynthesis !== 'undefined') ? speechSynthesis.getVoices() : [];
    console.log('[TTS] voces:', voces?.length, voces);
    console.log('[TTS] voicesReady:', voicesReady, 'ttsUnlocked:', ttsUnlocked);
    alert(`Diagnóstico TTS\nVoces: ${voces?.length || 0}\nvoicesReady: ${voicesReady}\nttsUnlocked: ${ttsUnlocked}`);
  } catch (e) { console.log('diag error', e); }
}
function probarVoz() {
  try { unlockTTS(); } catch(_) {}
  try { reproducirPalabra(true); } catch(_) {}
}

    if (!aff || !dic) {
      // Descargar desde LibreOffice/dictionaries (es_ANY)
      const urlAff = 'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/es/es_ANY.aff';
      const urlDic = 'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/es/es_ANY.dic';
      const [rAff, rDic] = await Promise.all([fetch(urlAff), fetch(urlDic)]);
      if (!rAff.ok || !rDic.ok) throw new Error('No se pudo cargar Hunspell es_ANY');
      aff = await rAff.text();
      dic = await rDic.text();
      try {
        localStorage.setItem(HUNS_AFF_KEY, JSON.stringify({ ts: Date.now(), data: aff }));
        localStorage.setItem(HUNS_DIC_KEY, JSON.stringify({ ts: Date.now(), data: dic }));
      } catch(_) {}
    }
    typoEs = new Typo('es_ANY', aff, dic, { platform: 'any' });
    return typoEs;
  })();
  return hunspellReady;
}

async function checkSpanish(word) {
  try {
    const t = await ensureHunspellES_ANY();
    if (!t) return true; // si falla, no bloquear
    // Probar tal cual, en minúsculas y capitalizada (nombres propios)
    const w = String(word || '').trim();
    if (!w) return false;
    if (t.check(w)) return true;
    const low = w.toLowerCase();
    if (low !== w && t.check(low)) return true;
    const cap = w.charAt(0).toUpperCase() + w.slice(1);
    if (cap !== w && t.check(cap)) return true;
    return false;
  } catch(_) { return true; }
}

// Refresca el diccionario Hunspell (borra cache y fuerza nueva descarga en el próximo uso)
function actualizarDiccionarioHunspell() {
  try {
    localStorage.removeItem(HUNS_AFF_KEY);
    localStorage.removeItem(HUNS_DIC_KEY);
  } catch(_) {}
  // Reset de instancias para que se vuelva a cargar
  typoEs = null;
  hunspellReady = null;
  try { alert('Diccionario actualizado. Se recargará al iniciar el próximo ejercicio en modo estricto.'); } catch(_) {}
}

// Obtiene un resumen breve desde Wikipedia en español usando el endpoint REST v1.
// Devuelve la descripción/summary si existe.
async function fetchDesdeWikipediaEs(titulo) {
  try {
    const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    // Campos posibles: description, extract
    if (data && typeof data.extract === 'string' && data.extract.trim().length > 0) {
      // Tomar solo la primera oración para brevedad
      const txt = data.extract.trim();
      const first = txt.split(/(?<=\.)\s+/)[0];
      return first || txt;
    }
    if (data && typeof data.description === 'string' && data.description.trim().length > 0) {
      return data.description.trim();
    }
    return null;
  } catch(_) { return null; }
}

// --- PDF ---
async function generarReportePDF() {
  if (!window.jspdf) {
    try { alert('No se pudo cargar el generador de PDF.'); } catch(_) {}
    return;
  }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'pt', 'a4');
  try {
    const alumno = (document.getElementById('alumno')?.value || '').trim();
    const curso = (document.getElementById('curso')?.value || '').trim();
    const nivel = currentNivel || '-';
    const filtroLetras = (document.getElementById('filtroLetras')?.value || '').trim();
    const todas = document.getElementById('todasLasLetras')?.checked ? 'Sí' : 'No';
    const cant = (document.getElementById('cantidad')?.value || '').trim() || 'todas';
    const total = Array.isArray(resultsLog) ? resultsLog.length : 0;
    const correctas = Array.isArray(resultsLog) ? resultsLog.filter(r => r.correcto === 'Sí').length : 0;
    const porcentaje = total ? Math.round((correctas / total) * 100) : 0;
    const fechaSesion = sessionStartISO ? new Date(sessionStartISO).toLocaleString() : new Date().toLocaleString();

    // Página 1: Resumen (similar a hoja "Resumen")
    pdf.setFontSize(18);
    pdf.setTextColor(15, 99, 245);
    pdf.text('Práctica de Ortografía - Resumen', 40, 50);
    pdf.setTextColor(0,0,0);
    pdf.setFontSize(11);
    if (pdf.autoTable) {
      const head = [['Campo', 'Valor']];
      const body = [
        ['Fecha', fechaSesion],
        ['Nivel', nivel],
        ['Total palabras', String(total)],
        ['Aciertos', String(correctas)],
        ['Porcentaje', porcentaje + '%'],
        ['Filtro letras', filtroLetras || '-'],
        ['Requiere todas', todas],
        ['Cantidad solicitada', String(cant)],
        ['Alumno', alumno || '-'],
        ['Curso/Grupo', curso || '-'],
      ];
      pdf.autoTable({
        startY: 70,
        head,
        body,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [15, 99, 245], halign: 'center', valign: 'middle', textColor: 255 },
        columnStyles: { 0: { cellWidth: 160 }, 1: { cellWidth: 'auto' } },
        margin: { left: 40, right: 40 }
      });
    } else {
      pdf.setFontSize(12);
      pdf.text(`Alumno: ${alumno || '-'}`, 40, 80);
      pdf.text(`Curso/Grupo: ${curso || '-'}`, 40, 100);
      pdf.text(`Nivel: ${nivel}`, 40, 120);
      pdf.text(`Fecha: ${fechaSesion}`, 40, 140);
      pdf.text(`Total: ${total}  Correctas: ${correctas}  Acierto: ${porcentaje}%`, 40, 160);
    }

    // Página 2: Detalle (similar a hoja "Detalle")
    if (Array.isArray(resultsLog) && resultsLog.length > 0 && pdf.autoTable) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text('Detalle de intentos', 40, 40);
      pdf.setFontSize(10);
      pdf.text(`Alumno: ${alumno || '-'}  ·  Curso/Grupo: ${curso || '-'}  ·  Nivel: ${nivel}`, 40, 58);

      const head2 = [[ 'Fecha','Nivel','Palabra','Respuesta','Correcto','Tiempo (ms)','Significado' ]];
      const body2 = resultsLog.map(r => [
        r.fechaISO,
        r.nivel,
        r.palabra,
        r.respuesta,
        r.correcto,
        String(r.tiempoMs ?? ''),
        getCachedMeaning(r.palabra) || ''
      ]);
      pdf.autoTable({
        startY: 70,
        head: head2,
        body: body2,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 99, 245], halign: 'center', valign: 'middle', textColor: 255 },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 30 },
          2: { cellWidth: 70 },
          3: { cellWidth: 70 },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 40, halign: 'right' },
          6: { cellWidth: 'auto' }
        },
        margin: { left: 40, right: 30 }
      });
    }

    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    const alumnoSlug = (alumno).replace(/[^\w\-]+/g,'_');
    const cursoSlug = (curso).replace(/[^\w\-]+/g,'_');
    const meta = [alumnoSlug, cursoSlug].filter(Boolean).join('_');
    const base = `Reporte_Final_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}`;
    pdf.save(meta ? `${base}_${meta}.pdf` : `${base}.pdf`);
  } catch (e) {
    console.error('Fallo al generar PDF', e);
    try { alert('Ocurrió un error al generar el PDF.'); } catch(_) {}
  }
}

// Configurar que Enter avance al siguiente campo en la página de configuración
function configurarEnterSiguiente() {
  const order = [
    'alumno',
    'curso',
    'filtroLetras',
    'cantidad',
    'todasLasLetras',
    'btnNext',
  ];
  const getEl = id => document.getElementById(id);
  const focusIdx = (idx) => {
    const id = order[idx];
    const el = getEl(id);
    if (!el) return;
    if (id === 'btnNext') {
      el.focus();
      return;
    }
    el.focus();
    if (el.select) { try { el.select(); } catch(_) {} }
  };
  order.forEach((id, i) => {
    const el = getEl(id);
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      // Si estamos en el último, ejecutar siguiente
      if (id === 'btnNext') {
        goNextFromConfig();
        return;
      }
      // Si estamos en el checkbox, pasar al botón Siguiente
      if (id === 'todasLasLetras') {
        const btn = getEl('btnNext');
        if (btn) btn.focus();
        return;
      }
      // Foco al siguiente elemento disponible
      let j = i + 1;
      while (j < order.length) {
        const nextEl = getEl(order[j]);
        if (nextEl) { focusIdx(j); break; }
        j++;
      }
    });
  });
}

async function fetchDesdeWikcionario(palabra) {
  const url = `https://es.wiktionary.org/w/api.php?action=query&prop=extracts&exsentences=2&explaintext=1&format=json&origin=*&titles=${encodeURIComponent(palabra)}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  if (!j.query || !j.query.pages) return null;
  const pages = j.query.pages;
  const firstKey = Object.keys(pages)[0];
  if (!firstKey || firstKey === '-1') return null;
  const extract = (pages[firstKey]?.extract || '').trim();
  if (!extract) return null;
  // Tomar la primera línea/sentencia breve
  const linea = extract.split('\n').find(s => s && !/^\s*=/.test(s));
  if (!linea) return null;
  // Limpiar prefijos/plantillas comunes
  return linea.replace(/^\s*\(.*?\)\s*/, '').trim();
}
let sessionStartISO = null;

// Control del estado habilitado del botón "Siguiente" en la página de configuración
function updateNextEnabled() {
  const alumnoVal = (document.getElementById('alumno')?.value || '').trim();
  const cursoVal = (document.getElementById('curso')?.value || '').trim();
  const btn = document.getElementById('btnNext');
  if (!btn) return;
  const ready = !!(alumnoVal && cursoVal);
  btn.disabled = !ready;
  // Estilo: azul cuando está listo (quita ghost), gris/ghost cuando no
  if (ready) {
    btn.classList.remove('btn-ghost');
  } else {
    if (!btn.classList.contains('btn-ghost')) btn.classList.add('btn-ghost');
  }
}
let lastStartTime = 0;
const ERROR_BANK_KEY = 'dictado_error_bank_v1'; // base key
// Construye un key por alumno/curso para que cada estudiante tenga su propio banco de errores
function getAlumnoCursoId() {
  const alumno = (document.getElementById('alumno')?.value || '').trim();
  const curso  = (document.getElementById('curso')?.value || '').trim();
  const a = alumno ? normalizar(alumno) : 'anon';
  const c = curso ? normalizar(curso) : 'sin-curso';
  return `${a}|${c}`;
}
function getErrorBankKey() {
  return `${ERROR_BANK_KEY}:${getAlumnoCursoId()}`;
}

// --- Gestión de TTS (voz, cola y estabilidad) ---
let selectedVoice = null;
let voicesReady = false;
let ttsRetry = false; // reintento si el audio se corta demasiado rápido

function elegirVozEspanol() {
  const voces = speechSynthesis.getVoices();
  if (!voces || voces.length === 0) return null;
  // Priorizar voces españolas con nombre más "humano"
  const prefer = [
    /es-MX/i,
    /es-ES/i,
    /Spanish \(Mexico\)/i,
    /Spanish \(Spain\)/i,
  ];
  for (const rx of prefer) {
    const v = voces.find(voice => rx.test(voice.lang) || rx.test(voice.name));
    if (v) return v;
  }
  // fallback a cualquier voz en español
  const anyEs = voces.find(v => /es-/i.test(v.lang));
  return anyEs || voces[0];
}

function initVoces() {
  // Algunos navegadores requieren esperar el evento voiceschanged
  const intentar = () => {
    selectedVoice = elegirVozEspanol();
    voicesReady = !!selectedVoice;
    try { updateEnableAudioButton(); } catch(_) {}
  };
  intentar();
  if (!voicesReady) {
    window.speechSynthesis.onvoiceschanged = () => {
      intentar();
      try { updateEnableAudioButton(); } catch(_) {}
    };
  }
}
initVoces();

// --- TTS móvil mejorado ---
let ttsUnlocked = false;
let isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function updateEnableAudioButton() {
  try {
    const btn = document.getElementById('btnEnableAudio');
    if (!btn) return;
    // En móvil, mostrar hasta que esté completamente desbloqueado
    const shouldShow = isMobile && (!ttsUnlocked || !voicesReady);
    btn.style.display = shouldShow ? '' : 'none';
  } catch(_) {}
}

function unlockTTS() {
  if (ttsUnlocked) return Promise.resolve();
  
  return new Promise((resolve) => {
    try {
      // Forzar carga de voces primero
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Esperar a que se carguen las voces
        speechSynthesis.onvoiceschanged = () => {
          selectedVoice = elegirVozEspanol();
          voicesReady = !!selectedVoice;
          updateEnableAudioButton();
        };
      }
      
      // Cancelar y reanudar
      speechSynthesis.cancel();
      speechSynthesis.resume();
      
      // Test utterance muy simple
      const testMsg = new SpeechSynthesisUtterance('test');
      testMsg.volume = 0.01; // muy bajo pero audible
      testMsg.rate = 2.0; // rápido
      testMsg.lang = 'es-ES';
      
      testMsg.onstart = () => {
        ttsUnlocked = true;
        updateEnableAudioButton();
        speechSynthesis.cancel(); // cancelar el test
        resolve();
      };
      
      testMsg.onerror = () => {
        ttsUnlocked = true; // asumir que está ok
        updateEnableAudioButton();
        resolve();
      };
      
      testMsg.onend = () => {
        ttsUnlocked = true;
        updateEnableAudioButton();
        resolve();
      };
      
      // Intentar hablar
      speechSynthesis.speak(testMsg);
      
      // Timeout de seguridad
      setTimeout(() => {
        if (!ttsUnlocked) {
          ttsUnlocked = true;
          updateEnableAudioButton();
          resolve();
        }
      }, 1000);
      
    } catch(e) {
      console.log('TTS unlock error:', e);
      ttsUnlocked = true;
      updateEnableAudioButton();
      resolve();
    }
  });
}

// Auto-unlock en primer gesto
if (isMobile) {
  const autoUnlock = () => {
    unlockTTS();
    document.removeEventListener('touchstart', autoUnlock, { capture: true });
    document.removeEventListener('click', autoUnlock, { capture: true });
  };
  document.addEventListener('touchstart', autoUnlock, { capture: true, passive: true });
  document.addEventListener('click', autoUnlock, { capture: true, passive: true });
}

// --- Banco de errores ---
function cargarBancoErrores() {
  try {
    const raw = localStorage.getItem(getErrorBankKey());
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}
function guardarBancoErrores(bank) {
  try { localStorage.setItem(getErrorBankKey(), JSON.stringify(bank)); } catch (_) {}
}
function registrarError(palabra) {
  const bank = cargarBancoErrores();
  const key = normalizar(palabra);
  const prev = bank[key] || { count: 0, lastSeen: 0 };
  bank[key] = { count: prev.count + 1, lastSeen: Date.now() };
  guardarBancoErrores(bank);
}

// Eliminar acentos y pasar a minúsculas
function normalizar(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Carga/caché del diccionario
async function obtenerListaFrecuencias() {
  try {
    const cacheRaw = localStorage.getItem(CACHE_KEY);
    if (cacheRaw) {
      const { ts, data } = JSON.parse(cacheRaw);
      if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // ignorar errores de parseo
  }

  const resp = await fetch(WORDS_URL);
  if (!resp.ok) throw new Error("No se pudo descargar la lista de palabras");
  const text = await resp.text();
  // Formato: "palabra frecuencia" por línea
  const lines = text.split(/\r?\n/);
  const data = [];
  const visto = new Set();
  const reEspanol = /^[a-záéíóúüñ]+$/; // solo letras del español en minúsculas
  const reVocal = /[aeiouáéíóúü]/;
  const reConsonante = /[bcdfghjklmnñpqrstvwxyz]/;
  // Heurísticas conservadoras para evitar préstamos y grafías no propias del español estándar
  const reFinalH = /h$/;                 // casi inexistente en español estándar
  const reForeignDigraphs = /(kh|sh|th|ph|gh)/; // comunes en préstamos
  for (const line of lines) {
    if (!line) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    let palabra = parts[0];
    const freq = Number(parts[1]);
    if (!palabra || !isFinite(freq)) continue;
    // Normalizar a minúsculas conservando acentos
    palabra = palabra.toLowerCase();
    // Filtrar: solo palabras del español (sin números, signos, etc.)
    if (!reEspanol.test(palabra)) continue;
    // Excluir tokens no léxicos: demasiado cortos
    if (palabra.length < 2) continue;
    // Lista negra por defecto
    if (EXCLUDE_DEFAULT.has(palabra)) continue;
    // Evitar terminaciones y dígrafos poco españoles
    if (reFinalH.test(palabra)) continue;
    if (reForeignDigraphs.test(palabra)) continue;
    // Debe tener al menos una vocal y una consonante (evita solo vocales o solo consonantes)
    if (!reVocal.test(palabra) || !reConsonante.test(palabra)) continue;
    // Evitar cadenas de la misma letra repetida (p.ej. "aaaa", "ssss")
    if (/^(.)\1+$/.test(palabra)) continue;
    if (visto.has(palabra)) continue;
    visto.add(palabra);
    data.push({ palabra, freq });
  }
  // Ordenar por mayor frecuencia primero
  data.sort((a, b) => b.freq - a.freq);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
  return data;
}

async function prepararNivelesDinamicos() {
  if (palabrasPorNivelDinamico || cargandoDiccionario) return; // ya listo o en progreso
  cargandoDiccionario = true;
  try {
    const data = await obtenerListaFrecuencias();
    // Construir niveles por rangos de ranking
    // fácil: top 2000, medio: 2001-10000, difícil: 10001-20000
    const maxConsideradas = 20000; // limita el tamaño en memoria
    const top = data.slice(0, maxConsideradas).map(d => d.palabra);
    const facil = top.slice(0, 2000);
    const medio = top.slice(2000, 10000);
    const dificil = top.slice(10000);
    palabrasPorNivelDinamico = { facil, medio, dificil };
  } catch (e) {
    // si falla, mantener null para usar la base local
    console.warn("Fallo al preparar niveles dinámicos:", e);
  } finally {
    cargandoDiccionario = false;
  }
}

// Lanzar preparación en segundo plano al cargar la página
(function init() {
  prepararNivelesDinamicos();
  cargarParametros();
  // Limpiar posibles valores inválidos en caché de significados (p.ej., '1')
  try {
    const cache = cargarCacheSignificados();
    let changed = false;
    for (const k in cache) {
      if (!cache.hasOwnProperty(k)) continue;
      const cleaned = sanitizeMeaning(cache[k]?.def);
      if (!cleaned) { delete cache[k]; changed = true; }
      else if (cleaned !== cache[k].def) { cache[k].def = cleaned; changed = true; }
    }
    if (changed) guardarCacheSignificados(cache);
  } catch(_) {}
  // Refrescar meta inicial (se mostrará solo en page-game)
  refreshMetaAlumnoCurso();
  // Guardar al cambiar parámetros
  ["alumno","curso","filtroLetras","cantidad","todasLasLetras"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const ev = (el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(ev, guardarParametros);
    // Mantener meta actualizada al escribir alumno/curso
    if (id === 'alumno' || id === 'curso') {
      el.addEventListener('input', () => refreshMetaAlumnoCurso());
    }
  });
  // Limpiar avisos de validación al escribir
  const alumnoEl = document.getElementById('alumno');
  const cursoEl = document.getElementById('curso');
  const clearFieldError = (el, helpId) => {
    if (!el) return;
    el.addEventListener('input', () => {
      if ((el.value || '').trim().length > 0) {
        el.classList.remove('input-error');
        const h = document.getElementById(helpId);
        if (h) h.style.display = 'none';
      }
      updateNextEnabled();
    });
  };
  clearFieldError(alumnoEl, 'alumnoError');
  clearFieldError(cursoEl, 'cursoError');
  // Habilitar/Deshabilitar el botón Siguiente dinámicamente
  updateNextEnabled();
  // Navegación con Enter entre campos de configuración
  configurarEnterSiguiente();
  // Enter en el campo de respuesta dispara "Comprobar"
  const resp = document.getElementById('respuesta');
  if (resp) {
    resp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = resp.value.trim();
        if (val.length > 0) {
          comprobar();
        } else {
          reproducirPalabra();
        }
      }
    });
  }
  // Página inicial
  goToPage('page-config');
  // Enfocar alumno al cargar
  const alumnoInit = document.getElementById('alumno');
  if (alumnoInit) { alumnoInit.focus(); try { alumnoInit.select(); } catch (_) {} }
})();

function goToPage(pageId) {
  const ids = ['page-config','page-game','page-report'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', id === pageId);
  });
  // Si navegamos al reporte, asegurarnos de mostrarlo
  if (pageId === 'page-report') {
    const rep = document.getElementById('reporteFinal');
    if (rep) rep.style.display = 'block';
  }
  // Al entrar a configuración, enfocar Alumno
  if (pageId === 'page-config') {
    const a = document.getElementById('alumno');
    if (a) { a.focus(); try { a.select(); } catch (_) {} }
  }
  // Mostrar la meta en juego y reporte
  refreshMetaAlumnoCurso(pageId === 'page-game' || pageId === 'page-report');
}

// Validar datos en la primera ventana antes de avanzar
function goNextFromConfig() {
  const alumnoEl = document.getElementById('alumno');
  const cursoEl = document.getElementById('curso');
  const alumnoVal = (alumnoEl?.value || '').trim();
  const cursoVal = (cursoEl?.value || '').trim();

  // Limpiar estado previo
  alumnoEl?.classList.remove('input-error');
  cursoEl?.classList.remove('input-error');
  const aErr = document.getElementById('alumnoError'); if (aErr) aErr.style.display = 'none';
  const cErr = document.getElementById('cursoError'); if (cErr) cErr.style.display = 'none';

  if (!alumnoVal || !cursoVal) {
    const faltantes = [];
    if (!alumnoVal) faltantes.push('Alumno');
    if (!cursoVal) faltantes.push('Curso/Grupo');
    const msg = `Falta completar: ${faltantes.join(' y ')}.`;
    try { alert(msg); } catch(_) {}
    if (!alumnoVal) {
      alumnoEl?.classList.add('input-error');
      const h = document.getElementById('alumnoError');
      if (h) h.style.display = 'block';
      alumnoEl?.focus();
    }
    if (!cursoVal) {
      if (alumnoVal) cursoEl?.focus();
      cursoEl?.classList.add('input-error');
      const h2 = document.getElementById('cursoError');
      if (h2) h2.style.display = 'block';
    }
    return; // no avanzar
  }

  // Guardar y avanzar
  guardarParametros();
  // Al avanzar, asegurar que se muestre la meta
  refreshMetaAlumnoCurso();
  // Siempre iniciar una NUEVA sesión
  try {
    sessionStartISO = new Date().toISOString();
    palabras = [];
    indice = 0;
    aciertos = 0;
    currentNivel = null;
    resultsLog = [];
  } catch(_) {}

  // Limpiar UI de juego y reporte
  try {
    const juego = document.getElementById('juego');
    const resultado = document.getElementById('resultado');
    const marcador = document.getElementById('marcador');
    const respuesta = document.getElementById('respuesta');
    const btnToReport = document.getElementById('btnToReport');
    if (resultado) resultado.textContent = '';
    if (marcador) marcador.textContent = '';
    if (respuesta) respuesta.value = '';
    if (btnToReport) btnToReport.style.display = 'none';
    if (juego) juego.style.display = 'none';
    const rep0 = document.getElementById('reporteFinal');
    if (rep0) { rep0.innerHTML = ''; rep0.style.display = 'none'; }
  } catch(_) {}

  // Rehabilitar botones de nivel y quitar selección previa
  try {
    const bF = document.getElementById('btnNivelFacil');
    const bM = document.getElementById('btnNivelMedio');
    const bD = document.getElementById('btnNivelDificil');
    [bF,bM,bD].forEach(b => { if (b) { b.disabled = false; b.classList.remove('btn-selected'); } });
  } catch(_) {}

  guardarParametros();
  goToPage('page-game');
  refreshMetaAlumnoCurso(true);
}

// Mostrar debajo del título el Alumno y Curso/Grupo cuando corresponda
function refreshMetaAlumnoCurso(forceVisible = null) {
  const meta = document.getElementById('metaAlumnoCurso');
  if (!meta) return;
  const alumno = (document.getElementById('alumno')?.value || '').trim();
  const curso  = (document.getElementById('curso')?.value || '').trim();
  // Etiqueta de nivel legible
  const nivelMap = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
  const nivelTxt = currentNivel ? (nivelMap[currentNivel] || currentNivel) : null;
  const partes = [
    `Alumno: ${alumno || '-'}`,
    `Curso/Grupo: ${curso || '-'}`,
  ];
  if (nivelTxt) partes.push(`Nivel: ${nivelTxt}`);
  // En reporte, incluir fecha/hora de la sesión si existe
  const enReporte = !!document.getElementById('page-report')?.classList.contains('active');
  if (enReporte && sessionStartISO) {
    try {
      const dt = new Date(sessionStartISO);
      partes.push(`Fecha: ${dt.toLocaleString()}`);
    } catch(_) {}
  }
  const texto = partes.join(' · ');
  meta.textContent = texto;
  // Determinar visibilidad
  let visible;
  if (forceVisible === null) {
    const enJuego = !!document.getElementById('page-game')?.classList.contains('active');
    const enReporte2 = !!document.getElementById('page-report')?.classList.contains('active');
    visible = enJuego || enReporte2;
  } else {
    visible = !!forceVisible;
  }
  meta.style.display = visible ? '' : 'none';
}

async function iniciarJuego(nivel) {
  // Ir a página de juego y ocultar inmediatamente el reporte de refuerzo
  goToPage('page-game');
  // Deshabilitar botones de nivel y marcar seleccionado
  try {
    const bF = document.getElementById('btnNivelFacil');
    const bM = document.getElementById('btnNivelMedio');
    const bD = document.getElementById('btnNivelDificil');
    [bF,bM,bD].forEach(b => { if (b) { b.disabled = true; b.classList.remove('btn-selected'); } });
    const map = { facil: bF, medio: bM, dificil: bD };
    if (map[nivel]) map[nivel].classList.add('btn-selected');
  } catch(_) {}
  try {
    const rep0 = document.getElementById('reporteFinal');
    if (rep0) { rep0.innerHTML = ''; rep0.style.display = 'none'; }
  } catch (_) {}
  // Marcar inicio de sesión
  sessionStartISO = new Date().toISOString();
  // Validar datos del alumno y curso antes de iniciar
  const alumnoEl2 = document.getElementById('alumno');
  const cursoEl2 = document.getElementById('curso');
  const alumnoVal = (alumnoEl2?.value || '').trim();
  const cursoVal = (cursoEl2?.value || '').trim();
  if (!alumnoVal || !cursoVal) {
    const faltantes = [];
    if (!alumnoVal) faltantes.push('Alumno');
    if (!cursoVal) faltantes.push('Curso/Grupo');
    const msg = `Falta completar: ${faltantes.join(' y ')}.`;
    // Mensaje emergente
    try { alert(msg); } catch(_) {}
    const res = document.getElementById('resultado');
    if (res) {
      res.className = 'incorrecto';
      res.innerHTML = msg + ' Por favor, complétalos para iniciar la lección.';
    }
    // Enfocar el primer campo faltante
    if (!alumnoVal) {
      alumnoEl2?.focus();
      alumnoEl2?.classList.add('input-error');
      const h = document.getElementById('alumnoError');
      if (h) h.style.display = 'block';
    }
    if (!cursoVal) {
      if (alumnoVal) cursoEl2?.focus();
      cursoEl2?.classList.add('input-error');
      const h2 = document.getElementById('cursoError');
      if (h2) h2.style.display = 'block';
    }
    // Asegurar que el panel de juego no quede visible
    document.getElementById('juego').style.display = 'none';
    document.getElementById('marcador').innerHTML = '';
    return;
  }
  // Si están completos, limpiar posibles estados previos
  document.getElementById('alumno')?.classList.remove('input-error');
  document.getElementById('curso')?.classList.remove('input-error');
  const aErr = document.getElementById('alumnoError'); if (aErr) aErr.style.display = 'none';
  const cErr = document.getElementById('cursoError'); if (cErr) cErr.style.display = 'none';
  // Asegurar que si ya se descargó, usemos dinámico; si no, usar base local
  if (!palabrasPorNivelDinamico && !cargandoDiccionario) {
    // intentar preparar rápidamente (puede ya estar en caché)
    await prepararNivelesDinamicos();
  }
  const fuente = palabrasPorNivelDinamico || palabrasPorNivel;
  // Base por nivel
  let base = [...fuente[nivel]];
  currentNivel = nivel;
  guardarParametros(); // asegurar persistencia al iniciar
  // Actualizar meta para que muestre también el nivel
  refreshMetaAlumnoCurso(true);
  // Mostrar el panel del juego
  const juego = document.getElementById('juego');
  if (juego) juego.style.display = '';

  // Leer parámetros de UI
  const rawFiltro = document.getElementById("filtroLetras").value || "";
  const matchAll = document.getElementById("todasLasLetras").checked;
  const cantidadInput = parseInt(document.getElementById("cantidad").value, 10);

  // Normalizar filtro: lista de fragmentos/letras, sin vacíos
  const filtros = rawFiltro
    .split(/[\,\s]+/)
    .map(f => normalizar(f))
    .filter(f => f.length > 0);

  // Excluir lista negra por defecto
  base = base.filter(p => !EXCLUDE_DEFAULT.has(normalizar(p)));

  // Filtrar según letras (si hay filtros)
  let candidatas = base;
  if (filtros.length > 0) {
    candidatas = base.filter(p => {
      const pn = normalizar(p);
      if (matchAll) {
        return filtros.every(f => pn.includes(f));
      } else {
        return filtros.some(f => pn.includes(f));
      }
    });
  }

  // Modo estricto: validar con Hunspell es_ANY
  try {
    const strict = !!document.getElementById('strictMode')?.checked;
    if (strict) {
      await ensureHunspellES_ANY();
      const filtered = [];
      for (const w of candidatas) {
        // Evitar bloquear por fallos de red: checkSpanish maneja errores devolviendo true
        if (await checkSpanish(w)) filtered.push(w);
      }
      candidatas = filtered;
      // Notificaciones si queda muy poco o nada
      if (candidatas.length === 0) {
        try { alert('Modo estricto: no hay palabras válidas tras el filtro. Ajusta los filtros de letras, la cantidad, o desactiva el modo estricto.'); } catch(_) {}
      } else if (candidatas.length < 5) {
        try { alert('Modo estricto: muy pocas palabras válidas. Considera relajar filtros o desactivar temporalmente el modo estricto.'); } catch(_) {}
      }
    }
  } catch(_) {}

  // Si no hay candidatas, avisar y salir
  if (candidatas.length === 0) {
    document.getElementById("juego").style.display = "none";
    document.getElementById("resultado").className = "incorrecto";
    document.getElementById("resultado").innerHTML = "No hay palabras que cumplan el filtro en este nivel.";
    document.getElementById("marcador").innerHTML = "";
    const rep = document.getElementById('reporteFinal');
    if (rep) { rep.innerHTML = ""; rep.style.display = 'none'; }
    return;
  }

  // Mezclar aleatoriamente (Fisher–Yates shuffle)
  for (let i = candidatas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
  }

  // Cantidad: si el usuario ingresa un número válido, usarlo tal cual;
  // si deja vacío, usar 50 (o menos si no hay tantas candidatas)
  const tieneCantidad = Number.isInteger(cantidadInput) && cantidadInput > 0;
  const cantidad = tieneCantidad ? cantidadInput : Math.min(50, candidatas.length);

  // Refuerzo adaptativo: priorizar palabras con errores pasados
  const bank = cargarBancoErrores();
  const errDisponibles = candidatas
    .filter(p => bank[normalizar(p)] && bank[normalizar(p)].count > 0)
    .sort((a, b) => (bank[normalizar(b)].count - bank[normalizar(a)].count));
  const reforzarObjetivo = Math.min(Math.max(Math.round(cantidad * 0.4), 0), errDisponibles.length);
  const seleccion = [];
  const usados = new Set();
  for (let i = 0; i < reforzarObjetivo; i++) {
    const w = errDisponibles[i];
    seleccion.push(w);
    usados.add(normalizar(w));
  }
  for (const w of candidatas) {
    if (seleccion.length >= cantidad) break;
    const key = normalizar(w);
    if (!usados.has(key)) {
      seleccion.push(w);
      usados.add(key);
    }
  }
  // Mezclar selección final para distribuir aleatoriamente las reforzadas entre el resto
  for (let i = seleccion.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seleccion[i], seleccion[j]] = [seleccion[j], seleccion[i]];
  }
  palabras = seleccion;

  indice = 0;
  aciertos = 0;
  resultsLog = [];
  document.getElementById("resultado").innerHTML = "";
  document.getElementById("marcador").innerHTML = "";
  // Inicializar barra de progreso
  try {
    const total = palabras.length;
    const fill = document.getElementById('progressFill');
    const txt = document.getElementById('progressText');
    if (txt) txt.textContent = `0/${total}`;
    if (fill) fill.style.width = total ? `0%` : '0%';
  } catch(_) {}
  document.getElementById("juego").style.display = "block";

  // Estabilizar TTS para la primera reproducción: esperar voces y pequeño retraso
  try { speechSynthesis.cancel(); } catch (_) {}
  try { speechSynthesis.resume(); } catch (_) {}
  const startFirst = () => {
    // Dar tiempo extra antes de la primera palabra
    setTimeout(() => {
      // Enfocar input antes de hablar
      const input = document.getElementById('respuesta');
      if (input) input.focus();
      reproducirPalabra();
    }, 700);
  };
  if (!voicesReady) {
    // Esperar a que se carguen las voces (máx ~1.6s)
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if (voicesReady || attempts > 8) {
        clearInterval(iv);
        startFirst();
      }
    }, 200);
  } else {
    startFirst();
  }
}

// Persistencia de parámetros en localStorage
const PARAMS_KEY = 'dictado_params_v1';
function guardarParametros() {
  const params = {
    alumno: document.getElementById('alumno')?.value || '',
    curso: document.getElementById('curso')?.value || '',
    filtroLetras: document.getElementById('filtroLetras')?.value || '',
    cantidad: document.getElementById('cantidad')?.value || '',
    todas: !!document.getElementById('todasLasLetras')?.checked,
    strict: !!document.getElementById('strictMode')?.checked,
  };
  try { localStorage.setItem(PARAMS_KEY, JSON.stringify(params)); } catch (_) {}
  return params;
}
function cargarParametros() {
  try {
    const raw = localStorage.getItem(PARAMS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.alumno) document.getElementById('alumno').value = p.alumno;
    if (p.curso) document.getElementById('curso').value = p.curso;
    if (typeof p.filtroLetras === 'string') document.getElementById('filtroLetras').value = p.filtroLetras;
    if (typeof p.cantidad === 'string' || typeof p.cantidad === 'number') document.getElementById('cantidad').value = p.cantidad;
    if (typeof p.todas === 'boolean') document.getElementById('todasLasLetras').checked = p.todas;
    if (typeof p.strict === 'boolean') document.getElementById('strictMode').checked = p.strict;
  } catch (_) {}
}

// --- Navegación con Enter en configuración ---
function focusNextByTabIndex(currentEl) {
  try {
    const page = document.getElementById('page-config');
    if (!page) return;
    const focusables = Array.from(page.querySelectorAll('[tabindex]'))
      .filter(el => !el.disabled && el.tabIndex > 0)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    const idx = focusables.indexOf(currentEl);
    const next = idx >= 0 ? focusables[idx + 1] : focusables[0];
    if (next) {
      next.focus();
      if (next.select) { try { next.select(); } catch(_) {} }
    }
  } catch(_) {}
}

function attachEnterNavigationConfig() {
  try {
    const page = document.getElementById('page-config');
    if (!page) return;
    const elements = page.querySelectorAll('#alumno, #curso, #filtroLetras, #todasLasLetras, #cantidad, #strictMode');
    elements.forEach(el => {
      const handler = (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          ev.stopPropagation();
          // Si estamos en cantidad, solo enfocar Siguiente (no hacer click automático)
          if (ev.currentTarget && ev.currentTarget.id === 'cantidad') {
            const btn = document.getElementById('btnNext');
            if (btn) { btn.focus(); return; }
          }
          focusNextByTabIndex(ev.currentTarget);
        }
      };
      el.addEventListener('keydown', handler);
    });

    // Capturar Enter a nivel de sección para evitar comportamiento por defecto
    const captureHandler = (ev) => {
      if (ev.key === 'Enter') {
        const t = ev.target;
        const isButton = t && (t.tagName === 'BUTTON' || t.getAttribute?.('role') === 'button' || t.type === 'button' || t.type === 'submit');
        if (!isButton) {
          // Evitar submit implícito o re-enfoque solo si no es botón
          ev.preventDefault();
        }
      }
    };
    page.addEventListener('keydown', captureHandler, true);
  } catch(_) {}
}

// Adjuntar al cargar el documento
try {
  window.addEventListener('DOMContentLoaded', () => {
    attachEnterNavigationConfig();
    try { updateEnableAudioButton(); } catch(_) {}
  });
} catch(_) {}

async function reproducirPalabra(fromUser = false) {
  const speakBtn = document.getElementById("btnSpeak");
  const palabra = palabras[indice];
  if (!palabra) return;

  // En móvil, asegurar unlock primero
  if (isMobile && fromUser) {
    await unlockTTS();
  }

  // Esperar voces si no están listas
  if (!voicesReady) {
    let attempts = 0;
    while (!voicesReady && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      selectedVoice = elegirVozEspanol();
      voicesReady = !!selectedVoice;
    }
  }

  // Cancelar/reanudar
  try { speechSynthesis.cancel(); } catch (_) {}
  try { speechSynthesis.resume(); } catch (_) {}

  // Construir utterance
  const msg = new SpeechSynthesisUtterance(palabra);
  
  // Configuración robusta para móviles
  if (isMobile) {
    msg.lang = 'es-ES'; // fijo para móvil
    msg.rate = 0.8;
    msg.pitch = 1.0;
    msg.volume = 1.0;
    // No asignar voz específica en móvil, dejar que el sistema elija
  } else {
    const lang = (selectedVoice && selectedVoice.lang) ? selectedVoice.lang : 'es-ES';
    msg.lang = lang;
    if (selectedVoice) msg.voice = selectedVoice;
    msg.rate = 0.75;
    msg.pitch = 1.0;
    msg.volume = 1.0;
  }

  msg.onstart = () => {
    if (speakBtn) speakBtn.disabled = true;
    const res = document.getElementById('resultado');
    if (res) { res.innerHTML = ''; res.className = ''; }
  };
  
  msg.onend = () => {
    if (speakBtn) speakBtn.disabled = false;
    // Retry logic solo para desktop
    if (!isMobile) {
      const tNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const dur = tNow - (lastStartTime || tNow);
      if (dur < 250 && !reproducirPalabra._retried) {
        reproducirPalabra._retried = true;
        setTimeout(() => reproducirPalabra(), 350);
        return;
      }
    }
    reproducirPalabra._retried = false;
  };
  
  msg.onerror = (e) => {
    console.log('TTS error:', e);
    if (speakBtn) speakBtn.disabled = false;
  };

  // Enfocar input
  const input = document.getElementById('respuesta');
  if (input) { input.focus(); }
  
  lastStartTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  
  // Hablar directamente (especialmente importante en móvil)
  try {
    speechSynthesis.speak(msg);
    console.log('TTS: Speaking word:', palabra);
  } catch(e) {
    console.log('TTS speak error:', e);
  }
}

function comprobar() {
  const entrada = document.getElementById("respuesta").value.trim();
  const palabraCorrecta = palabras[indice];
  const resultado = document.getElementById("resultado");
  const tEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const tiempoMs = Math.max(0, Math.round(tEnd - lastStartTime));

  if (normalizar(entrada) === normalizar(palabraCorrecta)) {
    resultado.innerHTML = "✅ ¡Correcto!";
    resultado.className = "correcto";
    aciertos++;
  } else {
    resultado.innerHTML = "❌ Incorrecto. Era: " + palabraCorrecta;
    resultado.className = "incorrecto";
    // Registrar en banco de errores
    registrarError(palabraCorrecta);
  }

  // Registrar intento
  resultsLog.push({
    fechaISO: new Date().toISOString(),
    nivel: currentNivel || "-",
    palabra: palabraCorrecta,
    respuesta: entrada,
    correcto: normalizar(entrada) === normalizar(palabraCorrecta) ? "Sí" : "No",
    tiempoMs
  });

  indice++;
  // Actualizar barra de progreso
  try {
    const total = palabras.length;
    const curr = Math.min(indice, total);
    const pct = total ? Math.round((curr / total) * 100) : 0;
    const fill = document.getElementById('progressFill');
    const txt = document.getElementById('progressText');
    if (txt) txt.textContent = `${curr}/${total}`;
    if (fill) fill.style.width = `${pct}%`;
  } catch(_) {}
  document.getElementById("respuesta").value = "";

  // Cancelar cualquier síntesis en curso antes de la siguiente palabra
  try { speechSynthesis.cancel(); } catch (_) {}

  if (indice < palabras.length) {
    // Esperar un poco más para evitar cortes y permitir comprensión
    setTimeout(() => { reproducirPalabra(); }, 2200);
  } else {
    const total = palabras.length;
    const correctas = aciertos;
    const incorrectas = total - correctas;
    const porcentaje = total ? Math.round((correctas / total) * 100) : 0;

    document.getElementById("marcador").innerHTML =
      `Juego terminado. Aciertos: ${correctas}/${total} (${porcentaje}%)`;

    // Mostrar reporte de palabras incorrectas con significados
    const errores = resultsLog.filter(r => r.correcto === 'No');
    const rep = document.getElementById('reporteFinal');
    if (rep) {
      let html = '';
      html += '<div style="font-size:14px; margin-bottom:10px;">';
      html += `<div><strong>Total palabras:</strong> ${total}</div>`;
      html += `<div><strong>Correctas:</strong> ${correctas}</div>`;
      html += `<div><strong>Incorrectas:</strong> ${incorrectas}</div>`;
      html += `<div><strong>Porcentaje de acierto:</strong> ${porcentaje}%</div>`;
      html += '</div>';

      if (errores.length > 0) {
        html += '<h3 style="margin:10px 0 6px;">Palabras a reforzar</h3>';
        html += '<div style="font-size:14px;">';
        html += '<ul style="margin:6px 0 0 18px;">';
        errores.forEach((e, idx) => {
          const itemId = `def_${idx}`;
          html += `<li><strong>${e.palabra}</strong> — escrito: "${e.respuesta}"<div id="${itemId}" style="color:#334155; margin-top:2px;">Buscando significado...</div></li>`;
        });
        html += '</ul></div>';
      } else {
        html += '<div style="font-size:14px; color: var(--muted);">¡Sin errores! 🎉</div>';
      }
      rep.innerHTML = html;
      rep.style.display = 'block';

      // Cargar significados en segundo plano
      const promises = errores.map((e, idx) => fetchSignificado(e.palabra)
        .then(sig => ({ idx, sig }))
        .catch(() => ({ idx, sig: null })));
      Promise.all(promises).then(resArr => {
        resArr.forEach(({ idx, sig }) => {
          const el = document.getElementById(`def_${idx}`);
          if (!el) return;
          if (sig) {
            el.textContent = `Significado: ${sig}`;
          } else {
            el.textContent = 'Significado no disponible.';
          }
        });
        // Listo el reporte en pantalla; mostrar botón para continuar al reporte final
        const btn = document.getElementById('btnToReport');
        if (btn) { btn.style.display = ''; btn.focus(); }
      });
    }
    // No navegar automáticamente; mostrar botón "Siguiente" para ir al reporte
    const btn = document.getElementById('btnToReport');
    if (btn) { btn.style.display = ''; btn.focus(); }
  }
}

// Permite al usuario pasar manualmente a la página de reporte desde el juego
function goToReportFromGame() {
  // Ocultar botón para evitar múltiples clics
  const btn = document.getElementById('btnToReport');
  if (btn) btn.style.display = 'none';
  // Navegar al reporte y, tras un pequeño delay, disparar la descarga del PDF
  goToPage('page-report');
  setTimeout(() => {
    try { generarReportePDF(); } catch(_) {}
  }, 300);
}

// Ir al ejercicio limpiando el panel para iniciar un nuevo juego
function irAlEjercicio() {
  // Reset de estado de juego
  try {
    palabras = [];
    indice = 0;
    aciertos = 0;
    currentNivel = null;
    resultsLog = [];
    sessionStartISO = new Date().toISOString();
  } catch(_) {}

  // Limpiar UI
  const juego = document.getElementById('juego');
  const resultado = document.getElementById('resultado');
  const marcador = document.getElementById('marcador');
  const respuesta = document.getElementById('respuesta');
  const btnToReport = document.getElementById('btnToReport');
  if (resultado) resultado.textContent = '';
  if (marcador) marcador.textContent = '';
  if (respuesta) respuesta.value = '';
  if (btnToReport) btnToReport.style.display = 'none';
  if (juego) juego.style.display = 'none'; // oculto el recuadro hasta que se elija nivel e inicie

  // Rehabilitar botones de nivel y limpiar selección
  try {
    const bF = document.getElementById('btnNivelFacil');
    const bM = document.getElementById('btnNivelMedio');
    const bD = document.getElementById('btnNivelDificil');
    [bF,bM,bD].forEach(b => { if (b) { b.disabled = false; b.classList.remove('btn-selected'); } });
  } catch(_) {}

  // Volver a la página del juego (selector de nivel visible)
  goToPage('page-game');
  // Mantener subtítulo visible en juego
  refreshMetaAlumnoCurso(true);
}

// --- Diccionario: obtener significado con caché ---
const MEANING_CACHE_KEY = 'dictado_meaning_cache_v1';
function cargarCacheSignificados() {
  try {
    const raw = localStorage.getItem(MEANING_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(_) { return {}; }
}
function guardarCacheSignificados(cache) {
  try { localStorage.setItem(MEANING_CACHE_KEY, JSON.stringify(cache)); } catch(_) {}
}
function getCachedMeaning(palabra) {
  try {
    const cache = cargarCacheSignificados();
    const key = normalizar(palabra);
    const val = (cache[key] && cache[key].def) ? cache[key].def : null;
    return sanitizeMeaning(val);
  } catch(_) { return null; }
}
// Limpia y valida significados: descarta numéricos/solo símbolos o textos demasiado cortos
function sanitizeMeaning(val) {
  if (val == null) return null;
  try {
    let s = String(val).trim();
    if (!s) return null;
    // Eliminar comillas sobrantes
    s = s.replace(/^"+|"+$/g, '').trim();
    // Evitar valores numéricos puros (p.ej. '1')
    if (/^\d+$/.test(s)) return null;
    // Evitar strings muy cortos
    if (s.length < 3) return null;
    return s;
  } catch(_) { return null; }
}
async function fetchSignificado(palabra) {
  const key = normalizar(palabra);
  const cache = cargarCacheSignificados();
  if (cache[key] && cache[key].def) return cache[key].def;
  // Intento 1: dictionaryapi.dev en español
  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(palabra)}`);
    if (resp.ok) {
      const data = await resp.json();
      const def = sanitizeMeaning(extraerDefinicionBreve(data));
      if (def) {
        cache[key] = { def, ts: Date.now() };
        guardarCacheSignificados(cache);
        return def;
      }
    }
  } catch(_) {}
  // Intento 2: probar sin tildes
  try {
    const base = normalizar(palabra).replace(/_/g,'');
    const resp2 = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/es/${encodeURIComponent(base)}`);
    if (resp2.ok) {
      const data2 = await resp2.json();
      const def2 = sanitizeMeaning(extraerDefinicionBreve(data2));
      if (def2) {
        cache[key] = { def: def2, ts: Date.now() };
        guardarCacheSignificados(cache);
        return def2;
      }
    }
  } catch(_) {}
  // Intento 3: Wikcionario en español (extracto)
  try {
    const defW = sanitizeMeaning(await fetchDesdeWikcionario(palabra));
    if (defW) {
      cache[key] = { def: defW, ts: Date.now() };
      guardarCacheSignificados(cache);
      return defW;
    }
  } catch(_) {}
  // Intento 4: Wikcionario sin tildes
  try {
    const base2 = normalizar(palabra).replace(/_/g,'');
    const defW2 = sanitizeMeaning(await fetchDesdeWikcionario(base2));
    if (defW2) {
      cache[key] = { def: defW2, ts: Date.now() };
      guardarCacheSignificados(cache);
      return defW2;
    }
  } catch(_) {}
  // Intento 5: Resumen de Wikipedia en español (útil para nombres propios y conceptos)
  try {
    const defWp = sanitizeMeaning(await fetchDesdeWikipediaEs(palabra));
    if (defWp) {
      cache[key] = { def: defWp, ts: Date.now() };
      guardarCacheSignificados(cache);
      return defWp;
    }
  } catch(_) {}
  // Intento 6: Wikipedia con primera letra en mayúscula (nombres propios)
  try {
    const cap = palabra.charAt(0).toUpperCase() + palabra.slice(1);
    const defWp2 = sanitizeMeaning(await fetchDesdeWikipediaEs(cap));
    if (defWp2) {
      cache[key] = { def: defWp2, ts: Date.now() };
      guardarCacheSignificados(cache);
      return defWp2;
    }
  } catch(_) {}
  // Intento 7: Wikipedia con forma normalizada (sin tildes)
  try {
    const base3 = normalizar(palabra).replace(/_/g,'');
    const defWp3 = sanitizeMeaning(await fetchDesdeWikipediaEs(base3));
    if (defWp3) {
      cache[key] = { def: defWp3, ts: Date.now() };
      guardarCacheSignificados(cache);
      return defWp3;
    }
  } catch(_) {}
  return null;
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

// (Eliminadas funciones de Excel/CSV: construirWorkbookDesdeResultados, generarReporteExcel, generarCSVfallback)
