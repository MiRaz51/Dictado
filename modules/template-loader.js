(function(global){
  'use strict';

  async function loadTemplate(url){
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const container = document.createElement('div');
      container.innerHTML = html.trim();
      // Append all template nodes to body
      Array.from(container.childNodes).forEach(n => document.body.appendChild(n));
      return true;
    } catch(e) {
      console.error('[TemplateLoader] Error cargando', url, e);
      return false;
    }
  }

  async function loadTemplates(){
    const tasks = [];
    // Solo cargar si no existe en el DOM (id esperado)
    if (!document.getElementById('tplParticipantItem')) {
      tasks.push(loadTemplate('templates/tplParticipantItem.html'));
    }
    if (!document.getElementById('timeCreditsModal')) {
      tasks.push(loadTemplate('templates/tplTimeCreditsModal.html'));
    }
    if (!document.getElementById('tplSoftLimitBanner')) {
      tasks.push(loadTemplate('templates/tplSoftLimitBanner.html'));
    }
    if (!document.getElementById('tplHardLimitBanner')) {
      tasks.push(loadTemplate('templates/tplHardLimitBanner.html'));
    }
    await Promise.all(tasks);
  }

  function init(){
    loadTemplates().then(() => {
      try { document.dispatchEvent(new Event('templates:loaded')); } catch(_) {}
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();

  global.TemplateLoader = { loadTemplates };
})(typeof window !== 'undefined' ? window : globalThis);
