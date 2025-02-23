odoo.define('odoo_dev.services.devinfo', ['@web/core/registry', "@web/core/tooltip/tooltip", "@web/core/browser/browser", "@odoo/owl"], function (require) {
    const { registry } = require("@web/core/registry");
    const { Tooltip } = require("@web/core/tooltip/tooltip");
    const { whenReady } = require("@odoo/owl");

    const devInfoService = {
        dependencies: ["popover"],
        start(env, { popover }) {
            let target = null;
            let closeDevInfo;
            const elementsWithTooltips = new Map();

            function cleanup() {
                if (closeDevInfo) {
                    closeDevInfo();
                }
            }

            function openDevInfo(el, { devinfo = "", template, info }) {
                cleanup();
                if (!devinfo && !template) {
                    return false;
                }
                closeDevInfo = popover.add(
                    el,
                    Tooltip,
                    { tooltip: devinfo, template, info },
                    { position: "right" }
                );

                return true;
            }

            function onContextMenu(ev) {
                let el = ev.target;
                ev.preventDefault();

                if (el.nodeType === Node.TEXT_NODE) {
                    return;
                }

                let count = 0;
                while (el && el !== document.documentElement && count < 10) {
                    if (elementsWithTooltips.has(el)) {
                        const opened = openDevInfo(el, elementsWithTooltips.get(el));
                        if (opened) return;
                    } else if (el.matches("[data-devinfo], [data-devinfo-template]")) {
                        const dataset = el.dataset;
                        const params = {
                            tooltip: dataset.devinfo,
                            template: dataset.devinfoTemplate,
                            position: dataset.devinfoPosition,
                        };
                        if (dataset.devinfoInfo) {
                            params.info = JSON.parse(dataset.devinfoInfo);
                        }
                        if (dataset.devinfoDelay) {
                            params.delay = parseInt(dataset.devinfoDelay, 10);
                        }
                        const opened = openDevInfo(el, params);
                        if (opened) return;
                    }
                    el = el.parentElement;
                    count++;
                }

                ev.stopImmediatePropagation();
                ev.target.dispatchEvent(new MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                }));
            }

            whenReady(() => {
                document.body.addEventListener("contextmenu", onContextMenu);
            });

            return {
                add(el, params) {
                    elementsWithTooltips.set(el, params);
                    return () => {
                        elementsWithTooltips.delete(el);
                        if (target === el) {
                            cleanup();
                        }
                    };
                },
            };
        },
    };

    registry.category("services").add("devinfo", devInfoService);
});