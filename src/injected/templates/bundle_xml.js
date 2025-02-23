odoo.define('odoo_dev.bundle.xml', ['@web/core/registry'], function (require) {
    'use strict';

    const { loadFile } = require('@odoo/owl');
    const { registry } = require('@web/core/registry');
    const { loadCSS } = require("@web/core/assets");

    const xmlBundle = {
        loadTemplatesAndCSS: async function (xmlFiles, cssFiles) {
            try {
                // 1. Cargar y parsear templates XML
                const templatePromises = xmlFiles.map(file => loadFile(file));
                const templatesContent = await Promise.all(templatePromises);

                // 2. Procesar cada template individualmente
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

                // Si es la versión 17
                if (!odoo.info || odoo.info.server_version_info[0] === 17) {
                    const allTemplates = "<templates>" + templatesContent.join('') + "</templates>";
                    registry.category('xml_templates').add('odoo_dev', allTemplates);
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