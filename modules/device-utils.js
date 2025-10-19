/**
 * Utilidades de detección de dispositivos
 * Centraliza la lógica de detección de móviles/tablets
 */

(function(global) {
  'use strict';

  // Detectar si es móvil (una sola vez al cargar)
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Detectar si es tablet específicamente
  const isTablet = /(iPad|Android(?!.*Mobile))/i.test(navigator.userAgent);
  
  // Detectar si es iOS
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Detectar si es Android
  const isAndroid = /Android/i.test(navigator.userAgent);

  /**
   * Verifica si el dispositivo es móvil
   * @returns {boolean}
   */
  function checkIsMobile() {
    return isMobile;
  }

  /**
   * Verifica si el dispositivo es tablet
   * @returns {boolean}
   */
  function checkIsTablet() {
    return isTablet;
  }

  /**
   * Verifica si el dispositivo es iOS
   * @returns {boolean}
   */
  function checkIsIOS() {
    return isIOS;
  }

  /**
   * Verifica si el dispositivo es Android
   * @returns {boolean}
   */
  function checkIsAndroid() {
    return isAndroid;
  }

  /**
   * Verifica si el dispositivo es desktop
   * @returns {boolean}
   */
  function checkIsDesktop() {
    return !isMobile;
  }

  /**
   * Obtiene información del dispositivo
   * @returns {Object} Información del dispositivo
   */
  function getDeviceInfo() {
    return {
      isMobile,
      isTablet,
      isIOS,
      isAndroid,
      isDesktop: !isMobile,
      userAgent: navigator.userAgent
    };
  }

  // Exportar funciones y constantes
  global.DeviceUtils = {
    isMobile,
    isTablet,
    isIOS,
    isAndroid,
    isDesktop: !isMobile,
    checkIsMobile,
    checkIsTablet,
    checkIsIOS,
    checkIsAndroid,
    checkIsDesktop,
    getDeviceInfo
  };

  // Mantener compatibilidad con código existente
  global.isMobile = isMobile;

})(window);
