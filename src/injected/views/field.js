odoo.define('odoo_dev.patches.field', ['@web/views/fields/field', '@web/views/fields/field_tooltip', '@web/core/utils/patch'], function (require) {
    "use strict";

    const { Field } = require("@web/views/fields/field");
    const { getTooltipInfo } = require('@web/views/fields/field_tooltip');
    const { patch } = require("@web/core/utils/patch");

    if (odoo.info.server_version_info[0] == 16) {
        Field.template = 'odoo_dev.Field16';
    } else {
        Field.template = 'odoo_dev.Field';
    }

    if (odoo.info.server_version_info[0] >= 17) {
        patch(Field.prototype, {
            get tooltip() {
                const tooltip = getTooltipInfo({
                    field: this.props.record.fields[this.props.name],
                    fieldInfo: this.props.fieldInfo || {
                        help: 'Nada'
                    },
                });
                return tooltip;
            },
            configurable: true, // Allows future redefinition/deletion
        });
    } else {
        // En versiones inferiores se debe poner un patchName
        patch(Field.prototype, 'odoo_dev.patches.field', {
            get tooltip() {
                const tooltip = getTooltipInfo({
                    field: this.props.record.fields[this.props.name],
                    fieldInfo: this.props.fieldInfo || {
                        help: 'Nada'
                    },
                });
                return tooltip;
            },
            configurable: true, // Allows future redefinition/deletion
        });
    }

    return { Field }; // Export Field to make it available if needed
});