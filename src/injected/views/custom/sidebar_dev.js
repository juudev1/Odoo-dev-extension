odoo.define('odoo_dev.components.sidebar_dev', ['@odoo/owl', '@web/core/utils/hooks', 'odoo_dev.components.field_xpath', '@web/core/assets', '@web/core/registry'], function (require) {
    const { Component, useState, useRef, useEffect, onWillUpdateProps, onWillUnmount, onMounted, onPatched, mount, whenReady } = require('@odoo/owl');
    const { useService } = require("@web/core/utils/hooks");
    const { FieldXpath } = require('odoo_dev.components.field_xpath');
    const { templates } = require('@web/core/assets');
    const { registry } = require("@web/core/registry");

    const RUN_METHOD_HISTORY_KEY = 'odooDevRunMethodHistory';
    const MAX_HISTORY_SIZE = 10;

    class SideBarDev extends Component {

        setup() {
            this.orm = useService('orm');
            this.notification = useService("notification");
            this.activeRecordService = useService("activeRecordService");
            this.envBus = this.env.bus;

            this._onActiveRecordChanged = this._onActiveRecordChanged.bind(this);
            this.revertToMainFormContext = this.revertToMainFormContext.bind(this);

            this.state = useState({
                currentModel: this.activeRecordService.state.resModel,
                currentRecordId: this.activeRecordService.state.resId,
                isFormView: this.activeRecordService.state.isFormView,
                recordFields: [],
                fieldDefinitions: {},
                isVisible: false,
                reports: [],
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
                navigationStack: [],
                showingX2ManyListFor: null,
                x2manyRecords: [],
                isLoadingX2Many: false,
                isLoadingFields: false, // Added for general field loading state
            });

            this.methodNameInput = useRef('methodNameInput');
            this.methodArgsInput = useRef('methodArgsInput');
            this.methodKwargsInput = useRef('methodKwargsInput');
            this.editInputRef = useRef('editInput');
            this.outputPreRef = useRef('outputPre');
            this.historyListRef = useRef('historyList');

            this.database = window.odoo.info.db;

            /* Bind methods */
            const methodsToBind = [
                'getRecordValues', 'getReports', 'runModelMethodOpt', 'startEdit', 'cancelEdit',
                'saveEdit', 'closeSideBar', 'openSideBar', 'toggleSideBar', 'runModelMethod',
                'copyModelMethodPreview', 'updateModelMethodPreview', 'loadRunMethodHistory',
                'saveRunMethodHistory', 'addToRunMethodHistory', 'applyHistoryItem', 'clearRunMethodHistory',
                'loadX2ManyCount', 'loadMany2oneName', 'showX2ManyRecords', 'navigateToRelatedRecord',
                'navigateBack', 'clearX2ManyView'
            ];
            methodsToBind.forEach(method => this[method] = this[method].bind(this));


            useEffect(() => {
                const serviceModel = this.activeRecordService.state.resModel;
                const serviceResId = this.activeRecordService.state.resId;
                const serviceIsFormView = this.activeRecordService.state.isFormView;

                // This useEffect primarily ensures that if the sidebar *becomes visible*
                // or if its root state *should* change due to service (and _onActiveRecordChanged didn't already handle it),
                // it loads the correct data.

                // console.log( // Debug log
                //     `[SideBarDev useEffect] Service (M: ${serviceModel}, ID: ${serviceResId}), ` +
                //     `Sidebar (Visible: ${this.state.isVisible}, M: ${this.state.currentModel}, ID: ${this.state.currentRecordId}, NavStack: ${this.state.navigationStack.length})`
                // );

                if (this.state.navigationStack.length === 0 && !this.state.showingX2ManyListFor) {
                    // Sidebar is at its root level.
                    const modelChangedInState = this.state.currentModel !== serviceModel;
                    const idChangedInState = this.state.currentRecordId !== serviceResId;
                    const formViewChangedInState = this.state.isFormView !== serviceIsFormView;

                    if (modelChangedInState || idChangedInState || formViewChangedInState) {
                        // This can happen if _onActiveRecordChanged didn't run or didn't update state,
                        // or if props changed directly. Sync sidebar state to service state.
                        // console.log("[SideBarDev useEffect] Root context mismatch between sidebar state and service. Syncing sidebar state.");
                        this.state.currentModel = serviceModel;
                        this.state.currentRecordId = serviceResId;
                        this.state.isFormView = serviceIsFormView;
                        // The actual data loading for this new state will happen below if visible.
                    }

                    if (this.state.currentModel && this.state.currentRecordId !== null) {
                        // If visible, at root, and has a valid model/id, ensure data is loaded for the "fields" tab
                        // - if no fields are loaded OR
                        // - if the active tab *should be* fields but isn't (e.g. reports/method was active, now record changed)
                        if (!this.state.isLoadingFields &&
                            this.state.recordFields.length === 0 &&
                            !this.state.showRunModelMethod &&
                            !this.state.reports.length &&
                            (this.state.currentModel === serviceModel && this.state.currentRecordId === serviceResId) // ensure we are loading for the *actual current* service context
                        ) {
                            // console.log("[SideBarDev useEffect] Visible at root, current context valid, no field data for current 'fields' tab. Calling getRecordValues().");
                            this.getRecordValues();
                        }
                    } else if (!this.state.currentModel && this.state.currentRecordId === null) {
                        // Visible, at root, but context is empty (e.g., user navigated to list view)
                        // console.log("[SideBarDev useEffect] Visible at root, empty context. Clearing output.");
                        if (this.state.recordFields.length > 0 || this.state.reports.length > 0 || this.state.showRunModelMethod) {
                            this.clearOutput(true); // Keep visible, clear all data views
                        }
                    }

                    // Update method preview if relevant
                    if (this.state.showRunModelMethod && (modelChangedInState || idChangedInState)) {
                        // console.log("[SideBarDev useEffect] Updating model method preview due to root context change.");
                        this.updateModelMethodPreview();
                    }
                }
                // else: Sidebar has internal navigation, useEffect should not interfere with its current display.
                // _onActiveRecordChanged handles overrides of internal navigation if main context changes.
            }, () => [
                this.activeRecordService.state.resModel,
                this.activeRecordService.state.resId,
                this.activeRecordService.state.isFormView,
                this.state.isVisible,
                // Add dependencies that reflect the "active tab" if data loading depends on it
                // this.state.showRunModelMethod, // if its change should trigger something in useEffect
                // this.state.reports.length, // if its change should trigger something
            ]);

            onMounted(() => {
                if (this.envBus) {
                    this.envBus.addEventListener("ACTIVE_RECORD_CHANGED", this._onActiveRecordChanged);
                }
                if (this.state.showRunModelMethod) {
                    this.loadRunMethodHistory();
                }
            });

            onWillUnmount(() => {
                if (this.envBus) {
                    this.envBus.removeEventListener("ACTIVE_RECORD_CHANGED", this._onActiveRecordChanged);
                }
            });

            onPatched(() => {
                // updateModelMethodPreview is called directly when its inputs change or section opens
                if (this.state.focusRunButtonAfterPatch && this.el) {
                    const runButton = this.el.querySelector('.dev-sidebar-btn-run-method');
                    if (runButton) runButton.focus();
                    this.state.focusRunButtonAfterPatch = false;
                }
            });
        }

        _onActiveRecordChanged(payload) {
            if (!this.state.isVisible) {
                this.toggleSideBar(true); // Ensure sidebar is visible to handle the change
            }
            const eventData = payload.detail || payload;
            const { resModel: serviceModel, resId: serviceResId, isFormView: serviceIsFormView } = eventData;

            console.log(`[SideBarDev _onActiveRecordChanged] Event: M=${serviceModel}, ID=${serviceResId}, Form=${serviceIsFormView}`);
            // console.log(`  Current Sidebar State (before): M=${this.state.currentModel}, ID=${this.state.currentRecordId}, NavStack=${this.state.navigationStack.length}, X2MView=${!!this.state.showingX2ManyListFor}`);

            // Determine if the service event is different from what the sidebar is currently displaying
            const serviceIsDifferentFromCurrentDisplay =
                serviceModel !== this.state.currentModel ||
                serviceResId !== this.state.currentRecordId ||
                (serviceIsFormView !== undefined && serviceIsFormView !== this.state.isFormView); // also consider formView change

            console.log(`[SideBarDev _onActiveRecordChanged] Service is different from current display: ${serviceIsDifferentFromCurrentDisplay}`);

            if (serviceIsDifferentFromCurrentDisplay) {
                // The main Odoo UI context has changed to something different than what the sidebar is showing.
                // This is a signal to potentially reset the sidebar's internal state.
                // Si hay nav
                if (this.state.navigationStack.length > 0 || this.state.showingX2ManyListFor) {
                    // Sidebar has internal navigation. The main Odoo UI changed to something new.
                    // We should clear the internal navigation AND adopt the new service context.
                    console.log("[SideBarDev _onActiveRecordChanged] Main context changed. Overriding sidebar internal navigation and adopting new context from service.");

                    this.state.navigationStack = [];
                    this.state.showingX2ManyListFor = null;
                    this.state.x2manyRecords = [];

                    // **CRITICAL FIX: Directly update sidebar's currentModel/Id/isFormView to reflect the new service state.**
                    this.state.currentModel = serviceModel;
                    this.state.currentRecordId = serviceResId;
                    this.state.isFormView = serviceIsFormView;


                    if (serviceModel && serviceResId !== null) {
                        console.log("[SideBarDev _onActiveRecordChanged]   Calling getRecordValues() directly after override.");
                        this.getRecordValues(); // Load data for the new context immediately
                    } else {
                        console.log("[SideBarDev _onActiveRecordChanged]   Clearing output directly after override (empty context).");
                        this.clearOutput(true);
                    }


                } else {
                    // Sidebar was already at its root (no internal navigation).
                    // The change is from one root context to another.
                    // Directly update and let useEffect confirm or handle visibility.
                    console.log("[SideBarDev _onActiveRecordChanged] Main context changed, sidebar at root. Updating context.");
                    this.state.currentModel = serviceModel;
                    this.state.currentRecordId = serviceResId;
                    this.state.isFormView = serviceIsFormView;

                    if (serviceModel && serviceResId !== null) {
                        console.log("[SideBarDev _onActiveRecordChanged]   Root change, visible, no data. Calling getRecordValues().");
                        this.getRecordValues();
                    } else {
                        this.clearOutput(true);
                    }
                }
            } else {
                // Service event matches what sidebar is already displaying (or attempting to display at root).
                // No change in model/id/formView.
                // This might be a refresh or the sidebar just opened on the current context.
                // useEffect will handle loading data if sidebar is visible and has no data.
                // console.log("[SideBarDev _onActiveRecordChanged] Event for current record or no significant model/id change. No direct action to change context.");
                if (!this.state.isLoadingFields && this.state.recordFields.length === 0 &&
                    this.state.currentModel && this.state.currentRecordId !== null &&
                    !this.state.showRunModelMethod && !this.state.reports.length && // only if fields tab should be active
                    this.state.navigationStack.length === 0 && !this.state.showingX2ManyListFor) { // and at root
                    console.log("[SideBarDev _onActiveRecordChanged] Sidebar visible at root, event for current record, but no field data. Calling getRecordValues().");
                    this.getRecordValues();
                }
            }
            // console.log(`  Current Sidebar State (after): M=${this.state.currentModel}, ID=${this.state.currentRecordId}, NavStack=${this.state.navigationStack.length}, X2MView=${!!this.state.showingX2ManyListFor}`);
        }

        async revertToMainFormContext() {
            const mainFormContext = this.activeRecordService.getMainFormContext(); // 
            if (mainFormContext) {
                console.log("[SideBarDev] Reverting to MainFormContext:", mainFormContext);
                this.state.navigationStack = [];
                this.state.showingX2ManyListFor = null;
                this.state.x2manyRecords = [];

                // These state updates will trigger the useEffect, which will call getRecordValues
                this.state.currentModel = mainFormContext.resModel;
                this.state.currentRecordId = mainFormContext.resId;
                this.state.isFormView = mainFormContext.isFormView;

                // Optionally, explicitly update activeRecordService if it didn't originate the change
                // Si el modelo de la activeRecordService no coincide con el contexto principal
                // O si el id no coincide entonces actualizamos el activeRecordService como el contexto principal
                if (this.activeRecordService.state.resModel !== mainFormContext.resModel ||
                    this.activeRecordService.state.resId !== mainFormContext.resId) {
                    this.activeRecordService.setActiveRecord(
                        mainFormContext.resModel,
                        mainFormContext.resId,
                        true
                    );
                    // Refrescamos los valores para el registro actual
                    this.getRecordValues(); 
                } else if (!this.state.isVisible) { // If already on main context but sidebar was closed
                    this.getRecordValues(); // Manually trigger if useEffect won't due to no state change
                }


            } else {
                this.notification.add("No main form context to revert to.", { type: "info" });
            }
        }

        async loadRunMethodHistory() {
            try {
                const data = await new Promise((resolve, reject) => {
                    chrome.storage.local.get(RUN_METHOD_HISTORY_KEY, (result) => {
                        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                        resolve(result[RUN_METHOD_HISTORY_KEY]);
                    });
                });
                this.state.runMethodHistory = (data && Array.isArray(data)) ? data : [];
            } catch (error) {
                console.error("Error loading run method history:", error);
                this.state.runMethodHistory = [];
            }
        }

        async saveRunMethodHistory(historyArray) {
            try {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ [RUN_METHOD_HISTORY_KEY]: historyArray }, () => {
                        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                        resolve();
                    });
                });
            } catch (error) {
                console.error("Error saving run method history:", error);
                this.notification.add("Failed to save method history.", { type: 'warning' });
            }
        }

        addToRunMethodHistory(model, method, argsString, kwargsString) {
            const newEntry = { model, method, args: argsString, kwargs: kwargsString, timestamp: Date.now() };
            const lastEntry = this.state.runMethodHistory[0];
            if (lastEntry && lastEntry.model === newEntry.model && lastEntry.method === newEntry.method &&
                lastEntry.args === newEntry.args && lastEntry.kwargs === newEntry.kwargs) {
                return;
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
            this.state.fieldDefinitions = {};
            this.state.reports = [];
            // Only clear showRunModelMethod if we are not keeping visibility for a specific purpose
            // like switching tabs. If closing panel, then yes, reset.
            if (!keepVisibility) {
                this.state.showRunModelMethod = false;
                this.state.modelMethodOutput = null; // Clear output when panel closes
            }
            // Don't clear method inputs, they are useful to keep.
            // this.state.modelMethodName = '';
            // this.state.modelMethodArgs = '[]';
            // this.state.modelMethodKwargs = '{}';
            // this.state.modelMethodPreview = '';
            // this.state.isModelMethodRunning = false;

            if (!keepVisibility) {
                this.state.isVisible = false;
                this.state.navigationStack = [];
                this.state.showingX2ManyListFor = null;
                this.state.x2manyRecords = [];
            }
        }

        async getRecordValues() {
            // Clear previous data for the field list view
            this.state.recordFields = [];
            this.state.fieldDefinitions = {};
            this.state.reports = []; // Clear reports when fetching fields
            // Do not clear showRunModelMethod or its inputs here, allow tab-like behavior
            // Do not clear navigation stack or x2many view here, this function is for loading fields of currentModel/Id

            if (this.state.currentRecordId === null || !this.state.currentModel) {
                console.warn("[SideBarDev getRecordValues] No valid record or record ID.");
                this.state.isLoadingFields = false;
                return;
            }

            const currentModel = this.state.currentModel;
            const currentRecordId = this.state.currentRecordId;

            console.log(`[SideBarDev getRecordValues] Fetching data for ${currentModel} ID ${currentRecordId}`);
            this.state.isLoadingFields = true;
            this.state.showRunModelMethod = false; // Ensure fields tab is active
            this.state.showingX2ManyListFor = null; // Ensure not in x2m list view


            try {
                const fieldDefs = await this.orm.call(currentModel, 'fields_get', [[]], {
                    attributes: ['string', 'type', 'readonly', 'relation', 'selection', 'required', 'related', 'compute', 'depends', 'company_dependent', 'groups', 'inverse_name', 'relation_field']
                });
                this.state.fieldDefinitions = fieldDefs;

                const fieldsToLoadDirectly = [];
                const initialPlaceholders = [];

                for (const key in fieldDefs) {
                    const def = fieldDefs[key];
                    let initialValue = '(Loading...)';
                    let initialIsLoaded = false;
                    let fieldStatus = '';
                    let isLoading = true; // Assume loading initially

                    if (def.type === 'binary' && def.related) {
                        initialValue = '(Related Binary)'; initialIsLoaded = true; isLoading = false;
                    } else if (def.type === 'many2one') {
                        initialValue = null; fieldStatus = '(Click 🔄 to load)'; isLoading = false; // Not loading name/id yet
                    } else if (['one2many', 'many2many'].includes(def.type)) {
                        initialValue = null; fieldStatus = '(Click 🔄 to load count)'; isLoading = false; // Not loading count yet
                    } else if (def.type === 'binary') {
                        initialValue = '(Binary Data)'; initialIsLoaded = true; isLoading = false;
                    } else {
                        // Other types will be loaded directly
                        fieldsToLoadDirectly.push(key);
                    }

                    initialPlaceholders.push({
                        key: key,
                        value: initialValue,
                        definition: def,
                        accessError: false,
                        isLoading: isLoading, // Reflects if the field itself (not sub-data like m2o name) is loading
                        isLoaded: initialIsLoaded,
                        status: fieldStatus
                    });
                }

                initialPlaceholders.sort((a, b) => (a.definition.string || a.key).localeCompare(b.definition.string || b.key));
                this.state.recordFields = [...initialPlaceholders]; // Show placeholders immediately

                if (fieldsToLoadDirectly.length > 0) {
                    let readResultData = {};
                    try {
                        const readResults = await this.orm.call(currentModel, 'read', [[currentRecordId]], { fields: fieldsToLoadDirectly, context: {} });
                        if (readResults.length > 0) {
                            readResultData = readResults[0];
                        }
                    } catch (readError) {
                        console.error(`[SideBarDev getRecordValues] Error reading fields: ${fieldsToLoadDirectly.join(', ')}`, readError);
                        // Mark all these fields as errored
                        fieldsToLoadDirectly.forEach(key => {
                            const field = this.state.recordFields.find(f => f.key === key);
                            if (field) {
                                const errorMessage = readError.message?.data?.message || readError.message || 'Read Failed';
                                field.value = `(${errorMessage.split('\n')[0]})`;
                                field.accessError = true;
                                field.isLoading = false;
                                field.isLoaded = true;
                            }
                        });
                        // Optionally, re-throw or notify if it's a critical failure for all fields
                    }

                    // Update placeholders with read data or mark as not returned
                    this.state.recordFields.forEach(field => {
                        if (fieldsToLoadDirectly.includes(field.key) && !field.accessError) { // if not already marked as error from batch read
                            if (readResultData.hasOwnProperty(field.key)) {
                                field.value = readResultData[field.key];
                                field.accessError = false;
                            } else {
                                field.value = '(Field Not Returned by Read)';
                                field.accessError = true; // Or some other indicator
                            }
                            field.isLoading = false;
                            field.isLoaded = true;
                        }
                    });
                }
                // For fields that were not part of bulk load (m2o, x2m, binary), their isLoading was already set.
                // And for those in bulk load, isLoading is now false.
                this.state.recordFields = [...this.state.recordFields]; // Ensure reactivity after updates
                console.log("[SideBarDev getRecordValues] Record fields processed:", JSON.parse(JSON.stringify(this.state.recordFields)));

            } catch (error) {
                console.error("[SideBarDev getRecordValues] Error fetching field definitions:", error);
                this.notification.add(`Error fetching field definitions for ${currentModel}.`, { type: 'danger' });
                this.state.recordFields = [{ key: 'ERROR', value: 'Failed to get definitions.', definition: { string: 'Error' }, accessError: true, isLoading: false, isLoaded: true }];
                this.state.fieldDefinitions = {};
            } finally {
                this.state.isLoadingFields = false;
            }
        }

        async loadMany2oneName(fieldKey) {
            const fieldIndex = this.state.recordFields.findIndex(f => f.key === fieldKey);
            if (fieldIndex === -1) return;

            const fieldData = this.state.recordFields[fieldIndex];
            const def = fieldData.definition;
            const relatedModel = def.relation;

            Object.assign(this.state.recordFields[fieldIndex], { isLoading: true, accessError: false, status: '(Loading name...)' });
            this.state.recordFields = [...this.state.recordFields];

            console.log(`Loading name for M2O ${fieldKey} (model: ${relatedModel}) on ${this.state.currentModel}/${this.state.currentRecordId}`);

            let m2oId = null;
            let currentNameFromRead = null; // To store name if read from parent

            // 1. Get the ID of the M2O record
            try {
                // If fieldData.value is already [id, name], we have both.
                if (Array.isArray(fieldData.value) && typeof fieldData.value[0] === 'number') {
                    m2oId = fieldData.value[0];
                    currentNameFromRead = fieldData.value[1]; // Might be a stale name, but better than nothing
                } else if (typeof fieldData.value === 'number') { // Only ID is present
                    m2oId = fieldData.value;
                } else { // ID not available or not in expected format, try to read it from the parent record
                    const idReadResult = await this.orm.call(this.state.currentModel, 'read', [[this.state.currentRecordId]], { fields: [fieldKey] });
                    if (idReadResult.length > 0 && idReadResult[0][fieldKey]) {
                        const rawIdValue = idReadResult[0][fieldKey];
                        // Odoo M2O fields return [id, name_display] or false.
                        if (Array.isArray(rawIdValue)) {
                            m2oId = rawIdValue[0];
                            currentNameFromRead = rawIdValue[1];
                        } else if (typeof rawIdValue === 'number') { // Should not happen if field is proper m2o from read
                            m2oId = rawIdValue;
                        }
                        // Store what we read back into fieldData.value
                        fieldData.value = rawIdValue || false;
                    } else {
                        fieldData.value = false; // Explicitly set to false if empty
                    }
                }
            } catch (idReadError) {
                console.error(`Error reading M2O ID for ${fieldKey}:`, idReadError);
                const errorMsg = idReadError.message?.data?.message || idReadError.message || 'ID Read Error';
                Object.assign(this.state.recordFields[fieldIndex], {
                    value: `(Error: ${errorMsg.substring(0, 50)})`,
                    isLoading: false, isLoaded: true, accessError: true, status: ''
                });
                this.state.recordFields = [...this.state.recordFields];
                this.notification.add(`Failed to read ID for ${def.string || fieldKey}.`, { type: 'danger' });
                return; // Stop if we can't even get the ID
            }

            let finalDisplayValue = false; // Odoo's representation for empty m2o
            let accessErrorOccurred = false;

            if (m2oId) {
                // 2. Attempt to read common name fields first (more reliable than assuming name_get exists)
                let nameFieldsToTry = ['display_name', 'name']; // Common fields for display name
                // You could potentially fetch _rec_name from fields_get of the relatedModel if you want to be super precise
                // but that's an extra call. 'display_name' and 'name' cover most cases.

                let nameFoundByRead = false;
                for (const nameField of nameFieldsToTry) {
                    try {
                        const readNameResult = await this.orm.call(relatedModel, 'read', [[m2oId]], { fields: [nameField] });
                        if (readNameResult.length > 0 && readNameResult[0][nameField]) {
                            finalDisplayValue = [m2oId, readNameResult[0][nameField]];
                            nameFoundByRead = true;
                            break; // Found a name, no need to try others or name_get
                        }
                    } catch (readNameError) {
                        // Log this error but continue, as name_get might still work or other fields might exist
                        console.warn(`Reading '${nameField}' for ${relatedModel} ID ${m2oId} failed:`, readNameError);
                        // If it's an access error for this specific read, mark it.
                        if (readNameError.message?.data?.name?.includes('AccessError')) {
                            accessErrorOccurred = true; // Potential access error to the related model/field
                        }
                    }
                }

                // 3. If reading common name fields failed, fallback to name_get (if no critical access error yet)
                if (!nameFoundByRead && !accessErrorOccurred) {
                    try {
                        console.log(`Attempting name_get for ${relatedModel} ID ${m2oId}`);
                        const nameGetResult = await this.orm.call(relatedModel, 'name_get', [[m2oId]]);
                        if (nameGetResult.length > 0 && nameGetResult[0]) {
                            finalDisplayValue = nameGetResult[0]; // Should be [id, name]
                        } else {
                            // name_get returned empty or invalid, use ID and currentNameFromRead if available
                            finalDisplayValue = [m2oId, currentNameFromRead || `(ID: ${m2oId} - Name Not Found)`](m2oId, currentNameFromRead || `(ID: ${m2oId} - Name Not Found)`);
                        }
                    } catch (nameGetError) {
                        console.warn(`name_get for ${relatedModel} ID ${m2oId} failed:`, nameGetError);
                        const errorMsg = nameGetError.message?.data?.message || nameGetError.message || 'Name Error';

                        if (nameGetError.message?.data?.name === 'builtins.AttributeError' && errorMsg.includes('does not exist')) {
                            // This is the specific error: name_get doesn't exist. Use ID and previously read name (if any).
                            finalDisplayValue = [m2oId, currentNameFromRead || `(ID: ${m2oId} - N/A)`](m2oId, currentNameFromRead || `(ID: ${m2oId} - N/A)`);
                            console.log(`Method ${relatedModel}.name_get does not exist. Using ID or previously read name.`);
                        } else if (nameGetError.message?.data?.name?.includes('AccessError')) {
                            accessErrorOccurred = true;
                            finalDisplayValue = `(Access Denied to ${relatedModel})`;
                        } else {
                            // Other name_get error
                            finalDisplayValue = [m2oId, currentNameFromRead || `(ID: ${m2oId} - ${errorMsg.substring(0, 30)})`](m2oId, currentNameFromRead || `(ID: ${m2oId} - ${errorMsg.substring(0, 30)})`);
                        }
                    }
                } else if (accessErrorOccurred && !nameFoundByRead) {
                    // If an access error occurred during read attempts and no name was found
                    finalDisplayValue = `(Access Denied to ${relatedModel})`;
                } else if (!nameFoundByRead && !finalDisplayValue) {
                    // If no name was found by read, no name_get attempt, and no finalDisplayValue yet (e.g. m2oId existed but all reads failed silently)
                    finalDisplayValue = [m2oId, currentNameFromRead || `(ID: ${m2oId} - Name Unavailable)`](m2oId, currentNameFromRead || `(ID: ${m2oId} - Name Unavailable)`);
                }

            } // End if (m2oId)

            Object.assign(this.state.recordFields[fieldIndex], {
                value: finalDisplayValue, // This will be [id, name_string] or false or an error string
                isLoading: false,
                isLoaded: true,
                accessError: accessErrorOccurred, // Reflects if an access error was encountered
                status: ''
            });
            this.state.recordFields = [...this.state.recordFields];

        }

        async loadX2ManyCount(fieldKey) {
            const fieldIndex = this.state.recordFields.findIndex(f => f.key === fieldKey);
            if (fieldIndex === -1) {
                console.warn(`[SideBarDev loadX2ManyCount] Field ${fieldKey} not found in state.recordFields.`);
                return;
            }

            const fieldData = this.state.recordFields[fieldIndex];
            const def = fieldData.definition;
            const relatedModel = def.relation;

            // Log the definition fetched from fields_get
            console.log(`[SideBarDev loadX2ManyCount] Definition for field '${fieldKey}':`, JSON.parse(JSON.stringify(def)));
            // Log current fieldData state
            // console.log(`[SideBarDev loadX2ManyCount] Current fieldData for '${fieldKey}':`, JSON.parse(JSON.stringify(fieldData)));


            Object.assign(this.state.recordFields[fieldIndex], { isLoading: true, accessError: false, status: '(Loading count...)' });
            this.state.recordFields = [...this.state.recordFields]; // Trigger reactivity

            const currentRecordId = this.state.currentRecordId;
            const currentModel = this.state.currentModel;
            const userContext = this.env?.user?.context || {};

            console.log(`[SideBarDev loadX2ManyCount] Attempting to load count for field '${fieldKey}' (type: ${def.type}).`);
            console.log(`  - Current Record: ${currentModel} / ID: ${currentRecordId}`);
            console.log(`  - Related Model (for x2m): ${relatedModel}`);
            console.log(`  - User Context:`, JSON.parse(JSON.stringify(userContext)));


            try {
                let count = 0;

                if (def.type === 'one2many') {
                    const inverseField = def.relation_field || def.inverse_name;
                    console.log(`  - o2m: Using inverse field '${inverseField}' on related model '${relatedModel}'.`);

                    if (!inverseField) {
                        console.error(`[SideBarDev loadX2ManyCount] CRITICAL: Inverse field (relation_field or inverse_name) is missing for o2m field '${fieldKey}'. Cannot build domain. Definition:`, def);
                        throw new Error(`Inverse field not defined for o2m field '${fieldKey}'`);
                    }
                    if (currentRecordId === null || currentRecordId === undefined) {
                        console.error(`[SideBarDev loadX2ManyCount] CRITICAL: currentRecordId is null/undefined for o2m count. Field: ${fieldKey}`);
                        throw new Error(`Current record ID is missing for o2m count of '${fieldKey}'`);
                    }

                    const domain = [[inverseField, '=', currentRecordId]];
                    console.log(`  - o2m: Calling 'search_count' on '${relatedModel}' with domain:`, JSON.parse(JSON.stringify(domain)));

                    count = await this.orm.call(
                        relatedModel,
                        'search_count',
                        [domain],
                        { context: userContext }
                    );
                    console.log(`  - o2m: 'search_count' result for '${fieldKey}': ${count}`);

                } else if (def.type === 'many2many') {
                    console.log(`  - m2m: Reading field '${fieldKey}' from current model '${currentModel}' (ID: ${currentRecordId}).`);
                    const readResult = await this.orm.call(
                        currentModel,
                        'read',
                        [[currentRecordId]],
                        {
                            fields: [fieldKey],
                            context: userContext
                        }
                    );

                    if (readResult && readResult.length > 0 && readResult[0].hasOwnProperty(fieldKey)) {
                        const relatedIDs = readResult[0][fieldKey];
                        if (Array.isArray(relatedIDs)) {
                            count = relatedIDs.length;
                            console.log(`  - m2m: Field '${fieldKey}' has ${count} related IDs:`, JSON.parse(JSON.stringify(relatedIDs.slice(0, 5)))); // Log first 5
                        } else {
                            console.warn(`  - m2m: Field '${fieldKey}' on '${currentModel}' did not return an array. Value:`, relatedIDs);
                            count = 0;
                        }
                    } else {
                        console.warn(`  - m2m: Field '${fieldKey}' not found or empty in read result for ${currentModel}/${currentRecordId}. Result:`, readResult);
                        count = 0;
                    }
                } else {
                    console.warn(`[SideBarDev loadX2ManyCount] Field '${fieldKey}' is not of type one2many or many2many. Type: ${def.type}`);
                    throw new Error(`Cannot load count for field type '${def.type}'`);
                }

                Object.assign(this.state.recordFields[fieldIndex], { value: `${count} Records`, isLoading: false, isLoaded: true, accessError: false, status: '' });

            } catch (error) {
                console.error(`[SideBarDev loadX2ManyCount] Error loading count for x2m field '${fieldKey}':`, error);
                const errorMessage = error.message?.data?.message || error.message || 'Count Failed';
                Object.assign(this.state.recordFields[fieldIndex], { value: `(${errorMessage.split('\n')[0]})`, isLoading: false, isLoaded: true, accessError: true, status: '' });
                this.notification.add(`Failed to load count for '${def.string || fieldKey}': ${errorMessage}`, { type: 'danger' });
            } finally {
                this.state.recordFields = [...this.state.recordFields]; // Ensure reactivity
            }
        }

        startEdit(field) {
            this.state.editingFieldKey = field.key;
            let editVal = field.value;
            if (field.definition.type === 'many2one' && Array.isArray(field.value)) {
                editVal = field.value[0]; // Use ID for editing m2o
            } else if (field.definition.type === 'boolean') {
                editVal = Boolean(field.value);
            }
            this.state.editingFieldValue = editVal;

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
            const currentModel = this.state.currentModel;
            const currentRecordId = this.state.currentRecordId;

            if (fieldDef.required) {
                let isValueEffectivelyEmpty = (newValue === null || newValue === '' || newValue === false);
                if (fieldDef.type === 'boolean') isValueEffectivelyEmpty = false; // boolean 'false' is a valid value
                if (fieldDef.type === 'integer' || fieldDef.type === 'float' || fieldDef.type === 'monetary') {
                    if (newValue === 0) isValueEffectivelyEmpty = false;
                }
                if (isValueEffectivelyEmpty && !(fieldDef.type === 'many2one' && newValue === false)) {
                    this.notification.add(`Field "${fieldDef.string || fieldKey}" is required.`, { type: 'danger' });
                    return;
                }
            }

            try {
                if (fieldDef.type === 'integer') {
                    newValue = (newValue === '' || newValue === null) ? null : parseInt(newValue, 10);
                    if (isNaN(newValue) && newValue !== null) throw new Error("Invalid integer");
                } else if (fieldDef.type === 'float' || fieldDef.type === 'monetary') {
                    newValue = (newValue === '' || newValue === null) ? null : parseFloat(newValue);
                    if (isNaN(newValue) && newValue !== null) throw new Error("Invalid number");
                } else if (fieldDef.type === 'many2one') {
                    newValue = (newValue === '' || newValue === null || newValue === undefined) ? false : parseInt(newValue, 10);
                    if (isNaN(newValue) && newValue !== false) throw new Error("Invalid ID (must be integer or empty)");
                }
            } catch (parseError) {
                this.notification.add(`Invalid value for ${fieldDef.type} "${fieldKey}": ${parseError.message}`, { type: 'danger' });
                return;
            }

            this.state.isSavingEdit = true;
            try {
                await this.orm.call(currentModel, 'write', [[currentRecordId], { [fieldKey]: newValue }]);
                this.notification.add(`Field "${fieldDef.string || fieldKey}" saved.`, { type: 'success' });

                const fieldIndex = this.state.recordFields.findIndex(f => f.key === fieldKey);
                if (fieldIndex > -1) {
                    if (fieldDef.type === 'many2one') {
                        // After saving an ID, we need to reload its name for display
                        this.state.recordFields[fieldIndex].value = newValue; // Store the ID or false
                        this.state.recordFields[fieldIndex].isLoaded = false; // Mark as not loaded to trigger name_get
                        this.state.recordFields[fieldIndex].accessError = false;
                        await this.loadMany2oneName(fieldKey); // This will update isLoaded and value again
                    } else {
                        this.state.recordFields[fieldIndex].value = newValue;
                        this.state.recordFields[fieldIndex].isLoaded = true;
                        this.state.recordFields[fieldIndex].accessError = false;
                    }
                    this.state.recordFields = [...this.state.recordFields];
                }
                this.cancelEdit();
            } catch (error) {
                const errorMessage = error.data?.message || error.message?.data?.message || error.message || "Unknown error";
                this.notification.add(`Error saving "${fieldKey}": ${errorMessage}`, { type: 'danger', sticky: true });
            } finally {
                this.state.isSavingEdit = false;
            }
        }

        async getReports() {
            this.state.recordFields = []; // Clear fields when switching to reports
            this.state.reports = [];
            this.state.showRunModelMethod = false;
            this.state.showingX2ManyListFor = null;


            const model = this.state.currentModel;
            const recordId = this.state.currentRecordId;
            if (!model || recordId === null) {
                this.notification.add("No active record to get reports for.", { type: 'warning' });
                return;
            }
            try {
                const reportsData = await this.orm.call('ir.actions.report', 'search_read', [], {
                    domain: [['model', '=', model]], fields: ['name', 'report_name', 'report_type'],
                });
                this.state.reports = reportsData.map(report => ({
                    ...report, url: `/report/pdf/${report.report_name}/${recordId}`
                }));
                if (!reportsData.length) this.notification.add("No reports found for this model.", { type: 'info' });
            } catch (error) {
                this.notification.add("Failed to fetch reports.", { type: 'danger' });
            }
        }

        closeSideBar() {
            this.state.isVisible = false;
            // Optionally preserve state or clear it:
            // this.clearOutput(false); // This would reset everything
        }

        openSideBar() {
            this.state.isVisible = true;
            // useEffect will handle loading data if necessary when isVisible becomes true
            // and the sidebar is at its root state.
            // If sidebar is opened and already has a navigation context, it should just display that.
            if (this.state.navigationStack.length === 0 && !this.state.showingX2ManyListFor) {
                if (this.state.currentModel && this.state.currentRecordId !== null && this.state.recordFields.length === 0 && !this.state.showRunModelMethod) {
                    console.log("[SideBarDev openSideBar] Opening, no field data, calling getRecordValues");
                    this.getRecordValues(); // Load fields if this "tab" should be active
                } else if (this.state.showRunModelMethod && !this.state.modelMethodPreview) {
                    this.updateModelMethodPreview(); // Update preview if method tab is active
                }
            }
        }

        toggleSideBar() {
            this.state.isVisible = !this.state.isVisible;
            if (this.state.isVisible) {
                this.openSideBar();
            } else {
                this.closeSideBar();
            }
        }

        getDisplayValue(field) {
            if (field.accessError) return field.value; // Show error message
            if (field.isLoading && !field.isLoaded) return '(Loading...)';
            // For fields like M2O or X2M, if !isLoaded but status is present, show status
            if (!field.isLoaded && field.status && (field.definition.type === 'many2one' || ['one2many', 'many2many'].includes(field.definition.type))) {
                return field.status;
            }
            if (!field.isLoaded && field.definition.type !== 'binary' && !field.definition.related) {
                return field.status || '(Not loaded)';
            }

            const value = field.value;
            const def = field.definition;

            if (value === false && def.type !== 'boolean') return '(empty)';
            if (value === null || value === undefined) {
                if (['many2one', 'one2many', 'many2many'].includes(def.type)) return '(empty)';
                return ''; // Empty string for other types
            }

            if (def.type === 'many2one') {
                if (Array.isArray(value) && typeof value[0] === 'number') { // We have [id, name]
                    return { type: 'many2one', id: value[0], name: value[1] || `(ID: ${value[0]})`, model: def.relation };
                } else if (typeof value === 'number') { // Only ID is present, name not loaded yet
                    return { type: 'many2one', id: value, name: `(ID: ${value} - Click 🔄)`, model: def.relation };
                } else if (value === false) {
                    return '(empty)';
                }
                // If value is something else (e.g. error string), just return it
                return String(value);
            }
            if (['one2many', 'many2many'].includes(def.type)) {
                return { type: 'x2many', countDisplay: String(value || field.status || '(empty)'), fieldKey: field.key, fieldDefinition: def };
            }
            if (def.type === 'boolean') return value ? '✔️' : '❌';
            if (def.type === 'selection' && def.selection) {
                const match = def.selection.find(s => s[0] === value);
                return match ? match[1] : String(value);
            }
            if (def.type === 'binary' && def.related) return '(Related Binary)';
            if (def.type === 'binary') return '(Binary Data)';

            return String(value);
        }

        runModelMethodOpt() {
            this.state.recordFields = [];
            this.state.reports = [];
            this.state.showingX2ManyListFor = null;
            this.state.isLoadingFields = false; // Stop any field loading

            this.state.showRunModelMethod = true;
            this.loadRunMethodHistory();
            this.updateModelMethodPreview();
            requestAnimationFrame(() => {
                if (this.methodNameInput.el) this.methodNameInput.el.focus();
            });
        }

        updateModelMethodPreview() {
            if (!this.state.showRunModelMethod) return;

            const model = this.state.currentModel || 'your.model';
            const method = this.state.modelMethodName.trim() || 'your_method';
            const recordId = this.state.currentRecordId;
            let argsString = this.state.modelMethodArgs.trim();
            let kwargsString = this.state.modelMethodKwargs.trim();

            try { argsString = JSON.stringify(JSON.parse(argsString || '[]'), null, 2); } catch (e) { /* use original */ }
            try { kwargsString = JSON.stringify(JSON.parse(kwargsString || '{}'), null, 2); } catch (e) { /* use original */ }

            let finalArgsArrayString = argsString; // Default to user-provided args
            if (recordId !== null && recordId !== undefined) {
                try {
                    // Parse the raw input string for user arguments
                    const userArgs = JSON.parse(this.state.modelMethodArgs.trim() || '[]');
                    if (!Array.isArray(userArgs)) throw new Error("User args not an array");
                    finalArgsArrayString = JSON.stringify([[recordId], ...userArgs], null, 2);
                } catch (e) {
                    finalArgsArrayString = `[[${recordId}] /* , ... (Error parsing user args: ${e.message}) */ ]`;
                }
            }

            this.state.modelMethodPreview =
                `await this.env.services.orm.call(
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
                .catch(err => this.notification.add("Failed to copy preview.", { type: "danger" }));
        }

        async runModelMethod() {
            const methodName = this.state.modelMethodName.trim();
            const model = this.state.currentModel;
            const recordId = this.state.currentRecordId;
            const rawArgsString = this.state.modelMethodArgs.trim();
            const rawKwargsString = this.state.modelMethodKwargs.trim();

            if (!methodName) {
                this.notification.add("Method name is required.", { type: 'warning' }); return;
            }
            // Allow calls on model without ID (e.g. create, search)
            if (!model && recordId !== null) { // if ID exists, model must too
                this.notification.add("Current model is not available with a record ID.", { type: 'warning' }); return;
            } else if (!model && recordId === null) {
                // This is okay for model-level methods like search, name_search, create
            }


            let args = []; let kwargs = {};
            try {
                if (rawArgsString) args = JSON.parse(rawArgsString);
                if (!Array.isArray(args)) throw new Error("Positional arguments must be a JSON array.");
            } catch (e) {
                this.state.modelMethodOutput = `Invalid JSON for positional arguments: ${e.message}`;
                this.state.modelMethodOutputIsError = true; return;
            }
            try {
                if (rawKwargsString) kwargs = JSON.parse(rawKwargsString);
                if (typeof kwargs !== "object" || Array.isArray(kwargs)) throw new Error("Keyword arguments must be a JSON object.");
            } catch (e) {
                this.state.modelMethodOutput = `Invalid JSON for keyword arguments: ${e.message}`;
                this.state.modelMethodOutputIsError = true; return;
            }

            if (model && methodName) this.addToRunMethodHistory(model, methodName, rawArgsString, rawKwargsString);

            const callArgs = (recordId !== null && recordId !== undefined) ? [[recordId], ...args] : [...args];

            this.state.isModelMethodRunning = true;
            this.state.modelMethodOutput = null;
            this.state.modelMethodOutputIsError = false;

            try {
                const result = await this.orm.call(model, methodName, callArgs, kwargs);
                this.state.modelMethodOutput = JSON.stringify(result, null, 2);
                this.notification.add(`Method ${methodName} executed.`, { type: 'success' });
            } catch (error) {
                let errorObj = error.message && error.message.data ? error.message.data : { name: error.name, message: error.message, stack: error.stack };
                this.state.modelMethodOutput = JSON.stringify(errorObj, Object.getOwnPropertyNames(errorObj), 2);
                this.state.modelMethodOutputIsError = true;
                this.notification.add(`Error executing method: ${errorObj.message || 'Unknown error'}`, { type: 'danger', sticky: true });
            } finally {
                this.state.isModelMethodRunning = false;
            }
        }

        async showX2ManyRecords(fieldKey, fieldDefinition) {
            if (!this.state.currentModel || this.state.currentRecordId === null) return;

            // Clear other "tabs"
            this.state.recordFields = [];
            this.state.reports = [];
            this.state.showRunModelMethod = false;
            this.state.isLoadingFields = false;

            this.state.showingX2ManyListFor = {
                parentModel: this.state.currentModel,
                parentId: this.state.currentRecordId,
                fieldKey: fieldKey,
                fieldDefinition: fieldDefinition,
            };
            this.state.x2manyRecords = [];
            this.state.isLoadingX2Many = true;

            try {
                const relatedModel = fieldDefinition.relation;
                const parentData = await this.orm.call(this.state.currentModel, "read", [[this.state.currentRecordId]], { fields: [fieldKey] });
                const relatedIDs = (parentData && parentData[0] && parentData[0][fieldKey]) ? parentData[0][fieldKey] : [];

                if (relatedIDs.length > 0) {
                    const recordsData = await this.orm.call(relatedModel, "search_read", [[['id', 'in', relatedIDs]]], { fields: ['id', 'display_name'], limit: 50 });
                    this.state.x2manyRecords = recordsData;
                } else {
                    this.notification.add(`No records found for ${fieldDefinition.string || fieldKey}.`, { type: "info" });
                }
            } catch (error) {
                this.notification.add(`Failed to load records for ${fieldKey}: ${error.message?.data?.message || error.message}`, { type: "danger" });
            } finally {
                this.state.isLoadingX2Many = false;
            }
        }

        navigateToRelatedRecord(relatedModel, relatedId, originFieldKey) {
            this.state.navigationStack.push({
                resModel: this.state.currentModel,
                resId: this.state.currentRecordId,
                isFormView: this.state.isFormView,
                showingX2ManyListFor: this.state.showingX2ManyListFor ? { ...this.state.showingX2ManyListFor } : null,
                x2manyRecords: this.state.showingX2ManyListFor ? [...this.state.x2manyRecords] : [],
                recordFields: !this.state.showingX2ManyListFor ? [...this.state.recordFields] : [], // Save fields if coming from field view
                fieldDefinitions: !this.state.showingX2ManyListFor ? { ...this.state.fieldDefinitions } : {},
            });

            this.state.showingX2ManyListFor = null; // Navigating away from x2m list (if we were on one)
            this.state.x2manyRecords = [];
            this.state.currentModel = relatedModel;
            this.state.currentRecordId = relatedId;
            this.state.isFormView = true; // Treat as a form view within sidebar

            this.getRecordValues(); // This will load fields for the new (related) record
        }

        clearX2ManyView() { // "Back to Parent Fields" button
            if (this.state.showingX2ManyListFor) {
                // currentModel/Id are already the parent's.
                this.state.showingX2ManyListFor = null;
                this.state.x2manyRecords = [];
                this.state.isLoadingX2Many = false;
                this.getRecordValues(); // Reload parent's fields
            }
        }

        navigateBack() { // General "Back" button using the stack
            if (this.state.navigationStack.length > 0) {
                console.log(`[SideBarDev navigateBack] Navigation stack has ${this.state.navigationStack.length} entries.`);
                const previousContext = this.state.navigationStack.pop();

                this.state.currentModel = previousContext.resModel;
                this.state.currentRecordId = previousContext.resId;
                this.state.isFormView = previousContext.isFormView;

                // Clear current views before restoring
                this.state.recordFields = [];
                this.state.reports = [];
                this.state.showRunModelMethod = false;
                this.state.isLoadingFields = false;
                this.state.showingX2ManyListFor = null;
                this.state.x2manyRecords = [];

                // Si antes estábamos en un x2many list view, restauramos ese contexto
                if (previousContext.showingX2ManyListFor) { // Restoring an x2many list view
                    this.state.showingX2ManyListFor = previousContext.showingX2ManyListFor;
                    this.state.x2manyRecords = previousContext.x2manyRecords;
                    this.state.isLoadingX2Many = false;
                } else { 
                    console.log(`[SideBarDev navigateBack] Restoring to record fields view for ${this.state.currentModel}/${this.state.currentRecordId}. Calling getRecordValues.`);
                    // Si no estábamos en un x2many list view, restauramos los campos del formulario
                    this.state.recordFields = previousContext.recordFields;
                    this.state.fieldDefinitions = previousContext.fieldDefinitions;
                    // If fields were not saved or empty, reload (though typically they should be saved)
                    if (!this.state.recordFields || this.state.recordFields.length === 0) {
                        this.getRecordValues();
                    }
                }
            } else {
                // At stack bottom, try to revert to main form context if different
                const mainFormCtx = this.activeRecordService.getMainFormContext();
                if (mainFormCtx && (this.state.currentModel !== mainFormCtx.resModel || this.state.currentRecordId !== mainFormCtx.resId)) {
                    this.revertToMainFormContext();
                }
            }
        }
    }

    SideBarDev.template = "odoo_dev.SideBar";
    SideBarDev.components = { FieldXpath };

    registry.category("main_components").add("SideBarDev", {
        Component: SideBarDev,
    });

    return SideBarDev;
});