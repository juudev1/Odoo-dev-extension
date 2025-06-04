/** @odoo-module */
odoo.define('odoo_dev.patches.form_label', ['@web/views/form/form_label', "@web/core/utils/patch", "@web/views/fields/field_tooltip", 'odoo_dev.version_utils'], function (require) {
    const { FormLabel } = require("@web/views/form/form_label");
    const { patch } = require("@web/core/utils/patch");
    const { getTooltipInfo } = require("@web/views/fields/field_tooltip");
    const odooVersion = require('odoo_dev.version_utils');

    if (odooVersion.isV17Plus) {
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
    } else {
        patch(FormLabel.prototype, 'odoo_dev.form_label', {
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
    }

    FormLabel.template = 'odoo_dev.FormLabel';

    return FormLabel;
});