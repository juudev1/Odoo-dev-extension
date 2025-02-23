
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

