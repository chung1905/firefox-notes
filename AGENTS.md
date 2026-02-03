# AGENTS.md - Firefox Notes

This document provides guidelines for AI coding agents working in this repository.

## Project Overview

Firefox Notes is a Firefox WebExtension that provides a sidebar for taking notes. It includes:

- **WebExtension**: React 16.2 + Redux sidebar with CKEditor 5 rich text editing
- **Sync**: Kinto-based sync with Firefox Accounts (FxA) OAuth + encryption
- **Native App**: React Native Android companion app (in `/native/`)

**Tech Stack**: JavaScript (ES6+), React 16.2, Redux 3.7, Webpack 3, SCSS, Node.js 8+

## Node.js Compatibility

**WARNING**: This project requires Node.js 8 and will NOT work on modern Node.js (v16+).

**Blockers for modern Node.js:**

- `node-sass@4.14.1` - requires Python 2 and native compilation via node-gyp
- `karma@1.7.1` - explicitly requires Node 0.10-8
- `node-gyp@3.8.0` - old version incompatible with modern Node
- Many deprecated dependencies with security vulnerabilities

**To run this project**, use Node.js 8 via nvm:

```bash
nvm install 8
nvm use 8           # or: nvm use (reads .nvmrc)
```

**To modernize**, these dependencies need replacement:

- `node-sass` → `sass` (Dart Sass)
- `karma` → modern version or switch to Jest/Vitest
- `webpack@3` → `webpack@5`
- `babel-preset-es2015` → `@babel/preset-env`

## Build/Lint/Test Commands

### Installation

```bash
nvm use 8            # Required: use Node.js 8
npm install          # Install dependencies (runs postinstall automatically)
```

### Development

```bash
npm start            # Build and run extension in Firefox with watch mode
npm start-nightly    # Run in Firefox Nightly
npm start-deved      # Run in Firefox Developer Edition
npm run webpack      # Build with webpack (one-time)
```

### Building

```bash
npm run build        # Full production build (clean + webpack + web-ext)
npm run build-ck     # Build CKEditor only
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
npm test             # Run all tests (unit + integration)
npm run test:karma   # Run unit tests only (Karma + Mocha)
npm run test:ui      # Run integration tests (Selenium + Mocha)
```

### Running a Single Test

Tests use Mocha. To run a single test, use `.only`:

```javascript
// In test/unit/main.test.js or test/integration/testFirefoxWebext.js
describe.only("specific suite", function () {
  it("test case", function () {
    /* ... */
  });
});

// Or for a single test case:
it.only("specific test", function () {
  /* ... */
});
```

Then run `npm run test:karma` (unit) or `npm run test:ui` (integration).

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
import PropTypes from "prop-types";

// Local modules with relative paths
import INITIAL_CONFIG from "../data/editorConfig";
import { SEND_TO_NOTES, FROM_BLANK_NOTE } from "../utils/constants";
import { updateNote, createNote } from "../actions";
```

- Use ES6 imports in source files
- Use CommonJS `require()` in Node scripts and tests
- Destructure named exports: `import { connect } from 'react-redux';`

### Naming Conventions

| Type                      | Convention           | Example                                       |
| ------------------------- | -------------------- | --------------------------------------------- |
| Files (React components)  | PascalCase           | `Editor.js`, `ListPanel.js`                   |
| Files (utilities/modules) | camelCase            | `utils.js`, `reducers.js`                     |
| Variables/Functions       | camelCase            | `formatFooterTime`, `syncKinto`               |
| Classes                   | PascalCase           | `JWETransformer`, `BrowserStorageCredentials` |
| Constants                 | SCREAMING_SNAKE_CASE | `SYNC_AUTHENTICATED`, `KINTO_LOADED`          |
| Redux action types        | SCREAMING_SNAKE_CASE | `CREATE_NOTE`, `UPDATE_NOTE`                  |
| Redux action creators     | camelCase            | `createNote()`, `updateNote()`                |

### React Patterns

```javascript
// Class components (no hooks - React 16.2 era)
class Editor extends React.Component {
  constructor(props, context) {
    super(props);
    this.props = props;
  }
  // ...
}

// PropTypes for type checking
Editor.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
  note: PropTypes.object,
};

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
// Action creator returning plain object
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
ClassicEditor.create(this.node, INITIAL_CONFIG)
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
chrome.runtime.sendMessage({
  action: "metrics-changed",
  context: getPadStats(editor),
});
chrome.runtime.onMessage.addListener(this.sendToNoteListener);
```

## Directory Structure

```
src/
├── background.js          # Background script (messaging, auth)
├── sync.js                # Kinto sync & encryption
├── manifest.json          # WebExtension manifest
├── sidebar/
│   ├── app/
│   │   ├── app.js         # Entry point
│   │   ├── store.js       # Redux store
│   │   ├── actions.js     # Redux action creators
│   │   ├── reducers.js    # Redux reducers
│   │   ├── components/    # React components
│   │   ├── data/          # Initial configs
│   │   └── utils/         # Constants, helpers
│   └── static/scss/       # SCSS styles
└── vendor/                # Third-party (do not modify)

test/
├── unit/                  # Karma/Mocha unit tests
└── integration/           # Selenium integration tests
```

## Important Notes

- **Vendor directories**: Do not modify `src/vendor/` or `src/sidebar/vendor/`
- **No TypeScript**: This project uses plain JavaScript with Babel
- **React 16.2**: No hooks - use class components with lifecycle methods
- **Browser compatibility**: Target Firefox only (WebExtension)
- **i18n**: Use `browser.i18n.getMessage('key')` for localized strings
- **Formatting**: Run `npm run format` before committing
