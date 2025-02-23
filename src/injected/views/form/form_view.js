odoo.define('odoo_dev.form_view', ['@web/core/registry'], function (require) {
    const { registry } = require("@web/core/registry");
    const { FormCompilerDev } = require("odoo_dev.form_compiler");
    
    // Obtener la vista original ya registrada
    const originalFormView = registry.category("views").get("form");

    // Modificar el `Compiler`
    originalFormView.Compiler = FormCompilerDev;
});