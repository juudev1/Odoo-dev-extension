// Esto es 100% necesario ya que no podemos saber que id tomará la extension y la url se genera dinamicamente

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

