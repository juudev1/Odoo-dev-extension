# Política de Privacidad de Odoo Dev Extension

**Última actualización:** 20 de junio de 2026

En **Odoo Dev Extension**, la privacidad de nuestros usuarios es una prioridad fundamental. Esta política explica cómo manejamos los datos cuando utilizas nuestra extensión de Chrome.

## 1. Recopilación de Datos

**Odoo Dev Extension NO recopila, rastrea ni almacena datos personales de ningún tipo.**

La finalidad de la extensión es servir como una herramienta de desarrollo local que inspecciona el DOM y los objetos técnicos del cliente web de Odoo (registros, modelos, variables de contexto, etc.). Toda la inspección y manipulación de datos ocurre **estrictamente de manera local** dentro de tu navegador web.

## 2. Qué Información se Almacena Localmente

La extensión únicamente hace uso de la API `chrome.storage.local` para guardar configuraciones básicas de la interfaz que mejoran tu experiencia de usuario. Estos datos nunca salen de tu dispositivo:

- **Preferencias de visualización:** Estado del panel lateral (abierto o cerrado).
- **Tema de la interfaz:** Preferencia de modo claro u oscuro.

Ninguno de estos datos se transfiere a nuestros servidores ni a servicios de terceros.

## 3. Uso de Permisos (Host Permissions)

La extensión solicita permisos amplios de host (`<all_urls>`) con el único propósito de inyectar el panel de herramientas de desarrollo (Sidebar) en cualquier entorno en el que estés ejecutando Odoo (por ejemplo: `localhost`, dominios corporativos internos, o servidores de Odoo.sh). El código de la extensión **no** interactúa, lee ni modifica ninguna otra página web fuera del contexto del framework de Odoo.

## 4. Cambios en la Política de Privacidad

Dado que la extensión es de código abierto y no recopila información, no prevemos cambios drásticos en el uso de datos. Sin embargo, en caso de actualizar nuestras prácticas de privacidad en el futuro, esta política será modificada en nuestro repositorio público y se indicará la fecha de la última actualización.

## 5. Contacto

Si tienes alguna pregunta o inquietud sobre esta política de privacidad o sobre el código fuente de la extensión, puedes crear un *Issue* en nuestro repositorio público de GitHub:

[https://github.com/juudev1/Odoo-dev-extension](https://github.com/juudev1/Odoo-dev-extension)
