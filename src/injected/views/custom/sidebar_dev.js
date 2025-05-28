odoo.define('odoo_dev.components.sidebar_dev', ['@odoo/owl', '@web/core/utils/hooks', 'odoo_dev.components.field_xpath', '@web/core/assets', '@web/core/registry'], function (require) {
    const { Component, useState, useRef, useEffect, onWillUpdateProps, onWillUnmount, onMounted, onPatched, mount, whenReady } = require('@odoo/owl');
    const { useService } = require("@web/core/utils/hooks");
    const { FieldXpath } = require('odoo_dev.components.field_xpath');
    const { templates } = require('@web/core/assets');
    const { mountComponent } = require('@web/env');
    const { registry } = require("@web/core/registry");

    // Constantes para el historial
    const RUN_METHOD_HISTORY_KEY = 'odooDevRunMethodHistory';
    const MAX_HISTORY_SIZE = 10; // Guardar los últimos 10

    class SideBarDev extends Component {

        setup() {
            console.log("[SideBarDev setup] Initializing SideBarDev component...");

            this.orm = useService('orm');
            this.notification = useService("notification");
            this.activeRecordService = useService("activeRecordService");

            this.envBus = this.env.bus;
            this._onActiveRecordChanged = this._onActiveRecordChanged.bind(this);
            this.revertToMainFormContext = this.revertToMainFormContext.bind(this);

            console.log("[SideBarDev setup] Active Record Service (initial state):",
                this.activeRecordService,
                this.activeRecordService.state.resId,
                this.activeRecordService.state.resModel,
                this.activeRecordService.state.isFormView
            );

            this.state = useState({
                // Usar el estado del servicio para inicializar
                currentModel: this.activeRecordService.state.resModel,
                currentRecordId: this.activeRecordService.state.resId,
                isFormView: this.activeRecordService.state.isFormView,

                recordFields: [],
                fieldDefinitions: {},
                isVisible: false, // O true si quieres que empiece visible
                reports: [],
                // record: null, // Ya no es necesario, usamos currentModel/Id

                editingFieldKey: null,
                editingFieldValue: null,
                isSavingEdit: false,

                showRunModelMethod: false,
                modelMethodName: '',
                modelMethodArgs: '[]',
                modelMethodKwargs: '{}',
                modelMethodOutput: null,
                modelMethodOutputIsError: false,
                modelMethodPreview: '',
                isModelMethodRunning: false,
                runMethodHistory: [],
                focusRunButtonAfterPatch: false,
            });

            this.methodNameInput = useRef('methodNameInput');
            this.methodArgsInput = useRef('methodArgsInput');
            this.methodKwargsInput = useRef('methodKwargsInput');
            this.editInputRef = useRef('editInput');
            this.outputPreRef = useRef('outputPre');
            this.historyListRef = useRef('historyList');

            this.database = window.odoo.info.db;

            /* Enlazamos métodos (sin cambios aquí) */
            this.getRecordValues = this.getRecordValues.bind(this);
            this.getReports = this.getReports.bind(this);
            this.runModelMethodOpt = this.runModelMethodOpt.bind(this);
            this.startEdit = this.startEdit.bind(this);
            this.cancelEdit = this.cancelEdit.bind(this);
            this.saveEdit = this.saveEdit.bind(this);
            this.closeSideBar = this.closeSideBar.bind(this);
            this.openSideBar = this.openSideBar.bind(this);
            this.toggleSideBar = this.toggleSideBar.bind(this);
            this.runModelMethod = this.runModelMethod.bind(this);
            this.copyModelMethodPreview = this.copyModelMethodPreview.bind(this);
            this.updateModelMethodPreview = this.updateModelMethodPreview.bind(this);
            this.loadRunMethodHistory = this.loadRunMethodHistory.bind(this);
            this.saveRunMethodHistory = this.saveRunMethodHistory.bind(this);
            this.addToRunMethodHistory = this.addToRunMethodHistory.bind(this);
            this.applyHistoryItem = this.applyHistoryItem.bind(this);
            this.clearRunMethodHistory = this.clearRunMethodHistory.bind(this);
            this.loadX2ManyCount = this.loadX2ManyCount.bind(this);
            this.loadMany2oneName = this.loadMany2oneName.bind(this);

            useEffect(
                () => {
                    this.clearOutput(true); // Limpiar salida al montar
                    
                    // Este callback se ejecuta cuando una o más de las dependencias en el array de abajo cambian.
                    const serviceModel = this.activeRecordService.state.resModel;
                    const serviceResId = this.activeRecordService.state.resId;
                    const serviceIsFormView = this.activeRecordService.state.isFormView;

                    console.log(
                        `[SideBarDev useEffect TRIGGERED] ` +
                        `Service (M: ${serviceModel}, ID: ${serviceResId}, Form: ${serviceIsFormView}), ` +
                        `Sidebar (Visible: ${this.state.isVisible}, M: ${this.state.currentModel}, ID: ${this.state.currentRecordId})`
                    );

                    // Determinar si el registro del servicio ha cambiado *respecto al estado actual del sidebar*
                    const modelChangedInService = this.state.currentModel !== serviceModel;
                    const idChangedInService = this.state.currentRecordId !== serviceResId;
                    // Podrías también querer rastrear si 'isFormView' cambió si afecta tu lógica de carga.
                    // const formViewStatusChanged = this.state.isFormView !== serviceIsFormView;

                    // Actualizar el estado interno del sidebar para que siempre refleje el servicio
                    // Esto se hace ANTES de las comprobaciones de 'modelChangedInService' e 'idChangedInService'
                    // para que esas variables reflejen el cambio DESDE el estado anterior del sidebar HACIA el nuevo estado del servicio.
                    if (this.state.currentModel !== serviceModel) {
                        this.state.currentModel = serviceModel;
                    }
                    if (this.state.currentRecordId !== serviceResId) {
                        this.state.currentRecordId = serviceResId;
                    }
                    if (this.state.isFormView !== serviceIsFormView) {
                        this.state.isFormView = serviceIsFormView;
                    }

                    // Actualizar la vista previa del método si el registro cambió (y la sección está activa)
                    if (this.state.showRunModelMethod && (modelChangedInService || idChangedInService)) {
                        console.log("[SideBarDev useEffect] Updating model method preview due to record change.");
                        this.updateModelMethodPreview();
                    }
                },
                // Dependencias CORRECTAS:
                () => [
                    this.activeRecordService.state.resModel,
                    this.activeRecordService.state.resId,
                    this.activeRecordService.state.isFormView, // Solo si realmente afecta la lógica de carga o visualización
                    this.state.isVisible,
                ]
            );

            // onWillUpdateProps ya no es necesario para props.record
            const updatePreviewIfNeeded = () => {
                if (this.state.showRunModelMethod) {
                    this.updateModelMethodPreview();
                }
            };

            onMounted(() => {
                if (this.envBus) {
                    this.envBus.addEventListener("ACTIVE_RECORD_CHANGED", this._onActiveRecordChanged);
                }
            });

            onWillUnmount(() => {
                if (this.envBus) {
                    this.envBus.removeEventListener("ACTIVE_RECORD_CHANGED", this._onActiveRecordChanged);
                }
            });

            onPatched(() => {
                updatePreviewIfNeeded();
                if (this.state.focusRunButtonAfterPatch && this.el) {
                    const runButton = this.el.querySelector('.dev-sidebar-btn-run-method');
                    if (runButton) {
                        runButton.focus();
                    }
                    this.state.focusRunButtonAfterPatch = false;
                }
            });
        }


        _onActiveRecordChanged(payload) { // o dentro del useEffect
            const eventData = payload.detail || payload;
            console.log("[SideBarDev _onActiveRecordChanged] Event received, 'this' should be SideBarDev instance:", this);
            console.log("[SideBarDev _onActiveRecordChanged] Event data:", eventData);

            const { resModel, resId, isFormView } = eventData;

            // Guardar el estado que *llega* del servicio
            const serviceModel = resModel;
            const serviceResId = resId;
            const serviceIsFormView = isFormView;

            // Determinar si el registro del servicio ha cambiado *respecto al estado actual del sidebar*
            const modelActuallyChanged = this.state.currentModel !== serviceModel;
            const idActuallyChanged = this.state.currentRecordId !== serviceResId;

            // Actualizar el estado interno del sidebar para que siempre refleje el servicio
            this.state.currentModel = serviceModel;
            this.state.currentRecordId = serviceResId;
            this.state.isFormView = serviceIsFormView; // Esto es importante para saber si el contexto actual es un form

            if (this.state.isVisible) {
                if (modelActuallyChanged || idActuallyChanged) {
                    if (serviceModel && serviceResId !== null) {
                        console.log("[SideBarDev _onActiveRecordChanged/useEffect] Record changed, sidebar visible. Calling getRecordValues()");
                        // this.getRecordValues();
                    } else {
                        console.log("[SideBarDev _onActiveRecordChanged/useEffect] Record cleared, sidebar visible. Calling clearOutput()");
                        this.clearOutput(true);
                    }
                } else {
                    const noDataLoaded = this.state.recordFields.length === 0 && serviceModel && serviceResId !== null;
                    if (noDataLoaded) {
                        console.log("[SideBarDev _onActiveRecordChanged/useEffect] Sidebar opened or event re-triggered, no data loaded. Calling getRecordValues()");
                        // this.getRecordValues();
                    }
                }
            }
            if (this.state.showRunModelMethod && (modelActuallyChanged || idActuallyChanged)) {
                this.updateModelMethodPreview();
            }
        }

        async revertToMainFormContext() {
            const mainFormContext = this.activeRecordService.getMainFormContext();
            if (mainFormContext) {
                console.log("[SideBarDev] Reverting to MainFormContext:", mainFormContext);

                // Actualizar el estado local del sidebar para que coincida con el contexto del formulario principal
                this.state.currentModel = mainFormContext.resModel;
                this.state.currentRecordId = mainFormContext.resId;
                this.state.isFormView = mainFormContext.isFormView; // Debería ser true

                // Luego, recargar los datos del sidebar con este contexto
                // await this.getRecordValues();

                // Opcional: si quieres que activeRecordService.state.current* también refleje esto,
                // podrías llamar a this.activeRecordService.setActiveRecord(...mainFormContext);
                // pero esto dispararía el useEffect de nuevo. Es más simple manejarlo localmente
                // en el sidebar si solo es para visualización temporal.
                // Si quieres que sea el "estado activo global" de nuevo:
                this.activeRecordService.setActiveRecord(
                    mainFormContext.resModel,
                    mainFormContext.resId,
                    true // Es un contexto de formulario
                );
                // El useEffect ya se encargará de llamar a getRecordValues si el setActiveRecord cambia el estado.

            } else {
                this.notification.add("No main form context to revert to.", { type: "info" });
            }
        }

        async loadRunMethodHistory() {
            try {
                // const history = await new Promise((resolve, reject) => {
                //     // Define un ID único para este request para correlacionar la respuesta
                //     const requestId = `historyLoad_${Date.now()}_${Math.random()}`;

                //     const listener = (event) => {
                //         if (event.source === window && event.data && event.data.type === 'ODEV_HISTORY_LOAD_RESPONSE' && event.data.requestId === requestId) {
                //             window.removeEventListener('message', listener);
                //             if (event.data.error) {
                //                 reject(new Error(event.data.error));
                //             } else {
                //                 resolve(event.data.payload);
                //             }
                //         }
                //     };
                //     window.addEventListener('message', listener);

                //     // Enviar mensaje al content script
                //     window.postMessage({ type: 'ODEV_REQUEST_HISTORY_LOAD', key: RUN_METHOD_HISTORY_KEY, requestId }, '*');

                //     // Timeout por si el content script no responde
                //     setTimeout(() => {
                //         window.removeEventListener('message', listener);
                //         reject(new Error("Timeout waiting for history load response"));
                //     }, 5000); // 5 segundos de timeout
                // });

                // if (history && Array.isArray(history)) {
                //     this.state.runMethodHistory = history;
                //     console.log("Run method history loaded via postMessage:", this.state.runMethodHistory);
                // } else {
                //     this.state.runMethodHistory = [];
                // }
            } catch (error) {
                console.error("Error loading run method history:", error);
                this.state.runMethodHistory = [];
            }
        }
        async saveRunMethodHistory(historyArray) {
            try {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ [RUN_METHOD_HISTORY_KEY]: historyArray }, () => {
                        if (chrome.runtime.lastError) {
                            return reject(chrome.runtime.lastError);
                        }
                        resolve();
                    });
                });
            } catch (error) {
                console.error("Error saving run method history:", error);
                this.notification.add("Failed to save method history.", { type: 'warning' });
            }
        }

        addToRunMethodHistory(model, method, argsString, kwargsString) {
            const newEntry = {
                model: model,
                method: method,
                args: argsString,
                kwargs: kwargsString,
                timestamp: Date.now()
            };

            if (this.state.runMethodHistory.length > 0) {
                const lastEntry = this.state.runMethodHistory[0];
                if (lastEntry.model === newEntry.model &&
                    lastEntry.method === newEntry.method &&
                    lastEntry.args === newEntry.args &&
                    lastEntry.kwargs === newEntry.kwargs) {
                    return;
                }
            }
            const updatedHistory = [newEntry, ...this.state.runMethodHistory].slice(0, MAX_HISTORY_SIZE);
            this.state.runMethodHistory = updatedHistory;
            this.saveRunMethodHistory(updatedHistory);
        }

        applyHistoryItem(historyItem) {
            if (!historyItem) return;
            this.state.modelMethodName = historyItem.method;
            this.state.modelMethodArgs = historyItem.args;
            this.state.modelMethodKwargs = historyItem.kwargs;
            this.updateModelMethodPreview();
            this.notification.add("Inputs populated from history.", { type: 'info' });
            this.state.focusRunButtonAfterPatch = true;
        }

        clearRunMethodHistory() {
            this.state.runMethodHistory = [];
            this.saveRunMethodHistory([]);
            this.notification.add("Run method history cleared.", { type: 'success' });
        }

        clearOutput(keepVisibility = false) {
            this.state.recordFields = [];
            this.state.fieldDefinitions = {}; // Limpiar también las definiciones
            this.state.reports = [];
            this.state.showRunModelMethod = false;
            this.state.modelMethodName = '';
            this.state.modelMethodArgs = '[]';
            this.state.modelMethodKwargs = '{}';
            this.state.modelMethodOutput = null;
            this.state.modelMethodOutputIsError = false;
            this.state.modelMethodPreview = '';
            this.state.isModelMethodRunning = false;
            if (!keepVisibility) {
                this.state.isVisible = false;
                // Si cerramos el panel, también limpiamos el registro activo en el servicio
                // para que no intente recargar datos si se reabre sin un nuevo contexto.
                // OJO: Esto podría ser polémico si otro componente depende de ese estado.
                // Por ahora lo comento, ya que el FormController debería limpiar al desmontarse.
                // this.activeRecordService.clearActiveRecord();
            }
        }

        async getRecordValues() {
            this.clearOutput(true); // Limpiar salida anterior, mantener visibilidad

            // Usar this.state.currentModel y this.state.currentRecordId
            if (this.state.currentRecordId === null || !this.state.currentModel) { // Puede ser ID 0
                console.warn("[SideBarDev getRecordValues] No valid record or record ID from service state.");
                this.state.recordFields = [];
                this.state.fieldDefinitions = {};
                return;
            }

            // const record = this.props.record; // Ya no se usa
            const currentModel = this.state.currentModel;
            const currentRecordId = this.state.currentRecordId;

            console.log(`[SideBarDev getRecordValues] Fetching data for ${currentModel} ID ${currentRecordId}`);
            let fieldDefs = {};
            this.state.recordFields = [];

            try {
                fieldDefs = await this.orm.call(currentModel, 'fields_get', [[]], {
                    attributes: ['string', 'type', 'readonly', 'relation', 'selection', 'required', 'related', 'compute', 'depends', 'company_dependent', 'groups', 'inverse_name', 'relation_field']
                });
                this.state.fieldDefinitions = fieldDefs;

                const fieldProcessingPromises = [];
                const initialPlaceholders = [];

                for (const key in fieldDefs) {
                    const def = fieldDefs[key];

                    if (def.type === 'binary' && def.related) {
                        initialPlaceholders.push({ key, value: '(Related Binary)', definition: def, accessError: false, isLoading: false, isLoaded: true });
                        continue;
                    }

                    let initialValue = '(Loading...)';
                    let initialIsLoaded = false;
                    let fieldStatus = '';

                    if (def.type === 'many2one') {
                        initialValue = null; initialIsLoaded = false; fieldStatus = '(Click 🔄 to load)';
                    } else if (['one2many', 'many2many'].includes(def.type)) {
                        initialValue = null; initialIsLoaded = false; fieldStatus = '(Click 🔄 to load count)';
                    } else if (def.type === 'binary') {
                        initialValue = '(Binary Data)'; initialIsLoaded = true;
                    }

                    const placeholder = {
                        key: key,
                        value: initialValue,
                        definition: def,
                        accessError: false,
                        isLoading: false,
                        isLoaded: initialIsLoaded,
                        status: fieldStatus
                    };
                    initialPlaceholders.push(placeholder);

                    if (!['many2one', 'one2many', 'many2many', 'binary'].includes(def.type)) {
                        const promise = (async (targetField) => {
                            let updatedField = { ...targetField };
                            try {
                                const readResult = await this.orm.call(currentModel, 'read', [[currentRecordId]], { fields: [updatedField.key], context: {} });
                                if (readResult.length > 0 && readResult[0].hasOwnProperty(updatedField.key)) {
                                    updatedField.value = readResult[0][updatedField.key];
                                    updatedField.isLoaded = true;
                                    updatedField.accessError = false;
                                } else {
                                    updatedField.value = '(Field Not Returned)';
                                    updatedField.accessError = true;
                                    updatedField.isLoaded = true;
                                }
                            } catch (err) {
                                const errorMessage = err.message?.data?.message || err.message || 'Read Failed';
                                updatedField.value = `(${errorMessage.split('\n')[0]})`;
                                updatedField.accessError = true;
                                updatedField.isLoaded = true;
                            }
                            return updatedField;
                        })(placeholder);
                        fieldProcessingPromises.push(promise);
                    } else {
                        fieldProcessingPromises.push(Promise.resolve(placeholder));
                    }
                }

                initialPlaceholders.sort((a, b) => (a.definition.string || a.key).localeCompare(b.definition.string || b.key));
                this.state.recordFields = [...initialPlaceholders];

                const results = await Promise.allSettled(fieldProcessingPromises);
                const finalFieldsMap = new Map();
                initialPlaceholders.forEach(p => finalFieldsMap.set(p.key, p));
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        const updatedField = result.value;
                        if (updatedField && updatedField.key) {
                            finalFieldsMap.set(updatedField.key, updatedField);
                        }
                    }
                });

                const finalFieldsArray = Array.from(finalFieldsMap.values());
                finalFieldsArray.sort((a, b) => (a.definition.string || a.key).localeCompare(b.definition.string || b.key));
                this.state.recordFields = [...finalFieldsArray];
                console.log("[SideBarDev getRecordValues] Record fields processed:", this.state.recordFields);

            } catch (error) {
                console.error("[SideBarDev getRecordValues] Error fetching field definitions:", error);
                this.notification.add(`Error fetching field definitions for ${currentModel}.`, { type: 'danger' });
                this.state.recordFields = [{ key: 'ERROR', value: 'Failed to get definitions.', definition: { string: 'Error' }, accessError: true, isLoading: false, isLoaded: true }];
                this.state.fieldDefinitions = {};
            }
        }

        async loadMany2oneName(fieldKey) {
            const fieldIndex = this.state.recordFields.findIndex(f => f.key === fieldKey);
            if (fieldIndex === -1) return;

            const fieldData = this.state.recordFields[fieldIndex];
            const def = fieldData.definition;
            const model = def.relation;

            let newRecordFields = [...this.state.recordFields];
            let updatedFieldData = { ...fieldData, isLoading: true, accessError: false };
            newRecordFields[fieldIndex] = updatedFieldData;
            this.state.recordFields = newRecordFields;

            console.log(`Loading name for ${fieldKey} (model: ${model})`);

            try {
                let m2oId = null;
                try {
                    // Usar this.state.currentModel y this.state.currentRecordId
                    const idReadResult = await this.orm.call(this.state.currentModel, 'read', [[this.state.currentRecordId]], { fields: [fieldKey] });
                    if (idReadResult.length > 0 && idReadResult[0][fieldKey]) {
                        const rawIdValue = idReadResult[0][fieldKey];
                        m2oId = Array.isArray(rawIdValue) ? rawIdValue[0] : (typeof rawIdValue === 'number' ? rawIdValue : null);
                    }
                } catch (idReadError) {
                    console.error(`Failed to read ID for M2O field ${fieldKey}:`, idReadError);
                    throw new Error(`Could not read field ${fieldKey} ID`);
                }

                let finalValue = false;
                if (m2oId) {
                    try {
                        const nameGetResult = await this.orm.call(model, 'name_get', [[m2oId]]);
                        finalValue = nameGetResult.length > 0 ? nameGetResult[0] : [m2oId, `(ID: ${m2oId} - Not Found?)`];
                    } catch (nameGetError) {
                        console.warn(`name_get for ${model} ID ${m2oId} failed:`, nameGetError);
                        finalValue = [m2oId, `(ID: ${m2oId} - Name Error)`];
                        if (nameGetError.message?.data?.name?.includes('AccessError')) {
                            updatedFieldData.accessError = true;
                            finalValue = `(Access Denied to ${model})`;
                        }
                    }
                }

                newRecordFields = [...this.state.recordFields];
                const finalFieldData = { ...newRecordFields[fieldIndex], value: finalValue, isLoading: false, isLoaded: true, accessError: updatedFieldData.accessError };
                newRecordFields[fieldIndex] = finalFieldData;
                this.state.recordFields = newRecordFields;

            } catch (error) {
                console.error(`Error loading name for ${fieldKey}:`, error);
                newRecordFields = [...this.state.recordFields];
                const errorFieldData = { ...newRecordFields[fieldIndex], value: `(${error.message || 'Error'})`, isLoading: false, isLoaded: true, accessError: true };
                newRecordFields[fieldIndex] = errorFieldData;
                this.state.recordFields = newRecordFields;
                this.notification.add(`Failed to load name for ${fieldKey}.`, { type: 'danger' });
            }
        }


        async loadX2ManyCount(fieldKey) {
            const fieldIndex = this.state.recordFields.findIndex(f => f.key === fieldKey);
            if (fieldIndex === -1) return;

            let fieldData = { ...this.state.recordFields[fieldIndex] };
            const def = fieldData.definition;
            const relatedModel = def.relation;

            let newRecordFields_loading = [...this.state.recordFields];
            fieldData.isLoading = true;
            fieldData.accessError = false;
            newRecordFields_loading[fieldIndex] = fieldData;
            this.state.recordFields = newRecordFields_loading;

            console.log(`Loading count for ${fieldKey} (model: ${relatedModel})`);

            try {
                let domain = [];
                let count = 0;
                // Usar this.state.currentModel y this.state.currentRecordId
                const currentRecordId = this.state.currentRecordId;
                const currentModel = this.state.currentModel;


                if (def.type === 'one2many') {
                    const inverseField = def.relation_field || def.inverse_name;
                    if (inverseField) {
                        domain = [[inverseField, '=', currentRecordId]];
                        count = await this.orm.call(relatedModel, 'search_count', [domain]);
                    } else {
                        console.warn(`Cannot determine inverse field for O2M field: ${fieldKey}.`);
                        throw new Error("Inverse field not found");
                    }
                } else if (def.type === 'many2many') {
                    const m2mRead = await this.orm.call(currentModel, 'read', [[currentRecordId]], { fields: [fieldKey] });
                    const ids = (m2mRead.length > 0 && Array.isArray(m2mRead[0][fieldKey])) ? m2mRead[0][fieldKey] : [];
                    count = ids.length;
                }

                let newRecordFields_final = [...this.state.recordFields];
                let finalFieldData = { ...newRecordFields_final[fieldIndex] };
                finalFieldData.value = `${count} Records`;
                finalFieldData.isLoading = false;
                finalFieldData.isLoaded = true;
                finalFieldData.accessError = false;
                newRecordFields_final[fieldIndex] = finalFieldData;
                this.state.recordFields = newRecordFields_final;

            } catch (error) {
                console.error(`Error loading count for ${fieldKey}:`, error);
                const errorMessage = error.message?.data?.message || error.message || 'Count Failed';
                let newRecordFields_error = [...this.state.recordFields];
                let errorFieldData = { ...newRecordFields_error[fieldIndex] };
                errorFieldData.value = `(${errorMessage.split('\n')[0]})`;
                errorFieldData.isLoading = false;
                errorFieldData.isLoaded = true;
                errorFieldData.accessError = true;
                newRecordFields_error[fieldIndex] = errorFieldData;
                this.state.recordFields = newRecordFields_error;
                this.notification.add(`Failed to load count for ${fieldKey}.`, { type: 'danger' });
            }
        }

        startEdit(field) {
            console.log("Starting edit for:", field.key, "Current value:", field.value);
            this.state.editingFieldKey = field.key;
            if (field.definition.type === 'many2one' && Array.isArray(field.value)) {
                this.state.editingFieldValue = field.value[0];
            } else if (field.definition.type === 'boolean') {
                this.state.editingFieldValue = Boolean(field.value);
            } else {
                this.state.editingFieldValue = field.value;
            }
            requestAnimationFrame(() => {
                if (this.editInputRef.el) {
                    this.editInputRef.el.focus();
                    if (['text', 'number'].includes(this.editInputRef.el.type)) {
                        this.editInputRef.el.select();
                    }
                }
            });
        }

        cancelEdit() {
            this.state.editingFieldKey = null;
            this.state.editingFieldValue = null;
            this.state.isSavingEdit = false;
        }

        async saveEdit() {
            if (!this.state.editingFieldKey || this.state.isSavingEdit) return;

            const fieldKey = this.state.editingFieldKey;
            const fieldDef = this.state.fieldDefinitions[fieldKey];
            let newValue = this.state.editingFieldValue;
            const currentModel = this.state.currentModel; // Usar del estado
            const currentRecordId = this.state.currentRecordId; // Usar del estado

            if (fieldDef.required) {
                if (fieldDef.type !== 'boolean' && !newValue && newValue !== 0) { // Permitir 0 para numéricos
                    this.notification.add(`Field "${fieldKey}" is required.`, { type: 'danger' });
                    return;
                }
            }
            try {
                if (fieldDef.type === 'integer') {
                    newValue = newValue === '' || newValue === null ? null : parseInt(newValue, 10);
                    if (isNaN(newValue) && newValue !== null) throw new Error("Invalid integer");
                } else if (fieldDef.type === 'float' || fieldDef.type === 'monetary') {
                    newValue = newValue === '' || newValue === null ? null : parseFloat(newValue);
                    if (isNaN(newValue) && newValue !== null) throw new Error("Invalid number");
                } else if (fieldDef.type === 'many2one') {
                    newValue = newValue === '' || newValue === null ? false : parseInt(newValue, 10);
                    if (isNaN(newValue) && newValue !== false) throw new Error("Invalid ID for Many2one");
                }
            } catch (parseError) {
                console.error("Parsing error:", parseError);
                this.notification.add(`Invalid value format for ${fieldDef.type} field "${fieldKey}".`, { type: 'danger' });
                return;
            }

            this.state.isSavingEdit = true;
            try {
                await this.orm.call(currentModel, 'write', [[currentRecordId], { [fieldKey]: newValue }]);
                this.notification.add(`Field "${fieldKey}" saved.`, { type: 'success' });

                const fieldIndex = this.state.recordFields.findIndex(f => f.key === fieldKey);
                if (fieldIndex > -1) {
                    if (fieldDef.type === 'many2one' && newValue !== false) {
                        // Para m2o, lo ideal es forzar recarga o hacer name_get
                        // this.state.recordFields[fieldIndex].value = [newValue, `(ID: ${newValue} - Reload field)`](newValue, `(ID: ${newValue} - Reload field)`);
                        await this.loadMany2oneName(fieldKey); // Recargar el nombre
                    } else {
                        this.state.recordFields[fieldIndex].value = newValue;
                    }
                    // Forzar actualización de isLoaded para que getDisplayValue lo re-evalúe
                    this.state.recordFields[fieldIndex].isLoaded = true;
                    this.state.recordFields[fieldIndex].accessError = false; // Asumir que ya no hay error de acceso
                }
                this.cancelEdit();
            } catch (error) {
                console.error("Error saving field:", error);
                const errorMessage = error.data?.message || error.message || "Unknown error";
                this.notification.add(`Error saving "${fieldKey}": ${errorMessage}`, { type: 'danger', sticky: true });
                this.state.isSavingEdit = false;
            }
        }

        async getReports() {
            this.clearOutput(true);
            // Usar this.state.currentModel y this.state.currentRecordId
            const model = this.state.currentModel;
            const recordId = this.state.currentRecordId;

            if (!model || recordId === null) {
                this.notification.add("No active record to get reports for.", { type: 'warning' });
                return;
            }

            try {
                const reportsData = await this.orm.call(
                    'ir.actions.report',
                    'search_read',
                    [],
                    {
                        domain: [['model', '=', model]],
                        fields: ['name', 'model', 'report_name', 'report_type'],
                        limit: 10 // O un límite razonable
                    }
                );

                this.state.reports = reportsData.map(report => ({
                    ...report,
                    url: `/report/pdf/${report.report_name}/${recordId}`
                }));

            } catch (error) {
                console.error("Error fetching reports", error);
                this.notification.add("Failed to fetch reports.", { type: 'danger' });
            }
        }

        closeSideBar() {
            this.state.isVisible = false;
        }

        openSideBar() {
            this.state.isVisible = true;
        }

        toggleSideBar() {
            this.state.isVisible = !this.state.isVisible;
            if (this.state.isVisible) {
                if (this.state.currentModel && this.state.currentRecordId !== null) {
                    // this.getRecordValues();
                }
            } else {
                this.clearOutput();
            }
        }

        getDisplayValue(field) {
            if (field.accessError) { return field.value; }
            if (field.isLoading) { return '(Loading...)'; }
            if (!field.isLoaded) {
                return field.status || '(Not loaded)';
            }
            const value = field.value;
            const def = field.definition;
            if (value === false && def.type !== 'boolean') return '(empty)';
            if (value === null || value === undefined) {
                if (['many2one', 'one2many', 'many2many'].includes(def.type)) return '(empty)';
                return '';
            }
            if (def.type === 'many2one' && Array.isArray(value)) { return value[1] || `(ID: ${value[0]})`; }
            if (['one2many', 'many2many'].includes(def.type)) { return String(value); }
            if (def.type === 'boolean') { return value ? '✔️' : '❌'; }
            if (def.type === 'selection' && def.selection) {
                const match = def.selection.find(s => s[0] === value);
                return match ? match[1] : String(value);
            }
            if (def.type === 'binary') { return String(value); }
            return String(value);
        }

        runModelMethodOpt() {
            this.clearOutput(true);
            this.state.showRunModelMethod = true;
            this.loadRunMethodHistory();
            this.updateModelMethodPreview();
            requestAnimationFrame(() => {
                if (this.methodNameInput.el) this.methodNameInput.el.focus();
            });
        }

        updateModelMethodPreview() {
            // Usar this.state.currentModel y this.state.currentRecordId
            const model = this.state.currentModel || 'your.model';
            const method = this.state.modelMethodName.trim() || 'your_method';
            const recordId = this.state.currentRecordId;
            let argsString = this.state.modelMethodArgs.trim();
            let kwargsString = this.state.modelMethodKwargs.trim();

            try { argsString = JSON.stringify(JSON.parse(argsString || '[]'), null, 2); } catch (e) { /* usa el string original */ }
            try { kwargsString = JSON.stringify(JSON.parse(kwargsString || '{}'), null, 2); } catch (e) { /* usa el string original */ }

            let finalArgsArrayString = '[]';
            if (recordId !== null && recordId !== undefined) {
                try {
                    const userArgs = JSON.parse(argsString || '[]');
                    if (!Array.isArray(userArgs)) throw new Error("Args not an array");
                    finalArgsArrayString = JSON.stringify([[recordId], ...userArgs], null, 2);
                } catch (e) {
                    finalArgsArrayString = `[[${recordId}], /* Invalid user args format */]`;
                }
            } else {
                finalArgsArrayString = argsString;
            }

            this.state.modelMethodPreview = `
await this.env.services.orm.call(
   "${model}",
   "${method}",
   ${finalArgsArrayString},
   ${kwargsString}
);`;
        }

        copyModelMethodPreview() {
            if (!this.state.modelMethodPreview) return;
            navigator.clipboard.writeText(this.state.modelMethodPreview.trim())
                .then(() => this.notification.add("ORM call preview copied!", { type: "success" }))
                .catch(err => {
                    console.error('Error copying text: ', err);
                    this.notification.add("Failed to copy preview.", { type: "danger" });
                });
        }

        async runModelMethod() {
            const methodName = this.state.modelMethodName.trim();
            // Usar this.state.currentModel y this.state.currentRecordId
            const model = this.state.currentModel;
            const recordId = this.state.currentRecordId;
            const argsString = this.state.modelMethodArgs.trim();
            const kwargsString = this.state.modelMethodKwargs.trim();


            if (!methodName) {
                this.notification.add("Method name is required.", { type: 'warning' });
                return;
            }
            if (!model) {
                this.notification.add("Current model is not available.", { type: 'warning' });
                return;
            }

            let args = [];
            let kwargs = {};

            try {
                const argsInputValue = this.state.modelMethodArgs.trim();
                if (argsInputValue) {
                    args = JSON.parse(argsString || '[]');
                    if (!Array.isArray(args)) throw new Error("Positional arguments must be a JSON array.");
                }
            } catch (error) {
                this.state.modelMethodOutput = `Invalid JSON format for positional arguments:\n${error.message}`;
                this.state.modelMethodOutputIsError = true;
                this.notification.add("Invalid JSON for positional arguments.", { type: 'danger' });
                return;
            }
            try {
                const kwargsInputValue = this.state.modelMethodKwargs.trim();
                if (kwargsInputValue) {
                    kwargs = JSON.parse(kwargsString || '{}');
                    if (typeof kwargs !== "object" || Array.isArray(kwargs) || kwargs === null) {
                        throw new Error("Keyword arguments must be a JSON object.");
                    }
                }
            } catch (error) {
                this.state.modelMethodOutput = `Invalid JSON format for keyword arguments:\n${error.message}`;
                this.state.modelMethodOutputIsError = true;
                this.notification.add("Invalid JSON for keyword arguments.", { type: 'danger' });
                return;
            }

            if (model && methodName) {
                this.addToRunMethodHistory(model, methodName, argsString, kwargsString);
            }

            const callArgs = (recordId !== null && recordId !== undefined) ? [[recordId], ...args] : [...args];

            this.state.isModelMethodRunning = true;
            this.state.modelMethodOutput = null;
            this.state.modelMethodOutputIsError = false;

            try {
                const result = await this.orm.call(model, methodName, callArgs, kwargs);
                this.state.modelMethodOutput = JSON.stringify(result, null, 2);
                this.state.modelMethodOutputIsError = false;
            } catch (error) {
                console.error("Error calling model method:", error);
                let errorObj = error;
                if (error.message && error.message.data) {
                    errorObj = {
                        message: error.message.data.message,
                        debug: error.message.data.debug,
                        name: error.message.data.name,
                        arguments: error.message.data.arguments,
                        context: error.context,
                    };
                } else if (error instanceof Error) {
                    errorObj = { name: error.name, message: error.message, stack: error.stack };
                }
                this.state.modelMethodOutput = JSON.stringify(errorObj, null, 2);
                this.state.modelMethodOutputIsError = true;
                this.notification.add(`Error executing method: ${errorObj.message || 'Unknown error'}`, { type: 'danger', sticky: true });
            } finally {
                this.state.isModelMethodRunning = false;
            }
        }
    }

    SideBarDev.template = "odoo_dev.SideBar";
    SideBarDev.components = { FieldXpath };

    // Registrar el componente para que MainComponentsContainer lo renderice
    registry.category("main_components").add("SideBarDev", {
        Component: SideBarDev,
    });

    // whenReady(() => {
    //     console.log("Mounting SideBarDev component");
    //     console.log(templates);
    //     mountComponent(SideBarDev, document.body, {templates});
    // });


    return SideBarDev;

});