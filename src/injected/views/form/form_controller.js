odoo.define('odoo_dev.form_controller', ['@web/views/form/form_controller', '@web/core/utils/patch', 'odoo_dev.components.sidebar_dev'], function (require) {
    "use strict";

    const { FormController } = require("@web/views/form/form_controller");
    const SideBarDev = require('odoo_dev.components.sidebar_dev');

    FormController.components = { ...FormController.components, SideBarDev };

    if (odoo.info.server_version_info[0] === 16) {
        FormController.template = 'odoo_dev.FormView16';
    } else if (odoo.info.server_version_info[0] === 17) {
        FormController.template = 'odoo_dev.FormView17';
    } else if (odoo.info.server_version_info[0] === 18) {
        FormController.template = 'odoo_dev.FormView';
    }
});