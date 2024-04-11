import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import './index.css';

// Crear un div para renderizar la App
const app = document.getElementsByTagName("body")[0].appendChild(document.createElement("div"));
app.id = "odoo-extension-root";
// Renderizar App dentro de body sin reemplazar el contenido existente
ReactDOM.render(<App />, app);

console.log("Injected script loaded");