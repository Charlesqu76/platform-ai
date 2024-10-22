const path = require("path");
const nodeExternals = require("webpack-node-externals");
const NodemonPlugin = require("nodemon-webpack-plugin");

module.exports = {
  entry: "./src/server.ts",
  target: "node",
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "server.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [new NodemonPlugin()],
  mode: "development",
  watch: true,
};
