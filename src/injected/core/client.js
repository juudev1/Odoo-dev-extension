const ODOO_DEV_BACKGROUND_STYLE_ID = 'odoo-dev-custom-background-style';

function applyOrRemoveBackgroundStyle() {
    const existingStyleElement = document.getElementById(ODOO_DEV_BACKGROUND_STYLE_ID);

    if (window.ExtensionCore && ExtensionCore.isEnabled && ExtensionCore.isBackgroundEnabled) {
        // Extension is enabled AND background is enabled
        if (ExtensionCore.extensionData && ExtensionCore.extensionData.backgroundImg) {
            const imageSrc = ExtensionCore.extensionData.backgroundImg;
            if (imageSrc) {
                if (existingStyleElement) {
                    // Update if URL changed, though not strictly necessary if URL is static from storage
                    existingStyleElement.innerHTML = `
                        .o_home_menu_background,
                        .o_web_client.o_home_menu_background {
                            background-image: url(${imageSrc}) !important;
                        }
                    `;
                    console.log("[Odoo Dev Client] Background style updated.");
                } else {
                    console.log("[Odoo Dev Client] Applying background image:", imageSrc);
                    const style = document.createElement('style');
                    style.id = ODOO_DEV_BACKGROUND_STYLE_ID;
                    // style.setAttribute('data-odoo-dev-tool', 'background-style'); // For generic cleanup
                    style.innerHTML = `
                        .o_home_menu_background,
                        .o_web_client.o_home_menu_background {
                            background-image: url(${imageSrc}) !important;
                        }
                    `;
                    document.head.appendChild(style);
                }
            } else {
                // No image URL, remove style if it exists
                if (existingStyleElement) {
                    existingStyleElement.remove();
                    console.log("[Odoo Dev Client] Background image URL missing, removed style.");
                }
            }
        }
    } else {
        // Extension disabled OR background specifically disabled
        if (existingStyleElement) {
            existingStyleElement.remove();
            console.log("[Odoo Dev Client] Background disabled or extension disabled, removed style.");
        }
    }
}

// Create a promise that index.js can wait for
window.odooDevClientReadyPromise = new Promise((resolveClientReady, rejectClientReady) => {
    odoo.define('odoo_dev.web_client', ['odoo_dev.bundle.xml'], async function (require) {
        // 'odoo_dev.bundle.xml' is a dependency, so Odoo ensures it's loaded before this factory function runs.
        const xmlBundle = require('odoo_dev.bundle.xml');

        try {
            console.log("[Odoo Dev Client] Initializing...");

            // ExtensionCore should have been initialized by index.js before this script was even loaded.
            // So, ExtensionCore.resources should be available.
            const resources = ExtensionCore.resources;

            if (!resources || !resources.templates || !resources.css) {
                const errorMessage = "[Odoo Dev Client] ExtensionCore.resources not available. Ensure ExtensionCore.init() completed.";
                console.error(errorMessage);
                return rejectClientReady(new Error(errorMessage));
            }

            applyOrRemoveBackgroundStyle();

            console.log("[Odoo Dev Client] Loading templates and CSS:", resources.templates.length, "XML files,", resources.css.length, "CSS files.");
            await xmlBundle.loadTemplatesAndCSS(resources.templates, resources.css);
            console.log("[Odoo Dev Client] Templates and CSS successfully loaded by xmlBundle.");

            // Apply background image if present
            if (ExtensionCore.extensionData && ExtensionCore.extensionData.backgroundImg) {
                const imageSrc = ExtensionCore.extensionData.backgroundImg; // This is the direct URL or null
                if (imageSrc) {
                    console.log("[Odoo Dev Client] Applying background image:", imageSrc);
                    const style = document.createElement('style');
                    style.innerHTML = `
                        .o_home_menu_background,
                        .o_web_client.o_home_menu_background {
                            background-image: url(${imageSrc}) !important;
                        }
                    `;
                    document.head.appendChild(style);
                } else {
                    console.log("[Odoo Dev Client] No background image URL to apply.");
                }
            } else {
                console.log("[Odoo Dev Client] ExtensionCore.extensionData or backgroundImg not available for background styling.");
            }

            console.log("[Odoo Dev Client] Initialization complete.");
            resolveClientReady(); // Signal that client.js's async work is done
        } catch (error) {
            console.error('[Odoo Dev Client] Error during initialization:', error);
            rejectClientReady(error); // Signal error
        }
    });
});