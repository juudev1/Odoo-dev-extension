/**
 * Bridge between the page script (MAIN world, can read Odoo's JS objects)
 * and the content script (ISOLATED world, owns the UI and the extension
 * storage). The page and any other script can read these messages, so only
 * data the page already has goes through here: never settings or history.
 */
export const CHANNEL = "odoo-dev-tools/v2";

export const TO_PAGE = "to-page";
export const TO_CONTENT = "to-content";

export function postBridgeMessage(dir, message) {
    window.postMessage({ channel: CHANNEL, dir, ...message }, "*");
}

export function isBridgeMessage(event, dir) {
    const data = event.data;
    return (
        event.source === window &&
        data !== null &&
        typeof data === "object" &&
        data.channel === CHANNEL &&
        data.dir === dir
    );
}

/** Attribute the page script sets on the element under inspection. */
export const ANCHOR_ATTRIBUTE = "data-odoo-dev-anchor";
