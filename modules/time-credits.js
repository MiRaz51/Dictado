(function(global){
  'use strict';

  // Time Credits Module - Persistencia en localStorage por alumno
  // API pública:
  // - TimeCredits.getBalance(alumnoId?)
  // - TimeCredits.award({ wordsCorrect, totalWords, streaks, percent, exerciseId, reason })
  // - TimeCredits.redeem({ activity, minutes, pin, note })
  // - TimeCredits.getHistory({ limit })
  // - TimeCredits.getToday()

  const MOD_KEY = 'timeCredits';

  function getAlumnoIdSafe(){
    try { if (typeof global.getAlumnoCursoId === 'function') return String(global.getAlumnoCursoId()||'anon|sin-curso'); } catch(_) {}
    return 'anon|sin-curso';
  }

  function storageKey(alumnoId){
    const id = String(alumnoId || getAlumnoIdSafe());
    return `${MOD_KEY}:${id}`;
  }

  function todayISO(){
    try { return new Date().toISOString().slice(0,10); } catch(_) { return '1970-01-01'; }
  }

  function _defaultState(){
    return {
      minutesAvailable: 0,
      dailyTotals: {}, // { 'YYYY-MM-DD': { awarded: number, redeemed: number } }
      history: [],     // [{ id, type:'award'|'redeem', minutes, reason?, activity?, note?, exerciseId?, timestamp, checksum }]
      awardedExercises: {}, // exerciseId -> true
      config: {
        dailyLimit: (global.CONFIG && Number.isFinite(global.CONFIG.TIME_CREDITS_DAILY_LIMIT)) ? global.CONFIG.TIME_CREDITS_DAILY_LIMIT : 45,
        perExerciseLimit: (global.CONFIG && Number.isFinite(global.CONFIG.TIME_CREDITS_EXERCISE_LIMIT)) ? global.CONFIG.TIME_CREDITS_EXERCISE_LIMIT : 30
      }
    };
  }

  function _load(alumnoId){
    try {
      const raw = localStorage.getItem(storageKey(alumnoId));
      if (!raw) return _defaultState();
      const parsed = JSON.parse(raw);
      // merge defensivo con defaults
      const def = _defaultState();
      return {
        minutesAvailable: Number.isFinite(parsed.minutesAvailable) ? parsed.minutesAvailable : def.minutesAvailable,
        dailyTotals: parsed.dailyTotals && typeof parsed.dailyTotals === 'object' ? parsed.dailyTotals : def.dailyTotals,
        history: Array.isArray(parsed.history) ? parsed.history : def.history,
        awardedExercises: parsed.awardedExercises && typeof parsed.awardedExercises === 'object' ? parsed.awardedExercises : def.awardedExercises,
        config: Object.assign({}, def.config, (parsed.config||{}))
      };
    } catch(_) { return _defaultState(); }
  }

  function _save(state, alumnoId){
    try { localStorage.setItem(storageKey(alumnoId), JSON.stringify(state)); } catch(_) {}
  }

  function _cfg(state){
    const base = state && state.config ? state.config : _defaultState().config;
    const override = (global.CONFIG||{});
    return {
      dailyLimit: Number.isFinite(override.TIME_CREDITS_DAILY_LIMIT) ? override.TIME_CREDITS_DAILY_LIMIT : base.dailyLimit,
      perExerciseLimit: Number.isFinite(override.TIME_CREDITS_EXERCISE_LIMIT) ? override.TIME_CREDITS_EXERCISE_LIMIT : base.perExerciseLimit,
      pin: (typeof override.TIME_CREDITS_PIN === 'string') ? override.TIME_CREDITS_PIN : '1234',
      enabled: (override.TIME_CREDITS_ENABLED !== false)
    };
  }

  function _checksum(entry){
    try {
      const base = `${entry.type}|${entry.minutes}|${entry.reason||''}|${entry.activity||''}|${entry.exerciseId||''}|${entry.timestamp}`;
      // hash simple (no seguro criptográficamente, solo disuasivo)
      let h = 0; for (let i=0;i<base.length;i++){ h = (h<<5) - h + base.charCodeAt(i); h |= 0; }
      return `c${Math.abs(h)}`;
    } catch(_) { return 'c0'; }
  }

  function _pushHistory(state, entry){
    try {
      const e = Object.assign({}, entry);
      e.id = e.id || `${entry.type==='award'?'aw':'rd'}-${Date.now().toString(36)}-${Math.floor(Math.random()*1e4).toString(36)}`;
      e.timestamp = e.timestamp || new Date().toISOString();
      e.checksum = _checksum(e);
      state.history.unshift(e);
      // recortar historial a tamaño razonable
      if (state.history.length > 500) state.history.length = 500;
    } catch(_) {}
  }

  function _ensureDayTotals(state, day){
    if (!state.dailyTotals[day]) state.dailyTotals[day] = { awarded: 0, redeemed: 0 };
    return state.dailyTotals[day];
  }

  function getBalance(alumnoId){
    const id = alumnoId || getAlumnoIdSafe();
    const st = _load(id);
    const day = todayISO();
    const cfg = _cfg(st);
    const dt = _ensureDayTotals(st, day);
    return { minutesAvailable: st.minutesAvailable|0, todayUsed: dt.redeemed|0, todayAwarded: dt.awarded|0, dailyLimit: cfg.dailyLimit };
  }

  // Reglas base (por defecto) — pueden ajustarse desde los hooks
  function _awardRules({ wordsCorrect=0, percent=0, streakBonus=0 }){
    // +1 por palabra correcta a la primera (controlar desde el hook para no contar reintentos)
    const fromWords = (Number(wordsCorrect)||0) * 1;
    // Bonus de racha (ya calculado en el hook): +2 por cada racha de 5 -> streakBonus debe llegar como minutos
    const fromStreak = Number(streakBonus)||0;
    let finalBonus = 0;
    if (percent >= 90) finalBonus = 10; else if (percent >= 70) finalBonus = 5;
    return fromWords + fromStreak + finalBonus;
  }

  function award({ wordsCorrect=0, totalWords=0, streaks=0, percent=0, exerciseId='', reason='', customMinutes }={}){
    const id = getAlumnoIdSafe();
    const st = _load(id);
    const cfg = _cfg(st);
    if (!cfg.enabled) return { added: 0, balance: st.minutesAvailable|0 };

    const day = todayISO();
    const dt = _ensureDayTotals(st, day);

    // Evitar otorgamiento repetido por el mismo ejercicio (solo aplica al bono final por ejercicio)
    if (exerciseId && st.awardedExercises[exerciseId]) {
      // Aún podemos sumar minutos por palabras/rachas si lo envían separado sin exerciseId
      // Aquí asumimos que si viene exerciseId es bono final y por tanto se ignora si ya existe.
      return { added: 0, balance: st.minutesAvailable|0 };
    }

    // Calcular minutos a otorgar
    let minutes;
    if (Number.isFinite(customMinutes)) {
      minutes = Math.max(0, Math.floor(customMinutes));
    } else {
      // streaks: cantidad de rachas de 5 — traducimos a minutos (2 por racha)
      const streakBonus = (Number(streaks)||0) * 2;
      minutes = _awardRules({ wordsCorrect, percent, streakBonus });
    }
    minutes = Math.max(0, Math.floor(minutes));

    // Aplicar tope por ejercicio
    minutes = Math.min(minutes, cfg.perExerciseLimit);

    if (minutes <= 0) {
      return { added: 0, balance: st.minutesAvailable|0 };
    }

    // Aplicar tope diario: awarded no debe superar dailyLimit
    const remainingToday = Math.max(0, cfg.dailyLimit - (dt.awarded|0));
    const grant = Math.min(minutes, remainingToday);

    if (grant <= 0) {
      // Ya llegó al tope diario
      return { added: 0, balance: st.minutesAvailable|0, cappedByDailyLimit: true };
    }

    st.minutesAvailable = (st.minutesAvailable|0) + grant;
    dt.awarded = (dt.awarded|0) + grant;

    if (exerciseId) st.awardedExercises[exerciseId] = true;

    _pushHistory(st, { type: 'award', minutes: grant, reason: reason || (percent ? `exercise_bonus_${percent}` : 'words/streaks') , exerciseId });
    _save(st, id);

    return { added: grant, balance: st.minutesAvailable|0 };
  }

  function redeem({ activity='other', minutes=0, pin='', note='' }={}){
    const id = getAlumnoIdSafe();
    const st = _load(id);
    const cfg = _cfg(st);
    if (!cfg.enabled) return { redeemed: 0, balance: st.minutesAvailable|0 };

    const requiredPin = String(cfg.pin||'1234');
    if (String(pin||'') !== requiredPin) {
      return { error: 'PIN inválido', redeemed: 0, balance: st.minutesAvailable|0 };
    }

    minutes = Math.max(0, Math.floor(Number(minutes)||0));
    if (minutes <= 0) return { error: 'Minutos inválidos', redeemed: 0, balance: st.minutesAvailable|0 };

    const avail = st.minutesAvailable|0;
    const redeemable = Math.min(minutes, avail);
    if (redeemable <= 0) return { error: 'Sin saldo', redeemed: 0, balance: st.minutesAvailable|0 };

    const day = todayISO();
    const dt = _ensureDayTotals(st, day);

    st.minutesAvailable = avail - redeemable;
    dt.redeemed = (dt.redeemed|0) + redeemable;

    _pushHistory(st, { type: 'redeem', minutes: redeemable, activity, note });
    _save(st, id);

    return { redeemed: redeemable, balance: st.minutesAvailable|0 };
  }

  function getHistory({ limit=50 }={}){
    const id = getAlumnoIdSafe();
    const st = _load(id);
    return st.history.slice(0, Math.max(1, Math.min(500, limit)));
  }

  function getToday(){
    const id = getAlumnoIdSafe();
    const st = _load(id);
    const d = todayISO();
    const dt = _ensureDayTotals(st, d);
    return { day: d, awarded: dt.awarded|0, redeemed: dt.redeemed|0 };
  }

  // Calcular rango desde edad numérica (función unificada)
  function calcularRangoDesdeEdad(edad){
    try {
      const edadNum = parseInt(edad) || 0;
      if (edadNum < 6) return 0; // Edad inválida
      if (edadNum >= 6 && edadNum < 8) return 1;  // Rango 1: 6-7 años
      if (edadNum >= 8 && edadNum < 10) return 2; // Rango 2: 8-9 años
      if (edadNum >= 10 && edadNum < 12) return 3; // Rango 3: 10-11 años
      return 4; // Rango 4: 12+ años
    } catch(_) { return 0; }
  }

  // Calcular multiplicador de desafío basado en rango de edad y nivel
  function getChallengeMultiplier(rangoEdad, nivel){
    try {
      // Si rangoEdad es una edad numérica (>= 6), calcular el rango
      let rango = parseInt(rangoEdad) || 0;
      if (rango >= 6) {
        rango = calcularRangoDesdeEdad(rango);
      }
      if (rango < 1 || rango > 4) return 1.0;
      
      // Convertir nivel a número (1=básico, 2=intermedio, 3=avanzado, 4=experto)
      const nivelMap = { basico:1, intermedio:2, avanzado:3, experto:4, facil:1, medio:2, dificil:3 };
      const nivelNum = nivelMap[String(nivel||'').toLowerCase()] || 1;
      
      // Matriz de multiplicadores [rango][nivel-1]
      // Rango 1 (6-8): [1.0, 1.3, 1.6, 1.9]
      // Rango 2 (8-10): [0.8, 1.0, 1.3, 1.7]
      // Rango 3 (10-12): [0.7, 0.85, 1.0, 1.4]
      // Rango 4 (12+): [0.7, 0.8, 0.9, 1.0]
      const matrix = [
        [1.0, 1.3, 1.6, 1.9],  // Rango 1
        [0.8, 1.0, 1.3, 1.7],  // Rango 2
        [0.7, 0.85, 1.0, 1.4], // Rango 3
        [0.7, 0.8, 0.9, 1.0]   // Rango 4
      ];
      
      return matrix[rango - 1]?.[nivelNum - 1] || 1.0;
    } catch(_) { return 1.0; }
  }

  // Función unificada para calcular y otorgar créditos (individual y grupal)
  function calculateAndAwardCredits({ 
    correctas = 0, 
    total = 0, 
    nivel = '', 
    rangoEdad = '', 
    acentosActivos = false,
    porcentajeRefuerzo = 0,
    alumnoId = '',
    mode = 'individual' // 'individual' o 'group'
  } = {}) {
    try {
      if (!global.CONFIG || total === 0) return { added: 0, balance: 0 };
      
      // Validar que sea ejercicio completo (25 palabras por defecto)
      const requiredTotal = (global.CONFIG && Number.isFinite(global.CONFIG.TIME_CREDITS_REQUIRED_WORDS)) 
        ? global.CONFIG.TIME_CREDITS_REQUIRED_WORDS : 25;
      if (total !== requiredTotal) {
        return { added: 0, balance: 0, reason: 'incomplete_exercise' };
      }
      
      const porcentaje = total ? Math.round((correctas / total) * 100) : 0;
      
      // Generar exerciseId único
      const day = new Date().toISOString().slice(0,10);
      const sessionStart = (global.gameState?.sessionStartISO || global.sessionStartISO || new Date().toISOString());
      const exerciseId = `${alumnoId}|${day}|${nivel}|${total}|${sessionStart}`;
      
      // Calcular peso del nivel
      const lc = String(nivel || '').toLowerCase();
      const levelWeight = lc.includes('experto') || lc === '4' ? 1.5
                        : lc.includes('avanzado') || lc === '3' ? 1.3
                        : lc.includes('intermedio') || lc === '2' ? 1.15
                        : 1.0; // básico
      
      // Peso de acentos
      const accentsWeight = acentosActivos ? 1.15 : 1.0;
      
      // Peso de refuerzo de letras
      const prN = Math.max(0, Math.min(100, parseInt(porcentajeRefuerzo) || 0));
      const reinforceWeight = 1 + (prN * 0.003); // hasta +0.30 a 100%
      
      // Multiplicador de desafío (edad vs nivel)
      const challengeMultiplier = getChallengeMultiplier(rangoEdad, nivel);
      
      // Calcular peso total de dificultad
      const difficultyWeight = Math.max(1.0, Math.min(2.5, 
        levelWeight * accentsWeight * reinforceWeight * challengeMultiplier
      ));
      
      // Calcular minutos base
      const baseAt100 = (global.CONFIG && Number.isFinite(global.CONFIG.TIME_CREDITS_MAX_BASE_AT_100)) 
        ? global.CONFIG.TIME_CREDITS_MAX_BASE_AT_100 : 10;
      const baseMinutes = Math.max(0, (porcentaje / 100) * baseAt100);
      const customMinutes = Math.floor(baseMinutes * difficultyWeight);
      
      // Otorgar créditos
      const result = award({ 
        customMinutes, 
        percent: porcentaje, 
        exerciseId, 
        reason: `exercise_end_${mode}` 
      });
      
      // Actualizar badge si está disponible
      try { 
        if (typeof global.refreshTimeCreditsBadge === 'function') {
          global.refreshTimeCreditsBadge(); 
        }
      } catch(_) {}
      
      return result;
    } catch(e) {
      console.error('[TimeCredits] Error en calculateAndAwardCredits:', e);
      return { added: 0, balance: 0, error: e.message };
    }
  }

  const api = { 
    getBalance, 
    award, 
    redeem, 
    getHistory, 
    getToday, 
    getChallengeMultiplier,
    calculateAndAwardCredits,
    calcularRangoDesdeEdad
  };
  global.TimeCredits = global.TimeCredits || api;

})(typeof window !== 'undefined' ? window : globalThis);
