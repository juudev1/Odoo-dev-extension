odoo.define('odoo_dev.active_record', ['@odoo/owl', '@web/core/registry'], async function (require) {

    const { reactive } = require("@odoo/owl");
    const { registry } = require("@web/core/registry");

    const serviceState = reactive({
        resModel: null,
        resId: null,
        isFormView: false,
    });

    const activeRecordService = {
        dependencies: [],
        start(env) {
            const _state = reactive({
                // Estado actual expuesto
                currentResModel: null,
                currentResId: null,
                currentIsFormView: false,

                // Estado del último formulario principal
                mainFormResModel: null,
                mainFormResId: null,
            });

            // Exponer el estado reactivo a través de un getter
            // para que los componentes que lo usan (useService)
            // obtengan el objeto reactivo correcto.
            const serviceInterface = {
                get state() {
                    return {
                        resModel: _state.currentResModel,
                        resId: _state.currentResId,
                        isFormView: _state.currentIsFormView,
                    };
                },

                // Método para obtener el contexto del formulario principal
                getMainFormContext() {
                    if (_state.mainFormResModel && _state.mainFormResId !== null) {
                        return {
                            resModel: _state.mainFormResModel,
                            resId: _state.mainFormResId,
                            isFormView: true, // Por definición, es un contexto de formulario
                        };
                    }
                    return null;
                },

                setActiveRecord(resModel, resId, isFormView = false) {
                    // console.log("[activeRecordService] setActiveRecord CALLED. New state:", resModel, resId, "IsForm:", isFormView);
                    _state.currentResModel = resModel;
                    _state.currentResId = resId;
                    _state.currentIsFormView = isFormView;

                    if (isFormView && resModel && resId !== null) {
                        // console.log("[activeRecordService] Storing as MainFormContext:", resModel, resId);
                        _state.mainFormResModel = resModel;
                        _state.mainFormResId = resId;
                    }
                    // Considera si quieres emitir un evento aquí o si SideBarDev solo usa useEffect con state
                    if (env.bus) { // Asumiendo que env.bus está disponible
                        env.bus.trigger("ACTIVE_RECORD_CHANGED", { resModel, resId, isFormView });
                    }
                },

                clearActiveRecord() {
                    console.log("[activeRecordService] clearActiveRecord CALLED.");
                    _state.currentResModel = null;
                    _state.currentResId = null;
                    _state.currentIsFormView = false;
                    // NO limpiar mainFormResModel/Id aquí, ya que queremos recordarlo.
                    // Se limpiará cuando se cierre el formulario principal (ver parche de FormController).

                    if (env.bus) {
                        env.bus.trigger("ACTIVE_RECORD_CLEARED"); // O un evento específico
                    }
                },

                // Nueva función para limpiar específicamente el contexto del formulario principal
                // Esto lo llamaría el FormController al desmontarse, si es el formulario principal.
                clearMainFormContext(formModel, formId) {
                    if (_state.mainFormResModel === formModel && _state.mainFormResId === formId) {
                        console.log("[activeRecordService] Clearing MainFormContext:", formModel, formId);
                        _state.mainFormResModel = null;
                        _state.mainFormResId = null;
                        // Si el registro activo actual era este formulario principal, también lo limpiamos
                        if (_state.currentResModel === formModel && _state.currentResId === formId) {
                            this.clearActiveRecord();
                        }
                    }
                }
            };
            return serviceInterface;
        },
    };

    // console.log("[Odoo Dev Index] Registering ActiveRecordService");
    registry.category("services").add("activeRecordService", activeRecordService);

    return activeRecordService;
});