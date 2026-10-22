import { useEffect, useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { openRecord, reportsFor } from "../api.js";
import { notifyError, useStore } from "../store.js";
import { Badge, Button, CopyButton, Empty, ErrorBox, IconButton, Spinner } from "./common.jsx";

const ROUTES = {
    "qweb-pdf": "pdf",
    "qweb-html": "html",
    "qweb-text": "text",
};

function reportUrl(report, ids, kind) {
    return `/report/${kind}/${report.report_name}/${ids.join(",")}`;
}

function useTarget() {
    const context = useStore((state) => state.context);
    const focus = useStore((state) => state.focus);
    if (focus?.resId) {
        return { model: focus.model, ids: [focus.resId] };
    }
    if (context?.record?.resId) {
        return { model: context.record.model, ids: [context.record.resId] };
    }
    return { model: context?.view?.model || null, ids: context?.selection || [] };
}

function Preview({ url, onClose }) {
    const [key, setKey] = useState(0);
    return (
        <div class="odt-preview">
            <div class="odt-preview-bar">
                <code class="odt-ellipsis" title={url}>{url}</code>
                <IconButton icon="refresh" size={14} title={t("reloadPreview")} onClick={() => setKey(key + 1)} />
                <IconButton icon="external" size={14} title={t("openNewTab")} onClick={() => window.open(url, "_blank", "noopener")} />
                <IconButton icon="x" size={14} title={t("close")} onClick={onClose} />
            </div>
            <iframe key={key} src={url} title={t("reportPreview")} />
        </div>
    );
}

export function ReportsTab() {
    const { model, ids } = useTarget();
    const [state, setState] = useState({ loading: false, reports: [] });
    const [preview, setPreview] = useState(null);

    const load = async () => {
        if (!model) {
            return;
        }
        setState({ loading: true, reports: [] });
        try {
            setState({ loading: false, reports: await reportsFor(model) });
        } catch (error) {
            setState({ loading: false, reports: [], error });
        }
    };

    useEffect(() => {
        setPreview(null);
        load();
    }, [model]);

    if (!model) {
        return <Empty icon="printer" title={t("noModelTitle")}>{t("noModelHelp")}</Empty>;
    }
    return (
        <div class="odt-reports-tab">
            <div class="odt-reports-head">
                <div>
                    <code>{model}</code>
                    {ids.length ? <Badge>ids {ids.join(", ")}</Badge> : <span class="odt-muted"> {t("reportsNeedRecord")}</span>}
                </div>
                <IconButton icon="refresh" title={t("reload")} onClick={load} />
            </div>
            {state.loading && <Spinner />}
            <ErrorBox error={state.error} />
            {!state.loading && !state.error && !state.reports.length && <Empty icon="printer" title={t("noReports")} />}
            <ul class="odt-reports">
                {state.reports.map((report) => {
                    const native = ROUTES[report.report_type];
                    return (
                        <li key={report.id} class="odt-report">
                            <div class="odt-report-info">
                                <strong>{report.name}</strong>
                                <span class="odt-report-tech">
                                    <code>{report.report_name}</code>
                                    <CopyButton text={report.report_name} />
                                    <Badge>{report.report_type}</Badge>
                                </span>
                                {report.xml_id && <span class="odt-muted odt-mono">{report.xml_id}</span>}
                            </div>
                            <div class="odt-report-actions">
                                {native && native !== "text" && (
                                    <Button small icon="eye" disabled={!ids.length} onClick={() => setPreview(reportUrl(report, ids, "html"))} title={t("previewHtmlHelp")}>
                                        HTML
                                    </Button>
                                )}
                                {native === "pdf" && (
                                    <Button small icon="external" disabled={!ids.length} onClick={() => window.open(reportUrl(report, ids, "pdf"), "_blank", "noopener")}>
                                        PDF
                                    </Button>
                                )}
                                {native === "text" && (
                                    <Button small icon="external" disabled={!ids.length} onClick={() => window.open(reportUrl(report, ids, "text"), "_blank", "noopener")}>
                                        TXT
                                    </Button>
                                )}
                                <IconButton icon="pencil" size={13} title={t("openReportAction")} onClick={(event) => openRecord("ir.actions.report", report.id, { newTab: event.ctrlKey || event.metaKey }).catch(notifyError)} />
                            </div>
                        </li>
                    );
                })}
            </ul>
            {preview && <Preview url={preview} onClose={() => setPreview(null)} />}
        </div>
    );
}
