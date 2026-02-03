"use strict";

/* eslint-env node */

const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "source-map",

  entry: [path.resolve(__dirname, "src", "sidebar", "app", "app.js")],

  output: {
    // build to the extension src vendor directory
    path: path.resolve(__dirname, "build"),
    filename: path.join("sidebar", "app.js"),
    clean: true
  },

  plugins: [
    // Moves files
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join("src"),
          globOptions: {
            ignore: ["**/sidebar/app/**", "**/sidebar/static/scss/**"]
          }
        }
      ]
    })
  ],

  module: {
    rules: [
      {
        test: /\.js$/, // Babel-loader compile jsx syntax to javascript
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
            sourceMaps: true
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader", // creates style nodes from JS strings
          "css-loader", // translates CSS into CommonJS
          "sass-loader" // compiles Sass to CSS
        ]
      },
      {
        test: /\.(jpe?g|png|gif|svg|eot|woff|ttf|woff2)$/,
        type: "asset/resource",
        generator: {
          filename: "[path][name][ext]"
        }
      }
    ]
  }
};
