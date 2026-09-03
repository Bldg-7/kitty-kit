---
"kitty-kit": patch
---

History Cleaner popup: remove the per-run diagnostics line that shipped in 1.3.0. Its length widened the popup past the browser's limit and pushed the Settings button out of view. The popup is now capped at 600px wide and long text wraps, so it can no longer clip its own header.
