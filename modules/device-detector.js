/**
 * Device Detector Module
 * Detecta el tipo de dispositivo usando un enfoque híbrido:
 * - Sistema Operativo (User Agent)
 * - Características táctiles (Touch + Pointer)
 * - Tamaño de pantalla
 */

/**
 * Detecta el sistema operativo del dispositivo
 * @returns {'iOS'|'Android'|'Windows'|'MacOS'|'Linux'|'Unknown'}
 */
function detectOS() {
    const userAgent = navigator.userAgent || '';
    const platform = navigator.platform || '';
    
    // iOS (incluye iPad moderno que reporta como MacIntel)
    if (/iPad|iPhone|iPod/.test(userAgent) || 
        (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        return 'iOS';
    }
    
    // Android
    if (/android/i.test(userAgent)) {
        return 'Android';
    }
    
    // Windows
    if (/Win/i.test(platform)) {
        return 'Windows';
    }
    
    // MacOS
    if (/Mac/i.test(platform)) {
        return 'MacOS';
    }
    
    // Linux
    if (/Linux/i.test(platform)) {
        return 'Linux';
    }
    
    return 'Unknown';
}

/**
 * Detecta el tipo de dispositivo usando enfoque híbrido
 * @returns {'mobile'|'tablet'|'desktop'|'unknown'}
 */
function detectDeviceType() {
    const os = detectOS();
    const userAgent = navigator.userAgent || '';
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const screenWidth = window.innerWidth;
    
    // iOS: siempre móvil o tablet
    if (os === 'iOS') {
        const isIPad = /iPad/.test(userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        return isIPad ? 'tablet' : 'mobile';
    }
    
    // Android: verificar si es tablet
    if (os === 'Android') {
        // Tablets Android NO tienen "Mobile" en el user agent
        const isTablet = !/Mobile/i.test(userAgent) && screenWidth >= 600;
        return isTablet ? 'tablet' : 'mobile';
    }
    
    // Windows/Mac/Linux: verificar si es tablet (Surface, etc.)
    if (os === 'Windows' || os === 'MacOS' || os === 'Linux') {
        // Tablet si tiene touch + pointer grueso + pantalla no muy grande
        // Excluir laptops táctiles que tienen mouse (fine pointer)
        if (hasTouch && hasCoarsePointer && !hasFinePointer && screenWidth < 1280) {
            return 'tablet';
        }
        return 'desktop';
    }
    
    return 'unknown';
}

/**
 * Determina si debe usar teclado virtual
 * @returns {boolean}
 */
function shouldUseVirtualKeyboard() {
    const deviceType = detectDeviceType();
    return deviceType === 'mobile' || deviceType === 'tablet';
}

/**
 * Obtiene información detallada del dispositivo
 * @returns {Object}
 */
function getDeviceInfo() {
    return {
        os: detectOS(),
        type: detectDeviceType(),
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        hasTouch: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
        touchPoints: navigator.maxTouchPoints || 0,
        hasCoarsePointer: window.matchMedia("(pointer: coarse)").matches,
        hasFinePointer: window.matchMedia("(pointer: fine)").matches,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        needsVirtualKeyboard: shouldUseVirtualKeyboard()
    };
}

// Exponer funciones globalmente
if (typeof window !== 'undefined') {
    window.DeviceDetector = {
        detectOS,
        detectDeviceType,
        shouldUseVirtualKeyboard,
        getDeviceInfo
    };
}
