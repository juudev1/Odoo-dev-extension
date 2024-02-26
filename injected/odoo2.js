
function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if (d > 0) {//Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

var recordId = null;
var model = null;
var modelName = null;

function session() {
    window.odoo.define('odoo_dev.' + generateUUID(), function (require) {
        var FormController = require('web.FormController');

        FormController.include({
            on_attach_callback: async function ($node) {
                this._super.apply(this, arguments); // Call the original method

                var rpc = require('web.rpc');
                var model = this.modelName; // The current model
                var recordId = this.renderer.state.res_id; // The current record ID
                var fields = this.model.loadParams.fields; // The fields of the current model

                var data = await rpc.query({
                    model: model,
                    method: 'search_read',
                    kwargs: {
                        domain: [['id', '=', recordId]],
                    },
                })

                var container = document.createElement('div');
                var $form = this.$el.find('.o_content');
                $form.css("display", "flex");
                $form.append(container);
                

                drawMenu(container, data[0], fields);
            },
        });

        // var rpc = require('web.rpc');
        // console.log(this);
        // rpc.query({
        //     model: 'sport.session',
        //     method: 'search_session_and_subscription'
        // }).then(function (data) {
        //     console.log(data);
        // });
    });
}


function drawMenu(container, fieldsAndValues, fields) {
    // Crear un nuevo elemento div para el menú
    var menu = document.createElement('div');

    // Aplicar estilos flexbox al menú
    menu.style.display = 'flex';
    menu.style.justifyContent = 'space-between';
    menu.style.alignItems = 'center';
    menu.style.padding = '10px';
    menu.style.backgroundColor = '#f0f0f0';
    menu.style.border = '1px solid #e3e3e3';

    // Crear un nuevo elemento select
    var select = document.createElement('select');

    // Agregar opciones al select
    var option1 = document.createElement('option');
    option1.value = 'option1';
    option1.text = 'Ver campos de Odoo';
    select.appendChild(option1);

    var option2 = document.createElement('option');
    option2.value = 'option2';
    option2.text = 'Otra opción';
    select.appendChild(option2);

    // Agregar el select al menú
    menu.appendChild(select);

    // Agregar el menú al cuerpo del documento
    container.appendChild(menu);

    // Ahora puedes escuchar el evento 'change' del select para realizar diferentes acciones dependiendo de la opción seleccionada
    select.addEventListener('change', function () {
        if (this.value === 'option1') {
            drawFields(container, fieldsAndValues);
        } else if (this.value === 'option2') {
            // Realizar otra acción
        }
    });
}

function drawFields(container, fieldsAndValues, fields) {
    // Agrega estilos al contenedor
    container.style.position = 'sticky';
    container.style.right = '0';
    container.style.top = '0';
    container.style.width = '25%';
    container.style.height = '100%';
    container.style.overflowY = 'scroll';
    container.style.border = '1px solid #e3e3e3';

    // Obtén el elemento padre donde se agregarán los divs
    console.log(fieldsAndValues)
    console.log(this)

    for (const [key, value] of Object.entries(fieldsAndValues)) {
        // Crea un nuevo div y establece su contenido
        let div = document.createElement('div');

        // Agrega estilos al div
        div.style.padding = '10px';
        div.style.margin = '10px';
        div.style.border = '1px solid black';
        div.style.borderRadius = '5px';
        div.style.backgroundColor = '#f0f0f0';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';

        // Crea un nuevo span para el tipo de campo
        let span = document.createElement('span');
        span.style.color = 'red';

        span.textContent = fields[key].type;
        div.textContent = `${key}: ${value}`;
        div.appendChild(span);

        // Agrega el div al elemento padre
        container.appendChild(div);
    }
}

session();