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

    if (window.location.pathname != '/web') return;

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


    odoo.define('odoo_dev.App', ['@web/core/utils/hooks', '@web/core/registry', '@odoo/owl'], async function (require) {
        "use strict";

        const { Component, mount, useState, whenReady, loadFile, onWillStart, App, xml, TemplateSet, parseXML } = require('@odoo/owl');
        const { useService } = require("@web/core/utils/hooks");
        const { _t } = require("@web/core/l10n/translation");
        const { FormController } = require("@web/views/form/form_controller");

        class SideBarDev extends Component {

            setup() {
                // console.log("SETUP");
                this.orm = useService('orm');

                this.state = useState({
                    recordFields: [],
                    isVisible: false, // Estado para controlar la visibilidad del sidebar
                    reports: []
                });
                // onWillStart(async () => {
                //     // 
                // });
            }

            getRecordValues() {
                // Limpiar los campos
                this.state.recordFields = [];

                console.log("GET RECORD VALUES");
                const record = this.props.record;
                const recordData = record.data;

                // como se requieren en clave valor se recorre el objeto

                for (const key in recordData) {
                    console.log(key, recordData[key]);
                    this.state.recordFields.push({ key: key, value: recordData[key] });
                }
            }

            getReports() {
                console.log("GET REPORTS");
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
        }

        SideBarDev.template = "odoo_dev.SideBar";

        FormController.components = { ...FormController.components, SideBarDev };
        FormController.template = 'odoo_dev.FormView';
    });

}, false);