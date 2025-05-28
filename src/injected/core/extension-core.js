// src/injected/core/extension-core.js
class ExtensionCore {
    static #extensionData = null;
    static #initialized = false;
    static #resolveInitPromise = null; // Para resolver la promesa externamente
    static #rejectInitPromise = null; // Para rechazar la promesa externamente
    static #initPromise = null; // Guardar la promesa
    static #timeoutId = null; // Guardar ID del timeout

    static init() {
        if (this.#initialized) return Promise.resolve(this.#extensionData); // Ya inicializado
        if (this.#initPromise) return this.#initPromise; // Ya está inicializando

        // Crear la promesa una sola vez
        this.#initPromise = new Promise((resolve, reject) => {
            this.#resolveInitPromise = resolve;
            this.#rejectInitPromise = reject;

            // Configurar timeout
            this.#timeoutId = setTimeout(() => {
                console.error('[ExtensionCore] Timeout waiting for EXTENSION_INIT message.');
                this.#rejectInitPromise(new Error('Timeout waiting for extension URL'));
                // Limpiar listener si hubo timeout
                window.removeEventListener('message', this.#handleInitMessage);
            }, 5000); // Aumentar timeout a 5 segundos por si acaso

            // Añadir listener para la respuesta
            window.addEventListener('message', this.#handleInitMessage);

            // Enviar mensaje para solicitar la información
            console.log('[ExtensionCore] Requesting EXTENSION_INIT data...');
            window.postMessage({ type: 'REQUEST_EXTENSION_INIT' }, '*');

        });

        return this.#initPromise;
    }

    // Función separada para manejar el mensaje y poder quitar el listener
    static #handleInitMessage = (event) => {
        // Solo procesar mensajes del tipo esperado y de la misma ventana
        if (event.source === window && event.data && event.data.type === 'EXTENSION_INIT') {
            console.log('[ExtensionCore] Received EXTENSION_INIT:', event.data.data);
            clearTimeout(this.#timeoutId); // Cancelar el timeout
            window.removeEventListener('message', this.#handleInitMessage); // Limpiar listener

            this.#extensionData = event.data.data;
            this.#initialized = true;
            // Verificar que los resolvers existen antes de llamarlos
            if (this.#resolveInitPromise) {
                this.#resolveInitPromise(this.#extensionData);
            } else {
                console.error('[ExtensionCore] Init promise resolver is missing!');
            }
            // Limpiar referencias a los resolvers
            this.#resolveInitPromise = null;
            this.#rejectInitPromise = null;
        }
    } 

    static getUrl(path = '') {
        if (!this.#initialized) throw new Error('Extension not initialized');
        return `${this.#extensionData.url}${path}`;
    }

    static get resources() {
        return {
            templates: [
                this.getUrl('src/injected/views/list/list_renderer.xml'),
                this.getUrl('src/injected/views/form/form_view.xml'),
                this.getUrl('src/injected/views/field.xml'),
                this.getUrl('src/injected/views/view_button/view_button.xml'),
                this.getUrl('src/injected/views/custom/sidebar_dev.xml'),
            ],
            css: [
                this.getUrl('src/injected/tooltip/css/tooltip.css'),
                this.getUrl('src/injected/views/custom/sidebar_dev.css'),
            ],
        };
    }

    static get extensionData() {
        return this.#extensionData;
    }

}

export default ExtensionCore;