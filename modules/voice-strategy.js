(function(global){
  'use strict';
  function detectBrowser(){
    const ua = (navigator.userAgent || '').toLowerCase();
    const isEdge = ua.includes('edg/');
    const isChrome = !isEdge && ua.includes('chrome/') && !ua.includes('opr/') && !ua.includes('firefox');
    const isFirefox = ua.includes('firefox');
    const isOpera = ua.includes('opr/') || ua.includes('opera');
    const isSafari = !isChrome && !isEdge && !isOpera && ua.includes('safari');
    return { isChrome, isEdge, isFirefox, isOpera, isSafari, ua };
  }

  // Preferencias por navegador
  function pickVoice(voices){
    if (!Array.isArray(voices) || voices.length === 0) return null;
    const { isEdge, isChrome, isSafari, isFirefox, isOpera } = detectBrowser();

    const byName = (rxArr) => voices.find(v => rxArr.some(rx => rx.test(v.name)));
    const byLang = (rx) => voices.find(v => rx.test(v.lang));

    if (isEdge) {
      // Edge (Windows): priorizar voces Microsoft
      const edgePref = [
        /Microsoft\s+(Sabina|Helena|Elena|Laura|Pablo)/i,
        /Microsoft\s+Spanish/i
      ];
      const v1 = byName(edgePref);
      if (v1) return v1;
    }

    if (isChrome) {
      // Chrome: priorizar voces Google
      const chromePref = [
        /Google\s+español/i,
        /Google\s+Spanish/i
      ];
      const v1 = byName(chromePref);
      if (v1) return v1;
    }

    if (isSafari) {
      // Safari/macOS: priorizar voces nativas claras
      const safariPref = [
        /(Mónica|Monica|Jorge|Paulina)/i
      ];
      const v1 = byName(safariPref);
      if (v1) return v1;
    }

    if (isFirefox || isOpera) {
      // Firefox/Opera: elegir es-ES si está, sino cualquier es-*
      const esES = byLang(/^es-ES$/i);
      if (esES) return esES;
      const anyEs = byLang(/^es-/i);
      if (anyEs) return anyEs;
    }

    // Generales por idioma
    const esES = byLang(/^es-ES$/i);
    if (esES) return esES;
    const anyEs = byLang(/^es-/i);
    if (anyEs) return anyEs;

    // Fallback
    return voices[0];
  }

  global.VoiceStrategy = { detectBrowser, pickVoice };
})(typeof window !== 'undefined' ? window : globalThis);
