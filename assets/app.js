// ============================================================================
// PRÁCTICA DE ORTOGRAFÍA - Aplicación Principal
// ============================================================================
// © 2025 GMR - Todos los derechos reservados
// Código propietario y confidencial
//
// PROHIBIDO:
// - Modificar este código
// - Redistribuir o copiar
// - Crear versiones derivadas
// - Hacer ingeniería inversa
//
// Uso permitido solo mediante la aplicación web oficial
// Contacto: hgomero@gmail.com
// ============================================================================
// Usar la configuración global centralizada (modules/config.js)
const CONFIG = (typeof window !== 'undefined' && window.CONFIG) ? window.CONFIG : {};

// CacheManager está en modules/cache.js (window.CacheManager)

// Datos RAE vía fachada DataAPI (mantiene compatibilidad con window.raeWordsData)
const raeWordsData = (typeof window !== 'undefined' && window.DataAPI)
  ? window.DataAPI.getRaeData()
  : ((typeof window !== 'undefined' && window.raeWordsData) ? window.raeWordsData : { words: [], wordsSet: new Set(), wordsByLevel: {1:[],2:[],3:[],4:[]}, loaded:false });

// Estado dinámico provisto por DataLoader (global)
// window.palabrasPorNivelDinamico y window.cargandoDiccionario

// Variables globales refactorizadas (mantenidas para compatibilidad)
let palabras = [];
let indice = 0;
let aciertos = 0;
let currentNivel = null;
let resultsLog = [];

// Función unificada de sincronización con GameState
function syncGameState(direction = 'from') {
  if (direction === 'from') {
    // Sincronizar desde gameState a variables globales
    palabras = gameState.words;
    indice = gameState.currentIndex;
    aciertos = gameState.correctAnswers;
    currentNivel = gameState.currentLevel;
    resultsLog = gameState.resultsLog;
  } else {
    // Sincronizar desde variables globales a gameState
    gameState.words = palabras;
    gameState.currentIndex = indice;
    gameState.correctAnswers = aciertos;
    gameState.currentLevel = currentNivel;
    gameState.resultsLog = resultsLog;
  }
}

// === QR de sesión y enlace profundo (deep link) ===
function buildDeepLinkForSession(sessionId){
  try {
    const loc = window.location;
    const base = loc.origin + loc.pathname.replace(/[#?].*$/, '');
    return `${base}?session=${encodeURIComponent(sessionId)}#page-participant`;
  } catch(_) { return window.location.href; }
}

// Helper global único para escapar HTML (reutilizable en toda la app)
try {
  if (typeof window !== 'undefined' && typeof window.escapeHtml !== 'function') {
    window.escapeHtml = function(str){
      try {
        return String(str || '')
          .replace(/&/g,'&amp;')
          .replace(/</g,'&lt;')
          .replace(/>/g,'&gt;')
          .replace(/"/g,'&quot;')
          .replace(/'/g,'&#39;');
      } catch(_) { return String(str || ''); }
    };
  }
} catch(_) {}

function showSessionQR(){
  try {
    const sessionId = (document.getElementById('sessionId')?.textContent || '').trim();
    if (!sessionId || sessionId === '-') { alert('La sesión aún no está lista.'); return; }
    const modal = document.getElementById('qrModal');
    const box = document.getElementById('qrCodeContainer');
    const sidLabel = document.getElementById('qrSessionId');
    if (!modal || !box) return;
    box.innerHTML = '';
    const url = buildDeepLinkForSession(sessionId);
    if (typeof QRCode === 'function') {
      new QRCode(box, { text: url, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
    } else {
      box.textContent = url; // Fallback textual si la librería no cargó
    }
    if (sidLabel) sidLabel.textContent = sessionId.toUpperCase();
    // Usar flex para centrar según CSS del overlay
    modal.style.display = 'flex';
  } catch(e) { console.error('QR error:', e); }
}

function closeQRModal(){ try { const m = document.getElementById('qrModal'); if (m) m.style.display = 'none'; } catch(_) {} }
// Exponer globalmente para onclick del HTML
try {
  if (typeof window !== 'undefined') {
    window.showSessionQR = showSessionQR;
    window.closeQRModal = closeQRModal;
  }
} catch(_) {}

// Manejar apertura con ?session=ID para precargar y mostrar participante (robusto)
(function handleSessionDeepLink(){
  const run = () => {
    try {
      const usp = new URLSearchParams(window.location.search);
      const sid = usp.get('session') || usp.get('sid') || usp.get('s');
      if (!sid) return;
      // Guardar global para diagnósticos
      try { window.__DEEP_LINK_SID = sid; } catch(_) {}
      // Navegar a modo grupal/participante y abrir página específica
      try { selectMode('group'); } catch(_) {}
      try { selectRole('participant'); } catch(_) {}
      try { if (typeof goToPage === 'function') goToPage('page-participant'); } catch(_) {}
      // Ajustar hash para consistencia si falta
      try { if (!location.hash || location.hash !== '#page-participant') location.hash = '#page-participant'; } catch(_) {}
      // Prefijar el ID, BLOQUEAR edición del ID y enfocar nombre cuando el DOM del participante esté presente
      setTimeout(() => {
        try {
          const input = document.getElementById('sessionIdInput');
          if (input) {
            input.value = String(sid).toUpperCase();
            // Bloquear edición del ID para evitar cambios accidentales
            input.readOnly = true;
            input.setAttribute('aria-readonly', 'true');
            input.title = 'ID de sesión establecido por QR';
          }
          const name = document.getElementById('participantName');
          if (name) name.focus();
          // Autoconectar opcional: ?auto=1&name=TuNombre
          const auto = usp.get('auto');
          const pname = usp.get('name') || usp.get('n');
          if (auto === '1' && pname) {
            try { if (name) name.value = pname; } catch(_) {}
            const btn = document.getElementById('connectToSession');
            if (btn && typeof window.connectToSession === 'function') {
              window.connectToSession();
            }
          }
        } catch(_) {}
      }, 300);
    } catch(_) {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    // Ejecutar tras un micro delay para asegurar módulos cargados
    setTimeout(run, 50);
  }
})();
// ============================================================================

// GameState se mueve a modules/game-state.js

// Instancia global del estado del juego
const gameState = (typeof window !== 'undefined' && window.gameState) ? window.gameState : new GameState();

// Decorar nextWord para actualizar el progreso automáticamente
try {
  if (typeof GameState !== 'undefined' && GameState.prototype && !GameState.prototype._progressDecorated) {
    const _origNextWord = GameState.prototype.nextWord;
    GameState.prototype.nextWord = function() {
      const result = _origNextWord.call(this);
      try { UI.updateProgress(this.currentIndex, Array.isArray(this.words) ? this.words.length : 0); } catch(_) {}
      return result;
    };
    GameState.prototype._progressDecorated = true;
  }
} catch(_) {}

// ============================================================================
// DEBUG GLOBAL Y FILTRO DE LOGS
// ============================================================================
// Cambia a true para ver mensajes marcados como [DEBUG]
if (typeof window !== 'undefined') {
  if (typeof window.DEBUG === 'undefined') window.DEBUG = false;
  (function applyDebugLogFilter(){
    try {
      const _log = console.log.bind(console);
      console.log = function(...args){
        try {
          if (args && args.length > 0 && typeof args[0] === 'string' && args[0].includes('[DEBUG]')) {
            if (!window.DEBUG) return; // suprime logs de depuración
          }
        } catch(_) {}
        _log(...args);
      };
    } catch(_) {}
  })();
}

// Selección/filtrado: modules/filters.js · Validación: modules/validation.js · Reportes: modules/reportes.js

// PDF: delega al generador centralizado (reportes.js)
const generarReportePDF_fromReportes = (typeof window !== 'undefined')
  ? (window.__reportes_generarReportePDF || window.generarReportePDF || null)
  : null;
async function generarReportePDF() {
  const fn = (typeof window !== 'undefined')
    ? (window.__reportes_generarReportePDF || generarReportePDF_fromReportes)
    : generarReportePDF_fromReportes;
  if (typeof fn === 'function') {
    return fn();
  }
  try { alert('No se pudo cargar el generador de PDF.'); } catch(_) {}
}

// Navegación con Enter: modules/ui-forms.js (configurarEnterSiguiente)

let sessionStartISO = null;

// Utilidades UI: modules/ui-core.js (smoothScrollIntoView, clearInputs, validateRequiredFields)

// UI: modules/ui.js (UI.clearGameUI, UI.showNextButton)

// Control del estado habilitado del botón "Siguiente" en la página de configuración
function updateNextEnabled() { try { return Params.updateNextEnabled(); } catch(_) { return false; } }
let lastStartTime = 0;
// Construye un key por alumno/curso para que cada estudiante tenga su propio banco de errores
function getAlumnoCursoId() { try { return ErrorBank.getAlumnoCursoId(); } catch(_) { return 'anon|sin-curso'; } }
function getErrorBankKey() {
  return `${CONFIG.ERROR_BANK_KEY}:${getAlumnoCursoId()}`;
}

// --- Gestión de TTS (voz, cola y estabilidad) ---
// Definiciones provistas por modules/tts.js: selectedVoice, voicesReady, isMobile,
// updateEnableAudioButton(), unlockTTS(), elegirVozEspanol(), initVoces().

// --- Banco de errores ---
function cargarBancoErrores() { try { return ErrorBank.cargar(); } catch(_) { return {}; } }

function guardarBancoErrores(bank) { try { return ErrorBank.guardar(bank); } catch(_) { return false; } }
function registrarError(palabra) { try { return ErrorBank.registrar(palabra); } catch(_) { return false; } }


// ============================================================================
// SISTEMA DE ANÁLISIS DE DIFICULTAD DE PALABRAS
// ============================================================================

// Funciones de análisis de palabras delegadas a modules/word-filters-fixed.js
// Usar directamente:
// - WordFilters.contarSilabas(palabra)
// - WordFilters.analizarComplejidadSilabica(palabra)
// - WordFilters.analizarAcentos(palabra)
// - WordFilters.calcularDificultadPalabra(palabra, frecuencia, maxFreq)

// Usar configuración del módulo WordFilters
const LONGITUD_POR_NIVEL = WordFilters.LONGITUD_POR_NIVEL;

// Usar función del módulo WordFilters
function asignarNivel(dificultad, palabra = '') {
  return WordFilters.asignarNivel(dificultad, palabra);
}

// Proxies a dev-utils (mantener compatibilidad si algún código los invoca)
function obtenerEstadisticasNiveles() {
  try { if (typeof window.obtenerEstadisticasNiveles === 'function') return window.obtenerEstadisticasNiveles(); } catch(_) {}
  return { error: 'No disponible' };
}

// Función para detectar y solucionar problemas con Live Server
async function solucionarLiveServer() {
  try {
    const fn = (typeof window !== 'undefined') ? window.solucionarLiveServer : null;
    if (typeof fn === 'function' && fn !== solucionarLiveServer) {
      return await fn();
    }
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
  return false;
}

// Función para forzar la recarga con cache busting (solución para Live Server) delegada a DevUtils
async function forzarRecargaConCacheBusting() {
  try {
    const fn = (typeof window !== 'undefined') ? window.forzarRecargaConCacheBusting : null;
    if (typeof fn === 'function' && fn !== forzarRecargaConCacheBusting) {
      return await fn();
    }
  } catch(_) {}
}

// Función para forzar la recarga del archivo JSON (delegada a DevUtils)
function forzarRecargaJSON() {
  try {
    const fn = (typeof window !== 'undefined') ? window.forzarRecargaJSON : null;
    if (typeof fn === 'function' && fn !== forzarRecargaJSON) {
      return fn();
    }
  } catch(_) {}
}

// Función de diagnóstico delegada a DevUtils
function diagnosticarSistema() {
  try {
    const fn = (typeof window !== 'undefined') ? window.diagnosticarSistema : null;
    if (fn && fn !== diagnosticarSistema) return fn();
  } catch(_) {}
  return false;
}

function probarSistemaNiveles() {
  try { if (typeof window.probarSistemaNiveles === 'function') return window.probarSistemaNiveles(); } catch(_) {}
  console.warn('Prueba no disponible');
}

// Sanitización de letras delegada a modules/validation.js

// Lanzar preparación en segundo plano al cargar la página
(function init() {
  try { DataLoader.prepararNivelesDinamicos(); } catch(_) {}
  try { if (typeof DataAPI !== 'undefined') DataAPI.ensurePrepared(); } catch(_) {}
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
  ["alumno","curso","filtroLetras","cantidad","porcentajeRefuerzo"].forEach(id => {
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
        
        if (resp.value.trim().length > 0) {
          comprobar();
        } else {
          reproducirPalabra();
        }
      }
    });
    
    // Deshabilitar sugerencias del teclado móvil de forma programática
    if (isMobile) {
      resp.addEventListener('focus', () => {
        // Forzar atributos anti-sugerencias
        resp.setAttribute('autocomplete', 'new-password');
        resp.setAttribute('autocorrect', 'off');
        resp.setAttribute('autocapitalize', 'none');
        resp.setAttribute('spellcheck', 'false');
        // Hack para algunos teclados Android
        resp.style.webkitUserSelect = 'text';
        resp.style.webkitTouchCallout = 'none';
      });
    }
  }
  // Página inicial
  goToPage('page-mode-select');
  // Enfocar alumno al cargar
  const alumnoInit = document.getElementById('alumno');
  if (alumnoInit) { alumnoInit.focus(); try { alumnoInit.select(); } catch (_) {} }
})();

// Navegación delegada a modules/router.js

// Validar datos en la primera ventana antes de avanzar
function goNextFromConfig() {
  const alumnoEl = document.getElementById('alumno');
  const alumnoVal = (alumnoEl?.value || '').trim();

  // Limpiar estado previo
  alumnoEl?.classList.remove('input-error');
  const aErr = document.getElementById('alumnoError'); if (aErr) aErr.style.display = 'none';

  if (!alumnoVal) {
    const msg = `Falta completar: Alumno.`;
    try { alert(msg); } catch(_) {}
    alumnoEl?.classList.add('input-error');
    const h = document.getElementById('alumnoError');
    if (h) h.style.display = 'block';
    alumnoEl?.focus();
    return; // no avanzar
  }

  // Guardar y avanzar
  guardarParametros();
  // Al avanzar, asegurar que se muestre la meta
  refreshMetaAlumnoCurso();
  // Preparar nueva sesión (timestamp se fija al iniciarJuego)
  try {
    sessionStartISO = null;
    window.sessionEndISO = null;
    gameState.sessionStartISO = null;
    if (typeof gameState !== 'undefined') gameState.sessionEndISO = null;
    gameState.reset();
    // Sincronizar variables globales con gameState
    syncGameState('from');
  } catch(_) {}

  // Limpiar UI usando función optimizada
  UI.clearGameUI();

  // Rehabilitar botones de nivel y quitar selección previa
  try {
    const bBasico = document.getElementById('btnNivelBasico');
    const bIntermedio = document.getElementById('btnNivelIntermedio');
    const bAvanzado = document.getElementById('btnNivelAvanzado');
    const bExperto = document.getElementById('btnNivelExperto');
    // Compatibilidad con ids antiguos
    const bF = document.getElementById('btnNivelFacil');
    const bM = document.getElementById('btnNivelMedio');
    const bD = document.getElementById('btnNivelDificil');
    [bBasico, bIntermedio, bAvanzado, bExperto, bF, bM, bD].forEach(b => { if (b) { b.disabled = false; b.classList.remove('btn-selected'); } });

    // Reactivar controles de configuración por si quedaron bloqueados de una sesión anterior
    const cantidad = document.getElementById('cantidad');
    const filtroLetras = document.getElementById('filtroLetras');
    const strictMode = document.getElementById('strictMode');
    if (cantidad) cantidad.disabled = false;
    if (filtroLetras) filtroLetras.disabled = false;
    if (strictMode) strictMode.disabled = false;

    const acentosCheckbox = document.getElementById('acentosObligatorios');
    if (acentosCheckbox) { acentosCheckbox.disabled = false; }

    const btnVolver = document.getElementById('btnVolverGame');
    if (btnVolver) btnVolver.disabled = false;
  } catch(_) {}

  // Asegurarse de que el área del juego esté oculta al ir a configuración
  try {
    const juego = document.getElementById('juego');
    if (juego) juego.style.display = 'none';
    
    // Reactivar input de respuesta (quitar readonly y disabled)
    const respuesta = document.getElementById('respuesta');
    if (respuesta) {
      respuesta.value = '';
      respuesta.disabled = false;
      // En PC, quitar readonly; en móvil se establecerá después si es necesario
      try {
        const mustUseVK = (typeof window.DeviceDetector !== 'undefined' && window.DeviceDetector.shouldUseVirtualKeyboard) ? window.DeviceDetector.shouldUseVirtualKeyboard() : false;
        if (!mustUseVK) {
          respuesta.removeAttribute('readonly');
        }
      } catch(_) {
        // Fallback: en desktop quitar readonly
        respuesta.removeAttribute('readonly');
      }
    }
    
    // Reactivar botones del juego
    const btnComprobar = document.getElementById('btnComprobar');
    const btnSpeak = document.getElementById('btnSpeak');
    if (btnComprobar) btnComprobar.disabled = false;
    if (btnSpeak) btnSpeak.disabled = false;
    
    // Mostrar todos los elementos de configuración
    const pageGame = document.getElementById('page-game');
    if (pageGame) {
      Array.from(pageGame.children).forEach(child => {
        if (child.id !== 'juego') {
          child.style.display = '';
        }
      });
    }
  } catch(_) {}

  guardarParametros();
  goToPage('page-game');
  refreshMetaAlumnoCurso(true);
}

// ============================================================================
// ACTUALIZACIÓN DE METADATOS OPTIMIZADA
// ============================================================================

function refreshMetaAlumnoCurso(forceVisible = null) {
  try { return UI.refreshMetaAlumnoCurso(forceVisible); } catch(_) {}
}

// Selección de nivel delegada a modules/game-flow.js

// Navegación por teclado migrada a modules/navigation.js

// Hacer funciones disponibles globalmente sin sobreescribir módulos ya cargados ni referenciar identificadores inexistentes
try { if (typeof window.seleccionarNivel === 'undefined' && typeof seleccionarNivel !== 'undefined') window.seleccionarNivel = seleccionarNivel; } catch(_) {}
try { if (typeof window.selectMode === 'undefined') window.selectMode = selectMode; } catch(_) {}
try { if (typeof window.selectRole === 'undefined') window.selectRole = selectRole; } catch(_) {}
try { if (typeof window.goToPage === 'undefined' && typeof goToPage !== 'undefined') window.goToPage = goToPage; } catch(_) {}
try { if (typeof window.goNextFromConfig === 'undefined') window.goNextFromConfig = goNextFromConfig; } catch(_) {}
try { if (typeof window.irAlEjercicio === 'undefined') window.irAlEjercicio = irAlEjercicio; } catch(_) {}
try { if (typeof window.generarReportePDF === 'undefined' && typeof generarReportePDF !== 'undefined') window.generarReportePDF = generarReportePDF; } catch(_) {}
try { if (typeof window.generarPracticaManual === 'undefined' && typeof generarPracticaManual !== 'undefined') window.generarPracticaManual = generarPracticaManual; } catch(_) {}
try { if (typeof window.goToReportFromGame === 'undefined') window.goToReportFromGame = goToReportFromGame; } catch(_) {}

// Refrescar datos RAE: limpia cache y recarga
window.refrescarDatosRAE = function refrescarDatosRAE() {
  try {
    if (typeof window.forzarRecargaJSON === 'function') {
      // Usar utilitario centralizado
      window.forzarRecargaJSON().then(() => { try { location.reload(); } catch (_) { } });
      return;
    }
    console.log('[Refrescar] Limpiando caché de palabras RAE...');
    if (window.CacheManager && CacheManager.remove) {
      CacheManager.remove(CONFIG.RAE_CACHE_KEY);
    } else {
      localStorage.removeItem(CONFIG.RAE_CACHE_KEY);
    }
    if (typeof DataAPI !== 'undefined' && DataAPI.setRaeData) {
      DataAPI.setRaeData({ words: [], wordsSet: new Set(), wordsByLevel: {1:[],2:[],3:[],4:[]}, loaded: false });
    } else if (window.raeWordsData) {
      // Fallback por compatibilidad
      raeWordsData.loaded = false;
      raeWordsData.words = [];
      raeWordsData.wordsSet = new Set();
      raeWordsData.wordsByLevel = { 1: [], 2: [], 3: [], 4: [] };
    }
  } catch (e) { console.warn('[Refrescar] Error limpiando caché RAE:', e); }
  try { location.reload(); } catch (_) { }
};

// __delegateLater ahora está en modules/dev-utils.js y expuesto como window.__delegateLater

if (typeof window !== 'undefined' && typeof window.iniciarJuego !== 'function') {
  window.iniciarJuego = async function(nivel) {
    // Delegar a la implementación del módulo si está disponible
    try {
      if (typeof window !== 'undefined' && window.__indiv_iniciarJuego && window.__indiv_iniciarJuego !== window.iniciarJuego) {
        return window.__indiv_iniciarJuego(nivel);
      }
      if (typeof window !== 'undefined' && window.iniciarJuego && window.iniciarJuego !== window.__app_iniciarJuego) {
        // Si otra implementación apareció, delegar
        return window.iniciarJuego(nivel);
      }
    } catch(_) {}
    return __delegateLater('__indiv_iniciarJuego', [nivel], 'No se pudo iniciar el juego: módulo no cargado.');
  };
  // Guardar referencia interna por si aparecen múltiples implementaciones más adelante
  window.__app_iniciarJuego = window.iniciarJuego;
}
  

// Persistencia de parámetros en localStorage
// ============================================================================
// GESTIÓN DE PARÁMETROS REFACTORIZADA
// ============================================================================

function guardarParametros() { try { return Params.guardar(); } catch(_) { return null; } }

function cargarParametros() { try { return Params.cargar(); } catch(_) { return null; } }

// Adjuntos de eventos movidos a modules/navigation.js (attachEnterNavigationConfig)

try {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { try { bindCriticalUIHandlers(); } catch(_) {} });
  } else {
    try { bindCriticalUIHandlers(); } catch(_) {}
  }
} catch(_) {}

if (typeof window !== 'undefined' && typeof window.reproducirPalabra !== 'function') {
  window.reproducirPalabra = async function(fromUser = false) {
    try {
      if (typeof window !== 'undefined' && window.__indiv_reproducirPalabra && window.__indiv_reproducirPalabra !== window.reproducirPalabra) {
        return window.__indiv_reproducirPalabra(fromUser);
      }
      if (typeof window !== 'undefined' && window.reproducirPalabra && window.reproducirPalabra !== window.__app_reproducirPalabra) {
        return window.reproducirPalabra(fromUser);
      }
    } catch(_) {}
    return __delegateLater('__indiv_reproducirPalabra', [fromUser], 'No se pudo reproducir: módulo no cargado.');
  };
  window.__app_reproducirPalabra = window.reproducirPalabra;
}

if (typeof window !== 'undefined' && typeof window.comprobar !== 'function') {
  window.comprobar = function() {
    try {
      if (typeof window !== 'undefined' && window.__indiv_comprobar && window.__indiv_comprobar !== window.comprobar) {
        return window.__indiv_comprobar();
      }
      if (typeof window !== 'undefined' && window.comprobar && window.comprobar !== window.__app_comprobar) {
        return window.comprobar();
      }
    } catch(_) {}
    console.warn('[Refactor] comprobar: implementación de módulo no encontrada. Asegura cargar modules/individual-mode.js');
  };
  window.__app_comprobar = window.comprobar;
}

// Permite al usuario pasar manualmente a la página de reporte desde el juego
if (typeof window !== 'undefined' && typeof window.goToReportFromGame !== 'function') {
  window.goToReportFromGame = function() {
    try {
      if (typeof window !== 'undefined' && window.__indiv_goToReportFromGame && window.__indiv_goToReportFromGame !== window.goToReportFromGame) {
        return window.__indiv_goToReportFromGame();
      }
      if (typeof window !== 'undefined' && window.goToReportFromGame && window.goToReportFromGame !== window.__app_goToReportFromGame) {
        return window.goToReportFromGame();
      }
    } catch(_) {}
    console.warn('[Refactor] goToReportFromGame: implementación de módulo no encontrada. Asegura cargar modules/individual-mode.js');
  };
  window.__app_goToReportFromGame = window.goToReportFromGame;
}

// Ir al ejercicio limpiando el panel para iniciar un nuevo juego
if (typeof window !== 'undefined' && typeof window.irAlEjercicio !== 'function') {
  window.irAlEjercicio = function() {
    try {
      if (typeof window !== 'undefined' && window.__indiv_irAlEjercicio && window.__indiv_irAlEjercicio !== window.irAlEjercicio) {
        return window.__indiv_irAlEjercicio();
      }
      if (typeof window !== 'undefined' && window.irAlEjercicio && window.irAlEjercicio !== window.__app_irAlEjercicio) {
        return window.irAlEjercicio();
      }
    } catch(_) {}
    console.warn('[Refactor] irAlEjercicio: implementación de módulo no encontrada. Asegura cargar modules/individual-mode.js');
  };
  window.__app_irAlEjercicio = window.irAlEjercicio;
}
  
// [movido a reportes.js] utilidades de significados (caché/RAE/dictionaryapi) y helpers

// generarPracticaManual y modal de descarga movidos a reportes.js


// ============================================================================
// FUNCIONES DE NAVEGACIÓN Y CONTROL GRUPAL
// ============================================================================

// Variables globales para el sistema grupal
let currentMode = 'individual';
let currentRole = null;

// Seleccionar modo (Individual vs Grupal)
function selectMode(mode) {
  currentMode = mode;
  groupState.setMode(mode);
  
  if (mode === 'individual') {
    // Ir directamente a configuración individual
    goToPage('page-config');
  } else if (mode === 'group') {
    // Ir a selección de rol
    goToPage('page-role-select');
  }
}

// Seleccionar rol (Tutor vs Participante)
function selectRole(role) {
  currentRole = role;
  groupState.setRole(role);
  
  if (role === 'tutor') {
    // Ir a información del tutor primero (nueva página)
    goToPage('page-tutor-info');
  } else if (role === 'participant') {
    initParticipantMode();
  }
}

// Inicializar modo tutor
async function initTutorMode() {
  goToPage('page-tutor');
  
  const statusElement = document.getElementById('tutorStatus');
  const sessionInfo = document.getElementById('sessionInfo');
  
  // Asegurar que el tutor SIEMPRE pueda reproducir audio (nunca silenciado)
  try { window.__ttsMuted = false; } catch(_) {}
  
  try {
    statusElement.innerHTML = '<p>🔄 Iniciando servidor PeerJS...</p>';
    
    // Configurar callbacks del peer manager
    peerManager.onParticipantJoined = (participantId, connection) => {
      // No agregar participante aquí, esperar a recibir participant_info con el nombre
      console.log('[Tutor] Participante conectado, esperando info:', participantId);
    };
    
    peerManager.onParticipantLeft = (participantId) => {
      groupState.removeParticipant(participantId);
      updateTutorUI();
    };
    
    peerManager.onDataReceived = (participantId, data) => {
      handleTutorDataReceived(participantId, data);
    };
    
    // Inicializar como tutor
    const sessionId = await peerManager.initAsTutor();
    
    // Actualizar UI
    document.getElementById('sessionId').textContent = sessionId;
    document.getElementById('serverStatus').textContent = 'Activo';
    statusElement.innerHTML = '<p>✅ Servidor activo y listo para recibir participantes</p>';
    sessionInfo.style.display = 'block';
    
    groupState.sessionActive = true;
    updateTutorUI();
    
  } catch (error) {
    console.error('Error iniciando modo tutor:', error);
    statusElement.innerHTML = `<p>❌ Error: ${error.message}</p>`;
  }
}

  // Inicializar modo participante
  function initParticipantMode() {
    goToPage('page-participant');
  try { window._exerciseStartedParticipant = false; } catch(_) {}
  try { updateParticipantConnectionStatus(!!(window.peerManager && peerManager.isConnected)); } catch(_) {}
  // Silenciar TTS por defecto en el participante hasta que el tutor lo habilite explícitamente
  try { window.__ttsMuted = true; } catch(_) {}
  
  // Inicializar buffers para el reporte del participante (modo grupal)
  try {
    window._groupResultsLog = [];
    window._receivedWords = [];
    window._lastSubmittedAnswer = '';
    window._exerciseConfigParticipant = null;
  } catch(_) {}
  
  // Prefijar ID de sesión en modo desarrollo para evitar pedir "contraseña"
  try {
    if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.DEV_DISABLE_SESSION_ID) {
      const fixedId = window.CONFIG.DEV_FIXED_TUTOR_ID || 'TUTOR_DEV';
      const input = document.getElementById('sessionIdInput');
      if (input && !input.value) input.value = fixedId;
    }
  } catch(_) {}

  // Forzar que el campo de ID se mantenga en MAYÚSCULAS (UX y robustez)
  try {
    const input = document.getElementById('sessionIdInput');
    if (input && !input.__upperAttached) {
      input.addEventListener('input', () => {
        const val = input.value || '';
        const upper = val.toUpperCase();
        if (val !== upper) input.value = upper;
      });
      input.__upperAttached = true;
    }
  } catch(_) {}

  // Configurar callbacks del peer manager
  peerManager.onDataReceived = (tutorId, data) => {
    handleParticipantDataReceived(tutorId, data);
  };
  
  peerManager.onConnectionStatusChanged = (isConnected) => {
    updateParticipantConnectionStatus(isConnected);
    if (!isConnected) {
      // Volver a la pantalla de conexión y limpiar panel de juego
      try {
        const conn = document.getElementById('participantConnection');
        const panel = document.getElementById('participantExercise');
        const game = document.getElementById('participantGame');
        const report = document.getElementById('participantReport');
        if (conn) conn.style.display = 'block';
        if (panel) panel.style.display = 'none';
        if (game) game.style.display = 'none';
        if (report) report.style.display = 'none';
        applyParticipantLockUI(false);
        // Limpiar input y feedback
        const ans = document.getElementById('participantAnswer');
        const fb = document.getElementById('participantFeedback');
        if (ans) { ans.value = ''; ans.disabled = true; }
        if (fb) fb.innerHTML = '';
      } catch(_) {}
      try { goToPage('page-participant'); } catch(_) {}
    }
  };
}

// Conectar a sesión (participante)
async function connectToSession() {
  const participantNameInput = document.getElementById('participantName');
  const sessionIdInput = document.getElementById('sessionIdInput');
  const connectBtn = document.getElementById('connectToSession');
  const statusPanel = document.getElementById('participantStatus');
  const connectionStatus = document.getElementById('connectionStatus');
  
  const participantName = participantNameInput.value.trim();
  let sessionId = (sessionIdInput.value || '').trim().toUpperCase();
  const DEV_BYPASS = (typeof window !== 'undefined') && window.CONFIG && window.CONFIG.DEV_DISABLE_SESSION_ID;
  if (DEV_BYPASS && !sessionId) {
    sessionId = (window.CONFIG.DEV_FIXED_TUTOR_ID || 'TUTOR_DEV');
  }
  
  if (!participantName) {
    alert('Por favor ingresa tu nombre');
    participantNameInput.focus();
    return;
  }
  
  if (!sessionId) {
    alert('Por favor ingresa el ID de sesión');
    sessionIdInput.focus();
    return;
  }
  
  try {
    // Marcar que intentó conectar para mostrar estado si falla
    try { window._participantTriedConnect = true; } catch(_) {}
    
    // En móviles, desbloquear TTS AHORA (mientras el gesto del usuario está activo)
    if (window.isMobile && typeof window.unlockTTS === 'function') {
      try { await window.unlockTTS(); } catch(_) {}
    }
    
    connectBtn.disabled = true;
    statusPanel.style.display = 'block';
    connectionStatus.textContent = 'Conectando al tutor...';
    
    // Guardar nombre del participante
    window.participantName = participantName;
    
    await peerManager.initAsParticipant(sessionId);
    
    // Actualizar UI (solo mostrar estado conectado; no entrar al ejercicio hasta 'exercise_start')
    connectionStatus.textContent = '✅ Conectado al tutor';
    document.getElementById('connectedSession').textContent = sessionId;
    document.getElementById('participantDisplayName').textContent = participantName;
    try { window._exerciseStartedParticipant = false; } catch(_) {}
    try { updateParticipantConnectionStatus(true); } catch(_) {}
  
  
  } catch (error) {
    console.error('Error conectando a sesión:', error);
    connectionStatus.textContent = `❌ Error: ${error.message}`;
    connectBtn.disabled = false;
  }
}


// handleParticipantDataReceived y showParticipantReport están en modules/participant-helpers.js
// Las funciones están disponibles globalmente desde el módulo

// ===== Funciones del modo grupal - Tutor (ahora en modules/group-mode-tutor.js) =====
// Todas las funciones están disponibles globalmente desde el módulo:
// - startGroupExercise()
// - sendCurrentWordToParticipants()
// - nextWordInExercise()
// - tutorPlayCurrentWord()
// - tutorRepeatCurrentWord()
// - tutorStopAllAudio()
// - tutorToggleLockAll()
// - saveTutorConfig(nivel)
// - generarPalabrasParaTutor()
// - tutorGenerateParticipantPDF(participantId)

// Enviar respuesta del participante
function submitParticipantAnswer() {
  if (window._participantUILocked) { return; }
  const answerInput = document.getElementById('participantAnswer');
  const answer = answerInput.value.trim();
  
  if (!answer) return;
  // Guardar última respuesta del participante para el reporte PDF
  try { window._lastSubmittedAnswer = answer; } catch(_) {}
  
  peerManager.sendToTutor({
    type: 'answer',
    answer: answer
  });
  
  // Deshabilitar input hasta recibir feedback y limpiar campo/espejo (comportamiento como en individual)
  answerInput.disabled = true;
  // Bloquear reactivación hasta 'new_word' del tutor
  try { window._waitNextWord = true; } catch(_) { window._waitNextWord = true; }
  try {
    answerInput.value = '';
    // Deshabilitar botón Confirmar hasta que el alumno vuelva a escribir
    const game = document.getElementById('participantGame');
    const confirmBtn = game ? game.querySelector('.participant-input button') : null;
    if (confirmBtn) confirmBtn.disabled = true;
    // Inactivar espejo táctil inmediatamente
    try { const mirror = document.getElementById('vkMirrorParticipant'); if (mirror) { mirror.style.pointerEvents = 'none'; mirror.classList.add('vk-disabled'); } } catch(_) {}
    // Sincronizar espejo del VK si existe
    if (window.virtualKeyboardManager && typeof window.virtualKeyboardManager._updateMirrorFromInput === 'function') {
      window.virtualKeyboardManager._updateMirrorFromInput(answerInput);
      // Limpiar también el buffer interno del teclado virtual
      try { window.virtualKeyboardManager.clearInput?.(); } catch(_) {}
      // Ocultar el teclado virtual hasta la próxima palabra
      try { window.virtualKeyboardManager.hideKeyboard?.(); } catch(_) {}
    }
  } catch(_) {}
}

// Manejar Enter en input del participante
function handleParticipantEnter(event) {
  if (event.key === 'Enter') {
    if (window._participantUILocked) { event.preventDefault(); return; }
    event.preventDefault();
    submitParticipantAnswer();
  }
}

// applyParticipantLockUI movida a modules/participant-helpers.js

// Funciones del tutor movidas a modules/group-mode-tutor.js
// updateTutorUI, refreshTutorCurrentWordLabel, refreshTutorOverallProgress

// Funciones del participante movidas a modules/participant-helpers.js
// updateParticipantConnectionStatus, applyParticipantLockUI

// Terminar sesión
function stopSession() {
  if (confirm('¿Estás seguro de que quieres terminar la sesión?')) {
    // Avisar a todos los participantes que la sesión terminó
    try { peerManager.broadcastToParticipants({ type: 'session_end' }); } catch(_) {}
    // Dar un pequeño margen para que el mensaje salga antes de cerrar conexiones
    try {
      setTimeout(() => {
        try { peerManager.disconnect(); } catch(_) {}
        try { groupState.reset(); } catch(_) {}
        // Recargar para asegurar un estado limpio y evitar reusar la sesión previa
        try { location.reload(); } catch(_) { try { goToPage('page-mode-select'); } catch(_) {} }
      }, 120);
    } catch(_) {
      try { peerManager.disconnect(); } catch(_) {}
      try { groupState.reset(); } catch(_) {}
      try { location.reload(); } catch(_) { try { goToPage('page-mode-select'); } catch(_) {} }
    }
  }
}

// Variables globales para configuración del tutor
let tutorConfig = {
  cantidad: 50,
  filtroLetras: '',
  acentosObligatorios: false,
  strictMode: true,
  nivel: null,
  tutorName: '',
  tutorGroup: ''
};

// Alias para compatibilidad con HTML (llama al módulo)
async function configurarEjercicioTutor(nivel) {
  return saveTutorConfig(nivel); // Delegado a modules/group-mode-tutor.js
}

// Alias para tutorManualPractice (no está en el módulo, mantener aquí)
function tutorManualPractice(participantId){
  try {
    const p = groupState.getParticipant(participantId);
    if (!p) return alert('Participante no encontrado');
    // Construir resultsLog desde el participante
    const mapRecord = (a) => ({
      fechaISO: a.timestamp || new Date().toISOString(),
      nivel: (window.currentNivel || tutorConfig?.nivel || '-'),
      palabra: a.word || '',
      respuesta: a.answer || '',
      correcto: a.isCorrect ? 'Sí' : 'No',
      tiempoMs: ''
    });
    const uniques = new Map();
    (Array.isArray(p.answers) ? p.answers : []).forEach(a => {
      uniques.set(a.wordIndex, a);
    });
    window.resultsLog = Array.from(uniques.values()).map(mapRecord);
    // Proveer contexto de palabras y tiempos al generador de práctica manual
    try {
      window.gameState = window.gameState || {};
      if (Array.isArray(groupState.exerciseWords)) {
        window.gameState.words = groupState.exerciseWords.slice();
      }
      // Si no hay timestamps de sesión, usar fecha actual como inicio
      if (!window.gameState.sessionStartISO && !window.sessionStartISO) {
        window.gameState.sessionStartISO = new Date().toISOString();
        window.sessionStartISO = window.gameState.sessionStartISO;
      }
    } catch(_) {}
    
    // Crear elementos temporales para alumno/curso
    const created = { alumno: null, curso: null };
    let alumnoEl = document.getElementById('alumno');
    if (!alumnoEl) { alumnoEl = document.createElement('input'); alumnoEl.type='hidden'; alumnoEl.id='alumno'; document.body.appendChild(alumnoEl); created.alumno = alumnoEl; }
    let cursoEl = document.getElementById('curso');
    if (!cursoEl) { cursoEl = document.createElement('input'); cursoEl.type='hidden'; cursoEl.id='curso'; document.body.appendChild(cursoEl); created.curso = cursoEl; }
    const prevAlumno = alumnoEl.value; const prevCurso = cursoEl.value;
    try { 
      alumnoEl.value = p.name || ''; 
      cursoEl.value = tutorConfig?.tutorGroup || ''; 
      if (typeof window.generarPracticaManual === 'function') {
        window.generarPracticaManual();
      } else {
        alert('Generador de práctica no disponible');
      }
    } finally {
      alumnoEl.value = prevAlumno; cursoEl.value = prevCurso;
      try { if (created.alumno) created.alumno.remove(); } catch(_) {}
      try { if (created.curso) created.curso.remove(); } catch(_) {}
    }
  } catch(e){ console.error(e); alert('No se pudo generar la práctica'); }
}

// tutorNewExercise ya está en el módulo y se exporta globalmente

// Manejar datos recibidos en el tutor
function handleTutorDataReceived(participantId, data) {
  console.log('[Tutor] Datos recibidos del participante:', participantId, data);
  
  switch (data.type) {
    case 'participant_info':
      // Información del participante al conectarse
      console.log('[Tutor] Recibida info del participante:', data);
      // Si el ejercicio ya se inició o está activo, rechazar ingresos tardíos
      try {
        if (groupState.exerciseActive || groupState.exerciseStarted) {
          // Notificar rechazo y desconectar
          try { peerManager.sendToParticipant(participantId, { type: 'join_denied', reason: 'exercise_in_progress' }); } catch(_) {}
          try { peerManager.disconnectParticipant(participantId); } catch(_) {}
          console.warn('[Tutor] Ingreso rechazado para', participantId, '(ejercicio en curso)');
          break;
        }
      } catch(_) {}
      groupState.addParticipant(participantId, data);
      groupState.updateParticipantsUI();
      // Si el tutor tiene bloqueo activo, aplicar inmediatamente al nuevo participante
      try {
        if (typeof __tutorLockAll !== 'undefined' && __tutorLockAll) {
          peerManager.sendToParticipant(participantId, { type: 'lock_ui', locked: true });
          // Por si acaso, también detener audio en el recién conectado
          peerManager.sendToParticipant(participantId, { type: 'stop_audio' });
        }
      } catch(_) {}
      // Enviar configuración del ejercicio al participante
      peerManager.sendToParticipant(participantId, {
        type: 'exercise_config',
        config: tutorConfig
      });
      break;
      
    case 'answer':
      // Respuesta del participante
      const result = groupState.submitParticipantAnswer(participantId, data.answer) || { isCorrect: false, isNew: false };
      const isCorrect = !!result.isCorrect;
      const isNew = !!result.isNew;
      
      // Enviar feedback al participante
      peerManager.sendToParticipant(participantId, {
        type: 'answer_feedback',
        isCorrect,
        correctWord: groupState.currentWord
      });
      
      // Actualizar progreso del participante (respuestas únicas)
      const participant = groupState.getParticipant(participantId);
      if (participant) {
        const currentUnique = participant.answers.length;
        const totalWords = tutorConfig.palabrasGeneradas.length;
        peerManager.sendToParticipant(participantId, {
          type: 'progress_update',
          current: currentUnique,
          total: totalWords,
          progress: Math.round((currentUnique / totalWords) * 100)
        });
      }
      
      // Actualizar contador de respuestas en UI del tutor (solo si es la primera vez que responde esta palabra)
      try {
        if (isNew) {
          window._tutorRespCount = (window._tutorRespCount || 0) + 1;
          const resp = document.getElementById('tutorResponses');
          if (resp) resp.textContent = `Resp: ${window._tutorRespCount}/${groupState.getParticipantCount()}`;
        }
      } catch(_) {}

      // Verificar si todos respondieron
      if (groupState.allParticipantsAnswered()) {
        // Marcar visualmente respuestas completas con un check
        try {
          const respLbl = document.getElementById('tutorResponses');
          if (respLbl) {
            respLbl.textContent = `Resp: ${groupState.getParticipantCount()}/${groupState.getParticipantCount()} ✅`;
            // Énfasis visual: verde + negrita + "flash" rápido
            respLbl.style.color = '#2e7d32';
            respLbl.style.fontWeight = '700';
            respLbl.style.background = '#e8f5e9';
            respLbl.style.padding = '2px 8px';
            respLbl.style.borderRadius = '999px';
            respLbl.title = 'Todos respondieron';
            try {
              respLbl.animate([
                { transform: 'scale(1.0)' },
                { transform: 'scale(1.12)' },
                { transform: 'scale(1.0)' }
              ], { duration: 400, iterations: 1, easing: 'ease-out' });
            } catch(_) {}
            // Volver al color por defecto tras unos segundos
            setTimeout(() => { try {
              respLbl.style.color = '';
              respLbl.style.fontWeight = '';
              respLbl.style.background = '';
              respLbl.style.padding = '';
              respLbl.style.borderRadius = '';
              respLbl.title = '';
            } catch(_) {} }, 1500);
          }
        } catch(_) {}
        const auto = document.getElementById('autoAdvance');
        const delaySel = document.getElementById('autoDelay');
        const delay = Number(delaySel?.value || 2000);
        if (auto && auto.checked) {
          setTimeout(() => { nextWordInExercise(); }, delay);
        } else {
          // Habilitar botón Siguiente para avanzar manualmente
          try { document.getElementById('tutorNextWord').disabled = false; } catch(_) {}
        }
      }
      break;
  }
}

// ===== CÓDIGO DUPLICADO ELIMINADO =====
// Las siguientes funciones ya están en modules/participant-helpers.js:
// - handleParticipantDataReceived(tutorId, data)
// - showParticipantReport(results)
// Están disponibles globalmente desde el módulo
