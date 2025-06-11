// src/extension/contentScriptIsolated.js

// --- Constants for Storage Keys ---
const EXTENSION_ENABLED_KEY = 'odooDevExtensionEnabled';
const BACKGROUND_ENABLED_KEY = 'odooDevEnableBackground';
const IMAGE_STORAGE_KEY = 'odoo_bg'; // Assuming this is your key for the image data URL

// --- Module-level State ---
let extensionInitData = null; // Cached data: { id, url, version, backgroundImg, isEnabled, isBackgroundEnabled }
let isDataReady = false;      // Flag to indicate if extensionInitData is populated

/**
 * Fetches all relevant extension states from chrome.storage.local.
 * @returns {Promise<object>} A promise that resolves to an object containing isEnabled and isBackgroundEnabled states.
 */
async function getStatesFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get([EXTENSION_ENABLED_KEY, BACKGROUND_ENABLED_KEY], (result) => {
            if (chrome.runtime.lastError) {
                console.error("[Isolated Script] Storage Error getting states:", chrome.runtime.lastError.message);
                // Default to true for both if storage fails, to ensure features are on by default on error
                resolve({ isEnabled: true, isBackgroundEnabled: true });
                return;
            }
            resolve({
                isEnabled: result[EXTENSION_ENABLED_KEY] !== false,         // Default to true if undefined
                isBackgroundEnabled: result[BACKGROUND_ENABLED_KEY] !== false // Default to true if undefined
            });
        });
    });
}

/**
 * Fetches the stored background image (as a data URL).
 * @returns {Promise<string|null>} A promise that resolves to the image data URL or null.
 */
async function getStoredBackgroundImage() {
    return new Promise((resolve) => {
        chrome.storage.local.get([IMAGE_STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
                console.error("[Isolated Script] Storage Error getting background image:", chrome.runtime.lastError.message);
                resolve(null);
                return;
            }
            resolve(result[IMAGE_STORAGE_KEY] || null); // Return null if not set
        });
    });
}

/**
 * Prepares the initial data for the extension, including states from storage and manifest details.
 * This function populates/updates `extensionInitData`.
 * @param {boolean} forceRefresh - If true, re-fetches states and image from storage even if data is already "ready".
 * @returns {Promise<object|null>} The prepared extension data object, or null on critical error.
 */
async function prepareExtensionData(forceRefresh = false) {
    if (isDataReady && !forceRefresh) {
        return extensionInitData;
    }

    console.log(`[Isolated Script] Preparing extension data. Force refresh: ${forceRefresh}`);
    try {
        const states = await getStatesFromStorage(); // Always get the latest states
        const storedImage = await getStoredBackgroundImage(); // Get the latest image
        const manifest = chrome.runtime.getManifest();

        extensionInitData = {
            id: chrome.runtime.id,
            url: chrome.runtime.getURL(''),
            version: manifest.version,
            backgroundImg: storedImage,           // Current stored image
            isEnabled: states.isEnabled,          // Current main extension enabled state
            isBackgroundEnabled: states.isBackgroundEnabled // Current background enabled state
        };
        isDataReady = true; // Mark data as ready (or re-validated)
        console.log('[Isolated Script] Extension data prepared successfully:', extensionInitData);
        return extensionInitData;
    } catch (error) {
        console.error('[Isolated Script] Critical error preparing extension data:', error);
        isDataReady = false; // Mark as not ready if there was an error
        extensionInitData = null; // Clear potentially stale data
        return null; // Indicate failure
    }
}

/**
 * Sends the current `extensionInitData` to the MAIN world via postMessage.
 * @param {boolean} forceDataRefresh - If true, calls prepareExtensionData with forceRefresh=true before sending.
 */
async function sendInitDataToMainWorld(forceDataRefresh = false) {
    const dataToSend = await prepareExtensionData(forceDataRefresh); // Ensures data is up-to-date if forced

    if (dataToSend) {
        console.log('[Isolated Script] Sending EXTENSION_INIT to MAIN world. Data:', JSON.stringify(dataToSend));
        window.postMessage({
            type: 'EXTENSION_INIT',
            data: dataToSend
        }, '*'); // Target '*' is okay for same-window communication to MAIN world
    } else {
        console.error('[Isolated Script] Cannot send EXTENSION_INIT to MAIN world because data preparation failed.');
        window.postMessage({
            type: 'EXTENSION_INIT_ERROR',
            error: 'Failed to prepare extension data in isolated world.'
        }, '*');
    }
}

// --- Event Listeners ---

// Listen for requests from the MAIN world (e.g., ExtensionCore.init())
window.addEventListener('message', async (event) => {
    // Basic security: ensure the message is from the current window and has the expected structure
    if (event.source === window && event.data && event.data.type === 'REQUEST_EXTENSION_INIT') {
        console.log('[Isolated Script] Received REQUEST_EXTENSION_INIT from MAIN world.');
        // When MAIN world requests data, prepare it (if not ready) and send it.
        // Don't force refresh here; let the initial prepareExtensionData() call handle the first load.
        await sendInitDataToMainWorld();
    }
});

// Listen for messages from the popup (e.g., toggle changes)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Isolated Script] Received message from runtime:', request);

    if (request.type === 'ODEV_EXTENSION_STATE_CHANGED') {
        console.log('[Isolated Script] Main extension state changed by popup. New intended state:', request.enabled);
        // The popup has already updated chrome.storage.local for EXTENSION_ENABLED_KEY.
        // The strategy is to reload the page. On reload, prepareExtensionData will fetch the new state.
        console.log('[Isolated Script] Forcing page reload to apply main extension state change.');
        sendResponse({ status: "reloading_page_due_to_main_state_change" }); // Acknowledge before reload
        window.location.reload();
        // Return true because reload is happening, but the function technically "handles" the message.
        // The port will close due to reload anyway.
        return true;
    } else if (request.type === 'ODEV_BACKGROUND_STATE_CHANGED') {
        console.log('[Isolated Script] Background enabled state changed by popup. New state:', request.backgroundEnabled);
        // The popup has already updated chrome.storage.local for BACKGROUND_ENABLED_KEY.
        // We need to:
        // 1. Re-prepare extensionInitData to include this new `isBackgroundEnabled` state (and potentially new isEnabled state).
        // 2. Send this updated data to the MAIN world so it can react (e.g., client.js removing/adding background style).
        // NO PAGE RELOAD for this specific change.

        // Force prepareExtensionData to re-fetch all states from storage to ensure consistency
        sendInitDataToMainWorld(true) // Pass `true` to force data refresh
            .then(() => {
                console.log("[Isolated Script] Successfully resent init data to main world after background state change.");
                sendResponse({ status: "background_state_updated_and_resent_to_main" });
            })
            .catch(error => {
                console.error("[Isolated Script] Error sending init data to main world after background state change:", error);
                sendResponse({ status: "error_updating_main_world_for_background", error: error.message });
            });
        return true; // IMPORTANT: Indicate that sendResponse will be called asynchronously.
    }

    // If the message type isn't handled above, and you don't intend to send a response,
    // it's good practice to either return `false` or not return anything explicitly (undefined).
    // This signals to Chrome that the message port can be closed for this listener.
    // console.log("[Isolated Script] Unhandled message type:", request.type);
    // sendResponse({ status: "unknown_message_type" }); // Optional: if you want to always respond
    return false; // Or simply don't return if no other branches handle it.
});


// --- Initial Execution ---
// Prepare the extension data when the content script is first injected.
// This ensures that `extensionInitData` (including initial states from storage)
// is populated and ready when the MAIN world sends `REQUEST_EXTENSION_INIT`.
prepareExtensionData()
    .then(initialData => {
        if (initialData) {
            console.log("[Isolated Script] Initial data preparation complete on load.", initialData);
        } else {
            console.error("[Isolated Script] Initial data preparation failed on load.");
        }
    })
    .catch(error => {
        console.error("[Isolated Script] Error during initial data preparation on load:", error);
    });