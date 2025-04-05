odoo.define('odoo_dev.components.sidebar_dev', ['@odoo/owl', '@web/core/utils/hooks', 'odoo_dev.components.field_xpath'], function (require) {
    const { Component, useState, useRef, onWillUpdateProps, onMounted, onPatched } = require('@odoo/owl');
    const { useService } = require("@web/core/utils/hooks");
    const { FieldXpath } = require('odoo_dev.components.field_xpath');

    // Constantes para el historial
    const RUN_METHOD_HISTORY_KEY = 'odooDevRunMethodHistory';
    const MAX_HISTORY_SIZE = 10; // Guardar los últimos 10

    class SideBarDev extends Component {
        setup() {
            this.orm = useService('orm');
            this.notification = useService("notification");

            this.state = useState({
                recordFields: [],
                fieldDefinitions: {},
                isVisible: false,
                reports: [],
                record: null,

                // Edición de campos
                editingFieldKey: null, // <-- clave del campo en edición
                editingFieldValue: null, // <-- valor temporal en edición
                isSavingEdit: false, // <-- para deshabilitar botón Guardar

                // Ejecutar método del modelo
                showRunModelMethod: false,
                modelMethodName: '', // <-- Para t-model del input nombre
                modelMethodArgs: '[]', // <-- Para t-model del input args (default: array vacío)
                modelMethodKwargs: '{}', // <-- Para t-model del input kwargs (default: objeto vacío)
                modelMethodOutput: null,
                modelMethodOutputIsError: false, // <-- para estilizar error
                modelMethodPreview: '', // <-- Vista previa de la llamada
                isModelMethodRunning: false, // <-- Indicador de carga
                runMethodHistory: [], // <-- Estado para el historial
                focusRunButtonAfterPatch: false, // estado para controlar el enfoque
            });

            // Referencias a los inputs y elementos del DOM
            this.methodNameInput = useRef('methodNameInput');
            this.methodArgsInput = useRef('methodArgsInput');
            this.methodKwargsInput = useRef('methodKwargsInput');
            this.editInputRef = useRef('editInput');
            this.outputPreRef = useRef('outputPre'); // Ref para el bloque de salida
            this.historyListRef = useRef('historyList'); // Ref para la lista de historial

            this.database = window.odoo.info.db;
            this.currentModel = this.props.record.resModel;
            this.currentRecordId = this.props.record.resId;

            /* Enlazamos métodos */
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

            // Recargar valores si el recordId cambia
            onWillUpdateProps((nextProps) => {
                const nextRecordId = nextProps.record ? nextProps.record.resId : null;
                if (this.currentRecordId !== nextRecordId && this.state.isVisible) {
                    console.log("Record ID changed, reloading sidebar data...");
                    this.currentRecordId = nextRecordId;
                    this.currentModel = nextProps.record ? nextProps.record.resModel : 'N/A';
                    // Recarga los datos si el sidebar está visible y el ID cambió
                    this.getRecordValues(); // O la función que cargue los datos necesarios

                    if (this.state.showRunModelMethod) {
                        this.updateModelMethodPreview(); // Actualizar preview si cambia el contexto
                    }
                } else if (nextProps.record && this.currentModel !== nextProps.record.resModel) {
                    // Si cambia el modelo, también recargar
                    this.currentRecordId = nextRecordId;
                    this.currentModel = nextProps.record.resModel;
                    this.getRecordValues();

                    if (this.state.showRunModelMethod) {
                        this.updateModelMethodPreview(); // Actualizar preview si cambia el contexto
                    }
                }
            });

            // Actualizar vista previa cuando se monta o parchea si la sección está visible
            const updatePreviewIfNeeded = () => {
                if (this.state.showRunModelMethod) {
                    this.updateModelMethodPreview();
                }
            };

            // Cargar historial cuando el componente se monta
            onMounted(() => {
                this.loadRunMethodHistory();
                // Actualizar preview si ya está visible la sección
                if (this.state.showRunModelMethod) {
                    this.updateModelMethodPreview();
                }
            });
            onPatched(() => {
                updatePreviewIfNeeded(); // Actualizar preview si es necesario

                // *** AQUÍ: Enfocar el botón si se aplicó historial ***
                if (this.state.focusRunButtonAfterPatch && this.el) { // Asegurarse de que this.el existe
                    const runButton = this.el.querySelector('.dev-sidebar-btn-run-method');
                    if (runButton) {
                        runButton.focus();
                        console.log("Focused Run button after applying history.");
                    } else {
                        console.warn("Run button not found in DOM during onPatched.");
                    }
                    // Resetear el estado después de intentar enfocar
                    this.state.focusRunButtonAfterPatch = false;
                }
            });
        }

        async loadRunMethodHistory() {
            try {
                const result = await new Promise((resolve, reject) => {
                    chrome.storage.local.get([RUN_METHOD_HISTORY_KEY], (data) => {
                        if (chrome.runtime.lastError) {
                            return reject(chrome.runtime.lastError);
                        }
                        resolve(data);
                    });
                });

                if (result[RUN_METHOD_HISTORY_KEY] && Array.isArray(result[RUN_METHOD_HISTORY_KEY])) {
                    this.state.runMethodHistory = result[RUN_METHOD_HISTORY_KEY];
                    console.log("Run method history loaded:", this.state.runMethodHistory);
                } else {
                    this.state.runMethodHistory = []; // Asegurar que sea un array vacío si no existe o es inválido
                }
            } catch (error) {
                console.error("Error loading run method history:", error);
                this.state.runMethodHistory = []; // Resetear en caso de error
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
                // console.log("Run method history saved.");
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
                // Añadir un timestamp para posible ordenación o limpieza futura
                timestamp: Date.now()
            };

            // Evitar duplicados exactos consecutivos en la cima
            if (this.state.runMethodHistory.length > 0) {
                const lastEntry = this.state.runMethodHistory[0];
                if (lastEntry.model === newEntry.model &&
                    lastEntry.method === newEntry.method &&
                    lastEntry.args === newEntry.args &&
                    lastEntry.kwargs === newEntry.kwargs) {
                    // console.log("Skipping duplicate history entry.");
                    return; // No añadir si es idéntico al último
                }
            }

            // Añadir al principio y limitar tamaño
            const updatedHistory = [newEntry, ...this.state.runMethodHistory].slice(0, MAX_HISTORY_SIZE);

            this.state.runMethodHistory = updatedHistory;
            this.saveRunMethodHistory(updatedHistory); // Guardar en storage
        }

        applyHistoryItem(historyItem) {
            const self = this;
            console.log("this", this);
            if (!historyItem) return;
            this.state.modelMethodName = historyItem.method;
            this.state.modelMethodArgs = historyItem.args;
            this.state.modelMethodKwargs = historyItem.kwargs;
            this.updateModelMethodPreview(); // Actualizar la vista previa
            this.notification.add("Inputs populated from history.", { type: 'info' });
            this.state.focusRunButtonAfterPatch = true;
            // Enfocar el botón Run después de aplicar
            // requestAnimationFrame(() => {
            //     const runButton = self.el.querySelector('.dev-sidebar-btn-run-method');
            //     if (runButton) runButton.focus();
            // });
        }

        clearRunMethodHistory() {
            this.state.runMethodHistory = [];
            this.saveRunMethodHistory([]); // Guardar el array vacío
            this.notification.add("Run method history cleared.", { type: 'success' });
        }

        clearOutput(keepVisibility = false) {
            this.state.recordFields = [];
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
            }
        }

        async getRecordValues() {
            this.clearOutput(true); // Limpia datos pero mantiene sidebar abierto
            const record = this.props.record;
            this.currentModel = record ? record.resModel : 'N/A'; // Actualiza modelo por si acaso
            this.currentRecordId = record ? record.resId : null; // Actualiza ID

            if (!record || !record.resId || !record.resModel) {
                console.warn("Cannot get record values: No valid record or record ID.");
                this.state.recordFields = [];
                this.state.fieldDefinitions = {};
                return;
            }

            try {
                console.log(`Fetching data for ${record.resModel} ID ${record.resId}`);
                // Pedir valores y definiciones de campos relevantes
                const [readResult, fieldsData] = await Promise.all([
                    this.orm.call(record.resModel, 'read', [[record.resId]], {}),
                    this.orm.call(record.resModel, 'fields_get', [[]], {
                        attributes: ['string', 'type', 'readonly', 'relation', 'selection', 'required']
                    })
                ]);

                if (readResult.length > 0) {
                    this.state.record = readResult[0]; // Guarda el record leído
                    this.state.fieldDefinitions = fieldsData; // Guarda definiciones

                    const fieldsToShow = [];
                    // Iterar sobre las definiciones para mantener un orden (opcional)
                    // o iterar sobre readResult[0] para mostrar solo campos con valor
                    for (const key in fieldsData) {
                        // Mostrar solo si el campo existe en el resultado de read y no es one2many/many2many (simplificación)
                        if (readResult[0].hasOwnProperty(key) && !['one2many', 'many2many'].includes(fieldsData[key].type)) {
                            // Excluir campos binarios grandes por defecto?
                            if (fieldsData[key].type === 'binary' && readResult[0][key] && readResult[0][key].length > 1000) {
                                continue; // Opcional: Omitir binarios grandes
                            }

                            fieldsToShow.push({
                                key: key,
                                value: readResult[0][key],
                                definition: fieldsData[key] // Adjuntar la definición completa
                            });
                        }
                    }
                    // Opcional: Ordenar por nombre de campo
                    fieldsToShow.sort((a, b) => a.key.localeCompare(b.key));

                    this.state.recordFields = fieldsToShow;
                    console.log("Record fields loaded:", this.state.recordFields);
                } else {
                    console.warn("Read operation returned no results.");
                    this.state.recordFields = [];
                    this.state.fieldDefinitions = {};
                }
            } catch (error) {
                console.error("Error fetching record data or fields:", error);
                this.notification.add("Error fetching record data.", { type: 'danger' });
                this.state.recordFields = [];
                this.state.fieldDefinitions = {};
            }
        }

        startEdit(field) {
            // if (field.definition.readonly) {
            //     this.notification.add(`Field "${field.key}" is readonly.`, { type: 'warning' });
            //     return;
            // }
            console.log("Starting edit for:", field.key, "Current value:", field.value);
            this.state.editingFieldKey = field.key;
            // Ajustar valor inicial para ciertos tipos
            if (field.definition.type === 'many2one' && Array.isArray(field.value)) {
                this.state.editingFieldValue = field.value[0]; // Usar solo el ID para m2o
            } else if (field.definition.type === 'boolean') {
                this.state.editingFieldValue = Boolean(field.value); // Asegurar booleano
            } else {
                this.state.editingFieldValue = field.value;
            }

            // Enfocar el input después de que se renderice (puede necesitar un pequeño delay)
            requestAnimationFrame(() => {
                if (this.editInputRef.el) {
                    this.editInputRef.el.focus();
                    // Seleccionar texto si es input de texto/número
                    if (['text', 'number'].includes(this.editInputRef.el.type)) {
                        this.editInputRef.el.select();
                    }
                }
            });
        }

        cancelEdit() {
            this.state.editingFieldKey = null;
            this.state.editingFieldValue = null;
            this.state.isSavingEdit = false; // Asegurar que no quede bloqueado
        }

        async saveEdit() {
            if (!this.state.editingFieldKey || this.state.isSavingEdit) return;

            const fieldKey = this.state.editingFieldKey;
            const fieldDef = this.state.fieldDefinitions[fieldKey];
            let newValue = this.state.editingFieldValue; // El valor está vinculado con t-model

            // Validaciones y parseo antes de guardar
            if (fieldDef.required && (newValue === null || newValue === undefined || newValue === '' || newValue === false)) {
                // Para booleanos, `false` es un valor válido, así que la comprobación es más simple
                if (fieldDef.type !== 'boolean' && !newValue) {
                    this.notification.add(`Field "${fieldKey}" is required.`, { type: 'danger' });
                    return;
                }
            }

            // Convertir tipos si es necesario (el input number devuelve string a veces)
            try {
                if (fieldDef.type === 'integer') {
                    newValue = newValue === '' || newValue === null ? null : parseInt(newValue, 10);
                    if (isNaN(newValue) && newValue !== null) throw new Error("Invalid integer");
                } else if (fieldDef.type === 'float' || fieldDef.type === 'monetary') {
                    newValue = newValue === '' || newValue === null ? null : parseFloat(newValue);
                    if (isNaN(newValue) && newValue !== null) throw new Error("Invalid number");
                } else if (fieldDef.type === 'many2one') {
                    // Si se edita como ID
                    newValue = newValue === '' || newValue === null ? false : parseInt(newValue, 10); // Odoo espera false para limpiar m2o
                    if (isNaN(newValue) && newValue !== false) throw new Error("Invalid ID for Many2one");
                }
                // Booleano ya debería estar correcto por el input checkbox y t-model
                // Fecha/Datetime requerirían parseo si no usan input nativo type=date/datetime-local
            } catch (parseError) {
                console.error("Parsing error:", parseError);
                this.notification.add(`Invalid value format for ${fieldDef.type} field "${fieldKey}".`, { type: 'danger' });
                return;
            }


            console.log(`Attempting to save ${fieldKey} with new value:`, newValue);
            this.state.isSavingEdit = true; // Bloquear botón

            try {
                await this.orm.call(this.currentModel, 'write', [[this.currentRecordId], {
                    [fieldKey]: newValue
                }]);

                console.log(`Field ${fieldKey} saved successfully.`);
                this.notification.add(`Field "${fieldKey}" saved.`, { type: 'success' });

                // Actualizar el valor en el estado local para reflejar el cambio
                const fieldIndex = this.state.recordFields.findIndex(f => f.key === fieldKey);
                if (fieldIndex > -1) {
                    // Odoo 'write' no devuelve el valor actualizado directamente.
                    // Opcional: Podríamos hacer un 'read' para obtener el valor formateado (ej. m2o nombre)
                    // Por simplicidad, actualizamos con el valor que enviamos (puede diferir en formato m2o)
                    if (fieldDef.type === 'many2one' && newValue !== false) {
                        // Si es m2o y guardamos un ID, idealmente necesitaríamos leer el name_get
                        // Simulación simple: mostramos el ID por ahora
                        // Para una mejor UX, haríamos un read [fieldKey] después del write
                        this.state.recordFields[fieldIndex].value = [newValue, `ID: ${newValue}`]; // Valor simulado
                    } else {
                        this.state.recordFields[fieldIndex].value = newValue;
                    }
                }

                this.cancelEdit(); // Salir del modo edición

                // TODO: Notificar al FormView principal para que se recargue (más avanzado)


            } catch (error) {
                console.error("Error saving field:", error);
                const errorMessage = error.data?.message || error.message || "Unknown error";
                this.notification.add(`Error saving "${fieldKey}": ${errorMessage}`, { type: 'danger', sticky: true });
                this.state.isSavingEdit = false; // Desbloquear botón en caso de error
            } finally {
                // Asegurar desbloqueo aunque algo raro pase
                // this.state.isSavingEdit = false; // Ya se hace en cancel y error
            }
        }

        async getReports() {
            this.clearOutput(true);
            const model = this.props.record.resModel;

            try {
                const action = await this.orm.call(
                    'ir.actions.report',
                    'search_read',
                    [],
                    {
                        domain: [['model', '=', model]],
                        fields: ['name', 'model', 'report_name', 'report_type'],
                        limit: 10
                    }
                );

                for (const report of action) {
                    report.url = `/report/pdf/${report.report_name}/${this.props.record.resId}`;
                    this.state.reports.push(report);
                }
            } catch (error) {
                console.error("Error fetching reports", error);
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
                this.getRecordValues(); // Cargar datos si se abre
            } else {
                this.clearOutput(); // Limpiar si se cierra
            }
        }

        // Helper para formatear valor mostrado (opcional pero útil)
        getDisplayValue(field) {
            if (field.value === false && field.definition.type !== 'boolean') return ''; // Mostrar vacío para False excepto booleanos
            if (field.value === null || field.value === undefined) return '';
            if (field.definition.type === 'many2one' && Array.isArray(field.value)) {
                return field.value[1] || `ID: ${field.value[0]}`; // Mostrar nombre o ID
            }
            if (field.definition.type === 'boolean') {
                return field.value ? '✔️' : '❌'; // O 'True' / 'False'
            }
            if (field.definition.type === 'selection' && field.definition.selection) {
                const match = field.definition.selection.find(opt => opt[0] === field.value);
                return match ? match[1] : field.value; // Mostrar label de selección
            }
            // Añadir formato para fecha/hora si es necesario
            // if (field.definition.type === 'date') { ... }
            return String(field.value);
        }

        runModelMethodOpt() {
            this.clearOutput(true); // Limpia otras secciones
            this.state.showRunModelMethod = true;
            this.loadRunMethodHistory(); 
            this.updateModelMethodPreview(); // Generar preview inicial
            // Enfocar el primer input
            requestAnimationFrame(() => {
                if (this.methodNameInput.el) this.methodNameInput.el.focus();
            });
        }

        // Genera la cadena de vista previa
        updateModelMethodPreview() {
            const model = this.currentModel || 'your.model';
            const method = this.state.modelMethodName.trim() || 'your_method';
            const recordId = this.currentRecordId; // Puede ser null si no hay registro
            let argsString = this.state.modelMethodArgs.trim();
            let kwargsString = this.state.modelMethodKwargs.trim();

            // Intenta formatear JSON para legibilidad, si no, usa el string tal cual
            try { argsString = JSON.stringify(JSON.parse(argsString || '[]'), null, 2); } catch (e) { /* usa el string original */ }
            try { kwargsString = JSON.stringify(JSON.parse(kwargsString || '{}'), null, 2); } catch (e) { /* usa el string original */ }

            // Construye los argumentos para orm.call
            // El primer argumento siempre debe ser la lista de IDs (o un array vacío)
            let finalArgsArrayString = '[]'; // Default si no hay ID
            if (recordId !== null && recordId !== undefined) {
                // Si hay ID, los args del usuario van *después* del array de IDs
                try {
                    const userArgs = JSON.parse(argsString || '[]');
                    if (!Array.isArray(userArgs)) throw new Error("Args not an array");
                    finalArgsArrayString = JSON.stringify([[recordId], ...userArgs], null, 2);
                } catch (e) {
                    // Si los args del usuario son inválidos, mostramos un placeholder
                    finalArgsArrayString = `[[${recordId}], /* Invalid user args format */]`;
                }
            } else {
                // Si no hay ID, los args del usuario son los args principales
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

        // Copia la vista previa al portapapeles
        copyModelMethodPreview() {
            if (!this.state.modelMethodPreview) return;
            navigator.clipboard.writeText(this.state.modelMethodPreview.trim())
                .then(() => {
                    this.notification.add("ORM call preview copied!", { type: "success" });
                })
                .catch(err => {
                    console.error('Error copying text: ', err);
                    this.notification.add("Failed to copy preview.", { type: "danger" });
                });
        }


        async runModelMethod() {
            const methodName = this.state.modelMethodName.trim();
            const model = this.currentModel;
            const recordId = this.currentRecordId;
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
            // No requerimos ID aquí, puede ser una llamada sin IDs

            let args = [];
            let kwargs = {};

            // Parsear args
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

            // Parsear kwargs
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

            if (model && methodName) { // Solo añadir si hay modelo y método
                this.addToRunMethodHistory(model, methodName, argsString, kwargsString);
           }

            // Construir argumentos finales para orm.call
            // El primer argumento es SIEMPRE la lista de IDs (puede estar vacía)
            const callArgs = (recordId !== null && recordId !== undefined) ? [[recordId], ...args] : [...args]; // Si no hay ID, los args del usuario son los principales


            console.log(`Calling ${model}.${methodName} with args:`, callArgs, "kwargs:", kwargs);
            this.state.isModelMethodRunning = true; // Iniciar carga
            this.state.modelMethodOutput = null; // Limpiar salida anterior
            this.state.modelMethodOutputIsError = false;

            try {
                const result = await this.orm.call(model, methodName, callArgs, kwargs);
                // Formatear salida JSON bonita
                this.state.modelMethodOutput = JSON.stringify(result, null, 2); // Indentación de 2 espacios
                this.state.modelMethodOutputIsError = false;
                console.log("Method result:", result);
                // Aplicar resaltado si se usa una librería y la ref existe
                // if (this.outputPreRef.el) { /* ... código de resaltado ... */ }

            } catch (error) {
                console.error("Error calling model method:", error);
                // Formatear error bonito
                let errorObj = error;
                // Intentar extraer info útil del error de Odoo
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
                this.state.isModelMethodRunning = false; // Terminar carga
            }
        }
    }

    SideBarDev.template = "odoo_dev.SideBar"; // Asegúrate de que este template exista
    SideBarDev.components = { FieldXpath }; // Exporta los componentes
    return SideBarDev;
});