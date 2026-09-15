---
"kitty-kit": patch
---

Header Modifier: fix rules that silently did nothing in the Firefox build.

The Firefox (webRequest) and Chrome (declarativeNetRequest) paths implement the
same rule model, but two conditions were evaluated differently, so a rule that
worked in Chrome could match nothing — or everything — in Firefox.

- **URL Pattern / Wildcard** was compiled to an anchored regex (`^…$`), requiring
  the pattern to match the whole URL, while Chrome's `urlFilter` matches it as a
  substring. A pattern without a leading and trailing `*` — `example.com`, or the
  bare origin `https://example.com` — therefore matched no request at all in
  Firefox, with the rule still showing as enabled. The matcher is now unanchored
  to match Chrome; `*` still spans any run of characters, and the `equals`,
  `contains` and `regex` operators are unchanged.
- **Resource Types** were ignored entirely in Firefox: the `webRequest` filter
  cannot express them per rule and neither listener checked `details.type`, so
  every rule ran on every request type. Both listeners now apply the rule's own
  resource types, resolved by the same helper the declarativeNetRequest condition
  uses. As in Chrome, a rule that does not set any applies to `main_frame` only —
  so a Firefox rule that left the field blank now covers top-level navigation
  instead of every subresource.
