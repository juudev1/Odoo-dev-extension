window.addEventListener("load", async function () {
    const scriptUrl = chrome.runtime.getURL('src/contentScript/templates.xml');
    const stylesUrl = chrome.runtime.getURL('src/contentScript/styles.css');
    window.postMessage(
        {
            type: 'FROM_PAGE',
            state: [
                scriptUrl,
                stylesUrl
            ]
        },
        "*"
    );
});