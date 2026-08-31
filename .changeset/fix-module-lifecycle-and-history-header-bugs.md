---
"kitty-kit": patch
---

Fix module lifecycle robustness and Header Modifier / History Cleaner defects:

- Background dispatcher (`syncModules`) now isolates each module in its own try/catch and serializes overlapping runs. Previously one module's `enable()` throwing aborted the loop and silently left later modules (e.g. History Cleaner) disabled, and re-entrant runs could desync a module's real state from the UI toggle.
- Header Modifier: rules whose header names are all blank no longer emit an invalid `modifyHeaders` declarativeNetRequest rule (which rejected the entire dynamic-rules batch). Blank header names are dropped when saving a rule, the Rule editor's Save button is disabled until at least one header name is entered, and the Firefox webRequest listeners skip blank actions and return unmodified requests untouched.
- History Cleaner: the retention period can now be set to `0` to clear all history (previously the input coerced `0` back to `30`, so there was no "delete everything" path). `runCleanup` isolates each `deleteUrl` so one bad URL can't abort the sweep, and the daily alarm's `onAlarm` handler is registered once and removed on disable instead of accumulating across re-enables.
- Popup falls back to the first enabled tab instead of rendering a blank body when the default tab's module is disabled.
- `store` watch subscriptions in Header Modifier and Tracking Cleaner are unsubscribed on disable instead of leaking across enable/disable cycles.
- Manifest: `declarativeNetRequest` is now requested only on the Chrome build (the Firefox build uses the webRequest path and never calls it), removing an unused permission from the Firefox add-on.
