/**
 * Converts values of Odoo records (reactive proxies, luxon/moment dates,
 * x2many lists, datapoints) into plain JSON that can cross postMessage.
 */

const MAX_ITEMS = 200;
const MAX_DEPTH = 4;

function isDateLike(value) {
    // luxon (16+) and moment (15 legacy)
    return value.isLuxonDateTime === true || value._isAMomentObject === true;
}

function dateToString(value) {
    if (value.isLuxonDateTime) {
        return value.isValid ? value.toISO({ suppressMilliseconds: true }) : "Invalid date";
    }
    return typeof value.toISOString === "function" ? value.toISOString() : String(value);
}

/** x2many value: StaticList (16+) or a legacy list datapoint (15). */
function x2ManyIds(value) {
    if (Array.isArray(value.currentIds)) {
        return value.currentIds;
    }
    if (Array.isArray(value.resIds)) {
        return value.resIds;
    }
    if (Array.isArray(value.res_ids)) {
        return value.res_ids;
    }
    if (Array.isArray(value.records)) {
        return value.records.map((record) => record.resId ?? record.id);
    }
    return null;
}

function isX2ManyList(value) {
    return (
        ("records" in value && "resModel" in value) ||
        (value.type === "list" && Array.isArray(value.res_ids))
    );
}

/** many2one as a legacy record datapoint (15). */
function isLegacyRecordDatapoint(value) {
    return value.type === "record" && "res_id" in value && "model" in value;
}

export function toPlain(value, depth = 0, seen = new WeakSet()) {
    if (value === undefined) {
        return null;
    }
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : String(value);
    }
    if (typeof value === "bigint") {
        return String(value);
    }
    if (typeof value !== "object") {
        return null;
    }
    // Markup (16+) and other String objects
    if (value instanceof String) {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (isDateLike(value)) {
        return { $date: dateToString(value) };
    }
    if (value instanceof Node) {
        return `[${value.nodeName}]`;
    }
    if (seen.has(value)) {
        return "[Circular]";
    }
    seen.add(value);
    if (isX2ManyList(value)) {
        const ids = x2ManyIds(value) || [];
        return { $x2many: ids.slice(0, MAX_ITEMS), count: value.count ?? ids.length };
    }
    if (isLegacyRecordDatapoint(value)) {
        return { id: value.res_id, display_name: value.data?.display_name ?? null };
    }
    if (depth >= MAX_DEPTH) {
        return Array.isArray(value) ? `[Array(${value.length})]` : "[Object]";
    }
    if (Array.isArray(value)) {
        return value.slice(0, MAX_ITEMS).map((item) => toPlain(item, depth + 1, seen));
    }
    const result = {};
    let count = 0;
    for (const key of Object.keys(value)) {
        if (count++ >= MAX_ITEMS) {
            result["…"] = `${Object.keys(value).length - MAX_ITEMS} more keys`;
            break;
        }
        let item;
        try {
            item = value[key];
        } catch {
            continue;
        }
        if (typeof item === "function") {
            continue;
        }
        result[key] = toPlain(item, depth + 1, seen);
    }
    return result;
}

/** Copies only the listed keys, converted to plain values. */
export function pick(object, keys) {
    const result = {};
    if (!object) {
        return result;
    }
    for (const key of keys) {
        if (object[key] !== undefined) {
            result[key] = toPlain(object[key]);
        }
    }
    return result;
}
