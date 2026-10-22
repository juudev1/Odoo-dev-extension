import { ext } from "./ext.js";

/**
 * Translated text from _locales (generated from messages.js at build time).
 * Substitutions are $1, $2… in the message.
 */
export function t(key, ...substitutions) {
    let text = "";
    try {
        text = ext?.i18n?.getMessage(key, substitutions.map(String)) || "";
    } catch {
        text = "";
    }
    return text || key;
}
