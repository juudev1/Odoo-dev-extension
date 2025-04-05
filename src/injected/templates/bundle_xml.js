odoo.define('odoo_dev.bundle.xml', ['@web/core/registry', '@odoo/owl', '@web/core/assets', 'odoo_dev.version_utils'], function (require) {
    'use strict';

    const { loadFile } = require('@odoo/owl');
    const { registry } = require('@web/core/registry');
    const { loadCSS, loadXML } = require("@web/core/assets");
    const odooVersion = require('odoo_dev.version_utils'); 

    const xmlBundle = {
        loadTemplatesAndCSS: async function (xmlFiles, cssFiles) {
            try {
                // 1. Cargar y parsear templates XML
                const templatePromises = xmlFiles.map(file => loadFile(file));
                const templatesContent = await Promise.all(templatePromises);

                if (odooVersion.isV16) {
                    // Si es la versión 16
                    const allTemplates = "<templates>" + templatesContent.join('') + "</templates>";
                    loadXML(allTemplates);
                } else if (odooVersion.isV17) {
                    // Si es la versión 17
                    const allTemplates = "<templates>" + templatesContent.join('') + "</templates>";
                    registry.category('xml_templates').add('odoo_dev', allTemplates);
                } else if (odooVersion.isV18Plus) { // O usa odooVersion.isV18 si solo aplica a 18

                    // Si es la version 18
                    const parser = new DOMParser();
                    templatesContent.forEach((xmlContent, fileIndex) => {
                        const doc = parser.parseFromString(xmlContent, "text/xml");
                        const templates = doc.querySelectorAll('t[t-name]');
                        const xmlFile = xmlFiles[fileIndex]; // Get the correct XML file path

                        templates.forEach(template => {
                            const tName = template.getAttribute('t-name');
                            if (tName) {
                                const templateHTML = template.outerHTML;
                                // Condicional para registrar el template en Odoo v18+
                                const versionInfo = odoo.info && odoo.info.server_version_info;
                                if (versionInfo && versionInfo[0] >= 18) {
                                    const { registerTemplate } = require('@web/core/templates');
                                    registerTemplate(tName, xmlFile, templateHTML);
                                }
                            }
                        });
                    });
                }

                // 3. Cargar CSS secuencialmente
                for (const file of cssFiles) {
                    await loadCSS(file);
                }

                return true;
            } catch (error) {
                console.error('Error loading resources:', error);
                throw error;
            }
        }
    };

    return xmlBundle;
});