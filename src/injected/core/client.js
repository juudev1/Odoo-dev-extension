import '../templates/bundle_xml.js';
import ExtensionCore from './extension-core.js';

odoo.define('odoo_dev.web_client', ['odoo_dev.bundle.xml'], async function (require) {
    const xmlBundle = require('odoo_dev.bundle.xml');

    try {
        // Inicialización única
        await ExtensionCore.init();

        try {
            // Obtener imagen en base64
            const imageSrc = await ExtensionCore.extensionData.backgroundImg;
            
            const body = document.querySelector("body");
            body.style.backgroundImage = `url(${imageSrc})`;

        } catch (error) {
            console.error("Error cargando la imagen:", error);
        }


        // Uso de recursos
        const resources = {
            templates: ExtensionCore.resources.templates,
            css: ExtensionCore.resources.css,
        };

        xmlBundle.loadTemplatesAndCSS(resources.templates, resources.css);

    } catch (error) {
        console.error('Error initializing extension:', error);
    }
});