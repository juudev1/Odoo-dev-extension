// Función para hacer llamadas RPC a Odoo
function callOdooRpc(model, method, args, kwargs) {
    const url = '/web/dataset/call_kw/' + model + '/' + method;
    const payload = {
        method: 'call',
        params: {
            model: model,
            method: method,
            args: args,
            kwargs: kwargs,
        },
    };

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
        .then(response => response.json())
        .then(data => data.result);
}

// Función principal que inicia la aplicación
function main() {
    const container = createContainer();
    checkActionManagerExists(container);
}

// Crea un contenedor y aplica estilos
function createContainer() {
    const container = document.createElement('div');
    // Agrega estilos al contenedor
    container.style.position = 'relative';
    container.style.right = '0';
    container.style.top = '0';
    container.style.height = '100%';
    container.style.overflowY = 'scroll';
    container.style.border = '1px solid #e3e3e3';
    container.style.backgroundColor = '#f0f0f0';
    return container;
}


// Comprueba si el elemento .o_action_manager existe y si es así, agrega el contenedor
function checkActionManagerExists(container) {
    var intervalId = setInterval(function () {
        try {
            var actionManager = $('.o_action_manager');
            actionManager.css('display', 'flex');
            // Verifica si actionManager tiene un hijo antes de proceder
            var child = actionManager.children().first();
            if (actionManager.length && child.length) {
                // Inserta el contenedor y ajusta su tamaño
                actionManager.append(container);
                $(container).css({
                    'width': '400px',
                    'position': 'relative',
                    'z-index': '9998',
                    'display': 'none'
                });
                $(child).css({
                    'width': '100%',
                });

                // Agrega un botón para ocultar y mostrar el contenedor
                var toggleButton = $('<button>').css({
                    'position': 'fixed',
                    'top': '50%',
                    'right': '0',
                    'z-index': '9999',
                    'height': '50px',
                    'width': '50px',
                    'borderRadius': '50%'
                });
                toggleButton.html('<img src="https://play-lh.googleusercontent.com/Zv2I5VIii0ZK9sJ2FgPFZxynVqtcenDZkO9BUYMO-35sTExs21OsGXEj2kQQFkk2ww" style="width: 100%;"></img>');

                $('body').append(toggleButton);
                toggleButton.click(function () {
                    var isHidden = $(container).css('display') === 'none';
                    $(container).css('display', isHidden ? 'block' : 'none');
                    if (isHidden) {
                        // Mueve el botón al principio del contenedor cuando este está visible
                        $(container).prepend(toggleButton);
                        toggleButton.css({
                            'position': 'sticky',
                            'top': '0',
                            'right': 'auto',
                            'z-index': 'auto',
                            'width': '100%',
                            'borderRadius': '0'
                        });
                        // Cambia el texto del botón a "Cerrar Dev Tools"
                        toggleButton.text('Cerrar Dev Tools');
                    } else {
                        // Mueve el botón fuera del contenedor cuando este está oculto
                        $('body').append(toggleButton);
                        toggleButton.css({
                            'position': 'fixed',
                            'top': '50%',
                            'right': '0',
                            'z-index': '9999',
                            'width': '150px',
                            'height': '50px',
                            'width': '50px',
                            'borderRadius': '50%'
                        });
                        // Cambia el texto del botón a "Cerrar Dev Tools"
                        toggleButton.html('<img src="https://play-lh.googleusercontent.com/Zv2I5VIii0ZK9sJ2FgPFZxynVqtcenDZkO9BUYMO-35sTExs21OsGXEj2kQQFkk2ww" style="width: 100%;"></img>');
                        // Cambia el texto del botón a "Open Dev Tools"
                        // toggleButton.text('Open Dev Tools');

                        $(child).css({
                            'width': '100%',
                        });
                    }
                });
                drawMenu(container);
                clearInterval(intervalId);
            }
        } catch (error) {
            console.error(error);
            clearInterval(intervalId);
        }
    }, 100);
}

function menuItemStyle(element, textContent) {
    element.textContent = textContent;
    element.style.cursor = 'pointer';
    element.style.padding = '10px';
    // element.style.border = '1px solid black';
    element.style.borderRadius = '5px';
    element.style.backgroundColor = '#018ada';
    element.style.color = 'white';
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    element.style.width = '100%';
}

function drawMenu(container) {
    const menu = createMenuElement();
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    const fieldsOption = createMenuOption('Obtener campos');
    fieldsOption.addEventListener('click', handleFieldsOptionClick.bind(null, content));
    menu.append(fieldsOption);

    const filtersOption = createMenuOption('Filters');
    filtersOption.addEventListener('click', handleFiltersOptionClick);
    menu.append(filtersOption);

    container.append(menu);
    container.append(content);
}

function createMenuElement() {
    const menu = document.createElement('div');
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.justifyContent = 'space-between';
    menu.style.alignItems = 'center';
    menu.style.padding = '10px';
    menu.style.backgroundColor = '#f0f0f0';
    menu.style.border = '1px solid #e3e3e3';
    menu.style.width = '100%';
    menu.style.gap = '10px';
    return menu;
}

function createMenuOption(text) {
    const option = document.createElement('div');
    menuItemStyle(option, text);
    return option;
}

function getCurrentAction() {
    const current_action = JSON.parse(window.sessionStorage.getItem('current_action'));
    return current_action;
}

function getUrlData() {
    // Obtén la URL actual
    var url = new URL(window.location.href);

    // Obtén el fragmento de la URL después del '#'
    var hash = url.hash;

    // Crea un objeto URLSearchParams con el fragmento
    var params = new URLSearchParams(hash.substring(1));

    // Ahora puedes obtener el modelo y el res_id
    var model = params.get('model');
    var res_id = params.get('id');
    var view_type = params.get('view_type');

    return { model, res_id, view_type };
}

function handleFieldsOptionClick(container) {
    console.log('Fields');
    fetchAndDrawFields(container);
}

function handleFiltersOptionClick() {
    console.log('Filters');
    callOdooRpc('res.partner', 'read', [[1]], { fields: ['name', 'country_id', 'comment'] })
        .then(data => console.log(data));
}

function fetchAndDrawFields(container) {
    let fieldsAndValues = {};
    let fields = {};
    const action = getCurrentAction();
    const { model, res_id, view_type } = getUrlData();
    console.log(action);
    callOdooRpc(model, 'fields_get', [], {})
        .then(function (fields) {
            return callOdooRpc(model, 'search_read', [[['id', '=', res_id]]], {})
                .then(function (records) {
                    const fieldsAndValues = records[0];
                    drawFields(container, fieldsAndValues, fields);
                });
        });
}

function drawFields(container, fieldsAndValues, fields) {
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
        div.style.backgroundColor = '#ffffff';
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


main();