// src/injected/core/extension-core.js
class ExtensionCore {
    static #extensionData = null;
    static #initialized = false;
    static #resolveInitPromise = null;
    static #rejectInitPromise = null;
    static #initPromise = null;
    static #timeoutId = null;
    static #isEnabled = true; // Default, will be updated

    static init() {
        if (this.#initialized) return Promise.resolve(this.#extensionData);
        if (this.#initPromise) return this.#initPromise;

        this.#initPromise = new Promise((resolve, reject) => {
            this.#resolveInitPromise = resolve;
            this.#rejectInitPromise = reject;

            this.#timeoutId = setTimeout(() => {
                console.error('[ExtensionCore] Timeout waiting for EXTENSION_INIT message.');
                this.#rejectInitPromise(new Error('Timeout waiting for extension data'));
                window.removeEventListener('message', this.#handleInitMessageWrapper);
            }, 5000);

            // Use a wrapper function for the event listener so 'this' refers to ExtensionCore
            window.addEventListener('message', this.#handleInitMessageWrapper);

            console.log('[ExtensionCore] Requesting EXTENSION_INIT data...');
            window.postMessage({ type: 'REQUEST_EXTENSION_INIT' }, '*');
        });
        return this.#initPromise;
    }

    // Wrapper to ensure 'this' context is correct for static method
    static #handleInitMessageWrapper = (event) => {
        this.#handleInitMessage(event);
    }

    static #handleInitMessage = (event) => {
        if (event.source === window && event.data && (event.data.type === 'EXTENSION_INIT' || event.data.type === 'EXTENSION_INIT_ERROR')) {
            clearTimeout(this.#timeoutId);
            window.removeEventListener('message', this.#handleInitMessageWrapper);

            if (event.data.type === 'EXTENSION_INIT_ERROR') {
                console.error('[ExtensionCore] Received EXTENSION_INIT_ERROR:', event.data.error);
                this.#initialized = false; // Mark as not initialized properly
                if (this.#rejectInitPromise) {
                    this.#rejectInitPromise(new Error(event.data.error || 'Failed to initialize extension data'));
                }
            } else {
                console.log('[ExtensionCore] Received EXTENSION_INIT:', event.data.data);
                this.#extensionData = event.data.data;
                this.#isEnabled = this.#extensionData.isEnabled !== false; // Update enabled state
                this.#initialized = true;
                if (this.#resolveInitPromise) {
                    this.#resolveInitPromise(this.#extensionData);
                }
            }
            this.#resolveInitPromise = null;
            this.#rejectInitPromise = null;
        }
    }

    static getUrl(path = '') {
        if (!this.#initialized) throw new Error('Extension not initialized');
        return `${this.#extensionData.url}${path}`;
    }

    static get resources() {
        if (!this.#isEnabled) return { templates: [], css: [] }; // Return empty if disabled
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

    static get isEnabled() {
        // Ensure init has run to get the latest state, but don't block indefinitely if init failed
        if (!this.#initialized && this.#initPromise) {
            console.warn("[ExtensionCore] isEnabled accessed before full initialization, relying on default or last known state.");
        }
        return this.#isEnabled;
    }
}

export default ExtensionCore;