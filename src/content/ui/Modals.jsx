import { useEffect, useMemo, useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { combinationViews, combinedArch, openRecord, primaryViews, readView, viewArchDb } from "../api.js";
import { buildXpath, findFieldNodes, inheritanceSnippet, nodeHistory, parseArch, prettyXml } from "../xpath.js";
import { closeModal, notifyError, useStore } from "../store.js";
import { Badge, Button, CodeBlock, CopyButton, Empty, ErrorBox, IconButton, Spinner } from "./common.jsx";

const POSITIONS = ["after", "before", "inside", "replace", "attributes"];

function moduleOf(xmlId) {
    return xmlId && xmlId.includes(".") ? xmlId.split(".")[0] : null;
}

async function analyze({ model, viewId, type, name, tag, path, buttonType }) {
    const { arch, viewId: resolvedId } = await combinedArch(model, viewId, type);
    const doc = parseArch(arch);
    let nodes = findFieldNodes(doc, name, path, tag);
    if (tag === "button" && buttonType) {
        const typed = nodes.filter((node) => node.getAttribute("type") === buttonType);
        nodes = typed.length ? typed : nodes;
    }
    const matches = nodes.map((node) => ({ xpath: buildXpath(doc, node) }));
    let record = null;
    let history = { addedBy: [], modifiedBy: [] };
    if (resolvedId) {
        const [view, views] = await Promise.all([readView(resolvedId), combinationViews(resolvedId)]);
        record = view;
        history = nodeHistory(views, name, tag);
    }
    return { viewId: resolvedId, type, model, record, matches, history };
}

function OtherViews({ model, type, currentId, name, tag, onSelect }) {
    const [state, setState] = useState({ loading: true, views: [] });
    useEffect(() => {
        (async () => {
            try {
                const views = (await primaryViews(model, type)).filter((view) => view.id !== currentId);
                const results = await Promise.all(
                    views.map(async (view) => {
                        try {
                            const { arch } = await combinedArch(model, view.id, type);
                            return { view, count: findFieldNodes(parseArch(arch), name, [], tag).length };
                        } catch (error) {
                            return { view, count: 0, error };
                        }
                    })
                );
                setState({ loading: false, views: results });
            } catch (error) {
                setState({ loading: false, views: [], error });
            }
        })();
    }, []);
    if (state.loading) {
        return <Spinner label={t("searchingViews")} />;
    }
    if (state.error) {
        return <ErrorBox error={state.error} />;
    }
    const found = state.views.filter((item) => item.count > 0);
    if (!found.length) {
        return <div class="odt-muted">{t("notInOtherViews")}</div>;
    }
    return (
        <ul class="odt-view-list">
            {found.map(({ view }) => (
                <li key={view.id}>
                    <button type="button" class="odt-link odt-mono" onClick={() => onSelect(view.id)}>
                        {view.xml_id || view.name}
                    </button>
                    <span class="odt-muted">p{view.priority}</span>
                </li>
            ))}
        </ul>
    );
}

function XpathModal({ model, name, tag = "field", path = [], view, buttonType, recordModel }) {
    const odoo = useStore((state) => state.odoo);
    // What is analyzed: the view the user was on, then whatever they pick.
    const [target, setTarget] = useState({ model, viewId: view?.id || null, type: view?.type || "form", path });
    const [state, setState] = useState({ loading: true });
    const [position, setPosition] = useState(tag === "button" ? "attributes" : "after");
    const [short, setShort] = useState(true);
    const [index, setIndex] = useState(0);
    const [searchOthers, setSearchOthers] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setState({ loading: true });
        setIndex(0);
        setSearchOthers(false);
        analyze({ ...target, name, tag, buttonType })
            .then((result) => !cancelled && setState({ loading: false, ...result }))
            .catch((error) => !cancelled && setState({ loading: false, error }));
        return () => {
            cancelled = true;
        };
    }, [target]);

    // A line of a one2many whose list is not written inside the form: Odoo
    // loads the default list (or kanban) view of the line's model.
    const lineView =
        target.path.length && recordModel && recordModel !== target.model
            ? { model: recordModel, viewId: null, type: target.path[target.path.length - 1].viewMode || "list", path: [] }
            : null;
    const type = target.type;
    const match = state.matches?.[index];
    const snippet = useMemo(() => {
        if (!match) {
            return "";
        }
        return inheritanceSnippet({
            inheritXmlId: state.record?.xml_id || null,
            inheritId: state.viewId,
            model: target.model,
            viewType: type,
            xpath: match.xpath,
            node: { tag, name },
            position,
            short,
        });
    }, [match, position, short, state.record]);

    return (
        <div class="odt-modal-content">
            <header class="odt-modal-head">
                <div>
                    <strong>{tag === "button" ? t("xpathForButton") : t("xpathForField")} <code>{name}</code></strong>
                    <div class="odt-muted">
                        <code>{target.model}</code> · {type}
                        {state.record && (
                            <>
                                {" · "}
                                <button type="button" class="odt-link odt-mono" onClick={(event) => openRecord("ir.ui.view", state.viewId, { newTab: event.ctrlKey || event.metaKey }).catch(notifyError)}>
                                    {state.record.xml_id || state.record.name}
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <IconButton icon="x" title={t("close")} onClick={closeModal} />
            </header>
            <div class="odt-modal-body">
                {state.loading && <Spinner label={t("analyzingView")} />}
                <ErrorBox error={state.error} />
                {!state.loading && !state.error && (
                    <>
                        {!state.matches.length ? (
                            <Empty icon="search" title={t("notInView")}>
                                {t("notInViewHelp")}
                                {lineView && (
                                    <div class="odt-empty-action">
                                        <Button small icon="search" onClick={() => setTarget(lineView)}>
                                            {t("searchLineView", lineView.type, lineView.model)}
                                        </Button>
                                    </div>
                                )}
                            </Empty>
                        ) : (
                            <>
                                {state.matches.length > 1 && (
                                    <div class="odt-note">
                                        {t("multipleMatches", state.matches.length)}
                                        <div class="odt-segmented">
                                            {state.matches.map((_, i) => (
                                                <button type="button" key={i} class={i === index ? "is-active" : ""} onClick={() => setIndex(i)}>
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div class="odt-label">XPath</div>
                                <div class="odt-xpath">
                                    <code>{match.xpath}</code>
                                    <CopyButton text={match.xpath} />
                                </div>
                                {(state.history.addedBy.length > 0 || state.history.modifiedBy.length > 0) && (
                                    <div class="odt-history-box">
                                        {state.history.addedBy.length > 0 && (
                                            <div>
                                                <span class="odt-label">{t("addedBy")}</span>
                                                {state.history.addedBy.map((item) => (
                                                    <span key={item.id} class="odt-chip" title={item.name}>
                                                        <code>{item.xml_id || item.name}</code>
                                                        {moduleOf(item.xml_id) && <Badge tone="accent">{moduleOf(item.xml_id)}</Badge>}
                                                    </span>
                                                ))}
                                                {state.history.addedBy.some((item) => item.inherit_id) && (
                                                    <div class="odt-muted odt-small">{t("dependsHint")}</div>
                                                )}
                                            </div>
                                        )}
                                        {state.history.modifiedBy.length > 0 && (
                                            <div>
                                                <span class="odt-label">{t("modifiedBy")}</span>
                                                {state.history.modifiedBy.map(({ view: item, positions }) => (
                                                    <span key={item.id} class="odt-chip" title={item.name}>
                                                        <code>{item.xml_id || item.name}</code>
                                                        <span class="odt-muted">{positions.join(", ")}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div class="odt-snippet-controls">
                                    <span class="odt-label">{t("inheritanceSnippet")}</span>
                                    <div class="odt-segmented">
                                        {POSITIONS.map((item) => (
                                            <button type="button" key={item} class={item === position ? "is-active" : ""} onClick={() => setPosition(item)}>
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                    <label class="odt-check">
                                        <input type="checkbox" checked={short} onChange={(event) => setShort(event.currentTarget.checked)} />
                                        {t("shortForm")}
                                    </label>
                                </div>
                                {!state.record?.xml_id && <div class="odt-note">{t("viewWithoutXmlId")}</div>}
                                <CodeBlock code={snippet} />
                                {odoo?.version && odoo.version.major < 17 && position === "attributes" && (
                                    <div class="odt-muted odt-small">{t("attrsHint")}</div>
                                )}
                            </>
                        )}
                        <div class="odt-other-views">
                            {searchOthers ? (
                                <OtherViews model={target.model} type={type} currentId={state.viewId} name={name} tag={tag} onSelect={(id) => setTarget({ ...target, viewId: id, path: [] })} />
                            ) : (
                                <Button small icon="search" onClick={() => setSearchOthers(true)}>{t("searchOtherViews", type)}</Button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ArchModal({ model, viewId, type }) {
    const [state, setState] = useState({ loading: true });
    const [raw, setRaw] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setState({ loading: true });
        const load = raw
            ? viewArchDb(viewId).then((view) => view?.arch_db || "")
            : combinedArch(model, viewId, type).then((result) => result.arch);
        load
            .then((arch) => {
                let code = arch;
                try {
                    code = prettyXml(arch);
                } catch {
                    // Show it as it came if it does not parse.
                }
                !cancelled && setState({ loading: false, code });
            })
            .catch((error) => !cancelled && setState({ loading: false, error }));
        return () => {
            cancelled = true;
        };
    }, [raw]);
    return (
        <div class="odt-modal-content odt-modal-wide">
            <header class="odt-modal-head">
                <div>
                    <strong>{raw ? t("ownArch") : t("combinedArch")}</strong>
                    <div class="odt-muted">
                        <code>{model}</code> · {type} · #{viewId}
                    </div>
                </div>
                <div class="odt-modal-head-actions">
                    <div class="odt-segmented">
                        <button type="button" class={!raw ? "is-active" : ""} onClick={() => setRaw(false)}>{t("combined")}</button>
                        <button type="button" class={raw ? "is-active" : ""} onClick={() => setRaw(true)}>arch_db</button>
                    </div>
                    <IconButton icon="x" title={t("close")} onClick={closeModal} />
                </div>
            </header>
            <div class="odt-modal-body">
                {state.loading && <Spinner />}
                <ErrorBox error={state.error} />
                {state.code !== undefined && <CodeBlock code={state.code} maxHeight="70vh" />}
            </div>
        </div>
    );
}

export function ModalHost() {
    const modal = useStore((state) => state.modal);
    useEffect(() => {
        if (!modal) {
            return;
        }
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                closeModal();
            }
        };
        document.addEventListener("keydown", onKeyDown, true);
        return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [modal]);
    if (!modal) {
        return null;
    }
    return (
        <div class="odt-modal-backdrop" onPointerDown={(event) => event.target === event.currentTarget && closeModal()}>
            <div class="odt-modal" role="dialog" aria-modal="true">
                {modal.type === "xpath" && <XpathModal {...modal.props} />}
                {modal.type === "arch" && <ArchModal {...modal.props} />}
            </div>
        </div>
    );
}
