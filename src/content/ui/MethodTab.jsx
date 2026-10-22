import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { MAX_HISTORY, loadHistory, saveHistory } from "../../shared/settings.js";
import { callMethod } from "../api.js";
import { notify, useStore } from "../store.js";
import { Button, CodeBlock, ErrorBox, IconButton, JsonView, Section } from "./common.jsx";

function parseJson(text, fallback, kind) {
    const trimmed = text.trim();
    if (!trimmed) {
        return fallback;
    }
    try {
        return JSON.parse(trimmed);
    } catch (error) {
        throw new Error(t("invalidJson", kind, error.message));
    }
}

function useCurrentRecord() {
    const context = useStore((state) => state.context);
    const focus = useStore((state) => state.focus);
    if (focus?.resId) {
        return { model: focus.model, resId: focus.resId };
    }
    if (context?.record?.resId) {
        return { model: context.record.model, resId: context.record.resId };
    }
    return { model: context?.view?.model || context?.action?.resModel || "", resId: null, selection: context?.selection || [] };
}

export function MethodTab() {
    const current = useCurrentRecord();
    const [model, setModel] = useState(current.model);
    const [method, setMethod] = useState("");
    const [args, setArgs] = useState("[]");
    const [kwargs, setKwargs] = useState("{}");
    const [onRecord, setOnRecord] = useState(true);
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadHistory().then(setHistory);
    }, []);
    // Follow the active record while the user has not typed another model.
    const autoModel = useRef(current.model);
    useEffect(() => {
        setModel((previous) => (!previous || previous === autoModel.current ? current.model : previous));
        autoModel.current = current.model;
    }, [current.model]);

    const ids = current.resId && model === current.model ? [current.resId] : current.selection?.length && model === current.model ? current.selection : [];
    const useIds = onRecord && ids.length > 0;

    const preview = useMemo(() => {
        let parsedArgs;
        let parsedKwargs;
        try {
            parsedArgs = parseJson(args, [], "args");
            parsedKwargs = parseJson(kwargs, {}, "kwargs");
        } catch (error) {
            return `// ${error.message}`;
        }
        const finalArgs = useIds ? [ids, ...(Array.isArray(parsedArgs) ? parsedArgs : [parsedArgs])] : parsedArgs;
        const python = `env[${JSON.stringify(model || "model")}]${useIds ? `.browse(${JSON.stringify(ids)})` : ""}.${method || "method"}(${[
            ...(Array.isArray(parsedArgs) ? parsedArgs.map((arg) => JSON.stringify(arg)) : []),
            ...Object.entries(parsedKwargs || {}).map(([key, value]) => `${key}=${JSON.stringify(value)}`),
        ].join(", ")})`;
        const js = `await this.env.services.orm.call(\n    ${JSON.stringify(model || "model")},\n    ${JSON.stringify(method || "method")},\n    ${JSON.stringify(finalArgs)},\n    ${JSON.stringify(parsedKwargs)}\n);`;
        return `# Python (shell)\n${python}\n\n// JavaScript (OWL)\n${js}`;
    }, [model, method, args, kwargs, useIds, ids.join(",")]);

    const run = async (event) => {
        event?.preventDefault();
        const name = method.trim();
        if (!model.trim() || !name) {
            notify(t("modelAndMethodRequired"), "warning");
            return;
        }
        if (name.startsWith("_")) {
            notify(t("privateMethod"), "warning");
            return;
        }
        let parsedArgs;
        let parsedKwargs;
        try {
            parsedArgs = parseJson(args, [], "args");
            parsedKwargs = parseJson(kwargs, {}, "kwargs");
            if (!Array.isArray(parsedArgs)) {
                throw new Error(t("argsMustBeArray"));
            }
            if (typeof parsedKwargs !== "object" || Array.isArray(parsedKwargs) || parsedKwargs === null) {
                throw new Error(t("kwargsMustBeObject"));
            }
        } catch (error) {
            setOutput({ error });
            return;
        }
        setRunning(true);
        setOutput(null);
        const started = performance.now();
        try {
            const result = await callMethod(model.trim(), name, useIds ? [ids, ...parsedArgs] : parsedArgs, parsedKwargs);
            setOutput({ result, ms: Math.round(performance.now() - started) });
        } catch (error) {
            setOutput({ error, ms: Math.round(performance.now() - started) });
        } finally {
            setRunning(false);
        }
        const entry = { model: model.trim(), method: name, args, kwargs, onRecord: useIds, at: Date.now() };
        const next = [entry, ...history.filter((item) => !(item.model === entry.model && item.method === entry.method && item.args === entry.args && item.kwargs === entry.kwargs))].slice(0, MAX_HISTORY);
        setHistory(next);
        saveHistory(next);
    };

    const onKeyDown = (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            run(event);
        }
    };

    const apply = (entry) => {
        setModel(entry.model);
        setMethod(entry.method);
        setArgs(entry.args);
        setKwargs(entry.kwargs);
        setOnRecord(entry.onRecord);
    };

    return (
        <div class="odt-method-tab">
            <form class="odt-form" onSubmit={run} onKeyDown={onKeyDown}>
                <label class="odt-field-input">
                    <span>{t("model")}</span>
                    <input class="odt-input odt-mono" value={model} onInput={(event) => setModel(event.currentTarget.value)} placeholder="res.partner" spellcheck={false} />
                </label>
                <label class="odt-field-input">
                    <span>{t("method")}</span>
                    <input class="odt-input odt-mono" value={method} onInput={(event) => setMethod(event.currentTarget.value)} placeholder="action_confirm" spellcheck={false} autoFocus />
                </label>
                <label class={`odt-check ${ids.length ? "" : "is-disabled"}`}>
                    <input type="checkbox" checked={useIds} disabled={!ids.length} onChange={(event) => setOnRecord(event.currentTarget.checked)} />
                    {ids.length ? t("callOnRecords", JSON.stringify(ids)) : t("callOnModel")}
                </label>
                <label class="odt-field-input">
                    <span>{t("positionalArgs")} <code class="odt-muted">args</code></span>
                    <textarea class="odt-input odt-mono" rows={2} value={args} onInput={(event) => setArgs(event.currentTarget.value)} spellcheck={false} />
                </label>
                <label class="odt-field-input">
                    <span>{t("keywordArgs")} <code class="odt-muted">kwargs</code></span>
                    <textarea class="odt-input odt-mono" rows={2} value={kwargs} onInput={(event) => setKwargs(event.currentTarget.value)} spellcheck={false} />
                </label>
                <div class="odt-form-actions">
                    <Button variant="primary" icon="play" type="submit" disabled={running}>
                        {running ? t("running") : t("run")}
                    </Button>
                    <span class="odt-muted">Ctrl+Enter</span>
                </div>
            </form>

            <Section title={t("callPreview")} icon="code" collapsible defaultOpen={false}>
                <CodeBlock code={preview} />
            </Section>

            {output && (
                <Section title={output.error ? t("error") : t("result")} icon={output.error ? "alert" : "check"} actions={output.ms !== undefined && <span class="odt-muted">{output.ms} ms</span>}>
                    {output.error ? <ErrorBox error={output.error} /> : <JsonView value={output.result === undefined ? null : output.result} maxHeight="360px" />}
                </Section>
            )}

            <Section
                title={t("history")}
                icon="history"
                collapsible
                actions={history.length > 0 && <IconButton icon="trash" size={13} title={t("clearHistory")} onClick={() => { setHistory([]); saveHistory([]); }} />}
            >
                {history.length ? (
                    <ul class="odt-history">
                        {history.map((entry) => (
                            <li key={`${entry.at}`}>
                                <button type="button" class="odt-history-item" onClick={() => apply(entry)} title={t("useAgain")}>
                                    <code>{entry.model}.{entry.method}</code>
                                    <span class="odt-muted odt-mono odt-ellipsis">{entry.args} {entry.kwargs !== "{}" ? entry.kwargs : ""}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div class="odt-muted">{t("noHistory")}</div>
                )}
            </Section>
        </div>
    );
}
