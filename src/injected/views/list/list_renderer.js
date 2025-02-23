
odoo.define('odoo_dev.ListRenderer', ['@web/views/list/list_renderer', '@web/core/utils/patch'], function (require) {
    const { ListRenderer } = require('@web/views/list/list_renderer');
    const { patch } = require('@web/core/utils/patch');

    // TODO: Solucionar cargue en el primer render, solo está funcionando en listas que se renderizan cuando ua está montado en la vista
    // Ej:Contabilidad > Facturas > Apuntes Contables, en esas lineas si funciona pero no en las lineas de factura

    if (odoo.info.server_version_info[0] === 16) {
        ListRenderer.template = "odoo_dev.ListRenderer16";
    } else if (odoo.info.server_version_info[0] === 17) {
        ListRenderer.template = "odoo_dev.ListRenderer";
    } else if (odoo.info.server_version_info[0] === 18) {
        ListRenderer.template = "odoo_dev.ListRenderer18";
    }

    return {
        ListRenderer: ListRenderer
    };
});