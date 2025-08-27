odoo.define('odoo_dev.components.field_xpath', ['@odoo/owl', '@web/core/utils/hooks'], function (require) {
    const { Component, useState, useRef } = require('@odoo/owl');
    const { useService } = require("@web/core/utils/hooks");

    class FieldXpath extends Component {
        setup() {
            this.orm = useService('orm');
            this.popover = useService('popover');
            this.notification = useService('notification');

            this.state = useState({
                foundViews: [], // <--  Almacena { viewName, viewXmlId, xpath }
                showPopover: false, // <-- Controla visibilidad (manejado por popover service)
                isLoading: false, // <-- Indicador de carga
            });

            this.popoverCloseFn = null; // Para guardar la función de cierre del popover
            this.triggerElementRef = useRef("xpathTrigger"); // Ref para el botón que abre el popover
        }

        generateXpath(node) {
            const path = [];
            while (node && node.nodeType === 1) {
                let selector = node.nodeName.toLowerCase();
                if (node.id) {
                    selector += `[@id="${node.id}"]`;
                    path.unshift(selector);
                    break;
                } else {
                    let sibling = node;
                    let index = 1;
                    while (sibling.previousElementSibling) {
                        sibling = sibling.previousElementSibling;
                        index++;
                    }
                    if (index > 1) {
                        selector += `[${index}]`;
                    }
                }
                path.unshift(selector);
                node = node.parentElement;
            }

            return path.length ? `/${path.join('/')}` : null;
        }

        async findAndShowViews() {
            if (this.state.isLoading) return;

            // Cerrar popover anterior si existe
            if (this.popoverCloseFn) {
                this.popoverCloseFn();
                this.popoverCloseFn = null;
            }

            this.state.isLoading = true;
            this.state.foundViews = []; // Resetear vistas encontradas
            const resModel = this.props.model;
            const fieldName = this.props.fieldName;
            console.log("FieldXpath: field", fieldName);

            if (!fieldName || !resModel) {
                console.warn("FieldXpath: fieldName or resModel missing.");
                this.state.isLoading = false;
                return;
            }

            try {
                const viewsData = await this.orm.call(
                    'ir.ui.view',
                    'search_read',
                    [
                        [['model', '=', resModel], ['type', '=', 'form'], ['arch_db', 'ilike', `name="${fieldName}"`]] // Pre-filtrar un poco en servidor
                    ],
                    {
                        fields: ['id', 'name', 'arch_db', 'xml_id'], // Usar arch_db que es el XML crudo
                        limit: 50, // Limitar por si acaso
                    }
                );

                const found = [];
                const parser = new DOMParser();

                for (const view of viewsData) {
                    if (!view.arch_db) continue; // Saltar si no hay arch

                    try {
                        const xmlDoc = parser.parseFromString(view.arch_db, "text/xml");
                        // Buscar específicamente elementos que representen campos con ese name
                        // Esto es más robusto que buscar cualquier nodo con el atributo name
                        const fieldNodes = xmlDoc.querySelectorAll(`field[name="${fieldName}"], button[name="${fieldName}"], page[name="${fieldName}"]`); // Añade otros tags si es necesario

                        if (fieldNodes.length > 0) {
                            // Tomamos el primer nodo encontrado, asumimos que es el principal para este campo en esta vista
                            const fieldNode = fieldNodes[0];
                            const xpath = this.generateXpath(fieldNode);
                            if (xpath) {
                                found.push({
                                    viewName: view.name,
                                    viewXmlId: view.xml_id || `NO_XML_ID_${view.id}`, // Usar ID si no hay xml_id
                                    xpath: xpath
                                });
                            }
                        }
                    } catch (parseError) {
                        console.warn(`Could not parse XML for view ${view.xml_id || view.id}:`, parseError);
                    }
                }

                this.state.foundViews = found;

                if (found.length > 0) {
                    // Mostrar el popover usando el servicio de Odoo
                    // Necesitaremos un componente para el contenido del popover
                    this.popoverCloseFn = this.popover.add(
                        this.triggerElementRef.el, // Elemento que disparó el popover
                        XPathPopoverContent, // Componente que renderizará la lista (lo crearemos abajo)
                        { // Props para el componente del popover
                            views: this.state.foundViews,
                            fieldName: fieldName, // Pasamos el nombre del campo
                            copyFn: this.copyInheritanceXml.bind(this), // Pasamos la función de copia ENLAZADA
                            closeFn: () => this.popoverCloseFn ? this.popoverCloseFn() : null // Función para cerrar desde dentro
                        },
                        { // Opciones del popover
                            position: 'bottom', // Posición preferida
                            closeOnClickAway: true, // Cerrar si se hace clic fuera
                            onClose: () => { this.popoverCloseFn = null; } // Limpiar referencia al cerrar
                        }
                    );
                } else {
                    this.notification.add(`Field "${fieldName}" not found in any form view.`, { type: 'warning' });
                }

            } catch (error) {
                console.error(`Error fetching views for field ${fieldName}:`, error);
                this.notification.add(`Error searching for field "${fieldName}".`, { type: 'danger' });
            } finally {
                this.state.isLoading = false;
            }
        }

        // Nuevo: Genera y copia el XML de herencia
        copyInheritanceXml(viewInfo, position = 'after') { // position puede ser 'after', 'before', 'inside', 'replace', 'attributes'
            const fieldName = this.props.fieldName;
            const viewXmlId = viewInfo.viewXmlId.includes('.') ? viewInfo.viewXmlId : `module_name.${viewInfo.viewXmlId}`; // Asumir module_name si no existe
            const inheritIdRef = viewXmlId; // Usar el xml_id completo como ref
            const newViewId = `${viewXmlId.split('.').pop()}_inherit_${fieldName}`.replace(/[^a-zA-Z0-9_]/g, '_'); // Generar ID único
            const modelName = this.props.model;

            // Escapar caracteres especiales en el XPath para usarlo dentro de expr="..."
            const escapedXPath = viewInfo.xpath.replace(/"/g, "'"); // Reemplazar comillas dobles por simples

            const xmlSnippet = `
<record id="${newViewId}" model="ir.ui.view">
    <field name="name">${modelName}.form.inherit.${fieldName}</field>
    <field name="model">${modelName}</field>
    <field name="inherit_id" ref="${inheritIdRef}"/>
    <field name="arch" type="xml">
        <xpath expr="//${escapedXPath.substring(1)}" position="${position}">
            <!-- Add your field or modifications here -->
            <field name="your_new_field_name"/>
        </xpath>
    </field>
</record>
`;
            // Limpiar indentación inicial
            const cleanedSnippet = xmlSnippet.trim().split('\n').map(line => line.trimStart()).join('\n');

            navigator.clipboard.writeText(cleanedSnippet)
                .then(() => {
                    this.notification.add(`Inheritance XML for view "${viewInfo.viewName}" copied!`, { type: "success" });
                    // Cerrar popover después de copiar
                    if (this.popoverCloseFn) {
                        this.popoverCloseFn();
                    }
                })
                .catch(err => {
                    console.error('Error copying XML: ', err);
                    this.notification.add("Failed to copy XML.", { type: "danger" });
                });
        }
    };

    FieldXpath.template = "odoo_dev.FieldXpath"; // Asegúrate de que este template exista


    class XPathPopoverContent extends Component {
        setup() {
            this.copyXml = this.copyXml.bind(this);
            this.close = this.close.bind(this);
        }

        copyXml(view) {
            console.log("Copying XML for view:", view);
            console.log(this);
            this.props.copyFn(view); // Llama a la función pasada por props
        }

        close() {
            this.props.closeFn(); // Llama a la función de cierre
        }
    }

    XPathPopoverContent.template = "odoo_dev.XPathPopoverContent";
    XPathPopoverContent.props = { // Definir las props esperadas
        views: { type: Array, element: Object },
        fieldName: { type: String },
        copyFn: { type: Function },
        closeFn: { type: Function },
        close: { type: Function, optional: true }, 
    };

    FieldXpath.components = { XPathPopoverContent }; 

    return {
        FieldXpath
    };
});