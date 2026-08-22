import { cpSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(root, 'src');

// Everything under src/ that is not the bundled sidebar app is a static file
// the manifest points at: background scripts, the settings page, icons,
// _locales and the sidebar HTML.
const BUNDLED = ['sidebar/app', 'sidebar/static/scss'];

function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    // writeBundle, not closeBundle, so the files are in place before web-ext runs.
    writeBundle() {
      cpSync(srcDir, resolve(root, 'build'), {
        recursive: true,
        filter: (source) => {
          const relative = source.slice(srcDir.length + 1);
          return !BUNDLED.some(
            (dir) => relative === dir || relative.startsWith(`${dir}/`),
          );
        },
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';

  if (!existsSync(resolve(srcDir, '_locales'))) {
    throw new Error('src/_locales is missing - run `npm run postinstall` first.');
  }

  return {
    root,
    // Relative asset URLs, which is what moz-extension:// pages need.
    base: './',

    resolve: {
      // Preact through its React compatibility layer. The components and
      // react-redux are untouched; this is an aliasing change only.
      alias: [
        { find: /^react$/, replacement: 'preact/compat' },
        { find: /^react-dom$/, replacement: 'preact/compat' },
        { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
      ],
    },

    oxc: {
      jsx: {
        // The automatic runtime pulls jsx() straight from preact, so the
        // React import in each component is only needed for React.Component.
        runtime: 'automatic',
        importSource: 'preact',
      },
    },

    define: {
      // redux and preact both branch on this.
      'process.env.NODE_ENV': JSON.stringify(
        isDevelopment ? 'development' : 'production',
      ),
    },

    build: {
      outDir: 'build',
      emptyOutDir: true,
      // Matches the manifest's strict_min_version, so esbuild downlevels only
      // what Firefox 115 actually lacks.
      target: 'firefox115',
      sourcemap: isDevelopment,
      minify: !isDevelopment,
      // Keeps the editor's stylesheet in its lazy chunk instead of forcing it
      // into the CSS every sidebar open has to load.
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1024,
      reportCompressedSize: false,

      rollupOptions: {
        input: resolve(srcDir, 'sidebar/app/app.jsx'),
        output: {
          format: 'es',
          entryFileNames: 'sidebar/app.js',
          chunkFileNames: 'sidebar/[name].js',
          assetFileNames: 'sidebar/[name][extname]',
        },
      },
    },

    plugins: [copyExtensionFiles()],
  };
});
