import { TO_CONTENT, TO_PAGE, isBridgeMessage, postBridgeMessage } from "../shared/protocol.js";

const pending = new Map();
const listeners = new Map();
let nextId = 1;

export class PageError extends Error {
    constructor(error) {
        super(error?.message || "Error");
        this.name = "PageError";
        this.exceptionName = error?.exceptionName || "";
        this.debug = error?.debug || "";
        this.code = error?.code;
    }
}

window.addEventListener("message", (event) => {
    if (!isBridgeMessage(event, TO_CONTENT)) {
        return;
    }
    const data = event.data;
    if (data.type === "response") {
        const request = pending.get(data.id);
        if (request) {
            pending.delete(data.id);
            clearTimeout(request.timer);
            data.ok ? request.resolve(data.result) : request.reject(new PageError(data.error));
        }
    } else if (data.type === "event") {
        for (const callback of listeners.get(data.name) || []) {
            try {
                callback(data.payload);
            } catch (error) {
                console.error("[Odoo Dev Tools]", error);
            }
        }
    }
});

/** Calls a handler of page.js. */
export function request(method, params = {}, { timeout = 60000 } = {}) {
    const id = `${Date.now()}-${nextId++}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new PageError({ message: `No answer from the page for "${method}"` }));
        }, timeout);
        pending.set(id, { resolve, reject, timer });
        postBridgeMessage(TO_PAGE, { type: "request", id, method, params });
    });
}

export function onPageEvent(name, callback) {
    if (!listeners.has(name)) {
        listeners.set(name, new Set());
    }
    listeners.get(name).add(callback);
    return () => listeners.get(name).delete(callback);
}

export function rpc(model, method, args = [], kwargs = {}) {
    return request("rpc", { model, method, args, kwargs });
}
