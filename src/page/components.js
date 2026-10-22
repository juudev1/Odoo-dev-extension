import { getModule } from "./odoo.js";

/**
 * Identification of the OWL components the extension reads. The class is
 * taken from Odoo's module registry so subclasses (e.g. sale's order line
 * list renderer) match too; the name check is a fallback for builds where
 * the module is missing or renamed.
 */
const CLASSES = {
    Field: ["@web/views/fields/field", "Field"],
    FormLabel: ["@web/views/form/form_label", "FormLabel"],
    ViewButton: ["@web/views/view_button/view_button", "ViewButton"],
    ListRenderer: ["@web/views/list/list_renderer", "ListRenderer"],
    KanbanRecord: ["@web/views/kanban/kanban_record", "KanbanRecord"],
    View: ["@web/views/view", "View"],
};

const FALLBACKS = {
    Field: (c) => c.constructor?.name === "Field" && Boolean(c.props?.record && c.props?.name),
    FormLabel: (c) =>
        c.constructor?.name === "FormLabel" && Boolean(c.props?.record && c.props?.fieldName),
    ViewButton: (c) => c.constructor?.name === "ViewButton",
    ListRenderer: (c) => Boolean(c.props?.list && c.props?.archInfo?.columns),
    KanbanRecord: (c) => c.constructor?.name === "KanbanRecord" && Boolean(c.props?.record),
    View: (c) => c.constructor?.name === "View" && Boolean(c.props?.resModel && c.props?.type),
};

const classes = new Map();

function getClass(key) {
    if (!classes.has(key)) {
        const [moduleName, exportName] = CLASSES[key];
        const Class = getModule(moduleName)?.[exportName];
        if (typeof Class !== "function") {
            return null;
        }
        classes.set(key, Class);
    }
    return classes.get(key);
}

export function isA(component, key) {
    const Class = getClass(key);
    if (Class && component instanceof Class) {
        return true;
    }
    try {
        return FALLBACKS[key](component);
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Legacy widgets (15, and legacy views hosted in 16)
// ---------------------------------------------------------------------------

export function isLegacyField(widget) {
    return Boolean(
        typeof widget.name === "string" &&
            widget.record &&
            typeof widget.record.model === "string" &&
            widget.field &&
            widget.attrs
    );
}

export function isLegacyRenderer(widget) {
    return Boolean(widget.state && widget.allFieldWidgets && typeof widget._render === "function");
}

export function isLegacyController(widget) {
    return Boolean(widget.renderer && widget.model && widget.handle);
}

export function isLegacyKanbanRecord(widget) {
    return Boolean(
        widget.state?.type === "record" && widget.el?.classList?.contains("o_kanban_record")
    );
}
