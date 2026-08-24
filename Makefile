# Thin wrapper over the npm scripts; package.json stays the source of truth.
# Nothing here is incremental: `npm run build` runs `prebuild`, which wipes
# web-ext-artifacts/ and regenerates the gitignored src/_locales every time.

NPM := npm

.DEFAULT_GOAL := build
.PHONY: build package

# Bundles src/sidebar/app into build/, copies the rest of src/ verbatim, then
# zips it to web-ext-artifacts/sidebar_notes-<version>.zip.
build: node_modules
	$(NPM) run build

# Same build, with the zip moved to ./addon.xpi. Deliberately not `package:
# build` — `npm run package` builds on its own, so both would bundle twice.
package: node_modules
	$(NPM) run package

# postinstall generates src/_locales, which vite.config.mjs refuses to build
# without.
node_modules: package.json package-lock.json
	$(NPM) ci
	@touch $@
