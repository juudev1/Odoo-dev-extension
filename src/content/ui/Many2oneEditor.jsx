import { useEffect, useRef, useState } from "preact/hooks";

import { t } from "../../shared/i18n.js";
import { readNames, searchNames } from "../api.js";
import { Button, ErrorBox } from "./common.jsx";
import { Icon } from "./icons.jsx";

const LIMIT = 8;
const ID_PATTERN = /^#?(\d+)$/;

/**
 * Many2one value picker: searches the related model by name like Odoo's
 * own field, and also accepts a database id. Picking an option only changes
 * the draft; nothing is written until Save.
 */
export function Many2oneEditor({ field, value, onSave, onCancel }) {
    const initial = Array.isArray(value) ? { id: value[0], name: value[1] } : null;
    const [selected, setSelected] = useState(initial);
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState([]);
    const [open, setOpen] = useState(true);
    const [active, setActive] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);
    const lastRequest = useRef(0);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const requestId = ++lastRequest.current;
        const timer = setTimeout(async () => {
            setLoading(true);
            const text = query.trim();
            const idMatch = text.match(ID_PATTERN);
            const id = idMatch ? Number(idMatch[1]) : null;
            try {
                const [found, byId] = await Promise.all([
                    searchNames(field.relation, idMatch ? idMatch[1] : text, LIMIT),
                    // read() raises when the id does not exist.
                    id ? readNames(field.relation, [id]).catch(() => []) : [],
                ]);
                if (requestId !== lastRequest.current) {
                    return;
                }
                const next = [];
                if (id) {
                    next.push({ id, name: byId[0]?.display_name ?? null, byId: true, missing: !byId.length });
                }
                for (const [optionId, name] of found) {
                    if (!next.some((option) => option.id === optionId)) {
                        next.push({ id: optionId, name });
                    }
                }
                setOptions(next);
                setActive(next.findIndex((option) => !option.missing));
                setError(null);
            } catch (caught) {
                if (requestId === lastRequest.current) {
                    setOptions([]);
                    setError(caught);
                }
            } finally {
                if (requestId === lastRequest.current) {
                    setLoading(false);
                }
            }
        }, query ? 250 : 0);
        return () => clearTimeout(timer);
    }, [query]);

    const pick = (option) => {
        if (!option || option.missing) {
            return;
        }
        setSelected({ id: option.id, name: option.name });
        setQuery("");
        setOpen(false);
    };

    const changed = (selected?.id ?? false) !== (initial?.id ?? false);

    const submit = async (event) => {
        event?.preventDefault();
        if (!changed) {
            onCancel();
            return;
        }
        setSaving(true);
        await onSave(selected ? selected.id : false);
        setSaving(false);
    };

    const move = (step) => {
        if (!options.some((option) => !option.missing)) {
            return;
        }
        let index = active;
        do {
            index = (index + step + options.length) % options.length;
        } while (options[index].missing && index !== active);
        setActive(index);
    };

    const onKeyDown = (event) => {
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                open ? move(1) : setOpen(true);
                break;
            case "ArrowUp":
                event.preventDefault();
                open ? move(-1) : setOpen(true);
                break;
            case "Enter":
                event.preventDefault();
                if (open && options[active]) {
                    pick(options[active]);
                } else {
                    submit();
                }
                break;
            case "Escape":
                event.preventDefault();
                open ? setOpen(false) : onCancel();
                break;
            case "Tab":
                setOpen(false);
                break;
        }
    };

    const listId = `odt-m2o-${field.name || "field"}`;
    return (
        <form class="odt-editor odt-m2o-editor" onSubmit={submit}>
            <div class="odt-m2o-selected">
                {selected ? (
                    <span class="odt-m2o-chip">
                        <span class="odt-ellipsis">{selected.name || `#${selected.id}`}</span>
                        <span class="odt-muted">#{selected.id}</span>
                        <button type="button" title={t("clearValue")} aria-label={t("clearValue")} onClick={() => setSelected(null)}>
                            <Icon name="x" size={12} />
                        </button>
                    </span>
                ) : (
                    <span class="odt-empty-value">False</span>
                )}
                {changed && <span class="odt-muted odt-small">{t("unsavedChange")}</span>}
            </div>
            <div class="odt-combobox">
                <Icon name="search" size={14} />
                <input
                    ref={inputRef}
                    class="odt-input"
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    placeholder={t("m2oSearch", field.relation)}
                    value={query}
                    onInput={(event) => {
                        setQuery(event.currentTarget.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    spellcheck={false}
                    autocomplete="off"
                />
                {loading && <span class="odt-spinner odt-spinner-sm" />}
                {open && (
                    <ul class="odt-options" id={listId} role="listbox">
                        {options.map((option, index) => (
                            <li
                                key={`${option.byId ? "id" : "name"}-${option.id}`}
                                role="option"
                                aria-selected={index === active}
                                aria-disabled={option.missing}
                                class={`odt-option ${index === active ? "is-active" : ""} ${option.missing ? "is-missing" : ""}`}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    pick(option);
                                }}
                                onMouseEnter={() => !option.missing && setActive(index)}
                            >
                                {option.byId && <span class="odt-badge">ID</span>}
                                <span class="odt-ellipsis">{option.missing ? t("idNotFound", option.id) : option.name}</span>
                                {!option.missing && <span class="odt-muted">#{option.id}</span>}
                            </li>
                        ))}
                        {!loading && !options.length && !error && <li class="odt-option-note">{t("noMatches")}</li>}
                        {options.filter((option) => !option.byId).length >= LIMIT && <li class="odt-option-note">{t("refineSearch")}</li>}
                    </ul>
                )}
            </div>
            <ErrorBox error={error} />
            <div class="odt-editor-actions">
                <Button small variant="primary" icon="check" type="submit" disabled={saving || !changed}>{t("save")}</Button>
                <Button small onClick={onCancel} disabled={saving}>{t("cancel")}</Button>
            </div>
            <div class="odt-muted odt-small">{t("m2oDomainHint")}</div>
        </form>
    );
}
