odoo.define('odoo_dev.form_controller', ['@web/views/form/form_controller', "@web/core/utils/hooks", "@web/core/utils/patch", '@odoo/owl'], function (require) {
    "use strict";

    const { FormController } = require("@web/views/form/form_controller");
    const { useService } = require("@web/core/utils/hooks");
    const { patch } = require("@web/core/utils/patch");
    const { useEffect, onWillUnmount } = require('@odoo/owl');

    patch(FormController.prototype, {
        setup() {
            super.setup();
            this.activeRecordService = useService("activeRecordService");

            useEffect(
                (props) => {
                    const { resModel, resId } = this.props;
                    if (resModel && resId) {
                        this.activeRecordService.setActiveRecord(resModel, resId, true);
                    } else {
                        this.activeRecordService.clearActiveRecord();
                    }
                },
                () => [this.props.resModel, this.props.resId]
            );

            onWillUnmount(() => {
                // Limpiar cuando el controlador del formulario se destruye
                // Pero solo si este controlador fue el último en establecer un registro de formulario.
                // Esto evita que un diálogo de formulario limpie el registro del formulario principal.
                if (this.activeRecordService.state.resModel === this.props.resModel &&
                    this.activeRecordService.state.resId === this.props.resId &&
                    this.activeRecordService.state.isFormView) {
                    this.activeRecordService.clearActiveRecord();
                }
            });
        }
    });
});