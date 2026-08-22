"use strict";

/* eslint-env node */

const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => {
  // Shipped builds are production. `npm run webpack:watch` passes
  // --mode development to get readable output and source maps.
  const isDevelopment = argv.mode === "development";

  return {
    mode: isDevelopment ? "development" : "production",

    // Source maps are a development aid only; shipping them doubled the
    // size of the packaged extension.
    devtool: isDevelopment ? "source-map" : false,

    entry: [path.resolve(__dirname, "src", "sidebar", "app", "app.js")],

    output: {
      // build to the extension src vendor directory
      path: path.resolve(__dirname, "build"),
      filename: path.join("sidebar", "app.js"),
      // Lazily-loaded chunks (the editor) sit next to app.js so the
      // default 'auto' publicPath resolves them under moz-extension://.
      chunkFilename: path.join("sidebar", "[name].js"),
      clean: true
    },

    resolve: {
      // Preact via its React compatibility layer. react-redux and the
      // components are unchanged; this is an aliasing change only.
      // The $ suffixes are exact matches, so the /client subpath below is
      // not swallowed by the bare react-dom alias.
      alias: {
        react$: "preact/compat",
        "react/jsx-runtime": "preact/jsx-runtime",
        "react-dom$": "preact/compat",
        "react-dom/client": "preact/compat/client",
        "react-dom/test-utils": "preact/test-utils"
      }
    },

    optimization: {
      // Keep the lazily-loaded editor as a single predictable file rather
      // than letting the default vendor split scatter it across chunk ids.
      splitChunks: false
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
              sourceMaps: isDevelopment
            }
          }
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
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
};
