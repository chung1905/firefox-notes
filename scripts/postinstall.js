#! /usr/bin/env node

const { copySync } = require("fs-extra");

const files = [
  // Copy pre-built CKEditor 5
  copySync(
    "node_modules/@ckeditor/ckeditor5-build-classic/build/ckeditor.js",
    "src/sidebar/vendor/ckeditor.js"
  ),
  copySync(
    "node_modules/@ckeditor/ckeditor5-build-classic/LICENSE.md",
    "src/sidebar/vendor/ckeditor.LICENSE"
  )
];

Promise.all(files).catch(err => {
  console.error(err);
  process.exit(1);
});
