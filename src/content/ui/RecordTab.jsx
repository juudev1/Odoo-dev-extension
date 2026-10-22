import { useEffect, useMemo, useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { MODIFIER_LABELS } from "../../shared/settings.js";
import { externalId, fieldId, fieldsGet, openRecord, readNames, readRecord, reloadView, writeRecord } from "../api.js";
import { focusRecord, notify, notifyError, openModal, store, useStore } from "../store.js";
import { Badge, Button, CopyButton, Empty, ErrorBox, IconButton, JsonView, Properties, Spinner } from "./common.jsx";
import { Icon } from "./icons.jsx";
import { Many2oneEditor } from "./Many2oneEditor.jsx";

const X2MANY = ["one2many", "many2many"];
const EDITABLE = ["char", "text", "html", "integer", "float", "monetary", "boolean", "selection", "many2one", "date", "datetime", "reference"];

/** Record the tab shows: a focused one, else the form's, else the first selected line. */
function useBaseRecord() {
    const context = useStore((state) => state.context);
    const focus = useStore((state) => state.focus);
    if (focus) {
        return { ...focus, focused: true };
    }
    if (context?.record) {
        return {
            model: context.record.model,
            resId: context.record.resId,
            recordName: context.record.displayName,
            isNew: context.record.isNew,
            origin: "view",
        };
    }
    if (context?.selection?.length && context.view?.model) {
        return { model: context.view.model, resId: context.selection[0], origin: "selection" };
    }
    return null;
}

export function RecordTab() {
    const base = useBaseRecord();
    const [stack, setStack] = useState([]);
    const baseKey = base ? `${base.model}:${base.resId}` : "";
    useEffect(() => setStack([]), [baseKey]);

    if (!base) {
        return (
            <Empty icon="database" title={t("noRecordTitle")}>
                {t("noRecordHelp", MODIFIER_LABELS[store.get().settings.inspectModifier])}
            </Empty>
        );
    }
    const current = stack.length ? stack[stack.length - 1] : base;
    const trail = [base, ...stack];
    return (
        <div class="odt-record-tab">
            {(trail.length > 1 || base.focused) && (
                <nav class="odt-breadcrumb">
                    {base.focused && (
                        <button type="button" class="odt-link" onClick={() => focusRecord(null)} title={t("backToView")}>
                            <Icon name="chevronLeft" size={13} /> {t("backToView")}
                        </button>
                    )}
                    {trail.length > 1 &&
                        trail.map((item, index) => (
                            <span key={`${item.model}:${item.resId}:${index}`} class="odt-crumb">
                                {index > 0 && <Icon name="chevronRight" size={12} />}
                                <button
                                    type="button"
                                    class="odt-link"
                                    disabled={index === trail.length - 1}
                                    onClick={() => setStack(stack.slice(0, index))}
                                >
                                    {item.recordName || `${item.model},${item.resId}`}
                                </button>
                            </span>
                        ))}
                </nav>
            )}
            {current.resId ? (
                <RecordView
                    key={`${current.model}:${current.resId}`}
                    model={current.model}
                    resId={current.resId}
                    isViewRecord={!stack.length && base.origin === "view"}
                    onNavigate={(next) => setStack([...stack, next])}
                />
            ) : (
                <Empty icon="info" title={t("newRecordTitle")}>
                    {t("newRecordHelp")}
                </Empty>
            )}
        </div>
    );
}

function plainText(html) {
    const doc = new DOMParser().parseFromString(String(html), "text/html");
    return doc.body.textContent || "";
}

function isEmptyValue(value, type) {
    if (type === "boolean" || type === "integer" || type === "float" || type === "monetary") {
        return false;
    }
    return value === false || value === null || value === "" || (Array.isArray(value) && !value.length);
}

function RecordView({ model, resId, isViewRecord, onNavigate }) {
    const [state, setState] = useState({ loading: true, error: null, fields: {}, values: {}, errors: {} });
    const [filter, setFilter] = useState("");
    const [hideEmpty, setHideEmpty] = useState(false);
    const [sortByName, setSortByName] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [editing, setEditing] = useState(null);
    const [xmlId, setXmlId] = useState(undefined);

    const load = async ({ force = false } = {}) => {
        setState((previous) => ({ ...previous, loading: true, error: null }));
        try {
            const fields = await fieldsGet(model, { force });
            const { values, errors } = await readRecord(model, resId, Object.keys(fields));
            setState({ loading: false, error: null, fields, values, errors });
        } catch (error) {
            setState({ loading: false, error, fields: {}, values: {}, errors: {} });
        }
    };

    useEffect(() => {
        load();
    }, [model, resId]);

    const rows = useMemo(() => {
        const query = filter.trim().toLowerCase();
        const list = Object.entries(state.fields).map(([name, field]) => ({ name, field }));
        return list
            .filter(({ name, field }) => {
                if (query && !name.toLowerCase().includes(query) && !String(field.string || "").toLowerCase().includes(query) && field.type !== query) {
                    return false;
                }
                return !hideEmpty || !isEmptyValue(state.values[name], field.type) || name in state.errors;
            })
            .sort((a, b) =>
                sortByName
                    ? a.name.localeCompare(b.name)
                    : String(a.field.string || a.name).localeCompare(String(b.field.string || b.name))
            );
    }, [state, filter, hideEmpty, sortByName]);

    const save = async (name, value) => {
        try {
            await writeRecord(model, resId, { [name]: value });
            notify(t("fieldSaved", state.fields[name]?.string || name), "success");
            setEditing(null);
            await load();
            if (isViewRecord) {
                const result = await reloadView();
                if (!result?.reloaded && result?.reason === "dirty") {
                    notify(t("viewDirtyNotReloaded"), "warning");
                }
            }
        } catch (error) {
            notifyError(error, t("saveFailed", name));
        }
    };

    const recordName = state.values.display_name;
    return (
        <div class="odt-record">
            <div class="odt-record-head">
                <div class="odt-record-title">
                    <strong class="odt-ellipsis" title={recordName || ""}>{recordName || `${model},${resId}`}</strong>
                    <div class="odt-record-meta">
                        <code>{model}</code>
                        <Badge>id {resId}</Badge>
                        {xmlId === undefined ? (
                            <button type="button" class="odt-link" onClick={async () => setXmlId((await externalId(model, resId).catch(() => null)) || null)}>
                                {t("externalId")}
                            </button>
                        ) : xmlId ? (
                            <span class="odt-xmlid">
                                <code>{xmlId}</code>
                                <CopyButton text={xmlId} />
                            </span>
                        ) : (
                            <span class="odt-muted">{t("noExternalId")}</span>
                        )}
                    </div>
                </div>
                <div class="odt-record-actions">
                    <CopyButton text={`${model},${resId}`} title={t("copyReference")} />
                    <IconButton icon="refresh" title={t("reload")} onClick={() => load({ force: true })} />
                    <IconButton icon="external" title={t("openInOdoo")} onClick={(event) => openRecord(model, resId, { newTab: event.ctrlKey || event.metaKey }).catch(notifyError)} />
                </div>
            </div>

            <div class="odt-filterbar">
                <label class="odt-search">
                    <Icon name="search" size={14} />
                    <input
                        class="odt-input"
                        type="search"
                        placeholder={t("filterFields")}
                        title={t("filterFieldsHelp")}
                        value={filter}
                        onInput={(event) => setFilter(event.currentTarget.value)}
                    />
                </label>
                <label class="odt-check" title={t("hideEmptyHelp")}>
                    <input type="checkbox" checked={hideEmpty} onChange={(event) => setHideEmpty(event.currentTarget.checked)} />
                    {t("hideEmpty")}
                </label>
                <button type="button" class="odt-link" onClick={() => setSortByName(!sortByName)} title={t("sortHelp")}>
                    {sortByName ? t("sortByName") : t("sortByLabel")}
                </button>
            </div>

            {state.loading && !Object.keys(state.fields).length && <Spinner label={t("loadingRecord")} />}
            <ErrorBox error={state.error} title={t("readFailed")} />
            {!state.error && Object.keys(state.fields).length > 0 && (
                <div class="odt-count odt-muted">
                    {t("fieldCount", rows.length, Object.keys(state.fields).length)}
                    {state.loading && <span class="odt-spinner odt-spinner-sm" />}
                </div>
            )}

            <ul class="odt-fields">
                {rows.map(({ name, field }) => (
                    <FieldRow
                        key={name}
                        model={model}
                        resId={resId}
                        name={name}
                        field={field}
                        value={state.values[name]}
                        error={state.errors[name]}
                        expanded={expanded === name}
                        onToggle={() => setExpanded(expanded === name ? null : name)}
                        editing={editing === name}
                        onEdit={() => setEditing(name)}
                        onCancel={() => setEditing(null)}
                        onSave={(value) => save(name, value)}
                        onNavigate={onNavigate}
                    />
                ))}
            </ul>
        </div>
    );
}

function FieldFlags({ field }) {
    return (
        <>
            {field.required && <Badge tone="danger" title={t("required")}>req</Badge>}
            {field.readonly && <Badge title={t("readonly")}>ro</Badge>}
            {field.related && <Badge tone="info" title={`${t("related")}: ${field.related}`}>rel</Badge>}
            {!field.related && field.depends?.length > 0 && <Badge tone="info" title={`${t("computed")}: ${field.depends.join(", ")}`}>cmp</Badge>}
            {field.store === false && <Badge title={t("notStored")}>∅db</Badge>}
            {field.company_dependent && <Badge title={t("companyDependent")}>co</Badge>}
            {field.translate && <Badge title={t("translatable")}>tr</Badge>}
        </>
    );
}

function FieldRow(props) {
    const { model, resId, name, field, value, error, expanded, onToggle, editing, onEdit, onCancel, onSave, onNavigate } = props;
    const canEdit = EDITABLE.includes(field.type) && !error;
    return (
        <li class={`odt-field ${expanded ? "is-expanded" : ""} ${editing ? "is-editing" : ""}`}>
            <div class="odt-field-main">
                <button type="button" class="odt-field-label" onClick={onToggle} title={t("showDefinition")}>
                    <span class="odt-field-string">{field.string || name}</span>
                    <span class="odt-field-tech">
                        <code>{name}</code>
                        <span class="odt-type" title={field.relation || undefined}>{field.type}</span>
                        <FieldFlags field={field} />
                    </span>
                </button>
                <div class="odt-field-value">
                    {error ? (
                        <span class="odt-value-error" title={error}>
                            <Icon name="alert" size={13} /> {error.split("\n")[0]}
                        </span>
                    ) : editing && field.type === "many2one" ? (
                        <Many2oneEditor field={{ ...field, name }} value={value} onSave={onSave} onCancel={onCancel} />
                    ) : editing ? (
                        <FieldEditor field={field} value={value} onSave={onSave} onCancel={onCancel} />
                    ) : (
                        <FieldValue name={name} field={field} value={value} onNavigate={onNavigate} />
                    )}
                </div>
                <div class="odt-field-actions">
                    {canEdit && !editing && <IconButton icon="pencil" size={13} title={t("edit")} onClick={onEdit} />}
                    <IconButton
                        icon="code"
                        size={13}
                        title={t("findInViews")}
                        onClick={() => openModal("xpath", { model, name, tag: "field", path: [], view: viewForXpath(model) })}
                    />
                    <CopyButton text={name} title={t("copyFieldName")} />
                </div>
            </div>
            {expanded && <FieldDefinition model={model} resId={resId} name={name} field={field} value={value} />}
        </li>
    );
}

/** XPath search starts in the active view if it shows this model, else the default form. */
function viewForXpath(model) {
    const view = store.get().context?.view;
    if (view?.model === model) {
        return { id: view.id, type: view.type, model };
    }
    return { id: null, type: "form", model };
}

function FieldValue({ name, field, value, onNavigate }) {
    const [x2many, setX2many] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const type = field.type;

    if (type === "boolean") {
        return <Badge tone={value ? "success" : "neutral"}>{value ? "True" : "False"}</Badge>;
    }
    if (isEmptyValue(value, type)) {
        return <span class="odt-empty-value">{type === "char" || type === "text" ? '""' : "False"}</span>;
    }
    if (type === "many2one" && Array.isArray(value)) {
        const [id, label] = value;
        return (
            <span class="odt-m2o">
                <button type="button" class="odt-link" onClick={() => onNavigate({ model: field.relation, resId: id, recordName: label })} title={t("followRelation")}>
                    {label}
                </button>
                <span class="odt-muted">#{id}</span>
            </span>
        );
    }
    if (X2MANY.includes(type) && Array.isArray(value)) {
        const toggle = async () => {
            if (x2many) {
                setX2many(null);
                return;
            }
            setX2many({ loading: true, records: [] });
            try {
                const records = await readNames(field.relation, value.slice(0, 80));
                setX2many({ loading: false, records });
            } catch (error) {
                setX2many({ loading: false, records: [], error });
            }
        };
        return (
            <div class="odt-x2many">
                <button type="button" class="odt-link" onClick={toggle}>
                    <Icon name={x2many ? "chevronDown" : "chevronRight"} size={12} /> {t("recordCount", value.length)}
                </button>
                <span class="odt-muted odt-mono odt-ellipsis" title={value.join(", ")}>[{value.slice(0, 8).join(", ")}{value.length > 8 ? ", …" : ""}]</span>
                {x2many?.loading && <Spinner />}
                <ErrorBox error={x2many?.error} />
                {x2many?.records?.length > 0 && (
                    <ul class="odt-x2many-list">
                        {x2many.records.map((record) => (
                            <li key={record.id}>
                                <button type="button" class="odt-link" onClick={() => onNavigate({ model: field.relation, resId: record.id, recordName: record.display_name })}>
                                    {record.display_name || `${field.relation},${record.id}`}
                                </button>
                                <span class="odt-muted">#{record.id}</span>
                            </li>
                        ))}
                        {value.length > 80 && <li class="odt-muted">{t("moreRecords", value.length - 80)}</li>}
                    </ul>
                )}
            </div>
        );
    }
    if (type === "selection" && Array.isArray(field.selection)) {
        const option = field.selection.find(([key]) => key === value);
        return (
            <span>
                {option ? option[1] : String(value)} <code class="odt-muted">{JSON.stringify(value)}</code>
            </span>
        );
    }
    if (type === "datetime") {
        return <span class="odt-mono" title={t("utcHelp")}>{value} <span class="odt-muted">UTC</span></span>;
    }
    if (type === "binary") {
        return <span class="odt-muted">{t("binaryValue", String(value))}</span>;
    }
    if (typeof value === "object") {
        return <JsonView value={value} maxHeight="180px" />;
    }
    const text = type === "html" ? plainText(value) : String(value);
    const long = text.length > 240;
    return (
        <span class={`odt-text ${type === "text" || type === "html" ? "is-multiline" : ""}`}>
            {long && !showAll ? `${text.slice(0, 240)}…` : text}
            {long && (
                <button type="button" class="odt-link" onClick={() => setShowAll(!showAll)}>
                    {showAll ? t("showLess") : t("showMore")}
                </button>
            )}
            {type === "html" && <span class="odt-muted"> (html)</span>}
        </span>
    );
}

function initialEditValue(field, value) {
    if (field.type === "boolean") {
        return Boolean(value);
    }
    return value === false || value === null || value === undefined ? "" : String(value);
}

function FieldEditor({ field, value, onSave, onCancel }) {
    const [draft, setDraft] = useState(() => initialEditValue(field, value));
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState(null);

    const parse = () => {
        const text = typeof draft === "string" ? draft.trim() : draft;
        switch (field.type) {
            case "boolean":
                return draft;
            case "integer": {
                if (text === "") {
                    return false;
                }
                const number = Number(text);
                if (!Number.isInteger(number)) {
                    throw new Error(t("invalidInteger"));
                }
                return number;
            }
            case "float":
            case "monetary": {
                if (text === "") {
                    return false;
                }
                const number = Number(text.replace(",", "."));
                if (Number.isNaN(number)) {
                    throw new Error(t("invalidNumber"));
                }
                return number;
            }
            case "selection":
                return draft === "" ? false : draft;
            default:
                return draft === "" ? false : draft;
        }
    };

    const submit = async (event) => {
        event?.preventDefault();
        let parsed;
        try {
            parsed = parse();
        } catch (error) {
            setProblem(error.message);
            return;
        }
        setSaving(true);
        await onSave(parsed);
        setSaving(false);
    };

    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
        }
        const multiline = field.type === "text" || field.type === "html";
        if (event.key === "Enter" && (!multiline || event.ctrlKey || event.metaKey)) {
            submit(event);
        }
    };

    let input;
    if (field.type === "boolean") {
        input = <input type="checkbox" checked={draft} onChange={(event) => setDraft(event.currentTarget.checked)} />;
    } else if (field.type === "selection" && Array.isArray(field.selection)) {
        input = (
            <select class="odt-input" value={draft} onChange={(event) => setDraft(event.currentTarget.value)}>
                <option value="">False</option>
                {field.selection.map(([key, label]) => (
                    <option key={key} value={key}>{label} ({key})</option>
                ))}
            </select>
        );
    } else if (field.type === "text" || field.type === "html") {
        input = <textarea class="odt-input" rows={4} value={draft} onInput={(event) => setDraft(event.currentTarget.value)} onKeyDown={onKeyDown} />;
    } else {
        const placeholder = { date: "YYYY-MM-DD", datetime: "YYYY-MM-DD HH:MM:SS (UTC)", reference: "model,id" }[field.type] || "";
        input = <input class="odt-input" type="text" value={draft} placeholder={placeholder} onInput={(event) => setDraft(event.currentTarget.value)} onKeyDown={onKeyDown} />;
    }
    return (
        <form class="odt-editor" onSubmit={submit}>
            {input}
            <div class="odt-editor-actions">
                <Button small variant="primary" icon="check" type="submit" disabled={saving}>{t("save")}</Button>
                <Button small onClick={onCancel} disabled={saving}>{t("cancel")}</Button>
            </div>
            {problem && <div class="odt-value-error">{problem}</div>}
        </form>
    );
}

function FieldDefinition({ model, name, field, value }) {
    const rows = [
        { label: t("technicalName"), value: name },
        { label: t("type"), value: field.type },
        { label: t("relation"), value: field.relation },
        { label: t("inverseField"), value: field.relation_field },
        { label: t("relatedTo"), value: field.related ? [].concat(field.related).join(".") : null },
        { label: t("dependsOn"), value: field.depends?.length ? field.depends.join(", ") : null },
        { label: t("stored"), value: field.store === undefined ? null : String(field.store) },
        { label: t("required"), value: field.required ? "True" : null },
        { label: t("readonly"), value: field.readonly ? "True" : null },
        { label: t("groups"), value: field.groups },
        { label: t("domain"), value: field.domain && field.domain !== "[]" ? (typeof field.domain === "string" ? field.domain : JSON.stringify(field.domain)) : null },
        { label: t("context"), value: field.context && JSON.stringify(field.context) !== "{}" ? (typeof field.context === "string" ? field.context : JSON.stringify(field.context)) : null },
        { label: t("help"), value: field.help, mono: false },
    ];
    return (
        <div class="odt-field-definition">
            <Properties rows={rows} />
            {Array.isArray(field.selection) && field.selection.length > 0 && (
                <div class="odt-selection">
                    <div class="odt-muted">{t("selectionValues")}</div>
                    <ul>
                        {field.selection.map(([key, label]) => (
                            <li key={key}>
                                <code>{key}</code> {label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div class="odt-muted odt-raw-label">{t("rawValue")}</div>
            <JsonView value={value === undefined ? null : value} maxHeight="160px" />
            <div class="odt-definition-actions">
                <Button small icon="external" onClick={() => openFieldDefinition(model, name)}>{t("openFieldDefinition")}</Button>
            </div>
        </div>
    );
}

async function openFieldDefinition(model, name) {
    try {
        const id = await fieldId(model, name);
        if (id) {
            await openRecord("ir.model.fields", id);
        } else {
            notify(t("fieldDefinitionNotFound"), "warning");
        }
    } catch (error) {
        notifyError(error);
    }
}
