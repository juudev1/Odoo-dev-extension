// src/extension/contentScriptIsolated.js

// Variable para almacenar datos y evitar llamadas repetidas a storage/manifest
let extensionInitData = null;
let isDataReady = false;

// Función para obtener los datos (async)
async function prepareExtensionData() {
  if (isDataReady) return extensionInitData;

  try {
    const storedImage = await new Promise((resolve, reject) => {
      // Añadir manejo de error de chrome.runtime.lastError
      chrome.storage.local.get(["odoo_bg"], function (result) {
        if (chrome.runtime.lastError) {
          console.error("Storage Error:", chrome.runtime.lastError.message);
          // Devolver null o un valor por defecto si falla el storage
          return resolve(null);
        }
        resolve(result.odoo_bg || null); // Devolver null si no existe
      });
    });

    const manifest = chrome.runtime.getManifest();

    extensionInitData = {
      id: chrome.runtime.id,
      url: chrome.runtime.getURL(''),
      version: manifest.version,
      backgroundImg: storedImage // Puede ser null si no hay imagen o hubo error
    };
    isDataReady = true;
    console.log('[Isolated Script] Extension data prepared:', extensionInitData);
    return extensionInitData;
  } catch (error) {
    console.error('[Isolated Script] Error preparing extension data:', error);
    isDataReady = false; // Marcar como no listo si hay error
    return null; // Indicar fallo
  }
}

// Listener para solicitudes desde el MAIN world
window.addEventListener('message', async (event) => {
  // Asegurarse de que el mensaje es del tipo esperado y de la misma ventana
  if (event.source === window && event.data && event.data.type === 'REQUEST_EXTENSION_INIT') {
    console.log('[Isolated Script] Received REQUEST_EXTENSION_INIT');

    // Preparar los datos si aún no están listos
    const dataToSend = await prepareExtensionData();

    if (dataToSend) {
      // Responder al MAIN world
      console.log('[Isolated Script] Sending EXTENSION_INIT response.');
      window.postMessage({
        type: 'EXTENSION_INIT',
        data: dataToSend
      }, '*');
    } else {
      console.error('[Isolated Script] Cannot send EXTENSION_INIT, data preparation failed.');
      // Opcional: enviar un mensaje de error al MAIN world?
      // window.postMessage({ type: 'EXTENSION_INIT_ERROR', error: 'Failed to prepare data' }, '*');
    }
  }
});

// Opcional: Preparar los datos al inicio para que estén listos cuando se pidan
prepareExtensionData();

// // Quitar el envío proactivo inicial, ya que ahora respondemos a la solicitud
// (async() => {
//   const data = await prepareExtensionData();
//   if (data) {
//        window.postMessage({ type: 'EXTENSION_INIT', data }, '*');
//    }
// })();