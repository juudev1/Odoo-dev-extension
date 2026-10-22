import { getUserContext } from "./odoo.js";

// Captured at load time: a later override of window.fetch by the page (tests,
// tours) must not intercept the extension's calls.
const nativeFetch = window.fetch.bind(window);
let nextId = 1;

export class RpcError extends Error {
    constructor(error) {
        const data = error.data || {};
        super(data.message || error.message || "RPC error");
        this.name = "RpcError";
        this.code = error.code;
        this.exceptionName = data.name || "";
        this.debug = data.debug || "";
        this.arguments = data.arguments || [];
    }
}

/** JSON-RPC 2.0 over the same endpoints the web client uses (15 to 19). */
export async function jsonRpc(url, params = {}) {
    const response = await nativeFetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: nextId++, params }),
    });
    if (!response.ok) {
        throw new RpcError({ message: `HTTP ${response.status} ${response.statusText}` });
    }
    const data = await response.json();
    if (data.error) {
        throw new RpcError(data.error);
    }
    return data.result;
}

export function callKw(model, method, args = [], kwargs = {}) {
    const context = { ...getUserContext(), ...(kwargs.context || {}) };
    return jsonRpc(`/web/dataset/call_kw/${model}/${method}`, {
        model,
        method,
        args,
        kwargs: { ...kwargs, context },
    });
}
