/**
 * Module: data.js
 * Responsibility: Facade for accessing/preparing RAE data across modules.
 * Exports: window.DataAPI { getRaeData, setRaeData, isLoaded, ensurePrepared }
 * Depends on: window.DataLoader (optionally)
 * Load order: after data-loader.js, before modules that read RAE data through DataAPI
 */
(function(global){
  'use strict';

  const emptyData = {
    words: [],
    wordsSet: new Set(),
    wordsByLevel: { 1: [], 2: [], 3: [], 4: [] },
    loaded: false
  };

  const DataAPI = {
    getRaeData(){
      try { return global.raeWordsData || emptyData; } catch(_) { return emptyData; }
    },
    setRaeData(data){ try { global.raeWordsData = data; } catch(_) {} },
    isLoaded(){ try { return !!(global.raeWordsData && global.raeWordsData.loaded); } catch(_) { return false; } },
    ensurePrepared(){ try { if (global.DataLoader && typeof global.DataLoader.prepararNivelesDinamicos === 'function') global.DataLoader.prepararNivelesDinamicos(); } catch(_) {} },
  };

  global.DataAPI = global.DataAPI || DataAPI;
})(typeof window !== 'undefined' ? window : this);
