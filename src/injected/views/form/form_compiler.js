
odoo.define('odoo_dev.form_compiler', ['@web/views/form/form_compiler', '@web/core/utils/patch', 'odoo_dev.version_utils'], function (require) {
    "use strict";

    const { FormCompiler } = require("@web/views/form/form_compiler")
    const { patch } = require("@web/core/utils/patch");
    const odooVersion = require('odoo_dev.version_utils'); // <--- Obtener la utilidad


    if (odooVersion.isV17Plus) {
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