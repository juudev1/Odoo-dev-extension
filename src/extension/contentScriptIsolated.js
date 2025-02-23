// src/extension/contentScriptIsolated.js
(() => {
  const extensionId = chrome.runtime.id;
  const extensionUrl = chrome.runtime.getURL('');
  
  // Envía los datos de inicialización inmediatamente
  window.postMessage({
      type: 'EXTENSION_INIT',
      data: {
          id: extensionId,
          url: extensionUrl,
          version: chrome.runtime.getManifest().version
      }
  }, '*');
})();