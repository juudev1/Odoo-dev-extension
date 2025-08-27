odoo.define('odoo_dev.components.webclient', ['@odoo/owl', '@web/webclient/webclient', '@web/core/utils/hooks', '@web/core/utils/patch', 'odoo_dev.version_utils', 'odoo_dev.components.sidebar_dev'], function (require) {
    const { onMounted, onWillUnmount } = require("@odoo/owl");
    const { WebClient } = require("@web/webclient/webclient");
    const { useService } = require("@web/core/utils/hooks");
    const { patch } = require("@web/core/utils/patch");
    const odooVersion = require('odoo_dev.version_utils');
    const SideBarDev = require('odoo_dev.components.sidebar_dev');

    if (odooVersion.isV17Plus) {
        patch(WebClient.prototype, {
            setup() {
                super.setup();
                this.overlay = useService("overlay");
                this.activeRecordService = useService("activeRecordService"); // Importante para que se inicie globalmente

                let removeOverlayFunc = null; // Para guardar la función de remover

                onMounted(() => {
                    console.log("[WebClient Patched] Mounting SideBarDev via overlayService.");
                    // Pasar props aquí si es necesario, pero SideBarDev ya usa activeRecordService
                    removeOverlayFunc = this.overlay.add(SideBarDev, {});
                    if (!removeOverlayFunc) {
                        console.error("[WebClient Patched] overlay.add did not return a remove function for SideBarDev!");
                    }
                });

                onWillUnmount(() => {
                    if (removeOverlayFunc) {
                        console.log("[WebClient Patched] Unmounting SideBarDev from overlayService.");
                        removeOverlayFunc();
                    }
                });
            }
        });
    } else {
        // En versiones inferiores se debe poner un patchName
        patch(WebClient.prototype, 'odoo_dev.webclient', {
            setup() {
                super.setup();
                this.overlay = useService("overlay");
                this.activeRecordService = useService("activeRecordService"); // Importante para que se inicie globalmente

                let removeOverlayFunc = null; // Para guardar la función de remover

                onMounted(() => {
                    console.log("[WebClient Patched] Mounting SideBarDev via overlayService.");
                    // Pasar props aquí si es necesario, pero SideBarDev ya usa activeRecordService
                    removeOverlayFunc = this.overlay.add(SideBarDev, {});
                    if (!removeOverlayFunc) {
                        console.error("[WebClient Patched] overlay.add did not return a remove function for SideBarDev!");
                    }
                });

                onWillUnmount(() => {
                    if (removeOverlayFunc) {
                        console.log("[WebClient Patched] Unmounting SideBarDev from overlayService.");
                        removeOverlayFunc();
                    }
                });
            }
        });
    }

});