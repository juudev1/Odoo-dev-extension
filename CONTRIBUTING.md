# Guía de contribución

## Requisitos

- Node.js 18 o superior
- Chrome 111 o superior

## Compilar

```bash
npm install
npm run build          # build/chrome
npm run watch          # recompila en cada cambio
npm run build:firefox  # build/firefox (previsto, sin probar)
```

Carga `build/chrome` en `chrome://extensions` con «Cargar descomprimida». Tras cada cambio, pulsa ↻ en la tarjeta de la extensión y recarga la pestaña de Odoo.

El build falla si el código usa un texto con `t("clave")` que no está en `src/shared/messages.js`, o si a una clave le falta el inglés o el español.

## Estructura

```
src/
├── manifest.js        Manifest por navegador
├── shared/            Código común: protocolo, ajustes, textos
├── page/              Script en la página (world MAIN): lee Odoo, hace RPC
│   ├── odoo.js        Detección, versión, módulos de Odoo, contexto de usuario
│   ├── tree.js        Recorrido del árbol OWL 1/2 y de widgets legacy
│   ├── components.js  Identificación de Field, ViewButton, ListRenderer…
│   ├── inspect.js     Qué hay bajo el cursor (OWL 16+ y legacy 15)
│   ├── context.js     Acción, vista y registro activos
│   ├── actions.js     Abrir registros, recargar la vista, modo oscuro
│   └── rpc.js         JSON-RPC a /web/dataset/call_kw
├── content/           Content script: interfaz (Preact en Shadow DOM)
│   ├── api.js         Lecturas al servidor y diferencias entre versiones
│   ├── xpath.js       XPath, historial de herencia y XML de herencia
│   └── ui/            Panel, pestañas, inspector y diálogos
└── popup/             Ajustes de la extensión
```

## Reglas

- **No modificar Odoo.** Nada de `patch()`, de reemplazar plantillas ni de `odoo.define`. Solo se lee. Si algo interno no existe en una versión, la función devuelve `null` y la interfaz lo muestra como no disponible.
- **Todo lo que dependa de la versión va en `page/` o en `content/api.js`.** La interfaz no pregunta por versiones.
- **El script de página atrapa sus propios errores.** Un error sin capturar ahí llega al servicio de errores de Odoo y, en modo debug, abre un diálogo.
- Antes de usar un campo, un método o un módulo de Odoo, compruébalo en el código fuente de cada versión (15 a 19).
- Estilo: 4 espacios, comillas dobles, nombres en inglés en el código y textos de la interfaz en `messages.js`.

## Commits

Mensajes en español y cortos, con el prefijo que ya usa el historial: `[ADD]`, `[FIX]`, `[IMP]`, `[REF]`.

## Contacto

[hugo.gonzalezdev@gmail.com](mailto:hugo.gonzalezdev@gmail.com)
