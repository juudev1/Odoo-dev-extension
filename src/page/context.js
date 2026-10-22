import { isA, isLegacyController } from "./components.js";
import { safeString, stringifyExpr } from "./describe.js";
import { getRoot, getServices, isOwl2 } from "./odoo.js";
import {
    collectComponents,
    collectLegacyWidgets,
    inDocumentOrder,
    legacyRootWidgets,
} from "./tree.js";
import { toPlain } from "./values.js";

const DIALOG_SELECTOR = ".o_dialog, .modal";

function describeAction(controller) {
    const action = controller?.action;
    if (!action) {
        return null;
    }
    return {
        id: typeof action.id === "number" ? action.id : null,
        xmlId: action.xml_id || action.xmlid || null,
        name: safeString(action.name || action.display_name),
        type: action.type || null,
        tag: action.tag || null,
        resModel: action.res_model || null,
        target: action.target || null,
        domain: stringifyExpr(action.domain),
        context: toPlain(action.context),
    };
}

/** The view of the last dialog opened, else the main action's view. */
function pickActive(candidates) {
    const outermost = (entries) => entries.reduce((a, b) => (b.depth < a.depth ? b : a));
    const inDialog = candidates.filter((entry) => entry.el.closest(DIALOG_SELECTOR));
    if (inDialog.length) {
        const ordered = inDocumentOrder(inDialog);
        const lastDialog = ordered[ordered.length - 1].el.closest(DIALOG_SELECTOR);
        return {
            entry: outermost(ordered.filter((entry) => entry.el.closest(DIALOG_SELECTOR) === lastDialog)),
            inDialog: true,
        };
    }
    const main = candidates.filter((entry) => entry.el.closest(".o_action_manager"));
    return main.length ? { entry: outermost(main), inDialog: false } : null;
}

export function isRecordDirty(record) {
    try {
        // 16: synchronous getter. 17+: isDirty() is async, `dirty` is the
        // synchronous flag.
        if (typeof record.isDirty === "boolean") {
            return record.isDirty;
        }
        return Boolean(record.dirty);
    } catch {
        return false;
    }
}

function legacyViewInfos(entries) {
    const viewInfos = new Map();
    for (const { component } of entries) {
        const adapter = component.controllerRef?.comp;
        const widget = adapter?.widget || adapter?.__widget;
        if (widget && component.viewInfo) {
            viewInfos.set(widget, component.viewInfo);
        }
    }
    return viewInfos;
}

function nearestView(entry) {
    for (let current = entry.parent; current; current = current.parent) {
        if (isA(current.component, "View")) {
            return current;
        }
    }
    return null;
}

/**
 * The controller a View renders. It is not the View's child: View renders
 * WithSearch, and the controller goes in WithSearch's slot, so its parent
 * is WithSearch. View keeps the controller class in `this.Controller`.
 */
function findViewController(entries, viewEntry) {
    const Controller = viewEntry.component.Controller;
    let best = null;
    for (const entry of entries) {
        const component = entry.component;
        const matches =
            typeof Controller === "function" ? component instanceof Controller : Boolean(component.model?.root);
        if (matches && (!best || entry.depth < best.depth) && nearestView(entry) === viewEntry) {
            best = entry;
        }
    }
    return best?.component || null;
}

/**
 * The controller of the active view.
 * @returns {{stack: "owl"|"legacy", controller: any, view: any, viewInfo: any, inDialog: boolean} | null}
 */
export function findActiveController() {
    const root = getRoot();
    if (!root) {
        return null;
    }
    const entries = collectComponents(root);
    if (isOwl2(root)) {
        const views = entries.filter((entry) => entry.el && isA(entry.component, "View"));
        const picked = pickActive(views);
        const controller = picked && findViewController(entries, picked.entry);
        if (controller?.model) {
            return {
                stack: "owl",
                controller,
                view: picked.entry.component,
                viewInfo: null,
                inDialog: picked.inDialog,
            };
        }
    }
    const controllers = collectLegacyWidgets(legacyRootWidgets(entries)).filter(
        (entry) => entry.el && isLegacyController(entry.component)
    );
    const picked = pickActive(controllers);
    if (!picked) {
        return null;
    }
    return {
        stack: "legacy",
        controller: picked.entry.component,
        view: null,
        viewInfo: legacyViewInfos(entries).get(picked.entry.component) || null,
        inDialog: picked.inDialog,
    };
}

function owlContext({ controller, view, inDialog }) {
    const config = controller.env?.config || {};
    const root = controller.model?.root;
    const type = config.viewType || view.props.type || null;
    let record = null;
    let selection = [];
    if (root && "resId" in root && !("records" in root)) {
        record = {
            model: root.resModel || view.props.resModel,
            resId: root.resId || null,
            isNew: Boolean(root.isNew ?? root.isVirtual),
            displayName: safeString(root.data?.display_name),
            dirty: isRecordDirty(root),
        };
    } else if (root && Array.isArray(root.selection)) {
        selection = root.selection.map((selected) => selected.resId).filter(Boolean);
    }
    return {
        inDialog,
        view: {
            id: config.viewId || null,
            type,
            subType: config.viewSubType && config.viewSubType !== type ? config.viewSubType : null,
            model: view.props.resModel,
        },
        record,
        selection,
        context: toPlain(root?.context || view.props.context || {}),
        domain: stringifyExpr(view.props.domain),
    };
}

function legacyContext({ controller, viewInfo, inDialog }) {
    let state = null;
    try {
        state = controller.model.get(controller.handle);
    } catch {
        state = null;
    }
    let record = null;
    let selection = [];
    if (state?.type === "record") {
        record = {
            model: state.model,
            resId: state.res_id || null,
            isNew: !state.res_id,
            displayName: safeString(state.data?.display_name),
            dirty: Boolean(controller.isDirty?.()),
        };
    } else {
        try {
            selection = controller.getSelectedIds?.() || [];
        } catch {
            selection = [];
        }
    }
    return {
        inDialog,
        view: {
            id: viewInfo?.view_id || null,
            type: controller.viewType || viewInfo?.type || null,
            subType: null,
            model: controller.modelName || state?.model || null,
        },
        record,
        selection,
        context: toPlain(state?.context || {}),
        domain: stringifyExpr(state?.domain),
    };
}

/**
 * What the user is looking at: action, view and record (if a form is open).
 * A form in a dialog wins over the main view.
 */
export function getActiveContext() {
    let context = null;
    try {
        const active = findActiveController();
        if (active) {
            context = active.stack === "owl" ? owlContext(active) : legacyContext(active);
        }
    } catch (error) {
        console.debug("[Odoo Dev Tools] Could not read the active view", error);
    }
    const action = describeAction(getServices().action?.currentController);
    const result = {
        action,
        inDialog: false,
        view: null,
        record: null,
        selection: [],
        context: {},
        domain: null,
        ...(context || {}),
    };
    result.signature = JSON.stringify([
        action?.id,
        result.view?.id,
        result.view?.type,
        result.view?.model,
        result.record?.model,
        result.record?.resId,
        result.inDialog,
        result.selection,
    ]);
    return result;
}
