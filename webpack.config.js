const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    entry: '/src/injected/index.js',// Script que inicializa la aplicacion, punto de entrada, esto viene por defecto en webpack
    output: { // Ruta donde se guardara el archivo compilado
        path: path.resolve(__dirname, 'build'), // _dirname es una variable de node que nos da la ruta absoluta de la carpeta donde se encuentra el archivo
    },
    module: {
        rules: [
            { // Pasar todos los archivos js por un loader
                test: /\.js$/, // Expresion regular para identificar los archivos js
                exclude: /node_modules/, // Excluir la carpeta node_modules
                use: { // Loader a utilizar
                    loader: 'babel-loader', // Loader de babel
                    options: { // Opciones del loader
                        presets: [
                            [
                                '@babel/preset-react',
                                {
                                    runtime: "automatic"
                                }
                            ]
                        ] // Preset a utilizar
                    }
                }
            },
            {
                test: /\.css$/, // Expresion regular para identificar los archivos css
                use: ['style-loader', 'css-loader', 'postcss-loader'] // Loader a utilizar
            }
        ]
    },
    plugins: [
        // Plugin encargado de crear automaticamente el archivo index.html e injectar los scripts de la aplicacion
        // new HtmlWebpackPlugin({
        //     template: path.resolve(__dirname, 'src/index.html'), // Ruta del archivo html de la aplicacion
        //     minify: true // Minificar el archivo html
        // }),
    ],
    devServer: { // Configuracion del servidor de desarrollo
        allowedHosts: 'all', // Permitir a todos los host acceder al servidor
        port: 3000, // Puerto donde se ejecutara el servidor
        hot: true, // Habilitar el hot reload o recarga en caliente
        open: false, // Abrir automaticamente el navegador
        watchFiles: path.resolve(__dirname, 'src'), // Ruta de los archivos a observar
        client: { // Configuracion del lado del cliente
            logging: 'none', // Nivel de logueo
            overlay: true, // Mostrar errores en el navegador
            progress: true, // Mostrar la barra de progreso
        }
    }
}