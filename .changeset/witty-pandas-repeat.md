---
"kitty-kit": patch
---

Header Modifier: make the Equals operator match a bare origin, and widen two presets.

- **Equals** compared the pattern to the request URL verbatim, but the browser
  normalizes every URL it requests to carry a path — navigating to
  `https://example.com` puts `https://example.com/` on the wire. A pattern typed
  as a bare origin therefore matched nothing while the rule showed as enabled,
  the same silent-no-match trap the wildcard operator had. The pattern is now
  normalized the same way the URL is, so `https://example.com` and
  `https://example.com/` mean the same rule. Host casing and a redundant default
  port are normalized with it; a pattern that is not an absolute URL is still
  compared verbatim. Both builds change together.
- **Disable Cache** and **Custom User-Agent** declared no resource types, so they
  only ever applied to top-level navigation — too narrow for presets meant to
  cover a whole page load. Both now declare every request type the two engines
  share. Firefox's own `beacon` and `imageset` spellings are folded onto `ping`
  and `image` so they are covered too, while the stored rule keeps only names
  the declarativeNetRequest API accepts.
