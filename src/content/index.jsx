/**
 * Content script (ISOLATED world). Owns the UI and the extension storage;
 * reads Odoo through page.js. Its errors stay in this world and never reach
 * Odoo's error dialogs.
 */
import { render } from "preact";

import { ext } from "../shared/ext.js";
import {
    isHostEnabled,
    loadBackgroundImage,
    loadSettings,
    loadUiState,
    migrateLegacyStorage,
    onStorageChanged,
} from "../shared/settings.js";
import { getContext, setVersion } from "./api.js";
import { applyBackground } from "./background.js";
import { onPageEvent, request } from "./bridge.js";
import { focusRecord, store } from "./store.js";
import { App } from "./ui/App.jsx";
import styles from "./ui/styles.css";

const HOST_ID = "odoo-dev-tools-host";
const host = window.location.host;

let mounted = false;
let backgroundImage = null;

/** Waits for page.js; resolves with its answer, or null if this is not Odoo. */
function hello() {
    return new Promise((resolve) => {
        let done = false;
        const finish = (info) => {
            if (!done) {
                done = true;
                resolve(info);
            }
        };
        request("hello", {}, { timeout: 25000 }).then(finish, () => finish(null));
        // page.js may load after this script: it announces itself when ready.
        onPageEvent("ready", () => request("hello", {}, { timeout: 5000 }).then(finish, () => {}));
    });
}

function mount() {
    if (mounted) {
        return;
    }
    mounted = true;
    const element = document.createElement("div");
    element.id = HOST_ID;
    // Outside <body>: OWL 1 (15) renders the web client with body as its root.
    document.documentElement.appendChild(element);
    const shadow = element.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles;
    shadow.appendChild(style);
    const root = document.createElement("div");
    shadow.appendChild(root);
    render(<App />, root);
}

function unmount() {
    if (!mounted) {
        return;
    }
    mounted = false;
    const element = document.getElementById(HOST_ID);
    if (element?.shadowRoot) {
        render(null, element.shadowRoot.lastChild);
    }
    element?.remove();
    document.getElementById("odoo-dev-tools-dock")?.remove();
}

/** Tells page.js what to do, from the settings and the panel state. */
function configurePage() {
    const { settings, ui } = store.get();
    const active = isHostEnabled(settings, host);
    request("configure", {
        inspectModifier: active ? settings.inspectModifier : null,
        followRowClicks: active && ui.panelOpen && settings.followRowClicks,
        watchContext: active && ui.panelOpen,
    }).catch(() => {});
}

function applyState() {
    const { settings } = store.get();
    const active = isHostEnabled(settings, host);
    active ? mount() : unmount();
    applyBackground(active && settings.backgroundEnabled, backgroundImage);
    configurePage();
}

async function refreshContext() {
    try {
        store.set({ context: await getContext() });
    } catch {
        // The page may be navigating; the next event will update it.
    }
}

async function boot() {
    if (window.__odooDevToolsContent) {
        return;
    }
    window.__odooDevToolsContent = true;

    const info = await hello();
    if (!info?.backend) {
        return;
    }
    await migrateLegacyStorage().catch(() => {});
    const [settings, ui] = await Promise.all([loadSettings(), loadUiState()]);
    backgroundImage = await loadBackgroundImage();
    setVersion(info.version);
    store.set({ odoo: info, settings, ui });

    onPageEvent("context", (context) => store.set({ context }));
    onPageEvent("inspect", (inspector) => store.set({ inspector }));
    onPageEvent("row-focus", (row) => {
        if (store.get().ui.panelOpen && row.resId) {
            focusRecord({ ...row, origin: "row" });
        }
    });

    let previous = store.get();
    store.subscribe((state) => {
        // Updated first: the actions below change the store again, which
        // calls this subscriber again before it returns.
        const before = previous;
        previous = state;
        if (state.ui.panelOpen !== before.ui.panelOpen) {
            configurePage();
            if (state.ui.panelOpen) {
                refreshContext();
            } else {
                focusRecord(null);
            }
        }
    });

    onStorageChanged((changes) => {
        if (changes.settings) {
            store.set({ settings: { ...store.get().settings, ...changes.settings } });
        }
        if ("background" in changes) {
            backgroundImage = changes.background || null;
        }
        if (changes.settings || "background" in changes) {
            applyState();
        }
    });

    // The popup asks the active tab what it is.
    ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === "odoo-dev-tools/status") {
            sendResponse({ backend: true, host, version: info.version, db: info.db });
        }
        return false;
    });

    applyState();
    refreshContext();
}

boot();
