console.log('contentScriptMain.js loaded');

window.addEventListener("message", (event) => {
    const { data } = event;

    // console.log("DATA", data);
    const files = data.state;
    var xmlFiles = [];
    var cssFiles = [];

    // console.log("----------------------------------");
    // console.log(typeof files);
    // console.log(files);

    if (!files || typeof files !== 'object') return;

    for (const file of files) {
        if (file.endsWith('.css')) {
            cssFiles.push(file);
        } else if (file.endsWith('.xml')) {
            xmlFiles.push(file);
        }
    }

    // !window.location.pathname.includes('/odoo') para odoo 18, ajustar para usar registerTemplate
    if (window.location.pathname != '/web') return;
    if (!window.odoo) return;

    if (window.odoo.session_info) {
        if (window.odoo.session_info.server_version_info && window.odoo.session_info.server_version_info[0] != 17) return; // Para odoo 14
    } else if (window.odoo.info) {
        if (window.odoo.info.server_version_info && window.odoo.info.server_version_info[0] != 17) return;
    } else {
        return;
    }
    console.log("Version", window.odoo.info.server_version_info);

    odoo.define('odoo_dev.bundle.xml', ['@web/core/registry'], async function (require) {
        'use strict';
        const { loadFile } = require('@odoo/owl');
        const { registry } = require('@web/core/registry');
        const { loadCSS } = require("@web/core/assets");

        // Cargar todas las plantillas XML de manera asíncrona
        const templatePromises = xmlFiles.map(file => loadFile(file));
        const templates = await Promise.all(templatePromises);
        let TEMPLATES = '<?xml version="1.0" encoding="UTF-8"?><templates>';

        templates.forEach(template => {
            TEMPLATES += template;
        });

        TEMPLATES += '</templates>';
        // console.log("TEMPLATES", TEMPLATES);

        // const payload = { operation: "add", 'odoo_dev': TEMPLATES };
        // registry.category("xml_templates").trigger("UPDATE", payload);


        cssFiles.forEach(async (file) => {
            console.log("CSS", file);
            // const css = await loadFile(file);
            await loadCSS(file);
        });

        registry.category(`xml_templates`).add(`odoo_dev`, TEMPLATES);
    });


    odoo.define('odoo_dev.services', ['@web/core/registry'], async function (require) {
        /** @odoo-module **/

        const { browser } = require("@web/core/browser/browser");
        const { registry } = require("@web/core/registry");
        const { Tooltip } = require("@web/core/tooltip/tooltip");
        const { whenReady } = require("@odoo/owl");

        /**
         * The devInfoService displays custom tooltips or information panels
         * when a right-click (contextmenu) event occurs on specific elements.
         *
         * Usage:
         *   <div data-devinfo="Some debug info">Right-click me</div>
         *
         * The information can be enhanced with a template and dynamic data:
         *   <div data-devinfo-template="template_name" data-devinfo-info='{ "key": "value" }'>
         *       Right-click me
         *   </div>
         */
        const devInfoService = {
            dependencies: ["popover"],
            start(env, { popover }) {
                let target = null;
                let closeDevInfo;
                const elementsWithTooltips = new Map();

                /**
                 * Cleans up the currently opened dev info popover if any.
                 */
                function cleanup() {
                    if (closeDevInfo) {
                        closeDevInfo();
                    }
                }

                function openDevInfo(el, { devinfo = "", template, info }) {
                    cleanup();
                    if (!devinfo && !template) {
                        return false; // Indica que no se abrió el popover
                    }
                    closeDevInfo = popover.add(
                        el,
                        Tooltip,
                        { tooltip: devinfo, template, info },
                        { position: "right" }
                    );

                    return true; // Indica que se abrió el popover
                }

                function onContextMenu(ev) {
                    let el = ev.target;
                    ev.preventDefault();

                    if (el.nodeType === Node.TEXT_NODE) {
                        return; // No hacer nada si es un nodo de texto
                    }

                    let count = 0;
                    while (el && el !== document.documentElement && count < 10) {
                        if (elementsWithTooltips.has(el)) {
                            const opened = openDevInfo(el, elementsWithTooltips.get(el));
                            if (opened) return; // Tooltip encontrado y mostrado
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
                            if (opened) return; // Tooltip encontrado y mostrado
                        }
                        el = el.parentElement;
                        count++;
                    }

                    // Si no se encuentra tooltip, permitir el comportamiento predeterminado
                    ev.stopImmediatePropagation(); // Asegura que el evento no se bloquee
                    ev.target.dispatchEvent(new MouseEvent("contextmenu", {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                    }));
                }

                whenReady(() => {
                    // Attach the contextmenu event listener to the body.
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

    odoo.define('@odoo_dev.tooltip', ['@web/core/registry'], function (require) {
        const { useService } = require("@web/core/utils/hooks");
        const { useEffect, useRef } = require("@odoo/owl");

        function useDevinfo(refName, params) {
            const devinfo = useService("devinfo");
            const ref = useRef(refName);
            useEffect(
                (el) => devinfo.add(el, params),
                () => [ref.el]
            );
        }

        return {
            useDevinfo: useDevinfo
        };
    });

    odoo.define('odoo_dev.ListRenderer', ['@web/views/list/list_renderer'], function (require) {
        const { ListRenderer } = require('@web/views/list/list_renderer');

        ListRenderer.template = "odoo_dev.ListRenderer";

        return {
            ListRenderer: ListRenderer
        };
    });


    odoo.define('odoo_dev.App', ['@web/core/utils/hooks', '@web/core/registry', '@odoo/owl', '@odoo_dev.tooltip'], async function (require) {
        "use strict";

        const { Component, mount, useState, whenReady, loadFile, onWillStart, App, xml, TemplateSet, parseXML, useRef } = require('@odoo/owl');
        const { useService } = require("@web/core/utils/hooks");
        const { _t } = require("@web/core/l10n/translation");
        const { FormController } = require("@web/views/form/form_controller");
        const { Field } = require("@web/views/fields/field");
        const { FormLabel } = require("@web/views/form/form_label");
        const { useDevinfo } = require("@odoo_dev.tooltip");
        const { patch } = require("@web/core/utils/patch");
        const { getTooltipInfo } = require("@web/views/fields/field_tooltip");


        // ListRenderer.template = "odoo_dev.ListRenderer";

        class SideBarDev extends Component {

            setup() {
                // console.log("SETUP");
                this.orm = useService('orm');

                this.state = useState({
                    recordFields: [],
                    isVisible: false, // Estado para controlar la visibilidad del sidebar
                    reports: [],
                    record: null,
                    showRunModelMethod: false,
                });

                this.modelMethodInput = useRef('modelMethodInput');
                this.modelMethodOutput = null;
                // onWillStart(async () => {
                //     // 
                // });
            }

            clearOutput() {
                this.state.recordFields = [];
                this.state.reports = [];
                console.log("Output cleared");
            }

            getRecordValues() {
                // Limpiar los campos
                this.clearOutput();
                const record = this.props.record;
                const recordData = record.data;

                // como se requieren en clave valor se recorre el objeto
                for (const key in recordData) {
                    this.state.recordFields.push({ key: key, value: recordData[key] });
                }
            }

            async getReports() {
                // Limpiar los campos
                this.clearOutput();
                const model = this.props.record.resModel;

                const action = await this.orm.call(
                    'ir.actions.report',
                    'search_read',
                    [],
                    {
                        domain: [['model', '=', model]],
                        fields: ['name', 'model', 'report_name', 'report_type'],
                        limit: 10
                    }
                );

                for (const report of action) {
                    report.url = `/report/pdf/${report.report_name}/${this.props.record.resId}`;
                    this.state.reports.push(report);
                }
            }

            closeSideBar() {
                this.state.isVisible = false; // Cambia el estado para ocultar el sidebar
            }

            openSideBar() {
                this.state.isVisible = true; // Método opcional para reabrir el sidebar
            }

            toggleSideBar() {
                this.state.isVisible = !this.state.isVisible; // Cambia el estado para mostrar u ocultar el sidebar
            }

            runModelMethodOpt() {
                // Limpiar los campos
                this.clearOutput();
                console.log("Run model method");
                this.state.showRunModelMethod = true;
            }

            runModelMethod() {
                console.log("Run model method");
                console.log("Model method input", this.modelMethodInput.el.value);

                const methodName = this.modelMethodInput.el.value;
                const model = this.props.record.resModel;
                const recordId = this.props.record.resId;

                this.orm.call(
                    model,
                    methodName,
                    [[recordId]],
                    {}
                ).then((result) => {
                    console.log("Model method result", result);
                    this.state.modelMethodOutput = JSON.stringify(result, null, 2);
                }).catch((error) => {
                    console.error("Error calling model method", error);
                    this.state.modelMethodOutput = JSON.stringify(error, null, 2);
                });
            }
        }

        class FieldXpath extends Component {
            setup() {
                this.orm = useService('orm');

                this.state = useState({
                    xpath: [],
                });
            }

            // Función para generar el XPath de un nodo
            generateXpath(node) {
                const path = [];
                while (node && node.nodeType === 1) { // Solo procesar nodos de tipo ELEMENT
                    let selector = node.nodeName.toLowerCase();
                    if (node.id) {
                        selector += `[@id="${node.id}"]`;
                        path.unshift(selector);
                        break;
                    } else {
                        let sibling = node;
                        let index = 1;
                        while (sibling.previousElementSibling) {
                            sibling = sibling.previousElementSibling;
                            index++;
                        }
                        if (index > 1) {
                            selector += `[${index}]`;
                        }
                    }
                    path.unshift(selector);
                    node = node.parentElement;
                }
                return path.length ? `/${path.join('/')}` : null;
            }

            copyCode() {
                console.log("Copy code");

                const record = this.props.record;
                const field = this.props.fieldName;
                const resModel = record.resModel;

                // Consultar las vistas relacionadas con el modelo
                this.orm.call(
                    'ir.ui.view',
                    'search_read',
                    [],
                    {
                        domain: [
                            ['model', '=', resModel],
                            ['type', '=', 'form']
                        ],
                        fields: ['id', 'name', 'arch', 'xml_id'],
                        limit: 100, // Limitar el número de vistas por eficiencia
                    }
                ).then((views) => {
                    // Recorrer las vistas para buscar el campo en el contenido XML
                    for (const view of views) {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(view.arch, "text/xml");

                        // Buscar si el campo está presente en el XML
                        const fieldNode = xmlDoc.querySelector(`[name="${field}"]`);
                        if (fieldNode) {
                            // Generar el xpath del nodo encontrado
                            const xpath = this.generateXpath(fieldNode);
                            console.log("XPath:", xpath);
                            this.state.xpath.push({ view: view.name, xpath: xpath, xml_id: view.xml_id });
                        }
                    }

                    console.log("XPATH", this.state.xpath);

                    // copy to clipboard
                    navigator.clipboard.writeText(JSON.stringify(this.state.xpath, null, 2));
                }).catch((error) => {
                    console.error("Error fetching views:", error);
                });
            }
        };

        FieldXpath.template = "odoo_dev.FieldXpath";


        SideBarDev.template = "odoo_dev.SideBar";
        SideBarDev.components = { FieldXpath };

        FormController.components = { ...FormController.components, SideBarDev };
        FormController.template = 'odoo_dev.FormView';

        Field.template = 'odoo_dev.Field';

        patch(FormLabel.prototype, {
            get tooltipInfo() {
                return getTooltipInfo({
                    viewMode: "form",
                    resModel: this.props.record.resModel,
                    field: this.props.record.fields[this.props.fieldName],
                    fieldInfo: this.props.fieldInfo,
                    help: this.tooltipHelp,
                });
            }
        });
        FormLabel.template = 'odoo_dev.FormLabel';


    });

}, false);