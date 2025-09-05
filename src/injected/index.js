// src/injected/index.js
import ExtensionCore from './core/extension-core.js';

async function waitForOdooReady(timeout = 15000) { // Wait up to 15 seconds
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (typeof odoo !== 'undefined' && typeof odoo.define === 'function' && odoo.runtime && odoo.runtime.app && odoo.runtime.app.env) {
                clearInterval(interval);
                console.log('[Odoo Dev Index] Odoo environment appears ready.');
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                console.warn('[Odoo Dev Index] Timeout waiting for Odoo to be ready. Extension might not work correctly.');
                reject(new Error('Timeout waiting for Odoo ready state.'));
            } else if (typeof odoo !== 'undefined' && typeof odoo.define === 'function' && (!odoo.runtime || !odoo.runtime.app)) {
                console.log('[Odoo Dev Index] Odoo define is ready, but odoo.runtime.app not yet...');
            }

        }, 200); // Check every 200ms
    });
}

async function initializeOdooDev() {
    "use strict";

    try {
        // 0. Early check to avoid loading in inappropriate contexts
        // console.log("[Odoo Dev Index] Performing early context validation...");
        const earlyUrlCheck = ExtensionCore.getAllowedUrls();
        const earlyInjectionCheck = earlyUrlCheck.shouldInjectOdooModules();

        if (!earlyInjectionCheck.shouldInject) {
            console.log("[Odoo Dev Index] Early validation failed - skipping initialization");
            console.log("[Odoo Dev Index] Early rejection reasons:", earlyInjectionCheck.reasons);
            return; // Exit early without initializing anything
        }

        // 1. Initialize ExtensionCore to get basic data (URL, etc.)
        // console.log("[Odoo Dev Index] Initializing ExtensionCore...");
        await ExtensionCore.init();

        const odooVersion = ExtensionCore.getOdooVersion();
        console.log("[Odoo Dev Index] Detected Odoo version:", odooVersion);
        
        window.ExtensionCore = ExtensionCore; // Make it globally available
        // console.log("[Odoo Dev Index] ExtensionCore initialized. Extension Enabled:", ExtensionCore.isEnabled);

        if (!ExtensionCore.isEnabled) {
            console.log("[Odoo Dev Index] Extension is disabled by configuration. Halting Odoo module injections.");
            // Any previously injected elements/patches from a prior enabled state
            // will be gone due to the page reload forced by contentScriptIsolated.js.
            return;
        }

        const extensionUrl = ExtensionCore.getUrl();
        const srcFolder = extensionUrl + "src/injected/";

        // Create a script global with the URL of the extension
        const globalUrlScript = document.createElement("script");
        globalUrlScript.textContent = `window.__devExtensionUrl = "${extensionUrl}";`;
        document.head.appendChild(globalUrlScript);

        // Function to dynamically load scripts
        function loadScript(path) {
            const url = new URL(path, srcFolder);
            // console.log("[Odoo Dev Index] Requesting script:", path);
            return new Promise((resolve, reject) => {
                let script = document.createElement("script");
                script.src = url.href;
                script.type = "module"; // Assuming all are modules
                script.onload = () => {
                    // console.log("[Odoo Dev Index] Loaded script:", path);
                    resolve(path);
                };
                script.onerror = (err) => {
                    const errorMsg = `Failed to load script: ${path} from ${url.href}`;
                    console.error("[Odoo Dev Index]", errorMsg, err);
                    reject(new Error(errorMsg));
                };
                document.head.appendChild(script);
            });
        }

        // Check if we should inject modules
        const urlCheck = ExtensionCore.getAllowedUrls();
        const injectionCheck = urlCheck.shouldInjectOdooModules();

        // console.log("[Odoo Dev Index] URL analysis:", {
        //     currentUrl: window.location.href,
        //     isAllowed: urlCheck.isCurrentUrlAllowed(),
        //     shouldInject: injectionCheck
        // });

        if (injectionCheck.shouldInject) {
            // console.log("[Odoo Dev Index] Conditions met, injecting Odoo modules...");
            // console.log("[Odoo Dev Index] Injection reasons:", injectionCheck.reasons);

            // Additional safety check: ensure we're in a valid Odoo backend context
            if (injectionCheck.reasons.isPortalView) {
                console.warn("[Odoo Dev Index] Portal view detected - aborting injection to prevent template errors");
                return;
            }

            // 2. Load odoo_version_utils.js (needed by bundle_xml.js)
            // This defines 'odoo_dev.version_utils'
            await loadScript("./utils/odoo_version_utils.js");

            // 3. Load bundle_xml.js (defines 'odoo_dev.bundle.xml' and how to load templates)
            // This module itself requires 'odoo_dev.version_utils'
            await loadScript("./templates/bundle_xml.js");

            // 4. Load client.js. This script file contains an odoo.define that
            //    will internally load templates using 'odoo_dev.bundle.xml'.
            //    It also sets up `window.odooDevClientReadyPromise`.
            await loadScript("./core/client.js");

            // 5. IMPORTANT: Wait for client.js's *internal* async operations (template loading) to complete.
            // console.log("[Odoo Dev Index] Waiting for client.js internal initialization (template/CSS loading)...");
            if (window.odooDevClientReadyPromise) {
                await window.odooDevClientReadyPromise;
                // console.log("[Odoo Dev Index] client.js has finished its internal initialization.");
            } else {
                // This should not happen if client.js is structured correctly
                console.warn("[Odoo Dev Index] window.odooDevClientReadyPromise was not set by client.js. Proceeding, but templates might not be ready.");
            }

            // 6. Now that templates are loaded, load all other scripts.
            // console.log("[Odoo Dev Index] Loading remaining UI components and patches...");
            const remainingScripts = [
                // ExtensionCore is already an ES Module import, no need to loadScript it.
                // bundle_xml.js and client.js already loaded.
                // odoo_version_utils.js already loaded.

                // ****** Services ******
                "./tooltip/js/dev_info_service.js",
                "./services/active_record.js",

                // ****** Components ******
                "./views/custom/field_xpath.js",

                "./views/custom/sidebar_dev.js", // Antes que el form_controller.js para que se actualice el resModel
                "./views/form/form_controller.js",
                "./views/list/list_controller.js",
                // ****** Webclient Patches ******
                "./webclient.js",

                "./tooltip/js/tooltip.js",

                "./views/form/form_compiler.js",
                "./views/list/list_renderer.js",

                // Si es v18, cargar los parches específicos
                ...(odooVersion.isV18 ? [
                    "./views/list/sale_order_line.js",
                ] : []),
                "./views/list/stock_move.js",
                "./views/view_button/view_button.js",
                "./views/field.js",
                "./form_label.js"
            ];

            // Load remaining scripts in parallel
            await Promise.all(remainingScripts.map(scriptPath => loadScript(scriptPath)
                .catch(err => {
                    // Log individual script load errors but don't necessarily stop all others
                    console.error(`[Odoo Dev Index] Non-critical error loading script: ${err.message}. Some features might be affected.`);
                })
            ));

            // console.log("[Odoo Dev Index] All specified injected scripts have been processed.");

        } else {
            console.log("[Odoo Dev Index] Conditions not met, no Odoo modules injected.");
            console.log("[Odoo Dev Index] Rejection reasons:", injectionCheck.reasons);
        }
    } catch (error) {
        console.error("[Odoo Dev Index] Critical error during extension initialization:", error);
    }
}

(async () => {
    // The `REQUEST_EXTENSION_INIT` message will be sent by ExtensionCore.init()
    // The response `EXTENSION_INIT` will be handled by ExtensionCore.init()'s promise.
    // Then initializeOdooDev will run.
    await initializeOdooDev();
})();