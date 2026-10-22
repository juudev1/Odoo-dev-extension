import { ext } from "./ext.js";

export const DEFAULT_SETTINGS = {
    enabled: true,
    // Hostnames (with port) where the user switched the extension off.
    disabledHosts: [],
    // Modifier that turns a right click into "inspect": ctrl | alt | shift.
    inspectModifier: "ctrl",
    // Clicking a line of a one2many/many2many list shows that line in the panel.
    followRowClicks: true,
    showLauncher: true,
    backgroundEnabled: true,
    // auto follows Odoo's color scheme; light/dark force the panel's theme.
    theme: "auto",
};

export const DEFAULT_UI_STATE = {
    panelOpen: false,
    panelWidth: 460,
    panelDocked: false,
    activeTab: "record",
};

const KEYS = {
    settings: "settings",
    uiState: "uiState",
    background: "backgroundImage",
    history: "methodHistory",
};

export const MAX_HISTORY = 25;

async function read(key) {
    const result = await ext.storage.local.get(key);
    return result[key];
}

function write(key, value) {
    return ext.storage.local.set({ [key]: value });
}

export async function loadSettings() {
    return { ...DEFAULT_SETTINGS, ...((await read(KEYS.settings)) || {}) };
}

export async function saveSettings(patch) {
    const settings = { ...(await loadSettings()), ...patch };
    await write(KEYS.settings, settings);
    return settings;
}

export async function loadUiState() {
    return { ...DEFAULT_UI_STATE, ...((await read(KEYS.uiState)) || {}) };
}

export async function saveUiState(patch) {
    const state = { ...(await loadUiState()), ...patch };
    await write(KEYS.uiState, state);
    return state;
}

export async function loadBackgroundImage() {
    return (await read(KEYS.background)) || null;
}

export function saveBackgroundImage(dataUrl) {
    return dataUrl ? write(KEYS.background, dataUrl) : ext.storage.local.remove(KEYS.background);
}

export async function loadHistory() {
    const history = await read(KEYS.history);
    return Array.isArray(history) ? history : [];
}

export function saveHistory(history) {
    return write(KEYS.history, history.slice(0, MAX_HISTORY));
}

/**
 * Calls `callback(changes)` with the keys of this module that changed, mapped
 * to their new value.
 */
export function onStorageChanged(callback) {
    const listener = (changes, area) => {
        if (area !== "local") {
            return;
        }
        const relevant = {};
        for (const [name, key] of Object.entries(KEYS)) {
            if (key in changes) {
                relevant[name] = changes[key].newValue;
            }
        }
        if (Object.keys(relevant).length) {
            callback(relevant);
        }
    };
    ext.storage.onChanged.addListener(listener);
    return () => ext.storage.onChanged.removeListener(listener);
}

export const MODIFIER_LABELS = { ctrl: "Ctrl", alt: "Alt", shift: "Shift" };

export function isHostEnabled(settings, host) {
    return settings.enabled && !settings.disabledHosts.includes(host);
}

/**
 * Version 1 stored each value under its own key. Moves them to the new keys
 * once and removes the old ones.
 */
export async function migrateLegacyStorage() {
    const legacy = await ext.storage.local.get([
        "odooDevExtensionEnabled",
        "odooDevEnableBackground",
        "odoo_bg",
    ]);
    if (!Object.keys(legacy).length) {
        return;
    }
    const patch = {};
    if (legacy.odooDevExtensionEnabled === false) {
        patch.enabled = false;
    }
    if (legacy.odooDevEnableBackground === false) {
        patch.backgroundEnabled = false;
    }
    if (Object.keys(patch).length) {
        await saveSettings(patch);
    }
    if (legacy.odoo_bg && !(await loadBackgroundImage())) {
        await saveBackgroundImage(legacy.odoo_bg);
    }
    await ext.storage.local.remove(Object.keys(legacy));
}
