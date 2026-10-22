const STYLE_ID = "odoo-dev-tools-background";

/**
 * Custom image behind the Enterprise home menu (the app grid). Community has
 * no home menu, so the rule matches nothing there.
 */
export function applyBackground(enabled, dataUrl) {
    let style = document.getElementById(STYLE_ID);
    if (!enabled || !dataUrl) {
        style?.remove();
        return;
    }
    if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }
    style.textContent = `
        body.o_home_menu_background,
        .o_web_client.o_home_menu_background {
            background-image: url("${dataUrl.replace(/"/g, "%22")}") !important;
            background-size: cover !important;
            background-position: center !important;
        }
    `;
}
