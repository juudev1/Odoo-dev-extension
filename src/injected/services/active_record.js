odoo.define('odoo_dev.active_record', ['@odoo/owl', '@web/core/registry'], function (require) {

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
            // Parse initial hash manually to avoid missing dependency errors
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const initialModel = hashParams.get('model') || null;
            const rawId = hashParams.get('id');
            const initialId = rawId ? (rawId === 'new' ? false : parseInt(rawId, 10)) : null;
            const initialIsFormView = hashParams.get('view_type') === 'form';

            const _state = reactive({
                // Estado actual expuesto
                resModel: initialModel,
                resId: initialId,
                isFormView: initialIsFormView,
                viewType: initialIsFormView ? 'form' : null,
                viewId: null, // ID de la ir.ui.view
                context: null, // el contexto actual de la vista

                // Estado del último formulario principal
                mainFormResModel: initialIsFormView ? initialModel : null,
                mainFormResId: initialIsFormView ? initialId : null,
            });

            // Exponer el estado reactivo directamente para que Owl pueda rastrearlo
            const serviceInterface = {
                state: _state,


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

                setActiveRecord(resModel, resId, isFormView = false, viewType = undefined, viewId = undefined, context = undefined) {
                    // console.log("[activeRecordService] setActiveRecord CALLED. New state:", resModel, resId, "IsForm:", isFormView);
                    _state.resModel = resModel;
                    _state.resId = resId;
                    _state.isFormView = isFormView;
                    if (viewType !== undefined) {
                        _state.viewType = viewType || (isFormView ? 'form' : null);
                    }
                    if (viewId !== undefined) {
                        _state.viewId = viewId;
                    }
                    if (context !== undefined) {
                        _state.context = context;
                    }

                    if (isFormView && resModel && resId !== null) {
                        // console.log("[activeRecordService] Storing as MainFormContext:", resModel, resId);
                        _state.mainFormResModel = resModel;
                        _state.mainFormResId = resId;
                    }
                    // Considera si quieres emitir un evento aquí o si SideBarDev solo usa useEffect con state
                    if (env.bus) { // Asumiendo que env.bus está disponible
                        env.bus.trigger("ACTIVE_RECORD_CHANGED", { resModel, resId, isFormView, viewType: _state.viewType, viewId: _state.viewId, context: _state.context });
                    }
                },

                clearActiveRecord() {
                    console.log("[activeRecordService] clearActiveRecord CALLED.");
                    _state.resModel = null;
                    _state.resId = null;
                    _state.isFormView = false;
                    _state.viewType = null;
                    _state.viewId = null;
                    _state.context = null;
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
                        if (_state.resModel === formModel && _state.resId === formId) {
                            this.clearActiveRecord();
                        }
                    }
                }
            };

            // Listen to native Odoo UI updates. This eliminates the need for FormController patches!
            if (env.bus) {
                env.bus.addEventListener("ACTION_MANAGER:UI-UPDATED", () => {
                    const actionService = env.services?.action;
                    if (actionService && actionService.currentController) {
                        const ctrl = actionService.currentController;
                        if (ctrl.action && ctrl.action.res_model) {
                            const model = ctrl.action.res_model;
                            const viewType = ctrl.viewType || ctrl.view?.type || (ctrl.action.views?.some(v => v[1] === 'form') ? 'form' : 'list');
                            const isForm = viewType === 'form';
                            const activeView = ctrl.action?.views?.find(v => v[1] === viewType);
                            const fallbackViewId = activeView && activeView[0] !== false ? activeView[0] : null;
                            const configViewId = (ctrl.env?.config?.views || []).find(v => v[1] === viewType)?.[0] || null;
                            const viewId = ctrl.props?.info?.id || ctrl.props?.archInfo?.viewId || ctrl.view?.id || ctrl.props?.viewId || configViewId || fallbackViewId;
                            
                            let id = ctrl.props?.resId || ctrl.action?.res_id || null;
                            if (id === false || id === 'new') id = null;
                            
                            const context = ctrl.props?.context || ctrl.action?.context || null;

                            console.log("[activeRecordService] Native UI Update caught:", model, id, isForm, viewType, viewId, "context:", context);
                            serviceInterface.setActiveRecord(model, id, isForm, viewType, viewId, context);
                        } else {
                            // Si cambiamos a una acción sin modelo (ej. Dashboard), limpiamos.
                            serviceInterface.clearActiveRecord();
                        }
                    }
                });
            }

            // Also check immediately upon start in case we mounted after the initial UI update
            const actionService = env.services?.action;
            if (actionService && actionService.currentController) {
                const ctrl = actionService.currentController;
                if (ctrl.action && ctrl.action.res_model) {
                    const model = ctrl.action.res_model;
                    const viewType = ctrl.viewType || ctrl.view?.type || (ctrl.action.views?.some(v => v[1] === 'form') ? 'form' : 'list');
                    const isForm = viewType === 'form';
                    const activeView = ctrl.action?.views?.find(v => v[1] === viewType);
                    const fallbackViewId = activeView && activeView[0] !== false ? activeView[0] : null;
                    const configViewId = (ctrl.env?.config?.views || []).find(v => v[1] === viewType)?.[0] || null;
                    const viewId = ctrl.props?.info?.id || ctrl.props?.archInfo?.viewId || ctrl.view?.id || ctrl.props?.viewId || configViewId || fallbackViewId;
                    
                    let id = ctrl.props?.resId || ctrl.action?.res_id || null;
                    if (id === false || id === 'new') id = null;
                    
                    const context = ctrl.props?.context || ctrl.action?.context || null;

                    console.log("[activeRecordService] Initial Mount Native UI Update:", model, id, isForm, viewType, viewId, "context:", context);
                    serviceInterface.setActiveRecord(model, id, isForm, viewType, viewId, context);
                }
            }

            return serviceInterface;
        },
    };

    // console.log("[Odoo Dev Index] Registering ActiveRecordService");
    registry.category("services").add("activeRecordService", activeRecordService);

    return activeRecordService;
});