# CLAUDE.md — Firefox Notes

Guidance for AI coding agents (Claude Code and others) working in this
repository. `AGENTS.md` is a symlink to this file — edit this one.

## Project Overview

A Manifest V2 Firefox extension (115+) providing a note-taking sidebar.

- **WebExtension** (`src/`): React 19 API rendered by Preact + Redux, with
  CKEditor 5 for rich text.
- **Sync**: `browser.storage.sync` (`src/storage-sync.js`). The old Kinto +
  Firefox Accounts implementation has been deleted.
- **Native app** (`native/`): abandoned React Native Android companion, still on
  the old Kinto stack. Excluded from ESLint and out of scope — don't modernize
  it as a side effect.

**Stack**: JavaScript (ES2022), React 19 API via `preact/compat`, Redux 5,
Vite 8, SCSS. No TypeScript, no Babel. Node 22.12+ is a hard floor (Vite 8 and
`selenium-webdriver`), declared in `engines.node`; Node 18 does not work despite
what `circle.yml` and older docs say.

## Development

Scripts live in `package.json`. Run `npm run format` before committing.

### Tests

The only suite is Selenium + Mocha under `test/integration/` (native ESM,
`.mjs`). To run one case, add `.only` to its `describe`/`it` and run
`npm run test:ui`.

It drives a real Firefox through geckodriver — no headless or mocked mode — and
installs `firefox_notes.xpi` from the repo root, which
`test/integration/setup-webext.sh` copies out of `web-ext-artifacts/`, so
`npm run build` must succeed first. Neither that file nor `addon.xpi` (from
`npm run package`) is gitignored; only `signed-addon.xpi` is.

`test:ui` passes `--retries 1`, so a case that fails once and passes on the
retry still reports green.

**There are no unit tests.** The Karma suite covered the deleted Kinto sync and
went with it. New unit tests should use a current runner (Vitest or
web-test-runner), not Karma.

### CI

`circle.yml`, `.travis.yml` and `bin/build-addon.sh` are all dead: the first two
pin Node 12/8 and call `npm run test:karma`, which no longer exists, and the
signing script still passes `--source-dir src`, which predates Vite and would
ship unbundled sources. Nothing validates the modern stack on push — run
`npm run lint` and `npm run test:ui` locally, and don't modernize these as a
side effect. Releases bump the version in both `package.json` and
`src/manifest.json`; see `RELEASE.md`.

## Architecture

Two runtime halves that only talk over `browser.runtime` messages:

**Background** (`src/storage-sync.js` + `src/background.js`, loaded in that
order by the manifest) — these are **classic scripts, not modules**.
`storage-sync.js` exposes a `storageSync` global that `background.js` consumes;
there are no imports, and `eslint.config.mjs` gives them their own
`sourceType: 'script'` block. Background owns all persistence, the context menu,
the toolbar button, and sidebar connect/disconnect tracking.

**Sidebar** (`src/sidebar/app/`) — a Preact-rendered React app with a Redux
store. `app.jsx` is the only bundle entry point.

### The message bus is the seam

Redux action types in `src/sidebar/app/utils/constants.js` are *the same
strings* as the `browser.runtime` message actions (`create-note`,
`text-synced`, `kinto-loaded`, …). `src/sidebar/app/onMessage.js` is the bridge:
it listens on `chrome.runtime.onMessage` and dispatches the matching action
creator. Changing one of those strings changes both the wire protocol and the
reducer.

`constants.js` is only half the protocol: it holds what the background
*broadcasts* to sidebars. Requests going the other way are inline literals —
`app.jsx` sends `kinto-sync`, `ListPanel.jsx` sends `editor-ready`,
`settings/settings.js` sends `theme-changed` — and `background.js` also handles
`kinto-load`, `fetch-email` and `get-storage-usage` (replying `storage-usage`),
none of which appear in `constants.js`. Read the switch in `background.js` for
the full list before assuming a message name is unused.

Names starting with `kinto` are legacy. Kinto and Firefox Accounts are gone; the
strings survive only for compatibility, and the transport is `storage.sync`.

Because every window's sidebar receives every message, actions carry
`from: windowInfo.id` and `onMessage.js` compares it against
`browser.windows.getCurrent()` so the originating window doesn't re-apply its
own edit.

### Three storage layers

1. `browser.storage.sync` — source of truth, one key per note (`note_<id>`).
   Hard limits enforced in `storage-sync.js`: 6 KB/note (`NoteTooLargeError`),
   100 KB total (`StorageLimitError`). These are meaningful UI states — throw
   them and let `background.js` translate them into `error` messages rather than
   swallowing them. Sync failures, by contrast, degrade gracefully: rejections
   are caught and logged, not rethrown.
2. Redux store — in-memory UI state.
3. `browser.storage.local.redux` — a serialized-store cache so the sidebar
   paints before sync returns. `store.js` writes it through a middleware
   throttled by `PERSIST_DELAY` (500 ms) with a `pagehide` flush; `app.jsx`
   reads it, dispatches `kintoLoad`, then requests a sync. It is a throttle,
   not a debounce — later actions don't reset the pending timer, so continuous
   typing keeps writing every 500 ms instead of deferring indefinitely.

### Routing and views

`router.jsx` is a hand-rolled ~60-line replacement for react-router. Two views:
`ListPanel`, and `EditorPanel` (which renders `Header` + `Editor`). It fakes the
`history.push` and `match.params` shapes the panels expect, and keys
`EditorPanel` so `/note` and `/note/:id` remount but two ids do not.

## Build pipeline (`vite.config.mjs`)

Vite bundles **only** `src/sidebar/app` and `src/sidebar/static/scss`.
Everything else under `src/` — manifest, background scripts, settings page,
icons, `_locales`, `sidebar/index.html` — is copied verbatim into `build/` by
the `copyExtensionFiles` plugin in `writeBundle`. A new static extension file
needs no config change; a new bundled directory does.

- `react`/`react-dom` alias to `preact/compat`. Write ordinary React; the alias
  is the only place Preact appears. **`react-dom` is deliberately not
  installed** — the alias resolves `react-dom/client` before npm ever does, so
  don't "fix" `app.jsx`'s import by adding the package back. `react` is still
  installed only because react-redux peer-depends on it; nothing imports the
  real thing.
- Automatic JSX runtime with `importSource: 'preact'`, so `import React` is
  needed only for `React.Component`.
- `target: 'firefox115'` matches the manifest's `strict_min_version`.
- Production is the default mode; `vite:watch` is the only thing passing
  `--mode development` (for source maps). Don't flip the default.
- No Babel — oxc handles JSX and the tests are native ESM. Don't reintroduce a
  transpiler.
- JSX must live in `.jsx` files: the parser keys off the extension, so JSX in a
  `.js` file is a parse error, not a warning.

## Code Style

`npm run format` (Prettier, then `eslint --fix`) settles quotes, semicolons and
spacing — don't hand-format to match. Prettier has **no config file**:
`--single-quote` lives in the npm script, so a bare `prettier --write`
reformats the codebase to double quotes and then fails `lint:js`.

What the formatter won't decide for you:

- `no-console` is a warning — annotate deliberate uses with
  `// eslint-disable-line no-console`.
- `react/prop-types` is **off**: React 19 removed runtime prop checking and no
  longer ships `prop-types`. Prop typing should return via TypeScript or JSDoc.
- `jsx-a11y` recommended is enabled and its findings are errors, so new JSX
  needs keyboard handlers, roles and labels.
- Both scripts cover `src/` only, and the Prettier glob doesn't even include
  `.mjs`. A green `npm run lint` says nothing about `test/`, `scripts/`,
  `vite.config.mjs` or `eslint.config.mjs`.

Every existing component is a class; hooks are available, but don't mix styles
within one component. Reducers use `Object.assign()` for immutability, and async
work goes through redux-thunk.

Use `browser.*` for WebExtension APIs; `chrome.runtime.onMessage` is what
`onMessage.js` and the editor's send-to-note handler attach to. Localized
strings come from `browser.i18n.getMessage('key')`.

## Gotchas

- **CKEditor is lazily loaded.** Reach it only through `utils/loadEditor.js`,
  which dynamically imports `utils/editorBundle.js`. That module is the one
  place allowed to `import { ... } from 'ckeditor5'`, and only by *named*
  exports — a namespace `import('ckeditor5')` defeats tree-shaking and drags in
  every plugin (~880 KB the note list would then parse on every sidebar open).
- **`src/_locales` is generated and gitignored.** `scripts/build-locales.js`
  runs `pontoon-to-webext` over `locales/*/notes.properties`. Edit neither
  directory by hand: translations are managed in Pontoon, not by PR.
  `vite.config.mjs` throws if `src/_locales` is missing — run
  `npm run postinstall`.
- **Theming is an attribute, not a stylesheet.** `dark.scss` is bundled and
  scoped to `[data-theme='dark']`; `utils/theme.js` sets
  `document.documentElement.dataset.theme`. `app.jsx` imports `dark.scss` after
  `styles.scss` on purpose — that import order *is* the cascade order. A
  separate dark stylesheet would bring back the light-theme flash.
  The settings page drives the switch: `settings/settings.js` (a classic script,
  copied verbatim, not bundled) writes `storage.local.theme` and sends
  `theme-changed`, `background.js` rebroadcasts it, and `utils/theme.js` re-reads
  storage. Moving where the theme lives means touching all three.
