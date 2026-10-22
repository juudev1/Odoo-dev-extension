import { request, rpc } from "./bridge.js";

/**
 * Everything the panel reads from the server. Version differences between
 * 15 and 19 are handled here so the UI never has to check versions.
 */

let odooVersion = { major: 19, minor: 0, number: 19 };

export function setVersion(version) {
    if (version) {
        odooVersion = version;
    }
}

export function getVersion() {
    return odooVersion;
}

/** Tag of list subviews in arch: <tree> until 17, <list> from 18. */
export function listTag() {
    return odooVersion.major >= 18 ? "list" : "tree";
}

/** The web client calls it "list"; the server called it "tree" until 17. */
export function serverViewType(type) {
    return type === "list" ? listTag() : type;
}

const FIELD_ATTRIBUTES = [
    "string",
    "type",
    "help",
    "required",
    "readonly",
    "relation",
    "relation_field",
    "selection",
    "store",
    "related",
    "depends",
    "groups",
    "company_dependent",
    "translate",
    "sortable",
    "searchable",
    "digits",
    "size",
    "currency_field",
    "domain",
    "context",
    "change_default",
];

const fieldsCache = new Map();

export async function fieldsGet(model, { force = false } = {}) {
    if (force || !fieldsCache.has(model)) {
        const promise = rpc(model, "fields_get", [], { attributes: FIELD_ATTRIBUTES });
        fieldsCache.set(model, promise);
        promise.catch(() => fieldsCache.delete(model));
    }
    return fieldsCache.get(model);
}

/**
 * Reads every field of a record. If one field breaks the read (a compute
 * that raises, a field the user cannot read), retries field by field so the
 * others still show and the broken one shows its error.
 * @returns {Promise<{values: Object, errors: Object}>}
 */
export async function readRecord(model, resId, fieldNames) {
    const context = { bin_size: true, active_test: false };
    try {
        const [values] = await rpc(model, "read", [[resId], fieldNames], { context });
        if (!values) {
            throw new Error(`${model}(${resId}) does not exist or is not readable`);
        }
        return { values, errors: {} };
    } catch (error) {
        if (fieldNames.length <= 1) {
            throw error;
        }
    }
    const values = {};
    const errors = {};
    const chunks = [];
    for (let i = 0; i < fieldNames.length; i += 25) {
        chunks.push(fieldNames.slice(i, i + 25));
    }
    const readChunk = async (names) => {
        try {
            const [result] = await rpc(model, "read", [[resId], names], { context });
            Object.assign(values, result || {});
        } catch (error) {
            if (names.length === 1) {
                errors[names[0]] = error.message;
                return;
            }
            await Promise.all(names.map((name) => readChunk([name])));
        }
    };
    await Promise.all(chunks.map(readChunk));
    if (!Object.keys(values).length && Object.keys(errors).length === fieldNames.length) {
        throw new Error(Object.values(errors)[0]);
    }
    return { values, errors };
}

export async function readNames(model, ids) {
    if (!ids.length) {
        return [];
    }
    return rpc(model, "read", [ids, ["display_name"]], { context: { active_test: false } });
}

/**
 * [[id, display_name], …] matching `text`, like a many2one field search.
 * The name goes positionally: the second parameter is `args` until 18 and
 * `domain` in 19.
 */
export function searchNames(model, text, limit) {
    return rpc(model, "name_search", [text], { limit });
}

export function writeRecord(model, resId, values) {
    return rpc(model, "write", [[resId], values]);
}

export function callMethod(model, method, args, kwargs) {
    return rpc(model, method, args, kwargs);
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

const VIEW_FIELDS = ["name", "xml_id", "type", "model", "priority", "mode", "inherit_id", "active"];

export async function readView(viewId) {
    const [view] = await rpc("ir.ui.view", "read", [[viewId], VIEW_FIELDS], {
        context: { active_test: false },
    });
    return view || null;
}

/** Default view of a type for a model, as the web client would load it. */
export async function defaultViewId(model, type) {
    const arch = await combinedArch(model, false, type);
    return arch.viewId;
}

/**
 * Combined arch (all inheritances applied, groups filtered for the user) of
 * a view. get_views exists from 16, fields_view_get before.
 * @returns {Promise<{arch: string, viewId: number|null}>}
 */
export async function combinedArch(model, viewId, type) {
    const serverType = serverViewType(type);
    if (odooVersion.major >= 16) {
        const result = await rpc(model, "get_views", [], {
            views: [[viewId || false, serverType]],
            options: {},
        });
        const view = result.views[serverType] || result.views[type];
        return { arch: view.arch, viewId: view.id || null };
    }
    const result = await rpc(model, "fields_view_get", [], {
        view_id: viewId || false,
        view_type: serverType,
    });
    return { arch: result.arch, viewId: result.view_id || null };
}

/**
 * Views that extend `viewId`, recursively, with their arch_db, ordered the
 * way Odoo applies them (priority, then id).
 */
export async function inheritedViews(viewId) {
    const result = [];
    let parents = [viewId];
    const seen = new Set(parents);
    for (let depth = 0; parents.length && depth < 15; depth++) {
        const children = await rpc("ir.ui.view", "search_read", [], {
            domain: [["inherit_id", "in", parents]],
            fields: [...VIEW_FIELDS, "arch_db"],
            order: "priority, id",
            context: { active_test: false },
        });
        parents = [];
        for (const child of children) {
            if (!seen.has(child.id)) {
                seen.add(child.id);
                parents.push(child.id);
                result.push({ ...child, depth: depth + 1 });
            }
        }
    }
    return result;
}

/**
 * Views whose arch_db makes up the combined arch of `viewId`, the way Odoo
 * combines it: the chain of parents up to the root view, and for each of
 * them the extension views below it (primary children are separate views).
 */
export async function combinationViews(viewId) {
    const chain = [];
    let current = await viewArchDb(viewId);
    for (let depth = 0; current && depth < 6; depth++) {
        chain.unshift(current);
        current = current.inherit_id ? await viewArchDb(current.inherit_id[0]) : null;
    }
    const result = [];
    for (const view of chain) {
        result.push(view);
        const keep = new Set([view.id]);
        for (const child of await inheritedViews(view.id)) {
            if (child.mode === "extension" && child.inherit_id && keep.has(child.inherit_id[0])) {
                keep.add(child.id);
                result.push(child);
            }
        }
    }
    return result;
}

export async function viewArchDb(viewId) {
    const [view] = await rpc("ir.ui.view", "read", [[viewId], [...VIEW_FIELDS, "arch_db"]], {
        context: { active_test: false },
    });
    return view || null;
}

/** Primary views of a model and type, to search a field outside the current one. */
export function primaryViews(model, type) {
    return rpc("ir.ui.view", "search_read", [], {
        domain: [
            ["model", "=", model],
            ["type", "=", serverViewType(type)],
            ["mode", "=", "primary"],
        ],
        fields: VIEW_FIELDS,
        order: "priority, id",
        limit: 20,
    });
}

// ---------------------------------------------------------------------------
// Actions and reports
// ---------------------------------------------------------------------------

export async function actionXmlId(actionId) {
    try {
        const [action] = await rpc("ir.actions.actions", "read", [[actionId], ["xml_id", "name", "type"]]);
        return action || null;
    } catch {
        return null;
    }
}

/** External id of any record, from ir.model.data. */
export async function externalId(model, resId) {
    const rows = await rpc("ir.model.data", "search_read", [], {
        domain: [
            ["model", "=", model],
            ["res_id", "=", resId],
        ],
        fields: ["module", "name"],
        limit: 1,
    });
    return rows.length ? `${rows[0].module}.${rows[0].name}` : null;
}

export function reportsFor(model) {
    return rpc("ir.actions.report", "search_read", [], {
        domain: [["model", "=", model]],
        fields: ["name", "report_name", "report_type", "xml_id"],
        order: "name",
    });
}

export async function modelId(model) {
    const rows = await rpc("ir.model", "search_read", [], {
        domain: [["model", "=", model]],
        fields: ["id", "name"],
        limit: 1,
    });
    return rows[0] || null;
}

export async function fieldId(model, name) {
    const rows = await rpc("ir.model.fields", "search_read", [], {
        domain: [
            ["model", "=", model],
            ["name", "=", name],
        ],
        fields: ["id"],
        limit: 1,
    });
    return rows[0]?.id || null;
}

// ---------------------------------------------------------------------------
// Page actions
// ---------------------------------------------------------------------------

export function openRecord(model, resId, { newTab = false } = {}) {
    return request("openRecord", { model, resId, newTab });
}

export function doAction(action) {
    return request("doAction", { action });
}

export function reloadView() {
    return request("reloadView");
}

export function toggleColorScheme() {
    return request("toggleColorScheme");
}

export function getContext() {
    return request("getContext");
}
