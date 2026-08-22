import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    ignores: ['build/**', 'web-ext-artifacts/**', 'native/**', 'src/_locales/**'],
  },

  js.configs.recommended,
  react.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,

  {
    files: ['src/**/*.{js,jsx}'],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },

    settings: {
      react: { version: '19.0' },
    },

    rules: {
      // React 19 removed runtime propTypes checking, so the declarations the
      // rule asks for would be dead code. Prop typing should come back via
      // TypeScript or JSDoc rather than prop-types.
      'react/prop-types': 'off',
      'no-lonely-if': 'warn',
      'consistent-return': 'warn',
      eqeqeq: 'error',
      'linebreak-style': ['error', 'unix'],
      'no-console': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    },
  },

  {
    // Background scripts are classic scripts sharing globals, not modules.
    files: ['src/background.js', 'src/storage-sync.js'],
    languageOptions: { sourceType: 'script' },
  },
];
