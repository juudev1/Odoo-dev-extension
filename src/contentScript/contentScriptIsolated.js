window.addEventListener("load", async function () {
    const scriptUrl = chrome.runtime.getURL('build/main.js');
    window.postMessage(
        {
            type: 'FROM_PAGE',
            state: scriptUrl,
        },
        "*"
    );
});