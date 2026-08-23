# Sidebar Notes

A note-taking sidebar for Firefox 115+.

Sidebar Notes is a fork of Mozilla's [Notes](https://github.com/mozilla/notes)
add-on, whose last release was 4.3.7 in September 2020.

> **Not affiliated with or endorsed by Mozilla.** This project is based on
> Mozilla open source software. "Mozilla" and "Firefox" are trademarks of the
> Mozilla Foundation, used here only to describe that origin and to name the
> browser the add-on runs in.

## What this fork changes

The upstream add-on was built on Kinto and Firefox Accounts, neither of which
is still available to it. This fork replaces that and modernises the stack:

- **Sync is `browser.storage.sync`**, not Kinto + Firefox Accounts. There is no
  account and nothing to sign into. Syncing is a setting and is **off by
  default**; notes always live in `browser.storage.local`.
- **No telemetry and no outbound requests.** Google Analytics went upstream in
  4.3.4; the Mozilla survey link behind the "Give Feedback" menu item is gone
  in 4.4.0. The add-on now makes no network requests at all.
- **Current toolchain**: Vite 8, React 19 API via `preact/compat`, Redux 5,
  CKEditor 5. No Babel, no Karma, no TypeScript.
- **A dark theme** that follows a setting on the options page.

## Install

Not yet on [addons.mozilla.org](https://addons.mozilla.org/). Until then, build
it yourself (below) and load `web-ext-artifacts/*.zip` through
`about:debugging` → This Firefox → Load Temporary Add-on.

## Development

Requires **Node.js 22.12 or newer** — Vite 8 and `selenium-webdriver` both
need it, and Node 18 does not work.

| Command         | Description                                     |
|-----------------|-------------------------------------------------|
| `npm install`   | Install dependencies and compile `src/_locales`. |
| `npm run build` | Build the extension into `build/`, then package it into `web-ext-artifacts/`. |
| `npm start`     | Launch Firefox with the extension and rebuild on change. |
| `npm run lint`  | Stylelint and ESLint over `src/`.               |
| `npm run format`| Prettier, then `eslint --fix`. Run before committing. |
| `npm run test:ui` | Selenium + Mocha integration suite. Needs `npm run build` first. |

`src/_locales/` is generated from `locales/*/notes.properties` by
`npm run postinstall` and is not checked in; the build fails without it.

## Reproducible build

The published add-on is bundled by Vite, so AMO requires the source and these
instructions. The build is fully local — no network access is needed after
`npm ci`, and no web-based tooling is involved.

```
npm ci          # installs exactly what package-lock.json pins
npm run build
```

The reviewable artifact is `web-ext-artifacts/sidebar_notes-<version>.zip`,
whose contents match the uploaded package. `npm run build` runs `clean` first,
so the output does not depend on previous builds.

Last verified on macOS 26.6, Node 24.19.0, npm 11.17.0. Any Node ≥ 22.12
should reproduce it.

## Permissions

| Permission     | Why                                                                    |
|----------------|------------------------------------------------------------------------|
| `contextMenus` | "Add to Notes" — sends selected page text to the sidebar.               |
| `storage`      | Stores notes in `storage.local`, and in `storage.sync` when syncing is on. |

No host permissions: the add-on never reads page content except the text you
explicitly send it through the context menu.

## Release

Bump the version in `package.json` and `src/manifest.json` — it lives in both —
then `npm run build` and upload `web-ext-artifacts/sidebar_notes-<version>.zip`.

## Localization

Upstream translations came from [Pontoon](https://pontoon.mozilla.org/) and are
kept here under `locales/`, minus the product name, which this fork had to
change. New strings added by this fork ship in English only — it is not a
Pontoon project.

## Licences

- The add-on: [Mozilla Public License 2.0](LICENSE), inherited from upstream.
- [CKEditor 5](https://github.com/ckeditor/ckeditor5/blob/master/LICENSE.md),
  used under its GPL 2+ licence (`licenseKey: 'GPL'`).

Because the packaged add-on bundles CKEditor, the distributed build as a whole
carries GPL 2+ terms, and this repository is the corresponding source. MPL-2.0
permits that combination: GPL is a Secondary License under §3.3, and no file
here carries the Exhibit B "Incompatible With Secondary Licenses" notice.
