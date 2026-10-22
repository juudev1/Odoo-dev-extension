import { useEffect, useRef } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { toggleColorScheme } from "../api.js";
import { dismissToast, notifyError, setUi, store, useStore } from "../store.js";
import { Badge, IconButton, Tabs } from "./common.jsx";
import { Icon } from "./icons.jsx";
import { Inspector } from "./Inspector.jsx";
import { ModalHost } from "./Modals.jsx";
import { MethodTab } from "./MethodTab.jsx";
import { RecordTab } from "./RecordTab.jsx";
import { ReportsTab } from "./ReportsTab.jsx";
import { ViewTab } from "./ViewTab.jsx";

const MIN_WIDTH = 360;
const MAX_WIDTH = 960;
const DOCK_STYLE_ID = "odoo-dev-tools-dock";

function useTheme() {
    const preference = useStore((state) => state.settings.theme);
    if (preference === "light" || preference === "dark") {
        return preference;
    }
    return document.cookie.split("; ").includes("color_scheme=dark") ? "dark" : "light";
}

/** Docked: the page gives the panel its width instead of being covered. */
function useDock(docked, open, width) {
    useEffect(() => {
        let style = document.getElementById(DOCK_STYLE_ID);
        if (!docked || !open) {
            style?.remove();
            return;
        }
        if (!style) {
            style = document.createElement("style");
            style.id = DOCK_STYLE_ID;
            document.head.appendChild(style);
        }
        style.textContent = `html { margin-right: ${width}px !important; }`;
    }, [docked, open, width]);
    useEffect(() => () => document.getElementById(DOCK_STYLE_ID)?.remove(), []);
}

function Launcher() {
    return (
        <button
            type="button"
            class="odt-launcher"
            title={t("openPanel")}
            aria-label={t("openPanel")}
            onClick={() => setUi({ panelOpen: true })}
        >
            <Icon name="terminal" size={18} />
        </button>
    );
}

function DebugSwitch({ current }) {
    const modes = [
        { id: "", label: t("debugOff") },
        { id: "1", label: t("debugOn") },
        { id: "assets", label: t("debugAssets") },
    ];
    const change = (mode) => {
        const url = new URL(window.location.href);
        if (mode) {
            url.searchParams.set("debug", mode);
        } else {
            url.searchParams.delete("debug");
        }
        window.location.href = url.toString();
    };
    const normalized = current === "assets" || (current && current.includes("assets")) ? "assets" : current ? "1" : "";
    return (
        <div class="odt-segmented" role="group" aria-label={t("debugMode")} title={t("debugMode")}>
            <Icon name="bug" size={13} />
            {modes.map((mode) => (
                <button
                    type="button"
                    key={mode.id}
                    class={normalized === mode.id ? "is-active" : ""}
                    onClick={() => normalized !== mode.id && change(mode.id)}
                >
                    {mode.label}
                </button>
            ))}
        </div>
    );
}

function ResizeHandle({ width }) {
    const onPointerDown = (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = width;
        const onMove = (moveEvent) => {
            const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + startX - moveEvent.clientX));
            setUi({ panelWidth: Math.round(next) }, { debounce: true });
        };
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };
    return <div class="odt-resize" onPointerDown={onPointerDown} title={t("resize")} />;
}

function Panel() {
    const ui = useStore((state) => state.ui);
    const odoo = useStore((state) => state.odoo);
    const version = odoo?.version;
    const colorScheme = odoo?.colorScheme;
    const tabs = [
        { id: "record", icon: "database", label: t("tabRecord") },
        { id: "view", icon: "layers", label: t("tabView") },
        { id: "method", icon: "play", label: t("tabMethod") },
        { id: "reports", icon: "printer", label: t("tabReports") },
    ];
    const active = tabs.some((tab) => tab.id === ui.activeTab) ? ui.activeTab : "record";
    const onToggleScheme = async () => {
        try {
            await toggleColorScheme();
        } catch (error) {
            notifyError(error);
        }
    };
    return (
        <aside class="odt-panel" style={{ width: `${ui.panelWidth}px` }} aria-label="Odoo Dev Tools">
            <ResizeHandle width={ui.panelWidth} />
            <header class="odt-header">
                <div class="odt-brand">
                    <span class="odt-logo">
                        <Icon name="terminal" size={15} />
                    </span>
                    <div class="odt-brand-text">
                        <strong>Odoo Dev Tools</strong>
                        <div class="odt-brand-meta">
                            {version && (
                                <Badge tone={version.enterprise ? "accent" : "neutral"}>
                                    {version.label} {version.enterprise ? "EE" : "CE"}
                                </Badge>
                            )}
                            {odoo?.db && <span class="odt-muted odt-ellipsis" title={odoo.db}>{odoo.db}</span>}
                        </div>
                    </div>
                </div>
                <div class="odt-header-actions">
                    {colorScheme?.supported && (
                        <IconButton
                            icon={colorScheme.current === "dark" ? "sun" : "moon"}
                            title={t("toggleOdooTheme")}
                            onClick={onToggleScheme}
                        />
                    )}
                    <IconButton
                        icon="dock"
                        title={ui.panelDocked ? t("undock") : t("dock")}
                        active={ui.panelDocked}
                        onClick={() => setUi({ panelDocked: !ui.panelDocked })}
                    />
                    <IconButton icon="x" title={t("closePanel")} onClick={() => setUi({ panelOpen: false })} />
                </div>
            </header>
            <div class="odt-toolbar">
                <DebugSwitch current={odoo?.debug || ""} />
            </div>
            <Tabs tabs={tabs} active={active} onChange={(tab) => setUi({ activeTab: tab })} />
            <div class="odt-body">
                {active === "record" && <RecordTab />}
                {active === "view" && <ViewTab />}
                {active === "method" && <MethodTab />}
                {active === "reports" && <ReportsTab />}
            </div>
            <footer class="odt-footer">
                <a href="https://github.com/juudev1/Odoo-dev-extension" target="_blank" rel="noopener noreferrer">
                    <Icon name="github" size={13} /> GitHub
                </a>
                <a href="https://buymeacoffee.com/juuxn" target="_blank" rel="noopener noreferrer" class="odt-coffee">
                    <Icon name="coffee" size={13} /> {t("support")}
                </a>
                <span class="odt-muted">v{__VERSION__}</span>
            </footer>
        </aside>
    );
}

function Toasts() {
    const toasts = useStore((state) => state.toasts);
    if (!toasts.length) {
        return null;
    }
    return (
        <div class="odt-toasts" role="status">
            {toasts.map((toast) => (
                <div key={toast.id} class={`odt-toast odt-toast-${toast.type}`}>
                    <span>{toast.message}</span>
                    <button type="button" aria-label={t("close")} onClick={() => dismissToast(toast.id)}>
                        <Icon name="x" size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

export function App() {
    const theme = useTheme();
    const ui = useStore((state) => state.ui);
    const showLauncher = useStore((state) => state.settings.showLauncher);
    const rootRef = useRef(null);
    useDock(ui.panelDocked, ui.panelOpen, ui.panelWidth);

    // Odoo's hotkeys and dialogs listen on the document: keys typed in the
    // panel must not reach them (Escape would close an Odoo dialog, etc.).
    useEffect(() => {
        const host = rootRef.current?.getRootNode()?.host;
        if (!host) {
            return;
        }
        const stop = (event) => {
            if (event.key === "Escape" && store.get().inspector) {
                store.set({ inspector: null });
            }
            event.stopPropagation();
        };
        const events = ["keydown", "keyup", "keypress"];
        events.forEach((name) => host.addEventListener(name, stop));
        return () => events.forEach((name) => host.removeEventListener(name, stop));
    }, []);

    return (
        <div class="odt-root" data-theme={theme} ref={rootRef}>
            {showLauncher && !ui.panelOpen && <Launcher />}
            {ui.panelOpen && <Panel />}
            <Inspector />
            <ModalHost />
            <Toasts />
        </div>
    );
}
