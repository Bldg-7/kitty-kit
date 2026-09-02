---
"kitty-kit": patch
---

History Cleaner: make cleanup actually finish on large (Firefox-sized) histories and surface failures.

- `history.search()` returns at most 10,000 entries, newest first, so on a profile with more old entries than that (Firefox keeps years of history, unlike Chrome's 90-day expiry) a run only ever removed the most recent slice of old history and the oldest visits — the ones you look for — survived every run. The sweep now repeats until nothing deletable is left.
- Without a domain whitelist, old visits are now removed with a single `history.deleteRange()` call instead of one `deleteUrl()` per entry. This has no result cap, keeps recent visits to a URL that also has old ones, and turns a multi-minute run into well under a second (Firefox's per-URL deletion costs ~10 ms each). With a whitelist the per-URL sweep is kept, as before.
- A run that fails now records the error and the popup shows it, instead of silently doing nothing; a run in progress shows "Running…" and disables "Run Now" (overlapping startup/alarm/manual runs share one sweep). When the counted search hit its cap, the popup shows the count as a lower bound ("10000+").
- Options: clearing the retention field no longer snaps it back to the stored value while you type, which turned e.g. "delete 30 → type 7" into 307 days and silently put every visit on a young profile out of range. The field keeps what you type, only stores valid non-negative numbers, and both Options and the popup now state the exact cutoff date the current setting deletes before.
