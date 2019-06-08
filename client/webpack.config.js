const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'awesome-typescript-loader',
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        enforce: "pre",
        loader: "source-map-loader"
      }
    ]
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js', '.tsx']
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, './build/')
  },
  externals: {
    "react": "React",
    "react-dom": "ReactDOM"
  }
};