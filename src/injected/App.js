import { useState, useEffect } from 'react';

import Drawer from '../components/drawer';
import Spinner from '../components/Spinner';
import RecordValues from '../components/RecordValues';

import Layout from '../Layouts/Layout';

const App = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [showRecordValues, setShowRecordValues] = useState(false);
  const [recordValues, setRecordValues] = useState([]);

  useEffect(() => {
    setIsLoading(false);

  }, []);


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

  function getCurrentAction() {
    const current_action = JSON.parse(window.sessionStorage.getItem('current_action'));
    return current_action;
  }

  async function fetchAndDrawFields() {
    let fieldsAndValues = {};
    const action = getCurrentAction();
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
    setShowRecordValues(true);

    // Obtener valores
    const values = await fetchAndDrawFields();

    if (!values) {
      console.error("Error al obtener valores del registro");
      setIsLoading(false);
      setRecordValues([]);
    }

    setRecordValues(values);
    setIsLoading(false);
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
              Option 2
            </a>
            <a href="#" class="px-4 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
              Option 3
            </a>
          </div>
        )}

        {showRecordValues && <RecordValues values={recordValues} />}

      </Layout>
    </>
  );
}

export default App;