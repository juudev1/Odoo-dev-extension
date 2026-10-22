import { findActiveController, isRecordDirty } from "./context.js";
import { getCookie, getModule, getServices } from "./odoo.js";

/** URL of a record's form. 17.2+ still accept this format and redirect it. */
export function recordUrl(model, resId) {
    const hash = new URLSearchParams({ id: String(resId), model, view_type: "form" });
    return `/web#${hash.toString()}`;
}

export async function doAction(action, options = {}) {
    const service = getServices().action;
    if (!service) {
        throw new Error("The action service is not available");
    }
    await service.doAction(action, options);
    return true;
}

export function openRecord({ model, resId, target = "current" }) {
    return doAction({
        type: "ir.actions.act_window",
        res_model: model,
        res_id: resId,
        views: [[false, "form"]],
        target,
    });
}

/**
 * Reloads the active view after a write made by the extension, so Odoo shows
 * the new values. A form with unsaved changes is left alone.
 */
export async function reloadActiveView() {
    const active = findActiveController();
    if (!active) {
        return { reloaded: false, reason: "no-view" };
    }
    if (active.stack === "legacy") {
        if (active.controller.isDirty?.()) {
            return { reloaded: false, reason: "dirty" };
        }
        await active.controller.reload();
        return { reloaded: true };
    }
    const model = active.controller.model;
    const root = model?.root;
    if (!root?.load) {
        return { reloaded: false, reason: "no-record" };
    }
    if (isRecordDirty(root)) {
        return { reloaded: false, reason: "dirty" };
    }
    await root.load();
    // 16 renders on notify(); 17+ re-render through reactivity.
    model.notify?.();
    return { reloaded: true };
}

/**
 * Dark mode is an Enterprise feature (web_enterprise, 16+). 16 to 18 expose
 * switchToColorScheme on the service; 19 stores it in the user settings.
 */
export function colorSchemeInfo() {
    const service = getServices().color_scheme;
    return {
        supported: Boolean(service),
        current: getCookie("color_scheme") || "light",
    };
}

export async function toggleColorScheme() {
    const service = getServices().color_scheme;
    if (!service) {
        throw new Error("Dark mode is not available in this database");
    }
    const next = (getCookie("color_scheme") || "light") === "dark" ? "light" : "dark";
    if (typeof service.switchToColorScheme === "function") {
        service.switchToColorScheme(next);
        return next;
    }
    const user = getModule("@web/core/user")?.user;
    if (user?.setUserSettings) {
        await user.setUserSettings("color_scheme", next);
    }
    document.cookie = `color_scheme=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
    return next;
}
