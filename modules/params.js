(function(global){
  'use strict';

  const Params = {
    guardar(){
      try {
        const params = {
          alumno: document.getElementById('alumno')?.value || '',
          cantidad: document.getElementById('cantidad')?.value || '',
          strict: !!document.getElementById('strictMode')?.checked,
        };
        if (global.CacheManager && global.CONFIG) {
          CacheManager.set(global.CONFIG.PARAMS_KEY, params);
        }
        return params;
      } catch(e){ console.warn('[Params.guardar] error:', e); return null; }
    },

    cargar(){
      try {
        if (!(global.CacheManager && global.CONFIG)) return null;
        const p = CacheManager.get(global.CONFIG.PARAMS_KEY);
        if (!p) return null;
        if (p.alumno) document.getElementById('alumno').value = p.alumno;
        if (typeof p.cantidad === 'string' || typeof p.cantidad === 'number') {
          const el = document.getElementById('cantidad'); if (el) el.value = p.cantidad;
        }
        try { const el = document.getElementById('strictMode'); if (el) el.checked = !!p.strict; } catch(_) {}
        // Actualizar estado del botón después de cargar los parámetros
        setTimeout(() => this.updateNextEnabled(), 100);
        return p;
      } catch(e){ console.warn('[Params.cargar] error:', e); return null; }
    },

    updateNextEnabled(){
      try {
        const alumnoVal = (document.getElementById('alumno')?.value || '').trim();
        const btn = document.getElementById('btnNext');
        if (!btn) return false;
        const ready = !!(alumnoVal);
        btn.disabled = !ready;
        if (ready) btn.classList.remove('btn-ghost');
        else if (!btn.classList.contains('btn-ghost')) btn.classList.add('btn-ghost');
        return ready;
      } catch(_) { return false; }
    }
  };

  // Función global para compatibilidad con el HTML
  function validateFields() {
    try {
      return Params.updateNextEnabled();
    } catch(e) {
      console.error('[validateFields] Error:', e);
      return false;
    }
  }

  global.Params = Params;
  global.validateFields = validateFields;
  
  // Log de confirmación
  console.log('[Params] validateFields() expuesta globalmente');
})(typeof window !== 'undefined' ? window : globalThis);
