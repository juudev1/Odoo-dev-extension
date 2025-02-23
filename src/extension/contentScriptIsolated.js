// 🔥 Método para obtener la imagen desde chrome.storage.local
async function getStoredImage() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["odoo_bg"], function (result) {
      if (result.odoo_bg) {
        resolve(result.odoo_bg); // Devuelve la imagen en Base64
      } else {
        reject(new Error("No se encontró la imagen"));
      }
    });
  });
}

(async() => {
  const extensionId = chrome.runtime.id;
  const extensionUrl = chrome.runtime.getURL('');

  // Envía los datos de inicialización inmediatamente
  window.postMessage({
    type: 'EXTENSION_INIT',
    data: {
      id: extensionId,
      url: extensionUrl,
      version: chrome.runtime.getManifest().version,
      backgroundImg: await getStoredImage()
    }
  }, '*');
})();