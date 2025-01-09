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

        // Cargar todas las plantillas XML de manera asíncrona
        const templatePromises = xmlFiles.map(file => loadFile(file));
        const templates = await Promise.all(templatePromises);
        let TEMPLATES = '<?xml version="1.0" encoding="UTF-8"?><templates>';

        templates.forEach(template => {
            TEMPLATES += template;
        });

        TEMPLATES += '</templates>';
        console.log("TEMPLATES", TEMPLATES);

        // const payload = { operation: "add", 'odoo_dev': TEMPLATES };
        // registry.category("xml_templates").trigger("UPDATE", payload);

        registry.category(`xml_templates`).add(`odoo_dev`, TEMPLATES);
    });


    odoo.define('odoo_dev.App', ['@web/core/utils/hooks', '@web/core/registry', '@odoo/owl'], async function (require) {
        "use strict";

        const { Component, mount, useState, whenReady, loadFile, onWillStart, App, xml, TemplateSet, parseXML } = require('@odoo/owl');
        const { useService } = require("@web/core/utils/hooks");
        const { _t } = require("@web/core/l10n/translation");
        const { makeEnv, startServices } = require("@web/env");
        const { WebClientEnterprise } = require("@web_enterprise/webclient/webclient");
        const { startWebClient } = require("@web/start");
        const { ActionContainer } = require("@web/webclient/actions/action_container");
        const { patch } = require("@web/core/utils/patch");
        const { registry } = require('@web/core/registry');
        const { loadJS, loadCSS, loadBundle } = require("@web/core/assets");
        // const { templates } = require("@web/core/assets");

        loadBundle('odoo_dev.bundle.xml');

        class SideBarDev extends Component {
            state = useState({
                data: null,
            });

            setup() {
                console.log("SETUP");
                try {
                    this.orm = useService('orm');
                    console.log("ORM Service Found:", this.orm);
                } catch (e) {
                    console.error("ORM Service Not Found:", e);
                }

                // onWillStart(async () => {
                //     // 
                // });
            }

            getRecordValues(){
                console.log("GET RECORD VALUES");
                console.log(this);
                // const record = this.orm.searchRead()
            }
        }

        cssFiles.forEach(async (file) => {
            const css = await loadFile(file);
            // loadCSS(css);
        });

        SideBarDev.template = "odoo_dev.SideBar";

        ActionContainer.components = { ...ActionContainer.components, SideBarDev };
        ActionContainer.template = xml`
        <t t-name="web.ActionContainer">
            <div class="d-flex flex-row flex-grow">
                <div class="o_action_manager flex-grow-1">
                    <t t-if="info.Component" t-component="info.Component" className="'o_action'" t-props="info.componentProps" t-key="info.id"/>
                </div>
                 <!-- Sidebar reducido -->
                <div class="sidebar-dev">
                    <SideBarDev />
                </div>
            </div>
        </t>`;


        class ActionContainerDev extends ActionContainer {
            setup() {
                console.log("SETUP ActionContainerDev");
                super.setup();
                this.orm = useService('orm');
                console.log("ORM Service Found:", this.orm);
            }
        }




    });

}, false);

//post something back to content script
window.postMessage(
    {
        type: 'FROM_PAGE',
        state: 'some state'
    },
    "*"
);

