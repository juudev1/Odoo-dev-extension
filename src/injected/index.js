// Inicialización única

import ExtensionCore from './core/extension-core.js';

await ExtensionCore.init();
window.ExtensionCore = ExtensionCore;

(function () {
    "use strict";

    const extensionUrl = ExtensionCore.getUrl();
    const srcFolder = extensionUrl + "src/injected/";

    // Crear un script global con la URL de la extensión
    const script = document.createElement("script");
    script.textContent = `window.__devExtensionUrl = "${extensionUrl}";`;
    document.head.appendChild(script);

    // Función para cargar dinámicamente los scripts
    function loadScript(path) {
        const url = new URL(path, srcFolder);
        // console.log("Cargando script:", url);
        return new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = url.href;
            script.type = "module";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // si la url contiene "/web" pero no subrutas como "/web/login" o "/web/signup"
    const isWebModule = window.location.pathname.includes('/web') && !window.location.pathname.includes('/web/login') && !window.location.pathname.includes('/web/signup');
    const hasFileLoaded = document.querySelector('input[type="file"]') !== null; 

    // Si la URL contiene "/web" o hay un archivo cargado, inyectamos los módulos
    if (isWebModule || hasFileLoaded) {
        const scripts = [
            "./core/client.js",
            "./core/extension-core.js",
            "./templates/bundle_xml.js",
            "./tooltip/js/dev_info_service.js",
            "./tooltip/js/tooltip.js",
            "./views/custom/field_xpath.js",
            "./views/custom/sidebar_dev.js",
            "./views/form/form_compiler.js",
            "./views/form/form_controller.js",
            "./views/list/list_renderer.js",
            "./views/view_button/view_button.js",
            "./views/field.js",
            "./views/field_label.js"
        ];

        // Cargar los scripts de forma dinámica
        Promise.all(scripts.map(loadScript))
            .then(() => console.log("Todos los scripts fueron cargados correctamente."))
            .catch(err => console.error("Error cargando los scripts:", err));
    }
})();

