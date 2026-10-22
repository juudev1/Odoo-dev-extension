import {
    isA,
    isLegacyController,
    isLegacyField,
    isLegacyKanbanRecord,
    isLegacyRenderer,
} from "./components.js";
import {
    elementAttributes,
    evaluateModifier,
    fieldDefinition,
    safeString,
    stringifyExpr,
} from "./describe.js";
import { getRoot, isOwl2 } from "./odoo.js";
import {
    ancestors,
    collectComponents,
    collectLegacyWidgets,
    containing,
    innermostFirst,
    legacyRootWidgets,
} from "./tree.js";
import { toPlain } from "./values.js";

const X2MANY = ["one2many", "many2many"];

function safeJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// ===========================================================================
// OWL views (16+)
// ===========================================================================

function owlView(entry) {
    const config = entry.component.env?.config || {};
    let model = null;
    for (const current of [entry, ...ancestors(entry)]) {
        if (isA(current.component, "View")) {
            model = current.component.props.resModel;
            break;
        }
    }
    const type = config.viewType || null;
    const subType = config.viewSubType && config.viewSubType !== type ? config.viewSubType : null;
    return { id: config.viewId || null, type, subType, model };
}

/** x2many fields the entry is rendered in, outermost first. */
function owlPath(entry) {
    const path = [];
    for (const current of ancestors(entry)) {
        const component = current.component;
        if (isA(component, "View")) {
            break;
        }
        if (isA(component, "Field")) {
            const name = component.props.name;
            const type = component.props.record?.fields?.[name]?.type;
            if (X2MANY.includes(type)) {
                path.unshift({ name, viewMode: component.props.fieldInfo?.viewMode || null });
            }
        }
    }
    return path;
}

function recordSummary(record, fallbackModel = null) {
    return {
        model: record?.resModel || fallbackModel,
        resId: record?.resId || null,
        isNew: Boolean(record && (record.isNew ?? record.isVirtual)),
        recordName: safeString(record?.data?.display_name),
    };
}

function describeOwlField(entry, { record, name, fieldInfo, source, model = null, fields = null }) {
    const field = (record?.fields || fields || {})[name];
    const info = fieldInfo || {};
    const modifiers = info.modifiers || {};
    const expr = (attr) => (info[attr] !== undefined && info[attr] !== null ? info[attr] : modifiers[attr]);
    let value;
    try {
        value = record?.data ? toPlain(record.data[name]) : undefined;
    } catch {
        value = undefined;
    }
    return {
        kind: "field",
        source,
        stack: "owl",
        ...recordSummary(record, model),
        field: fieldDefinition(field, name),
        fieldInfo: {
            label: safeString(info.string) || safeString(field?.string) || name,
            widget: info.widget || null,
            widgetLabel: safeString(info.field?.displayName || info.FieldComponent?.displayName),
            options: toPlain(info.options),
            context: stringifyExpr(info.context),
            domain: stringifyExpr(info.domain ?? field?.domain),
            invisible: stringifyExpr(expr("invisible")),
            columnInvisible: stringifyExpr(expr("column_invisible")),
            readonly: stringifyExpr(expr("readonly")),
            required: stringifyExpr(expr("required")),
            onChange: info.onChange ?? null,
            forceSave: info.forceSave ?? null,
            help: safeString(info.help) || safeString(field?.help),
            attrs: toPlain(info.attrs || info.rawAttrs || {}),
        },
        evaluated: record
            ? {
                  invisible: evaluateModifier(expr("invisible"), record),
                  readonly: evaluateModifier(expr("readonly"), record),
                  required: evaluateModifier(expr("required"), record),
              }
            : {},
        value,
        context: record ? toPlain(record.context) : null,
        view: owlView(entry),
        path: owlPath(entry),
    };
}

function findArchButton(arch, name, type) {
    if (!arch?.querySelectorAll || !name) {
        return null;
    }
    let nodes;
    try {
        nodes = [...arch.querySelectorAll(`button[name="${CSS.escape(name)}"]`)];
    } catch {
        return null;
    }
    return nodes.find((node) => !type || node.getAttribute("type") === type) || nodes[0] || null;
}

function describeOwlButton(entry) {
    const component = entry.component;
    const props = component.props || {};
    let click = {};
    try {
        click = component.clickParams || props.clickParams || {};
    } catch {
        click = props.clickParams || {};
    }
    const tooltip = safeJson(component.tooltip || "{}")?.button || {};
    const record = props.record;
    const archNode = findArchButton(component.env?.config?.viewArch, click.name, click.type);
    const arch = archNode ? elementAttributes(archNode) : null;
    const archModifiers = arch?.modifiers ? safeJson(arch.modifiers) : null;
    return {
        kind: "button",
        stack: "owl",
        ...recordSummary(record, props.resModel || null),
        button: {
            string: safeString(props.string) || entry.el?.textContent?.trim() || null,
            name: safeString(click.name),
            type: click.type || null,
            special: click.special || null,
            context: stringifyExpr(click.context ?? arch?.context),
            confirm: safeString(click.confirm ?? arch?.confirm),
            help: safeString(click.help ?? arch?.help),
            title: safeString(props.title),
            icon: props.icon || null,
            className: props.className || arch?.class || null,
            invisible: stringifyExpr(
                arch?.invisible ?? archModifiers?.invisible ?? tooltip.invisible ?? tooltip.modifiers?.invisible
            ),
            groups: arch?.groups || null,
        },
        arch,
        context: record ? toPlain(record.context) : null,
        view: owlView(entry),
        path: owlPath(entry),
    };
}

function describeOwlRecord(entry, record) {
    return {
        kind: "record",
        stack: "owl",
        ...recordSummary(record),
        context: toPlain(record?.context),
        view: owlView(entry),
        path: owlPath(entry),
    };
}

function findListRecord(list, id) {
    const queue = [list];
    while (queue.length) {
        const current = queue.shift();
        if (!current) {
            continue;
        }
        for (const record of current.records || []) {
            if (record.id === id) {
                return record;
            }
        }
        for (const group of current.groups || []) {
            queue.push(group.list);
        }
    }
    return null;
}

function describeOwlListTarget(entry, target) {
    const renderer = entry.component;
    const { list, archInfo } = renderer.props;
    const columns = [...(renderer.allColumns || []), ...(archInfo?.columns || [])];
    const columnFor = (name) => columns.find((column) => column.type === "field" && column.name === name);

    const cell = target.closest("td.o_data_cell[name]");
    if (cell && entry.el.contains(cell)) {
        const name = cell.getAttribute("name");
        const row = cell.closest("tr[data-id]");
        const record = row && findListRecord(list, row.dataset.id);
        if (record) {
            const descriptor = describeOwlField(entry, {
                record,
                name,
                fieldInfo: columnFor(name),
                source: "cell",
            });
            return { descriptor, element: cell };
        }
    }
    const header = target.closest("th[data-name]");
    if (header && entry.el.contains(header)) {
        const name = header.dataset.name;
        const descriptor = describeOwlField(entry, {
            record: null,
            name,
            fieldInfo: columnFor(name),
            source: "column",
            model: list?.resModel,
            fields: list?.fields,
        });
        return { descriptor, element: header };
    }
    const row = target.closest("tr.o_data_row[data-id]");
    if (row && entry.el.contains(row)) {
        const record = findListRecord(list, row.dataset.id);
        if (record) {
            return { descriptor: describeOwlRecord(entry, record), element: row };
        }
    }
    return null;
}

function inspectOwl(entries, target) {
    const chain = innermostFirst(containing(entries, target));
    for (const entry of chain) {
        const component = entry.component;
        if (component.widget || component.__widget) {
            const legacy = inspectLegacy(entries, target, legacyRootWidgets([entry]));
            if (legacy) {
                return legacy;
            }
        }
        if (isA(component, "ViewButton")) {
            return { descriptor: describeOwlButton(entry), element: entry.el };
        }
        if (isA(component, "FormLabel")) {
            const { record, fieldName, fieldInfo } = component.props;
            const descriptor = describeOwlField(entry, {
                record,
                name: fieldName,
                fieldInfo,
                source: "label",
            });
            return { descriptor, element: entry.el };
        }
        if (isA(component, "Field")) {
            const { record, name, fieldInfo } = component.props;
            const descriptor = describeOwlField(entry, { record, name, fieldInfo, source: "field" });
            // A field inside a smart button: also describe the button.
            const button = ancestors(entry).find((current) => isA(current.component, "ViewButton"));
            if (button) {
                descriptor.inButton = describeOwlButton(button).button;
            }
            return { descriptor, element: entry.el };
        }
        if (isA(component, "ListRenderer")) {
            const result = describeOwlListTarget(entry, target);
            if (result) {
                return result;
            }
        }
        if (isA(component, "KanbanRecord")) {
            return { descriptor: describeOwlRecord(entry, component.props.record), element: entry.el };
        }
    }
    return null;
}

// ===========================================================================
// Legacy views (15)
// ===========================================================================

/** Legacy controller widget -> viewInfo of the OWL wrapper that hosts it. */
function legacyViewInfos(owlEntries) {
    const map = new Map();
    for (const { component } of owlEntries) {
        const adapter = component.controllerRef?.comp;
        const widget = adapter?.widget || adapter?.__widget;
        if (widget && component.viewInfo) {
            map.set(widget, component.viewInfo);
        }
    }
    return map;
}

function legacyView(entry, viewInfos) {
    for (const current of [entry, ...ancestors(entry)]) {
        const widget = current.component;
        if (isLegacyController(widget)) {
            const info = viewInfos.get(widget);
            return {
                id: info?.view_id || null,
                type: widget.viewType || info?.type || null,
                subType: null,
                model: widget.modelName || info?.model || null,
            };
        }
    }
    return { id: null, type: null, subType: null, model: null };
}

function legacyPath(entry) {
    const path = [];
    for (const current of ancestors(entry)) {
        const widget = current.component;
        if (isLegacyController(widget)) {
            break;
        }
        if (isLegacyField(widget) && X2MANY.includes(widget.field.type)) {
            path.unshift({ name: widget.name, viewMode: widget.viewType || null });
        }
    }
    return path;
}

function legacyRecordSummary(record) {
    return {
        model: record?.model || null,
        resId: record?.res_id || null,
        isNew: Boolean(record && !record.res_id),
        recordName: safeString(record?.data?.display_name),
    };
}

function legacyEvaluated(record, modifiers) {
    try {
        const result = record?.evalModifiers ? record.evalModifiers(modifiers || {}) : {};
        return {
            invisible: result.invisible ?? null,
            readonly: result.readonly ?? null,
            required: result.required ?? null,
        };
    } catch {
        return {};
    }
}

function describeLegacyField(entry, viewInfos, { record, name, field, attrs, widget, source }) {
    attrs = attrs || {};
    const modifiers = attrs.modifiers || {};
    const otherAttrs = { ...attrs };
    delete otherAttrs.modifiers;
    delete otherAttrs.options;
    let value;
    try {
        value = record?.data ? toPlain(record.data[name]) : undefined;
    } catch {
        value = undefined;
    }
    return {
        kind: "field",
        source,
        stack: "legacy",
        ...legacyRecordSummary(record),
        field: fieldDefinition(field, name),
        fieldInfo: {
            label: safeString(attrs.string) || safeString(field?.string) || name,
            widget: attrs.widget || null,
            widgetLabel: safeString(widget?.description),
            options: toPlain(attrs.options || widget?.nodeOptions || {}),
            context: stringifyExpr(attrs.context),
            domain: stringifyExpr(attrs.domain ?? field?.domain),
            invisible: stringifyExpr(modifiers.invisible),
            columnInvisible: stringifyExpr(modifiers.column_invisible),
            readonly: stringifyExpr(modifiers.readonly),
            required: stringifyExpr(modifiers.required),
            onChange: null,
            forceSave: attrs.force_save ?? null,
            help: safeString(attrs.help) || safeString(field?.help),
            attrs: toPlain(otherAttrs),
        },
        evaluated: legacyEvaluated(record, modifiers),
        value,
        context: toPlain(record?.context),
        view: legacyView(entry, viewInfos),
        path: legacyPath(entry),
    };
}

function describeLegacyFieldWidget(entry, viewInfos, widget, source) {
    return describeLegacyField(entry, viewInfos, {
        record: widget.record,
        name: widget.name,
        field: widget.field,
        attrs: widget.attrs,
        widget,
        source,
    });
}

function findLegacyArchNode(node, predicate) {
    const stack = node ? [node] : [];
    while (stack.length) {
        const current = stack.pop();
        if (current && typeof current === "object") {
            if (predicate(current)) {
                return current;
            }
            stack.push(...(current.children || []));
        }
    }
    return null;
}

function findLegacyRecord(state, id) {
    const queue = [state];
    while (queue.length) {
        const current = queue.shift();
        if (!current) {
            continue;
        }
        if (current.id === id && current.type === "record") {
            return current;
        }
        if (Array.isArray(current.data)) {
            queue.push(...current.data);
        }
    }
    return null;
}

function legacyButtonNode(renderer, buttonEl) {
    for (const data of renderer.allModifiersData || []) {
        for (const elements of Object.values(data.elementsByRecord || {})) {
            for (const element of elements || []) {
                const el = element instanceof Element ? element : element?.[0] || element?.el;
                if (el === buttonEl) {
                    return data.node;
                }
            }
        }
    }
    const name = buttonEl.getAttribute("name");
    return findLegacyArchNode(
        renderer.arch,
        (node) => node.tag === "button" && node.attrs?.name === name
    );
}

function describeLegacyButton(entry, viewInfos, renderer, buttonEl) {
    const dom = elementAttributes(buttonEl);
    const node = legacyButtonNode(renderer, buttonEl);
    const attrs = node?.attrs || {};
    const row = buttonEl.closest("tr.o_data_row[data-id]");
    const record = row ? findLegacyRecord(renderer.state, row.dataset.id) : renderer.state;
    const domType = ["button", "submit", "reset"].includes(dom.type) ? null : dom.type;
    return {
        kind: "button",
        stack: "legacy",
        ...legacyRecordSummary(record?.type === "record" ? record : null),
        button: {
            string: safeString(attrs.string) || buttonEl.textContent.trim() || null,
            name: attrs.name || dom.name || null,
            type: attrs.type || domType || null,
            special: attrs.special || dom.special || null,
            context: stringifyExpr(attrs.context ?? dom.context),
            confirm: attrs.confirm || dom.confirm || null,
            help: attrs.help || dom.help || null,
            title: attrs.title || dom.title || null,
            icon: attrs.icon || null,
            className: attrs.class || dom.class || null,
            invisible: stringifyExpr(attrs.modifiers?.invisible),
            groups: attrs.groups || null,
        },
        arch: node ? toPlain(attrs) : null,
        context: toPlain(record?.context),
        view: legacyView(entry, viewInfos),
        path: legacyPath(entry),
    };
}

/**
 * Field widget of a form label. setIDForLabel() puts the label's `for` as
 * the id of the field's input; a read-only field has no input, so the node
 * id is mapped back to the field name.
 */
function legacyLabelWidget(renderer, forId) {
    const widgets = Object.values(renderer.allFieldWidgets || {}).flat();
    const input = forId ? document.getElementById(forId) : null;
    if (input) {
        const widget = widgets.find((candidate) => candidate.el && candidate.el.contains(input));
        if (widget) {
            return widget;
        }
    }
    const nodeId = Object.keys(renderer.idsForLabels || {}).find((key) => renderer.idsForLabels[key] === forId);
    const name = nodeId && renderer.fieldIdsToNames?.[nodeId];
    return name ? widgets.find((candidate) => candidate.name === name) || null : null;
}

function describeLegacyRendererTarget(entry, viewInfos, target) {
    const renderer = entry.component;
    const inside = (el) => el && entry.el.contains(el);

    const buttonEl = target.closest("button[name], a[name][type]");
    if (inside(buttonEl)) {
        return { descriptor: describeLegacyButton(entry, viewInfos, renderer, buttonEl), element: buttonEl };
    }
    const label = target.closest("label.o_form_label[for]");
    if (inside(label)) {
        const widget = legacyLabelWidget(renderer, label.getAttribute("for"));
        if (widget) {
            return {
                descriptor: describeLegacyFieldWidget(entry, viewInfos, widget, "label"),
                element: label,
            };
        }
    }
    const cell = target.closest("td.o_data_cell");
    const row = target.closest("tr.o_data_row[data-id]");
    if (inside(cell) && row) {
        const record = findLegacyRecord(renderer.state, row.dataset.id);
        const cells = [...row.children].filter((td) => td.classList.contains("o_data_cell"));
        const node = (renderer.columns || [])[cells.indexOf(cell)];
        if (record && node?.tag === "field") {
            const name = node.attrs.name;
            const descriptor = describeLegacyField(entry, viewInfos, {
                record,
                name,
                field: record.fields?.[name],
                attrs: node.attrs,
                source: "cell",
            });
            return { descriptor, element: cell };
        }
    }
    const header = target.closest("th[data-name]");
    if (inside(header)) {
        const name = header.dataset.name;
        const node = (renderer.columns || []).find((column) => column.attrs?.name === name);
        const state = renderer.state;
        const descriptor = describeLegacyField(entry, viewInfos, {
            record: null,
            name,
            field: state?.fields?.[name],
            attrs: node?.attrs,
            source: "column",
        });
        descriptor.model = state?.model || null;
        return { descriptor, element: header };
    }
    if (inside(row)) {
        const record = findLegacyRecord(renderer.state, row.dataset.id);
        if (record) {
            return { descriptor: describeLegacyRecord(entry, viewInfos, record), element: row };
        }
    }
    return null;
}

function describeLegacyRecord(entry, viewInfos, record) {
    return {
        kind: "record",
        stack: "legacy",
        ...legacyRecordSummary(record),
        context: toPlain(record?.context),
        view: legacyView(entry, viewInfos),
        path: legacyPath(entry),
    };
}

function inspectLegacy(owlEntries, target, roots = legacyRootWidgets(owlEntries)) {
    if (!roots.length) {
        return null;
    }
    const viewInfos = legacyViewInfos(owlEntries);
    const widgets = collectLegacyWidgets(roots);
    const chain = innermostFirst(containing(widgets, target));
    for (const entry of chain) {
        const widget = entry.component;
        if (isLegacyField(widget)) {
            const descriptor = describeLegacyFieldWidget(entry, viewInfos, widget, "field");
            const buttonEl = target.closest("button[name]");
            const renderer = ancestors(entry).find((current) => isLegacyRenderer(current.component));
            if (buttonEl && renderer && renderer.el.contains(buttonEl)) {
                descriptor.inButton = describeLegacyButton(
                    renderer,
                    viewInfos,
                    renderer.component,
                    buttonEl
                ).button;
            }
            return { descriptor, element: entry.el };
        }
        if (isLegacyKanbanRecord(widget)) {
            return { descriptor: describeLegacyRecord(entry, viewInfos, widget.state), element: entry.el };
        }
        if (isLegacyRenderer(widget)) {
            const result = describeLegacyRendererTarget(entry, viewInfos, target);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

// ===========================================================================

/**
 * Describes what is under `target`: a field, a label, a button, a list cell
 * or header, a list row or a kanban card.
 * @returns {{descriptor: Object, element: Element} | null}
 */
export function inspectElement(target) {
    const root = getRoot();
    if (!root) {
        return null;
    }
    const entries = collectComponents(root);
    if (isOwl2(root)) {
        return inspectOwl(entries, target);
    }
    return inspectLegacy(entries, target);
}
