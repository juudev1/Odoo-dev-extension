/**
 * Extension API namespace. Firefox exposes `browser`, Chrome `chrome`; both
 * return promises in MV3 for the APIs used here (storage, i18n, tabs).
 * Only available in the content script and the popup, never in page.js.
 */
export const ext = globalThis.browser ?? globalThis.chrome;
