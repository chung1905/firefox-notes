"use strict";

const path = require("path");

module.exports = {
  mode: "development",
  entry: "./test/unit/index.js",
  output: {
    filename: "unit-bundle.js",
    path: path.resolve(__dirname, "test/dist/")
  }
};
