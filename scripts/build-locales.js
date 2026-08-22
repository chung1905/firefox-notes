#! /usr/bin/env node
const { spawnSync } = require('node:child_process');
const { execPath } = require('node:process');

const locales = '*';

// Run the CLI's script through node rather than the node_modules/.bin shim, so
// there is no .cmd wrapper to work around and no shell involved.
const result = spawnSync(execPath, [require.resolve('pontoon-to-webext'), '--dest=src/_locales'], {
  stdio: 'inherit',
  env: Object.assign({}, process.env, { SUPPORTED_LOCALES: locales }),
});

if (result.error) {
  console.error(result.error); // eslint-disable-line no-console
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`pontoon-to-webext exited with ${result.status}`); // eslint-disable-line no-console
  process.exit(result.status);
}
