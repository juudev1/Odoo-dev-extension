
Se muestran detalles de campos tan solo con dar clic derecho, aún cuando no tienen etiquetas.
![image](https://github.com/user-attachments/assets/5fdfb979-380a-4e5e-a489-ed12d3f42e74)

Imagen de fondo intercambiable permanente para todas las bases. (es solo visual, no se afecta la base de datos)
![image](https://github.com/user-attachments/assets/9f99c8c5-05db-4148-8e82-7b5b84bb7393)

Se agrega botón flotante en los formularios para abrir herramientas desarrollo
![image](https://github.com/user-attachments/assets/6520dc70-da92-4182-8722-1186265f10f7)

Get Record Values para obtener todos los campos y sus valores
![image](https://github.com/user-attachments/assets/628c1b29-4c6e-471b-a987-da35b5dfcd46)

Al dar clic en copiar, te dará los ID externo de las vistas dodne se encontró y un xpath apróximado para realizar la herencia
Por ahora es algo asi lo que te copea al portapapeles.
```json
[
  {
    "view": "res.partner.form",
    "xpath": "/form/sheet[3]/notebook[7]/page/field/kanban/field",
    "xml_id": "base.view_partner_form"
  }
]
```
Si se encuentra en más vistas te dará una lista de varios elementos.

Get Reports te permite ver en vivo los camibos que realizas en los PDF, para que no tengas que descargarlo cuando modificas las vistas QWEB
![image](https://github.com/user-attachments/assets/e665a885-b7b9-42cc-ac0e-a32d8e3bb34f)

Run Model Method te permite ejecutar métodos de python que no sean privados, es decir, que no inicien con _
![image](https://github.com/user-attachments/assets/7cca7980-3060-471b-a46f-50dfb85f66dc)

Próximamente más novedades y soporte a V15 y V16

**Extension Flow Explanation**

1.  **Initialization:**
    *   When you navigate to an Odoo page matching `http(s)://*/web*` (excluding login), the `manifest.json` injects two main scripts:
        *   `dist/contentScript.bundle.js` (from `src/extension/contentScriptIsolated.js`) into an **ISOLATED** world.
        *   `dist/loader.bundle.js` (from `src/injected/index.js` and its dependencies like `ExtensionCore`) into the **MAIN** world (the page's own JavaScript context).
2.  **Data Bridge (Isolated -> Main):**
    *   The **ISOLATED** script (`contentScriptIsolated.js`) immediately reads the background image from `chrome.storage.local`.
    *   It then gathers the extension ID, URL, version, and the background image data.
    *   It uses `window.postMessage` to send this data package (type `EXTENSION_INIT`) to the MAIN world.
3.  **Main World Setup (`loader.bundle.js` / `ExtensionCore`):**
    *   The `ExtensionCore` class in the MAIN world has an `init()` method.
    *   This `init()` method sets up a listener for the `EXTENSION_INIT` message from the isolated script. It also sends a `REQUEST_EXTENSION_INIT` message as a fallback (though the isolated script sends proactively).
    *   Once the `EXTENSION_INIT` message is received, `ExtensionCore.init()` resolves, storing the extension's data (URL, ID, background image etc.).
4.  **Dynamic Module Loading (`loader.bundle.js` / `src/injected/index.js` logic):**
    *   After `ExtensionCore` is initialized, the logic originally in `src/injected/index.js` (now part of `loader.bundle.js`) dynamically creates `<script type="module">` tags to load all the other necessary injected modules (`core/client.js`, `tooltip/*`, `views/*`, etc.) from the `src/injected/` directory using the extension URL provided by `ExtensionCore`. These files *must* be declared in `manifest.json`'s `web_accessible_resources`.
5.  **Odoo Integration (`src/injected/core/client.js` and others):**
    *   `core/client.js` acts as the main entry point *within* the Odoo environment (`odoo.define`).
    *   It uses `ExtensionCore` to get resource paths (templates, CSS).
    *   It applies the background image using a dynamic `<style>` tag.
    *   It calls `xmlBundle.loadTemplatesAndCSS` to load custom XML templates and CSS into Odoo's asset management system, handling different Odoo versions (16, 17, 18+).
    *   Other loaded modules (`views/*`, `tooltip/*`, `form_label.js`) use `odoo.define` and Odoo's patching mechanism (`@web/core/utils/patch`) to:
        *   Modify existing Odoo components (Fields, List Renderer, Form Controller, Buttons, Labels, Form Compiler) to add tooltips or integrate custom features.
        *   Define new components (SidebarDev, FieldXpath) and services (devinfo).
        *   Register custom templates.
6.  **User Interaction:**
    *   **Right-Click:** Triggers the custom `devinfo` service (`src/injected/tooltip/js/dev_info_service.js`) to show technical details via tooltips defined in templates like `odoo_dev.FieldTooltip` and `odoo_dev.ViewButtonTooltip`.
    *   **Floating Button:** Added by the patched `FormController` (`src/injected/views/form/form_controller.js` + `form_view.xml`), it toggles the `SideBarDev` component.
    *   **Sidebar:** (`src/injected/views/custom/sidebar_dev.js` + `.xml` + `.css`) Allows fetching record values, finding reports, running model methods via ORM calls, and copying XPath expressions (using `FieldXpath` component).
    *   **Popup (`static/index.html`):** Allows the user to select an image file. On "Save", `static/script.js` reads the file as Base64 and saves it to `chrome.storage.local` under the key `odoo_bg`. It also displays a preview.