
odoo.define('odoo_dev.ListRenderer', ['@web/views/list/list_renderer'], function (require) {
    const { ListRenderer } = require('@web/views/list/list_renderer');

    ListRenderer.template = "odoo_dev.ListRenderer";

    return {
        ListRenderer: ListRenderer
    };
});