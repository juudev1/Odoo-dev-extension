
odoo.define('odoo_dev.form_compiler', ['@web/views/form/form_compiler', '@web/core/utils/patch'], function (require) {
    "use strict";

    const { FormCompiler } = require("@web/views/form/form_compiler")
    const { patch } = require("@web/core/utils/patch");


    if (odoo.info.server_version_info[0] >= 17) {
        patch(FormCompiler.prototype, {
            compileField(el, params) {
                const field = super.compileField(el, params);
                field.setAttribute("showTooltip", true);
                return field;
            }
        });
    } else {
        // En versiones inferiores se debe poner un patchName
        patch(FormCompiler.prototype, 'odoo_dev.form_compiler', {
            compileField(el, params) {
                const field = this._super(...arguments);
                field.setAttribute("showTooltip", true);
                return field;
            }
        });
    }

    return {
        FormCompiler,
    }

});