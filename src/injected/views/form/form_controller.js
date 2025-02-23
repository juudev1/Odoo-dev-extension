import '../custom/sidebar_dev.js';

odoo.define('odoo_dev.form_controller', ['@web/views/form/form_compiler'], function (require) {
    "use strict";

    const { FormController } = require("@web/views/form/form_controller");
    const SideBarDev = require('odoo_dev.components.sidebar_dev');

    FormController.components = { ...FormController.components, SideBarDev };
    FormController.template = 'odoo_dev.FormView';
});