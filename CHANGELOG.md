# kitty-kit

## 1.3.2

### Patch Changes

- 8028516: Popup: the Settings button now opens the options page as a tab in the current window instead of relying on `runtime.openOptionsPage()`, which for an inline options page only focuses an existing about:addons view and could appear to do nothing. If the tab cannot be created it falls back to `openOptionsPage()`, and any failure is shown in the popup instead of being swallowed.

## 1.3.1

### Patch Changes

- 99447e0: History Cleaner popup: remove the per-run diagnostics line that shipped in 1.3.0. Its length widened the popup past the browser's limit and pushed the Settings button out of view. The popup is now capped at 600px wide and long text wraps, so it can no longer clip its own header.

## 1.3.0

### Minor Changes

- a3cc4aa: History Cleaner: delete _visits_ before the cutoff date, not whole pages.

  - Cleanup previously called `history.deleteUrl()` for every page that had any visit before the cutoff, which also erased that page's later visits (a page visited last month and again today lost today's visit too), ran one slow call per page in Firefox (~10 ms each), and could only ever see the 10,000 pages `history.search()` returns. It now removes exactly the visits older than the cutoff with `history.deleteRange()`: later visits to the same pages are kept, whitelisted domains keep all of their visits (their visit times are carved out of the deleted range), there is no result cap, and a run takes well under a second.
  - A run that fails now records the error and the popup shows it; a run in progress shows "Running…" and disables "Run Now" (overlapping startup/alarm/manual runs share one sweep). The popup also shows a breakdown of the last run (pages with visits before the cutoff, whitelisted pages, and what the history API sees at all) so "nothing happened" can be diagnosed from the popup alone.
  - Options: clearing the retention field no longer snaps it back to the stored value while you type (which turned "delete 30 → type 7" into 307 days); it stores only valid non-negative numbers, and both Options and the popup state the exact cutoff date the current setting deletes before.
  - New option "Also clear remembered search terms on each run": wipes the search terms the address bar and search box remember (Firefox's "Recent searches") via `browsingData.removeFormData`. The browser API cannot filter these by date, so all of them are removed on every run while the option is on. Adds the `browsingData` permission to both builds.

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
