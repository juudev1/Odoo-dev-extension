const path = require('path');

module.exports = {
  entry: {
    loader: './src/injected/index.js',
    contentScript: './src/extension/contentScriptIsolated.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
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