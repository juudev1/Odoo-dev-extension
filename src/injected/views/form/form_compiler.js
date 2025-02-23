
odoo.define('odoo_dev.form_compiler', ['@web/views/form/form_compiler', '@web/core/utils/patch'], function (require) {
    "use strict";

    const { FormCompiler } = require("@web/views/form/form_compiler")
    const { patch } = require("@web/core/utils/patch");

    patch(FormCompiler.prototype, {
        compileField(el, params) {
            const field = super.compileField(el, params);
            field.setAttribute("showTooltip", true);
            return field;
        }
    });

    return {
        FormCompiler,
    }

});