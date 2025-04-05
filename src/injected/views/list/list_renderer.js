
odoo.define('odoo_dev.ListRenderer', ['@web/views/list/list_renderer', '@web/core/utils/patch', 'odoo_dev.version_utils'], function (require) {
    const { ListRenderer } = require('@web/views/list/list_renderer');
    const { patch } = require('@web/core/utils/patch');
    const odooVersion = require('odoo_dev.version_utils'); 

    // TODO: Solucionar cargue en el primer render, solo está funcionando en listas que se renderizan cuando ua está montado en la vista
    // Ej:Contabilidad > Facturas > Apuntes Contables, en esas lineas si funciona pero no en las lineas de factura

    if (odooVersion.isV16) {
        ListRenderer.template = "odoo_dev.ListRenderer16";
    } else if (odooVersion.isV17) {
        ListRenderer.template = "odoo_dev.ListRenderer";
    } else if (odooVersion.isV18) {
        ListRenderer.template = "odoo_dev.ListRenderer18";
    }

    return {
        ListRenderer: ListRenderer
    };
});