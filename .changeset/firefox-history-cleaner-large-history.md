---
"kitty-kit": minor
---

History Cleaner: delete *visits* before the cutoff date, not whole pages.

- Cleanup previously called `history.deleteUrl()` for every page that had any visit before the cutoff, which also erased that page's later visits (a page visited last month and again today lost today's visit too), ran one slow call per page in Firefox (~10 ms each), and could only ever see the 10,000 pages `history.search()` returns. It now removes exactly the visits older than the cutoff with `history.deleteRange()`: later visits to the same pages are kept, whitelisted domains keep all of their visits (their visit times are carved out of the deleted range), there is no result cap, and a run takes well under a second.
- A run that fails now records the error and the popup shows it; a run in progress shows "Running…" and disables "Run Now" (overlapping startup/alarm/manual runs share one sweep). The popup also shows a breakdown of the last run (pages with visits before the cutoff, whitelisted pages, and what the history API sees at all) so "nothing happened" can be diagnosed from the popup alone.
- Options: clearing the retention field no longer snaps it back to the stored value while you type (which turned "delete 30 → type 7" into 307 days); it stores only valid non-negative numbers, and both Options and the popup state the exact cutoff date the current setting deletes before.
- New option "Also clear remembered search terms on each run": wipes the search terms the address bar and search box remember (Firefox's "Recent searches") via `browsingData.removeFormData`. The browser API cannot filter these by date, so all of them are removed on every run while the option is on. Adds the `browsingData` permission to both builds.
