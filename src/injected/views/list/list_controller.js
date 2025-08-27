odoo.define('odoo_dev.list_controller', ['@odoo/owl', '@web/views/list/list_controller', '@web/core/utils/hooks', '@web/core/utils/patch', 'odoo_dev.version_utils'], function (require) {
    "use strict";

    const { ListController } = require("@web/views/list/list_controller");
    const { useService } = require("@web/core/utils/hooks");
    const { patch } = require("@web/core/utils/patch");
    const { useEffect, onWillUnmount } = require('@odoo/owl');
    const odooVersion = require('odoo_dev.version_utils');

    if (odooVersion.isV17Plus) {
        patch(ListController.prototype, {
            setup() {
                console.log("[Odoo Dev List Controller] Setting up...");
                super.setup();
                this.activeRecordService = useService("activeRecordService");

                useEffect(
                    (props) => {
                        const { resModel, resId } = this.props;
                        if (resModel) {
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
    } else {
        // En versiones inferiores se debe poner un patchName
        patch(ListController.prototype, 'odoo_dev.form_controller', {
            setup() {
                this._super();
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
    }
});