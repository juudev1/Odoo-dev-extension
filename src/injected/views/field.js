odoo.define('odoo_dev.patches.field', ['@web/views/fields/field', '@web/views/fields/field_tooltip', '@web/core/utils/patch'], function (require) {
    "use strict";

    const { Field } = require("@web/views/fields/field");
    const { getTooltipInfo } = require('@web/views/fields/field_tooltip');
    const { patch } = require("@web/core/utils/patch");

    Field.template = 'odoo_dev.Field';

    patch(Field.prototype, {
        get tooltip() {
            console.log('Field.prototype.tooltip', this.props.record.fields[this.props.name]);
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

    return { Field }; // Export Field to make it available if needed
});