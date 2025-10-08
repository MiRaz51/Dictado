(function(global){
  'use strict';
  try {
    if (!Object.getOwnPropertyDescriptor(global, 'raeWordsData') || !Object.getOwnPropertyDescriptor(global, 'raeWordsData').get) {
      Object.defineProperty(global, 'raeWordsData', {
        configurable: true,
        enumerable: true,
        get: function(){
          try { return (global.DataAPI && typeof global.DataAPI.getRaeData === 'function') ? global.DataAPI.getRaeData() : (global.__raeWordsDataLegacy || {}); } catch(_) { return global.__raeWordsDataLegacy || {}; }
        },
        set: function(v){
          try {
            if (global.DataAPI && typeof global.DataAPI.setRaeData === 'function') {
              global.DataAPI.setRaeData(v);
            } else {
              global.__raeWordsDataLegacy = v;
            }
          } catch(_) { global.__raeWordsDataLegacy = v; }
        }
      });
    }
  } catch(_) {}
})(typeof window !== 'undefined' ? window : this);
