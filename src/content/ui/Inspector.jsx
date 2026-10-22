import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { ANCHOR_ATTRIBUTE } from "../../shared/protocol.js";
import { actionXmlId, fieldId, openRecord } from "../api.js";
import { focusRecord, notify, notifyError, openModal, openPanel, store, useStore } from "../store.js";
import { Badge, Button, CopyButton, JsonView, Properties } from "./common.jsx";
import { Icon } from "./icons.jsx";

const WIDTH = 420;
const MARGIN = 12;

function close() {
    store.set({ inspector: null });
}

function useAnchorRect(anchor) {
    const [rect, setRect] = useState(null);
    useEffect(() => {
        if (!anchor) {
            setRect(null);
            return;
        }
        const element = document.querySelector(`[${ANCHOR_ATTRIBUTE}="${anchor}"]`);
        if (!element) {
            setRect(null);
            return;
        }
        let frame = null;
        const update = () => {
            frame = null;
            if (!element.isConnected) {
                setRect(null);
                return;
            }
            const next = element.getBoundingClientRect();
            setRect((previous) =>
                previous && previous.top === next.top && previous.left === next.left && previous.width === next.width && previous.height === next.height
                    ? previous
                    : { top: next.top, left: next.left, width: next.width, height: next.height, bottom: next.bottom, right: next.right }
            );
        };
        const schedule = () => {
            if (frame === null) {
                frame = requestAnimationFrame(update);
            }
        };
        update();
        window.addEventListener("scroll", schedule, true);
        window.addEventListener("resize", schedule);
        const observer = new ResizeObserver(schedule);
        observer.observe(element);
        return () => {
            window.removeEventListener("scroll", schedule, true);
            window.removeEventListener("resize", schedule);
            observer.disconnect();
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }
        };
    }, [anchor]);
    return rect;
}

function Modifier({ label, expr, value }) {
    if (!expr && value === null) {
        return null;
    }
    const always = expr === "True" || expr === "1" || expr === "true";
    const never = !expr || expr === "False" || expr === "0" || expr === "false";
    return (
        <div class="odt-modifier">
            <span class="odt-modifier-label">{label}</span>
            {!always && !never && <code class="odt-modifier-expr">{expr}</code>}
            {value !== null && value !== undefined ? (
                <Badge tone={value ? "accent" : "neutral"}>{value ? "True" : "False"}</Badge>
            ) : (
                <Badge>{always ? "True" : never ? "False" : "?"}</Badge>
            )}
        </div>
    );
}

function showInPanel(descriptor) {
    focusRecord({
        model: descriptor.model,
        resId: descriptor.resId,
        recordName: descriptor.recordName,
        origin: "inspector",
    });
    openPanel("record");
    close();
}

function openXpath(descriptor, tag, name) {
    openModal("xpath", {
        model: descriptor.view?.model || descriptor.model,
        name,
        tag,
        path: descriptor.path || [],
        view: descriptor.view?.model
            ? descriptor.view
            : { id: null, type: "form", model: descriptor.model },
        buttonType: descriptor.button?.type || null,
        recordModel: descriptor.model,
    });
    close();
}

function pathText(path) {
    return path?.length ? path.map((step) => step.name).join(" › ") : null;
}

function FieldDetails({ descriptor }) {
    const { field, fieldInfo, evaluated = {}, view } = descriptor;
    const isEmptyObject = (value) => !value || (typeof value === "object" && !Object.keys(value).length);
    return (
        <>
            <div class="odt-modifiers">
                <Modifier label="invisible" expr={fieldInfo.invisible} value={evaluated.invisible ?? null} />
                <Modifier label="readonly" expr={fieldInfo.readonly} value={evaluated.readonly ?? null} />
                <Modifier label="required" expr={fieldInfo.required} value={evaluated.required ?? null} />
                {fieldInfo.columnInvisible && <Modifier label="column_invisible" expr={fieldInfo.columnInvisible} value={null} />}
            </div>
            <Properties
                rows={[
                    { label: t("model"), value: descriptor.model },
                    { label: t("record"), value: descriptor.resId ? `${descriptor.model},${descriptor.resId}` : descriptor.isNew ? t("unsavedRecord") : null },
                    { label: t("type"), value: field.type },
                    { label: t("relation"), value: field.relation },
                    { label: "Widget", value: fieldInfo.widget ? `${fieldInfo.widget}${fieldInfo.widgetLabel ? ` (${fieldInfo.widgetLabel})` : ""}` : null },
                    { label: t("context"), value: fieldInfo.context && fieldInfo.context !== "{}" ? fieldInfo.context : null },
                    { label: t("domain"), value: fieldInfo.domain && fieldInfo.domain !== "[]" ? fieldInfo.domain : null },
                    { label: "on_change", value: fieldInfo.onChange ? "True" : null },
                    { label: "force_save", value: fieldInfo.forceSave ? "True" : null },
                    { label: t("relatedTo"), value: field.related ? [].concat(field.related).join(".") : null },
                    { label: t("dependsOn"), value: field.depends?.length ? field.depends.join(", ") : null },
                    { label: t("stored"), value: field.store === undefined ? null : String(field.store) },
                    { label: t("groups"), value: field.groups },
                    { label: t("insideX2many"), value: pathText(descriptor.path) },
                    { label: t("view"), value: view?.type ? `${view.type}${view.id ? ` #${view.id}` : ""}${view.subType ? ` (${view.subType})` : ""}` : null, copy: false },
                    { label: t("help"), value: fieldInfo.help, mono: false },
                ]}
            />
            {!isEmptyObject(fieldInfo.options) && (
                <>
                    <div class="odt-label">options</div>
                    <JsonView value={fieldInfo.options} maxHeight="120px" />
                </>
            )}
            {Array.isArray(field.selection) && field.selection.length > 0 && (
                <div class="odt-selection">
                    <div class="odt-label">{t("selectionValues")}</div>
                    <ul>
                        {field.selection.map(([key, label]) => (
                            <li key={key}>
                                <code>{key}</code> {label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {descriptor.value !== undefined && descriptor.source !== "column" && (
                <>
                    <div class="odt-label">{t("currentValue")}</div>
                    <JsonView value={descriptor.value} maxHeight="140px" />
                </>
            )}
        </>
    );
}

function ActionInfo({ name }) {
    const [action, setAction] = useState(undefined);
    const id = /^\d+$/.test(String(name)) ? Number(name) : null;
    useEffect(() => {
        if (id) {
            actionXmlId(id).then(setAction);
        }
    }, [id]);
    if (!id || !action) {
        return null;
    }
    return (
        <div class="odt-inspector-sub">
            <Properties
                rows={[
                    { label: t("action"), value: action.name, mono: false },
                    { label: t("externalId"), value: action.xml_id || null },
                    { label: t("type"), value: action.type },
                ]}
            />
            <Button small icon="external" onClick={() => openRecord(action.type, id).then(close, notifyError)}>
                {t("openAction")}
            </Button>
        </div>
    );
}

function ButtonDetails({ button, descriptor }) {
    return (
        <>
            <Properties
                rows={[
                    { label: t("buttonType"), value: button.type },
                    { label: button.type === "action" ? t("actionId") : t("method"), value: button.name },
                    { label: "special", value: button.special },
                    { label: t("context"), value: button.context && button.context !== "{}" ? button.context : null },
                    { label: "confirm", value: button.confirm, mono: false },
                    { label: "invisible", value: button.invisible && button.invisible !== "False" ? button.invisible : null },
                    { label: t("groups"), value: button.groups },
                    { label: t("model"), value: descriptor?.model },
                    { label: t("record"), value: descriptor?.resId ? `${descriptor.model},${descriptor.resId}` : null },
                    { label: t("insideX2many"), value: pathText(descriptor?.path) },
                    { label: "class", value: button.className },
                    { label: t("help"), value: button.help, mono: false },
                ]}
            />
            {button.type === "action" && <ActionInfo name={button.name} />}
        </>
    );
}

async function openFieldDefinition(model, name) {
    try {
        const id = await fieldId(model, name);
        if (id) {
            await openRecord("ir.model.fields", id);
            close();
        } else {
            notify(t("fieldDefinitionNotFound"), "warning");
        }
    } catch (error) {
        notifyError(error);
    }
}

function Content({ inspector }) {
    const { descriptor, error } = inspector;
    if (!descriptor) {
        return (
            <div class="odt-inspector-empty">
                <Icon name="crosshair" size={20} />
                <div>
                    <strong>{t("nothingToInspect")}</strong>
                    <div class="odt-muted">{error || t("nothingToInspectHelp")}</div>
                </div>
            </div>
        );
    }
    if (descriptor.kind === "field") {
        const { field, fieldInfo } = descriptor;
        const sourceLabel = { label: t("sourceLabel"), cell: t("sourceCell"), column: t("sourceColumn") }[descriptor.source];
        return (
            <>
                <header class="odt-inspector-head">
                    <div class="odt-inspector-title">
                        <strong>{fieldInfo.label}</strong>
                        <span class="odt-inspector-name">
                            <code>{field.name}</code>
                            <CopyButton text={field.name} title={t("copyFieldName")} />
                        </span>
                    </div>
                    <div class="odt-inspector-badges">
                        <Badge tone="accent">{field.type || "?"}</Badge>
                        {sourceLabel && <Badge>{sourceLabel}</Badge>}
                        {descriptor.stack === "legacy" && <Badge title={t("legacyViewHelp")}>legacy</Badge>}
                    </div>
                </header>
                <div class="odt-inspector-body">
                    <FieldDetails descriptor={descriptor} />
                    {descriptor.inButton && (
                        <div class="odt-inspector-sub">
                            <div class="odt-label">{t("insideButton")}: {descriptor.inButton.string || descriptor.inButton.name}</div>
                            <ButtonDetails button={descriptor.inButton} />
                        </div>
                    )}
                </div>
                <footer class="odt-inspector-actions">
                    <Button small icon="code" onClick={() => openXpath(descriptor, "field", field.name)}>XPath</Button>
                    {descriptor.resId && <Button small icon="database" onClick={() => showInPanel(descriptor)}>{t("showInPanel")}</Button>}
                    <Button small icon="external" onClick={() => openFieldDefinition(descriptor.model, field.name)}>{t("fieldDefinition")}</Button>
                </footer>
            </>
        );
    }
    if (descriptor.kind === "button") {
        const { button } = descriptor;
        return (
            <>
                <header class="odt-inspector-head">
                    <div class="odt-inspector-title">
                        <strong>{button.string || t("buttonWithoutText")}</strong>
                        {button.name && (
                            <span class="odt-inspector-name">
                                <code>{button.name}</code>
                                <CopyButton text={button.name} />
                            </span>
                        )}
                    </div>
                    <div class="odt-inspector-badges">
                        <Badge tone="accent">{t("button")}</Badge>
                        {button.type && <Badge>{button.type}</Badge>}
                    </div>
                </header>
                <div class="odt-inspector-body">
                    <ButtonDetails button={button} descriptor={descriptor} />
                </div>
                <footer class="odt-inspector-actions">
                    {button.name && <Button small icon="code" onClick={() => openXpath(descriptor, "button", button.name)}>XPath</Button>}
                    {descriptor.resId && <Button small icon="database" onClick={() => showInPanel(descriptor)}>{t("showInPanel")}</Button>}
                </footer>
            </>
        );
    }
    return (
        <>
            <header class="odt-inspector-head">
                <div class="odt-inspector-title">
                    <strong>{descriptor.recordName || `${descriptor.model},${descriptor.resId}`}</strong>
                    <span class="odt-inspector-name">
                        <code>{descriptor.model}</code>
                        {descriptor.resId && <Badge>id {descriptor.resId}</Badge>}
                    </span>
                </div>
                <div class="odt-inspector-badges">
                    <Badge tone="accent">{t("record")}</Badge>
                </div>
            </header>
            <div class="odt-inspector-body">
                <Properties
                    rows={[
                        { label: t("model"), value: descriptor.model },
                        { label: "ID", value: descriptor.resId },
                        { label: t("insideX2many"), value: pathText(descriptor.path) },
                    ]}
                />
                {descriptor.context && Object.keys(descriptor.context).length > 0 && (
                    <>
                        <div class="odt-label">{t("context")}</div>
                        <JsonView value={descriptor.context} maxHeight="140px" />
                    </>
                )}
            </div>
            <footer class="odt-inspector-actions">
                {descriptor.resId && <Button small icon="database" onClick={() => showInPanel(descriptor)}>{t("showInPanel")}</Button>}
                {descriptor.resId && (
                    <Button small icon="external" onClick={(event) => openRecord(descriptor.model, descriptor.resId, { newTab: event.ctrlKey || event.metaKey }).then(close, notifyError)}>
                        {t("openInOdoo")}
                    </Button>
                )}
            </footer>
        </>
    );
}

export function Inspector() {
    const inspector = useStore((state) => state.inspector);
    const rect = useAnchorRect(inspector?.anchor);
    const popoverRef = useRef(null);
    const [position, setPosition] = useState(null);

    useEffect(() => {
        if (!inspector) {
            return;
        }
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                event.preventDefault();
                close();
            }
        };
        const onPointerDown = (event) => {
            const host = popoverRef.current?.getRootNode()?.host;
            if (host && event.composedPath().includes(host)) {
                return;
            }
            close();
        };
        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, [inspector]);

    useLayoutEffect(() => {
        if (!inspector || !popoverRef.current) {
            setPosition(null);
            return;
        }
        const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
        const height = popoverRef.current.offsetHeight;
        const anchor = rect || { top: inspector.y, bottom: inspector.y, left: inspector.x, right: inspector.x };
        let top = anchor.bottom + 8;
        if (top + height > window.innerHeight - MARGIN) {
            top = Math.max(MARGIN, anchor.top - height - 8);
        }
        if (top + height > window.innerHeight - MARGIN) {
            top = Math.max(MARGIN, window.innerHeight - height - MARGIN);
        }
        const left = Math.min(Math.max(MARGIN, inspector.x - 24), window.innerWidth - width - MARGIN);
        setPosition({ top, left, width });
    }, [inspector, rect]);

    if (!inspector) {
        return null;
    }
    return (
        <>
            {rect && (
                <div
                    class="odt-highlight"
                    style={{ top: `${rect.top - 2}px`, left: `${rect.left - 2}px`, width: `${rect.width + 4}px`, height: `${rect.height + 4}px` }}
                />
            )}
            <div
                ref={popoverRef}
                class="odt-popover odt-inspector"
                role="dialog"
                aria-label={t("inspector")}
                style={position ? { top: `${position.top}px`, left: `${position.left}px`, width: `${position.width}px` } : { visibility: "hidden", top: "0px", left: "0px", width: `${WIDTH}px` }}
            >
                <button type="button" class="odt-popover-close" aria-label={t("close")} onClick={close}>
                    <Icon name="x" size={14} />
                </button>
                <Content inspector={inspector} />
            </div>
        </>
    );
}
