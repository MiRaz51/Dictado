(function(global){
  'use strict';

  // Estado TTS
  let selectedVoice = null;
  let voicesReady = false;
  let ttsUnlocked = false;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  function elegirVozEspanol() {
    const voces = speechSynthesis.getVoices();
    if (!voces || voces.length === 0) return null;
    try {
      if (global.VoiceStrategy && typeof global.VoiceStrategy.pickVoice === 'function') {
        const picked = global.VoiceStrategy.pickVoice(voces);
        if (picked) return picked;
      }
    } catch(_) {}
    // 1) Priorizar voces de alta calidad por nombre
    const preferNames = [
      /Google\s+español/i,
      /Google\s+Spanish/i,
      /Microsoft\s+(Sabina|Helena|Elena|Laura)/i,
      /Microsoft\s+Spanish.*(Spain|Spain)/i
    ];
    for (const rx of preferNames) {
      const v = voces.find(voice => rx.test(voice.name));
      if (v) return v;
    }
    // 2) Luego por lang exacto es-ES
    const esES = voces.find(v => /^(es-ES)$/i.test(v.lang));
    if (esES) return esES;
    // 3) Luego cualquier es-*
    const anyEs = voces.find(v => /^es-/i.test(v.lang));
    if (anyEs) return anyEs;
    // 4) Fallback: primera voz disponible
    return voces[0];
  }

  function updateEnableAudioButton() {
    try {
      const shouldShow = isMobile && (!ttsUnlocked || !voicesReady);
      
      // Botón en modo individual
      const btn = document.getElementById('btnEnableAudio');
      if (btn) btn.style.display = shouldShow ? '' : 'none';
    } catch(_) {}
  }

  function initVoces() {
    const intentar = () => {
      selectedVoice = elegirVozEspanol();
      voicesReady = !!selectedVoice;
      try { renderVoiceInfo(); } catch(_) {}
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

  function unlockTTS() {
    if (ttsUnlocked) return Promise.resolve();
    return new Promise((resolve) => {
      try {
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) {
          speechSynthesis.onvoiceschanged = () => {
            selectedVoice = elegirVozEspanol();
            voicesReady = !!selectedVoice;
            updateEnableAudioButton();
          };
        }
        speechSynthesis.cancel();
        speechSynthesis.resume();
        
        // En móviles, usar un utterance audible muy breve para desbloquear correctamente
        const testMsg = new SpeechSynthesisUtterance('a');
        testMsg.volume = isMobile ? 0.01 : 0.0;
        testMsg.rate = 10.0;
        testMsg.lang = 'es-ES';
        
        const done = () => { 
          ttsUnlocked = true; 
          updateEnableAudioButton(); 
          resolve(); 
        };
        testMsg.onstart = done; 
        testMsg.onerror = done;
        testMsg.onend = done;
        
        speechSynthesis.speak(testMsg);
        setTimeout(() => { if (!ttsUnlocked) done(); }, 1000);
      } catch(e) { 
        ttsUnlocked = true; 
        updateEnableAudioButton(); 
        resolve(); 
      }
    });
  }

  // Auto-unlock en cada gesto (móvil) - NO remover listeners para que funcione en modo grupal
  if (isMobile) {
    const autoUnlock = () => {
      // Intentar desbloquear en cada toque (es idempotente)
      unlockTTS();
    };
    document.addEventListener('touchstart', autoUnlock, { capture: true, passive: true });
    document.addEventListener('click', autoUnlock, { capture: true, passive: true });
  }

  // Init voces al cargar
  try {
    initVoces();
    window.addEventListener('DOMContentLoaded', updateEnableAudioButton);
  } catch(_) {}

  // Exponer globals usados por app.js
  global.elegirVozEspanol = elegirVozEspanol;
  global.updateEnableAudioButton = updateEnableAudioButton;
  global.initVoces = initVoces;
  global.unlockTTS = unlockTTS;
  // --- utilidades de priming y reproducción segura ---
  let ttsPrimedMain = false;
  function waitForVoices(timeoutMs = 1500){
    return new Promise((resolve)=>{
      const have = () => (speechSynthesis.getVoices() || []).length > 0;
      if (have()) return resolve();
      let done=false;
      const h=()=>{ if (!done && have()) { done=true; cleanup(); resolve(); } };
      const cleanup=()=>{ try{ speechSynthesis.removeEventListener('voiceschanged', h);}catch(_){} clearTimeout(t); };
      try{ speechSynthesis.addEventListener('voiceschanged', h);}catch(_){}
      const t=setTimeout(()=>{ if(!done){ done=true; cleanup(); resolve(); } }, timeoutMs);
    });
  }
  function primeTTSMain(voice){
    if (ttsPrimedMain) return Promise.resolve();
    return new Promise((resolve)=>{
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0.0; u.rate = 1.0; u.pitch = 1.0; u.lang = (voice?.lang || 'es-ES');
        if (voice) u.voice = voice;
        u.onend = ()=>{ ttsPrimedMain = true; resolve(); };
        u.onerror = ()=>{ resolve(); };
        try { speechSynthesis.resume(); } catch(_){ }
        speechSynthesis.speak(u);
      } catch(_) { resolve(); }
    });
  }
  async function ensureTTSReady(voice){
    // Si hay un mute global, no preparar TTS
    if (typeof window !== 'undefined' && window.__ttsMuted) { return; }
    try { speechSynthesis.cancel(); } catch(_) {}
    await waitForVoices();
    await primeTTSMain(voice || selectedVoice || elegirVozEspanol());
    try { speechSynthesis.resume(); } catch(_){ }
  }
  /**
   * Reproduce texto garantizando priming silencioso previo.
   * opts: { voice, lang, rate, pitch, volume, onend, onerror }
   */
  async function speakWordSafe(text, opts={}){
    // Si hay un mute global, no reproducir
    if (typeof window !== 'undefined' && window.__ttsMuted) return 'muted';
    
    const voice = opts.voice || selectedVoice || elegirVozEspanol();
    await ensureTTSReady(voice);
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = opts.lang || voice?.lang || 'es-ES';
    u.rate = (typeof opts.rate === 'number') ? opts.rate : 1.0;
    u.pitch = (typeof opts.pitch === 'number') ? opts.pitch : 1.0;
    u.volume = (typeof opts.volume === 'number') ? opts.volume : 1.0;
    if (typeof opts.onend === 'function') u.onend = opts.onend;
    if (typeof opts.onerror === 'function') u.onerror = opts.onerror;
    speechSynthesis.speak(u);
    return new Promise((resolve)=>{ u.onend = ()=>{ if(opts.onend) try{opts.onend();}catch(_){} resolve('end'); }; u.onerror = (e)=>{ if(opts.onerror) try{opts.onerror(e);}catch(_){} resolve('error'); }; });
  }
  global.speakWordSafe = speakWordSafe;
  global.ensureTTSReady = ensureTTSReady;
  function renderVoiceInfo(){
    try {
      const el = document.getElementById('voiceInfo');
      if (!el) return;
      const v = selectedVoice;
      if (v) {
        el.textContent = `Voz seleccionada: ${v.name} — ${v.lang}`;
      } else {
        el.textContent = 'Voz seleccionada: (no disponible)';
      }
    } catch(_) {}
  }
  global.getSelectedVoiceInfo = function(){
    const v = selectedVoice;
    return v ? `${v.name} — ${v.lang}` : '(no disponible)';
  };
  Object.defineProperties(global, {
    selectedVoice: { get: () => selectedVoice, set: v => { selectedVoice = v; } },
    voicesReady: { get: () => voicesReady, set: v => { voicesReady = !!v; } },
    ttsUnlocked: { get: () => ttsUnlocked, set: v => { ttsUnlocked = !!v; } },
    isMobile: { get: () => isMobile }
  });
})(typeof window !== 'undefined' ? window : globalThis);
