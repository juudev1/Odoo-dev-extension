import './field_xpath';

odoo.define('odoo_dev.components.sidebar_dev', ['@odoo/owl', '@web/core/utils/hooks'], function (require) {
    const { Component, useState, useRef } = require('@odoo/owl');
    const { useService } = require("@web/core/utils/hooks");
    const { FieldXpath } = require('odoo_dev.components.field_xpath');

    class SideBarDev extends Component {
        setup() {
            this.orm = useService('orm');

            this.state = useState({
                recordFields: [],
                isVisible: false,
                reports: [],
                record: null,
                showRunModelMethod: false,
                modelMethodOutput: null,
            });

            this.modelMethodInput = useRef('modelMethodInput');
        }

        clearOutput() {
            this.state.recordFields = [];
            this.state.reports = [];
            this.state.showRunModelMethod = false;
            this.state.modelMethodOutput = null; // Clear the output
            console.log("Output cleared");
        }

        async getRecordValues() {
            this.clearOutput();
            const record = this.props.record;

            try {
                const result = await this.orm.call(record.resModel, 'read', [[record.resId]], {});
                if (result.length > 0) {
                    this.state.record = result[0];
                    for (const key in result[0]) {
                        this.state.recordFields.push({ key: key, value: result[0][key] });
                    }
                }
            } catch (error) {
                console.error("Error fetching record data", error);
            }
        }

        async getReports() {
            this.clearOutput();
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
        }

        runModelMethodOpt() {
            this.clearOutput();
            this.state.showRunModelMethod = true;
        }

        async runModelMethod() {
            const methodName = this.modelMethodInput.el.value;
            const model = this.props.record.resModel;
            const recordId = this.props.record.resId;

            try {
                const result = await this.orm.call(model, methodName, [[recordId]], {});
                this.state.modelMethodOutput = JSON.stringify(result, null, 2);
            } catch (error) {
                console.error("Error calling model method", error);
                this.state.modelMethodOutput = JSON.stringify(error, null, 2);
            }
        }
    }

    SideBarDev.template = "odoo_dev.SideBar"; // Asegúrate de que este template exista
    SideBarDev.components = { FieldXpath }; // Exporta los componentes
    return SideBarDev;
});