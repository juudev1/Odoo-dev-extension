import { useEffect, useState } from "preact/hooks";

import { t } from "../shared/i18n.js";
import { DEFAULT_SETTINGS, DEFAULT_UI_STATE, saveUiState } from "../shared/settings.js";

function createStore(initial) {
    let state = initial;
    const subscribers = new Set();
    return {
        get: () => state,
        set(patch) {
            const next = typeof patch === "function" ? patch(state) : patch;
            state = { ...state, ...next };
            for (const subscriber of subscribers) {
                subscriber(state);
            }
        },
        subscribe(subscriber) {
            subscribers.add(subscriber);
            return () => subscribers.delete(subscriber);
        },
    };
}

export const store = createStore({
    odoo: null, // answer of page.js "hello"
    settings: DEFAULT_SETTINGS,
    ui: DEFAULT_UI_STATE,
    context: null, // active action/view/record
    focus: null, // record shown instead of the active one: { model, resId, recordName, origin }
    inspector: null, // { descriptor, error, anchor, x, y }
    modal: null, // { type, props }
    toasts: [],
});

/** Re-renders when the selected slice changes (compared with Object.is). */
export function useStore(selector) {
    const [value, setValue] = useState(() => selector(store.get()));
    useEffect(() => {
        setValue(() => selector(store.get()));
        return store.subscribe((state) => {
            const next = selector(state);
            setValue((previous) => (Object.is(previous, next) ? previous : next));
        });
    }, []);
    return value;
}

let saveTimer = null;

/**
 * Saved right away so a reload just after a change keeps it; `debounce` is
 * for continuous changes such as dragging the panel's width.
 */
export function setUi(patch, { debounce = false } = {}) {
    store.set((state) => ({ ui: { ...state.ui, ...patch } }));
    clearTimeout(saveTimer);
    if (debounce) {
        saveTimer = setTimeout(() => saveUiState(store.get().ui), 300);
    } else {
        saveUiState(store.get().ui);
    }
}

let toastId = 0;

export function notify(message, type = "info", { sticky = false, detail = null } = {}) {
    const id = ++toastId;
    store.set((state) => ({ toasts: [...state.toasts, { id, message, type, detail }] }));
    if (!sticky) {
        setTimeout(() => dismissToast(id), type === "danger" ? 7000 : 3500);
    }
    return id;
}

export function dismissToast(id) {
    store.set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
}

export function notifyError(error, prefix = "") {
    const message = error?.message || String(error);
    notify(prefix ? `${prefix}: ${message}` : message, "danger", {
        detail: error?.debug || null,
    });
}

export function openPanel(tab) {
    setUi(tab ? { panelOpen: true, activeTab: tab } : { panelOpen: true });
}

export function focusRecord(focus) {
    store.set({ focus });
}

export function openModal(type, props = {}) {
    store.set({ modal: { type, props } });
}

export function closeModal() {
    store.set({ modal: null });
}

export async function copyText(text, message) {
    try {
        await navigator.clipboard.writeText(text);
        notify(message, "success");
    } catch {
        // Clipboard API can be blocked (insecure origin, no focus): fallback.
        const area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.documentElement.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        notify(ok ? message : t("clipboardUnavailable"), ok ? "success" : "danger");
    }
}
