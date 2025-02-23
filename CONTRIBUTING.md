# Guía de Contribución para Odoo Dev Tools Extension

## Requisitos Previos
- [Node.js](https://nodejs.org/) v18.12.1 o superior (Recomendado LTS)
- [npm](https://www.npmjs.com/) v9.8.1 o superior
- Chrome v115 o superior

## Instalación Inicial
1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/odoo-dev-tools.git
cd odoo-dev-tools
```

2. Instalar dependencias:
```bash
npm install
```

## Compilación del Código

### Desarrollo (Modo Watch)
```bash
npm run dev
```
- Compila los assets en modo desarrollo
- Genera source maps para debugging
- Vigila cambios en archivos y recompila automáticamente
  
Si el modo desarrollo no funciona por errores de `eval` intenta arreglarlo ya que pasa siempre, por ahora se trabaja siempre en modo producción.

### Producción
```bash
npm run build
```
- Optimiza el código para producción
- Minifica los archivos JS
- Elimina código no utilizado (Tree Shaking)

### Limpiar builds previos
```bash
npm run clean
```

## Flujo de Trabajo de Desarrollo
1. Iniciar el watcher:
```bash
npm run dev
```

2. En Chrome:
   - Ir a `chrome://extensions`
   - Activar "Modo desarrollador"
   - Cargar la extensión desde el directorio que contiene `manifest.json`

3. Para depurar:
   - Usar `console.log` con prefijos identificativos:
   ```javascript
   console.log('[ODoo Dev] Mensaje de depuración');
   ```
   - Inspeccionar la extensión con Chrome DevTools

## Guía de Estilo de Código
- **Variables:** `camelCase` para variables y funciones
- **Clases:** `PascalCase`
- **Constantes:** `UPPER_SNAKE_CASE`
- **Indentación:** 2 espacios
- **Comillas:** Simple (') para JS, Doble (") para HTML/XML

## Envío de Cambios
1. Crear una nueva rama:
```bash
git checkout -b feature/nombre-de-la-funcionalidad
```

2. Hacer commits descriptivos:
```bash
git commit -m "feat: Add XML template loader [ODEV-123]"
```
   - Prefijos válidos: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`

3. Subir cambios y crear Pull Request:
```bash
git push origin feature/nombre-de-la-funcionalidad
```

## Troubleshooting Común

### Error: "Module not found"
```bash
rm -rf node_modules/ && npm install
```

### Problemas de Content Security Policy (CSP)
1. Actualizar `manifest.json`:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

### Los cambios no se reflejan en Chrome
1. Recargar la extensión:
   - Ir a `chrome://extensions`
   - Click en ↻ en la extensión
2. Limpiar caché del navegador: `Ctrl + Shift + R`

## Estructura del Proyecto
```
odoo-dev-tools/
├── dist/                # Builds compilados (no versionado)
├── src/
│   ├── injected/       # Código inyectado en páginas web
│   │   └── core/       # Punto de entrada de la extensión
│   ├── extension/      # Scripts de la extensión Chrome
├── public/             # Assets estáticos
├── webpack.config.js   # Configuración de Webpack
└── manifest.json       # Manifesto de la extensión
```

## Licencia
Al contribuir, aceptas licenciar tu código bajo los términos de [LICENSE](LICENSE).

---

¿Necesitas ayuda adicional? Contacta al mantenedor: [hugo.gonzalezdev@gmail.com](mailto:hugo.gonzalezdev@gmail.com)
