// useOdooRpc.js
import { useState, useEffect } from 'react';

export default function useOdooRpc() {
    const [data, setData] = useState(null);

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
            .then(data => {
                setData(data.result);
                return data.result;
            });
    }

    function callOdooRpcButton(model, method, args, kwargs) {
        const url = '/web/dataset/call_button';
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
            .then(data => {
                setData(data.result);
                return data.result;
            });
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

    return { data, callOdooRpc, callOdooRpcButton, getUrlData, getCurrentAction };
}