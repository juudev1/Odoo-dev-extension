import { useState, useEffect, useRef } from 'react';
import Drawer from '../components/drawer';
import Spinner from '../components/Spinner';
import RecordValues from '../components/RecordValues';

import Layout from '../Layouts/Layout';
import useOdooRpc from '../hooks/useOdooRpc';

const App = () => {
  const { callOdooRpc, getUrlData, callOdooRpcButton, getCurrentAction } = useOdooRpc();
  const [isLoading, setIsLoading] = useState(false);
  const [showRecordValues, setShowRecordValues] = useState(false);
  const [recordValues, setRecordValues] = useState([]);
  const [url, setUrl] = useState(window.location.href);
  const [fieldClicked, setFieldClicked] = useState(null);
  const [moduleClicked, setModuleClicked] = useState(null);
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);

  const popupRef = useRef(null);
  const modulePopupRef = useRef(null);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          setUrl(window.location.href);
        }
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [url]);  // Dependencia en la URL para que se ejecute cada vez que cambia la URL

  useEffect(() => {
    const { model, res_id, view_type } = getUrlData();

    if (showRecordValues && view_type == 'form') {
      setIsLoading(true);
      setShowRecordValues(false);

      getRecordValues().finally(() => {
        setIsLoading(false);
        setShowRecordValues(true);
      });
    }

  }, [url]);  // Dependencia en la URL para que se ejecute cada vez que cambia la URL

  useEffect(() => {
    const handleRightClick = (event) => {
      event.preventDefault(); // Evita el menú contextual predeterminado
      console.log(event.target); // Imprime el elemento en el que se hizo clic con el botón derecho

      var $element = event.target;
      var field;

      if ($element.getAttribute('name')) {
        field = $element.getAttribute('name');
      } else if ($element.getAttribute('data-name')) {
        field = $element.getAttribute('data-name');
      }

      // Si es un elemento del menu permitir actualizar
      if ($element.parentElement && $element.parentElement.getAttribute('data-menu-xmlid')) {
        const menuItem = $element.parentElement.getAttribute('data-menu-xmlid');
        const module = menuItem.split('.')[0];

        setModuleClicked({
          x: event.clientX,
          y: event.clientY,
          module: module
        });
        return;
      }

      // Busca al padre div que tenga name, maximo 10 padres hacia arriba
      if (!field) {
        for (let i = 0; i < 10; i++) {
          $element = $element.parentElement;
          if (!$element) break;
          if ($element.getAttribute('name')) {
            field = $element.getAttribute('name');
            break;
          } else if ($element.getAttribute('data-name')) {
            field = $element.getAttribute('data-name');
            break;
          }
        }
      }
      if (field) {
        setFieldClicked({
          x: event.clientX,
          y: event.clientY,
          field: field
        });
      }
    };
    const handleLeftClick = () => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setFieldClicked(null);
      }
      if (modulePopupRef.current && !modulePopupRef.current.contains(event.target)) {
        setModuleClicked(null);
      }
    };

    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('click', handleLeftClick);

    return () => {
      // Limpia el event listener cuando el componente se desmonta
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('click', handleLeftClick);
    };
  }, []); // Dependencias vacías para que se ejecute solo en el montaje y desmontaje

  async function fetchAndDrawFields() {
    let fieldsAndValues = {};
    const { model, res_id, view_type } = getUrlData();

    if (!model || !res_id) return null;
    if (view_type !== 'form') return null;

    return callOdooRpc(model, 'fields_get', [], {}) // Asegúrate de devolver esta promesa
      .then(function (allFields) {
        let fieldChecksPromises = [];
        Object.entries(allFields).forEach(([fieldName, fieldProps]) => {
          if (fieldProps.type === 'many2one' || fieldProps.type === 'one2many' || fieldProps.type === 'many2many') {
            // Si el campo es many2one, verifica si el usuario tiene permisos para leerlo
            fieldChecksPromises.push(
              callOdooRpc(fieldProps.relation, 'check_access_rights', ['read', false], {})
                .then(
                  hasAccess => {
                    return hasAccess ? fieldName : null;
                  }
                )
                .catch(
                  error => {
                    console.error("Error al verificar permisos de lectura: ", error);
                    return null;
                  }
                )
            );
          } else {
            // Si el campo no es many2one, asume que el usuario tiene permisos para leerlo
            fieldChecksPromises.push(Promise.resolve(fieldName));
          }
        });

        return Promise.all(fieldChecksPromises)
          .then(fieldChecks => {
            // Remove null values from fieldChecks
            fieldChecks = fieldChecks.filter(fieldName => fieldName !== null);

            return callOdooRpc(model, 'search_read', [[['id', '=', res_id]]], { 'fields': fieldChecks });
          })
          .then(function (records) {
            fieldsAndValues = records[0];

            var fields = [];
            // Mapear campos y valores con el tipo
            Object.entries(fieldsAndValues).forEach(([fieldName, fieldValue]) => {
              const field = {};
              for (const [key, value] of Object.entries(allFields[fieldName])) {
                field[key] = value;
              }
              field.value = fieldValue;

              fields.push(field);
            });

            return fields;
          });
      })
  }


  const getRecordValues = async () => {
    setIsLoading(true);
    setShowRecordValues(false);

    // Obtener valores
    const values = await fetchAndDrawFields();

    if (!values) {
      console.error("Error al obtener valores del registro");
      setIsLoading(false);
      setRecordValues([]);
    }
    setRecordValues(values);
    setShowRecordValues(true);
    setIsLoading(false);
  }

  const handleUpdateModule = async () => {
    setIsUpdatingModule(true);
    console.log('Actualizar módulo');
    // Buscar en ir.module.module
    // Si existe el modulo, actualizarlo

    callOdooRpc(
      'ir.module.module',
      'search_read',
      [[['name', '=', moduleClicked.module]]],
      { 'fields': ['id'] })
      .then(function (module) {
        console.log(module);
        const id = module[0]?.id;
        callOdooRpcButton(
          'ir.module.module',
          'button_immediate_upgrade',
          [[id]],
          {}).then(function (result) {
            console.log(result);
            window.location.reload();
          }).finally(() => {
            setIsUpdatingModule(false);
            setModuleClicked(null);
          });
      })

  }

  return (
    <>
      <Layout>

        {isLoading && <Spinner />}

        {!isLoading && (
          <div class="flex flex-col gap-2">
            <a onClick={getRecordValues} href="#" class="px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
              Obtener valores del registro
            </a>
            <a href="#" class="px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
              Option 3
            </a>
          </div>
        )}

        {showRecordValues && <RecordValues values={recordValues} />}
      </Layout>

      {fieldClicked && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            top: fieldClicked.y,
            left: fieldClicked.x,
            zIndex: 10002,
            backgroundColor: 'white',
            padding: '1em',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          <p>Field name: {fieldClicked.field}</p>
        </div>
      )}

      {moduleClicked && (
        <div ref={modulePopupRef} style={{
          position: 'absolute',
          top: moduleClicked.y,
          left: moduleClicked.x,
          zIndex: 10002,
          backgroundColor: 'white',
          padding: '1em',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
          className="flex flex-col gap-2"
        >
          <p>Module name: {moduleClicked.module}</p>
          <a onClick={handleUpdateModule} href="#" class="px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
            Actualizar Módulo
          </a>
          {
            isUpdatingModule && <Spinner />
          }
        </div>
      )}
    </>
  );
}

export default App;