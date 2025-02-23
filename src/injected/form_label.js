/** @odoo-module */
odoo.define('odoo_dev.patches.form_label', ['@web/views/form/form_label', "@web/core/utils/patch", "@web/views/fields/field_tooltip"], function (require) {
    const { FormLabel } = require("@web/views/form/form_label");
    const { patch } = require("@web/core/utils/patch");
    const { getTooltipInfo } = require("@web/views/fields/field_tooltip");


    patch(FormLabel.prototype, {
        get tooltipInfo() {
            return getTooltipInfo({
                viewMode: "form",
                resModel: this.props.record.resModel,
                field: this.props.record.fields[this.props.fieldName],
                fieldInfo: this.props.fieldInfo,
                help: this.tooltipHelp,
            });
        }
    });
    FormLabel.template = 'odoo_dev.FormLabel';

    return FormLabel;
});