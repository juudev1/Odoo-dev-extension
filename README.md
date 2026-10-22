# Odoo Dev Tools

Extensión de Chrome para desarrolladores de Odoo 15 a 19, Community y Enterprise, incluidas las versiones SaaS (`saas~17.x`, `saas~18.x`).

## Qué hace

- **Inspector.** Ctrl + clic derecho sobre un campo, una etiqueta, un botón, una celda o cabecera de lista, o una tarjeta kanban muestra:
  - el nombre técnico, el tipo, la relación y el widget;
  - el contexto y el dominio;
  - `invisible`, `readonly` y `required` con su expresión y su valor actual;
  - el valor del campo y la vista de la que viene.

  Funciona sin activar el modo debug. La tecla se puede cambiar a Alt o Shift.
- **Panel lateral**, con cuatro pestañas:
  - **Registro**: todos los campos del registro abierto con su valor. Permite filtrar, editar valores, seguir relaciones many2one y one2many dentro del panel y ver la definición de cada campo.
  - **Vista**: la acción, la vista con su ID externo, el árbol de herencia, la arquitectura combinada, el contexto y el modelo.
  - **Método**: ejecuta métodos públicos del modelo, sobre el registro abierto o sobre el modelo, y muestra el código equivalente en Python y JS. Guarda un historial.
  - **Informes**: los informes del modelo, con vista previa HTML que se recarga en el panel y apertura en PDF.
- **XPath.** Para cualquier campo o botón:
  - calcula sobre la vista combinada un XPath que encuentra un único nodo;
  - dice qué vista y qué módulo añadieron el nodo y cuáles lo modifican;
  - genera el XML de herencia listo para pegar.
- **Utilidades:**
  - modo debug (normal, debug, assets);
  - modo oscuro de Odoo Enterprise;
  - fondo personalizado para el menú de inicio de Enterprise;
  - activar o desactivar la extensión por sitio.

## Instalación

```bash
npm install
npm run build
```

En Chrome, abre `chrome://extensions`, activa el modo desarrollador y pulsa **Cargar descomprimida**. Selecciona la carpeta `build/chrome`.

Mientras desarrollas, `npm run watch` recompila en cada cambio. Después pulsa recargar en la tarjeta de la extensión.

## Compatibilidad

| | 15 | 16 | 17 | 18 / saas~18 | 19 |
|---|---|---|---|---|---|
| Inspector en form, lista y kanban | sí (vistas legacy) | sí | sí | sí | sí |
| Panel: registro, vista, método, informes | sí | sí | sí | sí | sí |
| XPath y XML de herencia | sí | sí | sí | sí | sí |
| Modo oscuro de Odoo | no existe | Enterprise | Enterprise | Enterprise | Enterprise |
| Fondo del menú de inicio | Enterprise | Enterprise | Enterprise | Enterprise | Enterprise |

Requiere Chrome 111 o superior.

## Cómo está hecha

La extensión **no modifica Odoo**: no parchea componentes, no reemplaza plantillas y no registra módulos en el cargador de Odoo. Solo lee lo que el cliente web ya tiene en memoria. Si una versión futura de Odoo cambia algo interno, falla la función afectada de la extensión y Odoo sigue funcionando igual.

Se compone de tres partes:

- `src/page/`: script en el contexto de la página (`world: MAIN`). Lee el árbol de componentes OWL (`odoo.__WOWL_DEBUG__.root`), el `action` service y, en la 15, los widgets legacy. Hace las llamadas JSON-RPC a `/web/dataset/call_kw` con la sesión del usuario. No tiene interfaz.
- `src/content/`: content script (contexto aislado). Contiene toda la interfaz (Preact) dentro de un Shadow DOM, así que el CSS de Odoo o de temas como spiffy/muk no le afecta ni ella a Odoo. Gestiona los ajustes y el historial en `chrome.storage`. Sus errores no llegan al diálogo de errores de Odoo.
- `src/popup/`: ventana de ajustes de la extensión.

Los dos scripts se comunican por `window.postMessage` (`src/shared/protocol.js`). Por ese canal solo pasan datos que la propia página ya tiene, nunca ajustes ni historial.

Las diferencias entre versiones están aisladas:

- `src/page/inspect.js` y `src/page/context.js`: OWL 2 (16+) frente a widgets legacy (15).
- `src/content/api.js`: `get_views` frente a `fields_view_get`, y `list` frente a `tree`.

El manifest se genera por navegador (`src/manifest.js`). Firefox 128+ está previsto (`npm run build:firefox`), pero todavía no está probado.
