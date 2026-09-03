---
"kitty-kit": patch
---

Popup: the Settings button now opens the options page as a tab in the current window instead of relying on `runtime.openOptionsPage()`, which for an inline options page only focuses an existing about:addons view and could appear to do nothing. If the tab cannot be created it falls back to `openOptionsPage()`, and any failure is shown in the popup instead of being swallowed.
