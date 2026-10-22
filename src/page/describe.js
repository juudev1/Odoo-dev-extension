import { getModule } from "./odoo.js";
import { toPlain } from "./values.js";

/**
 * Attributes of a field definition (fields_get) worth showing. The record
 * keeps the full definition; this keeps the payload small and stable.
 */
const FIELD_KEYS = [
    "name",
    "string",
    "type",
    "relation",
    "relation_field",
    "help",
    "required",
    "readonly",
    "store",
    "related",
    "depends",
    "groups",
    "selection",
    "translate",
    "company_dependent",
    "sortable",
    "searchable",
    "digits",
    "size",
    "currency_field",
    "domain",
    "context",
    "change_default",
    "default_export_compatible",
];

export function fieldDefinition(field, name) {
    const result = { name };
    if (!field) {
        return result;
    }
    for (const key of FIELD_KEYS) {
        if (field[key] !== undefined && field[key] !== null && field[key] !== "") {
            result[key] = toPlain(field[key]);
        }
    }
    return result;
}

/** Python expressions stay strings; domains and booleans become text. */
export function stringifyExpr(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "boolean") {
        return value ? "True" : "False";
    }
    try {
        return JSON.stringify(toPlain(value));
    } catch {
        return String(value);
    }
}

/**
 * Current value of an invisible/readonly/required modifier for a record.
 * 17+ store python expressions, 16 domains in fieldInfo.modifiers.
 */
export function evaluateModifier(expr, record) {
    if (expr === undefined || expr === null || expr === "") {
        return null;
    }
    if (typeof expr === "boolean") {
        return expr;
    }
    if (!record) {
        return null;
    }
    let context;
    try {
        context = record.evalContextWithVirtualIds || record.evalContext;
    } catch {
        return null;
    }
    try {
        if (typeof expr === "string") {
            const py = getModule("@web/core/py_js/py");
            if (py?.evaluateBooleanExpr) {
                return Boolean(py.evaluateBooleanExpr(expr, context));
            }
        }
        const utils = getModule("@web/views/utils");
        if (utils?.evalDomain) {
            return Boolean(utils.evalDomain(expr, context));
        }
    } catch {
        // Evaluation can fail on expressions referencing missing fields.
    }
    return null;
}

/** All attributes of an XML element as a plain object. */
export function elementAttributes(element) {
    const result = {};
    for (const { name, value } of element?.attributes || []) {
        result[name] = value;
    }
    return result;
}

export function safeString(value) {
    if (value === undefined || value === null) {
        return null;
    }
    try {
        return String(value);
    } catch {
        return null;
    }
}
