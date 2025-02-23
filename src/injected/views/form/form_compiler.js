
odoo.define('odoo_dev.form_compiler', ['@web/views/form/form_compiler'], function (require) {
    "use strict";

    const { FormCompiler } = require("@web/views/form/form_compiler")

    class FormCompilerDev extends FormCompiler {

        /**
      * @override
      */
        compileField(el, params) {
            const field = super.compileField(el, params);
            field.setAttribute("showTooltip", true);
            return field;
        }
    }

    return {
        FormCompilerDev,
    }

});