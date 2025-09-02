odoo.define('odoo_dev.stock.ListRenderer', ['@stock/views/picking_form/stock_move_one2many', '@web/core/utils/patch', 'odoo_dev.version_utils', '@web/core/utils/hooks', '@web/core/l10n/translation'], function (require) {
    // const { useState } = require("@odoo/owl"); // Ya no necesitamos devSidebarState local
    const { MovesListRenderer } = require('@stock/views/picking_form/stock_move_one2many');
    const { patch } = require('@web/core/utils/patch');
    const odooVersion = require('odoo_dev.version_utils');
    const { useService } = require("@web/core/utils/hooks");
    const { _t } = require("@web/core/l10n/translation"); // Para notificaciones

    // Asignación de templates por versión (sin cambios aquí)
    if (odooVersion.isV16) {
        
    } else if (odooVersion.isV17) {
        
    } else if (odooVersion.isV18) {
        MovesListRenderer.recordRowTemplate = "odoo_dev.stock.MovesListRenderer.RecordRow"; 

        patch(MovesListRenderer.prototype, {
            setup() {
                super.setup();
                console.log("[ListRenderer Patched] Setup complete.");
                this.activeRecordService = useService("activeRecordService");
                this.notificationService = useService("notification"); // Si aún lo necesitas para errores

                // Ya no necesitamos this.devSidebarState localmente si SideBarDev lo maneja
                // this.devSidebarState = useState({ ... });

                // openDevSidebarForRow se llamará desde el template o desde otro método
                this.updateActiveRecordFromRow = this.updateActiveRecordFromRow.bind(this);

                console.log("[ListRenderer Patched] Setup complete. ActiveRecordService injected.");
            },

            /**
             * Actualiza el activeRecordService con la información de la fila.
             * Esta función será llamada al hacer clic en una fila.
             * @param {import('@web/model/relational_model/record').Record} record El objeto Record de la fila.
             * @param {Event} ev El evento de clic (opcional, puede ser útil para stopPropagation).
             */
            updateActiveRecordFromRow(record, ev) {
                if (ev) {
                    // ev.stopPropagation();
                }

                const recordId = record.resId; // resId es el ID de la base de datos
                const recordModel = record.resModel;

                if (recordId === undefined || recordId === null || !recordModel) {
                    this.notificationService.add(_t("Cannot set active record: Record ID or Model is missing."), {
                        type: "warning",
                    });
                    console.error("[ListRenderer] Record ID or Model is missing for active record update:", record);
                    // Podrías limpiar el servicio si el registro no es válido
                    // this.activeRecordService.clearActiveRecord();
                    return;
                }

                // Llamar al servicio para actualizar el registro activo
                // El 'false' indica que no es una vista de formulario directamente (a menos que la lista lo sea)
                this.activeRecordService.setActiveRecord(recordModel, recordId, false);

                console.log(`[ListRenderer] Active record updated via service: ${recordModel}, ID: ${recordId}`);

                // La lógica de abrir/cerrar el SideBarDev ahora debería ser manejada por SideBarDev mismo
                // o por el usuario haciendo clic en su botón de toggle. SideBarDev reaccionará
                // al cambio en activeRecordService.
            },

            // --- Opción si usas un manejador de clic de fila general (ej. onRecordClicked) ---
            // Deberás identificar el método correcto en la versión de Odoo que estás parcheando.
            // Este es un ejemplo conceptual.
            /**
             * @override
             */
            onRecordClicked(record, ev) {
                // Primero, llama al método original si existe y quieres mantener su comportamiento
                if (super.onRecordClicked) {
                    super.onRecordClicked(record, ev);
                }

                // Luego, actualiza tu servicio.
                // Puedes añadir una condición aquí, por ejemplo, si se hizo clic con una tecla modificadora,
                // o si un botón específico dentro de la fila fue clickeado.
                // Por ahora, asumimos que cualquier clic en la fila actualiza el servicio.
                this.updateActiveRecordFromRow(record, ev);
            }
        });
    }

    return {
        MovesListRenderer: MovesListRenderer
    };
});
