const webpack = require('webpack');

module.exports = {
  entry: [
    './lmsearch.js'
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader']
      },
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: false,
          presets: [
            ['@babel/preset-env', {
              targets: {
                browsers: ['chrome >= 39']
              },
              modules: false,
              useBuiltIns: 'usage'
            }]
          ],
          plugins: [
            ['@babel/plugin-transform-runtime', {
              regenerator: true,
              corejs: 2
            }]
          ]
        }
      }]
  },
  externals: ['Origo'],
  resolve: {
    extensions: ['*', '.js', '.scss'],
    fallback: {
      path: require.resolve('path-browserify')
    }
  }
};
