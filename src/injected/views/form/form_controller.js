odoo.define('odoo_dev.form_controller', ['@web/views/form/form_controller', '@web/core/utils/patch', 'odoo_dev.components.sidebar_dev', 'odoo_dev.version_utils'], function (require) {
    "use strict";

    const { FormController } = require("@web/views/form/form_controller");
    const SideBarDev = require('odoo_dev.components.sidebar_dev');
    const odooVersion = require('odoo_dev.version_utils');

    FormController.components = { ...FormController.components, SideBarDev };

    if (odooVersion.isV16) {
        FormController.template = 'odoo_dev.FormView16';
    } else if (odooVersion.isV17) {
        FormController.template = 'odoo_dev.FormView17';
    } else if (odooVersion.isV18) {
        FormController.template = 'odoo_dev.FormView';
    }
});