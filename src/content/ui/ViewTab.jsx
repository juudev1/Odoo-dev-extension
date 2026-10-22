import { useEffect, useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { actionXmlId, defaultViewId, doAction, inheritedViews, modelId, openRecord, readView } from "../api.js";
import { notifyError, openModal, useStore } from "../store.js";
import { Badge, Button, Empty, ErrorBox, JsonView, Properties, Section, Spinner } from "./common.jsx";

const ACTION_MODELS = {
    "ir.actions.act_window": "ir.actions.act_window",
    "ir.actions.client": "ir.actions.client",
    "ir.actions.server": "ir.actions.server",
    "ir.actions.report": "ir.actions.report",
    "ir.actions.act_url": "ir.actions.act_url",
};

function openInOdoo(model, id) {
    return (event) => openRecord(model, id, { newTab: event?.ctrlKey || event?.metaKey }).catch(notifyError);
}

function ActionSection({ action }) {
    const [xmlId, setXmlId] = useState(action?.xmlId || null);
    useEffect(() => {
        setXmlId(action?.xmlId || null);
        if (action?.id && !action.xmlId) {
            actionXmlId(action.id).then((result) => setXmlId(result?.xml_id || null));
        }
    }, [action?.id]);
    if (!action) {
        return null;
    }
    const actionModel = ACTION_MODELS[action.type];
    return (
        <Section
            title={t("action")}
            icon="list"
            actions={
                action.id && actionModel ? (
                    <Button small icon="external" onClick={openInOdoo(actionModel, action.id)}>{t("open")}</Button>
                ) : null
            }
        >
            <Properties
                rows={[
                    { label: t("name"), value: action.name, mono: false },
                    { label: "ID", value: action.id },
                    { label: t("externalId"), value: xmlId },
                    { label: t("type"), value: action.type },
                    { label: t("tag"), value: action.tag },
                    { label: t("model"), value: action.resModel },
                    { label: t("target"), value: action.target },
                    { label: t("domain"), value: action.domain && action.domain !== "[]" ? action.domain : null },
                ]}
            />
            {action.context && Object.keys(action.context).length > 0 && (
                <>
                    <div class="odt-label">{t("actionContext")}</div>
                    <JsonView value={action.context} maxHeight="200px" />
                </>
            )}
        </Section>
    );
}

function ViewSection({ view }) {
    const [state, setState] = useState({ loading: true });
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setState({ loading: true });
            try {
                const id = view.id || (await defaultViewId(view.model, view.type));
                const [record, children] = id ? await Promise.all([readView(id), inheritedViews(id)]) : [null, []];
                if (!cancelled) {
                    setState({ loading: false, id, record, children });
                }
            } catch (error) {
                if (!cancelled) {
                    setState({ loading: false, error });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [view.id, view.model, view.type]);

    const showArch = () => openModal("arch", { model: view.model, viewId: state.id, type: view.type });
    return (
        <>
            <Section
                title={t("view")}
                icon="layers"
                actions={
                    state.id ? (
                        <>
                            <Button small icon="code" onClick={showArch}>{t("combinedArch")}</Button>
                            <Button small icon="external" onClick={openInOdoo("ir.ui.view", state.id)}>{t("open")}</Button>
                        </>
                    ) : null
                }
            >
                {state.loading && <Spinner />}
                <ErrorBox error={state.error} />
                {!state.loading && !state.error && (
                    <Properties
                        rows={[
                            { label: t("type"), value: view.subType ? `${view.type} (js_class: ${view.subType})` : view.type },
                            { label: "ID", value: state.id },
                            { label: t("externalId"), value: state.record?.xml_id || null },
                            { label: t("name"), value: state.record?.name },
                            { label: t("model"), value: view.model },
                            { label: t("priority"), value: state.record?.priority },
                            { label: t("mode"), value: state.record?.mode },
                            { label: t("inheritsFrom"), value: state.record?.inherit_id ? state.record.inherit_id[1] : null },
                        ]}
                    />
                )}
            </Section>
            {state.children && (
                <Section title={t("inheritance", state.children.length)} icon="branch" collapsible defaultOpen={state.children.length <= 12}>
                    {state.children.length ? (
                        <ul class="odt-tree">
                            {state.children.map((child) => (
                                <li key={child.id} style={{ paddingLeft: `${(child.depth - 1) * 14}px` }} class={child.active === false ? "is-inactive" : ""}>
                                    <button type="button" class="odt-link odt-mono" onClick={openInOdoo("ir.ui.view", child.id)} title={child.name}>
                                        {child.xml_id || child.name}
                                    </button>
                                    <span class="odt-muted">p{child.priority}</span>
                                    {child.mode === "primary" && <Badge tone="info">primary</Badge>}
                                    {child.active === false && <Badge>{t("inactive")}</Badge>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div class="odt-muted">{t("noInheritance")}</div>
                    )}
                </Section>
            )}
        </>
    );
}

function ModelSection({ model }) {
    const openModel = async (event) => {
        try {
            const record = await modelId(model);
            if (record) {
                await openRecord("ir.model", record.id, { newTab: event.ctrlKey || event.metaKey });
            }
        } catch (error) {
            notifyError(error);
        }
    };
    const openFields = () =>
        doAction({
            type: "ir.actions.act_window",
            name: model,
            res_model: "ir.model.fields",
            domain: [["model", "=", model]],
            views: [[false, "list"], [false, "form"]],
            target: "current",
        }).catch(notifyError);
    return (
        <Section
            title={t("model")}
            icon="database"
            actions={
                <>
                    <Button small icon="list" onClick={openFields}>{t("fields")}</Button>
                    <Button small icon="external" onClick={openModel}>{t("open")}</Button>
                </>
            }
        >
            <Properties rows={[{ label: t("technicalName"), value: model }]} />
        </Section>
    );
}

export function ViewTab() {
    const context = useStore((state) => state.context);
    const odoo = useStore((state) => state.odoo);
    if (!context) {
        return <Spinner />;
    }
    const { action, view } = context;
    if (!action && !view) {
        return <Empty icon="layers" title={t("noViewTitle")}>{t("noViewHelp")}</Empty>;
    }
    return (
        <div class="odt-view-tab">
            {context.inDialog && <div class="odt-note">{t("viewInDialog")}</div>}
            {view?.model && view?.type && <ViewSection view={view} />}
            {view?.model && <ModelSection model={view.model} />}
            <ActionSection action={action} />
            <Section title={t("viewContext")} icon="code" collapsible defaultOpen={false}>
                <JsonView value={context.context || {}} maxHeight="260px" />
                {context.domain && context.domain !== "[]" && (
                    <>
                        <div class="odt-label">{t("domain")}</div>
                        <JsonView value={context.domain} />
                    </>
                )}
            </Section>
            {odoo?.user && (
                <Section title={t("user")} icon="info" collapsible defaultOpen={false}>
                    <Properties
                        rows={[
                            { label: t("name"), value: odoo.user.name, mono: false },
                            { label: "Login", value: odoo.user.login },
                            { label: "ID", value: odoo.user.id },
                            { label: t("admin"), value: odoo.user.isAdmin ? "True" : "False" },
                        ]}
                    />
                </Section>
            )}
        </div>
    );
}
