---
"kitty-kit": patch
---

Update build toolchain and dependencies to clear known advisories:

- `wxt` `^0.20.20` → `^0.21.4` (drops the vulnerable `web-ext-run` → `tmp` / `node-notifier` / `firefox-profile` / `fx-runner` chain). Firefox still builds as MV2 with a persistent background and the webRequest blocking path; Chrome still builds MV3 with declarativeNetRequest.
- `vite` bumped into the patched 8.2.x line (resolves the dev-server path-traversal / `server.fs.deny` bypass / arbitrary-file-read advisories) and `uuid` to a patched version.
- `react` / `react-dom` `^19.2.4` → `^19.2.8`, `@types/react` / `@types/react-dom` patch bumps.

`npm audit` now reports 0 vulnerabilities. All advisories were in the build/dev toolchain (not bundled into the shipped extension); no runtime behavior change — both targets rebuild and the header-modifier / history-cleaner flows verified unchanged.
