const CopyWebpackPlugin = require("copy-webpack-plugin");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WorkerPlugin = require("worker-plugin");

const path = require('path');

module.exports = {
  entry: {
    main: "./src/bootstrap.ts",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: [/node_modules/, /pkg\//],
      },
    ],
  },
  resolve: {
    extensions: [ ".js", ".wasm", '.tsx', '.ts' ],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js", // TODO - Hashing in worker?
    globalObject: "self"
  },
  mode: "development",
  plugins: [
    new WorkerPlugin(),
    new CopyWebpackPlugin({ 
      patterns: [
        { from: "./src/styles/styles.css", to: "./"}
      ]
    }),
    new HTMLWebpackPlugin({ 
      template: "./src/index.html"
    }),
    new CleanWebpackPlugin()
  ],
};
