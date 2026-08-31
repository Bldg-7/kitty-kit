# kitty-kit

## 1.2.1

### Patch Changes

- 3ede995: Fix a type error that broke `tsc` (and the release build) under the wxt 0.21
  toolchain: its generated tsconfig enables `noUncheckedIndexedAccess`, which
  made `headers[index]` possibly-undefined in the Header Modifier rule editor.
  `updateHeader` now maps over the headers instead of index-assigning, which is
  behavior-preserving and type-safe.
- e6d58ef: Fix module lifecycle robustness and Header Modifier / History Cleaner defects:

  - Background dispatcher (`syncModules`) now isolates each module in its own try/catch and serializes overlapping runs. Previously one module's `enable()` throwing aborted the loop and silently left later modules (e.g. History Cleaner) disabled, and re-entrant runs could desync a module's real state from the UI toggle.
  - Header Modifier: rules whose header names are all blank no longer emit an invalid `modifyHeaders` declarativeNetRequest rule (which rejected the entire dynamic-rules batch). Blank header names are dropped when saving a rule, the Rule editor's Save button is disabled until at least one header name is entered, and the Firefox webRequest listeners skip blank actions and return unmodified requests untouched.
  - History Cleaner: the retention period can now be set to `0` to clear all history (previously the input coerced `0` back to `30`, so there was no "delete everything" path). `runCleanup` isolates each `deleteUrl` so one bad URL can't abort the sweep, and the daily alarm's `onAlarm` handler is registered once and removed on disable instead of accumulating across re-enables.
  - Popup falls back to the first enabled tab instead of rendering a blank body when the default tab's module is disabled.
  - `store` watch subscriptions in Header Modifier and Tracking Cleaner are unsubscribed on disable instead of leaking across enable/disable cycles.
  - Manifest: `declarativeNetRequest` is now requested only on the Chrome build (the Firefox build uses the webRequest path and never calls it), removing an unused permission from the Firefox add-on.

- e6d58ef: Update build toolchain and dependencies to clear known advisories:

  - `wxt` `^0.20.20` → `^0.21.4` (drops the vulnerable `web-ext-run` → `tmp` / `node-notifier` / `firefox-profile` / `fx-runner` chain). Firefox still builds as MV2 with a persistent background and the webRequest blocking path; Chrome still builds MV3 with declarativeNetRequest.
  - `vite` bumped into the patched 8.2.x line (resolves the dev-server path-traversal / `server.fs.deny` bypass / arbitrary-file-read advisories) and `uuid` to a patched version.
  - `react` / `react-dom` `^19.2.4` → `^19.2.8`, `@types/react` / `@types/react-dom` patch bumps.

  `npm audit` now reports 0 vulnerabilities. All advisories were in the build/dev toolchain (not bundled into the shipped extension); no runtime behavior change — both targets rebuild and the header-modifier / history-cleaner flows verified unchanged.

## 1.2.0

### Minor Changes

- cb9087c: - Header Modifier: URL pattern field now supports four explicit match operators (Equals, Contains, Wildcard, Regex). Existing rules default to Wildcard.
  - Header Modifier / Tracking Cleaner: Firefox builds now correctly use the webRequest blocking path. Previously the runtime feature check selected declarativeNetRequest in Firefox 113+, even though the manifest provisions webRequest specifically as the Firefox fallback.
  - Release flow: replaced manual tag-push releases with a Changesets-driven workflow.
