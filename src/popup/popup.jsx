import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

import { ext } from "../shared/ext.js";
import { t } from "../shared/i18n.js";
import {
    MODIFIER_LABELS,
    loadBackgroundImage,
    loadSettings,
    migrateLegacyStorage,
    saveBackgroundImage,
    saveSettings,
} from "../shared/settings.js";
import styles from "./popup.css";

const MAX_IMAGE_SIDE = 2560;

/** Downscales and re-encodes the image so it fits comfortably in storage. */
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve({
                dataUrl: canvas.toDataURL("image/webp", 0.86),
                width: canvas.width,
                height: canvas.height,
            });
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(t("invalidImage")));
        };
        image.src = url;
    });
}

async function activeTabStatus() {
    try {
        const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            return null;
        }
        return await ext.tabs.sendMessage(tab.id, { type: "odoo-dev-tools/status" });
    } catch {
        // No content script in this tab (chrome:// pages, the store, a page
        // loaded before the extension was installed).
        return null;
    }
}

function Toggle({ label, help, checked, onChange, disabled }) {
    return (
        <label class={`toggle ${disabled ? "is-disabled" : ""}`}>
            <span class="toggle-text">
                <span>{label}</span>
                {help && <small>{help}</small>}
            </span>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.currentTarget.checked)} />
            <span class="switch" aria-hidden="true" />
        </label>
    );
}

function Choice({ label, value, options, onChange }) {
    return (
        <div class="choice">
            <span>{label}</span>
            <div class="segmented">
                {options.map((option) => (
                    <button type="button" key={option.id} class={value === option.id ? "is-active" : ""} onClick={() => onChange(option.id)}>
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Popup() {
    const [settings, setSettings] = useState(null);
    const [status, setStatus] = useState(undefined);
    const [image, setImage] = useState(null);
    const [message, setMessage] = useState(null);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        (async () => {
            await migrateLegacyStorage().catch(() => {});
            setSettings(await loadSettings());
            setImage(await loadBackgroundImage());
            setStatus(await activeTabStatus());
        })();
    }, []);

    if (!settings) {
        return null;
    }

    const update = async (patch) => setSettings(await saveSettings(patch));
    const host = status?.host;
    const hostEnabled = host ? !settings.disabledHosts.includes(host) : true;
    const setHostEnabled = (enabled) =>
        update({
            disabledHosts: enabled
                ? settings.disabledHosts.filter((item) => item !== host)
                : [...new Set([...settings.disabledHosts, host])],
        });

    const onFile = async (file) => {
        if (!file) {
            return;
        }
        if (!file.type.startsWith("image/")) {
            setMessage({ type: "error", text: t("invalidImage") });
            return;
        }
        try {
            const result = await compressImage(file);
            await saveBackgroundImage(result.dataUrl);
            setImage(result.dataUrl);
            setMessage({ type: "ok", text: t("imageSaved", `${result.width}×${result.height}`) });
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        }
    };

    const version = status?.version;
    return (
        <main>
            <header class="head">
                <span class="logo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" x2="20" y1="19" y2="19" />
                    </svg>
                </span>
                <div>
                    <strong>Odoo Dev Tools</strong>
                    <div class="muted">v{__VERSION__}</div>
                </div>
            </header>

            <section class={`status ${status ? "is-odoo" : ""}`}>
                {status === undefined ? (
                    <span class="muted">…</span>
                ) : status ? (
                    <>
                        <span class="dot" />
                        <span>
                            {t("detected", `${version?.label || "?"} ${version?.enterprise ? "Enterprise" : "Community"}`)}
                            {status.db && <span class="muted"> · {status.db}</span>}
                        </span>
                    </>
                ) : (
                    <span class="muted">{t("notOdooTab")}</span>
                )}
            </section>

            <section class="card">
                <Toggle label={t("settingEnabled")} checked={settings.enabled} onChange={(enabled) => update({ enabled })} />
                {host && (
                    <Toggle
                        label={t("settingThisSite")}
                        help={host}
                        checked={hostEnabled}
                        disabled={!settings.enabled}
                        onChange={setHostEnabled}
                    />
                )}
                <Toggle label={t("settingLauncher")} help={t("settingLauncherHelp")} checked={settings.showLauncher} onChange={(showLauncher) => update({ showLauncher })} />
                <Toggle label={t("settingFollowRows")} help={t("settingFollowRowsHelp")} checked={settings.followRowClicks} onChange={(followRowClicks) => update({ followRowClicks })} />
                <Choice
                    label={t("settingInspector")}
                    value={settings.inspectModifier}
                    onChange={(inspectModifier) => update({ inspectModifier })}
                    options={Object.entries(MODIFIER_LABELS).map(([id, label]) => ({ id, label }))}
                />
                <div class="hint">{t("settingInspectorHelp", MODIFIER_LABELS[settings.inspectModifier])}</div>
                <Choice
                    label={t("settingTheme")}
                    value={settings.theme}
                    onChange={(theme) => update({ theme })}
                    options={[
                        { id: "auto", label: t("themeAuto") },
                        { id: "light", label: t("themeLight") },
                        { id: "dark", label: t("themeDark") },
                    ]}
                />
            </section>

            <section class="card">
                <Toggle
                    label={t("settingBackground")}
                    help={t("settingBackgroundHelp")}
                    checked={settings.backgroundEnabled}
                    onChange={(backgroundEnabled) => update({ backgroundEnabled })}
                />
                <label
                    class={`drop ${dragging ? "is-dragging" : ""}`}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        onFile(event.dataTransfer.files[0]);
                    }}
                >
                    {image ? <img src={image} alt="" /> : <span>{t("dropImage")}</span>}
                    <input type="file" accept="image/*" onChange={(event) => onFile(event.currentTarget.files[0])} />
                </label>
                {image && (
                    <button
                        type="button"
                        class="link danger"
                        onClick={async () => {
                            await saveBackgroundImage(null);
                            setImage(null);
                            setMessage({ type: "ok", text: t("imageRemoved") });
                        }}
                    >
                        {t("removeImage")}
                    </button>
                )}
                {message && <div class={`message ${message.type}`}>{message.text}</div>}
            </section>

            <footer class="foot">
                <a href="https://github.com/juudev1/Odoo-dev-extension" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="https://buymeacoffee.com/juuxn" target="_blank" rel="noopener noreferrer">{t("support")}</a>
            </footer>
        </main>
    );
}

const style = document.createElement("style");
style.textContent = styles;
document.head.appendChild(style);
render(<Popup />, document.getElementById("root"));
