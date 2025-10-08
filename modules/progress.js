(function(global){
  'use strict';
  /**
   * Module: progress.js
   * Responsibility: Unified progress bar/text updates for both modes.
   * Exports: window.Progress.set(fillElOrId, textElOrId, current, total)
   * Depends on: none
   * Load order: before modules updating progress (individual/participant)
   */

  function _(elOrId){
    if (!elOrId) return null;
    if (typeof elOrId === 'string') return document.getElementById(elOrId);
    return elOrId;
  }

  function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

  function set(fillElOrId, textElOrId, current, total){
    try {
      const fill = _(fillElOrId);
      const txt = _(textElOrId);
      const t = Number(total || 0);
      const c = clamp(Number(current || 0), 0, t);
      const pct = t > 0 ? clamp(Math.round((c / t) * 100), 0, 100) : 0;
      if (fill) {
        try { fill.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)'; } catch(_) {}
        fill.style.width = `${pct}%`;
      }
      if (txt) txt.textContent = `${c}/${t}`;
    } catch(_) {}
  }

  global.Progress = global.Progress || { set };
})(typeof window !== 'undefined' ? window : this);
