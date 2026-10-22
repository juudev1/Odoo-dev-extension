/**
 * Page script (MAIN world). Reads the Odoo web client and answers the
 * content script. It never patches Odoo: if something it reads is missing in
 * a version, that feature fails alone and Odoo keeps working.
 *
 * Every handler catches its own errors: an uncaught error here would reach
 * Odoo's error service and open an error dialog in debug mode.
 */
import { ANCHOR_ATTRIBUTE, TO_CONTENT, TO_PAGE, isBridgeMessage, postBridgeMessage } from "../shared/protocol.js";
import { colorSchemeInfo, doAction, openRecord, recordUrl, reloadActiveView, toggleColorScheme } from "./actions.js";
import { getActiveContext } from "./context.js";
import { inspectElement } from "./inspect.js";
import {
    getDebugMode,
    getEnv,
    getOdoo,
    getUserInfo,
    getVersion,
    waitForWebClient,
} from "./odoo.js";
import { RpcError, callKw } from "./rpc.js";

const HOST_ID = "odoo-dev-tools-host";

const config = {
    inspectModifier: null, // null while the content script has not armed it
    followRowClicks: false,
    watchContext: false,
};

let isBackend = false;
let anchorCounter = 0;
let lastSignature = null;
let watchTimer = null;

function emit(name, payload) {
    postBridgeMessage(TO_CONTENT, { type: "event", name, payload: clean(payload) });
}

/** Guarantees the payload can be cloned by postMessage (no proxies). */
function clean(value) {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function serializeError(error) {
    if (error instanceof RpcError) {
        return {
            message: error.message,
            exceptionName: error.exceptionName,
            debug: error.debug,
            code: error.code,
        };
    }
    return { message: String(error?.message || error) };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const handlers = {
    async hello() {
        if (!getOdoo()) {
            return { backend: false };
        }
        isBackend = await waitForWebClient();
        if (!isBackend) {
            return { backend: false };
        }
        const odoo = getOdoo();
        return {
            backend: true,
            version: getVersion(),
            db: odoo.info?.db || null,
            user: getUserInfo(),
            debug: getDebugMode(),
            colorScheme: colorSchemeInfo(),
        };
    },

    configure(params) {
        Object.assign(config, params || {});
        setupContextWatch();
        return true;
    },

    getContext() {
        return getActiveContext();
    },

    rpc({ model, method, args, kwargs }) {
        return callKw(model, method, args, kwargs);
    },

    async openRecord({ model, resId, newTab }) {
        if (newTab) {
            window.open(recordUrl(model, resId), "_blank", "noopener");
            return true;
        }
        return openRecord({ model, resId });
    },

    doAction({ action, options }) {
        return doAction(action, options);
    },

    reloadView() {
        return reloadActiveView();
    },

    toggleColorScheme() {
        return toggleColorScheme();
    },
};

function onMessage(event) {
    if (!isBridgeMessage(event, TO_PAGE) || event.data.type !== "request") {
        return;
    }
    const { id, method, params } = event.data;
    const handler = handlers[method];
    Promise.resolve()
        .then(() => {
            if (!handler) {
                throw new Error(`Unknown method: ${method}`);
            }
            if (method !== "hello" && !isBackend) {
                throw new Error("Not an Odoo web client");
            }
            return handler(params || {});
        })
        .then(
            (result) => postBridgeMessage(TO_CONTENT, { type: "response", id, ok: true, result: clean(result) }),
            (error) => postBridgeMessage(TO_CONTENT, { type: "response", id, ok: false, error: serializeError(error) })
        )
        .catch((error) => {
            // clean() failed: the result could not be serialized.
            postBridgeMessage(TO_CONTENT, { type: "response", id, ok: false, error: serializeError(error) });
        });
}

// ---------------------------------------------------------------------------
// Inspector: modifier + right click
// ---------------------------------------------------------------------------

function modifierPressed(event) {
    switch (config.inspectModifier) {
        case "ctrl":
            return event.ctrlKey || event.metaKey;
        case "alt":
            return event.altKey;
        case "shift":
            return event.shiftKey;
        default:
            return false;
    }
}

function markAnchor(element) {
    for (const previous of document.querySelectorAll(`[${ANCHOR_ATTRIBUTE}]`)) {
        previous.removeAttribute(ANCHOR_ATTRIBUTE);
    }
    if (!element) {
        return null;
    }
    const id = String(++anchorCounter);
    element.setAttribute(ANCHOR_ATTRIBUTE, id);
    return id;
}

function onContextMenu(event) {
    if (!isBackend || !config.inspectModifier || !modifierPressed(event)) {
        return;
    }
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target || target.closest(`#${HOST_ID}`)) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    let result = null;
    let error = null;
    try {
        result = inspectElement(target);
    } catch (caught) {
        error = String(caught?.message || caught);
        console.debug("[Odoo Dev Tools] Inspection failed", caught);
    }
    const anchor = markAnchor(result?.element || target);
    try {
        emit("inspect", {
            descriptor: result?.descriptor || null,
            error,
            anchor,
            x: event.clientX,
            y: event.clientY,
        });
    } catch (caught) {
        emit("inspect", { descriptor: null, error: String(caught?.message || caught), anchor, x: event.clientX, y: event.clientY });
    }
}

// ---------------------------------------------------------------------------
// One2many/many2many line clicked: show it in the panel
// ---------------------------------------------------------------------------

function onClick(event) {
    if (!isBackend || !config.followRowClicks) {
        return;
    }
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest(".o_field_x2many .o_data_row, .o_field_one2many .o_data_row, .o_field_many2many .o_data_row");
    if (!row) {
        return;
    }
    try {
        const result = inspectElement(row.querySelector("td.o_data_cell") || row);
        const descriptor = result?.descriptor;
        if (descriptor?.model) {
            emit("row-focus", {
                model: descriptor.model,
                resId: descriptor.resId,
                isNew: descriptor.isNew,
                recordName: descriptor.recordName,
                path: descriptor.path,
            });
        }
    } catch (error) {
        console.debug("[Odoo Dev Tools] Could not read the clicked line", error);
    }
}

// ---------------------------------------------------------------------------
// Active context: pushed to the panel while it is open
// ---------------------------------------------------------------------------

function pushContextIfChanged() {
    let context;
    try {
        context = getActiveContext();
    } catch (error) {
        console.debug("[Odoo Dev Tools] Could not read the active context", error);
        return;
    }
    if (context && context.signature !== lastSignature) {
        lastSignature = context.signature;
        emit("context", context);
    }
}

let busSubscribed = false;

function setupContextWatch() {
    clearInterval(watchTimer);
    watchTimer = null;
    if (!config.watchContext) {
        lastSignature = null;
        return;
    }
    pushContextIfChanged();
    // The record changes without any bus event when the user uses the pager
    // or saves a new record: a cheap poll catches those.
    watchTimer = setInterval(pushContextIfChanged, 700);
    if (!busSubscribed) {
        const bus = getEnv()?.bus;
        const listener = () => setTimeout(() => config.watchContext && pushContextIfChanged(), 50);
        if (bus?.addEventListener) {
            bus.addEventListener("ACTION_MANAGER:UI-UPDATED", listener);
            busSubscribed = true;
        } else if (bus?.on) {
            // OWL 1 event bus (15)
            bus.on("ACTION_MANAGER:UI-UPDATED", null, listener);
            busSubscribed = true;
        }
    }
}

// ---------------------------------------------------------------------------

(function start() {
    if (window.__odooDevToolsPage) {
        return;
    }
    window.__odooDevToolsPage = true;
    // Answers "not Odoo" right away on other sites instead of letting the
    // content script wait for a timeout.
    window.addEventListener("message", onMessage);
    if (!getOdoo()) {
        return;
    }
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("click", onClick, true);
    waitForWebClient().then((backend) => {
        isBackend = backend;
        if (backend) {
            emit("ready", null);
        }
    });
})();
