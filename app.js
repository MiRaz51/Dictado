// ============================================================================
// CONFIGURACIÓN Y CONSTANTES CENTRALIZADAS
// ============================================================================

const CONFIG = {
  // URLs y archivos
  RAE_WORD_LIST_URL: './palabras_todas_no_conjugaciones.txt',
  FALLBACK_WORD_LIST_URL: './Diccionario.Espanol.136k.palabras.txt',
  RAE_CACHE_KEY: 'rae_words_oficial_cache_v1',
  RAE_CACHE_TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30 días
  CACHE_KEY: "es_words_50k_cache_v1",
  CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 días
  
  // Hunspell
  HUNS_AFF_KEY: 'hunspell_es_ANY_aff_v1',
  HUNS_DIC_KEY: 'hunspell_es_ANY_dic_v1',
  HUNS_TTL_MS: 1000 * 60 * 60 * 24 * 30, // 30 días
  
  // Parámetros
  PARAMS_KEY: 'dictado_params_v1',
  ERROR_BANK_KEY: 'dictado_error_bank_v1',
  MEANING_CACHE_KEY: 'dictado_meaning_cache_v1',
  
  // Límites y configuración
  MAX_WORD_LENGTH: 15,
  MIN_WORD_LENGTH: 2,
  DEFAULT_WORD_COUNT: 50,
  MAX_CONSIDERED_WORDS: 20000,
  
  // TTS
  TTS_RATE: 0.75,
  TTS_MOBILE_RATE: 0.8,
  TTS_VOLUME: 1.0,
  TTS_PITCH: 1.0,
  
  // Tiempos
  WORD_DELAY_MS: 2200,
  FIRST_WORD_DELAY_MS: 700,
  VOICE_WAIT_MS: 200,
  MAX_VOICE_ATTEMPTS: 8
};

// 📌 Listas de palabras por niveles
const palabrasPorNivel = {
  facil: ["gato", "perro", "mesa", "casa", "flor", "pan", "luz", "sol", "agua", "niño", 
          "mamá", "papá", "amor", "vida", "día", "año", "mano", "pie", "ojo", "boca"],
  medio: ["camión", "árbol", "fácil", "zapato", "ventana", "película", "corazón", "fútbol", "música", "avión",
          "teléfono", "computadora", "refrigerador", "bicicleta", "automóvil", "universidad", "hospital", 
          "biblioteca", "restaurante", "supermercado"],
  dificil: ["otorrinolaringólogo", "paralelepípedo", "electroencefalografía", "esternocleidomastoideo", 
            "pseudohipoparatiroidismo", "pneumonoultramicroscopicsilicovolcanoconiósis", "hipopotomonstrosesquipedaliofobia",
            "anticonstitucionalísimamente", "desoxirribonucleótido", "tetrahidroxicannabinol"]
};

// ============================================================================
// UTILIDADES DE CACHÉ Y PERSISTENCIA
// ============================================================================

class CacheManager {
  static get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`Error reading cache key ${key}:`, e);
      return null;
    }
  }

  static set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn(`Error writing cache key ${key}:`, e);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`Error removing cache key ${key}:`, e);
      return false;
    }
  }

  static isExpired(timestamp, ttl) {
    return Date.now() - timestamp > ttl;
  }
}
// Lista negra expandida de términos a excluir por defecto (no considerados léxico escolar/RAE en este contexto)
const EXCLUDE_DEFAULT = new Set([
  'allah', 'wifi', 'web', 'chat', 'email', 'online', 'software', 'hardware', 'internet',
  'blog', 'mouse', 'click', 'link', 'spam', 'hacker', 'backup', 'update', 'download',
  'upload', 'login', 'logout', 'password', 'username', 'hashtag', 'selfie', 'streaming',
  'podcast', 'youtuber', 'influencer', 'gamer', 'app', 'smartphone', 'tablet', 'laptop',
  'bluetooth', 'usb', 'led', 'lcd', 'hd', 'dvd', 'cd', 'mp3', 'jpeg', 'pdf', 'html',
  'css', 'javascript', 'python', 'java', 'php', 'sql', 'api', 'url', 'http', 'https',
  'ftp', 'dns', 'ip', 'vpn', 'ssl', 'seo', 'cms', 'crm', 'erp', 'b2b', 'b2c',
  'startup', 'freelance', 'coworking', 'networking', 'brainstorming', 'feedback',
  'workshop', 'webinar', 'tutorial', 'demo', 'beta', 'alpha', 'release', 'patch',
  'bug', 'debug', 'script', 'code', 'coding', 'developer', 'frontend', 'backend',
  'fullstack', 'framework', 'library', 'plugin', 'widget', 'template', 'theme',
  'responsive', 'mobile', 'desktop', 'server', 'hosting', 'domain', 'subdomain',
  'database', 'query', 'table', 'field', 'record', 'index', 'cache', 'cookie',
  'session', 'token', 'encryption', 'firewall', 'antivirus', 'malware', 'phishing',
  'trojan', 'virus', 'worm', 'ransomware', 'adware', 'spyware', 'rootkit',
  'keylogger', 'botnet', 'ddos', 'dos', 'exploit', 'vulnerability', 'patch',
  'hotfix', 'rollback', 'deployment', 'staging', 'production', 'testing',
  'quality', 'assurance', 'agile', 'scrum', 'kanban', 'sprint', 'backlog',
  'user', 'story', 'epic', 'feature', 'requirement', 'specification', 'documentation',
  'manual', 'guide', 'faq', 'support', 'helpdesk', 'ticket', 'issue', 'request',
  'enhancement', 'improvement', 'optimization', 'performance', 'scalability',
  'availability', 'reliability', 'maintainability', 'usability', 'accessibility',
  'compatibility', 'interoperability', 'portability', 'reusability', 'modularity',
  'extensibility', 'flexibility', 'robustness', 'stability', 'consistency',
  'integrity', 'security', 'privacy', 'confidentiality', 'authentication',
  'authorization', 'audit', 'compliance', 'governance', 'risk', 'management'
]);

// Lista de prefijos y sufijos comunes en préstamos lingüísticos
const FOREIGN_PREFIXES = new Set([
  'cyber', 'e-', 'mega', 'super', 'ultra', 'multi', 'inter', 'trans', 'pre', 'post',
  'anti', 'pro', 'auto', 'semi', 'pseudo', 'quasi', 'neo', 'retro', 'meta'
]);

const FOREIGN_SUFFIXES = new Set([
  'ing', 'tion', 'sion', 'ness', 'ment', 'able', 'ible', 'ful', 'less', 'ship',
  'ward', 'wise', 'like', 'ism', 'ist', 'ity', 'fy', 'ize', 'ise', 'age',
  'ance', 'ence', 'ous', 'ious', 'eous', 'uous', 'ary', 'ery', 'ory', 'ive'
]);

// Patrones de palabras que no son típicamente españolas
const NON_SPANISH_PATTERNS = [
  /^[bcdfghjklmnpqrstvwxyz]{4,}$/i, // 4+ consonantes seguidas
  /[qwxy](?![u])/i, // q sin u, w, x, y en posiciones no españolas
  /k[^aeiou]/i, // k seguida de consonante
  /[aeiou]{4,}/i, // 4+ vocales seguidas
  /^[aeiou][aeiou][aeiou]/i, // 3 vocales al inicio
  /[bcdfghjklmnpqrstvwxyz][bcdfghjklmnpqrstvwxyz][bcdfghjklmnpqrstvwxyz]/i, // 3 consonantes seguidas
  /[^aeiouñ][^aeiouñ][^aeiouñ][^aeiouñ]/i, // 4 consonantes seguidas (incluyendo ñ como vocal)
];

// Diccionario básico de palabras españolas comunes para validación rápida
const SPANISH_CORE_WORDS = new Set([
  'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
  'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como',
  'pero', 'sus', 'le', 'ya', 'o', 'porque', 'cuando', 'muy', 'sin', 'sobre', 'también',
  'me', 'hasta', 'donde', 'quien', 'desde', 'todos', 'durante', 'todo', 'ella', 'ser',
  'dos', 'él', 'tiempo', 'casa', 'día', 'vida', 'hombre', 'mundo', 'año', 'estado',
  'país', 'agua', 'parte', 'lugar', 'trabajo', 'gobierno', 'persona', 'momento',
  'mano', 'manera', 'vez', 'caso', 'noche', 'aquí', 'palabra', 'mayor', 'cada',
  'nuevo', 'otros', 'mismo', 'ese', 'bajo', 'tanto', 'estos', 'hacer', 'otro',
  'forma', 'mucho', 'poco', 'bien', 'saber', 'qué', 'cómo', 'cuál', 'cuándo',
  'dónde', 'quién', 'cuánto', 'más', 'menos', 'mejor', 'peor', 'grande', 'pequeño',
  'bueno', 'malo', 'primero', 'último', 'siguiente', 'anterior', 'arriba', 'abajo',
  'dentro', 'fuera', 'cerca', 'lejos', 'antes', 'después', 'ahora', 'entonces',
  'siempre', 'nunca', 'hoy', 'ayer', 'mañana', 'tarde', 'noche', 'día', 'semana',
  'mes', 'año', 'hora', 'minuto', 'segundo', 'momento', 'vez', 'veces'
]);

// Nivel dinámico construido desde diccionario externo (cuando esté listo)
let palabrasPorNivelDinamico = null;
let cargandoDiccionario = false;

// Variables globales refactorizadas (mantenidas para compatibilidad)
let palabras = [];
let indice = 0;
let aciertos = 0;
let currentNivel = null;
let resultsLog = [];

// Función para sincronizar con el nuevo estado
function syncWithGameState() {
  palabras = gameState.words;
  indice = gameState.currentIndex;
  aciertos = gameState.correctAnswers;
  currentNivel = gameState.currentLevel;
  resultsLog = gameState.resultsLog;
}

function syncToGameState() {
  gameState.words = palabras;
  gameState.currentIndex = indice;
  gameState.correctAnswers = aciertos;
  gameState.currentLevel = currentNivel;
  gameState.resultsLog = resultsLog;
}

// --- Hunspell (Typo.js) modo estricto ---
let typoEs = null;            // instancia Typo
let hunspellLoading = false;  // bandera de carga
let hunspellReady = null;     // Promise

// ============================================================================
// GESTIÓN DE ESTADO DEL JUEGO
// ============================================================================

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.words = [];
    this.currentIndex = 0;
    this.correctAnswers = 0;
    this.currentLevel = null;
    this.resultsLog = [];
    this.sessionStartISO = null;
    this.lastStartTime = 0;
  }

  getCurrentWord() {
    return this.words[this.currentIndex];
  }

  hasMoreWords() {
    return this.currentIndex < this.words.length;
  }

  nextWord() {
    this.currentIndex++;
  }

  addResult(word, userAnswer, isCorrect, timeMs) {
    this.resultsLog.push({
      fechaISO: new Date().toISOString(),
      nivel: this.currentLevel || "-",
      palabra: word,
      respuesta: userAnswer,
      correcto: isCorrect ? "Sí" : "No",
      tiempoMs
    });
  }

  getStats() {
    const total = this.words.length;
    const correct = this.correctAnswers;
    const incorrect = total - correct;
    const percentage = total ? Math.round((correct / total) * 100) : 0;
    
    return { total, correct, incorrect, percentage };
  }

  getErrors() {
    return this.resultsLog.filter(r => r.correcto === 'No');
  }
}

// Instancia global del estado del juego
const gameState = new GameState();

async function ensureHunspellES_ANY() {
  if (typoEs) return typoEs;
  if (hunspellReady) return hunspellReady;
  hunspellReady = (async () => {
    // Intentar cache local usando CacheManager
    let aff = null, dic = null;
    try {
      const cachedAff = CacheManager.get(CONFIG.HUNS_AFF_KEY);
      const cachedDic = CacheManager.get(CONFIG.HUNS_DIC_KEY);
      
      if (cachedAff && cachedDic && 
          !CacheManager.isExpired(cachedAff.ts, CONFIG.HUNS_TTL_MS) &&
          !CacheManager.isExpired(cachedDic.ts, CONFIG.HUNS_TTL_MS)) {
        aff = cachedAff.data;
        dic = cachedDic.data;
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

// Función de prueba para significados
async function probarSignificados() {
  const palabrasPrueba = ['casa', 'perro', 'árbol', 'corazón'];
  console.log('=== PRUEBA DE SIGNIFICADOS ===');
  
  for (const palabra of palabrasPrueba) {
    console.log(`\nProbando palabra: "${palabra}"`);
    try {
      const sig1 = await fetchSignificadoPreciso(palabra);
      console.log(`fetchSignificadoPreciso: ${sig1 || 'null'}`);
      
      if (!sig1) {
        const sig2 = await fetchDesdeWikipediaEs(palabra);
        console.log(`fetchDesdeWikipediaEs: ${sig2 || 'null'}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
  console.log('=== FIN PRUEBA ===');
}

    if (!aff || !dic) {
      // Descargar desde LibreOffice/dictionaries (es_ANY)
      const urlAff = 'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/es/es_ANY.aff';
      const urlDic = 'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/es/es_ANY.dic';
      const [rAff, rDic] = await Promise.all([fetch(urlAff), fetch(urlDic)]);
      if (!rAff.ok || !rDic.ok) throw new Error('No se pudo cargar Hunspell es_ANY');
      aff = await rAff.text();
      dic = await rDic.text();
      // Guardar en caché usando CacheManager
      CacheManager.set(CONFIG.HUNS_AFF_KEY, { ts: Date.now(), data: aff });
      CacheManager.set(CONFIG.HUNS_DIC_KEY, { ts: Date.now(), data: dic });
    }
    typoEs = new Typo('es_ANY', aff, dic, { platform: 'any' });
    return typoEs;
  })();
  return hunspellReady;
}

// Función mejorada de validación de palabras españolas
// Filtrar palabras RAE por nivel (simplificado)
function filtrarPalabrasRAE(words, nivel) {
  const lengthRanges = {
    1: [3, 5],   // Básico: 3-5 letras
    2: [4, 7],   // Intermedio: 4-7 letras
    3: [5, 10],  // Avanzado: 5-10 letras
    4: [3, 15]   // Experto: 3-15 letras
  };
  
  const [minLen, maxLen] = lengthRanges[nivel] || [3, 10];
  
  return words.filter(word => {
    if (!word || word.length < minLen || word.length > maxLen) return false;
    
    // Filtros básicos (las palabras RAE ya son puras)
    if (word.includes('-') || word.includes('.')) return false;
    if (word.match(/^[^a-záéíóúüñ]/i)) return false;
    
    return true;
  });
}

// Validar palabra escrita por el usuario
function validarPalabraUsuario(userWord, correctWord) {
  const user = String(userWord || '').trim().toLowerCase();
  const correct = String(correctWord || '').trim().toLowerCase();
  
  if (!user || !correct) return false;
  
  // Comparación exacta
  if (user === correct) return true;
  
  // Permitir variaciones de acentos comunes
  const normalizeAccents = (str) => {
    return str
      .replace(/[áà]/g, 'a')
      .replace(/[éè]/g, 'e')
      .replace(/[íì]/g, 'i')
      .replace(/[óò]/g, 'o')
      .replace(/[úù]/g, 'u');
  };
  
  return normalizeAccents(user) === normalizeAccents(correct);
}

async function checkSpanish(word) {
  try {
    const w = String(word || '').trim().toLowerCase();
    if (!w) return false;
    
    // Si tenemos la lista RAE, usar esa para validación
    if (raeWordsData.wordsSet.size > 0) {
      return raeWordsData.wordsSet.has(w);
    }
    
    // Validación rápida: si está en el diccionario básico, es válida
    if (SPANISH_CORE_WORDS.has(w)) return true;
    
    // Aplicar filtros locales antes de consultar Hunspell
    if (!isLikelySpanish(w)) return false;
    
    const t = await ensureHunspellES_ANY();
    if (!t) {
      // Si Hunspell falla, usar solo validación local
      return isLikelySpanish(w) && !hasNonSpanishCharacteristics(w);
    }
    
    // Probar tal cual, en minúsculas y capitalizada (nombres propios)
    if (t.check(w)) return true;
    const cap = w.charAt(0).toUpperCase() + w.slice(1);
    if (cap !== w && t.check(cap)) return true;
    
    return false;
  } catch(_) { 
    // Si hay error, usar validación local como respaldo
    const w = String(word || '').trim().toLowerCase();
    return isLikelySpanish(w) && !hasNonSpanishCharacteristics(w);
  }
}

// Función auxiliar para determinar si una palabra parece española
function isLikelySpanish(word) {
  if (!word || typeof word !== 'string') return false;
  
  const w = word.toLowerCase().trim();
  
  // Debe contener solo caracteres del español
  if (!/^[a-záéíóúüñ]+$/.test(w)) return false;
  
  // Debe tener al menos una vocal y una consonante
  if (!/[aeiouáéíóúü]/.test(w) || !/[bcdfghjklmnñpqrstvwxyz]/.test(w)) return false;
  
  // No debe estar en la lista negra
  if (EXCLUDE_DEFAULT.has(w)) return false;
  
  // Verificar patrones no españoles
  if (NON_SPANISH_PATTERNS.some(pattern => pattern.test(w))) return false;
  
  return true;
}

// Función auxiliar para detectar características no españolas
function hasNonSpanishCharacteristics(word) {
  if (!word || typeof word !== 'string') return true;
  
  const w = word.toLowerCase().trim();
  
  // Verificar dígrafos extranjeros
  if (/(kh|sh|th|ph|gh|ck|dg|ng|nk|sch|tch|wh|zh)/i.test(w)) return true;
  
  // Verificar consonantes dobles no españolas
  if (/(bb|cc|dd|ff|gg|hh|jj|kk|mm|nn|pp|qq|ss|tt|vv|ww|xx|yy|zz)/i.test(w)) return true;
  
  // Verificar combinaciones poco españolas
  if (/(tz|ck|dj|gn|kn|pn|ps|pt|sc|sk|sl|sm|sn|sp|st|sw|tw|wr|xc|xt|yl|yn|ys|yt)/i.test(w)) return true;
  
  // Verificar terminaciones extranjeras
  if (/h$/.test(w)) return true;
  
  // Verificar prefijos y sufijos extranjeros
  const hasForeignPrefix = Array.from(FOREIGN_PREFIXES).some(prefix => w.startsWith(prefix));
  const hasForeignSuffix = Array.from(FOREIGN_SUFFIXES).some(suffix => w.endsWith(suffix));
  
  return hasForeignPrefix || hasForeignSuffix;
}

// Refresca el diccionario Hunspell (borra cache y fuerza nueva descarga en el próximo uso)
function actualizarDiccionarioHunspell() {
  // Usar CacheManager para limpiar caché
  CacheManager.remove(CONFIG.HUNS_AFF_KEY);
  CacheManager.remove(CONFIG.HUNS_DIC_KEY);
  
  // Reset de instancias para que se vuelva a cargar
  typoEs = null;
  hunspellReady = null;
  
  showUserMessage('Diccionario actualizado. Se recargará al iniciar el próximo ejercicio en modo estricto.');
}

// Función auxiliar para mostrar mensajes al usuario
function showUserMessage(message, type = 'info') {
  try {
    alert(message);
  } catch(_) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
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
  
  // Configuración de página para pie de página
  const pageWidth = 595;
  const pageHeight = 842;
  
  // Función para agregar pie de página al reporte
  const addReportFooter = (pageNum, totalPages) => {
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 120, pageHeight - 20);
    pdf.text('Autor: GMR', 40, pageHeight - 20);
  };
  
  try {
    console.log(`[DEBUG PDF] resultsLog al iniciar PDF:`, resultsLog);
    console.log(`[DEBUG PDF] resultsLog.length:`, resultsLog?.length);
    console.log(`[DEBUG PDF] gameState.resultsLog:`, gameState.resultsLog);
    
    const alumno = (document.getElementById('alumno')?.value || '').trim();
    const curso = (document.getElementById('curso')?.value || '').trim();
    const nivel = gameState.currentLevel || currentNivel || '-';
    const filtroLetras = (document.getElementById('filtroLetras')?.value || '').trim();
    const todas = document.getElementById('todasLasLetras')?.checked ? 'Sí' : 'No';
    const cant = (document.getElementById('cantidad')?.value || '').trim() || 'todas';
    const acentosObligatorios = document.getElementById('acentosObligatorios')?.checked ? 'Sí' : 'No';
    
    // Intentar obtener resultados de múltiples fuentes
    let resultados = [];
    if (Array.isArray(resultsLog) && resultsLog.length > 0) {
      resultados = resultsLog;
      console.log(`[DEBUG PDF] Usando resultsLog global: ${resultados.length} elementos`);
    } else if (Array.isArray(gameState.resultsLog) && gameState.resultsLog.length > 0) {
      resultados = gameState.resultsLog;
      console.log(`[DEBUG PDF] Usando gameState.resultsLog: ${resultados.length} elementos`);
    } else {
      console.log(`[DEBUG PDF] No hay resultados disponibles en ninguna fuente`);
    }
    
    const total = resultados.length;
    const correctas = resultados.filter(r => r.correcto === 'Sí').length;
    const porcentaje = total ? Math.round((correctas / total) * 100) : 0;
    
    // Usar gameState.sessionStartISO o fallback a sessionStartISO global
    const fechaInicio = gameState.sessionStartISO || sessionStartISO;
    const fechaSesion = fechaInicio ? new Date(fechaInicio).toLocaleString() : new Date().toLocaleString();

    // Calcular total de páginas del reporte (siempre 2: resumen + detalle)
    const totalReportPages = resultados.length > 0 ? 2 : 1;

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
        ['Letras a reforzar', filtroLetras || '-'],
        ['Acentos obligatorios', acentosObligatorios],
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

    // Agregar pie de página a la primera página
    addReportFooter(1, totalReportPages);

    // Página 2: Detalle (similar a hoja "Detalle")
    console.log(`[DEBUG PDF] Resultados para segunda página: ${resultados.length} elementos`);
    console.log(`[DEBUG PDF] pdf.autoTable disponible: ${!!pdf.autoTable}`);
    
    // Siempre agregar la segunda página si hay resultados
    if (resultados.length > 0) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text('Detalle de intentos', 40, 40);
      pdf.setFontSize(10);
      pdf.text(`Alumno: ${alumno || '-'}  ·  Curso/Grupo: ${curso || '-'}  ·  Nivel: ${nivel}`, 40, 58);

      if (pdf.autoTable) {
        const head2 = [[ 'Fecha','Nivel','Palabra','Respuesta','Correcto','Tiempo (ms)','Significado' ]];
        const body2 = await Promise.all(resultados.map(async r => {
          // Buscar significado solo para palabras incorrectas
          let significado = '';
          const esIncorrecta = r.correcto !== 'Sí' && r.correcto !== true;
          
          if (esIncorrecta) {
            console.log(`[DEBUG PDF] Buscando significado para palabra correcta: "${r.palabra}"`);
            significado = getCachedMeaning(r.palabra) || '';
            if (!significado) {
              try {
                significado = await fetchSignificadoPreciso(r.palabra);
                if (!significado) {
                  // Fallback a Wikipedia si falla la API principal
                  significado = await fetchDesdeWikipediaEs(r.palabra);
                }
                significado = significado || 'Definición no disponible';
                console.log(`[DEBUG PDF] Significado encontrado para "${r.palabra}": ${significado ? 'SÍ' : 'NO'}`);
              } catch(err) {
                console.log(`[DEBUG PDF] Error buscando significado para "${r.palabra}":`, err);
                significado = 'Definición no disponible';
              }
            }
            // El significado ya viene procesado por sanitizeMeaning() que limita a 80 caracteres
            // No necesitamos procesamiento adicional aquí
          }
          
          return [
            r.fechaISO || '',
            r.nivel || '',
            r.palabra || '',
            r.respuesta || '',
            r.correcto || '',
            String(r.tiempoMs ?? ''),
            significado
          ];
        }));
        pdf.autoTable({
          startY: 70,
          head: head2,
          body: body2,
          styles: { 
            fontSize: 9, 
            cellPadding: 3,
            overflow: 'linebreak',
            valign: 'top'
          },
          headStyles: { 
            fillColor: [15, 99, 245], 
            halign: 'center', 
            valign: 'middle', 
            textColor: 255 
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 25 },
            2: { cellWidth: 60 },
            3: { cellWidth: 60 },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 35, halign: 'right' },
            6: { 
              cellWidth: 230, 
              overflow: 'linebreak',
              cellPadding: 3,
              fontSize: 8,
              valign: 'top'
            }
          },
          margin: { left: 40, right: 40 },
          rowPageBreak: 'avoid',
          didParseCell: function (data) {
            // Colorear la columna "Palabra" (índice 2) según si es correcta
            if (data.column.index === 2) {
              const rowIndex = data.row.index;
              const resultado = resultados[rowIndex];
              if (resultado) {
                const esCorrecta = resultado.correcto === 'Sí' || resultado.correcto === true;
                data.cell.styles.textColor = esCorrecta ? [0, 128, 0] : [220, 53, 69]; // Verde o rojo
              }
            }
            // Colorear la columna "Respuesta" (índice 3) según si es correcta
            if (data.column.index === 3) {
              const rowIndex = data.row.index;
              const resultado = resultados[rowIndex];
              if (resultado) {
                const esCorrecta = resultado.correcto === 'Sí' || resultado.correcto === true;
                data.cell.styles.textColor = esCorrecta ? [0, 128, 0] : [220, 53, 69]; // Verde o rojo
              }
            }
            // Configuración especial para la columna de significado
            if (data.column.index === 6) {
              data.cell.styles.overflow = 'linebreak';
              data.cell.styles.valign = 'top';
              data.cell.styles.fontSize = 8;
            }
          }
        });
        
        // Agregar pie de página a la segunda página
        addReportFooter(2, totalReportPages);
      } else {
        // Fallback si autoTable no está disponible
        let yPos = 80;
        pdf.setFontSize(8);
        resultados.forEach((r, index) => {
          if (yPos > 750) { // Nueva página si se acaba el espacio
            pdf.addPage();
            yPos = 40;
          }
          pdf.text(`${index + 1}. ${r.palabra} → "${r.respuesta}" (${r.correcto}) - ${r.tiempoMs}ms`, 40, yPos);
          yPos += 15;
        });
      }
    }

    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    const alumnoSlug = (alumno).replace(/[^\w\-]+/g,'_');
    const cursoSlug = (curso).replace(/[^\w\-]+/g,'_');
    const meta = [alumnoSlug, cursoSlug].filter(Boolean).join('_');
    const base = `Reporte_Final_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}`;
    const fileName = meta ? `${base}_${meta}.pdf` : `${base}.pdf`;
    
    // Crear blob para poder abrir el archivo
    const pdfBlob = pdf.output('blob');
    
    pdf.save(fileName);
    
    // Mostrar confirmación después de la descarga
    setTimeout(() => {
      showDownloadModal('Reporte PDF', fileName, '', pdfBlob);
    }, 500);
  } catch (e) {
    console.error('Fallo al generar PDF', e);
    try { alert('Ocurrió un error al generar el PDF.'); } catch(_) {}
  }
}

// ============================================================================
// NAVEGACIÓN OPTIMIZADA CON ENTER
// ============================================================================

function configurarEnterSiguiente() {
  const fieldOrder = ['alumno', 'curso', 'filtroLetras', 'cantidad', 'btnNext'];
  
  const focusElement = (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) return false;
    
    element.focus();
    if (element.select && elementId !== 'btnNext') {
      try { element.select(); } catch(_) {}
    }
    return true;
  };
  
  fieldOrder.forEach((id, index) => {
    const element = document.getElementById(id);
    if (!element) return;
    
    element.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      
      if (id === 'btnNext') {
        goNextFromConfig();
        return;
      }
      
      // Buscar siguiente elemento válido
      for (let i = index + 1; i < fieldOrder.length; i++) {
        if (focusElement(fieldOrder[i])) break;
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

// ============================================================================
// UTILIDADES OPTIMIZADAS
// ============================================================================

// Función optimizada para mezclar arrays (Fisher-Yates)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Función optimizada para obtener elementos del DOM
function getElement(id) {
  return document.getElementById(id);
}

// Función optimizada para mostrar/ocultar elementos
function toggleElement(id, show) {
  const element = getElement(id);
  if (element) {
    element.style.display = show ? '' : 'none';
  }
  return element;
}

// Función optimizada para limpiar campos de entrada
function clearInputs(...ids) {
  ids.forEach(id => {
    const element = getElement(id);
    if (element) {
      if (element.type === 'checkbox') {
        element.checked = false;
      } else {
        element.value = '';
      }
    }
  });
}

// Función optimizada para validar campos requeridos
function validateRequiredFields(fields) {
  const errors = [];
  
  fields.forEach(({ id, name }) => {
    const element = getElement(id);
    const value = (element?.value || '').trim();
    
    if (!value) {
      errors.push({ id, name, element });
    }
  });
  
  return errors;
}

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
  return CacheManager.get(getErrorBankKey()) || {};
}

function guardarBancoErrores(bank) {
  CacheManager.set(getErrorBankKey(), bank);
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
  // Verificar caché usando CacheManager
  const cached = CacheManager.get(CONFIG.CACHE_KEY);
  if (cached && !CacheManager.isExpired(cached.ts, CONFIG.CACHE_TTL_MS) && 
      Array.isArray(cached.data) && cached.data.length > 0) {
    console.log(`[DEBUG CARGA] Usando palabras desde caché: ${cached.data.length} palabras`);
    return cached.data;
  }

  console.log(`[DEBUG CARGA] Intentando cargar desde: ${CONFIG.RAE_WORD_LIST_URL}`);
  const resp = await fetch(CONFIG.RAE_WORD_LIST_URL);
  if (!resp.ok) {
    console.log(`[DEBUG CARGA] Error cargando archivo principal, código: ${resp.status}`);
    throw new Error("No se pudo descargar la lista de palabras");
  }
  const text = await resp.text();
  console.log(`[DEBUG CARGA] Archivo cargado exitosamente, tamaño: ${text.length} caracteres`);
  // Formato: "palabra frecuencia" por línea
  const lines = text.split(/\r?\n/);
  const data = [];
  const visto = new Set();
  const reEspanol = /^[a-záéíóúüñ]+$/; // solo letras del español en minúsculas
  const reVocal = /[aeiouáéíóúü]/;
  const reConsonante = /[bcdfghjklmnñpqrstvwxyz]/;
  // Heurísticas expandidas para evitar préstamos y grafías no propias del español estándar
  const reFinalH = /h$/;                 // casi inexistente en español estándar
  const reForeignDigraphs = /(kh|sh|th|ph|gh|ck|dg|ng|nk|sch|tch|wh|zh)/i; // comunes en préstamos
  const reDoubleConsonants = /(bb|cc|dd|ff|gg|hh|jj|kk|ll|mm|nn|pp|qq|ss|tt|vv|ww|xx|yy|zz)/i; // consonantes dobles no españolas (excepto rr, ll, cc en algunos casos)
  const reUncommonCombos = /(tz|ck|dj|gn|kn|pn|ps|pt|sc|sk|sl|sm|sn|sp|st|sw|tw|wr|xc|xt|yl|yn|ys|yt)/i; // combinaciones poco españolas
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
    // Aplicar filtros avanzados de patrones no españoles
    if (reFinalH.test(palabra)) continue;
    if (reForeignDigraphs.test(palabra)) continue;
    if (reDoubleConsonants.test(palabra)) continue;
    if (reUncommonCombos.test(palabra)) continue;
    
    // Verificar patrones generales no españoles
    if (NON_SPANISH_PATTERNS.some(pattern => pattern.test(palabra))) continue;
    
    // Verificar prefijos y sufijos extranjeros
    const haseForeignPrefix = Array.from(FOREIGN_PREFIXES).some(prefix => palabra.startsWith(prefix));
    const hasForeignSuffix = Array.from(FOREIGN_SUFFIXES).some(suffix => palabra.endsWith(suffix));
    if (haseForeignPrefix || hasForeignSuffix) continue;
    
    // Filtro adicional: palabras demasiado largas (posibles compuestos técnicos)
    if (palabra.length > 15) continue;
    
    // Filtro adicional: palabras con números o caracteres especiales
    if (/[0-9_\-@#$%&*+=<>{}\[\]\|\\/:;"'`~^]/.test(palabra)) continue;
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
  // Guardar en caché usando CacheManager
  CacheManager.set(CONFIG.CACHE_KEY, { ts: Date.now(), data });
  return data;
}

async function prepararNivelesDinamicos() {
  if (palabrasPorNivelDinamico || cargandoDiccionario) return; // ya listo o en progreso
  cargandoDiccionario = true;
  try {
    const data = await obtenerListaFrecuencias();
    console.log(`[DEBUG DINAMICO] Datos cargados: ${data.length} palabras`);
    
    // Construir niveles por rangos de ranking y criterios de dificultad mejorados
    const top = data.slice(0, CONFIG.MAX_CONSIDERED_WORDS).map(d => d.palabra);
    
    // Nivel Fácil: palabras comunes con desafíos ortográficos básicos
    const facilCandidatas = top.slice(0, 2000);
    const facil = facilCandidatas.filter(palabra => {
      return palabra.length >= 4 && palabra.length <= 7 && 
             (/[áéíóúüñ]/.test(palabra) || // incluir acentos y ñ
              palabra.includes('ll') || palabra.includes('rr') ||
              palabra.includes('ch') || palabra.includes('qu') ||
              /[bv]/.test(palabra) || /[gj]/.test(palabra)) && // b/v, g/j
             !/[qwxyz]/.test(palabra); // evitar letras muy raras
    }).slice(0, 600);
    console.log(`[DEBUG DINAMICO] Nivel Fácil: ${facil.length} palabras de ${facilCandidatas.length} candidatas`);
    console.log(`[DEBUG DINAMICO] Ejemplos fácil:`, facil.slice(0, 5));
    
    // Nivel Medio: palabras con múltiples desafíos ortográficos
    const medioCandidatas = top.slice(1000, 8000);
    const medio = medioCandidatas.filter(palabra => {
      return palabra.length >= 6 && palabra.length <= 10 &&
             ((/[áéíóúüñ]/.test(palabra) && /[bvgj]/.test(palabra)) || // acentos + b/v o g/j
              /[áéíóúüñ].*[áéíóúüñ]/.test(palabra) || // múltiples acentos
              (palabra.includes('cc') || palabra.includes('sc')) ||
              (palabra.includes('mp') || palabra.includes('mb')) ||
              /[hx]/.test(palabra) || // h muda, x
              palabra.includes('gu') || palabra.includes('qu'));
    }).slice(0, 800);
    console.log(`[DEBUG DINAMICO] Nivel Medio: ${medio.length} palabras de ${medioCandidatas.length} candidatas`);
    console.log(`[DEBUG DINAMICO] Ejemplos medio:`, medio.slice(0, 5));
    
    // Nivel Difícil: palabras muy complejas y desafiantes
    const dificilCandidatas = top.slice(3000);
    const dificil = dificilCandidatas.filter(palabra => {
      return (palabra.length >= 9 || // palabras muy largas
             (/[áéíóúüñ].*[áéíóúüñ].*[áéíóúüñ]/.test(palabra)) || // 3+ acentos
             (palabra.includes('cc') && /[áéíóúüñ]/.test(palabra)) ||
             (palabra.includes('sc') && palabra.length >= 8) ||
             palabra.includes('xc') || palabra.includes('mn') ||
             palabra.includes('pt') || palabra.includes('ct') ||
             /[wy]/.test(palabra) || // letras muy raras
             (/^[aeiou].*[aeiou].*[aeiou].*[aeiou]/.test(palabra) && palabra.length >= 8)) && // 4+ vocales en palabras largas
             palabra.length <= 15; // evitar palabras excesivamente largas
    }).slice(0, 500);
    console.log(`[DEBUG DINAMICO] Nivel Difícil: ${dificil.length} palabras de ${dificilCandidatas.length} candidatas`);
    console.log(`[DEBUG DINAMICO] Ejemplos difícil:`, dificil.slice(0, 5));
    
    palabrasPorNivelDinamico = { facil, medio, dificil };
    console.log(`[DEBUG DINAMICO] Niveles dinámicos preparados exitosamente`);
  } catch (e) {
    // si falla, mantener null para usar la base local
    console.warn("Fallo al preparar niveles dinámicos:", e);
  } finally {
    cargandoDiccionario = false;
  }
}

// Función para filtrar solo letras/combinaciones difíciles de aprendizaje
function filtrarLetrasEspanol(input) {
  const valorOriginal = input.value;
  
  // Todas las letras y combinaciones permitidas
  const elementosPermitidos = [
    'b', 'v', 'g', 'j', 'c', 'z', 's', 'h', 'x', 'y', 'w',
    'll', 'rr', 'ch', 'qu', 'gu', 'gü',
    'br', 'bl', 'cr', 'cl', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr',
    'cc', 'sc', 'xc', 'mp', 'mb', 'nv', 'nf', 'nm'
  ];
  
  let resultado = '';
  
  // Permitir solo caracteres que forman parte de elementos válidos
  for (let i = 0; i < valorOriginal.length; i++) {
    const charActual = valorOriginal[i].toLowerCase();
    
    // Si es el primer carácter o estamos construyendo
    if (resultado.length === 0) {
      // Verificar si puede ser inicio de algún elemento válido
      let puedeSerInicio = false;
      
      for (const elemento of elementosPermitidos) {
        if (elemento.startsWith(charActual)) {
          puedeSerInicio = true;
          break;
        }
      }
      
      if (puedeSerInicio) {
        resultado += valorOriginal[i];
      }
    } else {
      // Ya tenemos algo, verificar si al agregar este carácter sigue siendo válido
      const posibleElemento = (resultado + valorOriginal[i]).toLowerCase();
      let esValido = false;
      
      // Verificar si es exactamente un elemento válido
      if (elementosPermitidos.includes(posibleElemento)) {
        resultado += valorOriginal[i];
        break; // Elemento completo encontrado, terminar
      } else {
        // Verificar si puede ser parte de un elemento más largo
        for (const elemento of elementosPermitidos) {
          if (elemento.startsWith(posibleElemento)) {
            resultado += valorOriginal[i];
            esValido = true;
            break;
          }
        }
        
        if (!esValido) {
          break; // No puede formar ningún elemento válido
        }
      }
    }
  }
  
  // Solo actualizar si es diferente
  if (valorOriginal !== resultado) {
    input.value = resultado;
    input.setSelectionRange(resultado.length, resultado.length);
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
  ["alumno","curso","filtroLetras","cantidad"].forEach(id => {
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
  goToPage('page-config');
  // Enfocar alumno al cargar
  const alumnoInit = document.getElementById('alumno');
  if (alumnoInit) { alumnoInit.focus(); try { alumnoInit.select(); } catch (_) {} }
})();

function goToPage(pageId) {
  const ids = ['page-config','page-game','page-report'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('active', id === pageId);
    }
  });
  
  // Preseleccionar primer campo cuando se abre la página 2
  if (pageId === 'page-game') {
    setTimeout(() => {
      const cantidadField = document.getElementById('cantidad');
      if (cantidadField && !cantidadField.disabled) {
        cantidadField.focus();
        try { cantidadField.select(); } catch (_) {}
      }
    }, 100);
  }
  
  // Si navegamos al reporte, asegurarnos de mostrarlo y hacer scroll a los botones
  if (pageId === 'page-report') {
    const rep = document.getElementById('reporteFinal');
    if (rep) rep.style.display = 'block';
    
    // Hacer scroll hacia los botones de descarga después de un pequeño delay
    setTimeout(() => {
      const reportSection = document.getElementById('page-report');
      if (reportSection) {
        const buttons = reportSection.querySelector('.actions');
        if (buttons) {
          buttons.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
    }, 100);
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
    const now = new Date().toISOString();
    sessionStartISO = now;
    gameState.sessionStartISO = now;
    gameState.reset();
    // Sincronizar variables globales con gameState
    syncWithGameState();
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

// ============================================================================
// ACTUALIZACIÓN DE METADATOS OPTIMIZADA
// ============================================================================

function refreshMetaAlumnoCurso(forceVisible = null) {
  const meta = document.getElementById('metaAlumnoCurso');
  if (!meta) return;
  
  const alumno = (document.getElementById('alumno')?.value || '').trim();
  const curso = (document.getElementById('curso')?.value || '').trim();
  
  const parts = [
    `Participante: ${alumno || '-'}`,
    `Curso/Grupo: ${curso || '-'}`
  ];
  
  // Agregar nivel si existe
  if (currentNivel) {
    const levelNames = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };
    parts.push(`Nivel: ${levelNames[currentNivel] || currentNivel}`);
  }
  
  // Agregar fecha en reporte
  const isReportPage = document.getElementById('page-report')?.classList.contains('active');
  if (isReportPage && sessionStartISO) {
    try {
      const date = new Date(sessionStartISO);
      parts.push(`Fecha: ${date.toLocaleString()}`);
    } catch(_) {}
  }
  
  meta.textContent = parts.join(' · ');
  
  // Determinar visibilidad
  const shouldShow = forceVisible !== null ? forceVisible : 
    (document.getElementById('page-game')?.classList.contains('active') || isReportPage);
  meta.style.display = shouldShow ? '' : 'none';
}

// Nueva función para seleccionar nivel y configurar acentos
function seleccionarNivel(nivel) {
  console.log(`[DEBUG] Seleccionando nivel: ${nivel}`);
  
  // Bloquear todos los elementos de configuración
  const cantidad = document.getElementById('cantidad');
  const filtroLetras = document.getElementById('filtroLetras');
  const strictMode = document.getElementById('strictMode');
  const acentosCheckbox = document.getElementById('acentosObligatorios');
  const btnActualizar = document.querySelector('button[onclick="actualizarDiccionarioHunspell()"]');
  
  // Deshabilitar todos los controles
  if (cantidad) cantidad.disabled = true;
  if (filtroLetras) filtroLetras.disabled = true;
  if (strictMode) strictMode.disabled = true;
  if (btnActualizar) btnActualizar.disabled = true;
  
  // Configurar checkbox de acentos según el nivel
  if (nivel === 'facil') {
    // Básico: siempre deshabilitado, forzar a false sin importar estado previo
    acentosCheckbox.checked = false;
    acentosCheckbox.disabled = true;
  } else if (nivel === 'medio' || nivel === 'dificil') {
    // Medio y Difícil: deshabilitar pero mantener el valor seleccionado
    acentosCheckbox.disabled = true;
  }
  
  // Bloquear todos los botones de nivel una vez seleccionado
  const bF = document.getElementById('btnNivelFacil');
  const bM = document.getElementById('btnNivelMedio');
  const bD = document.getElementById('btnNivelDificil');
  [bF, bM, bD].forEach(b => { if (b) b.disabled = true; });
  
  // Marcar el nivel seleccionado
  [bF, bM, bD].forEach(b => { if (b) b.classList.remove('btn-selected'); });
  const map = { facil: bF, medio: bM, dificil: bD };
  if (map[nivel]) map[nivel].classList.add('btn-selected');
  
  // Iniciar el juego
  iniciarJuego(nivel);
}

// Función para navegación con Enter entre campos
function handleEnterNavigation(event, nextElementId) {
  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    console.log(`[DEBUG] Navegando de ${event.target.id} a ${nextElementId}`);
    
    // Usar setTimeout para evitar conflictos con otros event handlers
    setTimeout(() => {
      const nextElement = document.getElementById(nextElementId);
      if (nextElement && !nextElement.disabled) {
        nextElement.focus();
        console.log(`[DEBUG] Focus puesto en ${nextElementId}`);
        // Si es un input de texto, seleccionar todo el contenido
        if (nextElement.type === 'text' || nextElement.type === 'number') {
          try { nextElement.select(); } catch (_) {}
        }
      } else {
        console.log(`[DEBUG] Elemento ${nextElementId} no encontrado o deshabilitado`);
      }
    }, 10);
  }
}

// Función para navegación con flechas entre botones de nivel
function handleArrowNavigation(event, rightElementId, leftElementId) {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    const rightElement = document.getElementById(rightElementId);
    if (rightElement && !rightElement.disabled) {
      rightElement.focus();
    }
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    const leftElement = document.getElementById(leftElementId);
    if (leftElement && !leftElement.disabled) {
      leftElement.focus();
    }
  }
}

// Hacer funciones disponibles globalmente para GitHub Pages
window.seleccionarNivel = seleccionarNivel;
window.goToPage = goToPage;
window.goNextFromConfig = goNextFromConfig;
window.irAlEjercicio = irAlEjercicio;
window.generarReportePDF = generarReportePDF;
window.generarPracticaManual = generarPracticaManual;
window.handleEnterNavigation = handleEnterNavigation;
window.handleArrowNavigation = handleArrowNavigation;

async function iniciarJuego(nivel) {
  console.log(`[DEBUG] Iniciando juego con nivel: ${nivel}`);
  
  // Validar campos obligatorios
  const alumnoEl2 = document.getElementById('alumno');
  const cursoEl2 = document.getElementById('curso');
  const alumnoVal = (alumnoEl2?.value || '').trim();
  const cursoVal = (cursoEl2?.value || '').trim();
  if (!alumnoVal || !cursoVal) {
    const msg = 'Faltan datos de alumno o curso.';
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
  
  console.log(`[DEBUG NIVEL] Usando fuente: ${palabrasPorNivelDinamico ? 'DINAMICA' : 'ESTATICA'}`);
  console.log(`[DEBUG NIVEL] Nivel: ${nivel}, palabras disponibles: ${base.length}`);
  console.log(`[DEBUG NIVEL] Primeras 10 palabras del nivel ${nivel}:`, base.slice(0, 10));
  currentNivel = nivel;
  guardarParametros(); // asegurar persistencia al iniciar
  // Actualizar meta para que muestre también el nivel
  refreshMetaAlumnoCurso(true);
  // Mostrar el panel del juego
  const juego = document.getElementById('juego');
  if (juego) juego.style.display = '';

  // Bloquear checkbox de acentos y botón volver durante el juego
  const acentosCheckbox = document.getElementById('acentosObligatorios');
  if (acentosCheckbox) {
    acentosCheckbox.disabled = true;
  }
  
  const btnVolver = document.getElementById('btnVolverGame');
  if (btnVolver) {
    btnVolver.disabled = true;
  }

  // Leer parámetros de UI
  const rawFiltro = document.getElementById("filtroLetras").value || "";
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
      // Siempre requerir que contenga TODAS las letras especificadas
      return filtros.every(f => pn.includes(f));
    });
  }

  // Modo estricto: validar con sistema mejorado de filtrado
  try {
    const strict = !!document.getElementById('strictMode')?.checked;
    if (strict) {
      console.log(`Aplicando modo estricto a ${candidatas.length} palabras candidatas...`);
      const filtered = [];
      let processedCount = 0;
      
      for (const w of candidatas) {
        processedCount++;
        // Mostrar progreso cada 100 palabras
        if (processedCount % 100 === 0) {
          console.log(`Procesadas ${processedCount}/${candidatas.length} palabras...`);
        }
        
        if (await checkSpanish(w)) {
          filtered.push(w);
        }
      }
      
      console.log(`Filtrado completado: ${filtered.length}/${candidatas.length} palabras válidas`);
      candidatas = filtered;
      
      // Notificaciones mejoradas con más información
      if (candidatas.length === 0) {
        try { 
          alert('Modo estricto: no hay palabras válidas tras el filtro avanzado. Sugerencias:\n• Ajusta los filtros de letras\n• Reduce la cantidad solicitada\n• Desactiva temporalmente el modo estricto'); 
        } catch(_) {}
      } else if (candidatas.length < 5) {
        try { 
          alert(`Modo estricto: solo ${candidatas.length} palabras válidas encontradas. Para obtener más palabras:\n• Relaja los filtros de letras\n• Desactiva temporalmente el modo estricto`); 
        } catch(_) {}
      } else if (candidatas.length < 20) {
        console.log(`Advertencia: Solo ${candidatas.length} palabras válidas. Considera relajar los filtros para obtener más variedad.`);
      }
    }
  } catch(error) {
    console.error('Error en modo estricto:', error);
    // En caso de error, mantener las candidatas sin filtrar
  }

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

  // Mezclar usando función optimizada
  candidatas = shuffleArray(candidatas);

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
  // Mezclar selección final
  palabras = shuffleArray(seleccion);

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

  // Scroll automático al campo de texto para mejor UX en móviles y desktop
  setTimeout(() => {
    const juegoElement = document.getElementById("juego");
    const respuestaInput = document.getElementById("respuesta");
    
    if (juegoElement && respuestaInput) {
      // Scroll suave al elemento del juego
      juegoElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      // Enfocar el campo de texto después del scroll y forzar deshabilitación de corrector
      setTimeout(() => {
        respuestaInput.focus();
        
        // Configurar input optimizado para escritorio
        respuestaInput.setAttribute('autocomplete', 'off');
        respuestaInput.setAttribute('autocorrect', 'off');
        respuestaInput.setAttribute('spellcheck', 'false');
        respuestaInput.setAttribute('data-ms-editor', 'false');
        respuestaInput.setAttribute('data-gramm', 'false');
        respuestaInput.setAttribute('data-gramm_editor', 'false');
        respuestaInput.setAttribute('data-enable-grammarly', 'false');
        respuestaInput.setAttribute('data-gramm-mode', 'false');
        respuestaInput.setAttribute('data-lt-installed', 'false');
        
        // Método adicional para iOS Safari
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          respuestaInput.style.webkitUserSelect = 'text';
          respuestaInput.style.webkitTouchCallout = 'none';
        }
      }, 500);
    }
  }, 100);

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
    }, CONFIG.FIRST_WORD_DELAY_MS);
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
    }, CONFIG.VOICE_WAIT_MS);
  } else {
    startFirst();
  }
}

// Persistencia de parámetros en localStorage
// ============================================================================
// GESTIÓN DE PARÁMETROS REFACTORIZADA
// ============================================================================

function guardarParametros() {
  const params = {
    alumno: document.getElementById('alumno')?.value || '',
    curso: document.getElementById('curso')?.value || '',
    filtroLetras: document.getElementById('filtroLetras')?.value || '',
    cantidad: document.getElementById('cantidad')?.value || '',
    strict: !!document.getElementById('strictMode')?.checked,
  };
  CacheManager.set(CONFIG.PARAMS_KEY, params);
  return params;
}

function cargarParametros() {
  const p = CacheManager.get(CONFIG.PARAMS_KEY);
  if (!p) return;
  
  if (p.alumno) document.getElementById('alumno').value = p.alumno;
  if (p.curso) document.getElementById('curso').value = p.curso;
  if (typeof p.filtroLetras === 'string') document.getElementById('filtroLetras').value = p.filtroLetras;
  if (typeof p.cantidad === 'string' || typeof p.cantidad === 'number') document.getElementById('cantidad').value = p.cantidad;
  if (typeof p.strict === 'boolean') document.getElementById('strictMode').checked = p.strict;
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
    // Solo aplicar a elementos de page-config, NO a page-game
    const elements = page.querySelectorAll('#alumno, #curso');
    elements.forEach(el => {
      const handler = (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          ev.stopPropagation();
          focusNextByTabIndex(ev.currentTarget);
        }
      };
      el.addEventListener('keydown', handler);
    });

    // Capturar Enter solo en page-config
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
  console.log(`[DEBUG] reproducirPalabra() llamada. Índice: ${indice}, palabra: ${palabra}`);
  if (!palabra) {
    console.log(`[DEBUG] No hay palabra en índice ${indice}, saliendo de reproducirPalabra()`);
    return;
  }

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

  // Verificar si los acentos son obligatorios
  const acentosObligatorios = document.getElementById('acentosObligatorios')?.checked || false;
  
  let esCorrect;
  if (acentosObligatorios) {
    // Comparación exacta (con acentos)
    esCorrect = entrada.toLowerCase() === palabraCorrecta.toLowerCase();
  } else {
    // Comparación sin acentos (modo actual)
    esCorrect = normalizar(entrada) === normalizar(palabraCorrecta);
  }

  if (esCorrect) {
    resultado.innerHTML = "✅ ¡Correcto!";
    resultado.className = "correcto";
    aciertos++;
  } else {
    resultado.innerHTML = `<span style="color: #6c757d;">❌ Incorrecto. Escribiste:</span> <strong style="color: #dc3545;">"${entrada}"</strong> <span style="color: #6c757d;">| Era:</span> <strong style="color: #28a745;">"${palabraCorrecta}"</strong>`;
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
    correcto: esCorrect ? "Sí" : "No",
    tiempoMs
  });

  indice++;
  console.log(`[DEBUG] Después de incrementar índice: ${indice}, total palabras: ${palabras.length}`);
  
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
    console.log(`[DEBUG] Continuando con siguiente palabra. Índice: ${indice}, palabra: ${palabras[indice]}`);
    // No reproducir automáticamente, esperar a que el usuario presione Enter
    console.log(`[DEBUG] Esperando Enter del usuario para reproducir la siguiente palabra`);
  } else {
    console.log(`[DEBUG] Juego terminado. Índice: ${indice}, total: ${palabras.length}`);
    const total = palabras.length;
    const correctas = aciertos;
    const incorrectas = total - correctas;
    const porcentaje = total ? Math.round((correctas / total) * 100) : 0;

    document.getElementById("marcador").innerHTML =
      `Juego terminado. Aciertos: ${correctas}/${total} (${porcentaje}%)`;

    // Desbloquear solo checkbox de acentos al terminar el juego
    // El botón volver permanece bloqueado para forzar ir al reporte
    const acentosCheckbox = document.getElementById('acentosObligatorios');
    if (acentosCheckbox) {
      acentosCheckbox.disabled = false;
    }

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
          html += `<li><strong style="color:#dc3545;">${e.palabra}</strong> — escrito: "<span style="color:#dc3545;">${e.respuesta}</span>"<div id="${itemId}" style="color:#334155; margin-top:2px;">Buscando significado...</div></li>`;
        });
        html += '</ul></div>';
      } else {
        html += '<div style="font-size:14px; color: var(--muted);">¡Sin errores! 🎉</div>';
      }
      rep.innerHTML = html;
      rep.style.display = 'block';

      // Cargar significados en segundo plano
      const promises = errores.map((e, idx) => {
        console.log(`[DEBUG] Buscando significado para palabra correcta: "${e.palabra}"`);
        return fetchSignificadoPreciso(e.palabra)
          .then(sig => {
            console.log(`[DEBUG] Significado encontrado para "${e.palabra}": ${sig ? 'SÍ' : 'NO'}`);
            return { idx, sig, palabra: e.palabra };
          })
          .catch(err => {
            console.log(`[DEBUG] Error buscando significado para "${e.palabra}":`, err);
            return { idx, sig: null, palabra: e.palabra };
          });
      });
      
      Promise.all(promises).then(resArr => {
        resArr.forEach(({ idx, sig, palabra }) => {
          const el = document.getElementById(`def_${idx}`);
          if (!el) return;
          if (sig) {
            el.textContent = `Significado: ${sig}`;
            el.style.color = '#334155';
          } else {
            // Intentar con fuentes alternativas si falla
            el.textContent = 'Buscando en fuentes alternativas...';
            el.style.color = '#6b7280';
            
            // Fallback: buscar en Wikipedia
            fetchDesdeWikipediaEs(palabra).then(wikisig => {
              if (wikisig) {
                el.textContent = `Significado: ${wikisig}`;
                el.style.color = '#334155';
              } else {
                el.textContent = `Significado no disponible para "${palabra}".`;
                el.style.color = '#9ca3af';
              }
            }).catch(() => {
              el.textContent = `Significado no disponible para "${palabra}".`;
              el.style.color = '#9ca3af';
            });
          }
        });
        // Listo el reporte en pantalla; mostrar botón para continuar al reporte final
        const btn = document.getElementById('btnToReport');
        if (btn) { 
          btn.style.display = ''; 
          btn.focus(); 
          // Hacer scroll hacia abajo para mostrar el botón "Siguiente"
          setTimeout(() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        }
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
  const bF = document.getElementById('btnNivelFacil');
  const bM = document.getElementById('btnNivelMedio');
  const bD = document.getElementById('btnNivelDificil');
  [bF,bM,bD].forEach(b => { if (b) { b.disabled = false; b.classList.remove('btn-selected'); } });
  
  // Rehabilitar botón volver y checkbox de acentos al limpiar juego
  const btnVolver = document.getElementById('btnVolverGame');
  if (btnVolver) {
    btnVolver.disabled = false;
  }
  
  const acentosCheckbox = document.getElementById('acentosObligatorios');
  if (acentosCheckbox) {
    acentosCheckbox.disabled = false;
    acentosCheckbox.checked = false;
  }

  // Volver a la página del juego (selector de nivel visible)
  goToPage('page-game');
  // Mantener subtítulo visible en juego
  refreshMetaAlumnoCurso(true);
}

// --- Diccionario: obtener significado con caché ---
const MEANING_CACHE_KEY = 'dictado_meaning_cache_v1';
function cargarCacheSignificados() {
  return CacheManager.get(CONFIG.MEANING_CACHE_KEY) || {};
}

function guardarCacheSignificados(cache) {
  CacheManager.set(CONFIG.MEANING_CACHE_KEY, cache);
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
    // Filtrar textos con formato problemático de Wikcionario (espacios entre caracteres)
    if (/^[A-Za-z]\s+[A-Za-z]\s+[A-Za-z]/.test(s)) {
      console.log(`[DEBUG] Descartando significado con formato problemático: "${s.substring(0, 50)}..."`);
      return null;
    }
    // Filtrar textos que contengan muchos símbolos extraños
    if (/[²¹⁵ᵃ®⁰]/.test(s)) {
      console.log(`[DEBUG] Descartando significado con símbolos extraños: "${s.substring(0, 50)}..."`);
      return null;
    }
    // Filtrar textos con patrones de espaciado problemático (como "n u e s t r o  s i s t e m a")
    if (/[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]/.test(s)) {
      console.log(`[DEBUG] Descartando significado con espaciado problemático: "${s.substring(0, 50)}..."`);
      return null;
    }
    // Limitar longitud y truncar en puntos naturales para PDF
    if (s.length > 80) {
      const naturalBreaks = ['. ', '; ', ', '];
      let cutPoint = 80;
      
      for (const breakChar of naturalBreaks) {
        const lastBreak = s.lastIndexOf(breakChar, 80);
        if (lastBreak > 40) {
          cutPoint = lastBreak + breakChar.length;
          break;
        }
      }
      s = s.substring(0, cutPoint).trim() + '...';
    }
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
  // Intento 3: Wikcionario en español (extracto) - DESHABILITADO por formato problemático
  // try {
  //   const defW = sanitizeMeaning(await fetchDesdeWikcionario(palabra));
  //   if (defW) {
  //     cache[key] = { def: defW, ts: Date.now() };
  //     guardarCacheSignificados(cache);
  //     return defW;
  //   }
  // } catch(_) {}
  // Intento 4: RAE API (más preciso para español)
  try {
    const raeResp = await fetch(`https://dle.rae.es/data/search?w=${encodeURIComponent(palabra)}`);
    if (raeResp.ok) {
      const raeData = await raeResp.json();
      if (raeData.res && raeData.res.length > 0) {
        const primerResultado = raeData.res[0];
        if (primerResultado.header) {
          const defRAE = sanitizeMeaning(primerResultado.header);
          if (defRAE) {
            cache[key] = { def: defRAE, ts: Date.now() };
            guardarCacheSignificados(cache);
            return defRAE;
          }
        }
      }
    }
  } catch(_) {}
  
  return null; // No se encontró definición
}

// Nueva función con fuentes más precisas para español
async function fetchSignificadoPreciso(palabra) {
  const key = normalizar(palabra);
  const cache = cargarCacheSignificados();
  if (cache[key] && cache[key].def) return cache[key].def;
  
  // Intento 1: Fundéu (Fundación del Español Urgente) - muy preciso
  try {
    const fundeuResp = await fetch(`https://www.fundeu.es/consulta/${encodeURIComponent(palabra)}`);
    if (fundeuResp.ok) {
      const fundeuText = await fundeuResp.text();
      const definicion = extraerDefinicionFundeu(fundeuText);
      if (definicion) {
        cache[key] = { def: definicion, ts: Date.now() };
        guardarCacheSignificados(cache);
        return definicion;
      }
    }
  } catch(_) {}
  
  // Intento 2: WordReference ES-ES (muy confiable)
  try {
    const wrResp = await fetch(`https://www.wordreference.com/definicion/${encodeURIComponent(palabra)}`);
    if (wrResp.ok) {
      const wrText = await wrResp.text();
      const definicion = extraerDefinicionWordReference(wrText);
      if (definicion) {
        cache[key] = { def: definicion, ts: Date.now() };
        guardarCacheSignificados(cache);
        return definicion;
      }
    }
  } catch(_) {}
  
  // Intento 3: Usar la función original como fallback
  const fallback = await fetchSignificado(palabra);
  if (fallback) {
    return fallback;
  }
  
  return null; // No se encontró definición
}

// Función para extraer definición de Fundéu
function extraerDefinicionFundeu(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const content = doc.querySelector('.entry-content, .post-content, .content');
    if (content) {
      const text = content.textContent.trim();
      const sentences = text.split('.').filter(s => s.length > 20);
      return sentences[0] ? sentences[0].trim() + '.' : null;
    }
  } catch(_) {}
  return null;
}

// Función para extraer definición de WordReference
function extraerDefinicionWordReference(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const definition = doc.querySelector('.definition, .sense, .trans');
    if (definition) {
      return definition.textContent.trim();
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

// Función para generar PDF de práctica manual
function generarPracticaManual() {
  console.log('=== INICIO PRÁCTICA MANUAL ===');
  
  // Test básico primero - igual que la versión que funcionaba
  try {
    if (!window.jspdf) {
      alert('jsPDF no está cargado. Verifica que las librerías estén incluidas.');
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    // Obtener resultados del ejercicio
    let resultados = [];
    if (Array.isArray(resultsLog) && resultsLog.length > 0) {
      resultados = resultsLog;
    } else if (Array.isArray(gameState.resultsLog) && gameState.resultsLog.length > 0) {
      resultados = gameState.resultsLog;
    }

    // Verificar si hay datos del ejercicio
    if (!resultados || resultados.length === 0) {
      // Si no hay datos, crear PDF básico
      pdf.setFontSize(16);
      pdf.text('Práctica Manual de Ortografía', 20, 30);
      pdf.text('Completa primero un ejercicio para generar práctica', 20, 50);
      const pdfBlob1 = pdf.output('blob');
      pdf.save('practica-manual-sin-datos.pdf');
      
      // Mostrar confirmación después de la descarga
      setTimeout(() => {
        showDownloadModal('Práctica Manual', 'practica-manual-sin-datos.pdf', 'Completa primero un ejercicio para generar práctica.', pdfBlob1);
      }, 500);
      return;
    }

    // Filtrar palabras incorrectas
    const palabrasIncorrectas = resultados.filter(r => {
      const esCorrecta = r.correcto === 'Sí' || r.correcto === true || r.correcto === 'Si';
      return !esCorrecta;
    });

    if (palabrasIncorrectas.length === 0) {
      // Si no hay incorrectas, crear PDF básico
      pdf.setFontSize(16);
      pdf.text('Práctica Manual de Ortografía', 20, 30);
      pdf.text('¡Excelente! No hay palabras incorrectas para practicar', 20, 50);
      const pdfBlob2 = pdf.output('blob');
      pdf.save('practica-manual-sin-errores.pdf');
      
      // Mostrar confirmación después de la descarga
      setTimeout(() => {
        showDownloadModal('Práctica Manual', 'practica-manual-sin-errores.pdf', '¡Excelente! No hay palabras incorrectas para practicar.', pdfBlob2);
      }, 500);
      return;
    }

    // Extraer palabras correctas únicas
    const palabrasCorrectas = [...new Set(palabrasIncorrectas.map(r => r.palabra))];
    console.log('Palabras a practicar:', palabrasCorrectas);

    // Crear PDF con cuadrícula
    const pdf2 = new jsPDF('portrait', 'pt', 'a4');
    
    // Calcular total de páginas necesarias
    let totalPages = 1;
    if (palabrasCorrectas.length > 8) {
      const extraWords = palabrasCorrectas.length - 8;
      const wordsPerExtraPage = 8; // 2 filas de 4 palabras por página adicional
      totalPages += Math.ceil(extraWords / wordsPerExtraPage);
    }
    
    // Función para agregar pie de página
    const addFooter = (pageNum) => {
      pdf2.setFontSize(10);
      pdf2.setFont(undefined, 'normal');
      pdf2.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 120, pageHeight - 20);
      pdf2.text('Autor: GMR', 40, pageHeight - 20);
    };
    
    // Título
    pdf2.setFontSize(16);
    pdf2.text('Práctica Manual de Ortografía', 40, 40);
    
    const alumnoTexto = document.getElementById('alumno')?.value || 'Alumno';
    const cursoTexto = document.getElementById('curso')?.value || 'Curso';
    
    pdf2.setFontSize(10);
    pdf2.text(`Alumno: ${alumnoTexto}  ·  Curso/Grupo: ${cursoTexto}`, 40, 60);
    pdf2.text(`Palabras a practicar: ${palabrasCorrectas.length}`, 40, 75);

    // Configuración del layout mejorado
    const pageWidth = 595; // Ancho de página A4 en puntos
    const pageHeight = 842; // Alto de página A4 en puntos
    const margin = 40;
    const availableWidth = pageWidth - (margin * 2);
    
    // Primera sección: hasta 4 palabras en columnas
    const firstSectionY = 100;
    const colWidth = availableWidth / 4;
    const lineSpacing = 25; // Aumentado aún más para mejor separación
    const wordSpacing = 25;
    
    // Procesar primeras 4 palabras en columnas
    const firstFourWords = palabrasCorrectas.slice(0, 4);
    const remainingWords = palabrasCorrectas.slice(4);
    
    firstFourWords.forEach((palabra, colIndex) => {
      const x = margin + (colIndex * colWidth);
      let currentY = firstSectionY;
      
      // Título de la palabra
      pdf2.setFontSize(14);
      pdf2.setFont(undefined, 'bold');
      pdf2.text(palabra, x + 5, currentY);
      currentY += wordSpacing;
      
      // 10 líneas de práctica
      pdf2.setFont(undefined, 'normal');
      for (let line = 1; line <= 10; line++) {
        pdf2.line(x + 5, currentY, x + colWidth - 10, currentY);
        currentY += lineSpacing;
      }
    });
    
    // Agregar pie de página a la primera página
    addFooter(1);
    
    // Segunda sección: palabras adicionales (palabras 5-8 en la mitad de la primera página)
    if (remainingWords.length > 0) {
      const secondSectionWords = remainingWords.slice(0, 4); // Máximo 4 palabras más en la primera página
      const thirdSectionWords = remainingWords.slice(4); // Palabras 9+ van a nueva página
      
      // Procesar palabras 5-8 en la mitad de la primera página
      if (secondSectionWords.length > 0) {
        const secondSectionY = pageHeight / 2; // Mitad de la hoja
        const rowHeight = 280; // Aumentado para acomodar mayor espaciado
        
        secondSectionWords.forEach((palabra, colIndex) => {
          const x = margin + (colIndex * colWidth);
          let currentY = secondSectionY;
          
          // Título de la palabra
          pdf2.setFontSize(14);
          pdf2.setFont(undefined, 'bold');
          pdf2.text(palabra, x + 5, currentY);
          currentY += wordSpacing;
          
          // 10 líneas de práctica con el mismo ancho que el primer bloque
          pdf2.setFont(undefined, 'normal');
          for (let line = 1; line <= 10; line++) {
            pdf2.line(x + 5, currentY, x + colWidth - 10, currentY);
            currentY += lineSpacing;
          }
        });
      }
      
      // Tercera sección: palabras 9+ en nueva página desde el inicio
      if (thirdSectionWords.length > 0) {
        let currentPageNum = 2;
        pdf2.addPage();
        
        // Título de la nueva página
        pdf2.setFontSize(16);
        pdf2.setFont(undefined, 'bold');
        pdf2.text('Práctica Manual de Ortografía (continuación)', margin, 40);
        pdf2.setFontSize(10);
        pdf2.setFont(undefined, 'normal');
        pdf2.text(`Alumno: ${alumnoTexto}  ·  Curso/Grupo: ${cursoTexto}`, margin, 60);
        
        let wordIndex = 0;
        let currentRow = 0;
        const maxWordsPerRow = 4;
        const rowHeight = 280; // Aumentado para acomodar mayor espaciado
        const newPageStartY = 100; // Comenzar desde arriba en la nueva página
        
        while (wordIndex < thirdSectionWords.length) {
          const wordsInThisRow = Math.min(maxWordsPerRow, thirdSectionWords.length - wordIndex);
          
          for (let col = 0; col < wordsInThisRow; col++) {
            const palabra = thirdSectionWords[wordIndex];
            const x = margin + (col * colWidth);
            let currentY = newPageStartY + (currentRow * rowHeight);
            
            // Título de la palabra
            pdf2.setFontSize(14);
            pdf2.setFont(undefined, 'bold');
            pdf2.text(palabra, x + 5, currentY);
            currentY += wordSpacing;
            
            // 10 líneas de práctica con el mismo ancho que el primer bloque
            pdf2.setFont(undefined, 'normal');
            for (let line = 1; line <= 10; line++) {
              pdf2.line(x + 5, currentY, x + colWidth - 10, currentY);
              currentY += lineSpacing;
            }
            
            wordIndex++;
          }
          currentRow++;
          
          // Si necesitamos más páginas
          if (newPageStartY + ((currentRow + 1) * rowHeight) > pageHeight - margin) {
            if (wordIndex < thirdSectionWords.length) {
              // Agregar pie de página antes de crear nueva página
              addFooter(currentPageNum);
              
              pdf2.addPage();
              currentPageNum++;
              currentRow = 0;
              // Repetir título en nueva página
              pdf2.setFontSize(16);
              pdf2.setFont(undefined, 'bold');
              pdf2.text('Práctica Manual de Ortografía (continuación)', margin, 40);
              pdf2.setFontSize(10);
              pdf2.setFont(undefined, 'normal');
              pdf2.text(`Alumno: ${alumnoTexto}  ·  Curso/Grupo: ${cursoTexto}`, margin, 60);
            }
          }
        }
        
        // Agregar pie de página a la última página
        addFooter(currentPageNum);
      }
    }
    
    // Descargar
    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    const alumnoSlug = alumnoTexto.replace(/\s+/g, '-');
    const base = `Practica_Manual_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}`;
    const nombreArchivo = alumnoSlug ? `${base}_${alumnoSlug}.pdf` : `${base}.pdf`;
    const pdfBlob3 = pdf2.output('blob');
    pdf2.save(nombreArchivo);
    console.log('PDF generado exitosamente');
    
    // Mostrar confirmación después de la descarga
    setTimeout(() => {
      showDownloadModal('Práctica Manual', nombreArchivo, '', pdfBlob3);
    }, 500);
    
  } catch (error) {
    console.error('Error en práctica manual:', error);
    alert('Error generando PDF: ' + error.message);
  }
}

// ============================================================================
// MODAL PERSONALIZADO PARA CONFIRMACIÓN DE DESCARGA
// ============================================================================

let currentDownloadedFile = null;
let currentDownloadedBlob = null;

function showDownloadModal(fileType, fileName, extraMessage = '', pdfBlob = null) {
  currentDownloadedFile = fileName;
  currentDownloadedBlob = pdfBlob;
  
  const modal = document.getElementById('downloadModal');
  const title = document.getElementById('modalTitle');
  const message = document.getElementById('modalMessage');
  
  title.textContent = `✅ ${fileType} Descargado`;
  
  let messageText = `Archivo descargado exitosamente:\n${fileName}`;
  if (extraMessage) {
    messageText += `\n\n${extraMessage}`;
  }
  
  message.textContent = messageText;
  message.style.whiteSpace = 'pre-line';
  
  modal.style.display = 'block';
  
  // Cerrar modal al hacer clic fuera de él
  modal.onclick = function(event) {
    if (event.target === modal) {
      closeDownloadModal();
    }
  };
}

function closeDownloadModal() {
  const modal = document.getElementById('downloadModal');
  modal.style.display = 'none';
  currentDownloadedFile = null;
  currentDownloadedBlob = null;
}

function openDownloadedFile() {
  if (!currentDownloadedFile || !currentDownloadedBlob) {
    alert('No hay archivo para abrir.');
    return;
  }
  
  try {
    // Crear URL del blob para abrir directamente
    const blobUrl = URL.createObjectURL(currentDownloadedBlob);
    
    // Abrir en nueva pestaña/ventana
    const newWindow = window.open(blobUrl, '_blank');
    
    if (!newWindow) {
      // Si el popup fue bloqueado, crear enlace temporal
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Limpiar URL después de un tiempo para liberar memoria
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 10000);
    
  } catch (error) {
    console.error('Error abriendo archivo:', error);
    alert('Error al abrir el archivo. Búscalo en tu carpeta de Descargas.');
  }
  
  closeDownloadModal();
}

// Cerrar modal con tecla Escape
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeDownloadModal();
  }
});

// (Eliminadas funciones de Excel/CSV: construirWorkbookDesdeResultados, generarReporteExcel, generarCSVfallback)
