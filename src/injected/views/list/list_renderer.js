
odoo.define('odoo_dev.ListRenderer', ['@web/views/list/list_renderer'], function (require) {
    const { ListRenderer } = require('@web/views/list/list_renderer');

    if (odoo.info.server_version_info[0] === 16) {
        ListRenderer.template = "odoo_dev.ListRenderer16";
    } else if (odoo.info.server_version_info[0] >= 17) {
        ListRenderer.template = "odoo_dev.ListRenderer";
    }
    
    return {
        ListRenderer: ListRenderer
    };
});