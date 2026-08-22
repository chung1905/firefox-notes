# AGENTS.md - Firefox Notes

This document provides guidelines for AI coding agents working in this repository.

## Project Overview

Firefox Notes is a Firefox WebExtension that provides a sidebar for taking notes. It includes:

- **WebExtension**: React-API sidebar (rendered by Preact) + Redux, with CKEditor 5 rich text editing
- **Sync**: `browser.storage.sync` (see `src/storage-sync.js`). The old Kinto + Firefox Accounts implementation has been deleted.
- **Native App**: React Native Android companion app (in `/native/`), still on the old Kinto stack and not covered by these guidelines

**Tech Stack**: JavaScript (ES6+), React 19 API via `preact/compat`, Redux 5, Vite 8, SCSS, Node.js 18+

## Build/Lint/Test Commands

### Installation

```bash
npm install          # Install dependencies (runs postinstall automatically)
```

### Development

```bash
npm start            # Build and run extension in Firefox with watch mode
npm start-nightly    # Run in Firefox Nightly
npm start-deved      # Run in Firefox Developer Edition
npm run vite         # Build with Vite (one-time)
```

### Building

```bash
npm run build        # Full production build (locales + vite + web-ext)
npm run clean        # Clean build artifacts
npm run package      # Build and create addon.xpi
```

### Linting

```bash
npm run lint         # Run all linters (JS + CSS)
npm run lint:js      # ESLint on src/
npm run lint:css     # Stylelint on SCSS/CSS
npm run format       # Format with Prettier (single quotes)
```

### Testing

```bash
npm test             # Run all tests
npm run test:ui      # Run integration tests (Selenium + Mocha)
```

**There are currently no unit tests.** The Karma suite covered only the
deleted Kinto sync and was removed with it; `src/storage-sync.js` has never
had any. New unit tests should use a current runner (Vitest or
web-test-runner), not Karma.

### Running a Single Test

Integration tests use Mocha, so `describe.only` / `it.only` work, then run
`npm run test:ui`.

## Code Style Guidelines

### ESLint Rules (Enforced)

- **No var**: Use `const` or `let` only (`no-var: error`)
- **Prefer const**: Use `const` when variable is not reassigned (`prefer-const: error`)
- **Single quotes**: Always use single quotes for strings (`quotes: [error, single]`)
- **Semicolons required**: Always end statements with semicolons (`semi: [error, always]`)
- **Strict equality**: Use `===` and `!==` (`eqeqeq: error`)
- **Unix line endings**: LF only (`linebreak-style: [error, unix]`)
- **No console**: Avoid `console.*` in production code (`no-console: warn`)

### Import Style

```javascript
// React and external libraries first
import React from "react";
import { connect } from "react-redux";

// Local modules with relative paths
import loadEditor from "../utils/loadEditor";
import { SEND_TO_NOTES, FROM_BLANK_NOTE } from "../utils/constants";
import { updateNote, createNote } from "../actions";
```

- Use ES6 imports in source files
- Use CommonJS `require()` in Node scripts and tests
- Never add a static `import ... from 'ckeditor5'` outside
  `utils/editorBundle.js`
- Destructure named exports: `import { connect } from 'react-redux';`

### Naming Conventions

| Type                      | Convention           | Example                                       |
| ------------------------- | -------------------- | --------------------------------------------- |
| Files (React components)  | PascalCase `.jsx`    | `Editor.jsx`, `ListPanel.jsx`                 |
| Files (utilities/modules) | camelCase `.js`      | `utils.js`, `reducers.js`                     |
| Variables/Functions       | camelCase            | `formatFooterTime`, `getNoteSummary`          |
| Classes                   | PascalCase           | `NoteTooLargeError`, `StorageLimitError`      |
| Constants                 | SCREAMING_SNAKE_CASE | `SYNC_AUTHENTICATED`, `KINTO_LOADED`          |
| Redux action types        | SCREAMING_SNAKE_CASE | `CREATE_NOTE`, `UPDATE_NOTE`                  |
| Redux action creators     | camelCase            | `createNote()`, `updateNote()`                |

### React Patterns

```javascript
// Class components. Hooks are available (React 19 API), but the existing
// components are classes; do not mix styles within a component.
class Editor extends React.Component {
  constructor(props) {
    super(props);
  }
  // ...
}

// No PropTypes: React 19 removed runtime prop checking and no longer ships
// the prop-types package. react/prop-types is off in ESLint.

// Connect to Redux store
export default connect(mapStateToProps)(Editor);

// Inline styles for simple cases
const styles = {
  container: {
    flex: "100%",
    display: "flex",
  },
};
```

### Redux Patterns

```javascript
// Action creator returning plain object. Note the kinto* names are legacy:
// the message strings are kept for compatibility, the transport is
// storage.sync.
export function kintoLoad(notes) {
  return { type: KINTO_LOADED, notes };
}

// Thunk action creator (async)
export function createNote(content = "", origin, id) {
  return (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      dispatch({ type: CREATE_NOTE, id, content });
      resolve(id);
    });
  };
}

// Reducers use Object.assign() for immutability
return Object.assign({}, state, { notes: action.notes });
```

### Error Handling

```javascript
// Async operations with .catch()
loadEditor(this.node)
  .then((editor) => {
    /* ... */
  })
  .catch((error) => {
    console.error(error); // eslint-disable-line no-console
  });

// Graceful degradation - sync failures don't break the app
// Promise rejections are caught and logged, not thrown
```

### WebExtension Patterns

```javascript
// Use browser.* API for WebExtension APIs
browser.runtime.sendMessage({ action: "kinto-sync" });
browser.windows.getCurrent({ populate: true }).then((windowInfo) => {
  /* ... */
});

// Use chrome.runtime for cross-script messaging
chrome.runtime.sendMessage({ action: "editor-ready" });
chrome.runtime.onMessage.addListener(this.sendToNoteListener);
```

## Directory Structure

```
src/
├── background.js          # Background script (messaging)
├── storage-sync.js        # browser.storage.sync wrapper
├── manifest.json          # WebExtension manifest
└── sidebar/
    ├── app/
    │   ├── app.jsx        # Entry point
    │   ├── router.jsx     # Three-view router (no react-router)
    │   ├── store.js       # Redux store
    │   ├── actions.js     # Redux action creators
    │   ├── reducers.js    # Redux reducers
    │   ├── components/    # React components
    │   ├── data/          # Editor config
    │   └── utils/         # Constants, helpers, lazy editor loader
    └── static/scss/       # SCSS styles

test/
└── integration/           # Selenium integration tests (native ESM, .mjs)
```

There are no vendor directories. Everything third-party is bundled by
Vite from node_modules. `vite.config.mjs` also copies everything in `src/`
that is not the bundled sidebar app into `build/`.

## Important Notes

- **No TypeScript**: This project uses plain JavaScript with Babel
- **Preact**: `react` and `react-dom` are aliased to `preact/compat` in
  `vite.config.mjs`. Write ordinary React code; the alias is the only
  place Preact is mentioned.
- **CKEditor is lazily loaded**: reach it through `utils/loadEditor.js`.
  Importing `ckeditor5` anywhere else pulls ~880 KB back into the bundle
  that every sidebar open must parse. Import it by *named* exports only:
  `import('ckeditor5')` defeats tree-shaking and drags in every plugin.
- **The build is production by default**: `npm run vite:watch` passes
  `--mode development` for source maps. Do not change the default.
- **JSX lives in `.jsx` files**: Vite's parser keys JSX off the extension.
  Putting JSX in a `.js` file is a parse error, not a warning.
- **No Babel**: oxc handles JSX, and the integration tests are native ESM
  (`.mjs`). Do not reintroduce a transpiler.
- **Browser compatibility**: Firefox 115+ only (WebExtension)
- **i18n**: Use `browser.i18n.getMessage('key')` for localized strings
- **Formatting**: Run `npm run format` before committing
