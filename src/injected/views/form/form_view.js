odoo.define('odoo_dev.form_view', ['@web/core/registry','@web/views/form/form_view'], function (require) {
    const { registry } = require("@web/core/registry");
    const { formView } = require("@web/views/form/form_view");
    const { FormCompilerDev } = require("odoo_dev.form_compiler");

    // Obtener la vista original ya registrada
    const originalFormView = registry.category("views").get("form");
    
    originalFormView.Compiler = FormCompilerDev;

});