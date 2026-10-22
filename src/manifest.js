/**
 * The manifest is generated per browser so that browser-specific keys never
 * leak into the other build.
 */
export function buildManifest(target, version) {
    const icons = {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
    };
    // Odoo can live on any domain (localhost, odoo.sh, self-hosted), so the
    // scripts are declared for every URL. Both exit immediately when the page
    // is not an Odoo web client.
    const contentScripts = [
        {
            matches: ["<all_urls>"],
            js: ["page.js"],
            run_at: "document_idle",
            world: "MAIN",
            all_frames: false,
        },
        {
            matches: ["<all_urls>"],
            js: ["content.js"],
            run_at: "document_idle",
            all_frames: false,
        },
    ];
    const manifest = {
        manifest_version: 3,
        name: "__MSG_appName__",
        short_name: "Odoo Dev Tools",
        description: "__MSG_appDescription__",
        version,
        default_locale: "en",
        icons,
        action: {
            default_popup: "popup/popup.html",
            default_icon: icons,
        },
        permissions: ["storage"],
        content_scripts: contentScripts,
    };
    if (target === "chrome") {
        // world: "MAIN" in content_scripts needs Chrome 111.
        manifest.minimum_chrome_version = "111";
    } else if (target === "firefox") {
        // world: "MAIN" in content_scripts needs Firefox 128.
        manifest.browser_specific_settings = {
            gecko: { id: "odoo-dev-tools@juudev1", strict_min_version: "128.0" },
        };
    } else {
        throw new Error(`Unknown target: ${target}`);
    }
    return manifest;
}
