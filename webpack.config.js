const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      loader: './src/injected/index.js',
      contentScript: './src/extension/contentScriptIsolated.js'
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
    },
    mode: argv.mode || 'development',
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
    resolve: {
      extensions: ['.js'],
      modules: [
        path.resolve(__dirname, 'src'),
        'node_modules'
      ]
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: 'babel-loader'
        }
      ]
    }
  };
};