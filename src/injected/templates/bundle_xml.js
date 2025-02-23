odoo.define('odoo_dev.bundle.xml', ['@web/core/registry'], function (require) {
    'use strict';

    const { loadFile } = require('@odoo/owl');
    const { registry } = require('@web/core/registry');
    const { loadCSS } = require("@web/core/assets");

    const xmlBundle = {
        loadTemplatesAndCSS: async function (xmlFiles, cssFiles) {
            try {
                console.log("Loading XML", xmlFiles);
                console.log("Loading CSS", cssFiles);
                
                // 1. Cargar y combinar templates XML
                const templatePromises = xmlFiles.map(file => loadFile(file));
                const templates = await Promise.all(templatePromises);
                
                let TEMPLATES = '<?xml version="1.0" encoding="UTF-8"?><templates>';
                templates.forEach(template => {
                    TEMPLATES += template;
                });
                TEMPLATES += '</templates>';

                // 2. Registrar templates después de cargarlos
                registry.category('xml_templates').add('odoo_dev', TEMPLATES);

                // 3. Cargar CSS secuencialmente
                for (const file of cssFiles) {
                    console.log("Loading CSS", file);
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