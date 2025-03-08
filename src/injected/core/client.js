odoo.define('odoo_dev.web_client', ['odoo_dev.bundle.xml'], async function (require) {
    const xmlBundle = require('odoo_dev.bundle.xml');

    try {
        console.log("Iniciando la extensión...");
        console.log(window.__devExtensionUrl);
        console.log("Extension URL:", window.__devExtensionUrl);
        // Inicialización única
        await ExtensionCore.init();

        // Uso de recursos
        const resources = {
            templates: ExtensionCore.resources.templates,
            css: ExtensionCore.resources.css,
        };

        const imageSrc = await ExtensionCore.extensionData.backgroundImg;
        // Crear un tag style y agregar la imagen
        const style = document.createElement('style');
        style.innerHTML = `
            .o_home_menu_background,
                .o_web_client.o_home_menu_background {
                background-image: url(${imageSrc});
                }
        `;
        document.head.appendChild(style);

        const bodyBg = document.querySelector(".o_home_menu_background");
        xmlBundle.loadTemplatesAndCSS(resources.templates, resources.css);

    } catch (error) {
        console.error('Error initializing extension:', error);
    }
});

