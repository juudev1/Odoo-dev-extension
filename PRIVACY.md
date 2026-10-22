# Política de Privacidad de Odoo Dev Extension

**Última actualización:** 22 de octubre de 2026

En **Odoo Dev Extension**, la privacidad de nuestros usuarios es una prioridad fundamental. Esta política explica cómo manejamos los datos cuando utilizas nuestra extensión de Chrome.

## 1. Recopilación de Datos

**Odoo Dev Extension NO recopila, rastrea ni almacena datos personales de ningún tipo.**

La finalidad de la extensión es servir como una herramienta de desarrollo local que inspecciona el DOM y los objetos técnicos del cliente web de Odoo (registros, modelos, variables de contexto, etc.). Toda la inspección y manipulación de datos ocurre **estrictamente de manera local** dentro de tu navegador web.

## 2. Qué Información se Almacena Localmente

La extensión usa `chrome.storage.local` para guardar, solo en tu navegador:

- **Ajustes:** si la extensión está activa (en general y por sitio), la tecla del inspector, el botón flotante, el tema del panel.
- **Estado del panel:** si está abierto, su ancho, si está anclado y la pestaña activa.
- **Historial de «Método»:** las últimas llamadas que ejecutaste (modelo, método y argumentos).
- **Imagen de fondo:** la imagen que elijas para el menú de inicio, comprimida.

Ninguno de estos datos sale de tu navegador.

## 3. Comunicación con Servidores

La extensión no envía datos a ningún servidor propio ni de terceros. Las únicas peticiones de red que hace son llamadas JSON-RPC al mismo servidor de Odoo de la pestaña (`/web/dataset/call_kw`), con tu sesión y tus permisos, igual que las que hace el propio cliente web de Odoo.

## 3.1. Uso de Permisos

La extensión declara sus scripts para todas las URL (`<all_urls>`) porque Odoo puede estar en cualquier dominio (`localhost`, odoo.sh, servidores propios). En las páginas que no son el backend de Odoo, los scripts terminan sin hacer nada. Desde el popup puedes desactivarla en un sitio concreto.

## 4. Cambios en la Política de Privacidad

Dado que la extensión es de código abierto y no recopila información, no prevemos cambios drásticos en el uso de datos. Sin embargo, en caso de actualizar nuestras prácticas de privacidad en el futuro, esta política será modificada en nuestro repositorio público y se indicará la fecha de la última actualización.

## 5. Contacto

Si tienes alguna pregunta o inquietud sobre esta política de privacidad o sobre el código fuente de la extensión, puedes crear un *Issue* en nuestro repositorio público de GitHub:

[https://github.com/juudev1/Odoo-dev-extension](https://github.com/juudev1/Odoo-dev-extension)
