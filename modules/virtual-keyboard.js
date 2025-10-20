/**
 * Virtual Keyboard Module
 * Gestiona la integración de Simple Keyboard para dispositivos móviles/tablets
 */

class VirtualKeyboardManager {
    constructor() {
        this.keyboard = null;
        this.currentInput = null;
        this.isInitialized = false;
        this.container = null;
        this.mirror = null; // { el, text, caret }
    }

    /**
     * Inicializa el teclado virtual
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Verificar que Simple Keyboard esté cargado
            if (typeof SimpleKeyboard === 'undefined') {
                throw new Error('Simple Keyboard no está cargado. Verifica el CDN.');
            }

            // Crear contenedor si no existe
            this.createContainer();

            // Inicializar Simple Keyboard
            this.keyboard = new SimpleKeyboard.default({
                onChange: (input) => this.handleChange(input),
                onKeyPress: (button) => this.handleKeyPress(button),
                layout: {
                    default: [
                        "1 2 3 4 5 6 7 8 9 0",
                        "q w e r t y u i o p",
                        "a s d f g h j k l ñ",
                        "z x c v b n m {bksp}",
                        "á é í ó ú ü {space}"
                    ],
                    shift: [
                        "! @ # $ % ^ & * ( )",
                        "Q W E R T Y U I O P",
                        "A S D F G H J K L Ñ",
                        "Z X C V B N M {bksp}",
                        "Á É Í Ó Ú Ü {space}"
                    ]
                },
                display: {
                    '{bksp}': '⌫',
                    '{space}': 'Espacio',
                    '{shift}': '⇧',
                    '{enter}': '↵'
                },
                theme: "hg-theme-default hg-layout-default virtual-keyboard-theme",
                buttonTheme: [
                    {
                        class: "hg-button-bksp",
                        buttons: "{bksp}"
                    },
                    {
                        class: "hg-button-space",
                        buttons: "{space}"
                    }
                ],
                mergeDisplay: true,
                disableCaretPositioning: false
            });

            this.isInitialized = true;

            // Marcar modo VK en el body para estilos (ocultar caret nativo, etc.)
            try { document.body.classList.add('vk-mode'); } catch(_) {}

            // Configurar eventos de inputs
            this.setupInputListeners();

            // Inicializar estado del espejo si aplica
            try {
                const input = document.querySelector('#respuesta') || document.querySelector('#participantAnswer');
                this._updateMirrorFromInput(input);
            } catch(_) {}

        } catch (error) {
            console.error('❌ Error inicializando teclado virtual:', error);
            throw error;
        }
    }

    /**
     * Crea el contenedor del teclado
     */
    createContainer() {
        // 1) Preferir contenedor inline si existe (visible dentro de la página)
        let inline = document.getElementById('vk-inline');
        if (inline) {
            // Asegurar un hijo .simple-keyboard
            let kb = inline.querySelector('.simple-keyboard');
            if (!kb) {
                kb = document.createElement('div');
                kb.className = 'simple-keyboard';
                inline.appendChild(kb);
            }
            // La visibilidad se controla según la página activa
            inline.style.display = 'none';
            inline.setAttribute('aria-hidden', 'true');
            this.container = inline;
            // Configurar observadores para mostrar solo en páginas de ingreso
            try { this._setupInlineVisibilityObservers(); this._updateInlineVisibility(); } catch(_) {}
            return;
        }

        // 2) Fallback: crear contenedor fijo al fondo (para casos sin inline)
        let container = document.getElementById('virtual-keyboard-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'virtual-keyboard-container';
            container.className = 'virtual-keyboard-container';
            container.style.display = 'none'; // Oculto por defecto, se muestra al enfocar

            const keyboardDiv = document.createElement('div');
            keyboardDiv.className = 'simple-keyboard';
            container.appendChild(keyboardDiv);
            document.body.appendChild(container);
        }
        this.container = container;
        // Por si existe un contenedor flotante de una versión previa y no se va a usar, quitar clase del body
        try { document.body.classList.remove('has-vk-floating'); } catch(_) {}
    }

    /**
     * Determina si se debe mostrar el teclado inline (página de ingreso de palabra)
     */
    _shouldShowInline() {
        // Mostrar solo en móviles/tablets
        try {
            const allowVK = (typeof window !== 'undefined' && window.DeviceDetector)
                ? window.DeviceDetector.shouldUseVirtualKeyboard()
                : (window.matchMedia && window.matchMedia('(max-width: 1023px)').matches);
            if (!allowVK) return false;
        } catch(_) {}
        const pageGame = document.getElementById('page-game');
        const pageParticipant = document.getElementById('page-participant');
        const participantGame = document.getElementById('participantGame');
        const juego = document.getElementById('juego');

        const isGameActive = !!(pageGame && pageGame.classList.contains('active'));
        const isParticipantActive = !!(pageParticipant && pageParticipant.classList.contains('active'));
        const isParticipantGameVisible = !!(participantGame && participantGame.style.display !== 'none');
        const isJuegoVisible = !!(juego && juego.style.display !== 'none');

        // Mostrar solo cuando el panel de juego individual esté visible
        if (isGameActive && isJuegoVisible) return true;
        // O si el panel de juego del participante está visible dentro de la página del participante
        if (isParticipantActive && isParticipantGameVisible) return true;
        return false;
    }

    _updateInlineVisibility() {
        if (!this.container || this.container.id !== 'vk-inline') return;
        const show = this._shouldShowInline();
        if (show) {
            this.container.classList.remove('hidden');
            this.container.style.display = 'block';
            this.container.setAttribute('aria-hidden', 'false');
        } else {
            this.container.classList.add('hidden');
            this.container.style.display = 'none';
            this.container.setAttribute('aria-hidden', 'true');
        }
    }

    _setupInlineVisibilityObservers() {
        const observer = new MutationObserver(() => this._updateInlineVisibility());
        const pageGame = document.getElementById('page-game');
        const pageParticipant = document.getElementById('page-participant');
        const participantGame = document.getElementById('participantGame');
        const juego = document.getElementById('juego');

        if (pageGame) observer.observe(pageGame, { attributes: true, attributeFilter: ['class', 'style'] });
        if (pageParticipant) observer.observe(pageParticipant, { attributes: true, attributeFilter: ['class', 'style'] });
        if (participantGame) observer.observe(participantGame, { attributes: true, attributeFilter: ['style'] });
        if (juego) observer.observe(juego, { attributes: true, attributeFilter: ['style'] });

        // Guardar referencia para posible limpieza futura
        this._inlineObserver = observer;

        // También enganchar goToPage si existe para asegurar actualización
        try {
            const origGoToPage = window.goToPage;
            if (typeof origGoToPage === 'function' && !window.__vk_patched_goToPage) {
                window.goToPage = (...args) => {
                    const res = origGoToPage.apply(window, args);
                    try { this._updateInlineVisibility(); } catch(_) {}
                    return res;
                };
                window.__vk_patched_goToPage = true;
            }
        } catch(_) {}
    }

    /**
     * Configura listeners para inputs
     */
    setupInputListeners() {
        // Inputs que deben usar el teclado virtual
        const inputSelectors = [
            '#respuesta',              // Input principal del juego
            '#participantAnswer'       // Input del participante en modo grupal
        ];

        // Referencia al espejo visual (solo en juego individual)
        const mirrorEl = document.getElementById('vkMirror');
        this.mirror = mirrorEl ? {
            el: mirrorEl,
            text: mirrorEl.querySelector('.vk-mirror-text'),
            caret: mirrorEl.querySelector('.vk-caret')
        } : null;

        inputSelectors.forEach(selector => {
            const input = document.querySelector(selector);
            if (input) {
                // Prevenir teclado nativo sin bloquear el campo
                input.setAttribute('inputmode', 'none');
                input.setAttribute('autocomplete', 'off');
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'off');
                input.setAttribute('spellcheck', 'false');

                // En móviles/tablets, establecer readonly para ocultar el teclado nativo
                try {
                    const mustUseVK = (typeof window !== 'undefined' && window.DeviceDetector) ? window.DeviceDetector.shouldUseVirtualKeyboard() : true;
                    if (mustUseVK) {
                        input.setAttribute('readonly', 'true');
                    }
                } catch(_) {}

                const show = () => this.showKeyboard(input);

                // Mostrar teclado en distintos eventos (más robusto en móviles)
                input.addEventListener('focus', show);
                input.addEventListener('click', show);
                input.addEventListener('touchstart', show, { passive: true });
                input.addEventListener('pointerdown', show);

                // Sincronizar cuando el input cambia externamente
                input.addEventListener('input', (e) => {
                    if (this.keyboard && this.currentInput === input) {
                        this.keyboard.setInput(e.target.value);
                    }
                    this._updateMirrorFromInput(input);
                });
            }
        });

        // Ocultar teclado al hacer clic fuera (solo si es contenedor flotante)
        document.addEventListener('click', (e) => {
            if (!this.container) return;
            const isInline = this.container.id === 'vk-inline';
            if (isInline) return; // en inline no se oculta al click externo
            if (!this.container.contains(e.target) && !e.target.matches('input[inputmode="none"]')) {
                this.hideKeyboard();
            }
        });

        // Click en el espejo: abrir teclado para #respuesta
        if (this.mirror && this.mirror.el) {
            this.mirror.el.addEventListener('click', () => {
                const input = document.querySelector('#respuesta') || document.querySelector('#participantAnswer');
                if (input) this.showKeyboard(input);
            });
        }
    }

    /**
     * Muestra el teclado para un input específico
     */
    showKeyboard(input) {
        // Bloquear apertura si se está esperando la próxima palabra
        try { if (typeof window !== 'undefined' && window._waitNextWord) return; } catch(_) {}
        if (!this.keyboard || !this.container) {
            console.warn('⚠️ Teclado no inicializado');
            return;
        }

        this.currentInput = input;
        this.keyboard.setInput(input.value || '');
        this.container.style.display = 'block';

        // Activar espejo visual y sincronizar texto
        this._updateMirrorFromInput(input);
        if (this.mirror && this.mirror.el) {
            this.mirror.el.classList.add('vk-active');
        }

        // Scroll para asegurar que el input sea visible
        setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    /**
     * Oculta el teclado
     */
    hideKeyboard() {
        if (this.container) {
            // No ocultar si es inline; mantener visible dentro de la página
            if (this.container.id === 'vk-inline') return;
            this.container.style.display = 'none';
        }
        this.currentInput = null;
        if (this.mirror && this.mirror.el) {
            this.mirror.el.classList.remove('vk-active');
        }
    }

    /**
     * Maneja cambios en el teclado
     */
    handleChange(input) {
        // Si estamos esperando la próxima palabra, ignorar entrada y mantener buffer vacío
        try {
            if (typeof window !== 'undefined' && window._waitNextWord) {
                try { this.clearInput(); } catch(_) {}
                return;
            }
        } catch(_) {}
        if (this.currentInput) {
            this.currentInput.value = input;
            
            // Disparar evento input para que otros listeners lo detecten
            const event = new Event('input', { bubbles: true });
            this.currentInput.dispatchEvent(event);

            // Actualizar espejo visual
            this._updateMirrorFromInput(this.currentInput);
        }
    }

    /**
     * Maneja presión de teclas especiales
     */
    handleKeyPress(button) {
        // Bloquear teclas mientras se espera la próxima palabra
        try { if (typeof window !== 'undefined' && window._waitNextWord) return; } catch(_) {}

        // Manejar Enter si el input lo soporta
        if (button === '{enter}' && this.currentInput) {
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true
            });
            this.currentInput.dispatchEvent(enterEvent);
        }
    }

    /**
     * Actualiza el input actual del teclado
     */
    setInput(value) {
        if (this.keyboard) {
            this.keyboard.setInput(value);
        }
    }

    /**
     * Limpia el input del teclado
     */
    clearInput() {
        if (this.keyboard) {
            this.keyboard.clearInput();
        }
        if (this.currentInput) {
            this.currentInput.value = '';
        }
        this._updateMirrorFromInput(this.currentInput);
    }

    /**
     * Destruye el teclado virtual
     */
    destroy() {
        if (this.keyboard) {
            this.keyboard.destroy();
            this.keyboard = null;
        }
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isInitialized = false;
    }

    /**
     * Actualiza el espejo visual con el contenido del input y muestra un cursor falso
     */
    _updateMirrorFromInput(input) {
        if (!this.mirror || !this.mirror.el || !input) return;
        const val = String(input.value || '');
        const isEmpty = val.length === 0;
        if (this.mirror.text) {
            this.mirror.text.textContent = isEmpty ? (input.getAttribute('placeholder') || '') : val;
        }
        if (isEmpty) this.mirror.el.classList.add('empty');
        else this.mirror.el.classList.remove('empty');
        // el caret se muestra como elemento separado, no requiere posición específica
    }
}

// Instancia global
let virtualKeyboardManager = null;

/**
 * Inicializa el teclado virtual si es necesario
 */
async function initVirtualKeyboardIfNeeded() {
    // Verificar si debe usar teclado virtual
    if (typeof window.DeviceDetector === 'undefined') {
        console.error('❌ DeviceDetector no está cargado');
        return;
    }

    const needsKeyboard = window.DeviceDetector.shouldUseVirtualKeyboard();
    
    if (needsKeyboard) {
        
        if (!virtualKeyboardManager) {
            virtualKeyboardManager = new VirtualKeyboardManager();
        }
        
        // Esperar a que Simple Keyboard esté disponible
        if (typeof SimpleKeyboard === 'undefined') {
            await waitForSimpleKeyboard();
        }
        
        await virtualKeyboardManager.init();
        // Exponer instancia y helper tras inicializar
        try {
            window.virtualKeyboardManager = virtualKeyboardManager;
            if (typeof window.updateVKVisibility !== 'function') {
                window.updateVKVisibility = function() {
                    try { virtualKeyboardManager._updateInlineVisibility(); } catch(_) {}
                };
            }
        } catch(_) {}
    }
}

/**
 * Espera a que Simple Keyboard esté disponible
 */
function waitForSimpleKeyboard(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkInterval = setInterval(() => {
            if (typeof SimpleKeyboard !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Timeout esperando Simple Keyboard'));
            }
        }, 100);
    });
}

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.VirtualKeyboardManager = VirtualKeyboardManager;
    window.virtualKeyboardManager = virtualKeyboardManager;
    window.initVirtualKeyboardIfNeeded = initVirtualKeyboardIfNeeded;
}
