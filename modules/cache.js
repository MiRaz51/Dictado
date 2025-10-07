// CacheManager centralizado
// Uso: CacheManager.get(key), CacheManager.set(key, value), CacheManager.remove(key), CacheManager.isExpired(ts, ttl)
(function(global){
  class CacheManager {
    static get(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }
  
    static set(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    }
  
    static remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  
    static isExpired(timestamp, ttl) {
      return Date.now() - timestamp > ttl;
    }
  }
  global.CacheManager = CacheManager;
})(typeof window !== 'undefined' ? window : globalThis);
