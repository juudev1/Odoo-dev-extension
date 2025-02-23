odoo.define('odoo_dev.components.field_xpath', ['@odoo/owl', '@web/core/utils/hooks'], function (require) {
    const { Component, useState } = require('@odoo/owl');
    const { useService } = require("@web/core/utils/hooks");

    class FieldXpath extends Component {
        setup() {
            this.orm = useService('orm');

            this.state = useState({
                xpath: [],
            });
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

        async copyCode() {
            const record = this.props.record;
            const field = this.props.fieldName;
            const resModel = record.resModel;

            try {
                const views = await this.orm.call(
                    'ir.ui.view',
                    'search_read',
                    [],
                    {
                        domain: [
                            ['model', '=', resModel],
                            ['type', '=', 'form']
                        ],
                        fields: ['id', 'name', 'arch', 'xml_id'],
                        limit: 100,
                    }
                );

                this.state.xpath = []; // Reset xpath before filling

                for (const view of views) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(view.arch, "text/xml");
                    const fieldNode = xmlDoc.querySelector(`[name="${field}"]`);

                    if (fieldNode) {
                        const xpath = this.generateXpath(fieldNode);
                        console.log("XPath:", xpath);
                        this.state.xpath.push({ view: view.name, xpath: xpath, xml_id: view.xml_id });
                    }
                }

                console.log("XPATH", this.state.xpath);
                navigator.clipboard.writeText(JSON.stringify(this.state.xpath, null, 2));

            } catch (error) {
                console.error("Error fetching views:", error);
            }
        }
    };

    FieldXpath.template = "odoo_dev.FieldXpath"; // Asegúrate de que este template exista
    return {
        FieldXpath
    };
});