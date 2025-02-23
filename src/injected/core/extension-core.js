// src/injected/core/extension-core.js
class ExtensionCore {
    static #extensionData = null;
    static #initialized = false;

    static async init() {
        if (this.#initialized) return this.#extensionData;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for extension URL'));
            }, 3000);

            window.addEventListener('message', (event) => {
                if (event.data.type === 'EXTENSION_INIT') {
                    clearTimeout(timeout);
                    this.#extensionData = event.data.data;
                    this.#initialized = true;
                    resolve(this.#extensionData);
                }
            });

            window.postMessage({ type: 'REQUEST_EXTENSION_INIT' }, '*');
        });
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