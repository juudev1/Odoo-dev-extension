
odoo.define('odoo_dev.view_button', ['@web/views/view_button/view_button', '@web/core/utils/patch'], function (require) {
    const { ViewButton } = require('@web/views/view_button/view_button');
    const { patch } = require("@web/core/utils/patch");

    ViewButton.template = "odoo_dev.ViewButton";

    if (odoo.info.server_version_info[0] == 16) {
        patch(ViewButton.prototype, 'odoo_dev.ViewButton', {
            setup() {
                // Super
                this._super(...arguments);

                this.tooltip = JSON.stringify({
                    debug: Boolean(odoo.debug),
                    button: {
                        string: this.props.string,
                        help: this.clickParams.help || 'No hay texto de ayuda bro',
                        context: this.clickParams.context,
                        invisible: this.props.attrs?.invisible,
                        column_invisible: this.props.attrs?.column_invisible,
                        readonly: this.props.attrs?.readonly,
                        required: this.props.attrs?.required,
                        special: this.clickParams.special,
                        type: this.clickParams.type,
                        name: this.clickParams.name,
                        title: this.props.title,
                    },
                    context: this.props.record && this.props.record.context,
                    model: (this.props.record && this.props.record.resModel) || this.props.resModel,
                });
            },
            get hasBigTooltip() {
                return true;
            }
        });
    } else if (odoo.info.server_version_info[0] >= 17) {
        patch(ViewButton.prototype, {
            setup() {
                // Super
                super.setup();

                this.tooltip = JSON.stringify({
                    debug: Boolean(odoo.debug),
                    button: {
                        string: this.props.string,
                        help: this.clickParams.help || 'No hay texto de ayuda bro',
                        context: this.clickParams.context,
                        invisible: this.props.attrs?.invisible,
                        column_invisible: this.props.attrs?.column_invisible,
                        readonly: this.props.attrs?.readonly,
                        required: this.props.attrs?.required,
                        special: this.clickParams.special,
                        type: this.clickParams.type,
                        name: this.clickParams.name,
                        title: this.props.title,
                    },
                    context: this.props.record && this.props.record.context,
                    model: (this.props.record && this.props.record.resModel) || this.props.resModel,
                });
            },
            get hasBigTooltip() {
                return true;
            }
        });
    } 

    return {
        ViewButton: ViewButton
    };
});