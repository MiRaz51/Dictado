/**
 * Module: config.js
 * Responsibility: Define CONFIG defaults and merge with any inline overrides.
 * Exports: window.CONFIG
 * Depends on: none
 * Load order: very early, before data-loader and any module that reads CONFIG
 */
(function(global){
  // Defaults for application configuration
  const defaults = {
    // URLs y archivos
    RAE_WORD_LIST_URL: './palabras-con-frecuencia.json',
    RAE_CACHE_KEY: 'rae_words_oficial_cache_v1',
    RAE_CACHE_TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30 días

    // Parámetros
    PARAMS_KEY: 'dictado_params_v1',
    ERROR_BANK_KEY: 'dictado_error_bank_v1',
    MEANING_CACHE_KEY: 'dictado_meaning_cache_v1',

    // Límites y configuración
    MAX_WORD_LENGTH: 15,
    MIN_WORD_LENGTH: 2,
    DEFAULT_WORD_COUNT: 25,
    MAX_CONSIDERED_WORDS: 20000,

    // TTS
    TTS_RATE: 0.75,
    TTS_MOBILE_RATE: 0.8,
    TTS_VOLUME: 1.0,
    TTS_PITCH: 1.0,

    // Tiempos
    VOICE_WAIT_MS: 200,
    MAX_VOICE_ATTEMPTS: 8,

    // Desarrollo
    DEV_DISABLE_SESSION_ID: false,
    DEV_FIXED_TUTOR_ID: 'TUTOR_DEV'
  };

  // Merge: inline window.CONFIG (if any) overrides defaults
  global.CONFIG = Object.assign({}, defaults, global.CONFIG || {});
})(typeof window !== 'undefined' ? window : this);
