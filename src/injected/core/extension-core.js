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

            // console.log('[ExtensionCore] Requesting EXTENSION_INIT data...');
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
                this.getUrl('src/injected/views/list/sale_order_line.xml'),
                this.getUrl('src/injected/views/list/stock_move.xml'),
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

    /**
     * Returns the allowed URLs where the extension can execute
     * @returns {Object} Object containing allowed and excluded URL patterns
     */
    static getAllowedUrls() {
        return {
            // URLs where the extension is allowed to run
            allowedPatterns: [
                "<all_urls>" // The extension runs on all URLs by default
            ],

            // URLs where the extension is specifically excluded
            excludedPatterns: [
                "https://*/web/login*", // Login pages are excluded
                "https://*/jobs/*",     // Jobs pages are excluded
                "http://*/jobs/*"       // Jobs pages on HTTP are also excluded
            ],

            // Specific conditions for Odoo module injection
            odooModuleConditions: {
                // Web module paths (where main Odoo functionality is injected)
                webModulePaths: [
                    "/web", // General web interface (backend)
                    "/odoo" // Odoo specific paths
                ],

                // Excluded web paths (even within /web)
                excludedWebPaths: [
                    "/web/login", // Login page
                    "/web/signup", // Signup page
                    "/web/jobs" // Jobs page
                ],

                // Portal/Frontend paths that should be excluded
                portalPaths: [
                    "/shop",
                    "/blog",
                    "/event",
                    "/slides",
                    "/forum",
                    "/jobs",
                    "/contactus",
                    "/aboutus",
                    "/page/",
                    "/website",
                    "/survey"
                ],

                // Additional conditions
                hasFileInput: "presence of file input elements triggers injection",
                requiresBackendContext: "extension only works in Odoo backend context"
            },

            // Method to check if current URL is allowed for extension execution
            isCurrentUrlAllowed: function () {
                const currentUrl = window.location.href;
                const currentPath = window.location.pathname;

                // Check if current URL matches excluded patterns
                const isExcluded = this.excludedPatterns.some(pattern => {
                    if (pattern.includes("*/web/login*")) {
                        return currentPath.includes('/web/login');
                    }
                    if (pattern.includes("*/jobs/*")) {
                        return currentPath.includes('/jobs');
                    }
                    return false;
                });

                if (isExcluded) {
                    let excludeReason = "unknown exclusion";
                    if (currentPath.includes('/web/login')) {
                        excludeReason = "login page exclusion";
                    } else if (currentPath.includes('/jobs')) {
                        excludeReason = "jobs page exclusion";
                    }

                    return {
                        allowed: false,
                        reason: "URL matches excluded pattern",
                        pattern: excludeReason
                    };
                }

                // Since we use <all_urls>, extension can run everywhere except excluded
                return {
                    allowed: true,
                    reason: "URL matches allowed patterns",
                    pattern: "<all_urls>"
                };
            },

            // Method to check if current URL should have Odoo modules injected
            shouldInjectOdooModules: function () {
                const currentPath = window.location.pathname;
                const hasFileInput = document.querySelector('input[type="file"]') !== null;

                // Check if current path is excluded
                const isExcludedPath = this.odooModuleConditions.excludedWebPaths.some(excludedPath =>
                    currentPath.includes(excludedPath)
                );

                // Also check for jobs routes (like /jobs/apply/*)
                const isJobsPath = currentPath.includes('/jobs');

                // Detect portal/frontend views by checking for common indicators
                const isPortalView = this._detectPortalView();

                // Check if it's a backend web module (admin interface)
                const isBackendWebModule = (
                    currentPath.includes('/web') &&
                    !isExcludedPath &&
                    !isPortalView &&
                    this._isBackendContext()
                );

                // Check if it's an Odoo specific path (usually backend)
                const isOdooModule = (
                    currentPath.includes('/odoo') &&
                    !isExcludedPath &&
                    !isPortalView
                );

                const shouldInject = (isBackendWebModule || isOdooModule) && !isJobsPath;

                return {
                    shouldInject,
                    reasons: {
                        isBackendWebModule,
                        isOdooModule,
                        hasFileInput,
                        currentPath,
                        isExcludedPath,
                        isJobsPath,
                        isPortalView,
                        excludedPaths: this.odooModuleConditions.excludedWebPaths
                    }
                };
            },

            // Helper method to detect if current page is a portal/frontend view
            _detectPortalView: function () {
                const currentPath = window.location.pathname;

                // Common portal/frontend paths
                const portalPaths = [
                    '/shop',
                    '/blog',
                    '/event',
                    '/slides',
                    '/forum',
                    '/jobs',
                    '/contactus',
                    '/aboutus',
                    '/page/',
                    '/website',
                    '/survey'
                ];

                // Check if path matches portal patterns
                const hasPortalPath = portalPaths.some(path => currentPath.includes(path));

                // Check for frontend-specific elements in DOM
                const hasFrontendAssets = document.querySelector('link[href*="web.assets_frontend"]') !== null;
                const hasWebsiteAssets = document.querySelector('link[href*="website.assets"]') !== null;

                // Check if we're NOT in the backend by looking for backend-specific elements
                const hasBackendAssets = document.querySelector('link[href*="web.assets_backend"]') !== null;
                const hasWebClient = document.querySelector('.o_web_client') !== null;

                return hasPortalPath || (hasFrontendAssets || hasWebsiteAssets) && !hasBackendAssets;
            },

            // Helper method to detect backend context
            _isBackendContext: function () {
                // Look for backend-specific indicators
                const hasBackendAssets = document.querySelector('link[href*="web.assets_backend"]') !== null;
                const hasWebClient = document.querySelector('.o_web_client') !== null;
                const hasActionManager = document.querySelector('.o_action_manager') !== null;
                const hasControlPanel = document.querySelector('.o_control_panel') !== null;

                // Check URL patterns that typically indicate backend
                const currentPath = window.location.pathname;
                const backendPatterns = [
                    '/web#',
                    '/web?',
                    '/web/database',
                    '/web/webclient'
                ];

                const hasBackendUrl = backendPatterns.some(pattern =>
                    currentPath.includes(pattern) || window.location.href.includes(pattern)
                );

                return hasBackendAssets || hasWebClient || hasActionManager || hasControlPanel || hasBackendUrl;
            }
        };
    }

    static getOdooVersion() {
        const versionInfo = odoo.info && odoo.info.server_version_info;
        const majorVersion = (versionInfo && versionInfo.length > 0) ? versionInfo[0] : 0; // Default a 0 si no se encuentra

        const odooVersion = {
            major: majorVersion,
            isV16: majorVersion === 16,
            isV17: majorVersion === 17,
            isV18: majorVersion === 18,
            isV17Plus: majorVersion >= 17, // Útil para lógica >= 17
            isV18Plus: majorVersion >= 18, // Útil para lógica >= 18
        };

        // Congelar el objeto para evitar modificaciones accidentales
        Object.freeze(odooVersion);

        return odooVersion;
    }
}

export default ExtensionCore;