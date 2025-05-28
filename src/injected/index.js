// src/injected/index.js
import ExtensionCore from './core/extension-core.js';

(async () => { // Wrap in an async IIFE to use await at top level
    "use strict";

    try {
        // 1. Initialize ExtensionCore to get basic data (URL, etc.)
        console.log("[Odoo Dev Index] Initializing ExtensionCore...");
        await ExtensionCore.init();
        window.ExtensionCore = ExtensionCore; // Make it globally available
        console.log("[Odoo Dev Index] ExtensionCore initialized.");

        const extensionUrl = ExtensionCore.getUrl();
        const srcFolder = extensionUrl + "src/injected/";

        // Create a script global with the URL of the extension
        const globalUrlScript = document.createElement("script");
        globalUrlScript.textContent = `window.__devExtensionUrl = "${extensionUrl}";`;
        document.head.appendChild(globalUrlScript);

        // Function to dynamically load scripts
        function loadScript(path) {
            const url = new URL(path, srcFolder);
            console.log("[Odoo Dev Index] Requesting script:", path);
            return new Promise((resolve, reject) => {
                let script = document.createElement("script");
                script.src = url.href;
                script.type = "module"; // Assuming all are modules
                script.onload = () => {
                    console.log("[Odoo Dev Index] Loaded script:", path);
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
        var isWebModule = (window.location.pathname.includes('/web') && !window.location.pathname.includes('/web/login') && !window.location.pathname.includes('/web/signup')) || window.location.pathname.includes('/odoo');
        const hasFileLoaded = document.querySelector('input[type="file"]') !== null;

        if (isWebModule || hasFileLoaded) {
            console.log("[Odoo Dev Index] Conditions met, injecting Odoo modules...");

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
            console.log("[Odoo Dev Index] Waiting for client.js internal initialization (template/CSS loading)...");
            if (window.odooDevClientReadyPromise) {
                await window.odooDevClientReadyPromise;
                console.log("[Odoo Dev Index] client.js has finished its internal initialization.");
            } else {
                // This should not happen if client.js is structured correctly
                console.warn("[Odoo Dev Index] window.odooDevClientReadyPromise was not set by client.js. Proceeding, but templates might not be ready.");
            }

            // 6. Now that templates are loaded, load all other scripts.
            console.log("[Odoo Dev Index] Loading remaining UI components and patches...");
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
                // ****** Webclient Patches ******
                "./webclient.js",

                "./tooltip/js/tooltip.js",
                
                "./views/form/form_compiler.js",  
                "./views/list/list_renderer.js",  
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

            console.log("[Odoo Dev Index] All specified injected scripts have been processed.");

        } else {
            console.log("[Odoo Dev Index] Conditions not met, no Odoo modules injected.");
        }
    } catch (error) {
        console.error("[Odoo Dev Index] Critical error during extension initialization:", error);
    }
})();