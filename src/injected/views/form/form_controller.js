odoo.define('odoo_dev.form_controller', ['@odoo/owl', '@web/views/form/form_controller', '@web/core/utils/hooks', '@web/core/utils/patch', 'odoo_dev.version_utils'], function (require) {
    "use strict";

    const { FormController } = require("@web/views/form/form_controller");
    const { useService } = require("@web/core/utils/hooks");
    const { patch } = require("@web/core/utils/patch");
    const { useEffect, onWillUnmount, onMounted, onPatched } = require('@odoo/owl');
    const odooVersion = require('odoo_dev.version_utils'); 

    if (odooVersion.isV17Plus) {
        patch(FormController.prototype, {
            setup() {
                super.setup();
                this.activeRecordService = useService("activeRecordService");

                const updateActiveRecord = () => {
                    const resModel = this.props.resModel || this.model?.root?.resModel;
                    const resId = this.model?.root?.resId || this.props.resId;
                    const viewType = 'form';
                    const configViewId = (this.env?.config?.views || []).find(v => v[1] === viewType)?.[0] || null;
                    const viewId = this.props?.info?.id || this.props?.archInfo?.viewId || this.env?.config?.viewId || configViewId || this.props?.viewId || this.env?.services?.action?.currentController?.view?.id || null;
                    const context = this.props?.context || null;
                    
                    console.log("[Odoo Dev FormController] updateActiveRecord triggered. resModel:", resModel, "resId:", resId, "viewId:", viewId, "env.config:", this.env?.config);

                    if (resModel && resId) {
                        this.activeRecordService.setActiveRecord(resModel, resId, true, viewType, viewId, context);
                    } else if (resModel && !resId) {
                        this.activeRecordService.setActiveRecord(resModel, null, true, viewType, viewId, context);
                    }
                };

                onMounted(updateActiveRecord);
                onPatched(updateActiveRecord);

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
        patch(FormController.prototype, 'odoo_dev.form_controller', {
            setup() {
                this._super();
                this.activeRecordService = useService("activeRecordService");

                const updateActiveRecord = () => {
                    const resModel = this.props.resModel || this.model?.root?.resModel;
                    const resId = this.model?.root?.resId || this.props.resId;
                    const viewType = 'form';
                    const configViewId = (this.env?.config?.views || []).find(v => v[1] === viewType)?.[0] || null;
                    const viewId = this.props?.info?.id || this.props?.archInfo?.viewId || this.env?.config?.viewId || configViewId || this.props?.viewId || this.env?.services?.action?.currentController?.view?.id || null;
                    const context = this.props?.context || null;

                    if (resModel && resId) {
                        this.activeRecordService.setActiveRecord(resModel, resId, true, viewType, viewId, context);
                    } else if (resModel && !resId) {
                        this.activeRecordService.setActiveRecord(resModel, null, true, viewType, viewId, context);
                    }
                };

                onMounted(updateActiveRecord);
                onPatched(updateActiveRecord);

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