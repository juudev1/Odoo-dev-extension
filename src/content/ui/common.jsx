import { useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { copyText } from "../store.js";
import { Icon } from "./icons.jsx";

export function IconButton({ icon, title, onClick, active = false, disabled = false, size = 16, class: className = "" }) {
    return (
        <button
            type="button"
            class={`odt-icon-btn ${active ? "is-active" : ""} ${className}`}
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
        >
            <Icon name={icon} size={size} />
        </button>
    );
}

export function Button({ icon, children, onClick, variant = "default", disabled = false, title, small = false, type = "button" }) {
    return (
        <button
            type={type}
            class={`odt-btn odt-btn-${variant} ${small ? "odt-btn-sm" : ""}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
        >
            {icon && <Icon name={icon} size={small ? 13 : 14} />}
            {children && <span>{children}</span>}
        </button>
    );
}

export function CopyButton({ text, label, title }) {
    const [copied, setCopied] = useState(false);
    const onClick = (event) => {
        event.stopPropagation();
        copyText(String(text ?? ""), t("copied"));
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };
    if (label) {
        return (
            <Button small icon={copied ? "check" : "copy"} onClick={onClick} title={title || t("copy")}>
                {label}
            </Button>
        );
    }
    return <IconButton icon={copied ? "check" : "copy"} size={13} title={title || t("copy")} onClick={onClick} class="odt-copy" />;
}

export function Spinner({ label }) {
    return (
        <div class="odt-loading">
            <span class="odt-spinner" />
            {label && <span>{label}</span>}
        </div>
    );
}

export function Empty({ icon = "info", title, children }) {
    return (
        <div class="odt-empty">
            <Icon name={icon} size={22} />
            {title && <strong>{title}</strong>}
            {children && <div>{children}</div>}
        </div>
    );
}

export function ErrorBox({ error, title }) {
    const [open, setOpen] = useState(false);
    if (!error) {
        return null;
    }
    const message = error.message || String(error);
    return (
        <div class="odt-error">
            <div class="odt-error-head">
                <Icon name="alert" size={14} />
                <div>
                    {title && <strong>{title}</strong>}
                    <div class="odt-error-message">{message}</div>
                    {error.exceptionName && <code class="odt-muted">{error.exceptionName}</code>}
                </div>
            </div>
            {error.debug && (
                <>
                    <button type="button" class="odt-link" onClick={() => setOpen(!open)}>
                        {open ? t("hideTraceback") : t("showTraceback")}
                    </button>
                    {open && <pre class="odt-code odt-code-error">{error.debug}</pre>}
                </>
            )}
        </div>
    );
}

export function Section({ title, icon, actions, children, collapsible = false, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section class="odt-section">
            <header class="odt-section-head">
                <button
                    type="button"
                    class="odt-section-title"
                    onClick={collapsible ? () => setOpen(!open) : undefined}
                    disabled={!collapsible}
                >
                    {collapsible && <Icon name={open ? "chevronDown" : "chevronRight"} size={13} />}
                    {icon && <Icon name={icon} size={14} />}
                    <span>{title}</span>
                </button>
                {actions && <div class="odt-section-actions">{actions}</div>}
            </header>
            {open && <div class="odt-section-body">{children}</div>}
        </section>
    );
}

/** Key/value rows; values can be copied. */
export function Properties({ rows }) {
    const visible = rows.filter((row) => row && row.value !== undefined && row.value !== null && row.value !== "");
    if (!visible.length) {
        return null;
    }
    return (
        <dl class="odt-props">
            {visible.map((row) => (
                <div class="odt-prop" key={row.label}>
                    <dt>{row.label}</dt>
                    <dd class={row.mono === false ? "" : "odt-mono"}>
                        <span class="odt-prop-value">{row.render ? row.render(row.value) : String(row.value)}</span>
                        {row.copy !== false && typeof row.value !== "object" && <CopyButton text={row.value} />}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

export function Badge({ children, tone = "neutral", title }) {
    return (
        <span class={`odt-badge odt-badge-${tone}`} title={title}>
            {children}
        </span>
    );
}

function highlightJson(json) {
    const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escaped.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        (match) => {
            let cls = "odt-json-number";
            if (match.startsWith('"')) {
                cls = match.endsWith(":") ? "odt-json-key" : "odt-json-string";
            } else if (match === "true" || match === "false") {
                cls = "odt-json-bool";
            } else if (match === "null") {
                cls = "odt-json-null";
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

export function JsonView({ value, maxHeight }) {
    let text;
    try {
        text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    } catch {
        text = String(value);
    }
    return (
        <div class="odt-code-wrap">
            <pre
                class="odt-code"
                style={maxHeight ? { maxHeight } : undefined}
                // Escaped above: only the highlighting spans are markup.
                dangerouslySetInnerHTML={{ __html: highlightJson(text ?? "null") }}
            />
            <CopyButton text={text} />
        </div>
    );
}

export function CodeBlock({ code, maxHeight }) {
    return (
        <div class="odt-code-wrap">
            <pre class="odt-code" style={maxHeight ? { maxHeight } : undefined}>
                {code}
            </pre>
            <CopyButton text={code} />
        </div>
    );
}

export function Tabs({ tabs, active, onChange }) {
    return (
        <nav class="odt-tabs" role="tablist">
            {tabs.map((tab) => (
                <button
                    type="button"
                    role="tab"
                    key={tab.id}
                    aria-selected={active === tab.id}
                    class={`odt-tab ${active === tab.id ? "is-active" : ""}`}
                    onClick={() => onChange(tab.id)}
                >
                    <Icon name={tab.icon} size={14} />
                    <span>{tab.label}</span>
                </button>
            ))}
        </nav>
    );
}
